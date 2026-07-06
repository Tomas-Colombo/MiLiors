"use client";

import { useId, useState, useRef, useEffect, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "@/components/icons";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  options: SelectOption[];
  placeholder?: string;
}

/**
 * Select nativo estilizado para igualar el trazo de los inputs con chevron
 * a la derecha. Usa <select> real para accesibilidad y manejo móvil.
 */
export function Select({ options, placeholder, className, value, defaultValue, ...props }: SelectProps) {
  const isPlaceholder = (value ?? defaultValue ?? "") === "";
  return (
    <div className="relative">
      <select
        value={value}
        defaultValue={defaultValue}
        className={cn(
          "h-10 w-full cursor-pointer appearance-none rounded-md border border-neutral-300 bg-surface pl-3.5 pr-10 font-sans text-sm outline-none",
          "transition-[border,box-shadow] focus:border-[1.5px] focus:border-primary-600 focus:ring-[3px] focus:ring-primary-50",
          "disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400",
          isPlaceholder ? "text-neutral-400" : "text-ink",
          className,
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled} className="text-ink">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon
        size={16}
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
      />
    </div>
  );
}

export interface SearchableSelectProps {
  name: string
  options: SelectOption[]
  placeholder?: string
  defaultValue?: string
  className?: string
  onValueChange?: (value: string) => void
}

/**
 * Combobox con búsqueda: el usuario puede escribir para filtrar las opciones
 * de la lista pero no puede enviar un valor libre (el valor se fija al
 * seleccionar una opción). Escribe el valor seleccionado en un <input hidden>.
 */
export function SearchableSelect({
  name,
  options,
  placeholder,
  defaultValue,
  className,
  onValueChange,
}: SearchableSelectProps) {
  const initialLabel = options.find((o) => o.value === defaultValue)?.label ?? ""
  const [query, setQuery] = useState(initialLabel)
  const [selected, setSelected] = useState(defaultValue ?? "")
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const currentLabel = options.find((o) => o.value === selected)?.label ?? ""
  const filtered =
    query === currentLabel
      ? options
      : options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))

  function handleSelect(opt: SelectOption) {
    setSelected(opt.value)
    setQuery(opt.label)
    setOpen(false)
    onValueChange?.(opt.value)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
    if (selected) {
      setSelected("")
      onValueChange?.("")
    }
    setOpen(true)
  }

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        if (!selected) {
          const exact = options.find((o) => o.label.toLowerCase() === query.toLowerCase())
          if (exact) {
            setSelected(exact.value)
            setQuery(exact.label)
            onValueChange?.(exact.value)
          } else {
            setQuery(currentLabel)
          }
        }
      }
    }
    document.addEventListener("mousedown", handleOutside)
    return () => document.removeEventListener("mousedown", handleOutside)
  }, [selected, query, currentLabel, options, onValueChange])

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <input type="hidden" name={name} value={selected} />
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className={cn(
          "h-10 w-full rounded-md border border-neutral-300 bg-surface pl-3.5 pr-10 font-sans text-sm outline-none",
          "transition-[border,box-shadow] focus:border-[1.5px] focus:border-primary-600 focus:ring-[3px] focus:ring-primary-50",
          query ? "text-ink" : "text-neutral-400",
        )}
      />
      <ChevronDownIcon
        size={16}
        className={cn(
          "pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 transition-transform",
          open && "rotate-180 text-primary-600",
        )}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-neutral-200 bg-surface p-1.5 shadow-md">
          {filtered.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(opt) }}
              className={cn(
                "flex w-full items-center rounded-[7px] px-[11px] py-[9px] text-left text-[13.5px]",
                opt.value === selected
                  ? "bg-primary-ghost-hover font-semibold text-primary-600"
                  : "text-ink-soft hover:bg-neutral-50",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Variante con menú custom (display-only por defecto) que reproduce el patrón
 * "abierto" del design system: anillo violeta + opción activa resaltada.
 */
export function FancySelect({ options, placeholder, value }: SelectProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>((value as string) ?? "");
  const current = options.find((o) => o.value === selected);

  return (
    <div className="relative" id={id}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md bg-surface px-3.5 text-sm",
          open
            ? "border-[1.5px] border-primary-600 ring-[3px] ring-primary-50"
            : "border border-neutral-300",
        )}
      >
        <span className={current ? "text-ink" : "text-neutral-400"}>
          {current?.label ?? placeholder ?? "Seleccionar"}
        </span>
        <ChevronDownIcon
          size={16}
          className={cn("text-neutral-400 transition-transform", open && "rotate-180 text-primary-600")}
        />
      </button>
      {open && (
        <div className="absolute z-20 mt-2 w-full rounded-lg border border-neutral-200 bg-surface p-1.5 shadow-md">
          {options.map((o) => {
            const active = o.value === selected;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  setSelected(o.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-[7px] px-[11px] py-[9px] text-left text-[13.5px]",
                  active ? "bg-primary-ghost-hover font-semibold text-primary-600" : "text-ink-soft hover:bg-neutral-50",
                )}
              >
                {o.label}
                {active && <ChevronDownIcon size={15} className="-rotate-90 text-primary-600" strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
