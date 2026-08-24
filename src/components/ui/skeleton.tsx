"use client";

/**
 * Skeleton · placeholder de contenido en vuelo.
 *
 * Client component porque necesita `matchMedia` para respetar
 * `prefers-reduced-motion`: con la preferencia activa se pinta un bloque plano,
 * sin el shimmer de `ds-shimmer`.
 *
 * Los colores salen de los tokens del design system (`--color-neutral-100/200`),
 * no de hex fijos, para que el placeholder siga al tema en modo oscuro.
 */

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * `useSyncExternalStore` en vez de `useEffect` + `setState`: el media query es
 * un store externo, y así el primer render del cliente ya sabe la preferencia
 * (en el server siempre devuelve `false`, que es el render con animación).
 */
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
}

export interface SkeletonProps {
  /** Ancho CSS. Un número se interpreta como px. */
  width?: string | number;
  /** Alto CSS. Un número se interpreta como px. */
  height?: string | number;
  /** Radio del borde. Default: el `rounded-md` del sistema. */
  borderRadius?: string | number;
  className?: string;
  "data-testid"?: string;
}

const size = (v: string | number | undefined) =>
  typeof v === "number" ? `${v}px` : v;

export function Skeleton({
  width,
  height,
  borderRadius,
  className,
  "data-testid": testId,
}: SkeletonProps) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div
      role="status"
      aria-busy="true"
      aria-hidden="false"
      data-testid={testId}
      className={cn("rounded-md", className)}
      style={{
        width: size(width),
        height: size(height),
        borderRadius: size(borderRadius),
        background: reducedMotion
          ? "var(--color-neutral-100)"
          : "linear-gradient(90deg, var(--color-neutral-100) 25%, var(--color-neutral-200) 37%, var(--color-neutral-100) 63%)",
        backgroundSize: reducedMotion ? undefined : "400px 100%",
        animation: reducedMotion ? undefined : "ds-shimmer 1.4s infinite",
      }}
    />
  );
}
