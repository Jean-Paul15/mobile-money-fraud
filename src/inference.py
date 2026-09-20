"""Production inference for Mobile Money fraud detection (sklearn RandomForest + SHAP)."""
import warnings, joblib, numpy as np, pandas as pd
from pathlib import Path
warnings.filterwarnings("ignore")

PROJECT = Path(__file__).resolve().parent.parent
MODEL_DIR = PROJECT / "models"

# ── Feature name → French human-readable label ──────────────────────────
FEATURE_LABELS: dict[str, tuple[str, str]] = {
    # (label_affiche, description)
    "amount_log":                ("Montant anormal", "Montant log-transforme nettement superieur au profil habituel"),
    "amount_vs_avg":             ("Ecart au profil", "Le montant de cette transaction depasse largement la moyenne du compte"),
    "tx_count_24h":              ("Frequence suspecte", "Nombre anormalement eleve de transactions en 24 heures"),
    "amount_sum_24h":            ("Volume 24h excessif", "Somme totale des transactions en 24h depasse le seuil de surveillance"),
    "sender_account_age":        ("Compte recent", "Le compte a ete ouvert il y a moins de 30 jours"),
    "is_night":                  ("Transaction nocturne", "Transaction effectuee entre 22h et 5h du matin"),
    "is_weekend":                ("Transaction week-end", "Transaction effectuee un samedi ou dimanche"),
    "sender_is_kyc_verified":    ("KYC non verifie", "Le compte n’a pas complete la verification d’identite (KYC)"),
    "sender_sim_swap_recent":    ("SIM swap recent", "Changement recent de carte SIM -- indice potentiel de fraude"),
    "sender_activity_weight":    ("Activite inhabituelle", "Le poids d’activite du compte s’ecarte de la normale"),
    "channel_ussd":              ("Canal USSD", "Transaction initiee via code USSD -- canal a risque"),
    "channel_web":               ("Canal web", "Transaction via interface web -- exposition en ligne"),
    "channel_agent":             ("Canal agent", "Transaction via agent physique -- peut faciliter l’anonymat"),
    "channel_mobile_app":        ("Canal mobile", "Transaction via application mobile -- canal standard"),
    "transaction_type_transfer": ("Transfert d’argent", "Type de transaction le plus utilise pour la fraude"),
    "transaction_type_withdrawal": ("Retrait d’argent", "Retrait pouvant indiquer une fuite de fonds"),
    "transaction_type_payment":  ("Paiement", "Paiement -- moins risque mais a surveiller selon le contexte"),
    "transaction_type_recharge": ("Recharge credit", "Achat de credit telephonique"),
    "operator_MTN":              ("Operateur MTN", "Operateur mobile MTN"),
    "operator_Moov":             ("Operateur Moov", "Operateur mobile Moov"),
    "operator_Orange":           ("Operateur Orange", "Operateur mobile Orange -- operateur de reference"),
    "amount_category_micro":     ("Micro-montant", "Transaction de tres faible montant (<= 5 000 FCFA)"),
    "amount_category_small":     ("Petit montant", "Transaction de 5 000 a 50 000 FCFA"),
    "amount_category_medium":    ("Montant moyen", "Transaction de 50 000 a 200 000 FCFA"),
    "amount_category_large":     ("Montant eleve", "Transaction de plus de 200 000 FCFA"),
    "hour_sin":                  ("Heure cyclique (sin)", "Composante temporelle sinusoïdale de l’heure"),
    "hour_cos":                  ("Heure cyclique (cos)", "Composante temporelle cosinusoïdale de l’heure"),
    "day_of_week_0":             ("Jour: Lundi", "Transaction un lundi"),
    "day_of_week_1":             ("Jour: Mardi", "Transaction un mardi"),
    "day_of_week_2":             ("Jour: Mercredi", "Transaction un mercredi"),
    "day_of_week_3":             ("Jour: Jeudi", "Transaction un jeudi"),
    "day_of_week_4":             ("Jour: Vendredi", "Transaction un vendredi"),
    "day_of_week_5":             ("Jour: Samedi", "Transaction un samedi"),
    "day_of_week_6":             ("Jour: Dimanche", "Transaction un dimanche"),
}


class MobileMoneyFraudDetector:
    """Charge le RandomForest + scaler + features, expose predict / predict_batch / explain."""

    def __init__(self):
        self.pipeline = joblib.load(MODEL_DIR / "RandomForest.pkl")
        self.feature_names = joblib.load(MODEL_DIR / "metadata.pkl")["feature_names"]
        self._cat = [c for c in self.feature_names
                     if c not in ("hour_sin","hour_cos","is_night","is_weekend",
                                  "amount_log","amount_vs_avg","amount_sum_24h",
                                  "tx_count_24h","sender_account_age",
                                  "sender_activity_weight",
                                  "sender_is_kyc_verified","sender_sim_swap_recent")]

        # ── SHAP TreeExplainer (sur le RF directement, pas le pipeline) ──
        self._explainer = None
        try:
            import shap
            self._explainer = shap.TreeExplainer(
                self.pipeline.named_steps["model"],
                feature_perturbation="tree_path_dependent",
            )
        except Exception:
            pass  # SHAP indisponible → explain() retournera [] silencieusement

    def _build_features(self, tx: dict) -> np.ndarray:
        ts = pd.Timestamp(tx.get("timestamp", pd.Timestamp.now().isoformat()))
        h, dow = ts.hour, ts.dayofweek
        amt = float(tx.get("amount", 0))
        cat = "micro" if amt <= 5000 else ("small" if amt <= 50000
                else ("medium" if amt <= 200000 else "large"))
        row = {"hour_sin": np.sin(2*np.pi*h/24), "hour_cos": np.cos(2*np.pi*h/24),
               "is_night": int(h >= 22 or h <= 5), "is_weekend": int(dow >= 5),
               "amount_log": np.log1p(amt),
               "sender_is_kyc_verified": int(tx.get("sender_is_kyc_verified", 1)),
               "sender_sim_swap_recent": int(tx.get("sender_sim_swap_recent", 0)),
               "sender_activity_weight": float(tx.get("sender_activity_weight", 0.0)),
               "sender_account_age": int(tx.get("sender_account_age", 90)),
               "tx_count_24h": int(tx.get("tx_count_24h", 0)),
               "amount_sum_24h": float(tx.get("amount_sum_24h", 0)),
               "amount_vs_avg": float(tx.get("amount_vs_avg", 1.0))}
        tx_type, channel, operator = tx.get("transaction_type","transfer"), tx.get("channel","mobile_app"), tx.get("operator","Orange")
        for c in self._cat:
            if c.startswith("transaction_type_"):     row[c] = int(tx_type == c.replace("transaction_type_",""))
            elif c.startswith("channel_"):            row[c] = int(channel == c.replace("channel_",""))
            elif c.startswith("operator_"):           row[c] = int(operator == c.replace("operator_",""))
            elif c.startswith("amount_category_"):     row[c] = int(cat == c.replace("amount_category_",""))
            elif c.startswith("day_of_week_"):         row[c] = int(dow == int(c.replace("day_of_week_","")))
            else:                                      row[c] = 0
        return np.array([[row[f] for f in self.feature_names]])

    def predict(self, transaction: dict) -> float:
        return round(float(self.pipeline.predict_proba(self._build_features(transaction))[:,1][0]), 4)

    def predict_batch(self, transactions: list[dict]) -> list[float]:
        X = np.vstack([self._build_features(t) for t in transactions])
        return [round(float(s), 4) for s in self.pipeline.predict_proba(X)[:, 1]]

    # ── SHAP Explainability ─────────────────────────────────────────────

    def explain(self, transaction: dict, top_n: int = 5, min_score: float = 0.0, _score: float | None = None) -> list[dict]:
        """Retourne les top-N contributeurs SHAP (classe fraude) pour une transaction.

        Calcule toujours les valeurs SHAP, meme pour les scores faibles.
        Le frontend decide s'il utilise ces explications selon le contexte
        (ex: le generateur produit des transactions a haut risque que le RF
        ne detecte pas, mais les contributeurs SHAP restent informatifs).

        Args:
            transaction: dict avec les champs de la transaction
            top_n: nombre max de facteurs a retourner
            min_score: seuil optionnel (defaut 0 = toujours expliquer)
            _score: score pre-calcule (evite un double appel a predict)

        Returns:
            list[dict]: [{name, weight, description}, ...]
            Liste vide si SHAP indisponible, ou aucun contributeur.
        """
        if self._explainer is None:
            return []

        # 1. Construire le vecteur de features
        X_raw = self._build_features(transaction)

        # 3. Passer dans le scaler (le RF a ete entraine sur donnees scalees)
        scaler = self.pipeline.named_steps["scaler"]
        X_scaled = scaler.transform(X_raw)

        # 4. SHAP values pour la classe positive (fraude = index 1)
        shap_vals = self._explainer.shap_values(X_scaled)
        # Compatibilite multi-version SHAP :
        #   - ancien format : list[array(n_samples, n_features)] par classe
        #   - nouveau format : array(n_samples, n_features, n_classes)
        if isinstance(shap_vals, list):
            shap_pos = np.array(shap_vals[1][0])   # classe fraude
        elif shap_vals.ndim == 3:
            shap_pos = shap_vals[0, :, 1]          # (samples, features, classes) -> fraude
        else:
            shap_pos = shap_vals[0]                # fallback

        # 5. Garder uniquement les contributeurs positifs (poussent vers FRAUDE)
        contributions = [
            (i, float(shap_pos[i]))
            for i in range(len(shap_pos))
            if float(shap_pos[i]) > 1e-8
        ]

        if not contributions:
            return [{
                "name": "Transaction normale",
                "weight": 1.0,
                "description": "Aucune variable ne contribue positivement au score de fraude",
            }]

        # 6. Trier par contribution decroissante, garder top-N
        contributions.sort(key=lambda x: -x[1])
        contributions = contributions[:top_n]

        # 7. Normaliser en poids 0-1 (somme des positifs = 1)
        total = sum(v for _, v in contributions)
        total = total if total > 0 else 1.0

        # 8. Construire la reponse avec labels humains
        risk_factors = []
        for idx, shap_val in contributions:
            fname = self.feature_names[idx]
            label, description = FEATURE_LABELS.get(fname, (fname.replace("_", " ").title(), f"Contribution de la variable {fname}"))
            weight = round(shap_val / total, 4)
            risk_factors.append({
                "name": label,
                "weight": weight,
                "description": description,
            })

        return risk_factors

    def explain_batch(self, transactions: list[dict], top_n: int = 5) -> list[list[dict]]:
        """Retourne les explications SHAP pour un lot de transactions."""
        return [self.explain(tx, top_n) for tx in transactions]


if __name__ == "__main__":
    detector = MobileMoneyFraudDetector()
    tests = [
        {"amount": 15_000, "transaction_type": "transfer", "channel": "mobile_app", "operator": "Orange", "sender_is_kyc_verified": 1},
        {"amount": 850_000, "transaction_type": "payment", "channel": "ussd", "operator": "MTN", "sender_is_kyc_verified": 0, "sender_sim_swap_recent": 1},
        {"amount": 5_000, "transaction_type": "recharge", "channel": "web", "operator": "Moov"},
        {"amount": 1_500_000, "transaction_type": "transfer", "channel": "mobile_app", "operator": "Orange", "sender_is_kyc_verified": 0, "tx_count_24h": 25, "amount_sum_24h": 4_500_000, "amount_vs_avg": 15.0},
        {"amount": 45_000, "transaction_type": "withdrawal", "channel": "agent", "operator": "MTN", "sender_account_age": 5},
    ]
    print("=" * 72)
    print("MobileMoneyFraudDetector -- Tests avec SHAP")
    print("=" * 72)
    scores = detector.predict_batch(tests)
    explanations = detector.explain_batch(tests)
    for i, (tx, s, expl) in enumerate(zip(tests, scores, explanations)):
        decision = "BLOQUE" if s >= 0.5 else "ACCEPTE"
        print(f"\n[{i+1}] {tx['amount']:>10,.0f} F | {tx['transaction_type']:<12} {tx['channel']:<12} | score={s:.4f} -> {decision}")
        if expl:
            for rf in expl:
                pct = rf['weight'] * 100
                print(f"    > {rf['name']:<30} {pct:5.1f}%  -- {rf['description']}")
        else:
            print("    > (SHAP indisponible)")
    print()
