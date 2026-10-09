import type { ComponentPropsWithRef, ReactNode, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { AlertCircleIcon } from "@/components/icons";

type FieldStatus = "default" | "error" | "success";

/** Escala de alto compartida con `Button` (sm 32 · md 40 · lg 48). */
export type ControlSize = "sm" | "md" | "lg";

// Sin color de texto a propósito: lo agrega `inputClassName` (ink o
// placeholder según el caso) para que no haya dos `text-*` compitiendo.
const fieldBase =
  "w-full rounded-md border bg-surface font-sans outline-none " +
  "transition-[border-color,box-shadow,background-color] " +
  "placeholder:text-placeholder " +
  "disabled:cursor-not-allowed disabled:border-neutral-200 disabled:bg-neutral-50 " +
  "disabled:text-neutral-400 disabled:placeholder:text-neutral-400";

const fieldSizes: Record<ControlSize, string> = {
  sm: "h-8 px-3 text-compact",
  md: "h-10 px-3.5 text-sm",
  lg: "h-12 px-4 text-md",
};

// Mismo borde de 1px en todos los estados: el foco y el error se marcan con
// color + halo, no con un borde más grueso que corre el contenido medio píxel.
const statusRing: Record<FieldStatus, string> = {
  default: "border-neutral-300 focus:border-primary-600 focus:ring-[3px] focus:ring-primary-ring",
  error: "border-error-solid ring-[3px] ring-error-bg focus:border-error-solid",
  success: "border-success-solid ring-[3px] ring-success-bg",
};

const openRing = "border-primary-600 ring-[3px] ring-primary-ring";

export interface InputClassNameOptions {
  size?: ControlSize;
  status?: FieldStatus;
  /** Textarea: sin alto fijo, padding vertical propio. */
  multiline?: boolean;
  /** Disparadores tipo select/fecha mientras su panel está abierto. */
  open?: boolean;
  /** El control muestra su texto de ayuda (select sin valor): pinta `placeholder`. */
  empty?: boolean;
  className?: string;
}

/**
 * Clases de un campo de texto, sin el elemento. Es la única fuente de verdad
 * del aspecto de los controles: `Input`, `Textarea`, `Select`, `FancySelect`,
 * `SearchableSelect` y `DateInput` la usan por dentro. Sirve para vestir un
 * <input>, <select> o <textarea> crudo con el mismo look, igual que
 * `buttonClassName()` con los botones.
 */
export function inputClassName({
  size = "md",
  status = "default",
  multiline = false,
  open = false,
  empty = false,
  className,
}: InputClassNameOptions = {}) {
  return cn(
    fieldBase,
    empty ? "text-placeholder" : "text-ink",
    multiline ? "px-3.5 py-2.5 text-sm" : fieldSizes[size],
    open && status === "default" ? openRing : statusRing[status],
    className,
  );
}

// ComponentPropsWithRef y no InputHTMLAttributes: en React 19 `ref` es una
// prop más de un componente función, pero hay que declararla en el tipo.
export interface InputProps extends ComponentPropsWithRef<"input"> {
  status?: FieldStatus;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Input({ status = "default", leftIcon, rightIcon, className, ...props }: InputProps) {
  const input = (
    <input
      className={inputClassName({
        status,
        className: cn(leftIcon && "pl-10", rightIcon && "pr-10", className),
      })}
      {...props}
    />
  );

  if (!leftIcon && !rightIcon) return input;

  return (
    <div className="relative">
      {leftIcon && (
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
          {leftIcon}
        </span>
      )}
      {input}
      {rightIcon && (
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
          {rightIcon}
        </span>
      )}
    </div>
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  status?: FieldStatus;
}

export function Textarea({ status = "default", className, rows = 3, ...props }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      className={inputClassName({ status, multiline: true, className: cn("resize-y", className) })}
      {...props}
    />
  );
}

/* ---- Field: label + control + ayuda/error -------------------------------- */
export interface FieldProps {
  label?: ReactNode;
  htmlFor?: string;
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, required, hint, error, children, className }: FieldProps) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="mb-1.5 block text-compact font-semibold text-ink-soft">
          {label}
          {required && <span className="text-error-solid"> *</span>}
        </label>
      )}
      {children}
      {error ? (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-error">
          <AlertCircleIcon size={13} strokeWidth={2.5} />
          {error}
        </div>
      ) : (
        hint && <div className="mt-1.5 text-xs text-muted">{hint}</div>
      )}
    </div>
  );
}
