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

/** Ítem de navegación lateral. Activo: fondo tonal + texto primario. */
export function NavItem({ icon, label, active, href, onClick, trailing }: NavItemProps) {
  const className = cn(
    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
    active ? "bg-primary-tint font-semibold text-primary-600" : "font-medium text-ink-soft hover:bg-neutral-50",
  );
  const content = (
    <>
      <span className={cn("flex-none", active ? "text-primary-600" : "text-muted")}>{icon}</span>
      <span className="flex-1 leading-tight">{label}</span>
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

/**
 * Pestañas con subrayado. El activo lleva borde de 2px en primario + peso 600;
 * el inactivo marca el hover con un borde neutro para que el destino se anticipe.
 */
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
    // La línea de base va como sombra interna y no como borde: con `overflow-x-auto`
    // el `-mb-px` del botón activo se recortaría y el subrayado quedaría a 1px.
    // El botón activo (border-b-2) la tapa igual que antes. En celular la tira
    // sangra hasta el borde de la pantalla y se desplaza si no entran todas.
    <div
      className={cn(
        "no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 shadow-[inset_0_-1px_0_0_var(--color-line)] sm:mx-0 sm:gap-6 sm:px-0",
        className,
      )}
    >
      {items.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange?.(t.id)}
            className={cn(
              // Anillo de foco hacia adentro: el contenedor con scroll recorta todo
              // lo que sobresale del botón, incluido el `outline-offset` global.
              "flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-0.5 py-3.5 text-sm transition-colors focus-visible:-outline-offset-2",
              active
                ? "border-primary-600 font-semibold text-primary-600"
                : "border-transparent font-medium text-muted hover:border-neutral-300 hover:text-ink-soft",
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
