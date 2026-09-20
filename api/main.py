"""Mobile Money Fraud Detection API - FastAPI."""
import sys
import time
from statistics import mean
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from prometheus_client import Counter, Gauge, Histogram, generate_latest
from pydantic import BaseModel

PROJECT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT))

from src.inference import MobileMoneyFraudDetector

detector = MobileMoneyFraudDetector()

app = FastAPI(title="Fraud Detection API", version="2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
REQ = Counter("api_requests_total", "Total requests", ["endpoint"])
DECISIONS = Counter("api_decisions_total", "Inference decisions", ["endpoint", "decision"])
LAT = Histogram(
    "api_latency_seconds",
    "Request latency",
    ["endpoint"],
    buckets=(0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.2, 0.5, 1, 2, 5),
)
SCORE = Histogram(
    "api_score_value",
    "Predicted fraud score",
    ["endpoint"],
    buckets=(0, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0),
)
BATCH_SIZE = Histogram("api_batch_size", "Batch size", buckets=(1, 2, 5, 10, 20, 50, 100))
LAST_SCORE = Gauge("api_last_score", "Last fraud score observed")
LAST_BATCH_SIZE = Gauge("api_last_batch_size", "Last batch size observed")
LAST_DECISION = Gauge("api_last_decision", "Last decision, 1=BLOCKED and 0=ACCEPTED")


class Transaction(BaseModel):
    amount: float = 0
    transaction_type: str = "transfer"
    channel: str = "mobile_app"
    operator: str = "Orange"
    timestamp: str = "2025-06-15T12:00:00"
    transaction_id: str = ""
    sender_is_kyc_verified: int = 1
    sender_sim_swap_recent: int = 0
    sender_activity_weight: float = 0.0
    sender_account_age: int = 90
    tx_count_24h: int = 0
    amount_sum_24h: float = 0.0
    amount_vs_avg: float = 1.0


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/score")
async def score(tx: Transaction):
    endpoint = "/score"
    with LAT.labels(endpoint="/score").time():
        t0 = time.time()
        tx_dict = tx.model_dump()
        fraud_score = detector.predict(tx_dict)
        decision = "BLOCKED" if fraud_score >= 0.5 else "ACCEPTED"
        risk_factors = detector.explain(tx_dict, _score=fraud_score)
        REQ.labels(endpoint=endpoint).inc()
        DECISIONS.labels(endpoint=endpoint, decision=decision).inc()
        SCORE.labels(endpoint=endpoint).observe(fraud_score)
        LAST_SCORE.set(fraud_score)
        LAST_BATCH_SIZE.set(1)
        LAST_DECISION.set(1 if decision == "BLOCKED" else 0)
        return {
            "score": fraud_score,
            "decision": decision,
            "model": "RandomForest",
            "latency_ms": round((time.time() - t0) * 1000, 2),
            "risk_factors": risk_factors,
        }


@app.post("/score/batch")
async def score_batch(txs: list[Transaction]):
    if len(txs) > 100:
        raise HTTPException(400, "Max 100 transactions")
    endpoint = "/score/batch"
    with LAT.labels(endpoint=endpoint).time():
        tx_dicts = [t.model_dump() for t in txs]
        scores = detector.predict_batch(tx_dicts)
        decisions = ["BLOCKED" if s >= 0.5 else "ACCEPTED" for s in scores]
        explanations = detector.explain_batch(tx_dicts)
        REQ.labels(endpoint=endpoint).inc()
        BATCH_SIZE.observe(len(txs))
        for s, decision in zip(scores, decisions):
            SCORE.labels(endpoint=endpoint).observe(s)
            DECISIONS.labels(endpoint=endpoint, decision=decision).inc()
        LAST_SCORE.set(mean(scores) if scores else 0.0)
        LAST_BATCH_SIZE.set(len(txs))
        LAST_DECISION.set(1 if decisions and decisions[-1] == "BLOCKED" else 0)
        return {"results": [
            {"score": s, "decision": d, "risk_factors": rf}
            for s, d, rf in zip(scores, decisions, explanations)
        ]}


@app.get("/metrics")
async def metrics():
    return Response(content=generate_latest(), media_type="text/plain")
