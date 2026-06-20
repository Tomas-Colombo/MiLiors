import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CloseIcon } from "@/components/icons";

type Tone = "neutral" | "primary" | "success" | "warning" | "error" | "info";

const toneStyles: Record<Tone, { badge: string; dot: string }> = {
  neutral: { badge: "bg-neutral-100 text-muted", dot: "bg-neutral-400" },
  primary: { badge: "bg-primary-tint text-primary-600", dot: "bg-primary-600" },
  success: { badge: "bg-success-bg text-success", dot: "bg-success-solid" },
  warning: { badge: "bg-warning-bg text-warning", dot: "bg-warning-solid" },
  error: { badge: "bg-error-bg text-error", dot: "bg-error-solid" },
  info: { badge: "bg-info-bg text-info", dot: "bg-info-solid" },
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  dot?: boolean;
}

/** Pill de estado de bajo contraste. Texto 12.5px / peso 600. */
export function Badge({ tone = "neutral", dot = false, className, children, ...props }: BadgeProps) {
  const styles = toneStyles[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-[11px] py-[5px] text-[12.5px] font-semibold",
        styles.badge,
        className,
      )}
      {...props}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", styles.dot)} />}
      {children}
    </span>
  );
}

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  /** Chip seleccionado: relleno violeta sólido. */
  selected?: boolean;
  onRemove?: () => void;
}

/** Chip de habilidad / filtro. Texto 13px / peso 500. */
export function Chip({ selected = false, onRemove, className, children, ...props }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-[13px] py-1.5 text-[13px] font-medium",
        selected ? "bg-primary-600 pr-[11px] text-white" : "bg-primary-tint text-primary-600",
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
          className="-mr-0.5 inline-flex cursor-pointer items-center"
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
        "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white",
        tone === "primary" ? "bg-primary-600" : "bg-error-solid",
        className,
      )}
    >
      {children}
    </span>
  );
}
