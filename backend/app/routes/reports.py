from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
import csv
import io
import json
from datetime import datetime, timedelta
from ..core.database import get_db
from ..models.models import AttackLog

router = APIRouter(prefix="/api/reports", tags=["Reports"])

@router.get("")
def get_report_summary(
    period: str = Query("7d"),
    db: Session = Depends(get_db),
):
    days_map = {"24h": 1, "7d": 7, "30d": 30, "90d": 90}
    days  = days_map.get(period, 7)
    since = datetime.utcnow() - timedelta(days=days)

    logs  = db.query(AttackLog).filter(AttackLog.timestamp >= since).all()
    return {
        "period":        period,
        "total":         len(logs),
        "by_type":       {},
        "by_severity":   {},
        "by_status":     {},
        "generated_at":  datetime.utcnow().isoformat(),
    }

@router.get("/export")
def export_report(
    format: str = Query("csv"),
    period: str = Query("7d"),
    db: Session = Depends(get_db),
):
    days_map = {"24h": 1, "7d": 7, "30d": 30, "90d": 90}
    days  = days_map.get(period, 7)
    since = datetime.utcnow() - timedelta(days=days)
    logs  = db.query(AttackLog).filter(AttackLog.timestamp >= since).all()

    if format == "json":
        data = [{"id": str(l.id), "time": str(l.timestamp), "type": l.attack_type, "ip": l.source_ip,
                 "path": l.path, "severity": l.severity, "status": l.status, "score": l.ai_score}
                for l in logs]
        return StreamingResponse(
            io.BytesIO(json.dumps(data, indent=2).encode()),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=sh_waf_report.json"},
        )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID","Timestamp","Attack Type","Source IP","Path","Severity","Status","AI Score"])
    for l in logs:
        writer.writerow([str(l.id), l.timestamp, l.attack_type, l.source_ip, l.path, l.severity, l.status, l.ai_score])

    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sh_waf_report.csv"},
    )
