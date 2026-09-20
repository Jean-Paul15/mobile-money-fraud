"""Tests — Classe de prediction production (src/inference.py).
Ces tests necessitent les modeles entraînes. Ils sont sautes si
models/RandomForest.pkl n'existe pas (lancez scripts/train_pipeline.py d'abord).
"""
import sys
from pathlib import Path
import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

MODEL_PKL = ROOT / "models" / "RandomForest.pkl"
skip_no_model = pytest.mark.skipif(
    not MODEL_PKL.exists(),
    reason="Modele non entraîne — lancez scripts/train_pipeline.py d'abord"
)

# Transaction legitime type
TX_LEGIT = {
    "amount": 15_000,
    "transaction_type": "transfer",
    "channel": "mobile_app",
    "operator": "Orange",
    "sender_is_kyc_verified": 1,
    "sender_sim_swap_recent": 0,
    "sender_account_age": 180,
    "tx_count_24h": 2,
    "amount_sum_24h": 30_000,
    "amount_vs_avg": 0.9,
}

# Transaction a haut risque
TX_HIGH_RISK = {
    "amount": 1_800_000,
    "transaction_type": "payment",
    "channel": "ussd",
    "operator": "MTN",
    "sender_is_kyc_verified": 0,
    "sender_sim_swap_recent": 1,
    "sender_account_age": 2,
    "tx_count_24h": 30,
    "amount_sum_24h": 5_000_000,
    "amount_vs_avg": 20.0,
}


@pytest.fixture(scope="module")
def detector():
    from src.inference import MobileMoneyFraudDetector
    return MobileMoneyFraudDetector()


@skip_no_model
class TestMobileMoneyFraudDetector:
    def test_predict_returns_float(self, detector):
        score = detector.predict(TX_LEGIT)
        assert isinstance(score, float)

    def test_predict_score_in_range(self, detector):
        score = detector.predict(TX_LEGIT)
        assert 0.0 <= score <= 1.0

    def test_predict_batch_returns_list(self, detector):
        scores = detector.predict_batch([TX_LEGIT, TX_HIGH_RISK])
        assert isinstance(scores, list)
        assert len(scores) == 2

    def test_predict_batch_all_in_range(self, detector):
        batch = [TX_LEGIT, TX_HIGH_RISK, TX_LEGIT]
        scores = detector.predict_batch(batch)
        for s in scores:
            assert 0.0 <= s <= 1.0

    def test_high_risk_higher_score_than_legit(self, detector):
        """Une transaction a haut risque doit scorer plus haut qu'une legitime."""
        score_legit = detector.predict(TX_LEGIT)
        score_risk = detector.predict(TX_HIGH_RISK)
        assert score_risk > score_legit, (
            f"Attendu: score_risk({score_risk:.4f}) > score_legit({score_legit:.4f})")

    def test_batch_single_consistent_with_predict(self, detector):
        """predict_batch sur 1 element doit donner le meme resultat que predict."""
        single = detector.predict(TX_LEGIT)
        batch = detector.predict_batch([TX_LEGIT])
        assert abs(single - batch[0]) < 1e-6

    def test_missing_fields_use_defaults(self, detector):
        """Des champs manquants ne doivent pas faire planter le detecteur."""
        minimal = {"amount": 5000, "transaction_type": "recharge"}
        score = detector.predict(minimal)
        assert 0.0 <= score <= 1.0

    def test_predict_large_batch(self, detector):
        """Un batch de 50 transactions doit etre traite sans erreur."""
        batch = [TX_LEGIT] * 25 + [TX_HIGH_RISK] * 25
        scores = detector.predict_batch(batch)
        assert len(scores) == 50

    def test_score_rounded_to_4_decimals(self, detector):
        score = detector.predict(TX_LEGIT)
        assert score == round(score, 4)
