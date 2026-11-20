import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Container } from "./ui";
import { cn } from "../lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("inline-flex items-center gap-2.5", "text-ink", className)} aria-label="DealCheck home">
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <circle cx="16" cy="16" r="14" fill="none" stroke="#F4E04D" strokeWidth="1.8" />
        <circle cx="16" cy="16" r="11" fill="none" stroke="#F4E04D" strokeWidth="0.6" opacity="0.6" />
        <path d="M10.5 16.5l3.8 3.8 7.4-8.3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="font-serif text-[22px] font-semibold tracking-tight">DealCheck</span>
    </Link>
  );
}

const NAV = [
  { to: "/", label: "Home", end: true },
  { to: "/check", label: "Check Discount" },
  { to: "/quiz", label: "Impulse Quiz" },
  { to: "/learn", label: "Learn" },
  { to: "/about", label: "About" },
];

function Navbar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    cn("relative py-1 text-sm font-medium transition-colors",
      isActive ? "text-ink after:absolute after:-bottom-[21px] after:left-0 after:h-px after:w-full after:bg-lemon" : "text-muted hover:text-ink");

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-ivory/80 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={linkCls}>{n.label}</NavLink>
          ))}
        </nav>
        <button
          className="inline-flex size-10 items-center justify-center rounded-sm text-ink md:hidden"
          aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-nav"
          onClick={() => setOpen((o) => !o)}>
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </Container>
      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="animate-fade-up border-t border-hairline bg-ivory md:hidden">
          <Container className="flex flex-col py-2">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}
                className={({ isActive }) => cn("border-b border-hairline py-3.5 text-[15px] last:border-0", isActive ? "text-ink font-medium" : "text-muted")}>
                {n.label}
              </NavLink>
            ))}
          </Container>
        </nav>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden border-t border-hairline bg-deep text-silver-soft">
      <p aria-hidden className="pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2 select-none whitespace-nowrap font-serif text-[22vw] font-semibold leading-none text-ink/[0.035] md:text-[180px]">DealCheck</p>
      <Container className="relative grid gap-10 py-16 text-sm text-silver-soft md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 font-serif text-base italic text-lemon">Know the real price.</p>
          <p className="mt-4 max-w-sm">
            For awareness and research only. Not financial advice. Not affiliated with Amazon, Flipkart or Myntra.
          </p>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-lemon">Project team</p>
          <ul className="space-y-1">
            <li>Nikitha Dayanand</li><li>Kriti Agarwal</li><li>Maanya Singh</li><li>Laavanya Singh Rathor</li>
          </ul>
          <p className="mt-3">Guide: Dr C Bindu Ashwini, Dept. of IEM</p>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-lemon">RV College of Engineering</p>
          <p>Principles of Management &amp; Economics<br />Experiential Learning, Bengaluru</p>
          <p className="mt-3">National Consumer Helpline: <a className="text-ink underline decoration-lemon underline-offset-4" href="tel:1915">1915</a></p>
        </div>
      </Container>
    </footer>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-surface focus:px-3 focus:py-2">Skip to content</a>
      <Navbar />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-20 overflow-hidden">
        <div className="glow-glacier absolute -left-48 -top-48 size-[640px] rounded-full" />
        <div className="glow-lemon absolute -right-40 top-[40%] size-[420px] rounded-full opacity-40" />
        <div className="bg-dots absolute inset-0 opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />
      </div>
      <main id="main" className="relative flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
