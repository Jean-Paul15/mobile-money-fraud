"""Fixtures partagées pour toute la suite de tests."""
import sys
from pathlib import Path
import numpy as np
import pandas as pd
import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

MODEL_PKL = ROOT / "models" / "RandomForest.pkl"
models_available = pytest.mark.skipif(
    not MODEL_PKL.exists(),
    reason="Modeles non entraînes — lancez scripts/train_pipeline.py d'abord"
)


@pytest.fixture
def small_accounts():
    """50 comptes synthetiques pour les tests rapides."""
    np.random.seed(42)
    n = 50
    return pd.DataFrame({
        "account_id": [f"ACC{str(i).zfill(8)}" for i in range(n)],
        "phone_number_hash": [f"hash_{i}" for i in range(n)],
        "operator": np.random.choice(["Orange", "MTN", "Moov"], n, p=[0.5, 0.35, 0.15]),
        "country": np.random.choice(["SEN", "CIV", "MLI"], n),
        "is_kyc_verified": np.random.choice([True, False], n, p=[0.65, 0.35]),
        "sim_swap_recent": np.random.choice([True, False], n, p=[0.04, 0.96]),
        "activity_weight": np.ones(n) / n,
    })


@pytest.fixture
def small_transactions(small_accounts):
    """200 transactions synthetiques (dont 2 fraudes)."""
    np.random.seed(42)
    n = 200
    ids = small_accounts["account_id"].values
    senders = np.random.choice(ids, n)
    receivers = np.random.choice(ids, n)
    # Garantir sender != receiver
    for i in range(n):
        while receivers[i] == senders[i]:
            receivers[i] = np.random.choice(ids)

    timestamps = pd.date_range("2025-01-01", periods=n, freq="2h")
    amounts = np.random.randint(500, 500_000, n)
    is_fraud = np.zeros(n, dtype=int)
    is_fraud[[10, 50]] = 1

    return pd.DataFrame({
        "transaction_id": [f"TX{str(i).zfill(10)}" for i in range(n)],
        "timestamp": timestamps,
        "sender_id": senders,
        "receiver_id": receivers,
        "amount": amounts,
        "amount_category": ["small"] * n,
        "transaction_type": np.random.choice(
            ["transfer", "payment", "recharge", "withdrawal", "bill_pay"], n),
        "channel": np.random.choice(["mobile_app", "ussd", "agent", "web"], n),
        "operator": np.random.choice(["Orange", "MTN", "Moov"], n),
        "sender_phone_hash": [f"hash_{i%50}" for i in range(n)],
        "city": np.random.choice(["DAK", "ABJ", "BKO", "OTHER"], n),
        "is_fraud": is_fraud,
        "fraud_type": ["none"] * 198 + ["account_takeover", "smishing"],
    })
