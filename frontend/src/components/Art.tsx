/* Original illustrations and motion helpers for DealCheck.
   All artwork is hand-built SVG (no stock images), so it is unique to the project,
   scales perfectly, and respects prefers-reduced-motion via index.css. */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "../lib/utils";

const SILVER = "#A9D6EA"; // glacier blue
const LEMON = "#F4E04D";
const RAISED = "#193260";
const SURFACE = "#12264A";

/* ------------------------------------------------------------ scroll reveal */
export function Reveal({ children, delay = 0, className, as: Tag = "div" }: { children: ReactNode; delay?: number; className?: string; as?: any }) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) { setShown(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref} className={cn("reveal", shown && "is-visible", className)} style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}>
      {children}
    </Tag>
  );
}

/* ------------------------------------------------------------ count up on view */
export function CountUp({ to, className, duration = 1400 }: { to: number; className?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [v, setV] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setV(to); return; }
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / duration);
        setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to, duration]);
  return <span ref={ref} className={className}><span className="sr-only">{to}</span><span aria-hidden>{v}</span></span>;
}

/* ------------------------------------------------------------ sparkle */
export function Sparkle({ className, style, color = LEMON }: { className?: string; style?: CSSProperties; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("animate-twinkle", className)} style={style} aria-hidden>
      <path d="M12 0c.8 6.2 5 10.6 12 12-7 1.4-11.2 5.8-12 12-.8-6.2-5-10.6-12-12C7 10.6 11.2 6.2 12 0z" fill={color} />
    </svg>
  );
}

/* ------------------------------------------------------------ hero illustration */
export function HeroArt() {
  return (
    <div className="relative mx-auto aspect-[10/9] w-full max-w-[520px] select-none" aria-hidden>
      {/* glows */}
      <div className="glow-lemon absolute left-[8%] top-[18%] size-[70%] rounded-full blur-2xl" />
      <div className="glow-glacier absolute right-0 bottom-0 size-[60%] rounded-full" />

      {/* slow orbit rings */}
      <svg viewBox="0 0 400 360" className="absolute inset-0 h-full w-full">
        <g className="animate-spin-slow" style={{ transformOrigin: "200px 180px" }}>
          <circle cx="200" cy="180" r="160" fill="none" stroke={SILVER} strokeOpacity=".12" strokeDasharray="2 9" />
          <circle cx="360" cy="180" r="5" fill={LEMON} />
        </g>
        <circle cx="200" cy="180" r="118" fill="none" stroke={LEMON} strokeOpacity=".18" />
      </svg>

      {/* swinging price tag */}
      <div className="absolute left-[3%] top-[1%] w-[45%] origin-[78%_6%] animate-swing">
        <svg viewBox="0 0 220 250" className="w-full drop-shadow-[0_20px_30px_rgba(0,0,0,.45)]">
          <path d="M171 4 C 190 -10, 205 30, 172 18" fill="none" stroke={SILVER} strokeOpacity=".6" strokeWidth="2" />
          <path d="M120 14 h70 a14 14 0 0 1 14 14 v176 a14 14 0 0 1 -14 14 H34 a14 14 0 0 1 -14 -14 V96 Z" fill={SURFACE} stroke={SILVER} strokeOpacity=".55" strokeWidth="2" />
          <circle cx="172" cy="40" r="9" fill="#0B1A33" stroke={SILVER} strokeOpacity=".7" strokeWidth="2" />
          <text x="44" y="122" fill={SILVER} fillOpacity=".55" style={{ font: "600 16px Inter, sans-serif", letterSpacing: ".14em" }}>MRP</text>
          <text x="44" y="160" fill={SILVER} fillOpacity=".7" style={{ font: "600 38px 'Playfair Display', serif" }}>₹2,000</text>
          <path d="M40 148 L 182 140" stroke="#FCA5A5" strokeWidth="3.5" strokeLinecap="round" className="draw" style={{ "--len": 150, "--delay": ".9s" } as CSSProperties} />
          <text x="44" y="196" fill={SILVER} style={{ font: "600 26px 'Playfair Display', serif" }}>₹800</text>
          <rect x="120" y="178" width="66" height="26" rx="13" fill={LEMON} />
          <text x="153" y="196" textAnchor="middle" fill="#0B1A33" style={{ font: "700 12px Inter, sans-serif" }}>60% OFF</text>
        </svg>
      </div>

      {/* price chart card */}
      <div className="absolute bottom-[0%] right-[0%] w-[60%] animate-float-slow">
        <div className="rounded-[14px] border border-hairline bg-surface/90 p-4 shadow-[0_24px_50px_-20px_rgba(0,0,0,.7)] backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Last 30 days</span>
            <span className="rounded-full bg-raised px-2 py-0.5 text-[10px] font-semibold text-lemon">usual ₹900</span>
          </div>
          <svg viewBox="0 0 260 110" className="mt-2 w-full">
            {[20, 50, 80].map((y) => <line key={y} x1="0" x2="260" y1={y} y2={y} stroke={SILVER} strokeOpacity=".08" />)}
            <line x1="0" x2="260" y1="58" y2="58" stroke={LEMON} strokeDasharray="5 5" strokeWidth="1.5" />
            <path d="M0 62 L22 58 L44 64 L66 55 L88 60 L110 57 L132 26 L154 22 L176 30 L198 24 L216 78 L238 74 L260 76"
              fill="none" stroke={SILVER} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round"
              className="draw" style={{ "--len": 420, "--delay": ".3s" } as CSSProperties} />
            <circle cx="260" cy="76" r="5" fill={LEMON}><animate attributeName="r" values="4;7;4" dur="1.8s" repeatCount="indefinite" /></circle>
            <text x="134" y="16" fill="#FCA5A5" style={{ font: "600 9px Inter, sans-serif" }}>price raised before sale</text>
          </svg>
        </div>
      </div>

      {/* real-discount stamp */}
      <div className="absolute right-[6%] top-[14%] animate-stamp" style={{ animationDelay: "1.6s" }}>
        <div className="grid size-28 place-items-center rounded-full border-2 border-dashed border-lemon bg-ivory/80 text-center backdrop-blur" style={{ transform: "rotate(-6deg)" }}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-lemon">Real</p>
            <p className="font-serif text-3xl leading-none text-ink">11%</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-lemon">off</p>
          </div>
        </div>
      </div>

      <Sparkle className="absolute left-[2%] bottom-[30%] size-5" />
      <Sparkle className="absolute right-[38%] top-[2%] size-4" color={SILVER} style={{ animationDelay: "1s" }} />
      <Sparkle className="absolute right-[2%] top-[52%] size-3" style={{ animationDelay: "2s" }} />
    </div>
  );
}

/* ------------------------------------------------------------ marquee ticker */
const FACTS = [
  "52 of 53 top Indian apps use at least one dark pattern",
  "CCPA banned 13 dark patterns in 2023",
  "Roughly 1 in 5 products got costlier just before festive sales",
  "India's e-commerce market: about US$145 billion",
  "National Consumer Helpline: 1915",
  "Median price, not MRP, is the honest anchor",
];

export function Ticker() {
  const row = (
    <div className="flex shrink-0 items-center">
      {FACTS.map((f) => (
        <span key={f} className="flex items-center whitespace-nowrap px-6 text-sm font-medium text-ink/90">
          <Sparkle className="mr-6 size-3 !animate-none" />{f}
        </span>
      ))}
    </div>
  );
  return (
    <div className="relative overflow-hidden border-y border-hairline bg-deep py-4" aria-label="Key facts">
      <ul className="sr-only">{FACTS.map((f) => <li key={f}>{f}</li>)}</ul>
      <div aria-hidden className="flex w-max animate-marquee hover:[animation-play-state:paused]">{row}{row}</div>
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-deep to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-deep to-transparent" />
    </div>
  );
}

/* ------------------------------------------------------------ step illustrations */
export function StepArt({ step }: { step: 1 | 2 | 3 }) {
  const common = "h-24 w-full transition-transform duration-500 group-hover:scale-105";
  if (step === 1)
    return (
      <svg viewBox="0 0 160 96" className={common} aria-hidden>
        <rect x="14" y="30" width="132" height="36" rx="18" fill={RAISED} stroke={SILVER} strokeOpacity=".35" />
        <text x="28" y="52" fill={SILVER} fillOpacity=".75" style={{ font: "500 10px Inter, sans-serif" }}>amazon.in/dp/…</text>
        <rect x="112" y="36" width="28" height="24" rx="12" fill={LEMON} />
        <path d="M121 48h10m-4-4 4 4-4 4" stroke="#0B1A33" strokeWidth="2" fill="none" strokeLinecap="round" />
        <g className="transition-transform duration-500 group-hover:translate-x-2">
          <path d="M96 62 l0 22 l6-6 l5 10 l4-2 l-5-10 l8 0 z" fill={SILVER} />
        </g>
      </svg>
    );
  if (step === 2)
    return (
      <svg viewBox="0 0 160 96" className={common} aria-hidden>
        {[22, 40, 58, 76, 94, 112, 130].map((x, i) => {
          const h = [30, 34, 28, 52, 56, 26, 30][i];
          return <rect key={x} x={x} y={84 - h} width="12" height={h} rx="3" fill={i === 3 || i === 4 ? "#FCA5A5" : SILVER} fillOpacity={i === 3 || i === 4 ? 0.9 : 0.35} />;
        })}
        <line x1="14" x2="148" y1="54" y2="54" stroke={LEMON} strokeDasharray="4 4" strokeWidth="1.5" />
        <g className="origin-[60px_40px] transition-transform duration-500 group-hover:-rotate-12">
          <circle cx="60" cy="38" r="20" fill="none" stroke={LEMON} strokeWidth="3" />
          <path d="M74 52 l14 14" stroke={LEMON} strokeWidth="5" strokeLinecap="round" />
        </g>
      </svg>
    );
  return (
    <svg viewBox="0 0 160 96" className={common} aria-hidden>
      <g className="origin-center transition-transform duration-700 group-hover:rotate-[20deg]" style={{ transformOrigin: "80px 48px" }}>
        {Array.from({ length: 16 }).map((_, i) => {
          const a = (i / 16) * Math.PI * 2;
          return <line key={i} x1={80 + Math.cos(a) * 34} y1={48 + Math.sin(a) * 34} x2={80 + Math.cos(a) * 42} y2={48 + Math.sin(a) * 42} stroke={LEMON} strokeWidth="3" strokeLinecap="round" />;
        })}
      </g>
      <circle cx="80" cy="48" r="28" fill={RAISED} stroke={SILVER} strokeOpacity=".5" />
      <path d="M68 49 l8 8 l16-17" stroke="#6EE7B7" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ------------------------------------------------------------ feature card art */
export function FeatureArt({ kind }: { kind: "check" | "quiz" | "learn" }) {
  const cls = "h-28 w-full";
  if (kind === "check")
    return (
      <svg viewBox="0 0 220 110" className={cls} aria-hidden>
        <rect x="10" y="10" width="200" height="90" rx="12" fill={RAISED} />
        <path d="M24 70 L50 64 L76 68 L102 40 L128 36 L154 74 L180 70 L196 72" fill="none" stroke={SILVER} strokeWidth="2.2" strokeLinejoin="round" />
        <line x1="24" x2="196" y1="62" y2="62" stroke={LEMON} strokeDasharray="4 4" />
        <rect x="140" y="20" width="58" height="20" rx="10" fill={LEMON} />
        <text x="169" y="34" textAnchor="middle" fill="#0B1A33" style={{ font: "700 10px Inter, sans-serif" }}>DDI 48.9</text>
      </svg>
    );
  if (kind === "quiz")
    return (
      <svg viewBox="0 0 220 110" className={cls} aria-hidden>
        <rect x="10" y="10" width="200" height="90" rx="12" fill={RAISED} />
        <path d="M60 86 A50 50 0 0 1 160 86" fill="none" stroke={SILVER} strokeOpacity=".2" strokeWidth="10" strokeLinecap="round" />
        <path d="M60 86 A50 50 0 0 1 148 58" fill="none" stroke={LEMON} strokeWidth="10" strokeLinecap="round" />
        <text x="110" y="84" textAnchor="middle" fill={SILVER} style={{ font: "600 26px 'Playfair Display', serif" }}>72</text>
      </svg>
    );
  return (
    <svg viewBox="0 0 220 110" className={cls} aria-hidden>
      <rect x="10" y="10" width="200" height="90" rx="12" fill={RAISED} />
      <rect x="34" y="30" width="72" height="50" rx="8" fill={SURFACE} stroke={SILVER} strokeOpacity=".3" />
      <text x="70" y="52" textAnchor="middle" fill="#FCA5A5" style={{ font: "700 13px Inter, sans-serif" }}>09:59</text>
      <text x="70" y="68" textAnchor="middle" fill={SILVER} fillOpacity=".6" style={{ font: "500 8px Inter, sans-serif" }}>deal ends soon!</text>
      <circle cx="150" cy="55" r="26" fill="none" stroke={LEMON} strokeWidth="3" />
      <path d="M134 55 q16 -16 32 0 q-16 16 -32 0z" fill="none" stroke={SILVER} strokeWidth="2" />
      <circle cx="150" cy="55" r="5" fill={LEMON} />
    </svg>
  );
}

/* ------------------------------------------------------------ section background decoration */
export function Backdrop({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div className="bg-dots absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      <div className="glow-glacier absolute -left-40 -top-40 size-[520px] rounded-full" />
      <div className="glow-lemon absolute -right-32 top-1/3 size-[380px] rounded-full opacity-60" />
    </div>
  );
}
