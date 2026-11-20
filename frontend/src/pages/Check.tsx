import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { api, ApiError, type CheckResult, type ManualInput } from "../lib/api";
import { CATEGORIES, cn, PLATFORM_LABEL, PLATFORMS, todayISO } from "../lib/utils";
import { Button, Card, Container, Eyebrow, FieldError, Input, Label, Notice, Select } from "../components/ui";
import { ResultSkeleton, ResultView } from "../components/Result";
import { ObserveConfirm, type ObserveInput } from "../components/ObserveConfirm";
import { decodeObservation } from "../lib/bookmarklet";

type Mode = "link" | "manual";
type Row = { key: number; date: string; price: string };

interface ManualState {
  name: string; platform: string; category: string; mrp: string; sale: string; adv: string; productId: string; rows: Row[];
}
const emptyManual: ManualState = { name: "", platform: "other", category: "Others", mrp: "", sale: "", adv: "", productId: "", rows: [] };

function validateManual(m: ManualState): Record<string, string> {
  const e: Record<string, string> = {};
  const num = (v: string) => Number(v.replace(/,/g, ""));
  const mrp = num(m.mrp), sale = num(m.sale);
  if (!m.mrp.trim()) e.mrp = "Enter the MRP.";
  else if (!(mrp > 0) || mrp > 1_000_000) e.mrp = "MRP must be a number between 1 and 10,00,000.";
  if (!m.sale.trim()) e.sale = "Enter the current sale price.";
  else if (!(sale > 0) || sale > 1_000_000) e.sale = "Sale price must be a number between 1 and 10,00,000.";
  if (!e.mrp && !e.sale && sale > mrp) e.sale = "Sale price can't be higher than MRP.";
  if (m.adv.trim()) {
    const a = num(m.adv);
    if (!(a >= 0 && a <= 99)) e.adv = "Advertised discount must be between 0 and 99.";
  }
  const today = todayISO();
  m.rows.forEach((r) => {
    if (!r.date && !r.price) return;
    if (!r.date) e[`row${r.key}`] = "Add a date for this price.";
    else if (r.date > today) e[`row${r.key}`] = "Date can't be in the future.";
    else if (!(num(r.price) > 0) || num(r.price) > 1_000_000) e[`row${r.key}`] = "Enter a valid price.";
  });
  return e;
}

export default function Check() {
  const [params, setParams] = useSearchParams();
  const [mode, setMode] = useState<Mode>(params.get("mode") === "manual" ? "manual" : "link");
  const [url, setUrl] = useState(params.get("url") ?? "");
  const [urlError, setUrlError] = useState("");
  const [manual, setManual] = useState<ManualState>(emptyManual);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notFound, setNotFound] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const nextKey = useRef(1);
  const autoRan = useRef(false);
  const obsParam = params.get("obs");
  const obs = useMemo(() => (obsParam ? decodeObservation(obsParam) : null), [obsParam]);
  const [obsDone, setObsDone] = useState(false);

  const scrollToResult = () => setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);

  async function runLink(u: string) {
    setServerError(""); setNotFound(""); setResult(null);
    if (!u.trim()) return setUrlError("Please paste a product link.");
    setLoading(true); scrollToResult();
    try {
      const r = await api.checkLink(u.trim());
      if (r.status === "not_found") {
        setNotFound(r.message);
        setManual({ ...emptyManual, platform: r.platform, productId: r.product_id, rows: [] });
        setMode("manual");
      } else setResult(r);
    } catch (e) {
      if (e instanceof ApiError && e.status === 400) setUrlError(e.message);
      else setServerError((e as Error).message);
    } finally { setLoading(false); }
  }

  useEffect(() => {
    const u = params.get("url");
    if (u && !autoRan.current) { autoRan.current = true; runLink(u); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onObserve(v: ObserveInput) {
    setServerError(""); setResult(null); setLoading(true); scrollToResult();
    try { setResult(await api.observe(v)); setObsDone(true); }
    catch (e) { setServerError((e as Error).message); }
    finally { setLoading(false); }
  }

  function discardObservation() {
    setObsDone(false); setResult(null); setServerError("");
    setParams({}, { replace: true });
  }

  function onLink(e: FormEvent) {
    e.preventDefault();
    setParams(url.trim() ? { url: url.trim() } : {}, { replace: true });
    runLink(url);
  }

  async function onManual(e: FormEvent) {
    e.preventDefault();
    const errs = validateManual(manual);
    setErrors(errs);
    if (Object.keys(errs).length) {
      const first = Object.keys(errs)[0];
      document.getElementById(first.startsWith("row") ? `price-${first.slice(3)}` : `m-${first}`)?.focus();
      return;
    }
    const n = (v: string) => Number(v.replace(/,/g, ""));
    const input: ManualInput = {
      name: manual.name.trim() || undefined,
      platform: manual.platform, category: manual.category,
      mrp: n(manual.mrp), sale_price: n(manual.sale),
      advertised_pct: manual.adv.trim() ? n(manual.adv) : undefined,
      platform_product_id: manual.productId || undefined,
      past_prices: manual.rows.filter((r) => r.date && r.price).map((r) => ({ date: r.date, price: n(r.price) })),
    };
    setServerError(""); setResult(null); setLoading(true); scrollToResult();
    try { setResult(await api.checkManual(input)); }
    catch (e) { setServerError((e as Error).message); }
    finally { setLoading(false); }
  }

  const set = (k: keyof ManualState) => (e: { target: { value: string } }) => {
    setManual((m) => ({ ...m, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: "" }));
  };
  const addRow = () => manual.rows.length < 10 &&
    setManual((m) => ({ ...m, rows: [...m.rows, { key: nextKey.current++, date: "", price: "" }] }));
  const setRow = (key: number, field: "date" | "price", value: string) => {
    setManual((m) => ({ ...m, rows: m.rows.map((r) => (r.key === key ? { ...r, [field]: value } : r)) }));
    setErrors((er) => ({ ...er, [`row${key}`]: "" }));
  };
  const removeRow = (key: number) => setManual((m) => ({ ...m, rows: m.rows.filter((r) => r.key !== key) }));

  return (
    <Container className="py-14 md:py-20">
      <div className="max-w-2xl">
        <Eyebrow>Check a discount</Eyebrow>
        <h1 className="mt-3 text-4xl md:text-[52px]">What are you <span className="italic text-shimmer">really</span> saving?</h1>
        <p className="mt-4 text-[17px] text-charcoal/90">
          We compare the banner discount with the product's usual price, the median of the last 30 days.
        </p>
      </div>

      {obsParam && !obs && (
        <Notice tone="error" className="mt-10">The button data couldn't be read. Please click the button on the product page again.</Notice>
      )}
      {obs && !obsDone && <ObserveConfirm obs={obs} loading={loading} onSubmit={onObserve} onDiscard={discardObservation} />}
      {obs && obsDone && (
        <p className="mt-8 text-sm text-muted">Want to check something else? <button onClick={discardObservation} className="text-lemon underline underline-offset-4 cursor-pointer">Start a new check</button></p>
      )}

      {!obsParam && <>
      {/* Mode switch */}
      <div role="tablist" aria-label="How do you want to check?" className="mt-10 inline-flex rounded-sm border border-hairline bg-surface p-1">
        {(["link", "manual"] as Mode[]).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} aria-controls={`panel-${m}`} id={`tab-${m}`}
            onClick={() => setMode(m)}
            className={cn("h-9 rounded-[4px] px-4 text-sm font-medium transition-colors cursor-pointer",
              mode === m ? "bg-ink text-ivory" : "text-muted hover:text-ink")}>
            {m === "link" ? "Product link" : "Enter prices manually"}
          </button>
        ))}
      </div>

      <Card className="mt-5 max-w-3xl p-6 md:p-8">
        {mode === "link" ? (
          <form id="panel-link" role="tabpanel" aria-labelledby="tab-link" onSubmit={onLink} noValidate>
            <Label htmlFor="url">Product link</Label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input id="url" type="url" inputMode="url" placeholder="https://www.amazon.in/…/dp/B0…"
                value={url} invalid={!!urlError} aria-describedby={urlError ? "url-err" : "url-help"}
                onChange={(e) => { setUrl(e.target.value); setUrlError(""); }} />
              <Button type="submit" loading={loading} className="shrink-0">Check</Button>
            </div>
            <FieldError id="url-err">{urlError}</FieldError>
            {!urlError && <p id="url-help" className="mt-2 text-sm text-muted">Supported: amazon.in, flipkart.com, myntra.com. Paste the full product page link, not a shortened one.</p>}
          </form>
        ) : (
          <form id="panel-manual" role="tabpanel" aria-labelledby="tab-manual" onSubmit={onManual} noValidate>
            {notFound && (
              <Notice className="mb-6">
                {notFound}
                <span className="mt-1 block text-sm text-muted">
                  Tip: open the product page and click the <Link to="/button" className="text-lemon underline underline-offset-4">DealCheck button</Link>. It reads the price for you and starts building this product's price history.
                </span>
              </Notice>
            )}
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="m-name" optional>Product name</Label>
                <Input id="m-name" maxLength={300} value={manual.name} onChange={set("name")} placeholder="e.g. Wireless headphones" />
              </div>
              <div>
                <Label htmlFor="m-platform">Platform</Label>
                <Select id="m-platform" value={manual.platform} onChange={set("platform")}>
                  {PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>)}
                </Select>
              </div>
              <div>
                <Label htmlFor="m-category">Category</Label>
                <Select id="m-category" value={manual.category} onChange={set("category")}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </Select>
              </div>
              <div>
                <Label htmlFor="m-mrp">MRP (₹)</Label>
                <Input id="m-mrp" inputMode="decimal" value={manual.mrp} onChange={set("mrp")} invalid={!!errors.mrp}
                  aria-describedby={errors.mrp ? "m-mrp-err" : undefined} placeholder="2000" />
                <FieldError id="m-mrp-err">{errors.mrp}</FieldError>
              </div>
              <div>
                <Label htmlFor="m-sale">Current sale price (₹)</Label>
                <Input id="m-sale" inputMode="decimal" value={manual.sale} onChange={set("sale")} invalid={!!errors.sale}
                  aria-describedby={errors.sale ? "m-sale-err" : undefined} placeholder="800" />
                <FieldError id="m-sale-err">{errors.sale}</FieldError>
              </div>
              <div>
                <Label htmlFor="m-adv" optional>Advertised discount (%)</Label>
                <Input id="m-adv" inputMode="decimal" value={manual.adv} onChange={set("adv")} invalid={!!errors.adv}
                  aria-describedby={errors.adv ? "m-adv-err" : "m-adv-help"} placeholder="Calculated from MRP if blank" />
                <FieldError id="m-adv-err">{errors.adv}</FieldError>
                {!errors.adv && <p id="m-adv-help" className="mt-1.5 text-xs text-muted">Use the % shown on the banner, if any.</p>}
              </div>
            </div>

            <fieldset className="mt-8 border-t border-hairline pt-6">
              <legend className="sr-only">Past prices</legend>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-sans text-sm font-medium text-ink">Prices you've seen in the last 30 days <span className="font-normal text-muted">(optional, up to 10)</span></h2>
              </div>
              <p className="mt-1 text-sm text-muted">Add at least 5 to get a confident verdict. Prices you enter are used only for this check and are never saved.</p>
              <div className="mt-4 space-y-3">
                {manual.rows.map((r, i) => (
                  <div key={r.key}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <label htmlFor={`date-${r.key}`} className="sr-only">Date {i + 1}</label>
                        <Input id={`date-${r.key}`} type="date" max={todayISO()} value={r.date} onChange={(e) => setRow(r.key, "date", e.target.value)} invalid={!!errors[`row${r.key}`]} />
                      </div>
                      <div className="flex-1">
                        <label htmlFor={`price-${r.key}`} className="sr-only">Price {i + 1} in rupees</label>
                        <Input id={`price-${r.key}`} inputMode="decimal" placeholder="Price (₹)" value={r.price} onChange={(e) => setRow(r.key, "price", e.target.value)} invalid={!!errors[`row${r.key}`]} />
                      </div>
                      <Button type="button" variant="ghost" className="w-11 px-0" aria-label={`Remove price ${i + 1}`} onClick={() => removeRow(r.key)}>
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
                    <FieldError id={`row-err-${r.key}`}>{errors[`row${r.key}`]}</FieldError>
                  </div>
                ))}
              </div>
              <Button type="button" variant="secondary" size="sm" className="mt-4" onClick={addRow} disabled={manual.rows.length >= 10}>
                <Plus className="size-4" aria-hidden /> Add a past price
              </Button>
            </fieldset>

            <div className="mt-8 border-t border-hairline pt-6">
              <Button type="submit" size="lg" loading={loading}>Check discount</Button>
            </div>
          </form>
        )}
      </Card>

      </>}

      <div ref={resultRef} className="mt-14 scroll-mt-24">
        {serverError && <Notice tone="error">{serverError}</Notice>}
        {loading && <ResultSkeleton />}
        {result && !loading && <ResultView r={result} />}
      </div>
    </Container>
  );
}
