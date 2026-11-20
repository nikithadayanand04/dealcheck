# DealCheck — Know the real price

A website that tells Indian online shoppers whether an e-commerce discount is genuine, and whether they are about to buy on impulse.

Built for the **Principles of Management and Economics (POME)** Experiential Learning project, RV College of Engineering, Bengaluru.

The full concept, design system and build specification are in [docs/DealCheck_Website_Spec.md](docs/DealCheck_Website_Spec.md).

| Team | USN |
|---|---|
| Nikitha Dayanand | 1RV25CS415 |
| Kriti Agarwal | 1RV24CS136 |
| Maanya Singh | 1RV24CS143 |
| Laavanya Singh Rathor | 1RV24CS140 |

**Faculty guide:** Dr C Bindu Ashwini, Department of IEM

---

## What it does

| Page | Purpose |
|---|---|
| **Home** `/` | Paste a product link and get an answer |
| **Check Discount** `/check` | Link mode or manual entry. Shows the verdict, the numbers, a 90-day price chart and "Buy now or wait?" |
| **Impulse Quiz** `/quiz` | 10 questions. The ML model gives an impulse score (0–100) and the top 3 reasons |
| **Learn** `/learn` | 8 dark patterns, anchoring, and how to complain (helpline 1915) |
| **About** `/about` | Team, method, POME concepts, limitations |
| **Admin** `/admin` | Password-protected: analytics, CSV upload, retrain or activate models, export |

### The formula

```
Advertised discount  AD  = (MRP − sale price) / MRP × 100        (or the % shown on the banner)
Real discount        RD  = (M30 − sale price) / M30 × 100         M30 = median price of the 30 days before today
Deception index      DDI = AD − RD
```

| DDI | Verdict |
|---|---|
| < 5 | Genuine |
| 5 – 15 | Slightly inflated |
| > 15 | Misleading |
| fewer than 5 prices in 30 days | Not enough data |

All thresholds live in [`backend/app/config.py`](backend/app/config.py).

### Machine learning
- **The verdict is rule-based (DDI), not ML.** Training a model on labels made from the same rule would be target leakage.
- **Price-drop model ("Buy now or wait?").** It predicts whether the price will fall 5% or more within 14 days.
  - Algorithms: Logistic Regression vs Random Forest. The one with the better ROC-AUC is deployed.
  - Validation: a **time-based split** (the latest 20% of dates are the test set).
- **Impulse model.** It uses the 10 quiz answers.
  - Algorithms: Logistic Regression (deployed, because it can explain its predictions) vs Random Forest.
  - Validation: **stratified 5-fold cross-validation**.

---

## Run it locally

You need **Python 3.10+** and **Node.js 20+**. Run all commands from the `dealcheck/` folder.

### 1. Backend

```bash
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
.venv/bin/python -m backend.set_admin_password      # choose the admin password
.venv/bin/python -m backend.seed                     # loads SYNTHETIC demo data and trains both models
.venv/bin/uvicorn backend.app.main:app --port 8000
```

On Windows, use `.venv\Scripts\python` instead of `.venv/bin/python`.

`seed` generates SYNTHETIC demo data (if it isn't there yet), loads it and trains both models. The admin password is stored only as a hash in `backend/.env`, which is never committed.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173  (calls to /api are forwarded to port 8000)
```

### 3. Tests

```bash
.venv/bin/python -m pytest
```

There are 36 tests:
- **Formula:** the four worked examples from the specification, the threshold boundaries, the 30-day window, confidence levels and the wording of explanations.
- **Links:** Amazon, Flipkart and Myntra link parsing, including invalid links.
- **API:** every endpoint, consent handling, admin authentication, CSV validation, retraining and activation.

### Demo product links (synthetic data)
| Verdict | Link |
|---|---|
| Misleading | `https://www.flipkart.com/x/p/itmx?pid=SYNPID00002` |
| Slightly inflated | `https://www.amazon.in/dp/B0SYN00011` |
| Genuine | `https://www.myntra.com/x/y/9900001/buy` |
| Not tracked (manual mode) | any other amazon.in / flipkart / myntra product link |

The demo verdicts can change, because the synthetic data is generated relative to today's date.

---

## ⚠️ Replace the synthetic data before reporting results

`data/synthetic_prices.csv` and `data/synthetic_survey.csv` are **made-up demo data** (product names start with "Synthetic"). They exist so every page can be shown before real data is collected. The model scores they produce are **not research results**.

When your real data is ready:

```bash
.venv/bin/python -m backend.seed --reset --prices data/your_prices.csv --survey data/your_survey.csv
```

You can also upload the files on the Admin → Upload data page and then retrain on Admin → Models.

**Price CSV columns:** `product_id, platform, name, category, mrp, date, price`
- `platform`: amazon / flipkart / myntra / other
- `category`: Electronics, Fashion, Home, Beauty, Books, Others
- `date`: YYYY-MM-DD

**Survey CSV columns:** `q1 … q10, label_impulse`
- Answers can be the codes (e.g. `lt5`, `bnpl`) or the visible labels (e.g. "Less than 5 minutes").
- `label_impulse` is 1/0 or yes/no.

---

## Project structure

```
dealcheck/
├── backend/
│   ├── app/
│   │   ├── config.py         thresholds and settings
│   │   ├── ddi.py            the DDI formula, verdicts and explanations
│   │   ├── urls.py           product-ID extraction from links
│   │   ├── features.py       shared ML features and the sale calendar
│   │   ├── ml_service.py     model loading, prediction and the model registry
│   │   ├── importers.py      CSV validation and import
│   │   ├── analytics.py      admin dashboard numbers
│   │   ├── database.py       tables (SQLAlchemy)
│   │   ├── schemas.py        request validation (Pydantic)
│   │   ├── content.py        Learn page text
│   │   ├── sale_calendar.json  Indian sale events (update every year)
│   │   └── main.py           API routes
│   ├── seed.py  set_admin_password.py  requirements.txt  .env.example
├── ml/                       training code, synthetic data generator, CLI training scripts
├── tests/                    pytest suite
├── data/                     CSVs and the SQLite database
└── frontend/                 React + Vite + TypeScript + Tailwind
```

## API

| Method | Endpoint | Notes |
|---|---|---|
| POST | `/api/check/link` | `{url}` → result, or `{status: "not_found"}` |
| POST | `/api/check/manual` | `{mrp, sale_price, advertised_pct?, platform, category, past_prices[]}` |
| POST | `/api/impulse` | `{q1…q10, consent}` → `{score, level, advice, reasons}` |
| GET | `/api/learn`, `/api/meta`, `/api/health` | public |
| POST | `/api/admin/login` | `{password}` → token (2 h). Limited to 5 tries per minute |
| POST | `/api/admin/upload/prices`, `/api/admin/upload/survey` | CSV, max 10 MB |
| POST | `/api/admin/retrain`, `/api/admin/activate-model` | a new model is used only after you activate it |
| GET | `/api/admin/models`, `/api/admin/analytics`, `/api/admin/export` | |

Errors always come back as `{"error": "message"}` with the matching HTTP status. Interactive API docs are at http://localhost:8000/docs.

## Security and privacy
- **Shoppers:** no login and no personal data. Quiz answers are stored only if the consent box is ticked, and anonymously (in line with India's DPDP Act 2023). Prices typed in manual mode are used for that check only and are never stored.
- **Admin:** the password is stored only as a bcrypt hash. Session tokens expire after 2 hours.
- **API protection:**
  - rate limit of 30 requests/min per IP
  - CORS restricted to `ALLOWED_ORIGIN`
  - all input validated on the server
  - ORM queries only
- **No scraping:** the site never scrapes e-commerce websites.

## Deploy
1. **Database:** create a free PostgreSQL database (Render or Supabase).
2. **Backend (Render web service):**
   - Build command: `pip install -r backend/requirements.txt`
   - Start command: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
   - Environment variables: `DATABASE_URL`, `ADMIN_PASSWORD_HASH` and `ALLOWED_ORIGIN` (your frontend URL).
   - Then run `python -m backend.seed` once from the Render shell.
3. **Frontend (Vercel or Netlify):**
   - Root directory: `frontend`, build command: `npm run build`, output folder: `dist`.
   - Set `VITE_API_BASE` to the backend URL.
   - Add a rewrite of `/*` to `/index.html` so page links work on refresh.

## Limitations (stated openly)
- **Data source:** price data comes from our own collected dataset and from user entry. There is no live price feed.
- **New products:** a product we haven't tracked shows "Not enough data" and falls back to manual mode.
- **Variants and sellers:** different variants or sellers can have different prices. Prices are tracked per platform product ID.
- **Thresholds:** the DDI cut-offs (5 and 15) are a starting point, to be tuned from the real dataset's DDI distribution.
- **Survey:** survey answers are self-reported.
- **Sale calendar:** the sale dates are approximate. Update `sale_calendar.json` every year.
- **Predictions:** price predictions are probabilities, not guarantees.

*For awareness and research only. Not financial advice. Not affiliated with Amazon, Flipkart or Myntra.*
