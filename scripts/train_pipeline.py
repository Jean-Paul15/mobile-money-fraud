"""
Pipeline principal — Detection de fraude Mobile Money (sklearn + MLflow complet).
MLflow : Tracking, Model Registry, Models (standardisation), Projects.
"""
import sys, os, joblib, warnings, json
from pathlib import Path
import numpy as np, pandas as pd
warnings.filterwarnings("ignore")

# Fix Unicode encoding for Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

PROJET = Path(__file__).resolve().parent.parent
os.chdir(PROJET)
sys.path.insert(0, str(PROJET))

from src.models.train import (train_isolation_forest, train_random_forest,
    train_logistic_regression, train_voting_ensemble, evaluate_model)
from src.evaluation.metrics import cost_benefit_analysis

import mlflow
import mlflow.sklearn
from mlflow.models import infer_signature

# === MLflow Configuration ===
MLFLOW_URI = os.environ.get("MLFLOW_TRACKING_URI", "http://localhost:5002")
mlflow.set_tracking_uri(MLFLOW_URI)
EXPERIMENT = "fraude_mobile_money_sklearn"

# Try to set experiment, but continue if MLflow is not available
MLFLOW_AVAILABLE = False
try:
    mlflow.set_experiment(EXPERIMENT)
    # Quick check if tracking server is reachable
    from mlflow.tracking import MlflowClient
    client = MlflowClient()
    client.search_experiments(max_results=1)
    MLFLOW_AVAILABLE = True
    print(f"[OK] MLflow tracking server reachable at {MLFLOW_URI}")
except Exception as e:
    print(f"[WARN] MLflow server not available at {MLFLOW_URI}: {e}")
    print("[INFO] Continuing without MLflow tracking -- models will still be saved locally.")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT = os.environ.get("DATA_DIR", os.path.join(ROOT, "outputs"))
MODELS_DIR = os.path.join(ROOT, "models")
os.makedirs(MODELS_DIR, exist_ok=True)
RANDOM_STATE = 42; np.random.seed(RANDOM_STATE)

print("=" * 70)
print("PIPELINE FRAUDE MOBILE MONEY -- sklearn + MLflow (Tracking/Registry/Models/Projects)")
print(f"MLflow: {MLFLOW_URI} | Available: {MLFLOW_AVAILABLE}")
print("=" * 70)

# 1. Chargement
tx = pd.read_csv(f"{OUTPUT}/transactions.csv")
acc = pd.read_csv(f"{OUTPUT}/accounts.csv")
print(f"Transactions: {tx.shape[0]:,} | Fraudes: {tx.is_fraud.sum():,}"
      f" | Taux: {tx.is_fraud.mean()*100:.3f}%")

# 2. Split temporel strict (ANTI-LEAKAGE: split AVANT feature engineering)
cutoff = pd.Timestamp('2025-07-01')
train_mask = pd.to_datetime(tx["timestamp"]) < cutoff
test_mask = pd.to_datetime(tx["timestamp"]) >= cutoff
tx_train, tx_test = tx[train_mask].copy(), tx[test_mask].copy()
acc_train = acc[acc["account_id"].isin(tx_train["sender_id"])].copy()

# 3. Feature engineering (fit sur train UNIQUEMENT, applique au test)
from src.features.engineering import engineer_features_train, engineer_features_test
X_train, y_train, train_params = engineer_features_train(tx_train, acc)
X_test, y_test = engineer_features_test(tx_test, acc, train_params)
feature_names = X_train.columns.tolist()
print(f"Features: {len(feature_names)}")
print(f"Train: {len(X_train):,} ({y_train.mean()*100:.3f}%) | "
      f"Test: {len(X_test):,} ({y_test.mean()*100:.3f}%)")

# ================================================================
# MLFLOW TRACKING + MODEL REGISTRY + MODELS
# ================================================================
mlflow_run = None
if MLFLOW_AVAILABLE:
    try:
        mlflow_run = mlflow.start_run(run_name="full_pipeline", description="IF+RF+LR+Voting avec sklearn")
        mlflow.log_params({
            "n_features": X_train.shape[1], "n_train": len(X_train), "n_test": len(X_test),
            "fraud_rate_train": round(y_train.mean(), 5),
            "fraud_rate_test": round(y_test.mean(), 5),
            "cutoff_date": "2025-07-01", "random_state": RANDOM_STATE,
            "feature_list": json.dumps(feature_names[:15]),
        })
    except Exception as e:
        print(f"[WARN] Failed to start MLflow run: {e}")
        MLFLOW_AVAILABLE = False

try:
    # --- Entrainement + Tracking ---
    models, all_metrics = {}, {}

    for name, trainer in [
        ("IsolationForest", lambda: train_isolation_forest(X_train)),
        ("RandomForest", lambda: train_random_forest(X_train, y_train)),
        ("LogisticRegression", lambda: train_logistic_regression(X_train, y_train)),
    ]:
        print(f"  {name}...", end=" ")
        m = trainer(); models[name] = m
        metrics = evaluate_model(m, X_test, y_test)
        all_metrics[name] = metrics
        if MLFLOW_AVAILABLE:
            try:
                mlflow.log_metrics({f"{name}/{k}": v for k, v in metrics.items()})
                signature = infer_signature(X_test[:100], m.predict(X_test[:100])
                    if hasattr(m, "predict") else m.decision_function(X_test[:100]))
                mlflow.sklearn.log_model(m, name, signature=signature,
                    registered_model_name=f"fraude_{name}")
            except Exception as e:
                print(f"[WARN] MLflow log failed for {name}: {e}")
        print(f"AUC-PR={metrics['auc_pr']:.4f}")

    # VotingClassifier
    print("  VotingClassifier...", end=" ")
    ve = train_voting_ensemble(X_train, y_train)
    models["VotingClassifier"] = ve
    voting_metrics = evaluate_model(ve, X_test, y_test)
    all_metrics["VotingClassifier"] = voting_metrics
    if MLFLOW_AVAILABLE:
        try:
            mlflow.log_metrics({f"Voting/{k}": v for k, v in voting_metrics.items()})
            signature_ve = infer_signature(X_test[:100], ve.predict_proba(X_test[:100]))
            mlflow.sklearn.log_model(ve, "VotingClassifier", signature=signature_ve,
                registered_model_name="fraude_VotingClassifier")
            mlflow.set_tag("best_model", "VotingClassifier")
            mlflow.set_tag("production_ready", "true")
        except Exception as e:
            print(f"[WARN] MLflow log failed for Voting: {e}")
    print(f"AUC-PR={voting_metrics['auc_pr']:.4f}")

    # Tag le meilleur modele
    if MLFLOW_AVAILABLE:
        try:
            client = mlflow.tracking.MlflowClient()
            model_versions = client.search_model_versions(
                "name='fraude_VotingClassifier'")
            if model_versions:
                latest = sorted(model_versions, key=lambda x: int(x.version))[-1]
                client.transition_model_version_stage(
                    name="fraude_VotingClassifier",
                    version=latest.version, stage="Staging")
                print(f"  [Registry] VotingClassifier v{latest.version} -> Staging")
        except Exception as e:
            print(f"  [Registry] Note: {e}")

finally:
    if mlflow_run is not None:
        try:
            mlflow.end_run()
        except Exception:
            pass

# ================================================================
# RAPPORT FINAL
# ================================================================
print("=" * 70)
print("TABLEAU COMPARATIF")
df_r = pd.DataFrame(all_metrics).T
print(df_r[["auc_roc", "auc_pr", "recall_at_fpr_1pct", "lift_at_5pct"]].round(4).to_string())

print("\nCOUT-BENEFICE")
best_model_name = max(all_metrics, key=lambda n: all_metrics[n]["auc_pr"])
for name in ["RandomForest", "LogisticRegression", "VotingClassifier"]:
    if name not in models:
        continue
    cb = cost_benefit_analysis(y_test,
        models[name].predict_proba(X_test)[:, 1] if hasattr(models[name], "predict_proba")
        else 1/(1+np.exp(models[name].decision_function(X_test))))
    print(f"  {name:25s}: net={cb['net_benefit']:,.0f}F  ROI={cb['roi']:.1f}%")
    # Store ROI in metrics
    all_metrics[name]["net_benefit"] = cb["net_benefit"]
    all_metrics[name]["roi_pct"] = cb["roi"]

# Sauvegarde locale
for name, m in models.items():
    joblib.dump(m, f"{MODELS_DIR}/{name}.pkl")

# Sauvegarde train_params pour le monitoring (evite de recalculer)
joblib.dump(train_params, f"{MODELS_DIR}/train_params.pkl")

# Distribution de reference des scores sur le train (pour PSI correct)
train_scores = models["VotingClassifier"].predict_proba(X_train)[:, 1]
ref_hist, _ = np.histogram(train_scores, bins=10, range=(0, 1))
joblib.dump({"feature_names": feature_names, "ref_score_hist": ref_hist}, f"{MODELS_DIR}/metadata.pkl")

# Helper: convert numpy types to native Python for JSON serialization
def to_native(val):
    if isinstance(val, (np.integer,)):
        return int(val)
    if isinstance(val, (np.floating,)):
        return float(val)
    if isinstance(val, np.ndarray):
        return val.tolist()
    if isinstance(val, (np.bool_,)):
        return bool(val)
    return val

# Metadata JSON
metadata = {
    "model_info": {"name": best_model_name, "framework": "sklearn", "mlflow_uri": MLFLOW_URI,
                   "estimators": ["RandomForest", "LogisticRegression"],
                   "training_date": pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S")},
    "performance": {k: {kk: round(to_native(vv), 4) if isinstance(to_native(vv), (int, float)) else to_native(vv)
                        for kk, vv in v.items()} for k, v in all_metrics.items()},
    "data": {"n_train": int(len(X_train)), "n_test": int(len(X_test)),
             "fraud_rate_train": float(y_train.mean()), "fraud_rate_test": float(y_test.mean()),
             "total_transactions": int(len(tx)), "total_accounts": int(len(acc)),
             "split_strategy": "temporal (train < 2025-07-01, test >= 2025-07-01)"},
    "features": {"n": len(feature_names), "top10": feature_names[:10]},
}
with open(f"{MODELS_DIR}/metadata.json", "w") as f:
    json.dump(metadata, f, indent=2)

print("=" * 70)
print(f"Meilleur modele: {best_model_name} (AUC-PR={all_metrics[best_model_name]['auc_pr']:.4f})")
print(f"Modeles sauvegardes: models/")
print("=" * 70)
