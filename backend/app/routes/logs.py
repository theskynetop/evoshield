from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import Optional
from ..core.database import get_db
from ..models.models import AttackLog
from ..schemas.schemas import AttackLogCreate, AttackLogOut, AttackLogList

router = APIRouter(prefix="/api/logs", tags=["Attack Logs"])

@router.get("", response_model=AttackLogList)
def get_logs(
    db:          Session = Depends(get_db),
    skip:        int = Query(0, ge=0),
    limit:       int = Query(50, le=500),
    attack_type: Optional[str] = None,
    severity:    Optional[str] = None,
    status:      Optional[str] = None,
    source_ip:   Optional[str] = None,
):
    q = db.query(AttackLog)
    if attack_type: q = q.filter(AttackLog.attack_type == attack_type)
    if severity:    q = q.filter(AttackLog.severity    == severity)
    if status:      q = q.filter(AttackLog.status      == status)
    if source_ip:   q = q.filter(AttackLog.source_ip   == source_ip)

    total = q.count()
    items = q.order_by(desc(AttackLog.timestamp)).offset(skip).limit(limit).all()
    return AttackLogList(total=total, items=items)

@router.get("/{log_id}", response_model=AttackLogOut)
def get_log(log_id: str, db: Session = Depends(get_db)):
    log = db.query(AttackLog).filter(AttackLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    return log

@router.post("", response_model=AttackLogOut, status_code=201)
def create_log(data: AttackLogCreate, db: Session = Depends(get_db)):
    log = AttackLog(**data.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
