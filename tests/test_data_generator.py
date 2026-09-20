"""Tests — Generateur de donnees (src/data/generator.py)."""
import sys
from pathlib import Path
import numpy as np
import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from src.data.generator import (
    generate_accounts,
    generate_legitimate_transactions,
    inject_fraud,
    _amount_category,
    COUNTRIES, OPERATORS, TX_TYPES, CHANNELS, FRAUD_RATE,
)


# ── Comptes ──────────────────────────────────────────────────────────────────

class TestGenerateAccounts:
    def test_count(self):
        acc = generate_accounts(100)
        assert len(acc) == 100

    def test_columns(self):
        acc = generate_accounts(10)
        expected = {"account_id", "phone_number_hash", "operator", "country",
                    "is_kyc_verified", "sim_swap_recent", "activity_weight"}
        assert expected.issubset(set(acc.columns))

    def test_account_id_unique(self):
        acc = generate_accounts(200)
        assert acc["account_id"].nunique() == 200

    def test_operators_valid(self):
        acc = generate_accounts(200)
        assert set(acc["operator"]).issubset(set(OPERATORS))

    def test_countries_valid(self):
        acc = generate_accounts(200)
        assert set(acc["country"]).issubset(set(COUNTRIES))

    def test_activity_weight_sums_to_one(self):
        acc = generate_accounts(100)
        assert abs(acc["activity_weight"].sum() - 1.0) < 1e-9

    def test_kyc_boolean(self):
        acc = generate_accounts(100)
        assert acc["is_kyc_verified"].dtype == bool or set(acc["is_kyc_verified"]).issubset({True, False})

    def test_sim_swap_rate(self):
        """Taux SIM swap doit etre proche de 4%."""
        acc = generate_accounts(5000)
        rate = acc["sim_swap_recent"].mean()
        assert 0.01 < rate < 0.10


# ── Transactions legitimes ────────────────────────────────────────────────────

class TestGenerateLegitimateTransactions:
    def setup_method(self):
        self.acc = generate_accounts(100)

    def test_count(self):
        tx = generate_legitimate_transactions(self.acc, 500)
        assert len(tx) == 500

    def test_no_self_transfer(self):
        tx = generate_legitimate_transactions(self.acc, 500)
        assert (tx["sender_id"] == tx["receiver_id"]).sum() == 0

    def test_amounts_positive(self):
        tx = generate_legitimate_transactions(self.acc, 300)
        assert (tx["amount"] > 0).all()

    def test_amounts_in_range(self):
        tx = generate_legitimate_transactions(self.acc, 300)
        assert tx["amount"].min() >= 50
        assert tx["amount"].max() <= 3_000_000

    def test_all_fraud_zero(self):
        tx = generate_legitimate_transactions(self.acc, 300)
        assert (tx["is_fraud"] == 0).all()

    def test_channels_valid(self):
        tx = generate_legitimate_transactions(self.acc, 300)
        assert set(tx["channel"]).issubset(set(CHANNELS))

    def test_transaction_types_valid(self):
        tx = generate_legitimate_transactions(self.acc, 300)
        assert set(tx["transaction_type"]).issubset(set(TX_TYPES))

    def test_sorted_by_timestamp(self):
        tx = generate_legitimate_transactions(self.acc, 300)
        assert (tx["timestamp"].diff().dropna() >= pd.Timedelta(0)).all()

    def test_senders_from_known_accounts(self):
        tx = generate_legitimate_transactions(self.acc, 300)
        known = set(self.acc["account_id"])
        assert set(tx["sender_id"]).issubset(known)


# ── Injection de fraudes ──────────────────────────────────────────────────────

class TestInjectFraud:
    def setup_method(self):
        self.acc = generate_accounts(100)
        tx = generate_legitimate_transactions(self.acc, 1000)
        self.tx = inject_fraud(tx, self.acc)

    def test_fraud_count_approximate(self):
        n_fraud = self.tx["is_fraud"].sum()
        expected = int(1000 * FRAUD_RATE)
        assert abs(n_fraud - expected) <= 2

    def test_fraud_types_valid(self):
        valid = {"account_takeover", "stolen_card", "mule_network",
                 "synthetic_id", "smishing", "none"}
        assert set(self.tx["fraud_type"]).issubset(valid)

    def test_legit_unchanged(self):
        legit = self.tx[self.tx["is_fraud"] == 0]
        assert (legit["fraud_type"] == "none").all()

    def test_fraud_labels_consistent(self):
        frauds = self.tx[self.tx["is_fraud"] == 1]
        assert (frauds["fraud_type"] != "none").all()

    def test_account_takeover_amount_range(self):
        ato = self.tx[(self.tx["fraud_type"] == "account_takeover")]
        if len(ato) > 0:
            assert (ato["amount"] >= 100_000).all()

    def test_smishing_channel(self):
        sm = self.tx[self.tx["fraud_type"] == "smishing"]
        if len(sm) > 0:
            assert (sm["channel"] == "ussd").all()


# ── Categorie de montant ──────────────────────────────────────────────────────

class TestAmountCategory:
    def test_micro(self):
        assert _amount_category(1000) == "micro"
        assert _amount_category(5000) == "micro"

    def test_small(self):
        assert _amount_category(5001) == "small"
        assert _amount_category(50000) == "small"

    def test_medium(self):
        assert _amount_category(50001) == "medium"
        assert _amount_category(200000) == "medium"

    def test_large(self):
        assert _amount_category(200001) == "large"
        assert _amount_category(3_000_000) == "large"


import pandas as pd  # noqa: E402 (import after class definitions for clarity)
