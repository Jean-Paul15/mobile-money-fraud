"""Feature engineering pour la detection de fraude Mobile Money.
ANTI-LEAKAGE: toutes les transformations sont fit sur train UNIQUEMENT,
puis appliquees au test avec les memes parametres."""
import numpy as np
import pandas as pd


def engineer_features_train(transactions, accounts):
    """Feature engineering sur le train set UNIQUEMENT.
    Retourne X_train, y_train, et les parametres a appliquer au test.
    """
    df = transactions.merge(
        accounts, left_on="sender_id", right_on="account_id",
        how="left", suffixes=("", "_acc"))
    df["timestamp"] = pd.to_datetime(df["timestamp"])

    # Temporal
    h = df["timestamp"].dt.hour
    df["hour_sin"] = np.sin(2 * np.pi * h / 24)
    df["hour_cos"] = np.cos(2 * np.pi * h / 24)
    df["is_night"] = ((h >= 22) | (h <= 5)).astype(int)
    df["is_weekend"] = (df["timestamp"].dt.dayofweek >= 5).astype(int)

    # Montant
    df["amount_log"] = np.log1p(df["amount"])

    # Compte sender
    df["sender_is_kyc_verified"] = df["is_kyc_verified"].apply(lambda x: 1 if x else 0)
    df["sender_sim_swap_recent"] = df["sim_swap_recent"].apply(lambda x: 1 if x else 0)
    df["sender_activity_weight"] = df["activity_weight"].fillna(0)
    first_tx = df.groupby("sender_id")["timestamp"].min()
    df["sender_account_age"] = (
        df["timestamp"] - df["sender_id"].map(first_tx)).dt.days

    # Fenetre 24h glissante (comportemental)
    # ANTI-LEAKAGE: closed="left" exclut la transaction courante.
    # Calcule UNIQUEMENT sur train.
    df_idx = df.set_index("timestamp").sort_index()
    roll_c = (df_idx.groupby("sender_id")["amount"]
              .rolling("24h", closed="left").count()
              .reset_index(name="tx_count_24h"))
    roll_s = (df_idx.groupby("sender_id")["amount"]
              .rolling("24h", closed="left").sum()
              .reset_index(name="amount_sum_24h"))
    df = df.merge(roll_c, on=["sender_id", "timestamp"], how="left")
    df = df.merge(roll_s, on=["sender_id", "timestamp"], how="left")
    for col in ["tx_count_24h", "amount_sum_24h"]:
        df[col] = df[col].fillna(0)

    # Ratio montant vs moyenne emetteur
    # Calcule sur train uniquement, stocke pour le test
    sender_means = df.groupby("sender_id")["amount"].transform("mean")
    df["amount_vs_avg"] = df["amount"] / (sender_means + 1)

    # Sauvegarder les stats pour le test set
    train_params = {
        "sender_means": df.groupby("sender_id")["amount"].mean().to_dict(),
        "first_tx": first_tx.to_dict(),
    }

    # One-hot
    df["day_of_week"] = df["timestamp"].dt.dayofweek
    df = pd.get_dummies(df, columns=[
        "transaction_type", "channel", "operator",
        "amount_category", "day_of_week"], drop_first=True)

    # Colonnes a exclure
    exclude = {
        "transaction_id", "timestamp", "sender_id", "receiver_id",
        "sender_phone_hash", "city", "is_fraud", "fraud_type",
        "account_id", "phone_number_hash", "country", "is_kyc_verified",
        "sim_swap_recent", "activity_weight", "amount", "operator_acc", "hour"}
    feature_cols = [c for c in df.columns if c not in exclude]
    return df[feature_cols], df["is_fraud"].values, train_params


def engineer_features_test(transactions, accounts, train_params):
    """Feature engineering sur le test set en REUTILISANT les parametres du train.
    Aucun calcul global n'est fait sur le test — tout vient du train.
    """
    df = transactions.merge(
        accounts, left_on="sender_id", right_on="account_id",
        how="left", suffixes=("", "_acc"))
    df["timestamp"] = pd.to_datetime(df["timestamp"])

    # Temporal
    h = df["timestamp"].dt.hour
    df["hour_sin"] = np.sin(2 * np.pi * h / 24)
    df["hour_cos"] = np.cos(2 * np.pi * h / 24)
    df["is_night"] = ((h >= 22) | (h <= 5)).astype(int)
    df["is_weekend"] = (df["timestamp"].dt.dayofweek >= 5).astype(int)

    # Montant
    df["amount_log"] = np.log1p(df["amount"])

    # Compte sender
    df["sender_is_kyc_verified"] = df["is_kyc_verified"].apply(lambda x: 1 if x else 0)
    df["sender_sim_swap_recent"] = df["sim_swap_recent"].apply(lambda x: 1 if x else 0)
    df["sender_activity_weight"] = df["activity_weight"].fillna(0)
    df["sender_account_age"] = (
        df["timestamp"] - df["sender_id"].map(train_params["first_tx"])).dt.days
    # Nouveaux senders (pas dans train): age = 0 (premiere transaction)
    df["sender_account_age"] = df["sender_account_age"].fillna(0)

    # Fenetre 24h — calculee uniquement sur le test set lui-meme
    # (comme en production: on ne voit que les transactions passees du test)
    df_idx = df.set_index("timestamp").sort_index()
    roll_c = (df_idx.groupby("sender_id")["amount"]
              .rolling("24h", closed="left").count()
              .reset_index(name="tx_count_24h"))
    roll_s = (df_idx.groupby("sender_id")["amount"]
              .rolling("24h", closed="left").sum()
              .reset_index(name="amount_sum_24h"))
    df = df.merge(roll_c, on=["sender_id", "timestamp"], how="left")
    df = df.merge(roll_s, on=["sender_id", "timestamp"], how="left")
    for col in ["tx_count_24h", "amount_sum_24h"]:
        df[col] = df[col].fillna(0)

    # Ratio montant vs moyenne emetteur (utilise les moyennes DU TRAIN)
    sender_means_map = train_params["sender_means"]
    df["amount_vs_avg"] = df["amount"] / (
        df["sender_id"].map(sender_means_map).fillna(
            np.mean(list(sender_means_map.values())) if sender_means_map else 50000) + 1)

    # One-hot
    df["day_of_week"] = df["timestamp"].dt.dayofweek
    df = pd.get_dummies(df, columns=[
        "transaction_type", "channel", "operator",
        "amount_category", "day_of_week"], drop_first=True)

    # Colonnes a exclure
    exclude = {
        "transaction_id", "timestamp", "sender_id", "receiver_id",
        "sender_phone_hash", "city", "is_fraud", "fraud_type",
        "account_id", "phone_number_hash", "country", "is_kyc_verified",
        "sim_swap_recent", "activity_weight", "amount", "operator_acc", "hour"}
    feature_cols = [c for c in df.columns if c not in exclude]
    return df[feature_cols], df["is_fraud"].values
