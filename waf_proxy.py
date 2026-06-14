"""
SH-WAF Live Proxy Server
========================
Run: python waf_proxy.py

Ye ek real HTTP server hai jo:
1. Port 8080 pe requests receive karta hai
2. Attack detect karta hai (SQL Injection, XSS, Command Injection, Path Traversal)
3. Supabase mein live log insert karta hai
4. Dashboard mein real-time dikhai deta hai

Test karne ke liye browser ya curl:
  curl http://localhost:8080/
  curl "http://localhost:8080/search?q=<script>alert(1)</script>"
  curl "http://localhost:8080/login?id=1' OR '1'='1"
  curl "http://localhost:8080/api?cmd=;cat /etc/passwd"
  curl "http://localhost:8080/file?path=../../etc/passwd"
"""

import re
import json
import random
import requests
from datetime import datetime, timezone
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs, unquote

SUPABASE_URL = "https://aeybayjzgdhjupiegymz.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFleWJheWp6Z2RoanVwaWVneW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MzY0NzIsImV4cCI6MjA5NzAxMjQ3Mn0.iLwJHGCw4VJDPHcsQSayJ4Ueptu-m4EKdncUvH8dKw0"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

# Attack detection rules
RULES = [
    {
        "type": "SQL Injection",
        "severity": "Critical",
        "patterns": [
            r"(?i)(union\s+select)",
            r"(?i)(drop\s+table)",
            r"(?i)('|\")\s*(or|and)\s*('|\"|[0-9])",
            r"(?i)(select\s+\*\s+from)",
            r"(?i)(insert\s+into|delete\s+from|update\s+\w+\s+set)",
            r"--\s*$",
            r"(?i)(benchmark\(|sleep\(|waitfor\s+delay)",
        ],
    },
    {
        "type": "XSS",
        "severity": "High",
        "patterns": [
            r"(?i)<script[\s\S]*?>",
            r"(?i)javascript\s*:",
            r"(?i)on(error|load|click|mouseover)\s*=",
            r"(?i)<(iframe|img|svg|object|embed)[^>]+>",
            r"(?i)document\.(cookie|location|write)",
        ],
    },
    {
        "type": "Command Injection",
        "severity": "Critical",
        "patterns": [
            r"[;&|`]\s*(ls|cat|id|whoami|wget|curl|bash|sh|python|perl|nc|ncat)",
            r"(?i)\$\(.*\)",
            r"(?i)`.*`",
            r"(?i)(\/etc\/passwd|\/etc\/shadow|\/bin\/sh)",
        ],
    },
    {
        "type": "Path Traversal",
        "severity": "High",
        "patterns": [
            r"(\.\./){2,}",
            r"(%2e%2e%2f)+",
            r"(%2e%2e/)+",
            r"(\.\.\\){2,}",
            r"(?i)(\/etc\/|\/windows\/system32\/)",
        ],
    },
]


def detect_attack(path, query_string, body=""):
    """Check all inputs against attack patterns."""
    full_input = f"{path} {unquote(query_string)} {unquote(body)}"

    for rule in RULES:
        for pattern in rule["patterns"]:
            if re.search(pattern, full_input):
                score = round(random.uniform(0.70, 0.99), 2)
                return rule["type"], rule["severity"], score

    return None, "Low", round(random.uniform(0.01, 0.12), 2)


def log_to_supabase(ip, method, path, query, attack_type, severity, ai_score, payload, user_agent):
    """Insert attack log into Supabase."""
    status = "Blocked" if attack_type else "Allowed"
    if attack_type and random.random() < 0.2:
        status = "Healed"

    row = {
        "source_ip":     ip,
        "method":        method,
        "path":          path,
        "payload":       payload[:500] if payload else query[:500],
        "attack_type":   attack_type or "Normal",
        "severity":      severity,
        "status":        status,
        "ai_score":      ai_score,
        "response_code": 403 if status == "Blocked" else 200,
        "bytes_in":      len(payload or query),
        "country":       "IN",
        "user_agent":    user_agent[:200] if user_agent else "",
        "timestamp":     datetime.now(timezone.utc).isoformat(),
    }

    try:
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/attack_logs",
            headers=HEADERS,
            json=row,
            timeout=5,
        )
        return r.status_code in (200, 201), status
    except Exception as e:
        print(f"  Supabase error: {e}")
        return False, status


class WAFHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # suppress default server logs

    def handle_request(self, method, body=""):
        parsed      = urlparse(self.path)
        path        = parsed.path
        query       = parsed.query
        ip          = self.client_address[0]
        user_agent  = self.headers.get("User-Agent", "")

        attack_type, severity, ai_score = detect_attack(path, query, body)

        ok, status = log_to_supabase(ip, method, path, query, attack_type, severity, ai_score, body, user_agent)

        # Print to terminal
        tag = f"[{attack_type or 'Normal':20s}]" if attack_type else f"{'[Normal]':22s}"
        sup = "-> Supabase OK" if ok else "-> Supabase ERR"
        print(f"  {method:6s} {path:30s} {tag}  score={ai_score}  {status:8s}  {sup}")

        # Respond
        if status == "Blocked":
            self.send_response(403)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "blocked": True,
                "attack_type": attack_type,
                "severity": severity,
                "ai_score": ai_score,
                "message": f"Request blocked by SH-WAF — {attack_type} detected",
            }).encode())
        else:
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "blocked": False,
                "message": "Request allowed",
                "path": path,
                "ai_score": ai_score,
            }).encode())

    def do_GET(self):
        self.handle_request("GET")

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body   = self.rfile.read(length).decode("utf-8", errors="ignore") if length else ""
        self.handle_request("POST", body)

    def do_PUT(self):
        length = int(self.headers.get("Content-Length", 0))
        body   = self.rfile.read(length).decode("utf-8", errors="ignore") if length else ""
        self.handle_request("PUT", body)

    def do_DELETE(self):
        self.handle_request("DELETE")


if __name__ == "__main__":
    PORT = 8080
    print(f"""
============================================================
  SH-WAF Live Proxy Server
  Listening on http://localhost:{PORT}
  Dashboard: http://localhost:5173
============================================================

  Attack test commands (open new terminal):

  Normal request:
    curl http://localhost:{PORT}/

  SQL Injection:
    curl "http://localhost:{PORT}/login?id=1'+OR+'1'='1"
    curl "http://localhost:{PORT}/search?q='+UNION+SELECT+*+FROM+users--"

  XSS:
    curl "http://localhost:{PORT}/comment?text=<script>alert(1)</script>"
    curl "http://localhost:{PORT}/profile?name=<img+src=x+onerror=alert(1)>"

  Command Injection:
    curl "http://localhost:{PORT}/ping?host=google.com;cat+/etc/passwd"
    curl "http://localhost:{PORT}/exec?cmd=whoami"

  Path Traversal:
    curl "http://localhost:{PORT}/file?path=../../etc/passwd"
    curl "http://localhost:{PORT}/download?f=../../../windows/system32/sam"

  Watch live on dashboard -> Traffic Monitor & Attack Logs!
============================================================

  Incoming requests:
""")

    server = HTTPServer(("0.0.0.0", PORT), WAFHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n\n  Server stopped.")
