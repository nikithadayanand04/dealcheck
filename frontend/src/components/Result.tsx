import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CircleHelp, OctagonX, ShieldCheck, TriangleAlert } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CheckResult, Verdict } from "../lib/api";
import { cn, formatDate, formatINR, formatPct, PLATFORM_LABEL } from "../lib/utils";
import { Button, Card, Eyebrow, Skeleton } from "./ui";

export const VERDICT: Record<Verdict, { title: string; icon: typeof ShieldCheck; border: string; ring: string; text: string; bg: string }> = {
  genuine: { title: "Genuine discount", icon: ShieldCheck, border: "border-l-genuine", ring: "border-genuine", text: "text-genuine", bg: "bg-genuine" },
  inflated: { title: "Slightly inflated", icon: TriangleAlert, border: "border-l-inflated", ring: "border-inflated", text: "text-inflated-text", bg: "bg-inflated" },
  fake: { title: "Misleading discount", icon: OctagonX, border: "border-l-fake", ring: "border-fake", text: "text-fake", bg: "bg-fake" },
  insufficient: { title: "Not enough data", icon: CircleHelp, border: "border-l-insufficient", ring: "border-insufficient", text: "text-insufficient", bg: "bg-insufficient" },
};

function useCountUp(target: number | null, ms = 700) {
  const [v, setV] = useState(target ?? 0);
  useEffect(() => {
    if (target == null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setV(target); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return target == null ? null : v;
}

function Metric({ label, value, format, hint, emphasis }: {
  label: string; value: number | null; format: (n: number | null) => string; hint?: string; emphasis?: string;
}) {
  const v = useCountUp(value);
  return (
    <div className="border-b border-hairline py-5 pr-4 last:border-b-0 md:border-b-0 md:px-5 md:first:pl-0">
      <dt className="text-xs font-medium uppercase tracking-[0.08em] text-muted">{label}</dt>
      <dd className={cn("mt-2 font-serif text-[30px] leading-none tabular text-ink", emphasis)}>
        <span className="sr-only">{format(value)}</span>
        <span aria-hidden>{format(v == null ? null : Math.round(v * 10) / 10)}</span>
      </dd>
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-sm border border-hairline bg-surface px-3 py-2 text-sm shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
      <p className="text-muted">{formatDate(p.date)}</p>
      <p className="font-medium text-ink tabular">{formatINR(p.price)}</p>
    </div>
  );
}

export function PriceChart({ r }: { r: CheckResult }) {
  if (r.history.length < 2) {
    return <p className="text-[15px] text-muted">Not enough past prices to draw a chart. Add a few past prices to see the trend.</p>;
  }
  const prices = r.history.map((h) => h.price);
  const lo = Math.min(...prices, r.m30 ?? Infinity), hi = Math.max(...prices, r.m30 ?? 0);
  const pad = Math.max((hi - lo) * 0.15, hi * 0.02);
  return (
    <figure>
      <div className="h-[280px] w-full" role="img"
        aria-label={`Price history from ${formatDate(r.history[0].date)} to ${formatDate(r.price_date)}. 30-day median ${formatINR(r.m30)}, current price ${formatINR(r.sale_price)}.`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={r.history} margin={{ top: 16, right: 16, bottom: 4, left: 4 }}>
            <CartesianGrid stroke="#1B345E" vertical={false} />
            <XAxis dataKey="date" tickFormatter={(d) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              tick={{ fill: "#93B3C8", fontSize: 12 }} axisLine={{ stroke: "#24406E" }} tickLine={false} minTickGap={36} />
            <YAxis domain={[Math.max(0, lo - pad), hi + pad]} tickFormatter={(v) => formatINR(v)} width={78}
              tick={{ fill: "#93B3C8", fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#24406E" }} />
            {r.m30 != null && (
              <ReferenceLine y={r.m30} stroke="#F4E04D" strokeDasharray="5 4" strokeWidth={1.5} />
            )}
            <ReferenceLine y={r.sale_price} stroke="#A3B4C6" strokeDasharray="2 4" />
            <Line type="linear" dataKey="price" stroke="#7FC4E0" strokeWidth={1.75} dot={false} activeDot={{ r: 5, fill: "#F4E04D", stroke: "#0B1A33" }} isAnimationActive animationDuration={1400} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-2"><span className="h-0.5 w-5 bg-glacier" />Price</span>
        <span className="inline-flex items-center gap-2"><span className="h-0 w-5 border-t-[1.5px] border-dashed border-lemon" />30-day median</span>
        <span className="inline-flex items-center gap-2"><span className="h-0 w-5 border-t border-dotted border-insufficient" />Today's price</span>
      </figcaption>
    </figure>
  );
}

export function ResultView({ r }: { r: CheckResult }) {
  const v = VERDICT[r.verdict];
  const Icon = v.icon;
  const conf = { high: "High confidence", medium: "Medium confidence", low: "Low confidence", insufficient: "Very low confidence" }[r.confidence];
  const meta = [r.product.platform && r.product.platform !== "other" ? PLATFORM_LABEL[r.product.platform] : null, r.product.category].filter(Boolean).join(" · ");

  return (
    <div className="animate-fade-up space-y-6" aria-live="polite">
      {/* Summary */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-hairline pb-5">
        <div>
          <Eyebrow>Price analysis</Eyebrow>
          <h2 className="mt-2 text-2xl md:text-[28px]">{r.product.name || "Your product"}</h2>
          {meta && <p className="mt-1 text-sm text-muted">{meta}</p>}
        </div>
        <p className="text-sm text-muted tabular">MRP {formatINR(r.mrp)} · Sale price <span className="font-medium text-ink">{formatINR(r.sale_price)}</span></p>
      </div>

      {/* Verdict */}
      <Card className={cn("relative overflow-hidden border-l-4 p-6 md:p-8", v.border)}>
        <div aria-hidden className="glow-lemon pointer-events-none absolute -right-20 -top-20 size-64 rounded-full opacity-50" />
        <div className="flex items-start gap-4">
          <span className={cn("grid size-14 shrink-0 animate-stamp place-items-center rounded-full border-2 border-dashed", v.ring)} style={{ animationDelay: "150ms" }}>
            <Icon className={cn("size-7", v.text)} aria-hidden strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Verdict</p>
            <h3 className={cn("mt-1 text-[26px] md:text-3xl", v.text)}>{v.title}</h3>
            <p className="mt-3 max-w-[68ch] text-[16px] text-charcoal">{r.explanation}</p>
          </div>
        </div>
      </Card>

      {/* Metrics */}
      <Card className="px-5 sm:px-6">
        <dl className="grid grid-cols-2 divide-hairline md:grid-cols-5 md:divide-x">
          <Metric label="Advertised discount" value={r.advertised_discount} format={formatPct} />
          <Metric label="Real discount" value={r.real_discount} format={formatPct} emphasis={r.real_discount != null && r.real_discount < 0 ? "text-fake" : undefined} />
          <Metric label="Deception index" value={r.ddi} format={(n) => (n == null ? "—" : n.toFixed(1))} hint="DDI = advertised − real" emphasis={v.text} />
          <Metric label="30-day median" value={r.m30} format={formatINR} hint="Usual price" />
          <Metric label="90-day lowest" value={r.min90} format={formatINR} />
        </dl>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Chart */}
        <Card className="p-6">
          <h3 className="text-lg">Price history <span className="font-sans text-sm font-normal text-muted">(up to 90 days)</span></h3>
          <div className="mt-4"><PriceChart r={r} /></div>
        </Card>

        {/* Buy or wait */}
        <Card className="flex flex-col p-6">
          <h3 className="text-lg">Buy now or wait?</h3>
          {r.drop_probability != null ? (
            <>
              <p className="mt-4 font-serif text-5xl text-ink tabular">{Math.round(r.drop_probability * 100)}%</p>
              <p className="mt-1 text-sm text-muted">chance the price drops 5% or more in the next 14 days</p>
              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[#17305A]" aria-hidden>
                <div className="h-full rounded-full bg-gradient-to-r from-lemon to-[#FFF7B0] transition-[width] duration-1000" style={{ width: `${Math.round(r.drop_probability * 100)}%` }} />
              </div>
              <p className="mt-5 border-t border-hairline pt-4 text-[15px]">
                Suggestion: <span className="font-semibold text-ink">{r.suggestion === "wait" ? "Wait a little" : "Fine to buy now"}</span>
              </p>
              <p className="mt-1 text-xs text-muted">A prediction from past price patterns and the sale calendar, not a guarantee.</p>
            </>
          ) : (
            <p className="mt-4 text-[15px] text-muted">{r.drop_note}</p>
          )}
        </Card>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          {conf}: based on {r.points_30d} price point{r.points_30d === 1 ? "" : "s"} in the 30 days before {formatDate(r.price_date)}.
        </p>
        <Link to="/quiz"><Button variant="secondary">Take the impulse quiz before you buy <ArrowRight className="size-4" aria-hidden /></Button></Link>
      </div>
    </div>
  );
}

export function ResultSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Checking price history">
      <p className="text-sm text-muted">Checking price history…</p>
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-36 w-full" />
      <Skeleton className="h-24 w-full" />
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>
    </div>
  );
}
