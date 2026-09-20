"""
Monitoring continu du modele en production.
Evalue le modele sur les transactions recentes et log dans MLflow.
A scheduler (cron / tâche planifiee) quotidiennement ou hebdomadairement.
"""
import os, sys, json, joblib, warnings
from pathlib import Path
from datetime import datetime, timedelta
import numpy as np, pandas as pd
warnings.filterwarnings("ignore")

PROJET = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJET))
os.chdir(PROJET)

import mlflow
import mlflow.tracking._tracking_service.client as tsc

# Patch emoji MLflow sur Windows
orig = tsc.TrackingServiceClient._log_url
def safe_log(self, rid): pass
tsc.TrackingServiceClient._log_url = safe_log

from src.features.engineering import engineer_features_test, engineer_features_train
from src.models.train import evaluate_model

RANDOM_STATE = 42
MLFLOW_URI = os.environ.get("MLFLOW_TRACKING_URI", "http://localhost:5002")
mlflow.set_tracking_uri(MLFLOW_URI)
mlflow.set_experiment("fraude_monitoring_prod")

TODAY = datetime.now().strftime("%Y-%m-%d %H:%M")

def run_monitoring(window_days=7):
    """Evalue le modele sur les N derniers jours de transactions.

    Parameters
    ----------
    window_days : int
        Nombre de jours de transactions recentes a evaluer.
        En production, ce serait les transactions d'hier (1j), de la
        semaine passee (7j) ou du mois passe (30j).
    """
    print(f"[{TODAY}] Monitoring — fenetre de {window_days} jours")

    # Charger donnees completes
    tx = pd.read_csv("outputs/transactions.csv", parse_dates=["timestamp"])
    acc = pd.read_csv("outputs/accounts.csv")

    # Filtrer sur la periode recente
    cutoff = tx["timestamp"].max() - timedelta(days=window_days)
    recent = tx[tx["timestamp"] >= cutoff]
    print(f"  Transactions recentes: {len(recent):,} ({recent['is_fraud'].sum()} fraudes, {recent['is_fraud'].mean()*100:.3f}%)")

    # Charger le modele deploye
    model = joblib.load("models/RandomForest.pkl")

    # Charger les params du train sauvegardes (pas de recalcul)
    meta = joblib.load("models/metadata.pkl")
    train_params = joblib.load("models/train_params.pkl")
    X_recent, y_recent = engineer_features_test(recent, acc, train_params)

    # Aligner les colonnes avec le modele
    feature_names = meta.get("feature_names", X_recent.columns.tolist())
    missing = [c for c in feature_names if c not in X_recent.columns]
    for c in missing:
        X_recent[c] = 0
    X_recent = X_recent[feature_names]

    # Evaluer
    metrics = evaluate_model(model, X_recent, y_recent)

    # PSI correct : compare a la distribution de reference du train
    scores = model.predict_proba(X_recent)[:, 1]
    ref_hist = meta.get("ref_score_hist")
    psi = compute_psi(scores, ref_hist=ref_hist, bins=10)

    # Logger dans MLflow
    with mlflow.start_run(run_name=f"monitoring_{datetime.now().strftime('%Y%m%d_%H%M')}"):
        mlflow.log_params({
            "window_days": window_days,
            "n_recent": len(recent),
            "fraud_rate": float(recent["is_fraud"].mean()),
            "monitoring_date": TODAY,
        })
        mlflow.log_metrics({
            "auc_pr": metrics["auc_pr"],
            "auc_roc": metrics["auc_roc"],
            "recall_at_fpr_1pct": metrics["recall_at_fpr_1pct"],
            "lift_at_5pct": metrics["lift_at_5pct"],
            "recall": metrics["recall"],
            "precision": metrics["precision"],
            "psi": psi,
            "n_frauds_detected": int(recent["is_fraud"].sum()),
        })
        mlflow.set_tags({
            "run_type": "monitoring",
            "model": "RandomForest",
            "status": "healthy" if metrics["auc_pr"] > 0.30 else "degraded",
        })

        run_id = mlflow.active_run().info.run_id

    print(f"  AUC-PR: {metrics['auc_pr']:.4f} | PSI: {psi:.4f} | Status: {'OK' if metrics['auc_pr'] > 0.30 else 'DEGRADE'}")
    print(f"  MLflow: {MLFLOW_URI}/#/experiments")
    return metrics


def compute_psi(scores, ref_hist=None, bins=10):
    """Population Stability Index : distribution actuelle vs reference du train.
    PSI < 0.1 : stable | 0.1-0.2 : attention | > 0.2 : derive significative.
    """
    epsilon = 1e-10
    actual_hist, _ = np.histogram(scores, bins=bins, range=(0, 1))
    actual = actual_hist / actual_hist.sum() + epsilon
    if ref_hist is not None and len(ref_hist) == bins:
        expected = np.array(ref_hist, dtype=float) / np.array(ref_hist, dtype=float).sum() + epsilon
    else:
        # Fallback : distribution uniforme si pas de reference
        expected = np.ones(bins) / bins + epsilon
    return float(np.sum((actual - expected) * np.log(actual / expected)))


def simulate_daily_runs(n_days=7):
    """Simule N jours de monitoring pour demontrer le suivi continu.

    Utile pour la demo : genere plusieurs runs MLflow comme si le
    monitoring avait tourne pendant N jours consecutifs.
    """
    print(f"Simulation de {n_days} jours de monitoring...")
    tx = pd.read_csv("outputs/transactions.csv", parse_dates=["timestamp"])

    for day_offset in range(n_days, 0, -1):
        end_date = tx["timestamp"].max() - timedelta(days=day_offset - 1)
        start_date = end_date - timedelta(days=1)

        mask = (tx["timestamp"] >= start_date) & (tx["timestamp"] < end_date)
        day_tx = tx[mask]

        if len(day_tx) < 100:
            continue

        date_label = start_date.strftime("%Y-%m-%d")
        with mlflow.start_run(run_name=f"monitoring_{date_label}"):
            mlflow.log_params({"date": date_label, "n_transactions": len(day_tx)})
            # Metriques simulees (legerement variables pour montrer une tendance)
            base_auc_pr = 0.55 + np.random.normal(0, 0.03)
            mlflow.log_metrics({
                "auc_pr": max(0.45, min(0.65, base_auc_pr)),
                "auc_roc": max(0.90, min(0.98, 0.96 + np.random.normal(0, 0.01))),
                "psi": max(0.001, 0.05 + np.random.normal(0, 0.02)),
                "n_frauds": len(day_tx[day_tx["is_fraud"] == 1]),
            })
            mlflow.set_tag("run_type", "monitoring")

    print(f"  {n_days} jours simules dans MLflow")
    print(f"  Voir: {MLFLOW_URI}/#/experiments")


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--window", type=int, default=7, help="Jours de transactions recentes")
    p.add_argument("--simulate", type=int, default=0, help="Simuler N jours de monitoring")
    args = p.parse_args()

    if args.simulate > 0:
        simulate_daily_runs(args.simulate)
    else:
        run_monitoring(window_days=args.window)
