import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "../../lib/utils";

/* Buttons ------------------------------------------------------------------ */
type Variant = "primary" | "secondary" | "ghost" | "link";
const variants: Record<Variant, string> = {
  primary: "bg-lemon text-ivory font-semibold hover:bg-lemon-hover border border-lemon shadow-[0_8px_24px_-10px_rgba(244,224,77,.6)]",
  secondary: "bg-transparent text-ink border border-ink/50 hover:border-lemon hover:text-lemon",
  ghost: "bg-transparent text-ink border border-transparent hover:bg-raised",
  link: "bg-transparent text-lemon underline underline-offset-4 decoration-lemon/60 hover:decoration-lemon px-0 h-auto",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "md" | "lg" | "sm";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, className, children, disabled, ...props }, ref) {
  const sizes = { sm: "h-9 px-3 text-sm", md: "h-11 px-5 text-sm", lg: "h-12 px-6 text-[15px]" };
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-sm font-medium tracking-[0.01em] transition-colors duration-150",
        "disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer",
        variant !== "link" && sizes[size],
        variants[variant],
        className,
      )}
      {...props}
    >
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

/* Card --------------------------------------------------------------------- */
export function Card({ className, children, as: Tag = "div" }: { className?: string; children: ReactNode; as?: any }) {
  return <Tag className={cn("rounded-md border border-hairline bg-surface", className)}>{children}</Tag>;
}

/* Eyebrow + section heading -------------------------------------------------- */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-xs font-semibold uppercase tracking-[0.14em] text-glacier", className)}>{children}</p>;
}

export function Rule({ className }: { className?: string }) {
  return <div aria-hidden className={cn("h-px w-12 bg-lemon", className)} />;
}

/* Form fields ---------------------------------------------------------------- */
export function Label({ htmlFor, children, optional }: { htmlFor: string; children: ReactNode; optional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink">
      {children}
      {optional && <span className="ml-1 font-normal text-muted">(optional)</span>}
    </label>
  );
}

const fieldBase =
  "w-full h-11 scroll-mt-28 rounded-sm border bg-surface px-3 text-[15px] text-charcoal placeholder:text-muted/80 transition-colors " +
  "focus:outline-none focus-visible:outline-2 focus-visible:outline-lemon focus-visible:outline-offset-0";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...props }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(fieldBase, invalid ? "border-fake" : "border-hairline hover:border-[#34548A]", className)}
        {...props}
      />
    );
  },
);

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldBase, "border-hairline hover:border-[#34548A] appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9", className)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236B6B6B' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
      {...props}>
      {children}
    </select>
  );
}

export function FieldError({ id, children }: { id: string; children?: ReactNode }) {
  if (!children) return null;
  return <p id={id} role="alert" className="mt-1.5 text-sm text-fake">{children}</p>;
}

/* Feedback ----------------------------------------------------------------- */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-sm bg-[#17305A]", className)} />;
}

export function Notice({ tone = "neutral", children, className }: { tone?: "neutral" | "error"; children: ReactNode; className?: string }) {
  return (
    <div role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-md border-l-4 bg-surface px-4 py-3 text-[15px]",
        tone === "error" ? "border-fake text-charcoal" : "border-lemon text-charcoal", className)}>
      {children}
    </div>
  );
}

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-[1120px] px-5 sm:px-8", className)}>{children}</div>;
}
