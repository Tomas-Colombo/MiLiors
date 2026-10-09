import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

export interface Column<T> {
  key: string;
  header: ReactNode;
  /** Render de celda. */
  cell: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  /** Ancho relativo para grid-template-columns (p. ej. "1.6fr"). */
  width?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Resalta una fila (p. ej. seleccionada). */
  highlightKey?: string;
  footer?: ReactNode;
  className?: string;
}

const alignClass = { left: "text-left", right: "text-right", center: "text-center" } as const;

/**
 * Tabla de datos. Densidad de trabajo: filas de ~44px (celda 13px + 12px de
 * padding vertical), encabezado en mayúsculas 11px con el color `muted` — el
 * `neutral-400` anterior no llegaba a 3:1 sobre el vidrio.
 */
export function Table<T>({ columns, rows, rowKey, highlightKey, footer, className }: TableProps<T>) {
  const template = columns.map((c) => c.width ?? "1fr").join(" ");
  return (
    <div className={cn("overflow-hidden rounded-xl border border-neutral-200 bg-surface px-1 py-2 shadow-card", className)}>
      {/* header */}
      <div
        className="grid border-b border-neutral-200 px-5 py-3"
        style={{ gridTemplateColumns: template }}
      >
        {columns.map((c) => (
          <div
            key={c.key}
            className={cn(
              "text-2xs font-semibold uppercase tracking-wider text-muted",
              alignClass[c.align ?? "left"],
            )}
          >
            {c.header}
          </div>
        ))}
      </div>
      {/* rows */}
      {rows.map((row) => {
        const key = rowKey(row);
        return (
          <div
            key={key}
            className={cn(
              "grid items-center border-b border-neutral-150 px-5 py-3 transition-colors",
              // `bg-primary-50` en vez del `#f8f7fe` fijo: el hex no se
              // invertía y en modo oscuro pintaba la fila resaltada de casi
              // blanco, con el texto claro encima.
              key === highlightKey ? "bg-primary-50" : "hover:bg-neutral-50",
            )}
            style={{ gridTemplateColumns: template }}
          >
            {columns.map((c) => (
              <div key={c.key} className={cn("min-w-0 text-compact text-ink-soft", alignClass[c.align ?? "left"])}>
                {c.cell(row)}
              </div>
            ))}
          </div>
        );
      })}
      {footer && <div className="flex items-center justify-between px-5 py-3">{footer}</div>}
    </div>
  );
}

/* ============================ Pagination =============================== */
// Botones de 32px: misma altura que `Button size="sm"`.
const pageBtn =
  "flex h-8 min-w-8 items-center justify-center rounded-md border text-compact font-semibold tabular-nums transition-colors";

export function Pagination({
  page,
  pageCount,
  onPageChange,
  className,
}: {
  page: number;
  pageCount: number;
  onPageChange?: (page: number) => void;
  className?: string;
}) {
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange?.(page - 1)}
        className={cn(pageBtn, "border-line-strong bg-surface text-muted disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:bg-neutral-50")}
        aria-label="Anterior"
      >
        <ChevronLeftIcon size={14} />
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPageChange?.(p)}
          aria-current={p === page ? "page" : undefined}
          className={cn(
            pageBtn,
            p === page
              ? "border-transparent bg-primary-solid text-white"
              : "border-line-strong bg-surface text-ink-soft hover:bg-neutral-50",
          )}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        disabled={page >= pageCount}
        onClick={() => onPageChange?.(page + 1)}
        className={cn(pageBtn, "border-line-strong bg-surface text-ink-soft disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:bg-neutral-50")}
        aria-label="Siguiente"
      >
        <ChevronRightIcon size={14} />
      </button>
    </div>
  );
}
