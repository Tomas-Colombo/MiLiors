import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { AlertCircleIcon } from "@/components/icons";

type FieldStatus = "default" | "error" | "success";

const fieldBase =
  "w-full font-sans text-sm text-ink bg-surface outline-none transition-[border,box-shadow] " +
  "placeholder:text-neutral-400 disabled:cursor-not-allowed disabled:text-neutral-400 disabled:bg-neutral-50";

const statusRing: Record<FieldStatus, string> = {
  default: "border border-neutral-300 focus:border-[1.5px] focus:border-primary-600 focus:ring-[3px] focus:ring-primary-50",
  error: "border-[1.5px] border-error-solid ring-[3px] ring-error-bg focus:border-error-solid",
  success: "border-[1.5px] border-success-solid ring-[3px] ring-success-bg",
};

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  status?: FieldStatus;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Input({ status = "default", leftIcon, rightIcon, className, ...props }: InputProps) {
  const input = (
    <input
      className={cn(
        fieldBase,
        "h-10 rounded-md px-3.5",
        leftIcon && "pl-[38px]",
        rightIcon && "pr-[38px]",
        statusRing[status],
        className,
      )}
      {...props}
    />
  );

  if (!leftIcon && !rightIcon) return input;

  return (
    <div className="relative">
      {leftIcon && (
        <span className="pointer-events-none absolute left-[13px] top-1/2 -translate-y-1/2 text-neutral-400">
          {leftIcon}
        </span>
      )}
      {input}
      {rightIcon && (
        <span className="absolute right-[13px] top-1/2 -translate-y-1/2 text-neutral-400">
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
      className={cn(fieldBase, "rounded-md px-3.5 py-[11px] resize-y", statusRing[status], className)}
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
        <label htmlFor={htmlFor} className="mb-[7px] block text-[13px] font-semibold text-ink-soft">
          {label}
          {required && <span className="text-error-solid"> *</span>}
        </label>
      )}
      {children}
      {error ? (
        <div className="mt-[7px] flex items-center gap-1.5 text-xs font-medium text-error">
          <AlertCircleIcon size={13} strokeWidth={2.5} />
          {error}
        </div>
      ) : (
        hint && <div className="mt-1.5 text-xs text-neutral-400">{hint}</div>
      )}
    </div>
  );
}
