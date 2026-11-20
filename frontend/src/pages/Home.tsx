import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button, Container, Eyebrow, FieldError, Input } from "../components/ui";
import { Backdrop, CountUp, FeatureArt, HeroArt, Reveal, Sparkle, StepArt, Ticker } from "../components/Art";

export default function Home() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!url.trim()) return setError("Please paste a product link.");
    navigate(`/check?url=${encodeURIComponent(url.trim())}`);
  }

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <Backdrop className="-z-10" />
        <Container className="grid items-center gap-12 py-16 md:grid-cols-[1.1fr_1fr] md:py-24">
          <div>
            <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-hairline bg-surface/70 px-3 py-1.5 text-xs font-medium text-charcoal backdrop-blur">
              <ShieldCheck className="size-3.5 text-lemon" aria-hidden /> Consumer price check · India
            </div>
            <h1 className="animate-fade-up mt-6 text-[40px] leading-[1.05] sm:text-6xl md:text-[68px]" style={{ animationDelay: "80ms" }}>
              Is that sale<br />
              <span className="italic text-shimmer">really</span> a sale?
            </h1>
            <p className="animate-fade-up mt-6 max-w-[50ch] text-[17px] text-charcoal" style={{ animationDelay: "160ms" }}>
              Paste a product link from Amazon, Flipkart or Myntra. We compare the advertised discount with the product's
              real price over the last 30 days, and tell you plainly what you're saving.
            </p>
            <form onSubmit={submit} className="animate-fade-up mt-8 max-w-xl" style={{ animationDelay: "240ms" }} noValidate>
              <label htmlFor="hero-url" className="sr-only">Product link</label>
              <div className="flex flex-col gap-3 rounded-[14px] border border-hairline bg-surface/80 p-2 shadow-[0_20px_50px_-25px_rgba(0,0,0,.8)] backdrop-blur sm:flex-row">
                <Input id="hero-url" type="url" inputMode="url" placeholder="Paste product link (Amazon / Flipkart / Myntra)"
                  value={url} onChange={(e) => { setUrl(e.target.value); setError(""); }}
                  invalid={!!error} aria-describedby={error ? "hero-url-err" : undefined} className="h-12 border-transparent bg-transparent" />
                <Button type="submit" size="lg" className="shrink-0">Check <ArrowRight className="size-4" aria-hidden /></Button>
              </div>
              <FieldError id="hero-url-err">{error}</FieldError>
            </form>
            <p className="animate-fade-up mt-4 text-sm text-muted" style={{ animationDelay: "320ms" }}>
              No link? <Link to="/check?mode=manual" className="text-lemon underline decoration-lemon/50 underline-offset-4 hover:decoration-lemon">Enter prices manually</Link>
            </p>
          </div>
          <div className="animate-fade-up" style={{ animationDelay: "200ms" }}>
            <HeroArt />
          </div>
        </Container>
      </section>

      <Ticker />

      {/* How it works */}
      <section aria-labelledby="how-title" className="relative">
        <Container className="py-20 md:py-28">
          <Reveal>
            <Eyebrow>How it works</Eyebrow>
            <h2 id="how-title" className="mt-3 text-4xl md:text-5xl">Three steps, <span className="italic text-lemon">one honest answer</span></h2>
          </Reveal>
          <ol className="mt-14 grid gap-6 md:grid-cols-3">
            {([
              [1, "01", "Paste a link", "Or type the MRP and sale price you see. No sign-up, nothing stored about you."],
              [2, "02", "We check 30 days of prices", "We find the product's usual (median) price and compare it with the discount on the banner."],
              [3, "03", "Get a clear verdict", "Genuine, slightly inflated or misleading, with the real saving in rupees and whether to wait."],
            ] as const).map(([k, n, t, d], i) => (
              <Reveal as="li" key={n} delay={i * 120} className="group lift relative rounded-[14px] border border-hairline bg-surface p-7">
                <span className="absolute right-6 top-5 font-serif text-5xl text-ink/10 tabular">{n}</span>
                <StepArt step={k} />
                <h3 className="mt-5 text-xl">{t}</h3>
                <p className="mt-2 text-[15px] text-muted">{d}</p>
              </Reveal>
            ))}
          </ol>
        </Container>
      </section>

      {/* Big stat */}
      <section className="relative isolate overflow-hidden bg-ink">
        <div aria-hidden className="pointer-events-none absolute -right-28 -top-28 size-80 rounded-full border border-lemon-deep/30" />
        <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full border border-lemon-deep/30" />
        <Sparkle className="absolute left-[46%] top-8 size-5" color="#5E5300" />
        <Container className="relative grid items-center gap-8 py-16 md:grid-cols-[auto_1fr] md:gap-16">
          <Reveal>
            <p className="font-serif text-7xl text-ivory tabular md:text-[104px] leading-none">
              <CountUp to={52} /> <span className="text-4xl text-lemon-deep md:text-5xl">of 53</span>
            </p>
          </Reveal>
          <Reveal delay={150}>
            <div aria-hidden className="mb-4 h-1 w-14 rounded-full bg-lemon" />
            <p className="max-w-[52ch] text-xl text-ivory">
              top Indian shopping and service apps were found using at least one deceptive design pattern.
            </p>
            <p className="mt-3 text-sm font-medium text-lemon-deep">Source: ASCI Academy &amp; Parallel HQ, "Conscious Patterns" report, 2024</p>
          </Reveal>
        </Container>
      </section>

      {/* Features */}
      <section aria-labelledby="features-title" className="relative isolate">
        <Backdrop className="-z-10 opacity-70" />
        <Container className="py-20 md:py-28">
          <Reveal>
            <Eyebrow>What you can do</Eyebrow>
            <h2 id="features-title" className="mt-3 text-4xl md:text-5xl">Shop with a clear head</h2>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {([
              { k: "check", t: "Check a discount", d: "See the advertised discount next to the real one, the Discount Deception Index, and a 90-day price chart.", to: "/check", cta: "Check now" },
              { k: "quiz", t: "Take the impulse quiz", d: "Ten quick questions. Our model estimates how likely this is an impulse buy, and tells you why.", to: "/quiz", cta: "Start quiz" },
              { k: "learn", t: "Learn the tricks", d: "Eight common dark patterns, such as false urgency and drip pricing, explained with everyday examples.", to: "/learn", cta: "Read more" },
            ] as const).map((f, i) => (
              <Reveal key={f.t} delay={i * 120} className="lift flex flex-col rounded-[14px] border border-hairline bg-surface p-6">
                <FeatureArt kind={f.k} />
                <h3 className="mt-5 text-xl">{f.t}</h3>
                <p className="mt-2 flex-1 text-[15px] text-muted">{f.d}</p>
                <Link to={f.to} className="group mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-lemon">
                  {f.cta} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* Closing CTA */}
      <section className="relative isolate overflow-hidden">
        <Container className="pb-8">
          <Reveal className="relative overflow-hidden rounded-[20px] border border-hairline bg-surface px-8 py-14 text-center md:px-16">
            <div aria-hidden className="glow-lemon absolute -top-24 left-1/2 size-80 -translate-x-1/2 rounded-full" />
            <Sparkle className="absolute left-10 top-10 size-5" />
            <Sparkle className="absolute bottom-10 right-12 size-4" color="#E6F4FA" style={{ animationDelay: "1.2s" }} />
            <h2 className="relative text-3xl md:text-[42px]">Before you tap <span className="italic text-lemon">"Buy now"</span>, take ten seconds.</h2>
            <p className="relative mx-auto mt-4 max-w-[52ch] text-charcoal">Check the real price. Ask yourself if you planned this. Your wallet will thank you after the sale.</p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/check"><Button size="lg">Check a discount <ArrowRight className="size-4" aria-hidden /></Button></Link>
              <Link to="/quiz"><Button size="lg" variant="secondary">Take the impulse quiz</Button></Link>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
