import { useCallback, useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { BarChart3, Database, Download, FileUp, LogOut, Cpu } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { api, ApiError, type ModelVersion, type UploadReport } from "../lib/api";
import { cn, PLATFORM_LABEL } from "../lib/utils";
import { Button, Card, Container, Eyebrow, FieldError, Input, Label, Notice, Skeleton } from "../components/ui";
import { Logo } from "../components/Layout";

const TOKEN_KEY = "dealcheck_admin_token";
const VERDICT_COLORS: Record<string, string> = { genuine: "#6EE7B7", inflated: "#FDBA74", fake: "#FCA5A5", insufficient: "#A3B4C6" };
const VERDICT_LABEL: Record<string, string> = { genuine: "Genuine", inflated: "Slightly inflated", fake: "Misleading", insufficient: "Not enough data" };

/* ------------------------------------------------------------------ login */
function Login({ onToken }: { onToken: (t: string) => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!pw) return setErr("Enter the admin password.");
    setLoading(true); setErr("");
    try {
      const { token } = await api.login(pw);
      sessionStorage.setItem(TOKEN_KEY, token);
      onToken(token);
    } catch (e) { setErr((e as Error).message); } finally { setLoading(false); }
  }
  return (
    <Container className="flex min-h-[70vh] items-center justify-center py-16">
      <Card className="w-full max-w-sm p-8">
        <Logo />
        <h1 className="mt-6 text-2xl">Admin sign-in</h1>
        <p className="mt-1 text-sm text-muted">For the project team only.</p>
        <form onSubmit={submit} className="mt-6" noValidate>
          <Label htmlFor="pw">Password</Label>
          <Input id="pw" type="password" autoComplete="current-password" value={pw} invalid={!!err}
            aria-describedby={err ? "pw-err" : undefined} onChange={(e) => { setPw(e.target.value); setErr(""); }} />
          <FieldError id="pw-err">{err}</FieldError>
          <Button type="submit" loading={loading} className="mt-5 w-full">Sign in</Button>
        </form>
      </Card>
    </Container>
  );
}

/* ------------------------------------------------------------------ helpers */
function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className="mt-2 font-serif text-3xl text-ink tabular">{value}</p>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </Card>
  );
}

function ChartCard({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <Card className="p-6">
      <h3 className="text-lg">{title}</h3>
      {note && <p className="text-xs text-muted">{note}</p>}
      <div className="mt-4 h-[240px]">{children}</div>
    </Card>
  );
}

const axis = { tick: { fill: "#93B3C8", fontSize: 12 }, axisLine: { stroke: "#24406E" }, tickLine: false } as const;
const tooltipStyle = { contentStyle: { background: "#12264A", border: "1px solid #24406E", borderRadius: 8, fontSize: 13, color: "#E6F4FA" }, itemStyle: { color: "#E6F4FA" }, labelStyle: { color: "#93B3C8" }, cursor: { fill: "#193260" } };

function DdiBars({ data, labelMap, horizontal }: { data: { name: string; avg_ddi: number; count: number }[]; labelMap?: Record<string, string>; horizontal?: boolean }) {
  const rows = data.map((d) => ({ ...d, label: labelMap?.[d.name] ?? d.name }));
  if (horizontal) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid stroke="#1B345E" horizontal={false} />
          <XAxis type="number" {...axis} />
          <YAxis type="category" dataKey="label" {...axis} axisLine={false} width={84} />
          <Tooltip {...tooltipStyle} formatter={(v: any) => [Number(v).toFixed(1), "Average DDI"]} />
          <Bar dataKey="avg_ddi" fill="#7FC4E0" radius={[0, 3, 3, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid stroke="#1B345E" vertical={false} />
        <XAxis dataKey="label" {...axis} interval={0} />
        <YAxis {...axis} axisLine={false} />
        <Tooltip {...tooltipStyle} formatter={(v: any) => [Number(v).toFixed(1), "Average DDI"]} />
        <Bar dataKey="avg_ddi" fill="#7FC4E0" radius={[3, 3, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------------------ overview */
function Overview({ token, onAuthFail }: { token: string; onAuthFail: () => void }) {
  const [a, setA] = useState<any>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    api.analytics(token).then(setA).catch((e) => (e instanceof ApiError && e.status === 401 ? onAuthFail() : setErr(e.message)));
  }, [token, onAuthFail]);
  if (err) return <Notice tone="error">{err}</Notice>;
  if (!a) return <div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>;
  const d = a.dataset, u = a.usage;
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total checks" value={String(u.total_checks)} note={`${u.observed_prices} real prices collected by the button (${u.observed_products} products)`} />
        <Stat label="Average DDI" value={d.avg_ddi != null ? d.avg_ddi.toFixed(1) : "—"} note={`${d.rows?.toLocaleString("en-IN") ?? 0} product-days in dataset`} />
        <Stat label="Misleading" value={d.pct_fake != null ? `${d.pct_fake.toFixed(1)}%` : "—"} note="Share of product-days with DDI > 15" />
        <Stat label="Avg impulse score" value={u.avg_impulse_score != null ? String(Math.round(u.avg_impulse_score)) : "—"} note={`${u.impulse_responses} consented responses`} />
      </div>

      {d.rows > 0 ? (
        <>
          <div>
            <Eyebrow>From the price dataset</Eyebrow>
            <div className="mt-4 grid gap-5 lg:grid-cols-2">
              <ChartCard title="Average DDI by platform"><DdiBars data={d.by_platform} labelMap={PLATFORM_LABEL} /></ChartCard>
              <ChartCard title="Average DDI by category"><DdiBars data={d.by_category} horizontal /></ChartCard>
              <ChartCard title="Festive sale days vs normal days" note="Sale windows from the sale calendar"><DdiBars data={d.festive_vs_normal} /></ChartCard>
              <ChartCard title="Verdicts across all product-days">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={d.verdicts.map((v: any) => ({ ...v, label: VERDICT_LABEL[v.name] }))} dataKey="count" nameKey="label"
                      innerRadius={55} outerRadius={90} paddingAngle={1} stroke="#12264A">
                      {d.verdicts.map((v: any) => <Cell key={v.name} fill={VERDICT_COLORS[v.name]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle.contentStyle} itemStyle={tooltipStyle.itemStyle} formatter={(v: any) => Number(v).toLocaleString("en-IN")} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
            <div className="mt-3 flex flex-wrap gap-5 text-xs text-muted">
              {d.verdicts.map((v: any) => (
                <span key={v.name} className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: VERDICT_COLORS[v.name] }} />{VERDICT_LABEL[v.name]}: {v.count.toLocaleString("en-IN")}</span>
              ))}
            </div>
          </div>
        </>
      ) : <Notice>No price data yet. Upload a price CSV to see dataset analytics.</Notice>}

      <div>
        <Eyebrow>From website usage</Eyebrow>
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <ChartCard title="Impulse score distribution" note="Consented quiz responses only">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={u.impulse_histogram} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#1B345E" vertical={false} />
                <XAxis dataKey="bin" {...axis} interval={1} />
                <YAxis {...axis} axisLine={false} allowDecimals={false} />
                <Tooltip {...tooltipStyle} formatter={(v: any) => [v, "Responses"]} />
                <Bar dataKey="count" fill="#F4E04D" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Verdicts of website checks">
            {u.check_verdicts.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={u.check_verdicts.map((v: any) => ({ ...v, label: VERDICT_LABEL[v.name] ?? v.name }))} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#1B345E" vertical={false} />
                  <XAxis dataKey="label" {...axis} interval={0} />
                  <YAxis {...axis} axisLine={false} allowDecimals={false} />
                  <Tooltip {...tooltipStyle} formatter={(v: any) => [v, "Checks"]} />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={48}>
                    {u.check_verdicts.map((v: any) => <Cell key={v.name} fill={VERDICT_COLORS[v.name] ?? "#E6F4FA"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted">No checks yet.</p>}
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ upload */
function Dropzone({ kind, token, onAuthFail }: { kind: "prices" | "survey"; token: string; onAuthFail: () => void }) {
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<UploadReport | null>(null);
  const [err, setErr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const cols = kind === "prices" ? "product_id, platform, name, category, mrp, date, price" : "q1 … q10, label_impulse";

  async function send(file?: File) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) return setErr("Please choose a .csv file.");
    setBusy(true); setErr(""); setReport(null);
    try { setReport(await api.upload(token, kind, file)); toast.success(`${file.name} uploaded`); }
    catch (e) { e instanceof ApiError && e.status === 401 ? onAuthFail() : setErr((e as Error).message); }
    finally { setBusy(false); if (inputRef.current) inputRef.current.value = ""; }
  }
  const onDrop = (e: DragEvent) => { e.preventDefault(); setOver(false); send(e.dataTransfer.files?.[0]); };

  return (
    <Card className="p-6">
      <h3 className="text-lg">{kind === "prices" ? "Price data" : "Survey data"}</h3>
      <p className="mt-1 text-xs text-muted">Columns: {cols}</p>
      <div onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop}
        className={cn("mt-4 flex flex-col items-center justify-center rounded-md border border-dashed px-6 py-10 text-center transition-colors",
          over ? "border-lemon bg-ivory" : "border-[#34548A]")}>
        <FileUp className="size-6 text-lemon" aria-hidden />
        <p className="mt-3 text-sm text-charcoal">Drag a CSV here, or</p>
        <Button variant="secondary" size="sm" className="mt-3" loading={busy} onClick={() => inputRef.current?.click()}>Choose file</Button>
        <input ref={inputRef} type="file" accept=".csv,text/csv" className="sr-only" aria-label={`Upload ${kind} CSV`} onChange={(e) => send(e.target.files?.[0])} />
        <p className="mt-3 text-xs text-muted">Max 10 MB · UTF-8</p>
      </div>
      {err && <Notice tone="error" className="mt-4">{err}</Notice>}
      {report && (
        <div className="mt-4 text-sm">
          <p className="text-ink">
            <span className="font-medium">{report.rows_added}</span> added
            {report.rows_updated != null && <> · <span className="font-medium">{report.rows_updated}</span> updated</>}
            {" · "}<span className={cn("font-medium", report.rows_rejected && "text-fake")}>{report.rows_rejected}</span> rejected
          </p>
          {report.rejected.length > 0 && (
            <table className="mt-3 w-full text-left text-xs">
              <thead><tr className="border-b border-hairline text-muted"><th className="py-1.5 pr-3 font-medium">Row</th><th className="py-1.5 font-medium">Reason</th></tr></thead>
              <tbody>{report.rejected.map((r) => <tr key={r.row} className="border-b border-hairline"><td className="py-1.5 pr-3 tabular">{r.row}</td><td className="py-1.5">{r.reason}</td></tr>)}</tbody>
            </table>
          )}
          {report.rows_rejected > report.rejected.length && <p className="mt-2 text-xs text-muted">Showing first {report.rejected.length} rejected rows.</p>}
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ models */
function fmt(n: any) { return n == null ? "—" : Number(n).toFixed(3); }

function MetricsTable({ m }: { m: Record<string, any> }) {
  const algos = Object.keys(m).filter((k) => m[k] && typeof m[k] === "object" && "accuracy" in m[k]);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead><tr className="border-b border-hairline text-xs uppercase tracking-[0.06em] text-muted">
          <th className="py-2 pr-4 font-medium">Algorithm</th>{["Accuracy", "Precision", "Recall", "F1", "ROC-AUC"].map((h) => <th key={h} className="py-2 pr-4 font-medium">{h}</th>)}
        </tr></thead>
        <tbody>
          {algos.map((k) => (
            <tr key={k} className="border-b border-hairline tabular">
              <td className="py-2 pr-4 text-ink">{k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}{m.deployed?.toLowerCase().replace(/ /g, "_") === k && <span className="ml-2 text-xs text-lemon">deployed</span>}</td>
              <td className="py-2 pr-4">{fmt(m[k].accuracy)}</td><td className="py-2 pr-4">{fmt(m[k].precision)}</td>
              <td className="py-2 pr-4">{fmt(m[k].recall)}</td><td className="py-2 pr-4">{fmt(m[k].f1)}</td><td className="py-2 pr-4">{fmt(m[k].roc_auc)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted">Validation: {m.validation}</p>
    </div>
  );
}

function Models({ token, onAuthFail }: { token: string; onAuthFail: () => void }) {
  const [list, setList] = useState<ModelVersion[] | null>(null);
  const [busy, setBusy] = useState<string>("");
  const [err, setErr] = useState("");
  const [fresh, setFresh] = useState<ModelVersion | null>(null);
  const handle = (e: unknown) => (e instanceof ApiError && e.status === 401 ? onAuthFail() : setErr((e as Error).message));
  const load = useCallback(() => api.models(token).then(setList).catch(handle), [token]); // eslint-disable-line
  useEffect(() => { load(); }, [load]);

  async function retrain(model: string) {
    setBusy(model); setErr(""); setFresh(null);
    try { setFresh(await api.retrain(token, model)); await load(); } catch (e) { handle(e); } finally { setBusy(""); }
  }
  async function activate(id: number) {
    try { await api.activate(token, id); toast.success("Model activated"); setFresh(null); await load(); } catch (e) { handle(e); }
  }

  const NAMES = { impulse: "Impulse model", price_drop: "Price-drop model" } as const;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => retrain("impulse")} loading={busy === "impulse"} disabled={!!busy}>Retrain impulse model</Button>
        <Button variant="secondary" onClick={() => retrain("price_drop")} loading={busy === "price_drop"} disabled={!!busy}>Retrain price-drop model</Button>
      </div>
      {busy && <p className="text-sm text-muted">Training… the price-drop model can take up to a minute.</p>}
      {err && <Notice tone="error">{err}</Notice>}
      {fresh && (
        <Card className="border-l-4 border-l-lemon p-6">
          <h3 className="text-lg">New {NAMES[fresh.model_name]} trained (version {fresh.id})</h3>
          <p className="mt-1 text-sm text-muted">Compare with the active version below. It is not used until you activate it.</p>
          <div className="mt-4"><MetricsTable m={fresh.metrics} /></div>
          <Button className="mt-5" onClick={() => activate(fresh.id)}>Use this model</Button>
        </Card>
      )}
      {!list ? <Skeleton className="h-40" /> : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead><tr className="border-b border-hairline text-xs uppercase tracking-[0.06em] text-muted">
              {["Version", "Model", "Algorithm", "ROC-AUC", "F1", "Trained", "Status"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}
            </tr></thead>
            <tbody>
              {list.map((m) => {
                const key = m.metrics.deployed?.toLowerCase().replace(/ /g, "_");
                const best = m.metrics[key] ?? {};
                return (
                  <tr key={m.id} className="border-b border-hairline last:border-0 tabular">
                    <td className="px-4 py-3">{m.id}</td>
                    <td className="px-4 py-3 text-ink">{NAMES[m.model_name]}</td>
                    <td className="px-4 py-3">{m.algorithm}</td>
                    <td className="px-4 py-3">{fmt(best.roc_auc)}</td>
                    <td className="px-4 py-3">{fmt(best.f1)}</td>
                    <td className="px-4 py-3 text-muted">{new Date(m.trained_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td className="px-4 py-3">{m.is_active ? <span className="font-medium text-genuine">Active</span> :
                      <button onClick={() => activate(m.id)} className="text-lemon underline decoration-lemon/60 underline-offset-4 cursor-pointer">Activate</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ shell */
type Tab = "overview" | "upload" | "models" | "export";
const TABS: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "upload", label: "Upload data", icon: Database },
  { id: "models", label: "Models", icon: Cpu },
  { id: "export", label: "Export", icon: Download },
];

export default function Admin() {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY));
  const [tab, setTab] = useState<Tab>("overview");
  const logout = useCallback(() => { sessionStorage.removeItem(TOKEN_KEY); setToken(null); }, []);
  const authFail = useCallback(() => { toast.error("Your session expired. Please sign in again."); logout(); }, [logout]);

  if (!token) return <Login onToken={setToken} />;

  async function download(fetcher: () => Promise<Blob>, base: string) {
    try {
      const blob = await fetcher();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${base}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) { e instanceof ApiError && e.status === 401 ? authFail() : toast.error((e as Error).message); }
  }

  async function exportCsv() {
    try {
      const blob = await api.exportChecks(token!);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `dealcheck_checks_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) { e instanceof ApiError && e.status === 401 ? authFail() : toast.error((e as Error).message); }
  }

  return (
    <Container className="py-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-hairline pb-6">
        <div><Eyebrow>Admin</Eyebrow><h1 className="mt-2 text-3xl md:text-4xl">Research dashboard</h1></div>
        <Button variant="ghost" size="sm" onClick={logout}><LogOut className="size-4" aria-hidden /> Sign out</Button>
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[200px_1fr]">
        <nav aria-label="Admin sections" className="flex gap-1 overflow-x-auto lg:flex-col">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} aria-current={tab === t.id ? "page" : undefined}
              className={cn("flex shrink-0 items-center gap-2.5 rounded-sm px-3 py-2.5 text-left text-sm font-medium transition-colors cursor-pointer",
                tab === t.id ? "bg-surface text-ink border border-hairline" : "text-muted hover:text-ink border border-transparent")}>
              <t.icon className={cn("size-4", tab === t.id ? "text-lemon" : "")} aria-hidden /> {t.label}
            </button>
          ))}
        </nav>
        <div className="min-w-0">
          {tab === "overview" && <Overview token={token} onAuthFail={authFail} />}
          {tab === "upload" && (
            <div className="grid gap-5 xl:grid-cols-2">
              <Dropzone kind="prices" token={token} onAuthFail={authFail} />
              <Dropzone kind="survey" token={token} onAuthFail={authFail} />
              <p className="text-sm text-muted xl:col-span-2">After uploading, go to <button className="text-lemon underline underline-offset-4 cursor-pointer" onClick={() => setTab("models")}>Models</button> to retrain with the new data.</p>
            </div>
          )}
          {tab === "models" && <Models token={token} onAuthFail={authFail} />}
          {tab === "export" && (
            <div className="grid gap-5 xl:grid-cols-2">
              <Card className="p-8">
                <h2 className="text-xl">Collected price data</h2>
                <p className="mt-2 max-w-[60ch] text-[15px] text-muted">Real prices saved with the DealCheck button, in the same CSV format the upload accepts. This is your study dataset.</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button onClick={() => download(() => api.exportPrices(token!, "observed"), "dealcheck_prices_observed")}><Download className="size-4" aria-hidden /> Button prices only</Button>
                  <Button variant="secondary" onClick={() => download(() => api.exportPrices(token!, "all"), "dealcheck_prices_all")}>All prices</Button>
                </div>
              </Card>
              <Card className="p-8">
                <h2 className="text-xl">Website checks</h2>
                <p className="mt-2 max-w-[60ch] text-[15px] text-muted">Every discount check done on the site (no personal data), for your research report.</p>
                <Button className="mt-6" onClick={exportCsv}><Download className="size-4" aria-hidden /> Download CSV</Button>
              </Card>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}
