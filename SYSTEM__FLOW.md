# EVOSHIELD (Self-Healing WAF) — Simple Explanation


---

## What does this project do? (One line)

It is a **smart security guard (firewall)** for a website. It checks every incoming request — if the request looks like an **attack**, it **blocks** it. If it's a **new kind of attack** that no rule knows about yet, the system **automatically creates a new rule** for it. That's why it's called "Self-Healing."

---

## Step-by-Step Flow

```
Request comes in
      |
      v
WAF checks the request  --->  Pattern Matching: does it match a known attack?
      |                       AI Model: does it look unusual vs normal traffic?
      v
Attack found?
      |
      +-- Yes --> Block the request  --> Save log in database --> Send notification (+ email if serious)
      |
      +-- No  --> Allow the request  --> Save log in database
      |
      v
Dashboard updates instantly
```

---

## Part 1: How does detection work?

Think of two guards standing at the door:

**Guard 1 — Pattern Matcher (Signature-based)**
This guard has a list of known attack patterns (like `<script>`, `OR 1=1`, `../../etc/passwd`). If a request matches something on the list, it's blocked immediately.
- Fast, but only catches attacks it already knows about.

**Guard 2 — AI Model (Isolation Forest)**
This guard has learned what "normal" traffic looks like (length, special characters, number of symbols, etc.). If a request looks very different from normal — even if it's not on any list — it flags it as an "anomaly."
- Can catch new, previously unseen attacks too.

**SHAP (Explanation)**
When the AI model blocks something, SHAP explains *why* — for example, "SQL keywords contributed the most to this being flagged." This makes the AI's decision understandable instead of a black box.

Both guards work together, which makes detection more accurate.

---

## Part 2: How does Self-Healing work?

If an attack manages to bypass both guards (using a new trick), the system automatically builds a new rule to catch it. This process is called a **Genetic Algorithm** — inspired by evolution and natural selection.

```
New attack bypasses the rules
      |
      v
Generate 20 random candidate rules
      |
      v
Test each rule: how well does it catch the attack?  <---+
      |                                                  |
      v                                                  |
Keep the best rules, drop the weak ones                  |
      |                                                  |
      v                                                  |
Combine best rules + add small random changes  ----------+
      |
      | (repeat for 50 rounds)
      v
Best rule found --> Added to the WAF --> Next time, this attack is blocked instantly
```

In simple words: the system tries, tests, and improves a rule over **50 rounds** (generations) until it finds the best one — just like how the fittest survive in evolution.

---

## Part 3: How does the dashboard update live?

- Whenever an attack is blocked or a new rule is created, it is saved instantly in the **database (Supabase)**.
- The database sends a **real-time signal** to the website's dashboard.
- So the dashboard never needs to be refreshed — everything updates live, like getting a new message on WhatsApp.

---

## Part 4: Notifications & Email

- As soon as an attack is detected, an **in-app notification** is sent instantly to all logged-in users.
- If the attack is **serious (High/Critical)**, an **email** is also sent — but there's a cooldown period so it doesn't spam the inbox.


---

## One-line Viva Answer

> "Our WAF detects attacks in two ways — fixed rules for known attacks, and an AI model for new, unknown attacks. When an attack bypasses both, our system uses a Genetic Algorithm to automatically create a new rule, so the same attack is blocked next time. That's why it's called a 'Self-Healing' WAF."
