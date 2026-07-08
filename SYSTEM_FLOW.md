# EVOSHIELD (SH-WAF) — System Working Flow

This document explains **how the system works end-to-end**: request flow, detection pipeline, self-healing loop, and how the frontend stays in sync in real time.

---

## 1. High-Level Architecture

```mermaid
flowchart TB
    subgraph Client["Frontend (React + Vite)"]
        UI[Dashboard / Pages]
        RT[Realtime Hooks<br/>useRealtime.js]
    end

    subgraph Supabase["Supabase (Postgres + Auth + Realtime)"]
        AUTH[(Auth)]
        DB[(Postgres:<br/>attack_logs, waf_rules,<br/>healing_events, notifications)]
        RTC[Realtime Channel<br/>postgres_changes / broadcast]
    end

    subgraph Backend["FastAPI Backend (Python)"]
        API[REST Routes<br/>/api/*]
        ML[ML Engine<br/>Isolation Forest + SHAP]
        GA[Self-Healing Engine<br/>Genetic Algorithm]
        SIM[Attack Simulator]
        ALERT[Alert Service<br/>Email + In-App]
    end

    UI -->|login/signup| AUTH
    UI -->|REST calls: axios/api.js| API
    UI -->|direct queries| DB
    RT -->|subscribe| RTC
    RTC -->|push INSERT events| RT
    RT --> UI

    API --> ML
    API --> GA
    API --> SIM
    API --> ALERT

    SIM -->|insert rows| DB
    GA -->|new WafRule + HealingEvent| DB
    ALERT -->|insert notifications| DB
    DB -->|triggers realtime push| RTC
    ALERT -->|SMTP| EMAIL[Gmail SMTP]
```

**Two parallel data paths:**
- **Frontend ↔ Supabase directly** — auth, reading logs/rules, and realtime subscriptions (fast, no backend hop).
- **Frontend ↔ FastAPI backend** — anything that needs computation: ML inference, SHAP explanations, genetic-algorithm rule generation, attack simulation, email alerts.

---

## 2. Request Detection Flow (the actual "firewall" logic)

```mermaid
sequenceDiagram
    participant Req as Incoming Request<br/>(payload, path, method, UA)
    participant Feat as Feature Extractor<br/>extract_features()
    participant IF as Isolation Forest<br/>(anomaly.py)
    participant Sig as Regex Signature Engine<br/>(ATTACK_PATTERNS)
    participant SHAP as SHAP Explainer
    participant DB as attack_logs (Supabase)
    participant Alert as Alert Service

    Req->>Feat: raw request
    Feat->>Feat: build 16-dim feature vector<br/>(length, special chars, SQL/XSS keywords,<br/>path depth, scanner UA, encoding, etc.)
    Feat->>IF: scaled feature vector
    IF-->>Feat: anomaly score (normal / anomaly)
    Feat->>Sig: payload + path
    Sig-->>Feat: matched attack type (SQLi/XSS/CmdInj/PathTraversal) or none

    alt anomaly OR signature match
        Feat->>SHAP: explain which features drove the score
        SHAP-->>Feat: per-feature contribution values
        Feat->>DB: log as Blocked/Flagged + attack_type + ai_score
        Feat->>Alert: fire notification (+ email if severity high)
        Alert->>DB: insert into notifications (per user)
    else normal traffic
        Feat->>DB: log as Allowed
    end
```

- **Hybrid detection** = ML (Isolation Forest, catches *unknown* attacks) + Regex signatures (catches *known* attack patterns fast).
- **SHAP** turns the black-box ML score into an explainable breakdown ("SQL Keywords contributed +0.8").
- Endpoints: `POST /api/ml/inference` (predict), `POST /api/ml/shap` (explain).

---

## 3. Self-Healing Flow (Genetic Algorithm)

This is what makes the WAF "self-healing" — when an attack **evades** existing rules, the system evolves a brand-new rule automatically instead of waiting for a human.

```mermaid
flowchart LR
    A[Evasion payload detected<br/>bypasses current rules] --> B[Seed population:<br/>20 candidate regex patterns<br/>from known attack tokens]
    B --> C{Generation loop<br/>x50}
    C --> D[Fitness scoring<br/>F1 = precision + recall<br/>vs payload set + normal traffic]
    D --> E[Selection:<br/>keep top 4 'elite' patterns]
    E --> F[Crossover:<br/>merge two elite patterns]
    F --> G[Mutation 30%:<br/>add / remove / tweak token]
    G --> C
    C -->|50 generations done| H[Best rule found]
    H --> I[Save as WafRule<br/>name = AUTO_HEAL_XXXXX]
    I --> J[Log HealingEvent<br/>accuracy + FP rate + generations]
    J --> K[Notify all users<br/>'Self-healing rule deployed']
```

- Endpoint: `POST /api/healing/trigger` (also mirrored at `POST /api/ml/healing/trigger` for direct ML testing).
- Rule and event are persisted (`waf_rules`, `healing_events` tables) so the frontend's **Self-Healing page** can show history.

---

## 4. Realtime UI Update Flow

```mermaid
sequenceDiagram
    participant Backend as Backend / Simulator
    participant DB as Supabase Postgres
    participant RTC as Supabase Realtime
    participant Hook as useRealtimeLogs / useRealtimeAlerts
    participant UI as React Dashboard

    Backend->>DB: INSERT attack_logs / notifications row
    DB->>RTC: postgres_changes event (INSERT)
    RTC->>Hook: pushed over WebSocket
    Hook->>UI: setState -> re-render
    Note over UI: Dashboard, Attack Logs, and<br/>Notifications pages update live<br/>with no polling
```

- The frontend never polls — it subscribes once (`supabase.channel(...).on('postgres_changes', ...)`) and reacts to DB writes from anywhere (backend simulator, genetic-algorithm healing, real traffic).
- A separate `traffic.py` WebSocket (`/api/traffic/ws`) streams simulated live traffic stats directly from the backend for the Traffic Monitor page.

---

## 5. Attack Simulator Flow (for demos/testing)

```mermaid
flowchart LR
    UI[Simulator Page] -->|POST /api/simulate/attack| SIM[simulate.py]
    SIM --> PICK[Pick attack type + payload<br/>from ATTACKS catalogue<br/>SQLi/XSS/CmdInj/PathTraversal/<br/>CSRF/XXE/SSRF/BruteForce]
    PICK --> ROW[Build fake attack_logs row<br/>severity, ai_score, status]
    ROW -->|service key insert, bypasses RLS| DB[(Supabase)]
    ROW --> NOTIFY[_notify_all_users]
    NOTIFY -->|insert| NDB[(notifications table)]
    DB -.realtime push.-> UI2[Dashboard / Logs update live]
    NDB -.realtime push.-> UI3[Notification bell updates live]
```

---

## 6. Summary Table

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | React + Vite, Supabase JS client | UI, auth session, direct DB reads, realtime subscriptions |
| Backend API | FastAPI (Python) | ML inference, SHAP explain, GA healing, simulator, email alerts |
| Detection | Isolation Forest + Regex signatures | Classify request as normal/anomalous + attack type |
| Explainability | SHAP TreeExplainer | Explain *why* a request was flagged |
| Self-Healing | Genetic Algorithm | Auto-generate new regex rule when an attack evades existing rules |
| Data | Supabase Postgres | `attack_logs`, `waf_rules`, `healing_events`, `notifications` |
| Realtime | Supabase Realtime (WebSocket) | Push DB changes to frontend instantly, no polling |
| Alerts | SMTP (Gmail) + in-app notifications | Notify on High/Critical severity attacks, rate-limited by cooldown |

---

## 7. Key Files

- `backend/app/ml/anomaly.py` — feature extraction, Isolation Forest, SHAP
- `backend/app/ml/healing.py` — genetic algorithm rule generation
- `backend/app/routes/ml.py` — `/api/ml/*` inference & SHAP endpoints
- `backend/app/routes/healing.py` — `/api/healing/*` self-healing trigger + history (persists to DB)
- `backend/app/routes/simulate.py` — `/api/simulate/*` demo attack generator
- `backend/app/routes/alerts.py` — `/api/alerts/*` email + in-app notification fan-out
- `backend/app/routes/traffic.py` — `/api/traffic/*` live traffic stats + WebSocket
- `backend/app/models/models.py` — SQLAlchemy models (`AttackLog`, `WafRule`, `HealingEvent`, `MLModel`)
- `frontend/src/hooks/useRealtime.js` — Supabase realtime subscriptions
- `frontend/src/services/api.js` — REST client to FastAPI backend
- `frontend/src/services/supabase.js` — Supabase client (auth + direct DB)
