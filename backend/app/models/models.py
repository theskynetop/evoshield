from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from ..core.database import Base

def gen_uuid():
    return str(uuid.uuid4())

class AttackLog(Base):
    __tablename__ = "attack_logs"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timestamp  = Column(DateTime, default=datetime.utcnow, index=True)
    source_ip  = Column(String(45), index=True)
    method     = Column(String(10))
    path       = Column(Text)
    payload    = Column(Text)
    attack_type= Column(String(50), index=True)
    severity   = Column(String(20), index=True)
    status     = Column(String(20))      # Blocked | Healed | Allowed | Flagged
    rule_id    = Column(UUID(as_uuid=True), ForeignKey("waf_rules.id"), nullable=True)
    ai_score   = Column(Float, default=0.0)
    country    = Column(String(10))
    user_agent = Column(Text)
    response_code = Column(Integer)
    bytes_in   = Column(Integer)


class WafRule(Base):
    __tablename__ = "waf_rules"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name        = Column(String(200), unique=True)
    pattern     = Column(Text)
    attack_type = Column(String(50))
    action      = Column(String(20), default="Block")  # Block | Allow | Log | Rate Limit
    severity    = Column(String(20), default="High")
    enabled     = Column(Boolean, default=True)
    auto_generated = Column(Boolean, default=False)
    description = Column(Text)
    hits        = Column(Integer, default=0)
    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    logs        = relationship("AttackLog", backref="rule", foreign_keys=[AttackLog.rule_id])


class HealingEvent(Base):
    __tablename__ = "healing_events"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rule_id     = Column(UUID(as_uuid=True), ForeignKey("waf_rules.id"))
    trigger_log = Column(UUID(as_uuid=True), ForeignKey("attack_logs.id"))
    ga_generations = Column(Integer)
    accuracy    = Column(Float)
    fp_rate     = Column(Float)
    deployed_at = Column(DateTime, default=datetime.utcnow)
    status      = Column(String(20), default="Active")


class MLModel(Base):
    __tablename__ = "ml_models"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version    = Column(String(50))
    accuracy   = Column(Float)
    precision  = Column(Float)
    recall     = Column(Float)
    f1_score   = Column(Float)
    fp_rate    = Column(Float)
    n_trees    = Column(Integer, default=200)
    trained_at = Column(DateTime, default=datetime.utcnow)
    is_active  = Column(Boolean, default=True)
    metadata_  = Column(Text)
