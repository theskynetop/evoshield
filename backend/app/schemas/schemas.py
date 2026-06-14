from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID

# ── Attack Logs ──────────────────────────────────────────────────────────────
class AttackLogBase(BaseModel):
    source_ip:   str
    method:      str
    path:        str
    payload:     Optional[str] = None
    attack_type: str
    severity:    str
    status:      str
    ai_score:    float = 0.0
    country:     Optional[str] = None
    user_agent:  Optional[str] = None
    response_code: Optional[int] = None
    bytes_in:    Optional[int] = None

class AttackLogCreate(AttackLogBase):
    rule_id: Optional[UUID] = None

class AttackLogOut(AttackLogBase):
    id:        UUID
    timestamp: datetime
    rule_id:   Optional[UUID] = None

    class Config:
        from_attributes = True

class AttackLogList(BaseModel):
    total: int
    items: List[AttackLogOut]

# ── Rules ────────────────────────────────────────────────────────────────────
class RuleBase(BaseModel):
    name:        str
    pattern:     str
    attack_type: str
    action:      str = "Block"
    severity:    str = "High"
    enabled:     bool = True
    description: Optional[str] = None

class RuleCreate(RuleBase):
    auto_generated: bool = False

class RuleUpdate(BaseModel):
    name:        Optional[str] = None
    pattern:     Optional[str] = None
    action:      Optional[str] = None
    severity:    Optional[str] = None
    enabled:     Optional[bool] = None
    description: Optional[str] = None

class RuleOut(RuleBase):
    id:             UUID
    auto_generated: bool
    hits:           int
    created_at:     datetime
    updated_at:     datetime

    class Config:
        from_attributes = True

# ── ML / Anomaly ─────────────────────────────────────────────────────────────
class InferenceRequest(BaseModel):
    payload:      str
    path:         str
    method:       str
    source_ip:    str
    user_agent:   Optional[str] = None
    content_type: Optional[str] = None

class InferenceResult(BaseModel):
    anomaly:     bool
    score:       float
    attack_type: Optional[str] = None
    confidence:  float
    explanation: Optional[dict] = None

class SHAPRequest(BaseModel):
    request_id: Optional[str] = None
    features:   dict

class SHAPResult(BaseModel):
    shap_values: dict
    base_value:  float
    prediction:  float
    features:    List[dict]

class ModelStats(BaseModel):
    accuracy:  float
    precision: float
    recall:    float
    f1_score:  float
    fp_rate:   float
    n_trees:   int
    version:   str
    trained_at: datetime

# ── Healing ──────────────────────────────────────────────────────────────────
class HealingResult(BaseModel):
    success:    bool
    rule_name:  str
    pattern:    str
    accuracy:   float
    fp_rate:    float
    deployed_at: datetime
    generations: int

# ── Dashboard ────────────────────────────────────────────────────────────────
class DashboardStats(BaseModel):
    total_requests:  int
    attacks_blocked: int
    active_threats:  int
    rules_healed:    int
    false_positive_rate: float
    uptime_pct:      float
    avg_latency_ms:  float
