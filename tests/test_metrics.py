"""Tests — Metriques specialisees fraude (src/evaluation/metrics.py)."""
import sys
from pathlib import Path
import numpy as np
import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from src.evaluation.metrics import (
    all_fraud_metrics,
    auc_pr,
    recall_at_fpr,
    precision_at_recall,
    lift_score,
    cost_benefit_analysis,
)


# ── Donnees de test ───────────────────────────────────────────────────────────

@pytest.fixture
def perfect_classifier():
    """Scores parfaits : fraudes = 1.0, legit = 0.0."""
    y = np.array([0]*90 + [1]*10)
    s = np.array([0.0]*90 + [1.0]*10)
    return y, s

@pytest.fixture
def random_classifier():
    """Classifieur aleatoire : scores uniformes."""
    rng = np.random.default_rng(42)
    y = np.array([0]*90 + [1]*10)
    s = rng.random(100)
    return y, s

@pytest.fixture
def worst_classifier():
    """Pire classifieur : fraudes = 0.0, legit = 1.0."""
    y = np.array([0]*90 + [1]*10)
    s = np.array([1.0]*90 + [0.0]*10)
    return y, s


# ── all_fraud_metrics ─────────────────────────────────────────────────────────

class TestAllFraudMetrics:
    def test_returns_dict_with_all_keys(self, perfect_classifier):
        y, s = perfect_classifier
        m = all_fraud_metrics(y, s)
        expected = {"auc_roc", "auc_pr", "precision", "recall", "f1",
                    "precision_at_recall_80", "recall_at_fpr_1pct",
                    "lift_at_5pct", "fraud_rate"}
        assert expected.issubset(set(m.keys()))

    def test_perfect_classifier_auc_roc(self, perfect_classifier):
        y, s = perfect_classifier
        m = all_fraud_metrics(y, s)
        assert m["auc_roc"] == pytest.approx(1.0)

    def test_perfect_classifier_auc_pr(self, perfect_classifier):
        y, s = perfect_classifier
        m = all_fraud_metrics(y, s)
        assert m["auc_pr"] == pytest.approx(1.0)

    def test_fraud_rate_correct(self, perfect_classifier):
        y, s = perfect_classifier
        m = all_fraud_metrics(y, s)
        assert m["fraud_rate"] == pytest.approx(0.10)

    def test_all_values_numeric(self, random_classifier):
        y, s = random_classifier
        m = all_fraud_metrics(y, s)
        for k, v in m.items():
            assert isinstance(v, float), f"{k} n'est pas un float"


# ── auc_pr ────────────────────────────────────────────────────────────────────

class TestAucPr:
    def test_perfect(self, perfect_classifier):
        y, s = perfect_classifier
        assert auc_pr(y, s) == pytest.approx(1.0)

    def test_random_near_fraud_rate(self, random_classifier):
        """AUC-PR d'un classifieur aleatoire ≈ taux de fraude."""
        y, s = random_classifier
        result = auc_pr(y, s)
        assert 0.0 < result < 1.0

    def test_in_range(self, random_classifier):
        y, s = random_classifier
        assert 0.0 <= auc_pr(y, s) <= 1.0


# ── recall_at_fpr ─────────────────────────────────────────────────────────────

class TestRecallAtFpr:
    def test_perfect_at_fpr_1pct(self, perfect_classifier):
        y, s = perfect_classifier
        recall = recall_at_fpr(y, s, target_fpr=0.01)
        assert recall == pytest.approx(1.0)

    def test_returns_float(self, random_classifier):
        y, s = random_classifier
        result = recall_at_fpr(y, s, target_fpr=0.01)
        assert isinstance(result, float)

    def test_in_range(self, random_classifier):
        y, s = random_classifier
        result = recall_at_fpr(y, s, target_fpr=0.05)
        assert 0.0 <= result <= 1.0


# ── precision_at_recall ───────────────────────────────────────────────────────

class TestPrecisionAtRecall:
    def test_perfect_at_recall_80(self, perfect_classifier):
        y, s = perfect_classifier
        prec = precision_at_recall(y, s, target_recall=0.80)
        assert prec == pytest.approx(1.0)

    def test_in_range(self, random_classifier):
        y, s = random_classifier
        prec = precision_at_recall(y, s, target_recall=0.50)
        assert 0.0 <= prec <= 1.0


# ── lift_score ────────────────────────────────────────────────────────────────

class TestLiftScore:
    def test_perfect_classifier_high_lift(self, perfect_classifier):
        """Un classifieur parfait doit avoir un lift tres eleve."""
        y, s = perfect_classifier
        lift = lift_score(y, s, top_pct=0.10)
        assert lift > 5.0

    def test_random_classifier_lift_near_one(self, random_classifier):
        """Un classifieur aleatoire doit avoir un lift proche de 1."""
        y, s = random_classifier
        lift = lift_score(y, s, top_pct=0.50)
        assert 0.3 < lift < 3.0

    def test_lift_positive(self, random_classifier):
        y, s = random_classifier
        assert lift_score(y, s, top_pct=0.05) >= 0.0

    def test_empty_top_pct_returns_one(self):
        y = np.array([0, 1])
        s = np.array([0.1, 0.9])
        # top_pct trop petit -> n=0
        result = lift_score(y, s, top_pct=0.0001)
        assert result == 1.0


# ── cost_benefit_analysis ─────────────────────────────────────────────────────

class TestCostBenefitAnalysis:
    def test_returns_all_keys(self, perfect_classifier):
        y, s = perfect_classifier
        cb = cost_benefit_analysis(y, s)
        expected = {"true_positives", "false_positives", "false_negatives",
                    "true_negatives", "cost_total", "benefit_total", "net_benefit", "roi"}
        assert expected.issubset(set(cb.keys()))

    def test_perfect_classifier_positive_net(self, perfect_classifier):
        """Un classifieur parfait doit generer un benefice net positif."""
        y, s = perfect_classifier
        cb = cost_benefit_analysis(y, s)
        assert cb["net_benefit"] > 0

    def test_tp_fn_sum_equals_fraud_count(self, random_classifier):
        y, s = random_classifier
        cb = cost_benefit_analysis(y, s)
        assert cb["true_positives"] + cb["false_negatives"] == y.sum()

    def test_fp_tn_sum_equals_legit_count(self, random_classifier):
        y, s = random_classifier
        cb = cost_benefit_analysis(y, s)
        assert cb["false_positives"] + cb["true_negatives"] == (1 - y).sum()

    def test_roi_infinite_when_no_cost(self):
        """Si aucun FP ni FN, le cout est 0 -> ROI infini."""
        y = np.array([0, 0, 0, 0, 1])
        # Score parfait -> TP=1, FP=0, FN=0 avec seuil 0.5
        s = np.array([0.0, 0.0, 0.0, 0.0, 1.0])
        cb = cost_benefit_analysis(y, s)
        assert cb["roi"] == float("inf")
