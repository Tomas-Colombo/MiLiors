import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ChevronUpIcon, ChevronDownIcon } from "@/components/icons";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Padding interno. Default "lg" (22px). */
  padding?: "none" | "sm" | "md" | "lg";
}

const paddings = {
  none: "",
  sm: "p-5",
  md: "p-[22px]",
  lg: "p-[26px]",
};

/** Superficie base: blanca, radio 16px, borde 1px y sombra de card. */
export function Card({ padding = "md", className, children, ...props }: CardProps) {
  return (
    <div
      className={cn("rounded-xl border border-neutral-200 bg-surface shadow-card", paddings[padding], className)}
      {...props}
    >
      {children}
    </div>
  );
}

type AccentTone = "violet" | "green" | "amber" | "blue";

const accentTones: Record<AccentTone, string> = {
  violet: "bg-accent-violet-bg text-accent-violet",
  green: "bg-accent-green-bg text-accent-green",
  amber: "bg-accent-amber-bg text-accent-amber",
  blue: "bg-accent-blue-bg text-accent-blue",
};

export interface KpiCardProps {
  icon: ReactNode;
  tone?: AccentTone;
  label: string;
  value: ReactNode;
  /** Variación porcentual; positivo = verde, negativo = rojo. */
  trend?: { value: string; direction: "up" | "down"; caption?: string };
  className?: string;
}

/** Card de KPI: ícono tonal, valor grande y tendencia. */
export function KpiCard({ icon, tone = "violet", label, value, trend, className }: KpiCardProps) {
  const up = trend?.direction !== "down";
  return (
    <div className={cn("rounded-[14px] border border-neutral-200 bg-surface p-5 shadow-card", className)}>
      <div className={cn("mb-3.5 flex h-11 w-11 items-center justify-center rounded-[11px]", accentTones[tone])}>
        {icon}
      </div>
      <div className="mb-1 text-[13px] text-muted">{label}</div>
      <div className="text-[26px] font-extrabold tracking-[-0.02em]">{value}</div>
      {trend && (
        <div className="mt-2 flex items-center gap-1.5">
          <span className={up ? "text-success" : "text-error"}>
            {up ? <ChevronUpIcon size={13} strokeWidth={3} /> : <ChevronDownIcon size={13} strokeWidth={3} />}
          </span>
          <span className={cn("text-xs font-semibold", up ? "text-success" : "text-error")}>{trend.value}</span>
          {trend.caption && <span className="text-xs text-neutral-400">{trend.caption}</span>}
        </div>
      )}
    </div>
  );
}

/** Card promocional con gradiente de marca. */
export function PromoCard({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("rounded-xl p-6 text-white shadow-promo", className)}
      style={{ background: "var(--gradient-promo)" }}
    >
      <div className="mb-3.5 flex items-center gap-[9px]">
        {icon && (
          <div className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-white/[0.18]">{icon}</div>
        )}
        <span className="text-[15px] font-bold">{title}</span>
      </div>
      {children && <p className="m-0 mb-5 text-[13.5px] leading-[1.55] text-white/80">{children}</p>}
      {action}
    </div>
  );
}
