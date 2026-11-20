import { Link } from "react-router-dom";
import { Button, Container, Eyebrow } from "../components/ui";
import { Sparkle } from "../components/Art";

export default function NotFound() {
  return (
    <Container className="relative py-24 text-center md:py-32">
      <svg viewBox="0 0 220 200" className="mx-auto w-48 origin-[60%_8%] animate-swing" aria-hidden>
        <path d="M130 6 C 150 -8, 165 30, 132 20" fill="none" stroke="#E6F4FA" strokeOpacity=".5" strokeWidth="2" />
        <path d="M84 16 h62 a12 12 0 0 1 12 12 v140 a12 12 0 0 1 -12 12 H34 a12 12 0 0 1 -12 -12 V78 Z" fill="#12264A" stroke="#E6F4FA" strokeOpacity=".5" strokeWidth="2" />
        <circle cx="132" cy="40" r="8" fill="#0B1A33" stroke="#E6F4FA" strokeOpacity=".6" strokeWidth="2" />
        <text x="90" y="128" textAnchor="middle" fill="#F4E04D" style={{ font: "600 46px 'Playfair Display', serif" }}>404</text>
        <text x="90" y="152" textAnchor="middle" fill="#93B3C8" style={{ font: "600 10px Inter, sans-serif", letterSpacing: ".18em" }}>SOLD OUT</text>
      </svg>
      <Sparkle className="absolute left-[30%] top-20 size-5" />
      <Sparkle className="absolute right-[30%] top-40 size-4" color="#E6F4FA" style={{ animationDelay: "1s" }} />
      <Eyebrow className="mt-8">Error 404</Eyebrow>
      <h1 className="mt-4 text-4xl md:text-5xl">This page isn't on sale.</h1>
      <p className="mt-4 text-[17px] text-muted">We couldn't find the page you were looking for.</p>
      <Link to="/" className="mt-8 inline-block"><Button size="lg">Back to home</Button></Link>
    </Container>
  );
}
