from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..core.database import get_db
from ..models.models import WafRule
from ..schemas.schemas import RuleCreate, RuleUpdate, RuleOut

router = APIRouter(prefix="/api/rules", tags=["WAF Rules"])

@router.get("", response_model=List[RuleOut])
def get_rules(db: Session = Depends(get_db)):
    return db.query(WafRule).order_by(WafRule.created_at.desc()).all()

@router.post("", response_model=RuleOut, status_code=201)
def create_rule(data: RuleCreate, db: Session = Depends(get_db)):
    existing = db.query(WafRule).filter(WafRule.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Rule name already exists")
    rule = WafRule(**data.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule

@router.get("/{rule_id}", response_model=RuleOut)
def get_rule(rule_id: str, db: Session = Depends(get_db)):
    rule = db.query(WafRule).filter(WafRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return rule

@router.put("/{rule_id}", response_model=RuleOut)
def update_rule(rule_id: str, data: RuleUpdate, db: Session = Depends(get_db)):
    rule = db.query(WafRule).filter(WafRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(rule, k, v)
    db.commit()
    db.refresh(rule)
    return rule

@router.delete("/{rule_id}", status_code=204)
def delete_rule(rule_id: str, db: Session = Depends(get_db)):
    rule = db.query(WafRule).filter(WafRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    db.delete(rule)
    db.commit()

@router.patch("/{rule_id}/toggle", response_model=RuleOut)
def toggle_rule(rule_id: str, db: Session = Depends(get_db)):
    rule = db.query(WafRule).filter(WafRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    rule.enabled = not rule.enabled
    db.commit()
    db.refresh(rule)
    return rule
