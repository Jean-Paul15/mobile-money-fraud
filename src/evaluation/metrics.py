"""Metriques specialisees pour la detection de fraude."""
import numpy as np
from sklearn.metrics import (average_precision_score, roc_auc_score,
                              confusion_matrix, roc_curve, precision_recall_curve)


def all_fraud_metrics(y_true, y_score):
    """Retourne un dict complet de metriques fraude."""
    auroc = roc_auc_score(y_true, y_score)
    aupr = average_precision_score(y_true, y_score)
    y_pred = (y_score >= 0.5).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
    return {
        "auc_roc": auroc, "auc_pr": aupr,
        "precision": tp / (tp + fp) if (tp + fp) else 0,
        "recall": tp / (tp + fn) if (tp + fn) else 0,
        "f1": 2 * tp / (2 * tp + fp + fn) if (2 * tp + fp + fn) else 0,
        "precision_at_recall_80": precision_at_recall(y_true, y_score, 0.80),
        "recall_at_fpr_1pct": recall_at_fpr(y_true, y_score, 0.01),
        "lift_at_5pct": lift_score(y_true, y_score, 0.05),
        "fraud_rate": y_true.mean()}


def auc_pr(y_true, y_score):
    """Area Under Precision-Recall Curve."""
    return average_precision_score(y_true, y_score)


def recall_at_fpr(y_true, y_score, target_fpr=0.01):
    """Recall (TPR) a un FPR cible donne."""
    fpr, tpr, _ = roc_curve(y_true, y_score)
    idx = np.searchsorted(fpr, target_fpr, side="right") - 1
    return tpr[max(0, idx)]


def precision_at_recall(y_true, y_score, target_recall=0.80):
    """Precision a un recall cible donne."""
    prec, rec, _ = precision_recall_curve(y_true, y_score)
    idx = np.searchsorted(rec[::-1], target_recall, side="left")
    return prec[::-1][idx] if idx < len(prec) else 0.0


def lift_score(y_true, y_score, top_pct=0.05):
    """Lift: taux de fraude dans top-X% vs taux global."""
    n = int(len(y_true) * top_pct)
    if n == 0:
        return 1.0
    return y_true[np.argsort(y_score)[-n:]].mean() / y_true.mean()


def cost_benefit_analysis(y_true, y_score, cost_per_fp=1000, benefit_per_tp=50000):
    """Analyse cout-benefice du systeme de detection."""
    y_pred = (y_score >= 0.5).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
    cost = fp * cost_per_fp + fn * benefit_per_tp
    benefit = tp * benefit_per_tp
    net = benefit - cost
    return {
        "true_positives": tp, "false_positives": fp,
        "false_negatives": fn, "true_negatives": tn,
        "cost_total": cost, "benefit_total": benefit,
        "net_benefit": net,
        "roi": (net / cost * 100) if cost > 0 else float("inf")}
