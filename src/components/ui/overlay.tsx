"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CloseIcon } from "@/components/icons";

/* ============================ Tooltip ==================================== */
export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom";
  className?: string;
}

/** Tooltip de fondo oscuro para ayuda breve. Aparece en hover/focus. */
export function Tooltip({ content, children, side = "top", className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className={cn(
            "absolute left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-lg bg-neutral-900 px-3 py-2 text-[12.5px] font-medium text-white shadow-md",
            side === "top" ? "bottom-full mb-2" : "top-full mt-2",
          )}
        >
          {content}
          <span
            className="absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-neutral-900"
            style={side === "top" ? { bottom: -4 } : { top: -4 }}
          />
        </span>
      )}
    </span>
  );
}

/* ============================ Menu / Dropdown =========================== */
export interface MenuItemProps {
  icon?: ReactNode;
  children: ReactNode;
  onSelect?: () => void;
  active?: boolean;
  destructive?: boolean;
}

export function MenuItem({ icon, children, onSelect, active, destructive }: MenuItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-[11px] py-[9px] text-left text-[13.5px] transition-colors",
        destructive
          ? "text-error hover:bg-[#fceeed]"
          : active
            ? "bg-primary-ghost-hover font-medium text-primary-600"
            : "text-ink hover:bg-neutral-50",
      )}
    >
      {icon && <span className={cn("flex-none", !active && !destructive && "text-muted")}>{icon}</span>}
      {children}
    </button>
  );
}

export function MenuSeparator() {
  return <div className="mx-2 my-[5px] h-px bg-neutral-100" />;
}

export function Menu({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-neutral-200 bg-surface p-1.5 shadow-md", className)}>{children}</div>
  );
}

/* ============================ Modal ===================================== */
export interface ModalProps {
  open: boolean;
  onClose: () => void;
  icon?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  width?: number;
}

export function Modal({ open, onClose, icon, title, children, footer, width = 480 }: ModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-12"
      style={{ background: "rgba(28,32,48,.40)" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="overflow-hidden rounded-xl bg-surface shadow-lg"
        style={{ width, maxWidth: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6">
          <div className="flex items-start justify-between">
            {icon}
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="cursor-pointer p-1 text-neutral-400 hover:text-ink-soft"
            >
              <CloseIcon size={18} />
            </button>
          </div>
          <h3 className="mb-1.5 mt-4 text-[18px] font-bold">{title}</h3>
          {children && <div className="mb-6 text-sm leading-[1.55] text-muted">{children}</div>}
        </div>
        {footer && (
          <div className="flex gap-3 border-t border-neutral-100 bg-[#fafbfc] px-6 py-4">{footer}</div>
        )}
      </div>
    </div>
  );
}
