import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ============================ Sidebar nav =============================== */
export interface NavItemProps {
  icon: ReactNode;
  label: ReactNode;
  active?: boolean;
  href?: string;
  onClick?: () => void;
  trailing?: ReactNode;
}

/** Ítem de navegación lateral. Activo: fondo lavanda + texto violeta. */
export function NavItem({ icon, label, active, href, onClick, trailing }: NavItemProps) {
  const className = cn(
    "flex items-center gap-3 rounded-[9px] px-3 py-2.5 text-sm transition-colors",
    active ? "bg-primary-tint font-semibold text-primary-600" : "font-medium text-ink-soft hover:bg-neutral-50",
  );
  const content = (
    <>
      <span className={cn("flex-none", active ? "text-primary-600" : "text-muted")}>{icon}</span>
      <span className="flex-1">{label}</span>
      {trailing}
    </>
  );
  if (href) {
    return (
      <a href={href} className={className} aria-current={active ? "page" : undefined}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cn(className, "w-full text-left")}>
      {content}
    </button>
  );
}

/* ============================ Tabs ===================================== */
export interface TabItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
}

export function Tabs({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem[];
  value: string;
  onChange?: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-7 border-b border-neutral-100", className)}>
      {items.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange?.(t.id)}
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 px-0.5 py-[15px] text-sm transition-colors",
              active
                ? "border-primary-600 font-semibold text-primary-600"
                : "border-transparent font-medium text-muted hover:text-ink-soft",
            )}
          >
            {t.icon && <span className={active ? "text-primary-600" : "text-neutral-400"}>{t.icon}</span>}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
