import { useEffect, useRef, useState } from "react";
import type React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { api, type ImpulseResult } from "../lib/api";
import { cn } from "../lib/utils";
import { Button, Card, Container, Eyebrow, Notice, Skeleton } from "../components/ui";

type Questions = Record<string, { text: string; options: Record<string, string> }>;

const LEVEL = {
  low: { title: "Looks planned", color: "#6EE7B7", text: "text-genuine" },
  medium: { title: "Pause and compare", color: "#FDBA74", text: "text-inflated-text" },
  high: { title: "High chance of regret", color: "#FCA5A5", text: "text-fake" },
};

function polar(cx: number, cy: number, r: number, pct: number) {
  const a = Math.PI * (1 - pct / 100);
  return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
}
function arc(from: number, to: number, r = 80) {
  const [x1, y1] = polar(100, 100, r, from);
  const [x2, y2] = polar(100, 100, r, to);
  return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
}

function Gauge({ score, level }: { score: number; level: ImpulseResult["level"] }) {
  return (
    <svg viewBox="0 0 200 116" className="w-full max-w-[320px]" role="img" aria-label={`Impulse score ${score} out of 100`}>
      <path d={arc(0, 39.5)} stroke="#6EE7B7" strokeOpacity="0.22" strokeWidth="10" fill="none" />
      <path d={arc(40.5, 69.5)} stroke="#FDBA74" strokeOpacity="0.25" strokeWidth="10" fill="none" />
      <path d={arc(70.5, 100)} stroke="#FCA5A5" strokeOpacity="0.22" strokeWidth="10" fill="none" />
      {score > 0 && <path d={arc(0, Math.max(score, 0.5))} stroke={LEVEL[level].color} strokeWidth="10" strokeLinecap="round" fill="none" className="draw" style={{ "--len": Math.ceil(Math.PI * 80 * Math.max(score, 0.5) / 100) + 2 } as React.CSSProperties} />}
      <text x="100" y="92" textAnchor="middle" className="tabular" style={{ font: "600 40px 'Playfair Display', Georgia, serif", fill: "#E6F4FA" }}>{score}</text>
      <text x="100" y="110" textAnchor="middle" style={{ font: "500 10px Inter, sans-serif", fill: "#93B3C8", letterSpacing: "0.08em" }}>OUT OF 100</text>
    </svg>
  );
}

export default function Quiz() {
  const [questions, setQuestions] = useState<Questions | null>(null);
  const [loadError, setLoadError] = useState("");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImpulseResult | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE ?? ""}/api/meta`).then((r) => r.ok ? r.json() : Promise.reject())
      .then((m) => setQuestions(m.questions)).catch(() => setLoadError("We couldn't load the quiz. Please refresh the page."));
  }, []);
  // Move focus to the new question/result for screen readers, but never on first page load.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    headingRef.current?.focus();
  }, [step, result]);

  if (loadError) return <Container className="py-20"><Notice tone="error">{loadError}</Notice></Container>;
  if (!questions) return <Container className="max-w-2xl py-20"><Skeleton className="h-8 w-1/2" /><Skeleton className="mt-6 h-72" /></Container>;

  const keys = Object.keys(questions);
  const total = keys.length;
  const onConsent = step === total;
  const qKey = keys[step];

  async function submit() {
    setSubmitting(true); setError("");
    try { setResult(await api.impulse(answers, consent)); }
    catch (e) { setError((e as Error).message); }
    finally { setSubmitting(false); }
  }
  function restart() { setAnswers({}); setConsent(false); setStep(0); setResult(null); }

  if (result) {
    const L = LEVEL[result.level];
    return (
      <Container className="max-w-3xl py-14 md:py-20">
        <div className="animate-fade-up">
          <Eyebrow>Your impulse score</Eyebrow>
          <h1 ref={headingRef} tabIndex={-1} className={cn("mt-3 text-4xl outline-none md:text-[44px]", L.text)}>{L.title}</h1>
          <Card className="mt-8 grid items-center gap-8 p-8 md:grid-cols-[320px_1fr]">
            <div className="flex justify-center"><Gauge score={result.score} level={result.level} /></div>
            <div>
              <p className="text-lg text-charcoal">{result.advice}</p>
              <h2 className="mt-6 font-sans text-xs font-semibold uppercase tracking-[0.12em] text-muted">Why we think so</h2>
              <ol className="mt-3 space-y-2.5">
                {result.reasons.map((r, i) => (
                  <li key={r} className="flex gap-3 text-[15px]">
                    <span className="font-serif text-lemon tabular">{i + 1}.</span><span>{r}</span>
                  </li>
                ))}
              </ol>
            </div>
          </Card>
          <p className="mt-4 text-sm text-muted">
            {result.saved ? "Thank you. Your anonymous answers were saved for our research." : "Your answers were not saved."} This is an estimate from a model trained on survey data, not a judgement.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Link to="/check"><Button variant="secondary">Check another product</Button></Link>
            <Link to="/learn" className="text-sm text-lemon underline decoration-lemon/60 underline-offset-4">Read about dark patterns</Link>
            <button onClick={restart} className="text-sm text-muted underline underline-offset-4 cursor-pointer">Retake quiz</button>
          </div>
        </div>
      </Container>
    );
  }

  const pct = Math.round((Math.min(step, total) / total) * 100);

  return (
    <Container className="max-w-3xl py-14 md:py-20">
      <Eyebrow>Impulse quiz</Eyebrow>
      <p className="mt-2 text-[15px] text-muted">Ten quick questions about the purchase you're thinking of making.</p>

      <div className="mt-8">
        <div className="flex justify-between text-xs font-medium text-muted tabular">
          <span>{onConsent ? "Almost done" : `Question ${step + 1} of ${total}`}</span><span>{pct}%</span>
        </div>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-hairline" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={step} aria-label="Quiz progress">
          <div className="h-full bg-lemon transition-[width] duration-200" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <Card className="mt-8 p-6 md:p-10">
        {!onConsent ? (
          <fieldset key={qKey} className="animate-fade-up">
            <legend className="w-full">
              <h1 ref={headingRef} tabIndex={-1} className="text-2xl outline-none md:text-[28px]">{questions[qKey].text}</h1>
            </legend>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {Object.entries(questions[qKey].options).map(([code, label]) => {
                const checked = answers[qKey] === code;
                return (
                  <label key={code}
                    className={cn("flex cursor-pointer items-center gap-3 rounded-sm border px-4 py-3.5 text-[15px] transition-colors",
                      "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-lemon",
                      checked ? "border-ink bg-raised text-ink" : "border-hairline hover:border-[#34548A]")}>
                    <input type="radio" name={qKey} value={code} checked={checked} className="sr-only"
                      onChange={() => setAnswers((a) => ({ ...a, [qKey]: code }))} />
                    <span aria-hidden className={cn("grid size-4 shrink-0 place-items-center rounded-full border", checked ? "border-ink" : "border-[#4E6F9E]")}>
                      {checked && <span className="size-2 rounded-full bg-ink" />}
                    </span>
                    {label}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : (
          <div className="animate-fade-up">
            <h1 ref={headingRef} tabIndex={-1} className="text-2xl outline-none md:text-[28px]">One last thing</h1>
            <p className="mt-3 text-[15px] text-muted">Your answers are anonymous. We don't ask for your name, email or phone number.</p>
            <label className="mt-6 flex cursor-pointer items-start gap-3 text-[15px]">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 size-4 accent-[#E6F4FA]" />
              <span>Allow my anonymous answers to be used for research.</span>
            </label>
            {error && <Notice tone="error" className="mt-6">{error}</Notice>}
          </div>
        )}

        <div className="mt-10 flex items-center justify-between border-t border-hairline pt-6">
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0} aria-label="Previous question">
            <ArrowLeft className="size-4" aria-hidden /> Back
          </Button>
          {!onConsent ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!answers[qKey]}>
              Next <ArrowRight className="size-4" aria-hidden />
            </Button>
          ) : (
            <Button onClick={submit} loading={submitting}>See my result</Button>
          )}
        </div>
      </Card>
    </Container>
  );
}
