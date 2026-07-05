"""
EVOSHIELD — Email Alerts
========================
Sends email notifications via Gmail SMTP when the WAF detects an attack.

Configuration (env vars override the defaults below):
  ALERT_SMTP_HOST     default: smtp.gmail.com
  ALERT_SMTP_PORT     default: 587
  ALERT_FROM_EMAIL    the Gmail account that sends alerts
  ALERT_APP_PASSWORD  Gmail App Password (NOT the normal password)
  ALERT_TO_EMAIL      where alerts are delivered (defaults to ALERT_FROM_EMAIL)
  ALERT_MIN_SEVERITY  only alert on this severity or above (default: High)
  ALERT_COOLDOWN_SEC  min seconds between emails for the same attack type (default: 60)

This module is import-safe: if credentials are missing it simply logs a
warning and skips sending instead of crashing the WAF.
"""

import os
import ssl
import time
import smtplib
import threading
from email.message import EmailMessage
from datetime import datetime, timezone

# Load credentials from a .env file if python-dotenv is available.
# Falls back silently to real environment variables if it isn't installed.
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

# ── Config ──────────────────────────────────────────────────────────────────
SMTP_HOST     = os.getenv("ALERT_SMTP_HOST", "smtp.gmail.com")
SMTP_PORT     = int(os.getenv("ALERT_SMTP_PORT", "587"))
FROM_EMAIL    = os.getenv("ALERT_FROM_EMAIL", "")
APP_PASSWORD  = os.getenv("ALERT_APP_PASSWORD", "").replace(" ", "")
TO_EMAIL      = os.getenv("ALERT_TO_EMAIL") or FROM_EMAIL
MIN_SEVERITY  = os.getenv("ALERT_MIN_SEVERITY", "High")
COOLDOWN_SEC  = int(os.getenv("ALERT_COOLDOWN_SEC", "60"))

# Severity ranking — alert only when severity >= MIN_SEVERITY.
_SEVERITY_RANK = {"Low": 0, "Medium": 1, "High": 2, "Critical": 3}

# Per-attack-type throttle so a flood of requests doesn't send hundreds of mails.
_last_sent: dict[str, float] = {}
_lock = threading.Lock()


def _should_send(attack_type: str, severity: str) -> bool:
    if _SEVERITY_RANK.get(severity, 0) < _SEVERITY_RANK.get(MIN_SEVERITY, 2):
        return False
    if not FROM_EMAIL or not APP_PASSWORD:
        return False
    now = time.time()
    with _lock:
        last = _last_sent.get(attack_type, 0)
        if now - last < COOLDOWN_SEC:
            return False
        _last_sent[attack_type] = now
    return True


def _build_message(attack_type, severity, source_ip, path, method,
                   ai_score, payload, status) -> EmailMessage:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    msg = EmailMessage()
    msg["Subject"] = f"[EVOSHIELD] {severity} alert: {attack_type} from {source_ip}"
    msg["From"]    = FROM_EMAIL
    msg["To"]      = TO_EMAIL

    text = f"""EVOSHIELD Web Application Firewall — Attack Detected

Severity      : {severity}
Attack Type   : {attack_type}
Status        : {status}
AI Confidence : {ai_score}
Source IP     : {source_ip}
Method        : {method}
Path          : {path}
Payload       : {(payload or '')[:500]}
Time          : {ts}

This is an automated alert from EVOSHIELD. Review the dashboard for full context.
"""
    msg.set_content(text)

    color = {"Critical": "#f44336", "High": "#ff9800",
             "Medium": "#ffc107", "Low": "#00e676"}.get(severity, "#ff9800")
    html = f"""\
<html><body style="font-family:Segoe UI,Arial,sans-serif;background:#0a0e1a;
  color:#e0e0e0;padding:24px;">
  <div style="max-width:560px;margin:auto;background:#0d1b2a;border-radius:12px;
    border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
    <div style="background:{color};padding:16px 24px;">
      <h2 style="margin:0;color:#0a0e1a;font-weight:800;">
        EVOSHIELD — {severity} Attack Detected</h2>
    </div>
    <div style="padding:24px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:6px 0;color:#7a8aa0;">Attack Type</td>
            <td style="padding:6px 0;color:#fff;font-weight:700;">{attack_type}</td></tr>
        <tr><td style="padding:6px 0;color:#7a8aa0;">Status</td>
            <td style="padding:6px 0;color:#fff;">{status}</td></tr>
        <tr><td style="padding:6px 0;color:#7a8aa0;">AI Confidence</td>
            <td style="padding:6px 0;color:#fff;">{ai_score}</td></tr>
        <tr><td style="padding:6px 0;color:#7a8aa0;">Source IP</td>
            <td style="padding:6px 0;color:#fff;">{source_ip}</td></tr>
        <tr><td style="padding:6px 0;color:#7a8aa0;">Request</td>
            <td style="padding:6px 0;color:#fff;">{method} {path}</td></tr>
        <tr><td style="padding:6px 0;color:#7a8aa0;vertical-align:top;">Payload</td>
            <td style="padding:6px 0;color:#fff;word-break:break-all;font-family:monospace;font-size:12px;">{(payload or '')[:500]}</td></tr>
        <tr><td style="padding:6px 0;color:#7a8aa0;">Time</td>
            <td style="padding:6px 0;color:#fff;">{ts}</td></tr>
      </table>
      <p style="margin-top:20px;color:#7a8aa0;font-size:12px;">
        Automated alert from EVOSHIELD WAF. Open the dashboard for full context.</p>
    </div>
  </div>
</body></html>"""
    msg.add_alternative(html, subtype="html")
    return msg


def _send_sync(msg: EmailMessage) -> None:
    try:
        ctx = ssl.create_default_context()
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            server.starttls(context=ctx)
            server.login(FROM_EMAIL, APP_PASSWORD)
            server.send_message(msg)
        print(f"  [email] Alert sent to {TO_EMAIL}")
    except Exception as e:
        print(f"  [email] Failed to send alert: {e}")


def send_attack_alert(attack_type, severity, source_ip, path, method,
                      ai_score, payload="", status="Blocked") -> bool:
    """
    Send an attack alert email if severity is high enough and not throttled.
    Sends in a background thread so it never blocks request handling.
    Returns True if an email was dispatched, False if skipped/throttled.
    """
    if not _should_send(attack_type, severity):
        return False

    msg = _build_message(attack_type, severity, source_ip, path,
                         method, ai_score, payload, status)
    threading.Thread(target=_send_sync, args=(msg,), daemon=True).start()
    return True


if __name__ == "__main__":
    # Quick test: python email_alerts.py
    print(f"Sending test alert from {FROM_EMAIL} to {TO_EMAIL} ...")
    _send_sync(_build_message(
        "SQL Injection", "Critical", "203.0.113.42",
        "/login", "POST", 0.97, "' OR '1'='1' --", "Blocked",
    ))
