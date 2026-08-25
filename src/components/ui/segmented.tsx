"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
}

export interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentedOption<T>[];
  /** Obligatorio: el grupo no tiene etiqueta visible propia. */
  ariaLabel: string;
  className?: string;
}

/**
 * Control segmentado: dos o tres opciones excluyentes en una sola caja, para
 * cuando un `Select` sería demasiado para tan pocas alternativas.
 *
 * `aria-pressed` en vez de `role="radiogroup"`: son botones que aplican el
 * cambio al instante, no un campo de formulario que se envía después.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex shrink-0 overflow-hidden rounded-md border border-neutral-300",
        className,
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            "cursor-pointer px-2.5 py-1 text-[12px] font-medium transition-colors",
            value === o.value
              ? "bg-primary-600 text-white"
              : "bg-surface text-muted hover:bg-primary-ghost-hover hover:text-primary-600",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
