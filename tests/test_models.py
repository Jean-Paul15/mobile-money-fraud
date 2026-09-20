"""Tests — Entrainement des modeles (src/models/train.py)."""
import sys
from pathlib import Path
import numpy as np
import pytest
from sklearn.pipeline import Pipeline

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from src.models.train import (
    train_isolation_forest,
    train_random_forest,
    train_logistic_regression,
    train_voting_ensemble,
    evaluate_model,
)


# ── Donnees synthetiques ──────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def xy():
    rng = np.random.default_rng(42)
    X = rng.standard_normal((300, 10))
    y = np.zeros(300, dtype=int)
    y[:15] = 1  # 5% fraude
    return X, y


# ── Isolation Forest ──────────────────────────────────────────────────────────

class TestTrainIsolationForest:
    def test_returns_pipeline(self, xy):
        X, _ = xy
        model = train_isolation_forest(X)
        assert isinstance(model, Pipeline)

    def test_has_scaler_and_model(self, xy):
        X, _ = xy
        model = train_isolation_forest(X)
        assert "scaler" in model.named_steps
        assert "model" in model.named_steps

    def test_decision_function_shape(self, xy):
        X, _ = xy
        model = train_isolation_forest(X)
        scores = model.decision_function(X)
        assert scores.shape == (300,)

    def test_predicts_minus_one_or_one(self, xy):
        X, _ = xy
        model = train_isolation_forest(X)
        preds = model.predict(X)
        assert set(preds).issubset({-1, 1})


# ── Random Forest ─────────────────────────────────────────────────────────────

class TestTrainRandomForest:
    def test_returns_pipeline(self, xy):
        X, y = xy
        model = train_random_forest(X, y)
        assert isinstance(model, Pipeline)

    def test_probabilities_shape(self, xy):
        X, y = xy
        model = train_random_forest(X, y)
        proba = model.predict_proba(X)
        assert proba.shape == (300, 2)

    def test_probabilities_sum_to_one(self, xy):
        X, y = xy
        model = train_random_forest(X, y)
        proba = model.predict_proba(X)
        assert np.allclose(proba.sum(axis=1), 1.0)

    def test_fraud_scores_in_range(self, xy):
        X, y = xy
        model = train_random_forest(X, y)
        scores = model.predict_proba(X)[:, 1]
        assert scores.min() >= 0.0
        assert scores.max() <= 1.0

    def test_reproducible(self, xy):
        X, y = xy
        m1 = train_random_forest(X, y)
        m2 = train_random_forest(X, y)
        assert np.allclose(m1.predict_proba(X), m2.predict_proba(X))


# ── Logistic Regression ───────────────────────────────────────────────────────

class TestTrainLogisticRegression:
    def test_returns_pipeline(self, xy):
        X, y = xy
        model = train_logistic_regression(X, y)
        assert isinstance(model, Pipeline)

    def test_probabilities_shape(self, xy):
        X, y = xy
        model = train_logistic_regression(X, y)
        proba = model.predict_proba(X)
        assert proba.shape == (300, 2)

    def test_fraud_scores_in_range(self, xy):
        X, y = xy
        model = train_logistic_regression(X, y)
        scores = model.predict_proba(X)[:, 1]
        assert (scores >= 0).all() and (scores <= 1).all()


# ── VotingClassifier ──────────────────────────────────────────────────────────

class TestTrainVotingEnsemble:
    def test_returns_pipeline(self, xy):
        X, y = xy
        model = train_voting_ensemble(X, y)
        assert isinstance(model, Pipeline)

    def test_single_scaler_only(self, xy):
        """Le pipeline du Voting ne doit contenir qu'un seul StandardScaler."""
        X, y = xy
        model = train_voting_ensemble(X, y)
        scalers = [s for s in model.named_steps.values()
                   if s.__class__.__name__ == "StandardScaler"]
        assert len(scalers) == 1

    def test_two_estimators(self, xy):
        X, y = xy
        model = train_voting_ensemble(X, y)
        voting = model.named_steps["model"]
        assert len(voting.estimators_) == 2

    def test_soft_voting(self, xy):
        X, y = xy
        model = train_voting_ensemble(X, y)
        voting = model.named_steps["model"]
        assert voting.voting == "soft"

    def test_probabilities_valid(self, xy):
        X, y = xy
        model = train_voting_ensemble(X, y)
        proba = model.predict_proba(X)
        assert proba.shape == (300, 2)
        assert np.allclose(proba.sum(axis=1), 1.0)

    def test_no_double_scaling(self, xy):
        """Verifier que les sous-estimateurs ne sont pas eux-memes des Pipelines (double scaling)."""
        X, y = xy
        model = train_voting_ensemble(X, y)
        voting = model.named_steps["model"]
        # voting.estimators = [(name, est), ...] (tuples originaux)
        for name, est in voting.estimators:
            assert not isinstance(est, Pipeline), (
                f"L'estimateur '{name}' est un Pipeline : risque de double scaling")


# ── evaluate_model ────────────────────────────────────────────────────────────

class TestEvaluateModel:
    def test_returns_all_keys(self, xy):
        X, y = xy
        model = train_random_forest(X, y)
        metrics = evaluate_model(model, X, y)
        expected = {"auc_roc", "auc_pr", "recall", "precision",
                    "recall_at_fpr_1pct", "lift_at_5pct"}
        assert expected.issubset(set(metrics.keys()))

    def test_auc_roc_in_range(self, xy):
        X, y = xy
        model = train_random_forest(X, y)
        m = evaluate_model(model, X, y)
        assert 0.0 <= m["auc_roc"] <= 1.0

    def test_auc_pr_in_range(self, xy):
        X, y = xy
        model = train_random_forest(X, y)
        m = evaluate_model(model, X, y)
        assert 0.0 <= m["auc_pr"] <= 1.0

    def test_recall_in_range(self, xy):
        X, y = xy
        model = train_random_forest(X, y)
        m = evaluate_model(model, X, y)
        assert 0.0 <= m["recall"] <= 1.0

    def test_precision_in_range(self, xy):
        X, y = xy
        model = train_random_forest(X, y)
        m = evaluate_model(model, X, y)
        assert 0.0 <= m["precision"] <= 1.0

    def test_lift_positive(self, xy):
        X, y = xy
        model = train_random_forest(X, y)
        m = evaluate_model(model, X, y)
        assert m["lift_at_5pct"] >= 0.0

    def test_isolation_forest_works(self, xy):
        """evaluate_model doit fonctionner aussi sur IsolationForest."""
        X, y = xy
        model = train_isolation_forest(X)
        m = evaluate_model(model, X, y)
        assert "auc_roc" in m
        assert 0.0 <= m["auc_roc"] <= 1.0
