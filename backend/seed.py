"""Load data into the database and train + activate both models.

    python -m backend.seed                      # synthetic demo data (generated if missing)
    python -m backend.seed --prices real.csv --survey survey.csv   # your real data
    python -m backend.seed --reset              # delete the database first
"""
import argparse

from backend.app import config
from backend.app.database import SessionLocal, engine, Base, init_db
from backend.app.importers import import_prices, import_survey
from backend.app.ml_service import train_and_register


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--prices", help="price CSV (default: data/synthetic_prices.csv)")
    ap.add_argument("--survey", help="survey CSV (default: data/synthetic_survey.csv)")
    ap.add_argument("--reset", action="store_true", help="drop all tables first")
    args = ap.parse_args()

    prices = args.prices or str(config.DATA_DIR / "synthetic_prices.csv")
    survey = args.survey or str(config.DATA_DIR / "synthetic_survey.csv")
    if not args.prices and not (config.DATA_DIR / "synthetic_prices.csv").exists():
        from ml.generate_synthetic import gen_prices, gen_survey
        config.DATA_DIR.mkdir(parents=True, exist_ok=True)
        gen_prices(prices)
        gen_survey(survey)
        print("Generated SYNTHETIC demo data.")

    if args.reset:
        Base.metadata.drop_all(engine)
    init_db()
    src = "dataset" if args.prices else "synthetic"
    with SessionLocal() as db:
        with open(prices, encoding="utf-8-sig") as f:
            r = import_prices(db, f.read(), source=src)
        print(f"Prices: {r['rows_added']} added, {r['rows_updated']} updated, {r['rows_rejected']} rejected")
        with open(survey, encoding="utf-8-sig") as f:
            r = import_survey(db, f.read(), source=src)
        print(f"Survey: {r['rows_added']} added, {r['rows_rejected']} rejected")
        for name in ("impulse", "price_drop"):
            mv = train_and_register(db, name, activate=True)
            print(f"Trained + activated {name}: {mv.algorithm}")
            print("   ", mv.metrics_json[:400])


if __name__ == "__main__":
    main()
