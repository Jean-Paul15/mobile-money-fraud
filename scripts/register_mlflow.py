"""Enregistre le RandomForest modele + metriques + SHAP dans MLflow."""
import sys, os, json, joblib, numpy as np, pandas as pd, shap
from pathlib import Path

# Fix Unicode emoji sur Windows (MLflow utilise des emojis type \U0001f3c3)
os.environ["PYTHONIOENCODING"] = "utf-8"
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import mlflow
import mlflow.sklearn
from datetime import datetime

PROJECT = Path(__file__).resolve().parent.parent
OUT = PROJECT / "outputs"
sys.path.insert(0, str(PROJECT))

# Tracking via serveur REST (localhost:5002) — metadonnees dans le serveur
# Artefacts: on definit un dossier local visible par le conteneur Docker via bind mount
MLFLOW_URI = os.environ.get("MLFLOW_TRACKING_URI", "http://localhost:5002")
mlflow.set_tracking_uri(MLFLOW_URI)
mlflow.set_experiment("Fraude_Mobile_Money_UEMOA")

# ── 1. Charger le modele et les donnees ─────────────────────────────────
print("Chargement modele + donnees...")
pipe = joblib.load(PROJECT / "models" / "RandomForest.pkl")
metadata_pkl = joblib.load(PROJECT / "models" / "metadata.pkl")
feature_names = metadata_pkl["feature_names"]

rf = pipe.named_steps["model"]
scaler = pipe.named_steps["scaler"]

# Donnees de test pour les metriques
from src.features.engineering import engineer_features_train, engineer_features_test
tx = pd.read_csv(PROJECT / "outputs" / "transactions.csv", parse_dates=["timestamp"])
acc = pd.read_csv(PROJECT / "outputs" / "accounts.csv")
cutoff = pd.Timestamp("2025-07-01")
train = tx[tx["timestamp"] < cutoff]
test = tx[tx["timestamp"] >= cutoff]
acc_train = acc[acc["account_id"].isin(train["sender_id"])]
X_train, y_train, train_params = engineer_features_train(train, acc_train)
X_test, y_test = engineer_features_test(test, acc, train_params)

# ── 2. Calculer toutes les metriques ────────────────────────────────────
from src.evaluation.metrics import all_fraud_metrics, cost_benefit_analysis
from sklearn.metrics import classification_report, confusion_matrix

y_score = pipe.predict_proba(X_test)[:, 1]
y_pred = (y_score >= 0.5).astype(int)
metrics = all_fraud_metrics(y_test, y_score)
cb = cost_benefit_analysis(y_test, y_score)
cm = confusion_matrix(y_test, y_pred)

print(f"  AUC-ROC: {metrics['auc_roc']:.4f}")
print(f"  AUC-PR:  {metrics['auc_pr']:.4f}")
print(f"  Recall@1%FPR: {metrics['recall_at_fpr_1pct']:.4f}")
print(f"  Lift@5%: {metrics['lift_at_5pct']:.2f}x")
print(f"  Net benefit: {cb['net_benefit']:,.0f} FCFA")

# ── 3. Feature importances ──────────────────────────────────────────────
importances = rf.feature_importances_
ranked = sorted(zip(feature_names, importances), key=lambda x: -x[1])

# ── 4. SHAP explainer (initialiser et sauver) ───────────────────────────
print("Initialisation SHAP TreeExplainer...")
explainer = shap.TreeExplainer(rf, feature_perturbation="tree_path_dependent")

# SHAP summary sur un echantillon du test
sample_idx = np.random.choice(len(X_test), min(500, len(X_test)), replace=False)
X_sample = X_test.iloc[sample_idx]
X_sample_scaled = scaler.transform(X_sample)
shap_values = explainer.shap_values(X_sample_scaled)
if isinstance(shap_values, list):
    shap_pos = shap_values[1]  # classe fraude
else:
    shap_pos = shap_values[:, :, 1] if shap_values.ndim == 3 else shap_values

# ── 5. Enregistrer dans MLflow ──────────────────────────────────────────
print("Enregistrement dans MLflow...")

# CORRECTION ARTEFACTS: rediriger les artefacts vers le dossier partage
# (bind-mount Docker ./mlflow-artifacts/ -> /mlflow-artifacts)
SHARED_ARTIFACTS = (PROJECT / "mlflow-artifacts").resolve()
SHARED_ARTIFACTS.mkdir(exist_ok=True)
os.environ["MLFLOW_ARTIFACT_URI"] = f"file:///{SHARED_ARTIFACTS.as_posix()}"

run_name = f"RandomForest_UEMOA_{datetime.now().strftime('%Y%m%d_%H%M')}"
run = mlflow.start_run(run_name=run_name)

# --- Tags ---
mlflow.set_tag("model_type", "RandomForestClassifier")
mlflow.set_tag("framework", "sklearn")
mlflow.set_tag("data", "500k transactions synthetiques UEMOA (8 pays)")
mlflow.set_tag("fraud_rate", "0.15%")
mlflow.set_tag("split", "temporel train<2025-07-01 test>=2025-07-01")
mlflow.set_tag("shap", "TreeExplainer tree_path_dependent")

# --- Parametres ---
mlflow.log_param("n_estimators", int(rf.n_estimators))
mlflow.log_param("max_depth", int(rf.max_depth))
mlflow.log_param("class_weight", "balanced")
mlflow.log_param("n_features", int(len(feature_names)))
mlflow.log_param("n_train", int(len(X_train)))
mlflow.log_param("n_test", int(len(X_test)))
mlflow.log_param("fraud_rate_train", float(y_train.mean()))
mlflow.log_param("fraud_rate_test", float(y_test.mean()))

# --- Metriques principales ---
mlflow.log_metric("auc_roc", float(metrics["auc_roc"]))
mlflow.log_metric("auc_pr", float(metrics["auc_pr"]))
mlflow.log_metric("recall", float(metrics["recall"]))
mlflow.log_metric("precision", float(metrics["precision"]))
mlflow.log_metric("f1", float(metrics["f1"]))
mlflow.log_metric("recall_at_fpr_1pct", float(metrics["recall_at_fpr_1pct"]))
mlflow.log_metric("lift_at_5pct", float(metrics["lift_at_5pct"]))
mlflow.log_metric("precision_at_recall_80", float(metrics["precision_at_recall_80"]))

# --- Cost-benefit ---
mlflow.log_metric("net_benefit", float(cb["net_benefit"]))
mlflow.log_metric("roi_pct", float(cb["roi"]))
mlflow.log_metric("true_positives", int(cb["true_positives"]))
mlflow.log_metric("false_positives", int(cb["false_positives"]))
mlflow.log_metric("false_negatives", int(cb["false_negatives"]))
mlflow.log_metric("cost_total", float(cb["cost_total"]))
mlflow.log_metric("benefit_total", float(cb["benefit_total"]))

# --- Matrice de confusion ---
mlflow.log_metric("TN", int(cm[0][0]))
mlflow.log_metric("FP", int(cm[0][1]))
mlflow.log_metric("FN", int(cm[1][0]))
mlflow.log_metric("TP", int(cm[1][1]))

# --- Distribution des scores ---
legit_scores = y_score[y_test == 0]
fraud_scores = y_score[y_test == 1]
mlflow.log_metric("score_legit_median", float(np.median(legit_scores)))
mlflow.log_metric("score_legit_p95", float(np.percentile(legit_scores, 95)))
mlflow.log_metric("score_fraud_median", float(np.median(fraud_scores)))
mlflow.log_metric("score_fraud_p10", float(np.percentile(fraud_scores, 10)))
mlflow.log_metric("pct_fraud_above_50", float((fraud_scores > 0.50).mean() * 100))
mlflow.log_metric("pct_fraud_above_30", float((fraud_scores > 0.30).mean() * 100))

# --- Feature importances (top-15 en metriques) ---
for i, (name, imp) in enumerate(ranked[:15]):
    mlflow.log_metric(f"importance_{i:02d}_{name}", float(imp))

# --- Artifacts: feature importance plot ---
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

fig, ax = plt.subplots(figsize=(10, 6))
top20 = ranked[:20]
ax.barh([x[0] for x in reversed(top20)], [x[1] for x in reversed(top20)], color="steelblue")
ax.set_xlabel("Importance")
ax.set_title("Random Forest - Top 20 Feature Importances")
plt.tight_layout()
fig.savefig(OUT / "feature_importance.png", dpi=120)
mlflow.log_artifact(str(OUT / "feature_importance.png"))
plt.close()

# --- Artifacts: SHAP summary plot ---
fig, ax = plt.subplots(figsize=(10, 8))
shap.summary_plot(shap_pos, X_sample, feature_names=feature_names, show=False)
plt.tight_layout()
fig.savefig(OUT / "shap_summary.png", dpi=120, bbox_inches="tight")
mlflow.log_artifact(str(OUT / "shap_summary.png"))
plt.close()

# --- Artifacts: score distribution ---
fig, axes = plt.subplots(1, 2, figsize=(12, 4))
axes[0].hist(legit_scores, bins=50, alpha=0.6, color="steelblue", label="Legitime")
axes[0].hist(fraud_scores, bins=30, alpha=0.7, color="crimson", label="Fraude")
axes[0].axvline(x=0.50, color="red", linestyle="--", label="Seuil blocage (0.50)")
axes[0].axvline(x=0.30, color="orange", linestyle="--", label="Seuil suspect (0.30)")
axes[0].set_xlabel("Score de fraude"); axes[0].set_ylabel("Frequence")
axes[0].set_title("Distribution des scores"); axes[0].legend()
axes[1].hist(fraud_scores, bins=30, alpha=0.7, color="crimson")
axes[1].axvline(x=0.50, color="red", linestyle="--", label="Seuil blocage")
axes[1].set_xlabel("Score de fraude")
axes[1].set_title("Distribution des scores - Fraude uniquement")
plt.tight_layout()
fig.savefig(OUT / "score_distribution.png", dpi=120)
mlflow.log_artifact(str(OUT / "score_distribution.png"))
plt.close()

# --- Artifacts: ROC et PR curves ---
from sklearn.metrics import RocCurveDisplay, PrecisionRecallDisplay
fig, axes = plt.subplots(1, 2, figsize=(12, 5))
RocCurveDisplay.from_predictions(y_test, y_score, ax=axes[0], name="RandomForest")
axes[0].set_title("Courbe ROC")
PrecisionRecallDisplay.from_predictions(y_test, y_score, ax=axes[1], name="RandomForest")
axes[1].set_title("Courbe Precision-Rappel")
plt.tight_layout()
fig.savefig(OUT / "roc_pr_curves.png", dpi=120)
mlflow.log_artifact(str(OUT / "roc_pr_curves.png"))
plt.close()

# --- Artifact: metadata JSON complet ---
metadata_full = {
    "model_info": {
        "name": "RandomForestClassifier",
        "framework": "sklearn",
        "n_estimators": int(rf.n_estimators),
        "max_depth": int(rf.max_depth),
        "class_weight": "balanced",
        "random_state": int(rf.random_state),
    },
    "performance": {
        "auc_roc": float(metrics["auc_roc"]),
        "auc_pr": float(metrics["auc_pr"]),
        "recall": float(metrics["recall"]),
        "precision": float(metrics["precision"]),
        "f1": float(metrics["f1"]),
        "recall_at_fpr_1pct": float(metrics["recall_at_fpr_1pct"]),
        "lift_at_5pct": float(metrics["lift_at_5pct"]),
        "net_benefit": int(cb["net_benefit"]),
        "roi_pct": float(cb["roi"]),
    },
    "data": {
        "n_train": int(len(X_train)),
        "n_test": int(len(X_test)),
        "fraud_rate_train": float(y_train.mean()),
        "fraud_rate_test": float(y_test.mean()),
        "total_transactions": 500000,
        "total_accounts": 50000,
        "split": "temporal train<2025-07-01 test>=2025-07-01",
    },
    "features": {
        "n": int(len(feature_names)),
        "all": list(feature_names),
        "importances": {str(name): float(imp) for name, imp in ranked},
    },
    "thresholds": {
        "blocked": 0.50,
        "suspect": 0.30,
        "description": "Base sur taux de fraude 0.15% (300x et 200x le taux de base)",
    },
}
metadata_path = OUT / "metadata_complete.json"
with open(metadata_path, "w", encoding="utf-8") as f:
    json.dump(metadata_full, f, indent=2, ensure_ascii=False)
mlflow.log_artifact(str(metadata_path))

# --- LOGGER LE MODELE (sklearn pipeline) ---
# Sauver en local d'abord, puis uploader comme artifact
# (log_model() de MLflow 3.x utilise /logged-models qui n'existe pas sur serveur 2.x)
import tempfile, shutil
tmpdir = Path(tempfile.mkdtemp())
model_save_path = tmpdir / "RandomForest_pipeline"
joblib.dump(pipe, model_save_path)
mlflow.log_artifact(str(model_save_path), artifact_path="model")
shutil.rmtree(tmpdir)
print("  Pipeline uploadee en tant qu artifact: model/RandomForest_pipeline")

# Enregistrement manuel dans le Model Registry via REST API
# Utiliser l'API modele registry classique (disponible depuis MLflow 1.x)
try:
    from mlflow.tracking import MlflowClient
    client = MlflowClient()
    # Creer le registered model s'il n'existe pas
    try:
        client.create_registered_model("FraudeMobileMoney_RF")
        print("  Registered model cree: FraudeMobileMoney_RF")
    except Exception:
        print("  Registered model FraudeMobileMoney_RF existe deja")
    # Creer une version pointant vers l'artifact
    mv = client.create_model_version(
        name="FraudeMobileMoney_RF",
        source=f"runs:/{run.info.run_id}/model/RandomForest_pipeline",
        run_id=run.info.run_id,
    )
    print(f"  Version {mv.version} creee dans le Model Registry")
except Exception as e:
    print(f"  Note Model Registry: {e}")

mlflow.end_run()

# SYNC ARTEFACTS: copier de C:\mlflow-artifacts vers le dossier partage Docker
# (car le serveur retourne /mlflow-artifacts comme artifact_uri, que Windows
#  interprete comme C:\mlflow-artifacts, mais Docker monte ./mlflow-artifacts)
import shutil as _shutil
# Chemin local où le serveur écrit les artefacts (variable d'environnement, optionnelle)
_local_root = os.environ.get("MLFLOW_LOCAL_ARTIFACTS")
if _local_root:
    _loc = Path(_local_root) / run.info.experiment_id / run.info.run_id
    _shutil.copytree(str(_loc), str(SHARED_ARTIFACTS / run.info.experiment_id / run.info.run_id), dirs_exist_ok=True)
    print("  Artefacts synchronises vers le dossier partage Docker")

run_id = run.info.run_id
print(f"\nModele enregistre dans MLflow !")
print(f"   Run ID: {run_id}")
print(f"   URL: {MLFLOW_URI}/#/experiments/0/runs/{run_id}")

print("\n✅ Termine.")
