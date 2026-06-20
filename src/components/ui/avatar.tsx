import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const sizes: Record<Size, string> = {
  sm: "h-[34px] w-[34px] text-xs",
  md: "h-[42px] w-[42px] text-sm",
  lg: "h-[52px] w-[52px] text-base",
};

const statusColor = {
  online: "bg-success-solid",
  busy: "bg-error-solid",
  away: "bg-warning-solid",
  offline: "bg-neutral-400",
};

export interface AvatarProps {
  /** Iniciales o texto corto. Si se omite, muestra el gradiente de marca. */
  initials?: string;
  /** Color de fondo sólido (p. ej. logo de empresa). Por defecto, gradiente. */
  color?: string;
  size?: Size;
  status?: keyof typeof statusColor;
  className?: string;
}

export function Avatar({ initials, color, size = "md", status, className }: AvatarProps) {
  return (
    <span className={cn("relative inline-flex flex-none", sizes[size], className)}>
      <span
        className="flex h-full w-full items-center justify-center rounded-full font-bold text-white"
        style={{ background: color ?? "var(--gradient-avatar)" }}
      >
        {initials}
      </span>
      {status && (
        <span
          className={cn(
            "absolute bottom-px right-0 h-[13px] w-[13px] rounded-full border-[2.5px] border-surface",
            statusColor[status],
          )}
        />
      )}
    </span>
  );
}
