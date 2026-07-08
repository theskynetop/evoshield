# SH-WAF (Self-Healing Web Application Firewall) — Algorithms Used

## 1. Isolation Forest (Anomaly Detection)
**Library:** scikit-learn (`sklearn.ensemble.IsolationForest`)
**File:** `backend/app/ml/anomaly.py`

Isolation Forest is an unsupervised machine learning algorithm used to detect
anomalous (potentially malicious) HTTP requests. It works by randomly
partitioning data — anomalies are points that get "isolated" in fewer random
splits than normal points, so they get a shorter average path length in the
trees.

**How it's used here:**
- Each incoming request is converted into a 16-dimensional feature vector
  (payload length, number of special characters, SQL/XSS keyword counts,
  path depth, presence of scanner user-agents, URL encoding, etc. — see
  `extract_features()`).
- Features are normalized using `StandardScaler`.
- The trained `IsolationForest` (200 estimators, contamination = 0.05)
  predicts whether the request is **normal** or an **anomaly**, and produces
  an anomaly score.

## 2. SHAP (SHapley Additive exPlanations) — Explainable AI
**Library:** `shap.TreeExplainer`
**File:** `backend/app/ml/anomaly.py`

SHAP is a game-theory-based method used to explain the output of machine
learning models. Here it explains *why* the Isolation Forest flagged a
request as anomalous, by attributing an importance value (SHAP value) to
each of the 16 input features (e.g. "SQL Keywords contributed +0.8 to the
anomaly score"). This gives the WAF explainability instead of a black-box
decision.

## 3. Signature/Pattern Matching (Regex-based Rule Engine)
**File:** `backend/app/ml/anomaly.py`, `backend/app/ml/healing.py`

Alongside the ML model, a classic rule-based detection layer uses regular
expressions to identify known attack signatures for:
- SQL Injection (`UNION SELECT`, `OR 1=1`, `SLEEP()`, etc.)
- Cross-Site Scripting / XSS (`<script>`, `onerror=`, `javascript:`, etc.)
- Command Injection (`; whoami`, `` `cmd` ``, `/bin/sh`, etc.)
- Path Traversal (`../../`, `%2e%2e%2f`, `etc/passwd`, etc.)

This hybrid approach (ML + signatures) improves detection accuracy — ML
catches unknown/novel attacks, signatures catch known attack patterns fast.

## 4. Genetic Algorithm (Self-Healing Rule Generation)
**File:** `backend/app/ml/healing.py`

This is the "self-healing" part of the project. When an attack bypasses
existing rules (an evasion payload), a **Genetic Algorithm (GA)** automatically
evolves a new regex rule to block it, without a human writing the rule
manually.

**GA components implemented:**
- **Population:** a set of candidate regex patterns, seeded from known
  attack-pattern tokens for that attack type.
- **Fitness Function:** each candidate pattern is scored using the
  **F1-score** (precision + recall) — how well it matches the malicious
  payload (true positives) vs. how much it avoids matching normal/benign
  traffic (false positives).
- **Selection:** the top-scoring patterns ("elite") survive each generation.
- **Crossover:** two parent patterns are combined (split on `|` OR-operator
  and merged) to create a child pattern.
- **Mutation:** a pattern is randomly modified (add a new pattern token,
  remove one, or tweak it) with a 30% mutation probability, to maintain
  diversity and avoid local optima.
- **Generations:** the population evolves over 50 generations, keeping the
  best rule found (highest fitness) across all generations.
- **Output:** a new WAF rule (regex pattern) with computed accuracy and
  false-positive rate, auto-named `AUTO_HEAL_XXXXX`.

## Summary Table

| # | Algorithm                  | Type                        | Purpose                                      |
|---|-----------------------------|------------------------------|-----------------------------------------------|
| 1 | Isolation Forest            | Unsupervised ML (ensemble)  | Detect anomalous/malicious requests          |
| 2 | SHAP (TreeExplainer)        | Explainable AI              | Explain why a request was flagged            |
| 3 | Regex Signature Matching    | Rule-based detection        | Detect known attack patterns (SQLi/XSS/etc.) |
| 4 | Genetic Algorithm           | Evolutionary/heuristic search| Auto-generate new rules to self-heal WAF     |
