import { useEffect, useState } from "react";
import { ChevronDown, Droplets, EyeOff, Frown, Lock, MousePointerClick, Phone, Repeat, ShoppingCart, Shuffle, Timer } from "lucide-react";
import { Reveal, Sparkle } from "../components/Art";
import { api, type LearnContent } from "../lib/api";
import { Card, Container, Eyebrow, Notice, Rule, Skeleton } from "../components/ui";

const ICONS: Record<string, typeof Timer> = {
  "false-urgency": Timer, "basket-sneaking": ShoppingCart, "confirm-shaming": Frown, "forced-action": Lock,
  "subscription-trap": Repeat, "interface-interference": MousePointerClick, "bait-and-switch": Shuffle, "drip-pricing": Droplets,
};

export default function Learn() {
  const [data, setData] = useState<LearnContent | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { api.learn().then(setData).catch((e) => setError(e.message)); }, []);

  return (
    <Container className="py-14 md:py-20">
      <div className="relative max-w-2xl">
        <Sparkle className="absolute -right-10 top-2 size-6" />
        <Eyebrow>Learn</Eyebrow>
        <h1 className="mt-3 text-4xl md:text-[52px]">How online sales <span className="italic text-shimmer">nudge</span> you</h1>
        <p className="mt-4 text-[17px] text-charcoal/90">
          "Dark patterns" are design tricks that push you into decisions you might not otherwise make. India's
          Central Consumer Protection Authority listed 13 of them in its 2023 guidelines. Here are eight you'll meet
          most often while shopping.
        </p>
      </div>

      {error && <Notice tone="error" className="mt-10">{error}</Notice>}
      {!data && !error && <div className="mt-10 grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36" />)}</div>}

      {data && (
        <>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {data.patterns.map((p, i) => {
              const Icon = ICONS[p.id] ?? EyeOff;
              return (
              <Reveal key={p.id} delay={(i % 2) * 100}>
              <Card className="lift h-full p-6">
                <div className="flex items-center gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-full border border-glacier/50 bg-raised">
                    <Icon className="size-5 text-glacier" aria-hidden />
                  </span>
                  <div>
                    <span className="font-serif text-xs text-muted tabular">{String(i + 1).padStart(2, "0")}</span>
                    <h2 className="text-xl">{p.title}</h2>
                  </div>
                </div>
                <p className="mt-2 text-[15px] text-charcoal">{p.definition}</p>
                <details className="group mt-4 border-t border-hairline pt-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
                    Example
                    <ChevronDown className="size-4 text-muted transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="mt-2 text-[15px] text-muted">{p.example}</p>
                </details>
              </Card>
              </Reveal>
            ); })}
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-[1.5fr_1fr]">
            <Card className="p-8">
              <Rule />
              <h2 className="mt-5 text-2xl">{data.anchoring.title}</h2>
              <p className="mt-3 max-w-[68ch] text-[16px] text-charcoal">{data.anchoring.text}</p>
            </Card>
            <Card className="border-l-4 border-l-lemon p-8">
              <h2 className="text-2xl">Were you misled?</h2>
              <p className="mt-3 text-[15px] text-charcoal">{data.complaint.text}</p>
              <a href={`tel:${data.complaint.helpline}`} className="mt-5 inline-flex items-center gap-2 font-serif text-3xl text-ink tabular">
                <Phone className="size-5 text-lemon" aria-hidden /> {data.complaint.helpline}
              </a>
              <p className="mt-3 text-sm">
                <a href={data.complaint.portal} target="_blank" rel="noopener noreferrer" className="text-lemon underline decoration-lemon/60 underline-offset-4">consumerhelpline.gov.in</a>
              </p>
            </Card>
          </div>
        </>
      )}
    </Container>
  );
}
