const BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") ?? "";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}, token?: string | null): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (init.body && !(init.body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers });
  } catch {
    throw new ApiError("We couldn't reach the server. Check your internet connection and try again.", 0);
  }
  if (!res.ok) {
    let msg = "Something went wrong on our side. Please try again.";
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch { /* non-JSON error */ }
    throw new ApiError(msg, res.status);
  }
  const type = res.headers.get("content-type") ?? "";
  return (type.includes("application/json") ? res.json() : res.blob()) as Promise<T>;
}

export type Verdict = "genuine" | "inflated" | "fake" | "insufficient";

export interface CheckResult {
  status: "ok";
  mode: "link" | "manual";
  product: { name: string | null; platform: string | null; category: string | null; product_id: string | null };
  mrp: number;
  sale_price: number;
  m30: number | null;
  min90: number;
  advertised_discount: number;
  real_discount: number | null;
  ddi: number | null;
  points_30d: number;
  verdict: Verdict;
  confidence: "high" | "medium" | "low" | "insufficient";
  explanation: string;
  price_date: string;
  history: { date: string; price: number }[];
  drop_probability: number | null;
  suggestion: "wait" | "buy" | null;
  drop_note: string | null;
}

export interface NotFound {
  status: "not_found";
  platform: string;
  product_id: string;
  message: string;
}

export interface ManualInput {
  name?: string;
  platform: string;
  category: string;
  mrp: number;
  sale_price: number;
  advertised_pct?: number;
  platform_product_id?: string;
  past_prices: { date: string; price: number }[];
}

export interface ImpulseResult {
  score: number;
  level: "low" | "medium" | "high";
  advice: string;
  reasons: string[];
  saved: boolean;
}

export interface LearnContent {
  patterns: { id: string; title: string; definition: string; example: string }[];
  anchoring: { title: string; text: string };
  complaint: { helpline: string; portal: string; text: string };
}

export interface ModelVersion {
  id: number;
  model_name: "impulse" | "price_drop";
  algorithm: string;
  is_active: boolean;
  trained_at: string;
  metrics: Record<string, any>;
}

export interface UploadReport {
  rows_added: number;
  rows_updated?: number;
  rows_rejected: number;
  rejected: { row: number; reason: string }[];
}

export const api = {
  checkLink: (url: string) =>
    request<CheckResult | NotFound>("/api/check/link", { method: "POST", body: JSON.stringify({ url }) }),
  checkManual: (input: ManualInput) =>
    request<CheckResult>("/api/check/manual", { method: "POST", body: JSON.stringify(input) }),
  impulse: (answers: Record<string, string>, consent: boolean) =>
    request<ImpulseResult>("/api/impulse", { method: "POST", body: JSON.stringify({ ...answers, consent }) }),
  learn: () => request<LearnContent>("/api/learn"),
  login: (password: string) =>
    request<{ token: string; expires_in: number }>("/api/admin/login", { method: "POST", body: JSON.stringify({ password }) }),
  analytics: (t: string) => request<any>("/api/admin/analytics", {}, t),
  models: (t: string) => request<ModelVersion[]>("/api/admin/models", {}, t),
  retrain: (t: string, model: string) =>
    request<ModelVersion>("/api/admin/retrain", { method: "POST", body: JSON.stringify({ model }) }, t),
  activate: (t: string, version_id: number) =>
    request<ModelVersion>("/api/admin/activate-model", { method: "POST", body: JSON.stringify({ version_id }) }, t),
  upload: (t: string, kind: "prices" | "survey", file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return request<UploadReport>(`/api/admin/upload/${kind}`, { method: "POST", body: fd }, t);
  },
  exportChecks: (t: string) => request<Blob>("/api/admin/export", {}, t),
};
