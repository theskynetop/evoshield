from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import random
from ..core.database import get_db
from ..models.models import HealingEvent, WafRule
from ..ml.healing import genetic_rule_generation
from ..schemas.schemas import HealingResult

router = APIRouter(prefix="/api/healing", tags=["Self-Healing"])

@router.post("/trigger", response_model=HealingResult)
def trigger_healing(
    attack_type: str = "SQL Injection",
    payload:     str = "' OR 1=1--",
    db: Session = Depends(get_db)
):
    result = genetic_rule_generation(attack_type, payload)

    rule = WafRule(
        name           = result["name"],
        pattern        = result["pattern"],
        attack_type    = result["attack_type"],
        action         = "Block",
        severity       = "High",
        enabled        = True,
        auto_generated = True,
        description    = f"Auto-generated via Genetic Algorithm. Accuracy: {result['accuracy']}%",
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)

    event = HealingEvent(
        rule_id       = rule.id,
        ga_generations= result["generations"],
        accuracy      = result["accuracy"],
        fp_rate       = result["fp_rate"],
    )
    db.add(event)
    db.commit()

    return HealingResult(
        success    = True,
        rule_name  = result["name"],
        pattern    = result["pattern"],
        accuracy   = result["accuracy"],
        fp_rate    = result["fp_rate"],
        deployed_at= result["deployed_at"],
        generations= result["generations"],
    )

@router.get("/history")
def get_healing_history(db: Session = Depends(get_db)):
    events = db.query(HealingEvent).order_by(HealingEvent.deployed_at.desc()).limit(50).all()
    return events
