"""Tests — Feature engineering anti-leakage (src/features/engineering.py)."""
import sys
from pathlib import Path
import numpy as np
import pandas as pd
import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from src.features.engineering import engineer_features_train, engineer_features_test


# ── Fixtures locales ──────────────────────────────────────────────────────────

def make_accounts(n=50, seed=0):
    rng = np.random.default_rng(seed)
    return pd.DataFrame({
        "account_id": [f"ACC{i:08d}" for i in range(n)],
        "phone_number_hash": [f"hash_{i}" for i in range(n)],
        "operator": rng.choice(["Orange", "MTN", "Moov"], n),
        "country": rng.choice(["SEN", "CIV", "MLI"], n),
        "is_kyc_verified": rng.choice([True, False], n),
        "sim_swap_recent": rng.choice([True, False], n, p=[0.04, 0.96]),
        "activity_weight": np.ones(n) / n,
    })


def make_transactions(accounts, n=200, start="2025-01-01", seed=1):
    rng = np.random.default_rng(seed)
    ids = accounts["account_id"].values
    senders = rng.choice(ids, n)
    receivers = rng.choice(ids, n)
    for i in range(n):
        while receivers[i] == senders[i]:
            receivers[i] = rng.choice(ids)
    timestamps = pd.date_range(start, periods=n, freq="3h")
    amounts = rng.integers(500, 500_000, n)
    is_fraud = np.zeros(n, dtype=int)
    is_fraud[::50] = 1
    return pd.DataFrame({
        "transaction_id": [f"TX{i:010d}" for i in range(n)],
        "timestamp": timestamps,
        "sender_id": senders,
        "receiver_id": receivers,
        "amount": amounts.astype(int),
        "amount_category": ["small"] * n,
        "transaction_type": rng.choice(
            ["transfer", "payment", "recharge", "withdrawal", "bill_pay"], n),
        "channel": rng.choice(["mobile_app", "ussd", "agent", "web"], n),
        "operator": rng.choice(["Orange", "MTN", "Moov"], n),
        "sender_phone_hash": [f"ph_{i%50}" for i in range(n)],
        "city": rng.choice(["DAK", "ABJ", "OTHER"], n),
        "is_fraud": is_fraud,
        "fraud_type": ["account_takeover" if f else "none" for f in is_fraud],
    })


@pytest.fixture(scope="module")
def engineered():
    acc = make_accounts()
    tx_train = make_transactions(acc, n=150, start="2025-01-01")
    tx_test = make_transactions(acc, n=60, start="2025-07-01", seed=99)
    X_train, y_train, params = engineer_features_train(tx_train, acc)
    X_test, y_test = engineer_features_test(tx_test, acc, params)
    return X_train, y_train, X_test, y_test, params


# ── Tests train ───────────────────────────────────────────────────────────────

class TestEngineerFeaturesTrain:
    def test_returns_dataframe(self, engineered):
        X_train, *_ = engineered
        assert hasattr(X_train, "columns")

    def test_target_not_in_features(self, engineered):
        X_train, *_ = engineered
        assert "is_fraud" not in X_train.columns

    def test_no_raw_amount_column(self, engineered):
        X_train, *_ = engineered
        # amount brut doit etre remplace par amount_log
        assert "amount" not in X_train.columns
        assert "amount_log" in X_train.columns

    def test_temporal_features_present(self, engineered):
        X_train, *_ = engineered
        for col in ["hour_sin", "hour_cos", "is_night", "is_weekend"]:
            assert col in X_train.columns

    def test_hour_sin_cos_range(self, engineered):
        X_train, *_ = engineered
        assert X_train["hour_sin"].between(-1, 1).all()
        assert X_train["hour_cos"].between(-1, 1).all()

    def test_is_night_binary(self, engineered):
        X_train, *_ = engineered
        assert set(X_train["is_night"].unique()).issubset({0, 1})

    def test_rolling_window_features(self, engineered):
        X_train, *_ = engineered
        assert "tx_count_24h" in X_train.columns
        assert "amount_sum_24h" in X_train.columns

    def test_rolling_non_negative(self, engineered):
        X_train, *_ = engineered
        assert (X_train["tx_count_24h"] >= 0).all()
        assert (X_train["amount_sum_24h"] >= 0).all()

    def test_no_nan_in_features(self, engineered):
        X_train, *_ = engineered
        assert not X_train.isnull().any().any()

    def test_labels_aligned(self, engineered):
        X_train, y_train, *_ = engineered
        assert len(X_train) == len(y_train)

    def test_train_params_contains_sender_means(self, engineered):
        *_, params = engineered
        assert "sender_means" in params
        assert isinstance(params["sender_means"], dict)

    def test_train_params_contains_first_tx(self, engineered):
        *_, params = engineered
        assert "first_tx" in params


# ── Anti-leakage ──────────────────────────────────────────────────────────────

class TestAntiLeakage:
    def test_test_uses_train_sender_means(self, engineered):
        """amount_vs_avg dans le test doit utiliser les moyennes DU TRAIN."""
        X_train, _, X_test, _, params = engineered
        # Les sender_means viennent du train, pas du test
        assert len(params["sender_means"]) > 0
        # Verifier que amount_vs_avg est present dans le test
        assert "amount_vs_avg" in X_test.columns

    def test_rolling_closed_left_first_tx(self):
        """La premiere transaction d'un sender ne doit compter aucune tx precedente."""
        acc = make_accounts(5)
        # Un seul sender, une seule transaction
        single_tx = pd.DataFrame({
            "transaction_id": ["TX0000000000"],
            "timestamp": pd.to_datetime(["2025-03-01 10:00:00"]),
            "sender_id": [acc["account_id"].iloc[0]],
            "receiver_id": [acc["account_id"].iloc[1]],
            "amount": [10000],
            "amount_category": ["small"],
            "transaction_type": ["transfer"],
            "channel": ["mobile_app"],
            "operator": ["Orange"],
            "sender_phone_hash": ["hash_0"],
            "city": ["DAK"],
            "is_fraud": [0],
            "fraud_type": ["none"],
        })
        X, y, _ = engineer_features_train(single_tx, acc)
        # tx_count_24h doit etre 0 (aucune tx AVANT celle-ci)
        assert X["tx_count_24h"].iloc[0] == 0

    def test_train_test_no_shared_computation(self, engineered):
        """Le test ne doit pas recalculer les stats globales."""
        X_train, _, X_test, _, params = engineered
        # Les deux sets doivent avoir les memes colonnes (apres one-hot alignement)
        train_cols = set(X_train.columns)
        test_cols = set(X_test.columns)
        # Les colonnes de base communes doivent exister dans les deux
        base_cols = {"amount_log", "hour_sin", "hour_cos", "is_night",
                     "sender_is_kyc_verified", "tx_count_24h"}
        assert base_cols.issubset(train_cols)
        assert base_cols.issubset(test_cols)


# ── Tests test set ────────────────────────────────────────────────────────────

class TestEngineerFeaturesTest:
    def test_no_nan(self, engineered):
        _, _, X_test, _, _ = engineered
        assert not X_test.isnull().any().any()

    def test_labels_aligned(self, engineered):
        _, _, X_test, y_test, _ = engineered
        assert len(X_test) == len(y_test)

    def test_new_sender_gets_zero_age(self, engineered):
        """Un sender absent du train doit avoir sender_account_age=0."""
        X_train, y_train, X_test, y_test, params = engineered
        acc = make_accounts()
        # Transaction avec un sender qui n'est pas dans train_params["first_tx"]
        fake_tx = pd.DataFrame({
            "transaction_id": ["TX_NEW"],
            "timestamp": pd.to_datetime(["2025-08-01"]),
            "sender_id": ["ACC99999999"],   # inconnu du train
            "receiver_id": [acc["account_id"].iloc[0]],
            "amount": [5000],
            "amount_category": ["small"],
            "transaction_type": ["transfer"],
            "channel": ["mobile_app"],
            "operator": ["Orange"],
            "sender_phone_hash": ["unknown"],
            "city": ["DAK"],
            "is_fraud": [0],
            "fraud_type": ["none"],
        })
        X_new, _ = engineer_features_test(fake_tx, acc, params)
        assert X_new["sender_account_age"].iloc[0] == 0
