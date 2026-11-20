import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const formatINR = (n: number | null | undefined) => (n == null ? "—" : inr.format(Math.round(n)));
export const formatPct = (n: number | null | undefined) => (n == null ? "—" : `${n.toFixed(1)}%`);

export const PLATFORM_LABEL: Record<string, string> = { amazon: "Amazon", flipkart: "Flipkart", myntra: "Myntra", other: "Other" };
export const PLATFORMS = ["amazon", "flipkart", "myntra", "other"];
export const CATEGORIES = ["Electronics", "Fashion", "Home", "Beauty", "Books", "Others"];

export function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
