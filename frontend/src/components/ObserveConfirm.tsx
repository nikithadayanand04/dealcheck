import { useMemo, useState, type FormEvent } from "react";
import { ScanLine } from "lucide-react";
import type { Observation } from "../lib/bookmarklet";
import { CATEGORIES, PLATFORM_LABEL } from "../lib/utils";
import { Button, Card, FieldError, Input, Label, Notice } from "./ui";

function platformOf(url: string): string | null {
  try {
    const h = new URL(url).hostname;
    if (/(^|\.)amazon\.in$/.test(h)) return "amazon";
    if (/(^|\.)flipkart\.com$/.test(h)) return "flipkart";
    if (/(^|\.)myntra\.com$/.test(h)) return "myntra";
  } catch { /* invalid url */ }
  return null;
}

export interface ObserveInput { url: string; price: number; mrp: number; advertised_pct?: number; name?: string; category?: string }

export function ObserveConfirm({ obs, loading, onSubmit, onDiscard }: {
  obs: Observation; loading: boolean; onSubmit: (v: ObserveInput) => void; onDiscard: () => void;
}) {
  const platform = useMemo(() => platformOf(obs.u), [obs.u]);
  const [name, setName] = useState(obs.n);
  const [price, setPrice] = useState(obs.p ? String(obs.p) : "");
  const [mrp, setMrp] = useState(obs.m ? String(obs.m) : obs.p ? String(obs.p) : "");
  const [category, setCategory] = useState("Others");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const readAll = !!(obs.p && obs.m);

  function submit(e: FormEvent) {
    e.preventDefault();
    const p = Number(price.replace(/,/g, "")), m = Number(mrp.replace(/,/g, ""));
    const er: Record<string, string> = {};
    if (!(p > 0 && p <= 1_000_000)) er.price = "Enter the selling price shown on the page.";
    if (!(m > 0 && m <= 1_000_000)) er.mrp = "Enter the MRP (the crossed-out price). If there is none, use the selling price.";
    if (!er.price && !er.mrp && p > m) er.price = "The selling price can't be higher than the MRP.";
    setErrors(er);
    if (Object.keys(er).length) return;
    onSubmit({ url: obs.u, price: p, mrp: m, name: name.trim() || undefined, category,
      advertised_pct: obs.d && obs.d > 0 && obs.d < 100 ? obs.d : undefined });
  }

  if (!platform) {
    return (
      <Notice tone="error" className="mt-10">
        The button was clicked on a page that isn't an Amazon.in, Flipkart or Myntra product page. Open a product page and click it again.
        <button onClick={onDiscard} className="ml-2 text-lemon underline underline-offset-4 cursor-pointer">Check something else</button>
      </Notice>
    );
  }

  return (
    <Card className="relative mt-10 max-w-3xl overflow-hidden p-6 md:p-8">
      <div aria-hidden className="glow-glacier pointer-events-none absolute -right-24 -top-24 size-72 rounded-full" />
      <div className="relative flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-full border border-glacier/50 bg-raised"><ScanLine className="size-5 text-glacier" aria-hidden /></span>
        <div>
          <h2 className="text-2xl">Read from {PLATFORM_LABEL[platform]}</h2>
          <p className="mt-1 text-[15px] text-muted">
            {readAll ? "Check these match the page, then press Check." : "We couldn't read everything on that page. Please fill in what's missing."}
          </p>
          <p className="mt-1 truncate text-xs text-muted/80" title={obs.u}>{obs.u}</p>
        </div>
      </div>

      <form onSubmit={submit} noValidate className="relative mt-6 grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="o-name" optional>Product name</Label>
          <Input id="o-name" maxLength={300} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="o-price">Selling price (₹)</Label>
          <Input id="o-price" inputMode="decimal" value={price} invalid={!!errors.price} aria-describedby={errors.price ? "o-price-err" : undefined}
            onChange={(e) => { setPrice(e.target.value); setErrors((x) => ({ ...x, price: "" })); }} />
          <FieldError id="o-price-err">{errors.price}</FieldError>
        </div>
        <div>
          <Label htmlFor="o-mrp">MRP, the crossed-out price (₹)</Label>
          <Input id="o-mrp" inputMode="decimal" value={mrp} invalid={!!errors.mrp} aria-describedby={errors.mrp ? "o-mrp-err" : undefined}
            onChange={(e) => { setMrp(e.target.value); setErrors((x) => ({ ...x, mrp: "" })); }} />
          <FieldError id="o-mrp-err">{errors.mrp}</FieldError>
        </div>
        <div>
          <Label htmlFor="o-cat">Category</Label>
          <select id="o-cat" value={category} onChange={(e) => setCategory(e.target.value)}
            className="h-11 w-full rounded-sm border border-hairline bg-surface px-3 text-[15px] text-charcoal">
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex items-end gap-3 sm:justify-end">
          <Button type="button" variant="ghost" onClick={onDiscard}>Cancel</Button>
          <Button type="submit" size="lg" loading={loading}>Check &amp; save price</Button>
        </div>
        <p className="text-xs text-muted sm:col-span-2">Saving adds today's price to this product's history, so future checks get more accurate. No personal data is stored.</p>
      </form>
    </Card>
  );
}
