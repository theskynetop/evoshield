from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from datetime import datetime
import asyncio
import random
import json

router = APIRouter(prefix="/api/traffic", tags=["Traffic"])

METHODS  = ["GET","POST","PUT","DELETE","PATCH"]
PATHS    = ["/api/users","/api/login","/search","/products","/admin","/exec"]
IPS      = ["192.168.1.","10.0.0.","172.16.0.","203.0.113."]
STATUSES = [200,200,200,301,400,403,404,429,500]

def gen_req(i):
    attack = random.random() < 0.1
    return {
        "id":      i,
        "time":    datetime.utcnow().isoformat(),
        "method":  random.choice(METHODS),
        "path":    random.choice(PATHS),
        "ip":      random.choice(IPS) + str(random.randint(1,254)),
        "status":  random.choice(STATUSES),
        "latency": random.randint(1, 150),
        "attack":  random.choice(["SQL Injection","XSS","Path Traversal"]) if attack else None,
        "blocked": attack,
    }

@router.get("/live")
def get_live_snapshot():
    return [gen_req(i) for i in range(50)]

@router.get("/stats")
def get_traffic_stats():
    return {
        "rps":       random.randint(100, 350),
        "blocked":   random.randint(2, 20),
        "avg_latency": random.randint(10, 50),
        "error_rate": round(random.uniform(0.1, 3.0), 1),
    }

@router.websocket("/ws")
async def traffic_websocket(ws: WebSocket):
    await ws.accept()
    counter = 0
    try:
        while True:
            req = gen_req(counter)
            await ws.send_text(json.dumps(req))
            counter += 1
            await asyncio.sleep(0.5)
    except WebSocketDisconnect:
        pass
