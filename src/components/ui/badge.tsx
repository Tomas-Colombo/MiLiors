import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CloseIcon } from "@/components/icons";

type Tone = "neutral" | "primary" | "success" | "warning" | "error" | "info";

// El texto de los tonos de estado usa `*-ink` (AA sobre su `-bg` en claro y en
// oscuro); `text-success` / `text-warning` a secas se quedaban en ~3:1.
const toneStyles: Record<Tone, { badge: string; dot: string }> = {
  neutral: { badge: "bg-neutral-100 text-muted", dot: "bg-neutral-400" },
  primary: { badge: "bg-primary-tint text-primary-600", dot: "bg-primary-600" },
  success: { badge: "bg-success-bg text-success-ink", dot: "bg-success-solid" },
  warning: { badge: "bg-warning-bg text-warning-ink", dot: "bg-warning-solid" },
  error: { badge: "bg-error-bg text-error-ink", dot: "bg-error-solid" },
  info: { badge: "bg-info-bg text-info-ink", dot: "bg-info-solid" },
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  dot?: boolean;
}

/** Pill de estado de bajo contraste. 24px de alto · texto 12px / peso 600. */
export function Badge({ tone = "neutral", dot = false, className, children, ...props }: BadgeProps) {
  const styles = toneStyles[tone];
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold leading-4",
        styles.badge,
        className,
      )}
      {...props}
    >
      {dot && <span className={cn("h-1.5 w-1.5 flex-none rounded-full", styles.dot)} />}
      {children}
    </span>
  );
}

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  /** Chip seleccionado: relleno primario sólido. */
  selected?: boolean;
  onRemove?: () => void;
}

/** Chip de habilidad / filtro. 32px de alto · texto 13px / peso 500. */
export function Chip({ selected = false, onRemove, className, children, ...props }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 py-1 text-compact font-medium",
        selected ? "bg-primary-solid pr-2.5 text-white" : "bg-primary-tint text-primary-600",
        className,
      )}
      {...props}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Quitar"
          className="-mr-1 inline-flex items-center rounded-full p-1 transition-colors hover:bg-current/15"
        >
          <CloseIcon size={13} strokeWidth={2.5} />
        </button>
      )}
    </span>
  );
}

/** Contador numérico / notificación. */
export function CountBadge({
  tone = "primary",
  children,
  className,
}: {
  tone?: "primary" | "error";
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-2xs font-bold tabular-nums text-white",
        tone === "primary" ? "bg-primary-solid" : "bg-error-solid",
        className,
      )}
    >
      {children}
    </span>
  );
}
