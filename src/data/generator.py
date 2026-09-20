#!/usr/bin/env python3
"""
=============================================================================
MOBILE MONEY FRAUD DETECTION - DATA GENERATOR
=============================================================================
Genere 500 000 transactions Mobile Money pour 8 pays UEMOA.
Fraude : account_takeover, stolen_card, mule_network, synthetic_id, smishing
Usage : python -m src.data.generator
=============================================================================
"""
import hashlib, warnings, numpy as np, pandas as pd
from pathlib import Path
from datetime import datetime, timedelta

warnings.filterwarnings("ignore")

#  Configuration 
N_TRANSACTIONS = 500_000
N_ACCOUNTS = 50_000
FRAUD_RATE = 0.0015  # 0.15%
DATE_START, DATE_END = "2025-01-01", "2025-12-31"

COUNTRIES = ["SEN", "CIV", "MLI", "BFA", "TGO", "BEN", "NER", "GNB"]
COUNTRY_WEIGHTS = [0.22, 0.20, 0.13, 0.12, 0.11, 0.09, 0.07, 0.06]
CITIES = ["DAK","ABJ","BKO","OUA","LOM","COT","NIM","BIS","OTHER"]
CITY_WEIGHTS = [0.18, 0.17, 0.10, 0.09, 0.09, 0.09, 0.06, 0.05, 0.17]

OPERATORS = ["Orange", "MTN", "Moov"]
OP_WEIGHTS = [0.50, 0.35, 0.15]
TX_TYPES = ["transfer", "payment", "recharge", "withdrawal", "bill_pay"]
TX_WEIGHTS = [0.35, 0.28, 0.20, 0.10, 0.07]
CHANNELS = ["mobile_app", "ussd", "agent", "web"]
CH_WEIGHTS = [0.40, 0.30, 0.20, 0.10]


#  Helpers 
def _hash_phone(prefix: str, idx: int) -> str:
    return hashlib.md5(f"{prefix}{idx}".encode()).hexdigest()[:20]

def _amount_category(amt: float) -> str:
    if amt <= 5000: return "micro"
    if amt <= 50000: return "small"
    if amt <= 200000: return "medium"
    return "large"


#  Accounts 
def generate_accounts(n: int) -> pd.DataFrame:
    print(f"Generation de {n:,} comptes Mobile Money ...")
    phones = [_hash_phone("phone_", i) for i in range(n)]
    ops = np.random.choice(OPERATORS, n, p=OP_WEIGHTS)
    countries = np.random.choice(COUNTRIES, n, p=COUNTRY_WEIGHTS)
    kyc = np.random.choice([True, False], n, p=[0.65, 0.35])
    sim_swap = np.random.choice([True, False], n, p=[0.04, 0.96])
    activity = np.random.exponential(1, n)
    activity /= activity.sum()
    return pd.DataFrame({
        "account_id": [f"ACC{str(i).zfill(8)}" for i in range(n)],
        "phone_number_hash": phones,
        "operator": ops,
        "country": countries,
        "is_kyc_verified": kyc,
        "sim_swap_recent": sim_swap,
        "activity_weight": activity,
    })


#  Legitimate Transactions 
def generate_legitimate_transactions(acc: pd.DataFrame, n: int) -> pd.DataFrame:
    print(f"Generation de {n:,} transactions legitimes ...")
    ids = acc["account_id"].values
    w = acc["activity_weight"].values / acc["activity_weight"].sum()

    senders = np.random.choice(ids, n, p=w)
    receivers = np.random.choice(ids, n)
    same = senders == receivers
    while same.any():
        receivers[same] = np.random.choice(ids, same.sum())
        same = senders == receivers

    base_amt = np.exp(np.random.normal(8.5, 1.8, n))
    amounts = np.clip(base_amt, 50, 3_000_000).astype(int)

    start_dt = datetime.strptime(DATE_START, "%Y-%m-%d")
    end_dt = datetime.strptime(DATE_END, "%Y-%m-%d")
    secs = int((end_dt - start_dt).total_seconds())
    timestamps = start_dt + pd.to_timedelta(np.random.randint(0, secs, n), unit="s")

    sender_map = dict(zip(acc["account_id"], acc["phone_number_hash"]))
    ops = np.random.choice(OPERATORS, n, p=OP_WEIGHTS)

    tx = pd.DataFrame({
        "transaction_id": [f"TX{str(i).zfill(10)}" for i in range(n)],
        "timestamp": timestamps,
        "sender_id": senders,
        "receiver_id": receivers,
        "amount": amounts,
        "amount_category": [_amount_category(a) for a in amounts],
        "transaction_type": np.random.choice(TX_TYPES, n, p=TX_WEIGHTS),
        "channel": np.random.choice(CHANNELS, n, p=CH_WEIGHTS),
        "operator": ops,
        "sender_phone_hash": [sender_map[s] for s in senders],
        "city": np.random.choice(CITIES, n, p=CITY_WEIGHTS),
        "is_fraud": 0,
        "fraud_type": "none",
    })
    return tx.sort_values("timestamp").reset_index(drop=True)


#  Fraud Injection 
def inject_fraud(tx: pd.DataFrame, acc: pd.DataFrame) -> pd.DataFrame:
    print(f"Injection de fraudes (taux={FRAUD_RATE*100:.2f}%) ...")
    n_frauds = int(len(tx) * FRAUD_RATE)
    idxs = np.random.choice(len(tx), n_frauds, replace=False)

    fraud_types = np.random.choice(
        ["account_takeover", "stolen_card", "mule_network",
         "synthetic_id", "smishing"],
        n_frauds,
        p=[0.35, 0.25, 0.20, 0.13, 0.07],
    )

    df = tx.copy()
    for i, fidx in enumerate(idxs):
        ft = fraud_types[i]
        df.at[fidx, "is_fraud"] = 1
        df.at[fidx, "fraud_type"] = ft

        if ft == "account_takeover":
            df.at[fidx, "amount"] = int(np.random.uniform(100_000, 2_000_000))
            df.at[fidx, "channel"] = "mobile_app"
            # device change pattern
        elif ft == "stolen_card":
            df.at[fidx, "amount"] = int(np.random.uniform(2_000, 50_000))
            df.at[fidx, "transaction_type"] = "payment"
        elif ft == "mule_network":
            df.at[fidx, "amount"] = int(np.random.uniform(50_000, 500_000))
            df.at[fidx, "transaction_type"] = "transfer"
        elif ft == "synthetic_id":
            df.at[fidx, "amount"] = int(np.random.uniform(150_000, 1_000_000))
            df.at[fidx, "operator"] = np.random.choice(OPERATORS)
        elif ft == "smishing":
            df.at[fidx, "amount"] = int(np.random.uniform(5_000, 80_000))
            df.at[fidx, "channel"] = "ussd"
            df.at[fidx, "transaction_type"] = "recharge"

    print(f"  {n_frauds:,} fraudes injectees.")
    return df


#  Main 
def main(argv=None):
    import argparse
    parser = argparse.ArgumentParser(description="Génère des transactions Mobile Money synthétiques.")
    parser.add_argument("--n-transactions", type=int, default=N_TRANSACTIONS)
    parser.add_argument("--n-accounts", type=int, default=N_ACCOUNTS)
    parser.add_argument("--output", type=Path,
                        default=Path(__file__).resolve().parent.parent.parent / "outputs",
                        help="Dossier de sortie (défaut : outputs/, ignoré par git)")
    args = parser.parse_args(argv)

    print("=" * 60)
    print("MOBILE MONEY FRAUD DATA GENERATOR - 8 PAYS UEMOA")
    print("=" * 60)

    OUTPUT = args.output
    OUTPUT.mkdir(parents=True, exist_ok=True)

    accounts = generate_accounts(args.n_accounts)
    tx = generate_legitimate_transactions(accounts, args.n_transactions)
    tx = inject_fraud(tx, accounts)

    accounts.to_csv(OUTPUT / "accounts.csv", index=False)
    tx.to_csv(OUTPUT / "transactions.csv", index=False)

    print("\n" + "=" * 60)
    print("GENERATION TERMINEE")
    print(f"  Transactions: {len(tx):,}")
    print(f"  Fraude: {tx['is_fraud'].mean()*100:.3f}%")
    print(f"  Types: {tx[tx['is_fraud']==1]['fraud_type'].value_counts().to_dict()}")
    print(f"  Fichiers -> {OUTPUT}")
    print("=" * 60)


if __name__ == "__main__":
    main()
