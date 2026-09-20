"""Tests — Endpoints FastAPI (api/main.py).
Necessite les modeles entraînes. Sautes si RandomForest.pkl absent.
"""
import sys
from pathlib import Path
import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "api"))

MODEL_PKL = ROOT / "models" / "RandomForest.pkl"
skip_no_model = pytest.mark.skipif(
    not MODEL_PKL.exists(),
    reason="Modele non entraîne — lancez scripts/train_pipeline.py d'abord"
)

TX_LEGIT = {
    "amount": 15000.0,
    "transaction_type": "transfer",
    "channel": "mobile_app",
    "operator": "Orange",
    "timestamp": "2025-06-15T12:00:00",
    "sender_is_kyc_verified": 1,
    "sender_sim_swap_recent": 0,
    "sender_account_age": 180,
    "tx_count_24h": 2,
    "amount_sum_24h": 30000.0,
    "amount_vs_avg": 0.9,
}

TX_HIGH_RISK = {
    "amount": 1_800_000.0,
    "transaction_type": "payment",
    "channel": "ussd",
    "operator": "MTN",
    "timestamp": "2025-06-15T02:30:00",
    "sender_is_kyc_verified": 0,
    "sender_sim_swap_recent": 1,
    "sender_account_age": 2,
    "tx_count_24h": 30,
    "amount_sum_24h": 5_000_000.0,
    "amount_vs_avg": 20.0,
}


@pytest.fixture(scope="module")
def client():
    from fastapi.testclient import TestClient
    from api.main import app
    return TestClient(app)


@skip_no_model
class TestHealthEndpoint:
    def test_health_returns_200(self, client):
        r = client.get("/health")
        assert r.status_code == 200

    def test_health_body(self, client):
        r = client.get("/health")
        assert r.json()["status"] == "healthy"


@skip_no_model
class TestScoreEndpoint:
    def test_returns_200(self, client):
        r = client.post("/score", json=TX_LEGIT)
        assert r.status_code == 200

    def test_response_has_score(self, client):
        r = client.post("/score", json=TX_LEGIT)
        assert "score" in r.json()

    def test_response_has_decision(self, client):
        r = client.post("/score", json=TX_LEGIT)
        assert r.json()["decision"] in ("ACCEPTED", "BLOCKED")

    def test_score_in_range(self, client):
        r = client.post("/score", json=TX_LEGIT)
        score = r.json()["score"]
        assert 0.0 <= score <= 1.0

    def test_legit_accepted(self, client):
        r = client.post("/score", json=TX_LEGIT)
        assert r.json()["decision"] == "ACCEPTED"

    def test_high_risk_blocked(self, client):
        r = client.post("/score", json=TX_HIGH_RISK)
        # Un compte sans KYC, sim swap recent, 30 tx/24h doit etre bloque
        assert r.json()["decision"] == "BLOCKED"

    def test_response_has_latency(self, client):
        r = client.post("/score", json=TX_LEGIT)
        assert "latency_ms" in r.json()

    def test_missing_fields_use_defaults(self, client):
        """L'API ne doit pas crasher sur un corps minimal."""
        r = client.post("/score", json={"amount": 5000})
        assert r.status_code == 200

    def test_model_field_present(self, client):
        r = client.post("/score", json=TX_LEGIT)
        assert "model" in r.json()
        assert r.json()["model"] == "RandomForest"


@skip_no_model
class TestBatchEndpoint:
    def test_batch_returns_200(self, client):
        r = client.post("/score/batch", json=[TX_LEGIT, TX_HIGH_RISK])
        assert r.status_code == 200

    def test_batch_result_count(self, client):
        r = client.post("/score/batch", json=[TX_LEGIT, TX_HIGH_RISK, TX_LEGIT])
        results = r.json()["results"]
        assert len(results) == 3

    def test_batch_each_has_score(self, client):
        r = client.post("/score/batch", json=[TX_LEGIT, TX_HIGH_RISK])
        for item in r.json()["results"]:
            assert "score" in item
            assert "decision" in item

    def test_batch_limit_exceeded(self, client):
        """Plus de 100 transactions doit retourner 400."""
        batch = [TX_LEGIT] * 101
        r = client.post("/score/batch", json=batch)
        assert r.status_code == 400

    def test_batch_exactly_100_accepted(self, client):
        batch = [TX_LEGIT] * 100
        r = client.post("/score/batch", json=batch)
        assert r.status_code == 200


@skip_no_model
class TestMetricsEndpoint:
    def test_metrics_returns_200(self, client):
        r = client.get("/metrics")
        assert r.status_code == 200

    def test_metrics_content_type(self, client):
        r = client.get("/metrics")
        assert "text/plain" in r.headers["content-type"]

    def test_metrics_contains_prometheus_counters(self, client):
        # S'assurer qu'au moins un call /score a ete fait avant
        client.post("/score", json=TX_LEGIT)
        r = client.get("/metrics")
        assert "api_requests_total" in r.text
