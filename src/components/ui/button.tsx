import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/icons";

type Variant = "primary" | "secondary" | "tonal" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const base =
  "inline-flex items-center justify-center gap-2 font-sans font-semibold cursor-pointer " +
  "transition-[background,box-shadow,filter,color] disabled:cursor-not-allowed " +
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-300/70";

const variants: Record<Variant, string> = {
  primary:
    "text-white bg-[image:var(--gradient-brand)] shadow-primary border-0 " +
    "hover:brightness-[1.06] hover:shadow-primary-hover active:brightness-95 " +
    "disabled:bg-none disabled:bg-neutral-disabled disabled:shadow-none",
  secondary:
    "bg-surface text-ink-soft border border-neutral-300 " +
    "hover:bg-neutral-50 hover:border-[#d6d9df] disabled:text-neutral-400 disabled:bg-neutral-50",
  tonal:
    "bg-primary-tint text-primary-600 border-0 hover:bg-primary-tint-hover " +
    "disabled:text-neutral-400 disabled:bg-neutral-100",
  ghost:
    "bg-transparent text-primary-600 border-0 hover:bg-primary-ghost-hover " +
    "disabled:text-neutral-400",
  destructive:
    // El hover va a `error-strong` y no a `error`: este último es el color de
    // TEXTO del tono, y en modo oscuro se aclara para leerse sobre `error-bg`.
    // Usarlo de relleno dejaría el texto blanco del botón en 2.77:1.
    "bg-error-solid text-white border-0 hover:bg-error-strong active:brightness-95 " +
    "disabled:bg-neutral-disabled",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3.5 text-[12.5px] rounded-[7px]",
  md: "h-10 px-[18px] text-sm rounded-md",
  lg: "h-12 px-6 text-[15px] rounded-[9px]",
};

/**
 * Clases de un botón, sin el <button>. Sirve para pintar como botón algo que
 * tiene que ser otro elemento — típicamente un <Link> de next/navigation, donde
 * anidar un <button> dentro del <a> sería HTML inválido.
 */
export function buttonClassName({
  variant = "primary",
  size = "md",
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  leftIcon,
  rightIcon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonClassName({ variant, size, className })}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner size={15} /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Extract<Variant, "secondary" | "ghost" | "tonal">;
  size?: Size;
  "aria-label": string;
}

const iconSizes: Record<Size, string> = {
  sm: "w-8 h-8 rounded-[7px]",
  md: "w-10 h-10 rounded-md",
  lg: "w-12 h-12 rounded-[9px]",
};

export function IconButton({
  variant = "secondary",
  size = "md",
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      className={cn(base, "p-0", variants[variant], iconSizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}
