import { Link } from "react-router-dom";
import { Card, Container, Eyebrow, Rule } from "../components/ui";

const CONCEPTS = [
  ["Information asymmetry", "Sellers know the real price history; buyers don't. DealCheck gives it back to the buyer."],
  ["Anchoring", "A crossed-out MRP sets a false reference point. We replace it with the usual price."],
  ["Bounded rationality", "Under time pressure people take shortcuts. The impulse quiz slows the decision down."],
  ["Price elasticity & forecasting", "\"Buy now or wait?\" predicts price movement around sale events."],
  ["Marketing mix (Price, Promotion)", "We study how pricing and promotion are used, from the buyer's side."],
  ["Business ethics & consumer protection", "Grounded in the Consumer Protection Act 2019 and the CCPA Dark Pattern Guidelines 2023."],
];

const LIMITS = [
  ["Price data", "We don't scrape shopping sites. Prices come from our own collected study dataset and from prices you type in."],
  ["New products", "Products we haven't tracked show \"Not enough data\" and switch to manual entry."],
  ["Few price points", "Verdicts need at least 5 prices in 30 days; every result shows how many were used."],
  ["Variants and sellers", "Different colours, sizes or sellers can have different prices; we track per product ID."],
  ["Thresholds", "The 5 and 15 DDI cut-offs are a starting point, to be tuned from the DDI distribution in our collected dataset."],
  ["Survey bias", "The impulse model learns from self-reported answers about a recent purchase."],
  ["Predictions", "\"Buy now or wait?\" is a probability from past patterns, not a guarantee."],
];

export default function About() {
  return (
    <Container className="py-14 md:py-20">
      <div className="max-w-2xl">
        <Eyebrow>About the project</Eyebrow>
        <h1 className="mt-3 text-4xl md:text-[52px]">Predicting e-commerce <span className="italic text-shimmer">consumer behaviour</span></h1>
        <p className="mt-4 text-[17px] text-charcoal/90">
          A study on discount authenticity and impulse buying, built for the Principles of Management and Economics
          Experiential Learning project at RV College of Engineering, Bengaluru.
        </p>
      </div>

      <div className="mt-14 grid gap-10 md:grid-cols-[1fr_1.6fr]">
        <div>
          <h2 className="text-2xl">Team</h2>
          <Rule className="mt-3" />
          <ul className="mt-5 space-y-3 text-[15px]">
            {[["Nikitha Dayanand", "1RV25CS415"], ["Kriti Agarwal", "1RV24CS136"], ["Maanya Singh", "1RV24CS143"], ["Laavanya Singh Rathor", "1RV24CS140"]].map(([n, u]) => (
              <li key={u} className="flex items-center gap-3 border-b border-hairline pb-3">
                <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full border border-glacier/60 bg-raised font-serif text-sm text-glacier">{n.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
                <span className="flex-1 text-ink">{n}</span><span className="text-muted tabular">{u}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-lemon">Faculty guide</p>
          <p className="mt-1 text-[15px] text-ink">Dr C Bindu Ashwini</p>
          <p className="text-sm text-muted">Department of IEM, RVCE</p>
        </div>

        <div>
          <h2 className="text-2xl">How it works</h2>
          <Rule className="mt-3" />
          <Card className="mt-5 p-6 text-[15px]">
            <p><span className="font-medium text-ink">Real discount</span> = (30-day median price − sale price) ÷ 30-day median × 100</p>
            <p className="mt-2"><span className="font-medium text-ink">Discount Deception Index (DDI)</span> = advertised discount % − real discount %</p>
            <p className="mt-4 text-muted">DDI below 5 is genuine, 5–15 is slightly inflated, and above 15 is misleading. The verdict is a transparent rule, not a black-box model.</p>
          </Card>
          <p className="mt-5 text-[15px] text-charcoal">
            Two machine-learning models support it. A <span className="text-ink">price-drop model</span> (Random Forest / Logistic Regression, trained with a time-based split) estimates
            whether the price will fall 5% or more in the next 14 days. An <span className="text-ink">impulse model</span> (Logistic Regression, 5-fold cross-validation) estimates
            how likely a purchase is impulsive from ten survey questions and explains the top three reasons.
          </p>
        </div>
      </div>

      <section className="mt-20">
        <h2 className="text-2xl">POME concepts applied</h2>
        <Rule className="mt-3" />
        <div className="mt-6 grid gap-x-10 md:grid-cols-2">
          {CONCEPTS.map(([t, d]) => (
            <div key={t} className="border-b border-hairline py-4">
              <h3 className="font-sans text-[15px] font-semibold text-ink">{t}</h3>
              <p className="mt-1 text-[15px] text-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-20">
        <h2 className="text-2xl">Limitations, stated openly</h2>
        <Rule className="mt-3" />
        <dl className="mt-6 grid gap-x-10 md:grid-cols-2">
          {LIMITS.map(([t, d]) => (
            <div key={t} className="border-b border-hairline py-4">
              <dt className="font-sans text-[15px] font-semibold text-ink">{t}</dt>
              <dd className="mt-1 text-[15px] text-muted">{d}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-8 text-sm text-muted">
          For awareness and research only. Not financial advice. Not affiliated with Amazon, Flipkart or Myntra. <Link to="/learn" className="text-lemon underline decoration-lemon/60 underline-offset-4">Learn about dark patterns</Link>
        </p>
      </section>
    </Container>
  );
}
