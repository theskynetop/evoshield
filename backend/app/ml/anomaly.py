"""
Isolation Forest anomaly detection module with SHAP explainability.
"""
import numpy as np
import re
import json
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import shap
import pickle
from pathlib import Path

MODEL_PATH = Path(__file__).parent / "isolation_forest.pkl"
SCALER_PATH = Path(__file__).parent / "scaler.pkl"

ATTACK_PATTERNS = {
    "SQL Injection": [
        r"(?i)(union\s+select|drop\s+table|insert\s+into|delete\s+from|update\s+set)",
        r"(?i)(\bor\b\s+\d+=\d+|'\s+or\s+'|1\s*=\s*1|sleep\(\d+\))",
        r"(?i)(exec\s*\(|xp_cmdshell|sp_executesql)",
    ],
    "XSS": [
        r"(?i)(<script[\s\S]*?>|javascript:|onerror\s*=|onload\s*=)",
        r"(?i)(alert\s*\(|document\.cookie|eval\s*\()",
        r"(?i)(<img[^>]+src\s*=\s*['\"]?javascript:)",
    ],
    "Command Injection": [
        r"[;&|`$]\s*(ls|cat|id|whoami|wget|curl|nc|bash|sh|python)",
        r"(\$\(|\`|\|\s*bash|\|\s*sh)",
        r"(?i)(cmd\.exe|/bin/sh|/bin/bash)",
    ],
    "Path Traversal": [
        r"(\.\./|\.\.\\|%2e%2e%2f|%252e%252e)",
        r"(etc/passwd|etc/shadow|win\.ini|system32)",
    ],
}

def extract_features(payload: str, path: str, method: str,
                     user_agent: str = "", content_type: str = "") -> np.ndarray:
    ua     = user_agent or ""
    ct     = content_type or ""
    pld    = payload or ""
    full   = pld + path

    features = [
        len(pld),                                           # payload_length
        len(set(pld)),                                      # unique_chars
        sum(1 for c in pld if not c.isalnum()),            # special_chars
        len(re.findall(r'[\'"\-\(\)\;\=\<\>]', pld)),     # sql_special_chars
        len(re.findall(r'(?i)(select|union|from|where|insert|drop|delete|update)', pld)),
        len(re.findall(r'(?i)(<|>|script|onerror|onclick|alert)', pld)),
        len(re.findall(r'[;&|`$]', pld)),
        full.count('../') + full.count('..\\'),
        1 if method == "POST" else 0,
        1 if method == "PUT" else 0,
        len(path.split('/')),                               # path_depth
        1 if re.search(r'(?i)(sqlmap|nikto|nmap|burp|acunetix)', ua) else 0,
        len(pld) / max(len(path), 1),                      # payload_to_path_ratio
        1 if re.search(r'%[0-9a-fA-F]{2}', pld) else 0,  # url_encoded
        1 if re.search(r'(?i)(base64|eval\()', pld) else 0,
        1 if ct and 'xml' in ct else 0,
    ]
    return np.array(features, dtype=float).reshape(1, -1)

def detect_attack_type(payload: str, path: str) -> str | None:
    text = (payload or "") + (path or "")
    for attack, patterns in ATTACK_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, text):
                return attack
    return None

class WAFAnomalyDetector:
    def __init__(self):
        self.model   = None
        self.scaler  = StandardScaler()
        self.explainer = None
        self._load_or_train()

    def _load_or_train(self):
        if MODEL_PATH.exists() and SCALER_PATH.exists():
            with open(MODEL_PATH, "rb") as f:
                self.model = pickle.load(f)
            with open(SCALER_PATH, "rb") as f:
                self.scaler = pickle.load(f)
        else:
            self._train_default()

    def _train_default(self):
        np.random.seed(42)
        n_normal  = 8000
        n_anomaly = 400

        normal = np.random.randn(n_normal, 16) * np.array(
            [50, 20, 5, 2, 0, 0, 0, 0, 0.5, 0.2, 3, 0, 0.3, 0.1, 0.05, 0.05]
        ) + np.array([80, 35, 8, 1, 0, 0, 0, 0, 0.5, 0.2, 3, 0, 0.5, 0.1, 0.02, 0.01])

        anomaly = np.random.randn(n_anomaly, 16) * np.array(
            [200, 30, 20, 15, 5, 5, 5, 3, 0.5, 0.4, 5, 0.7, 2, 0.8, 0.6, 0.5]
        ) + np.array([500, 60, 30, 20, 8, 6, 4, 2, 0.5, 0.4, 6, 0.7, 3, 0.8, 0.6, 0.5])

        X = np.vstack([normal, anomaly])
        X_scaled = self.scaler.fit_transform(X)

        self.model = IsolationForest(
            n_estimators=200,
            max_samples="auto",
            contamination=0.05,
            random_state=42,
            n_jobs=-1,
        )
        self.model.fit(X_scaled)
        self._save()

    def _save(self):
        MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(MODEL_PATH, "wb") as f:
            pickle.dump(self.model, f)
        with open(SCALER_PATH, "wb") as f:
            pickle.dump(self.scaler, f)

    def predict(self, payload, path, method, user_agent="", content_type=""):
        features = extract_features(payload, path, method, user_agent, content_type)
        scaled   = self.scaler.transform(features)
        pred     = self.model.predict(scaled)[0]      # 1 = normal, -1 = anomaly
        score    = self.model.score_samples(scaled)[0] # lower = more anomalous
        norm_score = max(0.0, min(1.0, (-score + 0.5) / 0.8))

        anomaly     = pred == -1
        attack_type = detect_attack_type(payload, path)
        confidence  = norm_score if anomaly else 1 - norm_score

        return {
            "anomaly":     anomaly,
            "score":       round(norm_score, 4),
            "attack_type": attack_type,
            "confidence":  round(confidence, 4),
        }

    def explain(self, payload, path, method, user_agent="", content_type=""):
        features = extract_features(payload, path, method, user_agent, content_type)
        scaled   = self.scaler.transform(features)

        if self.explainer is None:
            bg = np.zeros((100, scaled.shape[1]))
            self.explainer = shap.TreeExplainer(self.model, data=bg)

        shap_vals = self.explainer.shap_values(scaled)

        feature_names = [
            "Payload Length","Unique Chars","Special Chars","SQL Chars",
            "SQL Keywords","XSS Patterns","Cmd Chars","Path Traversal",
            "Is POST","Is PUT","Path Depth","Scanner UA","Payload/Path Ratio",
            "URL Encoded","Obfuscation","XML Content",
        ]

        return {
            "shap_values": {n: round(float(v), 4) for n, v in zip(feature_names, shap_vals[0])},
            "base_value":  round(float(self.explainer.expected_value), 4),
            "prediction":  round(float(self.model.score_samples(scaled)[0]), 4),
            "features": [
                {"name": n, "value": round(float(v), 4)}
                for n, v in zip(feature_names, shap_vals[0])
            ],
        }

    def retrain(self, samples: list[dict]):
        rows = []
        for s in samples:
            f = extract_features(s.get("payload",""), s.get("path",""), s.get("method","GET"))
            rows.append(f[0])
        X = np.array(rows)
        X_scaled = self.scaler.fit_transform(X)
        self.model = IsolationForest(n_estimators=200, contamination=0.05, random_state=42)
        self.model.fit(X_scaled)
        self._save()

_detector = None

def get_detector() -> WAFAnomalyDetector:
    global _detector
    if _detector is None:
        _detector = WAFAnomalyDetector()
    return _detector
