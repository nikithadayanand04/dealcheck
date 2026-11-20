import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Check, ClipboardCopy, MousePointerClick, ShieldCheck, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { buildBookmarklet } from "../lib/bookmarklet";
import { Button, Card, Container, Eyebrow } from "../components/ui";
import { Reveal, Sparkle } from "../components/Art";

export default function ButtonPage() {
  const code = buildBookmarklet(window.location.origin);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [copied, setCopied] = useState(false);

  // React blocks "javascript:" links in JSX, so the bookmark link's address is set directly on the element.
  useEffect(() => { linkRef.current?.setAttribute("href", code); }, [code]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Button code copied");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Couldn't copy automatically. Select the code below and copy it.");
    }
  }

  return (
    <Container className="py-14 md:py-20">
      <div className="relative max-w-2xl">
        <Sparkle className="absolute -right-8 top-0 size-6" />
        <Eyebrow>The DealCheck button</Eyebrow>
        <h1 className="mt-3 text-4xl md:text-[52px]">Check any product <span className="italic text-shimmer">in one click</span></h1>
        <p className="mt-4 text-[17px] text-charcoal">
          Add the DealCheck button to your browser's bookmarks bar. On any Amazon.in, Flipkart or Myntra product page,
          click it: it reads the price and MRP shown on that page and opens DealCheck with them filled in.
        </p>
      </div>

      {/* Drag target */}
      <Reveal className="mt-10">
        <Card className="relative overflow-hidden p-8 md:p-10">
          <div aria-hidden className="glow-lemon pointer-events-none absolute -right-20 -top-20 size-72 rounded-full" />
          <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl">1. Drag this button to your bookmarks bar</h2>
              <p className="mt-2 max-w-[56ch] text-[15px] text-muted">
                Can't see the bookmarks bar? Press <kbd className="rounded border border-hairline bg-raised px-1.5 py-0.5 text-xs text-ink">Ctrl</kbd>+<kbd className="rounded border border-hairline bg-raised px-1.5 py-0.5 text-xs text-ink">Shift</kbd>+<kbd className="rounded border border-hairline bg-raised px-1.5 py-0.5 text-xs text-ink">B</kbd> (on a Mac, <kbd className="rounded border border-hairline bg-raised px-1.5 py-0.5 text-xs text-ink">⌘</kbd>+<kbd className="rounded border border-hairline bg-raised px-1.5 py-0.5 text-xs text-ink">Shift</kbd>+<kbd className="rounded border border-hairline bg-raised px-1.5 py-0.5 text-xs text-ink">B</kbd>).
              </p>
            </div>
            <a ref={linkRef} onClick={(e) => { e.preventDefault(); toast("Drag the button to your bookmarks bar, then click it on a product page."); }}
              className="group inline-flex shrink-0 cursor-grab items-center gap-2.5 rounded-full border-2 border-dashed border-lemon bg-lemon px-6 py-3.5 text-[15px] font-bold text-ivory shadow-[0_10px_30px_-10px_rgba(244,224,77,.7)] active:cursor-grabbing"
              title="Drag me to your bookmarks bar">
              <Bookmark className="size-4" aria-hidden /> DealCheck it
            </a>
          </div>
        </Card>
      </Reveal>

      {/* Steps */}
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {[
          { icon: Bookmark, t: "2. Open a product page", d: "Any product on amazon.in, flipkart.com or myntra.com. Use the full product page, not search results." },
          { icon: MousePointerClick, t: "3. Click \"DealCheck it\"", d: "A DealCheck tab opens showing the name, price and MRP it read. Fix anything that looks wrong and press Check." },
          { icon: Check, t: "4. Get your verdict", d: "You see the advertised discount straight away. Each check is saved, so after 5 days of prices you get a full verdict." },
        ].map((s, i) => (
          <Reveal key={s.t} delay={i * 100}>
            <Card className="lift h-full p-6">
              <span className="grid size-11 place-items-center rounded-full border border-glacier/50 bg-raised"><s.icon className="size-5 text-glacier" aria-hidden /></span>
              <h3 className="mt-4 text-lg">{s.t}</h3>
              <p className="mt-2 text-[15px] text-muted">{s.d}</p>
            </Card>
          </Reveal>
        ))}
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {/* Mobile / manual install */}
        <Card className="p-6 md:p-8">
          <div className="flex items-center gap-3"><Smartphone className="size-5 text-glacier" aria-hidden /><h2 className="text-xl">Can't drag? (phones, some browsers)</h2></div>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-[15px] text-charcoal">
            <li>Copy the button code below.</li>
            <li>Bookmark any page, then edit that bookmark.</li>
            <li>Name it <span className="font-semibold text-ink">DealCheck it</span> and paste the code as its address (URL).</li>
            <li>On a product page, open your bookmarks and tap it.</li>
          </ol>
          <Button variant="secondary" className="mt-5" onClick={copy}>
            {copied ? <Check className="size-4" aria-hidden /> : <ClipboardCopy className="size-4" aria-hidden />} {copied ? "Copied" : "Copy button code"}
          </Button>
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-muted">Show the code</summary>
            <textarea readOnly value={code} rows={5} aria-label="Button code"
              className="mt-2 w-full rounded-sm border border-hairline bg-deep p-3 font-mono text-xs text-muted" onFocus={(e) => e.currentTarget.select()} />
          </details>
        </Card>

        {/* Privacy */}
        <Card className="p-6 md:p-8">
          <div className="flex items-center gap-3"><ShieldCheck className="size-5 text-genuine" aria-hidden /><h2 className="text-xl">What it does, and doesn't</h2></div>
          <ul className="mt-4 space-y-2 text-[15px] text-charcoal">
            <li>✓ Reads only the product name, price and MRP from the page you are looking at.</li>
            <li>✓ Runs only when you click it, in your own browser.</li>
            <li>✓ You confirm the numbers before anything is saved.</li>
            <li>✗ No login details, cart, address or browsing history are read.</li>
            <li>✗ No bot visits the shop and nothing is downloaded from it.</li>
          </ul>
          <p className="mt-4 text-sm text-muted">Shops change their pages often. If the button misreads a price, just correct it on the confirm screen.</p>
        </Card>
      </div>

      <p className="mt-10 text-sm text-muted">
        Don't want a button? You can still <Link to="/check?mode=manual" className="text-lemon underline decoration-lemon/50 underline-offset-4">enter prices manually</Link>.
      </p>
    </Container>
  );
}
