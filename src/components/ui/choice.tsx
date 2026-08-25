"use client";

import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CheckIcon } from "@/components/icons";

type BaseProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> & {
  label?: ReactNode;
  indeterminate?: boolean;
};

/* ---- Checkbox ------------------------------------------------------------ */
export function Checkbox({ label, indeterminate, checked, disabled, className, id, ...props }: BaseProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const on = checked || indeterminate;
  return (
    <label
      htmlFor={inputId}
      className={cn(
        "inline-flex items-center gap-[11px] text-sm",
        disabled ? "cursor-not-allowed text-neutral-400" : "cursor-pointer text-ink",
        className,
      )}
    >
      <span className="relative inline-flex">
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          className="peer sr-only"
          {...props}
        />
        <span
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-md transition-colors",
            disabled
              ? "border-[1.5px] border-neutral-300 bg-neutral-50"
              : on
                ? "bg-primary-600"
                : "border-[1.5px] border-[#c9cdd4] bg-surface",
            "peer-focus-visible:ring-[3px] peer-focus-visible:ring-primary-50",
          )}
        >
          {indeterminate ? (
            <span className="h-[2.5px] w-2.5 rounded-sm bg-white" />
          ) : (
            checked && <CheckIcon size={13} strokeWidth={3} className="text-white" />
          )}
        </span>
      </span>
      {label}
    </label>
  );
}

/* ---- Radio --------------------------------------------------------------- */
export function Radio({ label, checked, disabled, className, id, ...props }: BaseProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <label
      htmlFor={inputId}
      className={cn(
        "inline-flex items-center gap-[11px] text-sm",
        disabled ? "cursor-not-allowed text-neutral-400" : "cursor-pointer text-ink",
        className,
      )}
    >
      <span className="relative inline-flex">
        <input
          id={inputId}
          type="radio"
          checked={checked}
          disabled={disabled}
          className="peer sr-only"
          {...props}
        />
        <span
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full border-[1.5px] transition-colors",
            disabled
              ? "border-neutral-300 bg-neutral-50"
              : checked
                ? "border-primary-600"
                : "border-[#c9cdd4] bg-surface",
            "peer-focus-visible:ring-[3px] peer-focus-visible:ring-primary-50",
          )}
        >
          {checked && !disabled && <span className="h-2.5 w-2.5 rounded-full bg-primary-600" />}
        </span>
      </span>
      {label}
    </label>
  );
}

/* ---- Switch / Toggle ----------------------------------------------------- */
export interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: ReactNode;
  className?: string;
  id?: string;
  name?: string;
}

export function Switch({
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  label,
  className,
  id,
  name,
}: SwitchProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const isControlled = checked !== undefined;
  const [internal, setInternal] = useState(defaultChecked ?? false);
  const on = isControlled ? checked : internal;

  return (
    <label
      htmlFor={inputId}
      className={cn(
        "inline-flex items-center gap-[11px] text-sm",
        disabled ? "cursor-not-allowed text-neutral-400" : "cursor-pointer text-ink",
        className,
      )}
    >
      <input
        id={inputId}
        name={name}
        type="checkbox"
        role="switch"
        checked={on}
        disabled={disabled}
        onChange={(e) => {
          if (!isControlled) setInternal(e.target.checked);
          onCheckedChange?.(e.target.checked);
        }}
        className="peer sr-only"
      />
      <span
        className={cn(
          "relative inline-block h-[22px] w-[38px] rounded-full transition-colors",
          // Los dos grises salen de tokens y no de hex fijos: así el riel del
          // switch acompaña al tema en vez de quedar gris claro sobre oscuro.
          disabled ? "bg-neutral-100" : on ? "bg-primary-600" : "bg-neutral-300",
          "peer-focus-visible:ring-[3px] peer-focus-visible:ring-primary-50",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-[18px] w-[18px] rounded-full shadow-[0_1px_2px_rgba(0,0,0,.2)] transition-transform",
            disabled ? "bg-neutral-50" : "bg-white",
            on && "translate-x-4",
          )}
        />
      </span>
      {label}
    </label>
  );
}
