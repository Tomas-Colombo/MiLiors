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

export function Table<T>({ columns, rows, rowKey, highlightKey, footer, className }: TableProps<T>) {
  const template = columns.map((c) => c.width ?? "1fr").join(" ");
  return (
    <div className={cn("overflow-hidden rounded-xl border border-neutral-200 bg-surface px-1 py-2 shadow-card", className)}>
      {/* header */}
      <div
        className="grid border-b border-neutral-200 px-[22px] py-3.5"
        style={{ gridTemplateColumns: template }}
      >
        {columns.map((c) => (
          <div
            key={c.key}
            className={cn(
              "text-[11.5px] font-bold uppercase tracking-[0.04em] text-neutral-400",
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
              "grid items-center border-b border-neutral-150 px-[22px] py-[13px] transition-colors",
              key === highlightKey ? "bg-[#f8f7fe]" : "hover:bg-neutral-50",
            )}
            style={{ gridTemplateColumns: template }}
          >
            {columns.map((c) => (
              <div key={c.key} className={cn("min-w-0 text-[13px] text-ink-soft", alignClass[c.align ?? "left"])}>
                {c.cell(row)}
              </div>
            ))}
          </div>
        );
      })}
      {footer && <div className="flex items-center justify-between px-[22px] py-3.5">{footer}</div>}
    </div>
  );
}

/* ============================ Pagination =============================== */
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
        className="flex h-[30px] w-[30px] items-center justify-center rounded-[7px] border border-neutral-300 bg-surface text-neutral-400 disabled:opacity-50 enabled:hover:bg-neutral-50"
        aria-label="Anterior"
      >
        <ChevronLeftIcon size={14} />
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPageChange?.(p)}
          className={cn(
            "h-[30px] min-w-[30px] rounded-[7px] text-[13px] font-semibold",
            p === page
              ? "border-0 bg-primary-600 text-white"
              : "border border-neutral-300 bg-surface text-ink-soft hover:bg-neutral-50",
          )}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        disabled={page >= pageCount}
        onClick={() => onPageChange?.(page + 1)}
        className="flex h-[30px] w-[30px] items-center justify-center rounded-[7px] border border-neutral-300 bg-surface text-ink-soft disabled:opacity-50 enabled:hover:bg-neutral-50"
        aria-label="Siguiente"
      >
        <ChevronRightIcon size={14} />
      </button>
    </div>
  );
}
