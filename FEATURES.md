# SH-WAF — Self-Healing Web Application Firewall
## Complete Feature Documentation

> **College:** Mahatma Education Society's Pillai HOC College of Arts, Science & Commerce
> **Guide:** Prof. Tejashree Patil | **HOD:** Prof. Abhijeet More
> **Student:** Keyur Devlekar

---

## Table of Contents
1. [Authentication](#1-authentication)
2. [Dashboard](#2-dashboard)
3. [Live Traffic Monitor](#3-live-traffic-monitor)
4. [Attack Logs](#4-attack-logs)
5. [AI Anomaly Detection](#5-ai-anomaly-detection)
6. [Rule Management](#6-rule-management)
7. [Self-Healing Engine](#7-self-healing-engine)
8. [Reports & Export](#8-reports--export)
9. [Notifications](#9-notifications)
10. [Settings](#10-settings)
11. [WAF Proxy (Live Testing)](#11-waf-proxy-live-testing)
12. [Tech Stack](#12-tech-stack)

---

## 1. Authentication

**Page:** `/login` `/register`

### Kya karta hai?
System mein securely login/register karne ki facility deta hai. Supabase Auth use karta hai jo industry-standard JWT tokens aur email/password authentication provide karta hai.

### Features:
| Feature | Description |
|---------|-------------|
| Login | Email + Password se login, JWT token milta hai |
| Register | Naam, Email, Role (Admin/Analyst/Viewer), Password |
| Auto Session | Browser refresh ke baad bhi login rahta hai |
| Protected Routes | Bina login ke dashboard access nahi hota |
| Sign Out | Session clear ho jaata hai |

### How it works:
```
User → Login Form → Supabase Auth → JWT Token → Dashboard
```
- `AuthContext.jsx` poore app mein session manage karta hai
- `ProtectedLayout` check karta hai ki user logged in hai ya nahi
- Agar nahi hai toh automatically `/login` pe redirect karta hai

---

## 2. Dashboard

**Page:** `/dashboard`

### Kya karta hai?
Poore WAF system ka bird's-eye view deta hai — ek hi jagah pe saari important metrics, charts aur recent attacks dikhata hai.

### Features:
| Feature | Description |
|---------|-------------|
| Total Requests | Supabase `attack_logs` table se total count |
| Attacks Blocked | Status = "Blocked" wale logs ka count |
| Active Threats | Last 1 hour mein aaye attacks |
| Rules Healed | `healing_events` table se auto-healed rules count |
| Traffic Chart | Last 24 hours ka hourly traffic — Area Chart |
| Attack Distribution | Pie chart — SQL Injection / XSS / CMD / Path Traversal |
| Healing Activity | Bar chart — week ke har din kitne rules heal hue |
| Recent Attacks | Last 5 attacks ki list with severity badges |
| Auto Refresh | Har 30 seconds pe data automatically reload hota hai |

### Data Flow:
```
Supabase attack_logs → fetchDashboardStats() → Dashboard Charts
Supabase healing_events → fetchHealingActivity() → Bar Chart
```

---

## 3. Live Traffic Monitor

**Page:** `/traffic`

### Kya karta hai?
Real-time mein WAF se guzarne wala har request live dikhata hai. Supabase Realtime use karta hai — jaise hi koi naya attack log hota hai, page automatically update hota hai bina refresh ke.

### Features:
| Feature | Description |
|---------|-------------|
| Live Toggle | "Live" button se realtime on/off kar sakte ho |
| Req/s Counter | Last 60 seconds mein kitne requests aaye |
| Sparkline Chart | Last 20 minutes ka requests per minute graph |
| Request Table | IP, Method, Path, Type, Status, AI Score — last 100 |
| Color-coded Status | Blocked=Red, Healed=Green, Allowed=Cyan, Flagged=Orange |
| Method Badges | GET/POST/PUT/DELETE — alag alag colors |
| Supabase Realtime | INSERT event pe automatically new row table mein add hota hai |

### How Realtime Works:
```
New attack → waf_proxy.py → Supabase INSERT
                                    ↓
                        Supabase Realtime Channel
                                    ↓
                        Browser auto-update (no refresh)
```

---

## 4. Attack Logs

**Page:** `/logs`

### Kya karta hai?
Database mein stored saare attack logs ko filter, search aur paginate karke dikhata hai. Har log ke andar detailed information hoti hai — payload, method, AI score, country sab kuch.

### Features:
| Feature | Description |
|---------|-------------|
| Server-side Filtering | Attack Type, Severity, Status filter — Supabase query pe |
| Search | IP address, path, attack type se search |
| Pagination | 15 logs per page, server-side |
| Expandable Rows | Click karo toh payload, headers, AI score detail dikhata hai |
| CSV Export | Current page ke logs download karo |
| Realtime | Naya attack aate hi page 1 pe automatically dikhai deta hai |
| Severity Badges | Critical=Red, High=Orange, Medium=Yellow, Low=Green |

### Filters Available:
- **Attack Type:** SQL Injection, XSS, Command Injection, Path Traversal, CSRF, XXE, SSRF
- **Severity:** Critical, High, Medium, Low
- **Status:** Blocked, Healed, Allowed, Flagged

---

## 5. AI Anomaly Detection

**Page:** `/anomaly`

### Kya karta hai?
Machine Learning model (Isolation Forest) use karke abnormal requests detect karta hai — even woh attacks jo kisi known rule se match nahi karte (Zero-Day threats). SHAP explainability se batata hai ki **kyun** ek request suspicious hai.

### Features:
| Feature | Description |
|---------|-------------|
| Isolation Forest | Scikit-learn ka ML model — 200 trees, contamination=5% |
| Anomaly Scatter Plot | X=payload length, Y=AI score — Red dots = anomaly |
| Attack Type Radar | Kitne % SQL/XSS/CMD/Path attacks hue — Radar chart |
| SHAP Values | Har feature ka contribution — positive=red, negative=blue |
| High-Score Table | Sabse dangerous anomalies ki list |
| Real Supabase Data | `attack_logs` table ka `ai_score` field use karta hai |
| Realtime Refresh | Naya log aate hi data reload hota hai |

### SHAP Features Explained:
| Feature | Matlab |
|---------|--------|
| Payload Length | Request body kitni badi hai |
| Special Chars | `'`, `"`, `<`, `>`, `;` jaise characters kitne hain |
| SQL Keywords | SELECT, UNION, DROP jaise words |
| Request Rate | Same IP se kitne requests aaye |
| Path Depth | URL mein `/` kitne levels deep |
| Header Anomaly | Unusual headers detect karna |
| Encoding Pattern | `%2e`, `%3c` jaise encoded characters |
| User-Agent Score | Scanner/bot user-agents detect karna |

### How AI Works:
```
Request → Feature Extraction (16 features)
                    ↓
           Isolation Forest Model
                    ↓
        Anomaly Score (0.0 to 1.0)
                    ↓
        SHAP Explanation (why flagged?)
                    ↓
        Saved to attack_logs.ai_score
```

---

## 6. Rule Management

**Page:** `/rules`

### Kya karta hai?
WAF ke detection rules ko manage karne ki facility deta hai — naaye rules add karo, existing edit karo, enable/disable karo ya delete karo. Dono manual rules aur AI se auto-generated rules dikhata hai.

### Features:
| Feature | Description |
|---------|-------------|
| Rules List | Saare `waf_rules` table ke rules — naam, pattern, type, action |
| Add Rule | Dialog box se naya rule create karo — Supabase mein save hota hai |
| Edit Rule | Existing rule ka pattern, severity, action update karo |
| Delete Rule | Confirm karke rule permanently delete karo |
| Enable/Disable Toggle | Ek click se rule on/off — instantly Supabase update |
| AI Badge | Auto-generated (GA) rules pe purple "AI" badge lagta hai |
| Search/Filter | Naam ya type se rules dhundo |

### Rule Fields:
| Field | Description | Example |
|-------|-------------|---------|
| Name | Unique rule identifier | `SQLI_001_UNION` |
| Pattern | Regex pattern | `(?i)(union\s+select)` |
| Attack Type | Kaunsa attack detect karta hai | `SQL Injection` |
| Action | Block / Allow / Log / Rate Limit | `Block` |
| Severity | Critical / High / Medium / Low | `Critical` |
| Enabled | Active hai ya nahi | `true` |

---

## 7. Self-Healing Engine

**Page:** `/healing`

### Kya karta hai?
Ye system ka sabse unique feature hai. Jab koi attack ek existing rule se bachke nikal jaata hai (evasion), toh **Genetic Algorithm** automatically naaya better rule generate karta hai. Ye rule Supabase mein save ho jaata hai aur dashboard pe dikhai deta hai.

### Features:
| Feature | Description |
|---------|-------------|
| Attack Type Selector | SQL Injection / XSS / Command Injection / Path Traversal choose karo |
| GA Simulation | Genetic Algorithm 50 generations mein best regex pattern evolve karta hai |
| Live Progress | Real-time progress bar — generation by generation |
| Rule Preview | Naya generated pattern + accuracy + false positive rate dikhata hai |
| Auto Save | "Deploy Rule" click karo — `waf_rules` + `healing_events` dono mein save |
| History | Last 15 healing events — kaunsa rule kab generate hua |
| Realtime | Naya healing event aate hi history update ho jaati hai |

### Genetic Algorithm Process:
```
Evasion Attack Detected
        ↓
Initial Population (20 regex patterns)
        ↓
Fitness Function (F1 Score on test payloads)
        ↓
Selection → Crossover → Mutation
        ↓
50 Generations repeat
        ↓
Best Pattern (highest accuracy, lowest FP rate)
        ↓
Save to waf_rules + healing_events
        ↓
WAF immediately uses new rule
```

### Why "Self-Healing"?
Traditional WAF mein agar hacker purane rule se bachke attack kare, toh manually update karna padta tha. SH-WAF mein GA automatically evolve karta hai naye rules — **bina human intervention ke**.

---

## 8. Reports & Export

**Page:** `/reports`

### Kya karta hai?
Supabase se real attack data fetch karke downloadable reports generate karta hai — CSV ya JSON format mein. Time period aur report type select karke filtered data export kar sakte ho.

### Features:
| Feature | Description |
|---------|-------------|
| Time Period Filter | Last 24h / 7 days / 30 days / 90 days |
| Report Types | Attack Summary / Traffic Analysis / Rule Performance |
| CSV Export | Spreadsheet mein open hone wali file |
| JSON Export | Developers ke liye raw data |
| Quick Export | Bina filter ke saare loaded logs export |
| Weekly Bar Chart | Mon-Sun attacks ka comparison |
| Attack Type Pie | Konsa attack type sabse zyada hua |
| Top Attack Sources | Sabse zyada attacks karne wale IP addresses |
| Summary Cards | Total / Blocked / Healed / Critical count |

### Export Format (CSV):
```
ID, Time, Type, IP, Path, Severity, Status, AI Score
uuid, 2025-01-01T10:00:00Z, SQL Injection, 1.2.3.4, /login, Critical, Blocked, 0.95
```

---

## 9. Notifications

**Page:** `/notifications`

### Kya karta hai?
System ke important events ke baare mein real-time alerts deta hai. Naya attack aaya, rule heal hua, high severity threat detected — sab kuch notification ke roop mein aata hai.

### Features:
| Feature | Description |
|---------|-------------|
| Real-time Alerts | Supabase Realtime se naye notifications instantly dikhte hain |
| Filter by Type | All / Unread / attack / healing / warning / info |
| Mark as Read | Single ya ek saath saare read mark karo |
| Dismiss | Notification hata do (local state se) |
| Unread Badge | Kitne unread hain — header mein count dikhta hai |
| Type Icons | Attack=Shield, Healing=AutoFix, Warning=Alert, Info=Info |
| Color Coding | Har type ka alag color — instantly identify karo |

### Notification Types:
| Type | Kab aata hai | Color |
|------|-------------|-------|
| attack | Naya attack detect hua | Red |
| healing | Rule auto-generated hua | Green |
| warning | High severity threat | Orange |
| info | System status update | Cyan |

---

## 10. Settings

**Page:** `/settings`

### Kya karta hai?
System ke global settings configure karne ki jagah — theme, notification preferences, user profile update.

### Features:
| Feature | Description |
|---------|-------------|
| Dark/Light Mode | Poore UI ka theme toggle — sidebar ke icon se bhi |
| Profile Update | Naam aur role update karo |
| Notification Settings | Kaunse alerts receive karne hain |

---

## 11. WAF Proxy (Live Testing)

**File:** `waf_proxy.py`

### Kya karta hai?
Ek real HTTP server jo port 8080 pe requests accept karta hai, attack detect karta hai, aur Supabase mein live log insert karta hai — taaki dashboard mein real-time dikhaye.

### Start kaise karo:
```bash
# Terminal 1 - Proxy start karo
python waf_proxy.py

# Terminal 2 - Attacks bhejo
python test_all_attacks.py
```

### Manual Testing Commands:
```bash
# Normal request
curl http://localhost:8080/

# SQL Injection
curl "http://localhost:8080/login?id=1' OR '1'='1"
curl "http://localhost:8080/search?q=' UNION SELECT * FROM users--"

# XSS
curl "http://localhost:8080/comment?text=<script>alert(1)</script>"
curl "http://localhost:8080/profile?name=<img src=x onerror=alert(1)>"

# Command Injection
curl "http://localhost:8080/ping?host=google.com;whoami"
curl "http://localhost:8080/exec?cmd=;cat /etc/passwd"

# Path Traversal
curl "http://localhost:8080/file?path=../../etc/passwd"
curl "http://localhost:8080/download?f=../../../etc/shadow"
```

### Response Format:
```json
// Blocked attack
{
  "blocked": true,
  "attack_type": "SQL Injection",
  "severity": "Critical",
  "ai_score": 0.95,
  "message": "Request blocked by SH-WAF — SQL Injection detected"
}

// Allowed request
{
  "blocked": false,
  "message": "Request allowed",
  "path": "/api/products",
  "ai_score": 0.03
}
```

---

## 12. Tech Stack

### Frontend
| Technology | Version | Use |
|-----------|---------|-----|
| React | 18.3 | UI framework |
| Vite | 5.x | Build tool + dev server |
| Material UI | v5 | Component library |
| React Router | v6 | Client-side routing |
| Recharts | 2.12 | Charts (Area, Bar, Pie, Scatter, Radar) |
| @tanstack/react-query | v5 | Data caching |
| @supabase/supabase-js | v2 | Supabase client |
| Axios | 1.7 | HTTP client |

### Backend
| Technology | Version | Use |
|-----------|---------|-----|
| FastAPI | 0.111 | REST API framework |
| SQLAlchemy | 2.x | ORM |
| Pydantic | v2 | Data validation |
| Scikit-learn | 1.5 | Isolation Forest ML model |
| SHAP | 0.45 | Model explainability |
| Python | 3.12 | Language |

### Database & Infrastructure
| Technology | Use |
|-----------|-----|
| Supabase PostgreSQL | Primary database |
| Supabase Auth | User authentication (JWT) |
| Supabase Realtime | WebSocket live updates |
| Supabase RLS | Row Level Security — data isolation |
| Docker | Containerization |

### Architecture:
```
Browser (React + Vite)
        ↓ ↑
Supabase (PostgreSQL + Auth + Realtime)
        ↑
WAF Proxy (Python HTTP Server) ← curl / browser attacks
        ↑
FastAPI Backend (ML inference, Genetic Algorithm)
```

---

## Quick Start

```bash
# 1. Frontend start karo
cd sh-waf/frontend
npm install
npm run dev
# Opens at http://localhost:5173

# 2. WAF Proxy start karo (new terminal)
cd sh-waf
python waf_proxy.py
# Listens at http://localhost:8080

# 3. Attack test karo (new terminal)
cd sh-waf
python test_all_attacks.py

# 4. Sirf data insert karna ho (proxy ke bina)
python test_attacks.py 50
```

---

*SH-WAF — Self-Healing Web Application Firewall | Final Year Project 2024-25*
