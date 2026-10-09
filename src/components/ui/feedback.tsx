import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  CheckCircleIcon,
  AlertTriangleIcon,
  AlertCircleIcon,
  InfoIcon,
  CloseIcon,
  CheckIcon,
} from "@/components/icons";

/* ============================ Alert ====================================== */
// Íconos y texto usan `*-ink`: legibles sobre su `-bg` en claro y en oscuro
// (`*-strong` se queda oscuro en modo oscuro y `success`/`warning` no pasan AA).
type AlertTone = "success" | "warning" | "error" | "info";

const alertStyles: Record<AlertTone, { wrap: string; icon: ReactNode; title: string; body: string }> = {
  success: {
    wrap: "bg-success-bg border-success-border",
    icon: <CheckCircleIcon size={18} strokeWidth={2.5} className="text-success-ink" />,
    title: "text-success-ink",
    body: "text-success-ink",
  },
  warning: {
    wrap: "bg-warning-bg border-warning-border",
    icon: <AlertTriangleIcon size={18} strokeWidth={2.5} className="text-warning-ink" />,
    title: "text-warning-ink",
    body: "text-warning-ink",
  },
  error: {
    wrap: "bg-error-bg border-error-border",
    icon: <AlertCircleIcon size={18} strokeWidth={2.5} className="text-error-ink" />,
    title: "text-error-ink",
    body: "text-error-ink",
  },
  info: {
    wrap: "bg-info-bg border-info-border",
    icon: <InfoIcon size={18} strokeWidth={2.5} className="text-info-ink" />,
    title: "text-info-ink",
    body: "text-info-ink",
  },
};

export interface AlertProps {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function Alert({ tone = "info", title, children, className }: AlertProps) {
  const s = alertStyles[tone];
  return (
    <div className={cn("flex items-start gap-3 rounded-lg border px-4 py-3", s.wrap, className)}>
      <span className="mt-px flex-none">{s.icon}</span>
      <div className="min-w-0">
        {title && <div className={cn("text-compact font-semibold", s.title)}>{title}</div>}
        {children && <div className={cn("text-compact", s.body)}>{children}</div>}
      </div>
    </div>
  );
}

/* ============================ Toast ====================================== */
export interface ToastProps {
  title: ReactNode;
  description?: ReactNode;
  onClose?: () => void;
  className?: string;
}

export function Toast({ title, description, onClose, className }: ToastProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg bg-neutral-900 px-4 py-3 text-neutral-0 shadow-toast",
        className,
      )}
    >
      <span className="flex h-7 w-7 flex-none items-center justify-center rounded-md bg-success-solid">
        <CheckIcon size={15} strokeWidth={3} className="text-white" />
      </span>
      <div className="flex-1">
        <div className="text-compact font-semibold">{title}</div>
        {description && <div className="text-xs text-neutral-0/60">{description}</div>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="-m-1 rounded-md p-1 text-neutral-0/60 transition-colors hover:bg-neutral-0/10 hover:text-neutral-0"
        >
          <CloseIcon size={16} />
        </button>
      )}
    </div>
  );
}

/* ============================ Progress =================================== */
export function ProgressBar({
  value,
  label,
  showValue = true,
  className,
}: {
  value: number;
  label?: ReactNode;
  showValue?: boolean;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between">
          {label && <span className="text-compact font-medium text-ink-soft">{label}</span>}
          {showValue && <span className="text-compact font-bold tabular-nums text-primary-600">{pct}%</span>}
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: "var(--gradient-progress)" }}
        />
      </div>
    </div>
  );
}

export function ProgressRing({ value, size = 54 }: { value: number; size?: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const inner = Math.round(size * 0.74);
  return (
    <div
      className="flex items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(var(--color-primary-600) ${pct}%, var(--color-neutral-200) 0)`,
      }}
    >
      <div
        className="flex items-center justify-center rounded-full bg-surface text-compact font-extrabold tabular-nums text-ink"
        style={{ width: inner, height: inner }}
      >
        {pct}%
      </div>
    </div>
  );
}

/* ============================ Empty state ============================== */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("py-2 text-center", className)}>
      {icon && (
        <div className="mb-3.5 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary-ghost-hover text-primary-500">
          {icon}
        </div>
      )}
      <div className="mb-1 text-md font-bold">{title}</div>
      {description && (
        <div className="mx-auto mb-4 max-w-64 text-compact leading-normal text-muted">{description}</div>
      )}
      {action}
    </div>
  );
}
