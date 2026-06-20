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
type AlertTone = "success" | "warning" | "error" | "info";

const alertStyles: Record<AlertTone, { wrap: string; icon: ReactNode; title: string; body: string }> = {
  success: {
    wrap: "bg-success-bg border-success-border",
    icon: <CheckCircleIcon size={18} strokeWidth={2.5} className="text-success" />,
    title: "text-success-strong",
    body: "text-success",
  },
  warning: {
    wrap: "bg-warning-bg border-warning-border",
    icon: <AlertTriangleIcon size={18} strokeWidth={2.5} className="text-warning" />,
    title: "text-warning-strong",
    body: "text-warning",
  },
  error: {
    wrap: "bg-error-bg border-error-border",
    icon: <AlertCircleIcon size={18} strokeWidth={2.5} className="text-error" />,
    title: "text-error-strong",
    body: "text-error",
  },
  info: {
    wrap: "bg-info-bg border-info-border",
    icon: <InfoIcon size={18} strokeWidth={2.5} className="text-info" />,
    title: "text-info-strong",
    body: "text-info",
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
    <div className={cn("flex items-start gap-3 rounded-[10px] border px-[15px] py-[13px]", s.wrap, className)}>
      <span className="mt-px flex-none">{s.icon}</span>
      <div>
        {title && <div className={cn("text-[13.5px] font-semibold", s.title)}>{title}</div>}
        {children && <div className={cn("text-[13px]", s.body)}>{children}</div>}
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
        "flex items-center gap-3 rounded-[11px] bg-neutral-900 px-[15px] py-[13px] text-white shadow-toast",
        className,
      )}
    >
      <span className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-lg bg-success-solid">
        <CheckIcon size={15} strokeWidth={3} className="text-white" />
      </span>
      <div className="flex-1">
        <div className="text-[13.5px] font-semibold">{title}</div>
        {description && <div className="text-xs text-white/60">{description}</div>}
      </div>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Cerrar" className="cursor-pointer text-white/60">
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
        <div className="mb-[7px] flex items-center justify-between">
          {label && <span className="text-[13px] font-medium text-ink-soft">{label}</span>}
          {showValue && <span className="text-[13px] font-bold text-primary-600">{pct}%</span>}
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
        className="flex items-center justify-center rounded-full bg-surface text-[13px] font-extrabold text-ink"
        style={{ width: inner, height: inner }}
      >
        {pct}%
      </div>
    </div>
  );
}

/* ============================ Skeleton ================================== */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("rounded-md", className)}
      style={{
        background: "linear-gradient(90deg,#f1f2f5 25%,#e8e9ed 37%,#f1f2f5 63%)",
        backgroundSize: "400px 100%",
        animation: "ds-shimmer 1.4s infinite",
      }}
    />
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
        <div className="mb-3.5 inline-flex h-14 w-14 items-center justify-center rounded-[14px] bg-primary-ghost-hover text-primary-500">
          {icon}
        </div>
      )}
      <div className="mb-[5px] text-[15px] font-bold">{title}</div>
      {description && (
        <div className="mx-auto mb-4 max-w-[240px] text-[13px] leading-[1.5] text-neutral-400">{description}</div>
      )}
      {action}
    </div>
  );
}
