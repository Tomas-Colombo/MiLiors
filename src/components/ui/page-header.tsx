import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  /** Título de la página: el único <h1> de la vista. */
  title: ReactNode;
  /** Bajada en color `muted`, con ancho de lectura acotado. */
  description?: ReactNode;
  /** Acciones de la página (botones). A la derecha en desktop, debajo en mobile. */
  actions?: ReactNode;
  /** Línea chica sobre el título (p. ej. el contexto o un link de vuelta). */
  eyebrow?: ReactNode;
  className?: string;
}

/**
 * Encabezado canónico de página. Un solo estilo de título para toda la app:
 * `text-2xl font-extrabold tracking-tight text-ink`. No agrega margen inferior:
 * la separación con el contenido la decide la vista (`mb-6` / `space-y-6`).
 */
export function PageHeader({ title, description, actions, eyebrow, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-xs font-semibold text-muted">{eyebrow}</div>}
        <h1 className="text-balance text-2xl font-extrabold leading-tight tracking-tight text-ink">{title}</h1>
        {description && (
          <div className="mt-1.5 max-w-prose text-compact leading-normal text-muted">{description}</div>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:flex-none sm:justify-end">{actions}</div>}
    </header>
  );
}
