"use client";

import { useEffect, type ReactNode, type RefObject } from "react";
import { cn } from "@/lib/utils";

/**
 * Piezas compartidas por los campos que abren un panel flotante para elegir una
 * fecha: el calendario de `DateInput` y la grilla de meses de `MonthYearInput`.
 *
 * Existen para que los dos se vean como el resto del kit —el mismo borde, la
 * misma sombra y los mismos botones de navegación que FancySelect y
 * SearchableSelect— en vez de caer en el picker nativo del navegador, que lo
 * dibuja el sistema operativo y no hay CSS que lo alcance.
 */

/** Contenedor flotante del panel. El ancho lo decide cada campo. */
export function PickerPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "absolute z-20 mt-2 rounded-lg border border-neutral-300 bg-neutral-0 p-2 shadow-md",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Botón chico de navegación (mes/año anterior y siguiente). */
export function PickerNavBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-[7px] text-neutral-400 transition-colors hover:bg-neutral-50 hover:text-ink"
    >
      {children}
    </button>
  );
}

/** Encabezado del panel: navegación a los costados y el título al medio. */
export function PickerHeader({
  izquierda,
  derecha,
  children,
}: {
  izquierda: ReactNode;
  derecha: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-0.5 pb-1.5">
      <div className="flex items-center gap-0.5">{izquierda}</div>
      <span className="text-[13px] font-semibold text-ink">{children}</span>
      <div className="flex items-center gap-0.5">{derecha}</div>
    </div>
  );
}

/** Pie del panel: los atajos ("Hoy", "Limpiar") separados por una línea. */
export function PickerFooter({ children }: { children: ReactNode }) {
  return (
    <div className="mt-1.5 flex items-center justify-between border-t border-neutral-100 pt-1.5">
      {children}
    </div>
  );
}

/** Atajo de texto del pie. `tone="muted"` para el que borra el valor. */
export function PickerAction({
  onClick,
  tone = "primary",
  children,
}: {
  onClick: () => void;
  tone?: "primary" | "muted";
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[7px] px-2 py-1 text-[12px] font-medium",
        tone === "primary"
          ? "text-primary-600 hover:bg-primary-ghost-hover"
          : "text-muted hover:bg-neutral-50 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Cierra el panel al hacer clic afuera o al apretar Escape. Los dos campos lo
 * necesitaban con exactamente la misma lógica.
 */
export function useCerrarAlSalir(
  abierto: boolean,
  contenedor: RefObject<HTMLElement | null>,
  cerrar: () => void,
) {
  useEffect(() => {
    if (!abierto) return;
    function handleOutside(e: MouseEvent) {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) cerrar();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") cerrar();
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
    // Sólo depende de `abierto`: el efecto se re-suscribe cuando el panel abre
    // o cierra, y la closure que queda viva es la de ese render. `cerrar` no
    // hace más que un setState —estable por definición— y `contenedor` es una
    // ref, así que volver a suscribirse por ellos sería puro ruido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);
}
