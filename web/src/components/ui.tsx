import { X } from "lucide-react";
import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link, type LinkProps } from "react-router";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
export { cx };

type Variant = "primary" | "secondary" | "ghost" | "danger";
const variants: Record<Variant, string> = {
  primary: "bg-brand text-brand-ink hover:bg-brand-strong shadow-sm",
  secondary: "bg-surface text-ink border border-line hover:bg-surface-2",
  ghost: "text-brand hover:bg-brand-soft",
  danger: "bg-bad text-white hover:opacity-90",
};
const base = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none";

export function Button({ variant = "primary", className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type="button" className={cx(base, variants[variant], className)} {...props} />;
}
export function LinkButton({ variant = "primary", className, ...props }: LinkProps & { variant?: Variant }) {
  return <Link className={cx(base, variants[variant], className)} {...props} />;
}
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("rounded-2xl border border-line bg-surface p-5", className)}>{children}</div>;
}
export function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={selected} onClick={onClick}
      className={cx("rounded-full border px-3.5 py-1.5 text-sm transition-colors", selected ? "border-brand bg-brand-soft font-semibold text-brand-strong" : "border-line bg-surface text-ink hover:bg-surface-2")}>
      {children}
    </button>
  );
}
export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-4 py-3">
      <div className="text-2xl font-bold text-brand">{value}</div>
      <div className="text-xs font-medium text-muted">{label}</div>
    </div>
  );
}
export function Bar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cx("h-2 overflow-hidden rounded-full bg-surface-3", className)} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
      <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}
export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-6">
      {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent">{eyebrow}</p>}
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      {children && <div className="mt-2 max-w-2xl text-muted">{children}</div>}
    </header>
  );
}
export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <div className="mb-3 mt-8 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">{children}</h2>{action}</div>;
}
export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "bad"; children: ReactNode }) {
  const t = { info: "bg-brand-soft text-ink", warn: "bg-accent-soft text-ink", bad: "bg-bad-soft text-ink" }[tone];
  return <div className={cx("rounded-xl px-4 py-3 text-sm", t)} role={tone === "bad" ? "alert" : "status"}>{children}</div>;
}

/** Accessible modal dialog built on <dialog>. */
export function Dialog({ open, onClose, title, children, actions }: { open: boolean; onClose: () => void; title: string; children: ReactNode; actions?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) d.showModal(); if (!open && d.open) d.close(); }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} onClick={e => { if (e.target === ref.current) onClose(); }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-black/40">
      <div className="p-5">
        <div className="mb-3 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-surface-2" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="text-sm text-muted">{children}</div>
        {actions && <div className="mt-5 flex flex-wrap justify-end gap-2">{actions}</div>}
      </div>
    </dialog>
  );
}
export function Spinner({ label = "Loading…" }: { label?: string }) {
  return <div className="flex items-center gap-3 py-16 text-muted" role="status"><span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-brand" />{label}</div>;
}
