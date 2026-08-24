"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Input } from "./input";
import { Alert } from "./feedback";
import { CloseIcon, AlertTriangleIcon, HelpCircleIcon } from "@/components/icons";

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
            "absolute left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-lg bg-neutral-900 px-3 py-2 text-[12.5px] font-medium text-neutral-0 shadow-md",
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
    <div className={cn("rounded-lg border border-neutral-300 bg-neutral-0 p-1.5 shadow-md", className)}>{children}</div>
  );
}

/* ============================ Modal ===================================== */

/** Elementos que pueden recibir foco dentro del diálogo. */
const FOCUSABLES =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  icon?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  width?: number;
}

/**
 * Diálogo modal.
 *
 * Mientras está abierto: cierra con Escape, atrapa el foco adentro (Tab cicla
 * sin salirse), bloquea el scroll del fondo y devuelve el foco a lo que estaba
 * enfocado antes al cerrarse. El foco inicial va al elemento marcado con
 * `data-autofocus` si lo hay, y si no al contenedor, para que el lector de
 * pantalla anuncie el título antes que los botones.
 */
export function Modal({ open, onClose, icon, title, children, footer, width = 480 }: ModalProps) {
  const dialogoRef = useRef<HTMLDivElement>(null);
  const tituloId = useId();

  // El handler se guarda en una ref para que el efecto dependa sólo de `open`.
  // Si dependiera de `onClose` —que casi siempre llega como arrow inline— se
  // volvería a montar en cada render y robaría el foco mientras se escribe.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const dialogo = dialogoRef.current;
    if (!dialogo) return;

    const enfocadoAntes = document.activeElement as HTMLElement | null;
    const overflowAntes = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const inicial = dialogo.querySelector<HTMLElement>("[data-autofocus]") ?? dialogo;
    inicial.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;

      const lista = Array.from(dialogo!.querySelectorAll<HTMLElement>(FOCUSABLES));
      if (lista.length === 0) {
        e.preventDefault();
        return;
      }
      const primero = lista[0];
      const ultimo = lista[lista.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflowAntes;
      enfocadoAntes?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-12"
      style={{ background: "rgba(28,32,48,.40)" }}
      onClick={onClose}
    >
      <div
        ref={dialogoRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className="overflow-hidden rounded-xl bg-surface shadow-lg outline-none"
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
              className="ml-auto cursor-pointer p-1 text-neutral-400 hover:text-ink-soft"
            >
              <CloseIcon size={18} />
            </button>
          </div>
          <h3 id={tituloId} className="mb-1.5 mt-4 text-[18px] font-bold">
            {title}
          </h3>
          {children && <div className="mb-6 text-sm leading-[1.55] text-muted">{children}</div>}
        </div>
        {footer && (
          <div className="flex gap-3 border-t border-neutral-100 bg-[#fafbfc] px-6 py-4">{footer}</div>
        )}
      </div>
    </div>
  );
}

/* ============================ Icono del diálogo ========================= */

type DialogTone = "primary" | "destructive";

function DialogIcon({ tone, children }: { tone: DialogTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-xl",
        tone === "destructive" ? "bg-error-bg text-error" : "bg-primary-tint text-primary-600",
      )}
    >
      {children}
    </span>
  );
}

/* ============================ ConfirmDialog ============================= */

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  /** Explicación de la consecuencia. */
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: DialogTone;
  loading?: boolean;
  /** Error devuelto por la acción; se muestra dentro del diálogo. */
  error?: string;
  width?: number;
}

/**
 * Confirmación de una acción. Reemplaza a `window.confirm()`, que no se puede
 * estilar, ignora el tema y bloquea el hilo del navegador.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  children,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "primary",
  loading = false,
  error,
  width = 440,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      width={width}
      title={title}
      icon={
        <DialogIcon tone={tone}>
          {tone === "destructive" ? <AlertTriangleIcon size={20} /> : <HelpCircleIcon size={20} />}
        </DialogIcon>
      }
      footer={
        <>
          <Button
            variant="secondary"
            size="md"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "destructive" ? "destructive" : "primary"}
            size="md"
            className="flex-1"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
      {error && <Alert tone="error" title={error} className="mt-4" />}
    </Modal>
  );
}

/* ============================ PromptDialog ============================== */

export interface PromptDialogProps {
  open: boolean;
  onClose: () => void;
  /** Recibe el valor ya recortado. Sólo se llama si no está vacío. */
  onSubmit: (valor: string) => void;
  title: ReactNode;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  children?: ReactNode;
  confirmLabel?: string;
  loading?: boolean;
  /** Error devuelto por la acción; se muestra dentro del diálogo. */
  error?: string;
  width?: number;
}

/**
 * Pide un texto corto. Reemplaza a `window.prompt()`, que además de no poder
 * estilarse no admite validación ni estado de carga: acá el diálogo queda
 * abierto mientras la acción está en vuelo y muestra su error sin un segundo
 * `alert()`.
 *
 * Quien lo usa debe remontarlo con `key` al cambiar de fila, para que el campo
 * arranque con el valor de la fila que se está editando.
 */
export function PromptDialog({
  open,
  onClose,
  onSubmit,
  title,
  label,
  defaultValue = "",
  placeholder,
  children,
  confirmLabel = "Guardar",
  loading = false,
  error,
  width = 440,
}: PromptDialogProps) {
  const [valor, setValor] = useState(defaultValue);
  const campoId = useId();
  const limpio = valor.trim();

  function enviar() {
    if (!limpio || loading) return;
    onSubmit(limpio);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width={width}
      title={title}
      icon={
        <DialogIcon tone="primary">
          <HelpCircleIcon size={20} />
        </DialogIcon>
      }
      footer={
        <>
          <Button
            variant="secondary"
            size="md"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button size="md" className="flex-1" onClick={enviar} loading={loading} disabled={!limpio}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
      <label htmlFor={campoId} className="mb-1.5 mt-3 block text-[13px] font-medium text-ink-soft">
        {label}
      </label>
      <Input
        id={campoId}
        data-autofocus
        value={valor}
        placeholder={placeholder}
        status={error ? "error" : "default"}
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            enviar();
          }
        }}
      />
      {error && <Alert tone="error" title={error} className="mt-3" />}
    </Modal>
  );
}
