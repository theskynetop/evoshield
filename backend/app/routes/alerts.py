"""
Email Alert endpoint
====================
POST /api/alerts/email  — send an attack-alert email via the Resend HTTPS API.

Render's free plan blocks outbound SMTP ports, so raw smtplib to Gmail
fails with "Network is unreachable". Resend's API is plain HTTPS (443),
which is never blocked.

Credentials come from environment variables (loaded from the project .env):
  RESEND_API_KEY, ALERT_FROM_EMAIL, ALERT_TO_EMAIL,
  ALERT_MIN_SEVERITY, ALERT_COOLDOWN_SEC
"""

import os
import time
import threading
import urllib.request
import urllib.error
import json as _json
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

try:
    from dotenv import load_dotenv, find_dotenv
    # Find the .env walking up from cwd; fall back to the repo-root .env
    # (three levels up from this file: app/routes -> app -> backend -> repo root).
    _env = find_dotenv(usecwd=True)
    if not _env:
        _env = os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "..", "..", "..", ".env",
        )
    load_dotenv(_env)
except Exception:
    pass

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL   = os.getenv("ALERT_FROM_EMAIL", "onboarding@resend.dev")
TO_EMAIL     = os.getenv("ALERT_TO_EMAIL", "")
MIN_SEVERITY = os.getenv("ALERT_MIN_SEVERITY", "High")
COOLDOWN_SEC = int(os.getenv("ALERT_COOLDOWN_SEC", "60"))

SUPABASE_URL         = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

_SEVERITY_RANK = {"Low": 0, "Medium": 1, "High": 2, "Critical": 3}
_last_sent: dict[str, float] = {}
_lock = threading.Lock()


class AlertRequest(BaseModel):
    attack_type: str
    severity:    str = "High"
    source_ip:   str = "unknown"
    path:        str = "/"
    method:      str = "GET"
    ai_score:    float = 0.0
    payload:     str = ""
    status:      str = "Blocked"
    force:       bool = False  # bypass severity gate + cooldown (for test sends)


def _should_send(attack_type: str, severity: str, force: bool) -> tuple[bool, str]:
    if not RESEND_API_KEY or not TO_EMAIL:
        return False, "email not configured (RESEND_API_KEY / ALERT_TO_EMAIL)"
    if force:
        return True, ""
    if _SEVERITY_RANK.get(severity, 0) < _SEVERITY_RANK.get(MIN_SEVERITY, 2):
        return False, f"severity below threshold ({MIN_SEVERITY})"
    now = time.time()
    with _lock:
        if now - _last_sent.get(attack_type, 0) < COOLDOWN_SEC:
            return False, "throttled (cooldown active for this attack type)"
        _last_sent[attack_type] = now
    return True, ""


def _build_message(a: AlertRequest) -> dict:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    color = {"Critical": "#f44336", "High": "#ff9800",
             "Medium": "#ffc107", "Low": "#00e676"}.get(a.severity, "#ff9800")
    html = f"""\
<html><body style="font-family:Segoe UI,Arial,sans-serif;background:#0a0e1a;color:#e0e0e0;padding:24px;">
  <div style="max-width:560px;margin:auto;background:#0d1b2a;border-radius:12px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
    <div style="background:{color};padding:16px 24px;">
      <h2 style="margin:0;color:#0a0e1a;font-weight:800;">EVOSHIELD — {a.severity} Attack Detected</h2>
    </div>
    <div style="padding:24px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:6px 0;color:#7a8aa0;">Attack Type</td><td style="padding:6px 0;color:#fff;font-weight:700;">{a.attack_type}</td></tr>
        <tr><td style="padding:6px 0;color:#7a8aa0;">Status</td><td style="padding:6px 0;color:#fff;">{a.status}</td></tr>
        <tr><td style="padding:6px 0;color:#7a8aa0;">AI Confidence</td><td style="padding:6px 0;color:#fff;">{a.ai_score}</td></tr>
        <tr><td style="padding:6px 0;color:#7a8aa0;">Source IP</td><td style="padding:6px 0;color:#fff;">{a.source_ip}</td></tr>
        <tr><td style="padding:6px 0;color:#7a8aa0;">Request</td><td style="padding:6px 0;color:#fff;">{a.method} {a.path}</td></tr>
        <tr><td style="padding:6px 0;color:#7a8aa0;vertical-align:top;">Payload</td><td style="padding:6px 0;color:#fff;word-break:break-all;font-family:monospace;font-size:12px;">{(a.payload or '')[:500]}</td></tr>
        <tr><td style="padding:6px 0;color:#7a8aa0;">Time</td><td style="padding:6px 0;color:#fff;">{ts}</td></tr>
      </table>
      <p style="margin-top:20px;color:#7a8aa0;font-size:12px;">Automated alert from EVOSHIELD WAF.</p>
    </div>
  </div>
</body></html>"""
    return {
        "from": FROM_EMAIL,
        "to": [TO_EMAIL],
        "subject": f"[EVOSHIELD] {a.severity} alert: {a.attack_type} from {a.source_ip}",
        "html": html,
    }


def _send_sync(msg: dict) -> None:
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=_json.dumps(msg).encode(),
        method="POST",
    )
    req.add_header("Authorization", f"Bearer {RESEND_API_KEY}")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=15) as resp:
        resp.read()


def _supabase_request(method: str, path: str, body=None, base="rest/v1", retries=2):
    """
    Minimal Supabase REST/Auth call using the service key (bypasses RLS).
    Retries on transient connection resets (WinError 10054 is common on Windows).
    """
    url = f"{SUPABASE_URL}/{base}/{path}"
    data = _json.dumps(body).encode() if body is not None else None
    last_err = None
    for attempt in range(retries + 1):
        req = urllib.request.Request(url, data=data, method=method)
        req.add_header("apikey", SUPABASE_SERVICE_KEY)
        req.add_header("Authorization", f"Bearer {SUPABASE_SERVICE_KEY}")
        req.add_header("Content-Type", "application/json")
        req.add_header("Prefer", "return=minimal")
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                raw = resp.read().decode()
                return _json.loads(raw) if raw else None
        except Exception as e:
            last_err = e
            if attempt < retries:
                time.sleep(0.4 * (attempt + 1))
    raise last_err


# Cache the user-id list so every attack doesn't hammer the (flaky) Auth API.
_user_ids_cache: dict = {"ids": [], "ts": 0.0}
_USER_CACHE_TTL = 300  # seconds


def _all_user_ids() -> list[str]:
    """
    Every real user's id. Uses the Auth Admin API (covers all registered
    users, even those without a profiles row), falling back to profiles.
    Result is cached for 5 minutes; on a fetch failure we reuse the last
    good cache so notifications still go out during a transient outage.
    """
    now = time.time()
    if _user_ids_cache["ids"] and now - _user_ids_cache["ts"] < _USER_CACHE_TTL:
        return _user_ids_cache["ids"]

    ids = []
    try:
        data = _supabase_request("GET", "admin/users?per_page=1000", base="auth/v1")
        users = data.get("users", []) if isinstance(data, dict) else (data or [])
        ids = [u["id"] for u in users if u.get("id")]
    except Exception as e:
        print(f"  [notify] auth users fetch failed, trying profiles: {e}")
    if not ids:
        try:
            rows = _supabase_request("GET", "profiles?select=id")
            ids = [u["id"] for u in (rows or []) if u.get("id")]
        except Exception as e:
            print(f"  [notify] profiles fetch failed: {e}")

    if ids:
        _user_ids_cache["ids"] = ids
        _user_ids_cache["ts"] = now
        return ids
    # Both failed — reuse last known good list rather than sending 0.
    return _user_ids_cache["ids"]


# Map attack severity to a notification type/colour so every filter tab
# (Attack / Warning / Info) gets populated:
#   Critical, High -> attack  (red)
#   Medium         -> warning (orange)
#   Low            -> info     (blue)
_SEVERITY_TO_TYPE = {
    "Critical": "attack",
    "High":     "attack",
    "Medium":   "warning",
    "Low":      "info",
}


def _notify_all_users(ntype: str, title: str, body: str) -> int:
    """
    Insert one notification per registered user (realtime in the app).
    Returns rows inserted. Best-effort: never raises.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return 0
    try:
        ids = _all_user_ids()
        if not ids:
            return 0
        rows = [{
            "user_id": uid,
            "type":    ntype,
            "title":   title,
            "body":    body,
            "read":    False,
        } for uid in ids]
        _supabase_request("POST", "notifications", rows)
        return len(rows)
    except Exception as e:
        print(f"  [notify] fan-out failed: {e}")
        return 0


def _fanout_notifications(a: "AlertRequest") -> int:
    """Attack alert -> in-app notification for every user, typed by severity."""
    ntype = _SEVERITY_TO_TYPE.get(a.severity, "attack")
    title = f"{a.severity} {a.attack_type} detected"
    body  = f"{a.attack_type} from {a.source_ip} on {a.method} {a.path} — {a.status}"
    return _notify_all_users(ntype, title, body)


@router.get("/status")
def alert_status():
    """Report whether email alerts are configured (without leaking the password)."""
    return {
        "configured":        bool(RESEND_API_KEY and TO_EMAIL),
        "from_email":        FROM_EMAIL or None,
        "to_email":          TO_EMAIL or None,
        "min_severity":      MIN_SEVERITY,
        "cooldown_sec":      COOLDOWN_SEC,
        "in_app_notify":     bool(SUPABASE_URL and SUPABASE_SERVICE_KEY),
    }


@router.post("/email")
def send_email_alert(req: AlertRequest):
    # In-app notification ALWAYS fires — every attack shows in the app,
    # regardless of severity or cooldown.
    notified = _fanout_notifications(req)

    # Email is rate-limited and severity-gated so Gmail doesn't flag us.
    ok, reason = _should_send(req.attack_type, req.severity, req.force)
    if not ok:
        return {"sent": False, "reason": reason, "notified_users": notified}
    try:
        _send_sync(_build_message(req))
    except Exception as e:
        # Notification already saved; report the email failure without 500-ing.
        return {"sent": False, "reason": f"SMTP send failed: {e}", "notified_users": notified}
    return {"sent": True, "to": TO_EMAIL, "notified_users": notified}


class NotifyRequest(BaseModel):
    type:  str = "info"   # attack | healing | warning | info
    title: str
    body:  str = ""


@router.post("/notify")
def push_notification(req: NotifyRequest):
    """
    Push an in-app notification of any type to every user (no email).
    Use for healing / warning / info events, or to test the bell badge.
    """
    ntype = req.type if req.type in ("attack", "healing", "warning", "info") else "info"
    n = _notify_all_users(ntype, req.title, req.body)
    return {"notified_users": n, "type": ntype}
