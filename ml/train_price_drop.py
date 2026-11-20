"""Train the price-drop model from the price history in the database and print its metrics.

    python -m ml.train_price_drop              # train, register, and activate
    python -m ml.train_price_drop --no-activate
"""
import argparse
import json

from backend.app.database import SessionLocal, init_db
from backend.app.ml_service import train_and_register

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-activate", action="store_true")
    args = ap.parse_args()
    init_db()
    with SessionLocal() as db:
        mv = train_and_register(db, "price_drop", activate=not args.no_activate)
        print(json.dumps(json.loads(mv.metrics_json), indent=2))
        print(f"Saved version {mv.id} ({mv.file_path}); active={mv.is_active}")
