# DealCheck – Complete Website Specification

**Project:** Predicting E-commerce Consumer Behaviour using Machine Learning – a study on discount authenticity and impulse buying
**Course:** Principles of Management and Economics (POME), Experiential Learning Phase-I
**Team:** Nikitha Dayanand, Kriti Agarwal, Maanya Singh, Laavanya Singh Rathor | **Guide:** Dr C Bindu Ashwini, Dept. of IEM, RVCE

This document has two parts:
- **Part A:** the full explanation of the concept. Every feature, formula, model, page, rule and edge case is listed here, so you can explain it in a viva and nothing is left vague.
- **Part B:** a ready-to-paste prompt for building the website with an AI website builder or a developer.

---

# PART A – FULL CONCEPT

## 1. What the website does

DealCheck answers two questions for an online shopper:

1. **"Is this discount real?"** It compares the advertised discount with the product's actual recent price history and gives a clear verdict: Genuine, Inflated or Fake.
2. **"Am I buying this on impulse?"** A short quiz feeds an ML model that predicts how likely the purchase is impulsive. The site then gives simple advice.

It also predicts **"Buy now or wait?"**: whether the price is likely to drop in the next 14 days.

## 2. Why it is needed

| Problem | What exists today | What is missing |
|---|---|---|
| Sellers raise MRP or price before a sale and then show a big "% OFF" | Price trackers (Keepa, PriceHistory, BuyHatke) show raw graphs | Normal shoppers can't read graphs, and there is no single verdict |
| Urgency tricks ("Only 2 left", countdown timers) push quick decisions | CCPA Dark Pattern Guidelines 2023 | Enforcement depends on platforms checking themselves |
| Shoppers regret purchases | Platforms' own return policies | Nothing warns the shopper *before* they buy |
| Research studies price **or** behaviour | Separate academic models | No tool combines both for Indian platforms |

**POME link:** the site reduces **information asymmetry**. The seller knows the true price history and the buyer doesn't, and DealCheck gives that information back to the buyer.

## 3. Users

| User | What they do |
|---|---|
| **Shopper (main user)** | Checks a discount, takes the impulse quiz, reads tips |
| **Admin (our team)** | Uploads price datasets, retrains models, views the analytics dashboard |

The site has no login for shoppers. It works anonymously, which keeps it simple and private. The admin area is protected by a password.

## 4. Pages and every element on them

### 4.1 Home page (`/`)
- **Header:** logo text "DealCheck", with nav links Home · Check Discount · Impulse Quiz · Learn · About.
- **Hero line:** "Is that sale really a sale? Check before you buy."
- **Input box:** "Paste product link (Amazon / Flipkart / Myntra)" and a **Check** button.
- **Link:** "No link? Enter prices manually", which opens the manual form.
- **Three short cards:** Check discount · Take impulse quiz · Learn about fake sales.
- **Footer:** disclaimer, team names, college, and "Not affiliated with any e-commerce platform".

### 4.2 Check Discount page (`/check`)
There are two ways to check a product.

**Mode 1 – Product link**
1. The user pastes a URL.
2. The system checks that the URL is from a supported domain (amazon.in, flipkart.com, myntra.com).
3. It extracts the product ID: the ASIN for Amazon, the `pid` parameter for Flipkart, or the numeric ID in the Myntra URL.
4. It looks up the product in our price-history database.
5. If the product is found, the result is shown.
6. If it isn't found, the site says: "We don't have enough price history for this product yet. Enter the prices you see to get an estimate." It then opens Mode 2 with the product ID pre-filled, and the product is added to the tracking list.

**Mode 2 – Manual entry**

| Field | Required? |
|---|---|
| Product name | Optional |
| Platform | Dropdown |
| Category | Dropdown: Electronics, Fashion, Home, Beauty, Books, Others |
| MRP (₹) | Required |
| Current sale price (₹) | Required |
| Advertised discount % | Optional. Calculated automatically if blank |
| Past prices seen | Optional. Up to 10 rows of date + price |

**Validation rules**
- All prices must be numbers greater than 0 and no more than ₹10,00,000.
- The sale price must not be greater than the MRP. If it is, the site shows "Sale price can't be higher than MRP".
- An advertised discount must be between 0 and 99.

### 4.3 Result page (shown on `/check` after submitting)
1. **Product summary:** name, platform, category, MRP, sale price.
2. **Verdict badge** (big, coloured):
   - 🟢 **Genuine discount**
   - 🟡 **Slightly inflated**
   - 🔴 **Fake / misleading discount**
   - ⚪ **Not enough data**
3. **Numbers card:**
   - Advertised discount: 60%
   - Real discount: 11.1%
   - **Discount Deception Index (DDI): 48.9**
   - 30-day median price: ₹900
   - Lowest price in the last 90 days: ₹780
4. **Price history chart:** a line chart of the last 90 days, with dotted horizontal lines for the 30-day median and the current price.
5. **Buy now or wait?** For example "62% chance the price drops by 5% or more in the next 14 days. Suggestion: Wait." Only shown when there are at least 30 days of history.
6. **Confidence note:** "Based on 27 price points in the last 30 days" (high, medium or low confidence).
7. **One-line explanation in plain English:** "This product usually sells around ₹900, so the real saving is only ₹100, not ₹1,200 as the banner suggests."
8. **Button:** "Take the impulse quiz before you buy →"

### 4.4 Impulse Quiz page (`/quiz`)
There are 10 questions, one per screen, with a progress bar.

| # | Question | Answer type |
|---|---|---|
| 1 | Did you plan to buy this before you saw the sale? | Yes / No |
| 2 | How long have you been looking at this product today? | <5 min / 5–30 min / >30 min |
| 3 | Did a timer, "only few left" or "X people bought this" message influence you? | Not at all / A little / A lot (1–3) |
| 4 | Would you buy it at its normal price? | Yes / Maybe / No |
| 5 | Do you already own something similar? | Yes / No |
| 6 | How are you paying? | Full payment / EMI / Buy-Now-Pay-Later / Cash on delivery |
| 7 | How are you feeling right now? | Calm / Bored / Stressed / Excited |
| 8 | How often do you buy during sales? | Rarely / Sometimes / Every sale |
| 9 | Monthly spending budget used so far? | <25% / 25–75% / >75% |
| 10 | Age group | 18–22 / 23–30 / 31–45 / 45+ |

**Result**
- An **Impulse Score** from 0 to 100%, shown as a gauge:
  - **0–39 Low:** "Looks like a planned purchase."
  - **40–69 Medium:** "Take a short break and compare prices once."
  - **70–100 High:** "High chance of regret. Add to wishlist and decide after 24 hours."
- **The top 3 reasons** behind the score, from the model's feature contributions. Example: "You didn't plan this, the timer influenced you, you're paying with BNPL."
- A checkbox: "Allow my anonymous answers to be used for research." The answers are saved only if it is ticked.

### 4.5 Learn page (`/learn`)
- 8 short cards on dark patterns: false urgency, basket sneaking, confirm shaming, forced action, subscription trap, interface interference, bait and switch, drip pricing. Each card has a one-line definition and an example.
- An "Anchoring explained" box showing how a crossed-out MRP changes what feels cheap.
- How to complain: the National Consumer Helpline (1915) and the consumerhelpline.gov.in portal.

### 4.6 About page (`/about`)
- Project aim, team, guide, college, the POME concepts used, and the methodology summary.
- The **limitations** section from Section 11 of this document.

### 4.7 Admin Dashboard (`/admin`, password-protected)
- **Upload price data:** a CSV with the columns `product_id, platform, name, category, mrp, date, price`.
- **Upload survey data:** a CSV of quiz-format responses with a `label_impulse` column.
- **Retrain models** button. It shows the new accuracy metrics before replacing the old model.
- **Analytics:**
  - Average DDI by platform (bar chart)
  - Average DDI by category (bar chart)
  - DDI in festive weeks vs normal weeks (bar chart)
  - Verdict distribution (pie chart)
  - Impulse score distribution (histogram)
  - Total checks done
- **Export** all results as CSV, for the research report.

## 5. Formulas (exact)

Let:
- `MRP` = maximum retail price shown
- `P` = current sale price
- `M30` = median of all recorded prices in the 30 days **before** today (today's price excluded)

**Advertised discount (%)**
```
AD = (MRP − P) / MRP × 100
```
If the platform shows its own % figure, that figure is used as AD.

**Real discount (%)**
```
RD = (M30 − P) / M30 × 100
```
RD can be negative. That means the "sale" price is higher than the usual price.

**Discount Deception Index**
```
DDI = AD − RD
```

**Verdict rules**

| Condition | Verdict |
|---|---|
| Fewer than 5 price points in the last 30 days | ⚪ Not enough data (AD and RD are still shown, with a "low confidence" label) |
| DDI < 5 | 🟢 Genuine |
| 5 ≤ DDI ≤ 15 | 🟡 Slightly inflated |
| DDI > 15 | 🔴 Fake / misleading |

**Confidence levels**
- High: 20 or more points in 30 days
- Medium: 10–19 points
- Low: 5–9 points

**Why the median and not the mean?** The median is not pulled by one-day flash prices or errors, so it represents the "usual" price better.

**Why 30 days?** Sellers usually raise prices in the 2–4 weeks before a big sale, so a 30-day window catches that inflation. The 90-day minimum is shown as extra context.

### Worked examples (use these as test cases)

| Case | MRP | Sale price | M30 | AD | RD | DDI | Verdict |
|---|---|---|---|---|---|---|---|
| A | 2000 | 800 | 900 | 60.0 | 11.1 | 48.9 | 🔴 Fake |
| B | 1000 | 700 | 950 | 30.0 | 26.3 | 3.7 | 🟢 Genuine |
| C | 5000 | 4000 | 4500 | 20.0 | 11.1 | 8.9 | 🟡 Inflated |
| D | 1500 | 1200 | 1100 | 20.0 | −9.1 | 29.1 | 🔴 Fake (price went *up*) |

All values are rounded to 1 decimal place.

## 6. Machine Learning models

### 6.1 Why the discount verdict is *rule-based* and not ML
The verdict comes straight from the DDI formula. If we trained an ML model to predict labels that we created from the same DDI formula, the model would just re-learn our own rule. That is called **target leakage**, and examiners often point it out. So:
- The **verdict** uses the transparent DDI rule.
- **ML is used where real prediction is needed:** future price movement (6.2) and impulse behaviour (6.3).

### 6.2 Model 1 – "Buy now or wait?" (price-drop prediction)

| Item | Detail |
|---|---|
| **Question** | Will the price fall by 5% or more within the next 14 days? |
| **Label** | 1 if the minimum price in days t+1 to t+14 is at most 0.95 × price at t, otherwise 0 |
| **Features** | current price ÷ M30, current price ÷ 90-day min, 7-day price trend slope, price volatility (std ÷ mean, 30 days), days until the next big sale event, category, platform, discount % shown |
| **Sale calendar** | a fixed table of Indian sale events: Republic Day, Holi, Independence Day, Great Indian Festival / Big Billion Days, Diwali, Black Friday, Year-End |
| **Algorithms** | Logistic Regression (baseline) and Random Forest; XGBoost for comparison |
| **Train/test split** | **time-based**: train on older dates, test on the latest 20% of dates. A random split would leak future prices into training |
| **Metrics** | Accuracy, Precision, Recall, F1, ROC-AUC |
| **Data needed** | ~200 products × 90+ days ≈ 18,000 rows |
| **When shown** | only if the product has at least 30 days of history |

### 6.3 Model 2 – Impulse-buying prediction

| Item | Detail |
|---|---|
| **Question** | How likely is this purchase to be impulsive? |
| **Training data** | ~300 survey responses. Each respondent answers the same 10 quiz questions about their **last online purchase**, plus the label question |
| **Label question** | "Was this purchase unplanned, and did you later feel you didn't really need it?" Yes = 1, No = 0 |
| **Features** | the 10 quiz answers, encoded (one-hot for categories, ordinal for scales) |
| **Algorithms** | **Logistic Regression** (main, because it is easy to explain to examiners) and Random Forest (comparison) |
| **Validation** | Stratified 5-fold cross-validation, because the dataset is small |
| **Class imbalance** | `class_weight="balanced"` if one class is under 35% |
| **Metrics** | Accuracy, Precision, Recall, F1, ROC-AUC, confusion matrix |
| **Explainability** | the top 3 reasons come from logistic regression coefficients × feature values (or SHAP for Random Forest) |
| **Output** | probability × 100 = Impulse Score |

### 6.4 Target performance (to state in the report)
- **Impulse model:** F1 of at least 0.70 and ROC-AUC of at least 0.75.
- **Price-drop model:** ROC-AUC of at least 0.70.

If the targets aren't met, report the real numbers honestly. Don't inflate them; that would be ironic for this project.

## 7. System architecture

```
 ┌───────────────┐   HTTPS/JSON   ┌──────────────────────┐
 │  Frontend     │ ─────────────▶ │  Backend API         │
 │  React + Vite │ ◀───────────── │  Python FastAPI      │
 │  Tailwind     │                │  - DDI calculator    │
 │  Chart.js     │                │  - ML model loader   │
 └───────────────┘                │  - CSV upload/admin  │
                                  └─────────┬────────────┘
                                            │
                     ┌──────────────────────┼─────────────────────┐
                     ▼                      ▼                     ▼
             ┌──────────────┐      ┌────────────────┐    ┌────────────────┐
             │ Database     │      │ Saved models   │    │ Sale calendar  │
             │ SQLite/      │      │ (.joblib files)│    │ (JSON file)    │
             │ PostgreSQL   │      └────────────────┘    └────────────────┘
             └──────────────┘
```

## 8. Database tables

**products**
| Column | Type | Note |
|---|---|---|
| id | integer PK | |
| platform | text | amazon / flipkart / myntra / other |
| platform_product_id | text | ASIN / pid. Unique with platform |
| name | text | |
| category | text | |
| mrp | numeric | |
| created_at | timestamp | |

**price_history**
| Column | Type | Note |
|---|---|---|
| id | integer PK | |
| product_id | FK → products.id | |
| date | date | Unique with product_id (one price per day) |
| price | numeric | |
| source | text | dataset / manual / tracker |

**checks**
| Column | Type |
|---|---|
| id | integer PK |
| product_id | FK (nullable for manual checks) |
| mrp, sale_price, m30 | numeric |
| ad, rd, ddi | numeric |
| verdict | text |
| confidence | text |
| drop_probability | numeric, nullable |
| created_at | timestamp |

**impulse_responses**
| Column | Type |
|---|---|
| id | integer PK |
| q1 … q10 | text |
| impulse_score | numeric |
| consent | boolean (only saved if true) |
| created_at | timestamp |

**model_versions**
| Column | Type |
|---|---|
| id | integer PK |
| model_name | text |
| metrics_json | text |
| file_path | text |
| is_active | boolean |
| trained_at | timestamp |

## 9. API endpoints

| Method | Endpoint | Input | Output |
|---|---|---|---|
| POST | `/api/check/link` | `{ "url": "..." }` | result JSON or `{ "status": "not_found", "platform", "product_id" }` |
| POST | `/api/check/manual` | `{ mrp, sale_price, advertised_pct?, category, platform, past_prices?: [{date, price}] }` | result JSON |
| POST | `/api/impulse` | `{ q1 … q10, consent }` | `{ score, level, reasons: [3 strings] }` |
| GET | `/api/learn` | – | list of dark pattern cards |
| POST | `/api/admin/login` | `{ password }` | session token |
| POST | `/api/admin/upload/prices` | CSV file | rows added, rows rejected with reasons |
| POST | `/api/admin/upload/survey` | CSV file | rows added |
| POST | `/api/admin/retrain` | `{ model: "impulse" or "price_drop" }` | new metrics; becomes active only if confirmed |
| GET | `/api/admin/analytics` | – | aggregated stats for charts |
| GET | `/api/admin/export` | – | CSV download |

**Example result JSON**
```json
{
  "product": {"name": "boAt Rockerz 450", "platform": "amazon", "category": "Electronics"},
  "mrp": 2000, "sale_price": 800, "m30": 900, "min90": 780,
  "advertised_discount": 60.0, "real_discount": 11.1, "ddi": 48.9,
  "verdict": "fake", "confidence": "high", "points_30d": 27,
  "drop_probability": 0.62, "suggestion": "wait",
  "explanation": "This product usually sells around ₹900, so the real saving is only ₹100.",
  "history": [{"date": "2026-08-01", "price": 899}]
}
```

## 10. Non-functional requirements (quality checklist)

| Area | Requirement |
|---|---|
| **Responsive** | Works on mobile (360px) to desktop. Most shoppers use phones |
| **Speed** | Result shown in under 2 seconds. Models are loaded once at server start |
| **Accessibility** | Verdicts use colour **and** text/icons, readable by colour-blind users; all inputs have labels; keyboard navigable; contrast ratio of at least 4.5:1 |
| **Error states** | Clear messages for an invalid link, unsupported site, server down, and empty fields. Never a blank screen |
| **Loading states** | A spinner with the text "Checking price history…" |
| **Security** | Validate all inputs on the backend as well; parameterised SQL (ORM); admin password hashed (bcrypt); rate limit of 30 requests/min per IP; CORS restricted to our frontend domain; secrets kept in `.env`, never in the frontend |
| **Privacy** | No login and no personal data. Quiz answers are stored only with consent and are anonymous, following India's DPDP Act 2023 |
| **Legal** | Disclaimer: "For awareness and research only. Not financial advice. Not affiliated with Amazon, Flipkart or Myntra." No large-scale scraping (see 11) |
| **Testing** | Unit tests for the DDI formula using the 4 worked examples; API tests for every endpoint; manual testing on mobile and desktop |
| **Design** | Striking dark editorial look in navy, glacier blue and lemon, with original SVG illustrations and gentle motion. See Part C for the full design system. (The coloured dots used in this document are only labels; the website uses icons and muted colours.) |

## 11. Possible weaknesses and how we handle each one

No real system is perfect. Examiners respect a team that names its limitations and shows how each is handled.

| Possible weakness | How DealCheck handles it |
|---|---|
| **Getting price data legally**: platforms don't allow mass scraping | We use (a) our own manually collected study dataset of ~200 products, (b) prices users enter manually, and (c) an official tracker API such as Keepa, which is paid and covers Amazon only, if budget allows. No automated mass scraping |
| **New products have no history** (cold start) | The site switches to manual mode, says honestly that there isn't enough data, and adds the product to the tracking list |
| **Too few price points give a wrong verdict** | Minimum of 5 points, a confidence label, and a "Not enough data" verdict |
| **Same product, different variants/sellers** | Prices are stored per platform product ID. The variant is noted in the name, and the limitation is stated |
| **Leakage in the ML models** | The verdict is rule-based (6.1); the price model uses a time-based split (6.2) |
| **Small survey dataset** (~300) | Stratified 5-fold CV, a simple model (Logistic Regression), and honest reporting of metrics |
| **Self-reported survey bias** | Questions are about a specific *recent* purchase, not general habits. Mentioned as a limitation |
| **MRP itself may be fake** | That's exactly why RD uses the median actual price instead of the MRP |
| **Thresholds (5 / 15) look arbitrary** | Justified by the analysis: they can be tuned from the DDI distribution in our dataset (e.g. the 50th and 85th percentiles) and are stated clearly |
| **Prices change daily** | Every result shows the date checked and the number of data points used |

## 12. POME concepts behind each feature

| Feature | POME concept |
|---|---|
| Real vs advertised discount | Information asymmetry, consumer protection |
| Crossed-out MRP and the DDI | Anchoring, pricing strategy |
| Impulse Score | Bounded rationality, consumer behaviour |
| Buy now or wait | Price elasticity, demand forecasting, planning |
| Festive vs normal week analysis | Seasonal demand, market behaviour |
| Platform comparison dashboard | Market structure, competition |
| Learn page and complaint links | Business ethics, CCPA regulation, Consumer Protection Act 2019 |
| Overall product | Marketing mix (Price, Promotion) seen from the buyer's side |

## 13. Novelty

1. **Combines price honesty and buyer behaviour** in one tool. Existing tools do one or the other.
2. **The DDI**: a single, explainable number for how misleading a discount is.
3. **A clear verdict and plain-English explanation** instead of a raw graph.
4. **Built for Indian platforms and the Indian sale calendar.**
5. **Explainable ML**: shows *why* the impulse score is high, not just the number.

## 14. Build plan (8 weeks)

| Week | Work | Deliverable |
|---|---|---|
| 1–2 | Collect price data for ~200 products; run the survey (~300 responses) | Raw CSVs |
| 3 | Clean data, compute DDI, exploratory analysis | Cleaned dataset + EDA charts |
| 4–5 | Train and evaluate both models | Metrics table, saved models |
| 6 | Backend API + database | Working endpoints + tests |
| 7 | Frontend pages connected to the API | Working website locally |
| 8 | Admin dashboard, deployment, testing, demo video | Live URL + report |

## 15. Deployment
- **Frontend:** Vercel or Netlify (free).
- **Backend:** Render or Railway (free tier). Set `DATABASE_URL`, `ADMIN_PASSWORD_HASH` and `ALLOWED_ORIGIN` as environment variables.
- **Database:** SQLite for development, then PostgreSQL (Render or Supabase free tier) for the live site.
- **Code:** a GitHub repository with a README covering setup steps, screenshots and the team names.

---

# PART B – PROMPT TO BUILD THE WEBSITE

Copy everything inside the box below into your website builder (Claude, Cursor, Lovable, Bolt, etc.).

If you use **Lovable or Bolt**, which mainly build JavaScript apps, tell them to implement the backend in **Supabase Edge Functions** and to run the ML models as **exported coefficients**: logistic regression is just a formula, so it can run in JavaScript. Train the models in Python (Google Colab) first and paste the coefficients in. With Claude Code or Cursor, use the Python backend as written.

```
Build a full-stack web application called "DealCheck" — a tool that tells Indian online shoppers whether an e-commerce discount is genuine and whether they are about to buy on impulse. It is a college project for the course "Principles of Management and Economics" at RV College of Engineering, Bengaluru (team: Nikitha Dayanand, Kriti Agarwal, Maanya Singh, Laavanya Singh Rathor; guide: Dr C Bindu Ashwini, Dept. of IEM).

TECH STACK
- Frontend: React + Vite + TypeScript, Tailwind CSS, shadcn/ui, components from 21st.dev, Framer Motion (subtle only), React Router, Recharts (via shadcn charts), lucide-react icons, sonner for toasts.
- Backend: Python 3.11, FastAPI, SQLAlchemy ORM, Pydantic validation, scikit-learn, pandas, joblib, bcrypt, slowapi (rate limiting).
- Database: SQLite in development, PostgreSQL in production via DATABASE_URL.
- Include a /ml folder with Jupyter-free Python training scripts and a /tests folder with pytest tests.

DESIGN (mature, classic, editorial brand — follow Part C of the spec exactly)
- Brand: "DealCheck — Know the real price." Wordmark in Playfair Display, a small circular seal mark with a thin check.
- Colours (dark theme): background Navy #0B1A33, surface #12264A, headings #E6F4FA, body #C3DCE8, muted #93B3C8, borders #24406E, Glacier Blue #7FC4E0 (labels, icons, chart lines), Lemon #F4E04D highlights (buttons, key words, sparkles, focus rings). Verdicts: genuine #6EE7B7, inflated #FDBA74, fake #FCA5A5, insufficient #A3B4C6.
- Verdict colours (muted, never neon): Genuine #2F6B4F, Slightly inflated #B7862C, Fake #9B2C2C, Not enough data #6E6E6E (for inflated text use #8A6417 for contrast). Always show an icon + text with the colour (colour-blind safe).
- Typography: headings Playfair Display (600), body Inter (400/500), all numbers with tabular figures (font-variant-numeric: tabular-nums). Base size 16px, line-height 1.6, max text width 68ch.
- Style rules: generous whitespace, 1px borders, radius 6–14px, soft lemon and glacier-blue glows and a faint dotted texture, frosted (blurred) header and cards over artwork, original SVG illustrations, no emoji or stock photos, motion = fade-up reveals, floating/swinging art, line-drawing charts and a facts marquee, respect prefers-reduced-motion.
- Fully responsive from 360px mobile to desktop. Accessible: labelled inputs, keyboard navigation, contrast ≥ 4.5:1.
- Every async action shows a loading spinner with text; every error shows a clear friendly message; never a blank screen.

PAGES
1. Home (/): header nav (Home, Check Discount, Impulse Quiz, Learn, About), hero "Is that sale really a sale? Check before you buy.", URL input + Check button, link "No link? Enter prices manually", three feature cards, footer with disclaimer "For awareness and research only. Not affiliated with Amazon, Flipkart or Myntra." plus team and college names.

2. Check Discount (/check) with two modes:
   a) Link mode: accept URLs only from amazon.in, flipkart.com, myntra.com. Extract product ID (Amazon ASIN from /dp/<ASIN> or /gp/product/<ASIN>; Flipkart "pid" query parameter; Myntra the numeric ID before /buy). Look up price history in the database. If not found, show "We don't have enough price history for this product yet. Enter the prices you see to get an estimate." and switch to manual mode with platform pre-filled; also insert the product into the products table for future tracking.
   b) Manual mode fields: product name (optional), platform (dropdown), category (Electronics, Fashion, Home, Beauty, Books, Others), MRP (required), current sale price (required), advertised discount % (optional, auto-calculated if blank), up to 10 past prices with dates (optional, add/remove rows).
   Validation (frontend AND backend): prices numeric, > 0, ≤ 1000000; sale price ≤ MRP ("Sale price can't be higher than MRP"); advertised % between 0 and 99; past price dates not in the future.

3. Result (shown on /check after submit):
   - Product summary; big verdict badge; numbers card (Advertised discount, Real discount, DDI, 30-day median, 90-day minimum); line chart of up to 90 days of history with dotted lines for 30-day median and current price; "Buy now or wait?" card (only if ≥ 30 days of history) showing drop probability and suggestion; confidence note "Based on N price points in the last 30 days"; one plain-English sentence such as "This product usually sells around ₹900, so the real saving is only ₹100, not ₹1,200 as the banner suggests."; button "Take the impulse quiz before you buy".
   - Format all money as Indian rupees with Indian digit grouping (₹1,00,000). Round percentages to 1 decimal.

4. Impulse Quiz (/quiz): 10 questions, one per screen, progress bar, back/next buttons:
   q1 Did you plan to buy this before you saw the sale? (Yes/No)
   q2 How long have you been looking at this product today? (<5 min / 5–30 min / >30 min)
   q3 Did a timer, "only few left" or "X people bought this" message influence you? (Not at all / A little / A lot)
   q4 Would you buy it at its normal price? (Yes / Maybe / No)
   q5 Do you already own something similar? (Yes/No)
   q6 How are you paying? (Full payment / EMI / Buy-Now-Pay-Later / Cash on delivery)
   q7 How are you feeling right now? (Calm / Bored / Stressed / Excited)
   q8 How often do you buy during sales? (Rarely / Sometimes / Every sale)
   q9 Monthly spending budget used so far? (<25% / 25–75% / >75%)
   q10 Age group (18–22 / 23–30 / 31–45 / 45+)
   Plus an unticked checkbox "Allow my anonymous answers to be used for research".
   Result: semicircle gauge 0–100; levels 0–39 Low ("Looks like a planned purchase."), 40–69 Medium ("Take a short break and compare prices once."), 70–100 High ("High chance of regret. Add to wishlist and decide after 24 hours."); show top 3 reasons in plain English. Save answers only if consent is ticked.

5. Learn (/learn): 8 cards (False urgency, Basket sneaking, Confirm shaming, Forced action, Subscription trap, Interface interference, Bait and switch, Drip pricing) each with a one-line definition and an Indian shopping example; an "Anchoring explained" box; complaint info: National Consumer Helpline 1915 and consumerhelpline.gov.in.

6. About (/about): project aim, team, guide, college, POME concepts used (information asymmetry, anchoring, bounded rationality, price elasticity, demand forecasting, marketing mix, business ethics, consumer protection), methodology summary, and a Limitations section.

7. Admin (/admin): password login (bcrypt hash from env var ADMIN_PASSWORD_HASH, session token expires after 2 hours). Features: upload price CSV (columns: product_id, platform, name, category, mrp, date, price) with a report of rows added and rows rejected with reasons; upload survey CSV (q1..q10, label_impulse); retrain buttons for each model that show new metrics and only activate the new model after the admin clicks "Use this model"; analytics charts (average DDI by platform, by category, festive vs normal weeks, verdict pie chart, impulse score histogram, total checks); export all checks as CSV.

CORE FORMULAS (implement exactly, in a single pure function with unit tests)
- M30 = median of recorded prices in the 30 days before today (exclude today).
- AD (advertised discount %) = platform-shown % if provided, else (MRP − P) / MRP × 100.
- RD (real discount %) = (M30 − P) / M30 × 100 (may be negative).
- DDI = AD − RD.
- Verdict: if fewer than 5 price points in last 30 days → "insufficient" (still show AD and RD labelled low confidence); else DDI < 5 → "genuine"; 5 ≤ DDI ≤ 15 → "inflated"; DDI > 15 → "fake".
- Confidence: ≥ 20 points high, 10–19 medium, 5–9 low.
- In manual mode with past prices, compute M30 from the entered past prices that fall within the last 30 days.
- Unit tests must pass for: (MRP 2000, P 800, M30 900 → AD 60.0, RD 11.1, DDI 48.9, fake), (1000, 700, 950 → 30.0, 26.3, 3.7, genuine), (5000, 4000, 4500 → 20.0, 11.1, 8.9, inflated), (1500, 1200, 1100 → 20.0, −9.1, 29.1, fake).
- Thresholds 5 and 15 must be configurable constants in one config file.

MACHINE LEARNING
- The discount verdict is RULE-BASED (DDI), not ML, to avoid target leakage.
- Model 1 "price_drop": label = 1 if min price in the next 14 days ≤ 0.95 × current price. Features: price/M30, price/min90, 7-day slope, 30-day volatility (std/mean), days to next sale event (from a JSON sale calendar of Indian events: Republic Day, Holi, Independence Day, Great Indian Festival / Big Billion Days, Diwali, Black Friday, Year-End), category, platform, shown discount %. Train Logistic Regression and Random Forest; use a TIME-BASED split (latest 20% of dates as test); report accuracy, precision, recall, F1, ROC-AUC; save the better model by ROC-AUC with joblib. Only show the prediction when the product has ≥ 30 days of history.
- Model 2 "impulse": features = q1..q10 (one-hot for categorical, ordinal for scales); label = label_impulse. Train Logistic Regression (primary) and Random Forest; stratified 5-fold cross-validation; class_weight="balanced"; report accuracy, precision, recall, F1, ROC-AUC and confusion matrix; output probability × 100 as score; top 3 reasons from logistic regression coefficient × feature value (map each feature to a plain-English sentence).
- Provide ml/train_price_drop.py, ml/train_impulse.py, and sample synthetic CSVs (clearly labelled SYNTHETIC – for testing only) so the app runs before real data is collected. Load models once at server start.
- Store each trained model's metrics in a model_versions table with an is_active flag.

DATABASE TABLES
products(id, platform, platform_product_id, name, category, mrp, created_at; unique(platform, platform_product_id))
price_history(id, product_id FK, date, price, source; unique(product_id, date))
checks(id, product_id nullable, mrp, sale_price, m30, ad, rd, ddi, verdict, confidence, drop_probability nullable, created_at)
impulse_responses(id, q1..q10, impulse_score, consent, created_at)
model_versions(id, model_name, metrics_json, file_path, is_active, trained_at)

API (all JSON, all validated with Pydantic)
POST /api/check/link, POST /api/check/manual, POST /api/impulse, GET /api/learn,
POST /api/admin/login, POST /api/admin/upload/prices, POST /api/admin/upload/survey,
POST /api/admin/retrain, POST /api/admin/activate-model, GET /api/admin/analytics, GET /api/admin/export.
Return clear error JSON {"error": "message"} with correct HTTP status codes.

SECURITY AND PRIVACY
- No shopper login and no personal data collected. Quiz answers stored only with consent, anonymously (India DPDP Act 2023).
- Rate limit 30 requests/minute per IP. CORS restricted to ALLOWED_ORIGIN env var. ORM only (no raw SQL string building). All secrets in .env (provide .env.example). Admin routes require a valid token.
- Do NOT implement automated scraping of e-commerce websites. Price data comes only from admin CSV uploads and user manual entry.

DELIVERABLES
- Complete working code for frontend and backend, organised into /frontend, /backend, /ml, /tests.
- README with: project description, setup and run commands, environment variables, how to train models, how to run tests, deployment steps (frontend on Vercel, backend on Render, PostgreSQL), screenshots section, team and guide names.
- All pytest tests passing, including the four DDI test cases.
- Seed script that loads the synthetic sample data so every page can be demoed immediately.
```

---

## Checklist before you submit or demo
- [ ] All four DDI test cases pass.
- [ ] The site works on a phone.
- [ ] An invalid link shows a friendly error.
- [ ] A product with no history shows "Not enough data" and offers manual mode.
- [ ] The quiz does not save answers when consent is unticked.
- [ ] The admin page cannot be opened without the password.
- [ ] The synthetic data has been replaced with your real collected data before final results.
- [ ] The model metrics in the report match what the admin page shows.
- [ ] The disclaimer is visible in the footer.

---

# PART C – BRAND & DESIGN WITH 21st.dev

## C1. What 21st.dev is and how we use it
21st.dev is a library of ready-made React + Tailwind components, built on shadcn/ui. You can use it in two ways:

1. **Browse and copy.** Search a component on 21st.dev, open it, and copy its install command. It usually looks like `npx shadcn@latest add "https://21st.dev/r/<author>/<component>"`. Run that command inside your `/frontend` folder.
2. **Let an AI fetch and generate components (21st MCP).** Connect 21st.dev to Claude Code or Cursor:
   ```bash
   npx @21st-dev/cli@latest init --client claude
   ```
   Use `--client cursor` if you use Cursor. You need a free API key from 21st.dev/mcp. Once connected, ask in plain English, for example: "Using 21st.dev, find a minimal editorial hero section with a URL input and adapt it to our design system." The older `/ui` shortcut from 2025 guides no longer works.

Always confirm the current install command on the 21st.dev site, because their tooling changes often.

**Golden rule:** the components on 21st.dev come in many styles. **Pick the plainest version and restyle it with our tokens (C3)**. Never mix styles from different authors without restyling them. That is what makes the site look like one brand instead of a collage.

## C2. Brand personality
| Aspect | Decision |
|---|---|
| Feel | Striking and premium but trustworthy: a dark, jewel-toned consumer-rights brand that feels like a luxury finance app |
| Voice | Plain, confident, never shouty. "Here's the real price." not "OMG FAKE SALE!!!" |
| Name | **DealCheck** |
| Tagline | **Know the real price.** |
| Logo | Wordmark "DealCheck" in Playfair Display 600, icy white-blue. To its left, a small circular seal (1.5px Lemon ring) with a thin check mark inside |
| Avoid | Neon colours, harsh gradients, emojis, stock photos of smiling shoppers, sale-style red banners. Use soft glows and original illustrations instead |

## C3. Design tokens (paste into `tailwind.config` / CSS variables)

### Colours (navy, glacier blue and lemon, dark theme)
| Token | Hex | Used for |
|---|---|---|
| `--background` | #0B1A33 (Navy) | Page background |
| `--deep` | #071228 | Footer, ticker band |
| `--surface` | #12264A | Cards, inputs |
| `--raised` | #193260 | Selected options, hover tints, icon circles |
| `--ink` | #E6F4FA | Headings, key numbers, the icy stat band |
| `--text` | #C3DCE8 | Body text |
| `--muted` | #93B3C8 | Captions, helper text |
| `--glacier` | #7FC4E0 (Glacier Blue) | Section labels, icons, chart price line, admin bars |
| `--glacier-soft` | #A9D6EA | Illustration lines, footer text |
| `--border` | #24406E | 1px borders |
| `--lemon` | #F4E04D (Lemon) | Highlights: primary buttons, key words, sparkles, focus rings, median line |
| `--lemon-deep` | #5E5300 | Lemon-toned text on the icy band |
| `--genuine` | #6EE7B7 | Genuine verdict |
| `--inflated` | #FDBA74 | Slightly inflated verdict |
| `--fake` | #FCA5A5 | Misleading verdict |
| `--insufficient` | #A3B4C6 | Not enough data |

Every colour passes WCAG AA contrast on the background it is used on:
- **On navy:** icy text 15.5, body 12.2, muted 7.9, glacier 9.0, lemon 12.9, mint 11.4, peach 10.3, rose 9.2.
- **Buttons:** navy text on lemon, 12.9.
- **Icy band:** navy on icy 15.5, olive-lemon on icy 6.9.

**Graphics and motion.** All artwork is original, hand-built SVG, so there are no stock images or copyright issues:
- **Hero:** a swinging price tag whose MRP gets struck through, a floating 30-day price chart that draws itself, a "Real 11% off" stamp, slowly orbiting rings and twinkling lemon sparkles.
- **Facts ticker:** a scrolling marquee of key statistics.
- **Cards:** each step and feature card has its own illustration, and cards lift on hover.
- **Scroll effects:** sections reveal as you scroll, and the "52 of 53" statistic counts up.
- **Result page:** a stamped verdict seal and a price chart that animates in.
- **Quiz:** the impulse gauge draws itself.
- **404 page:** a swinging "Sold out" tag.

All motion stops when the visitor's system has reduced motion turned on.

### Typography
| Use | Font | Size / weight |
|---|---|---|
| Display (hero) | Playfair Display | 48–56px desktop / 34px mobile, 600 |
| H1 / H2 / H3 | Playfair Display | 36 / 28 / 22px, 600 |
| Body | Inter | 16px, 400, line-height 1.6 |
| Labels, buttons | Inter | 14px, 500, letter-spacing 0.01em |
| Small caps eyebrow text ("PRICE ANALYSIS") | Inter | 12px, 600, uppercase, letter-spacing 0.12em, Glacier Blue #7FC4E0 |
| Numbers (₹, %, DDI) | Inter with `tabular-nums` | Big stats 40px, 600 |

Both fonts are free on Google Fonts.

### Shape, spacing, motion
- **Radius:** 6px for inputs and buttons, 8px for cards. Never fully round, except the logo seal and the gauge.
- **Borders:** 1px `--border`. **Shadows:** none, or one very soft shadow on hover (`0 1px 2px rgba(20,33,61,0.06)`).
- **Spacing:** an 8px scale. Sections are separated by 96px on desktop and 64px on mobile. Content max width is 1120px; reading text max width is 68ch.
- **Buttons:**
  - Primary: solid lemon with navy text.
  - Secondary: transparent with a glacier 1px border that turns lemon on hover.
  - Hover: a 4% darker shade. Focus: a 2px lemon (#F4E04D) ring.
- **Motion:** fade-up reveals as sections scroll in, a swinging price tag and floating chart in the hero, line-drawing charts and gauges, a stamped verdict seal, a scrolling facts marquee, counting numbers and twinkling sparkles. All of it is turned off when `prefers-reduced-motion` is on.
- **Imagery:** no photos. Use thin line illustrations or simple typographic layouts, for example a large crossed-out "₹2,000" next to "₹900 – the real usual price".

## C4. Which 21st.dev component to use for each part
Search 21st.dev with these words, pick the **most minimal** result, then restyle it with C3.

| Page / part | Search on 21st.dev | Notes for restyling |
|---|---|---|
| Top navigation | "minimal navbar", "header" | Logo left, links right, thin bottom border, sticky. Mobile: hamburger opens a sheet/drawer |
| Home hero | "hero section minimal", "hero with input" | Lemon eyebrow "CONSUMER PRICE CHECK", serif headline, URL input + Check button in one row, "Enter prices manually" link below |
| "How it works" | "feature section", "steps", "timeline" | 3 numbered steps in serif numerals (01, 02, 03) separated by hairlines. No icons in coloured circles |
| Feature cards | "bento grid", "feature cards" | 3 cards on the dark surface, 1px border, a small original illustration on top, lift + lemon edge on hover |
| Statistic strip | "stats section", "number ticker" | E.g. "52 of 53 top Indian apps use dark patterns (ASCI, 2024)". Source shown in small muted text |
| Manual entry form | "form", "input", "select", "date picker" | shadcn Form + Input + Select + date picker; add/remove rows for past prices |
| Loading | "skeleton", "spinner" | Skeleton of the result card with the text "Checking price history…" |
| Verdict | "badge", "alert", "callout" | Large callout card with a coloured left border (4px), icon, verdict title in serif, one-line explanation |
| Numbers card | "stats card", "metric card", "number ticker" | 4–5 metrics in a row with hairline separators |
| Price history chart | "line chart", "area chart" (shadcn chart) | icy white-blue line, dotted lemon line for the 30-day median, dotted grey line for current price, minimal grid, tooltip in ₹ |
| Buy now or wait | "card", "progress" | Probability as a thin horizontal bar plus the suggestion in words |
| Impulse quiz | "multi step form", "stepper", "radio group card", "progress" | One question per screen, options as large bordered radio cards, Back / Next, thin lemon progress bar |
| Impulse result | "radial chart", "gauge" | Semicircle gauge 0–100, level in serif, 3 reasons as a numbered list |
| Learn page | "accordion", "cards grid" | 8 dark-pattern cards; expand for an example |
| About page | "team section", "testimonial-free about" | Team names in a simple grid of text (no photos needed); guide named separately |
| Footer | "footer minimal" | Disclaimer, team, college, helpline 1915; Ivory background, hairline top border |
| Toasts / errors | "sonner toast", "alert" | Muted colours, plain wording |
| Admin login | "login form minimal" | Centered card, password field only |
| Admin dashboard | "dashboard sidebar", "data table", "file upload dropzone", "chart" | Left sidebar, metric cards, bar/pie charts in the brand palette, CSV dropzone, data table with export button |
| 404 page | "404 page minimal" | "This page isn't on sale." and a link home |

## C5. Prompts to use with the 21st MCP (or the 21st.dev site)

Paste the **style header** first in every request, then one of the section prompts below.

**Style header (always include):**
```
Design system: mature, classic, editorial brand called "DealCheck — Know the real price."
Colours (dark theme): background navy #0B1A33, deep #071228, surface #12264A, raised #193260, headings #E6F4FA, body #C3DCE8, muted #93B3C8, border #24406E, glacier blue #7FC4E0 for labels, icons and chart lines, lemon #F4E04D for highlights (primary buttons with navy text, key words, sparkles, focus rings). Add original SVG illustrations, scroll reveals, a facts marquee and gentle float/swing animations.
Verdict colours: genuine #6EE7B7, inflated #FDBA74, fake #FCA5A5, insufficient #A3B4C6, always with an icon and text.
Fonts: Playfair Display 600 for headings, Inter for body, tabular-nums for numbers.
Style: generous whitespace, 1px hairline borders, radius 6–14px, soft glows and dotted texture allowed, original SVG illustrations, no emoji, no stock photos, tasteful motion (fade-up reveals, float/swing, line drawing), respects prefers-reduced-motion. Fully responsive (360px to desktop) and accessible (labels, focus rings in lemon #F4E04D, AA contrast). React + TypeScript + Tailwind + shadcn/ui, lucide-react icons.
```

**1. Navbar + footer**
```
Find a minimal navbar and footer on 21st.dev and adapt them. Navbar: logo (small lemon-ring seal with thin check + "DealCheck" wordmark in Playfair Display) on the left; links Home, Check Discount, Impulse Quiz, Learn, About on the right; sticky with a hairline bottom border; mobile hamburger opening a sheet. Footer: disclaimer "For awareness and research only. Not affiliated with Amazon, Flipkart or Myntra.", team names (Nikitha Dayanand, Kriti Agarwal, Maanya Singh, Laavanya Singh Rathor), guide Dr C Bindu Ashwini, RV College of Engineering, National Consumer Helpline 1915.
```

**2. Home hero**
```
Find a minimal hero section with an input on 21st.dev and adapt it. Lemon small-caps eyebrow "CONSUMER PRICE CHECK"; serif headline "Is that sale really a sale?"; subline "Paste a product link from Amazon, Flipkart or Myntra. We compare the advertised discount with the real price history."; one-row URL input with an icy white-blue "Check" button; under it a text link "No link? Enter prices manually". On the right (desktop only) a typographic illustration: a large crossed-out "₹2,000", then "Advertised: 60% off", then "Real discount: 11%" in rose. No photos.
```

**3. How it works + stats**
```
Create a three-step "How it works" section with large serif numerals 01, 02, 03 separated by hairlines: "Paste a link", "We check 30 days of prices", "Get a clear verdict". Below it, a single stat strip: "52 of 53" with caption "top Indian apps were found using at least one deceptive design pattern" and source "ASCI, 2024" in muted small text.
```

**4. Result page**
```
Build a result page. Top: product summary line (name, platform, category). Then a large verdict callout with a 4px coloured left border, lucide icon, serif title (e.g. "Misleading discount"), and one plain-English sentence. Then a metrics row with hairline separators: Advertised discount, Real discount, Discount Deception Index (DDI), 30-day median price, 90-day lowest price — numbers in tabular-nums, rupee formatting with Indian grouping (₹1,00,000). Then a shadcn line chart (Recharts) of up to 90 days of prices: icy white-blue line, dotted lemon reference line for the 30-day median, dotted grey line for the current price, minimal grid, ₹ tooltip. Then a "Buy now or wait?" card with a thin probability bar and the suggestion in words. Then a muted confidence note "Based on 27 price points in the last 30 days". Final button: "Take the impulse quiz before you buy". Include a skeleton loading state and an error state.
```

**5. Impulse quiz**
```
Find a multi-step form / stepper on 21st.dev and adapt it into a 10-question quiz, one question per screen, with large bordered radio-card options (selected state: icy white-blue border + soft ivory fill), Back and Next buttons, and a thin lemon progress bar with "Question 3 of 10". Last screen: unticked consent checkbox "Allow my anonymous answers to be used for research" and a "See my result" button. Keyboard accessible.
```

**6. Impulse result**
```
Create an impulse result view: a semicircle gauge from 0 to 100 (muted sage for 0–39, ochre for 40–69, oxblood for 70–100) with the score in large tabular-nums, the level in serif ("High chance of regret"), the advice sentence, and a numbered list titled "Why we think so" with three reasons. Buttons: "Check another product" (secondary) and "Read about dark patterns" (text link).
```

**7. Learn page**
```
Create an editorial "Learn" page: serif page title "How online sales nudge you", short intro, then a 2-column grid (1 column on mobile) of 8 bordered cards — False urgency, Basket sneaking, Confirm shaming, Forced action, Subscription trap, Interface interference, Bait and switch, Drip pricing — each with a one-line definition and an expandable "Example" (accordion). End with a boxed note "Anchoring explained" and a complaint box with helpline 1915 and consumerhelpline.gov.in.
```

**8. Admin dashboard**
```
Find a minimal dashboard layout with sidebar on 21st.dev and adapt it. Sidebar: Overview, Upload data, Models, Export. Overview: 4 metric cards (Total checks, Average DDI, % fake verdicts, Average impulse score), bar charts "Average DDI by platform" and "Average DDI by category", a bar chart "Festive vs normal weeks", a pie/donut of verdicts, and a histogram of impulse scores — all in the brand palette. Upload data: CSV dropzone with a results table (rows added, rows rejected + reason). Models: table of model versions with metrics and a "Use this model" button. Use the same navy, glacier and lemon styling — no bright dashboard colours.
```

## C6. Quality check before calling it "brand-like"
- [ ] Only two fonts (Playfair Display and Inter) are used anywhere.
- [ ] Only the palette colours in C3 appear. No leftover colours from the original 21st.dev components.
- [ ] Lemon stays an accent: buttons, labels and sparkles, never large areas.
- [ ] Every card uses the same radius, border and padding.
- [ ] Headings are all serif and body text is all sans.
- [ ] No emojis or stock photos.
- [ ] It looks right at 360px, 768px and 1280px widths.
- [ ] The Lighthouse accessibility score is 90 or higher.
- [ ] Animations stop when "reduce motion" is turned on in the OS.
- [ ] The logo, tagline and footer are identical on every page.
