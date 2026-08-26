"use client";

import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import {
  PickerPanel,
  PickerNavBtn,
  PickerHeader,
  PickerFooter,
  PickerAction,
  useCerrarAlSalir,
} from "./picker-shell";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// Semana arrancando en lunes (convención local).
const DIAS = ["L", "M", "M", "J", "V", "S", "D"];

/** "YYYY-MM-DD" → Date local (evita el corrimiento de zona horaria de `new Date(iso)`). */
function parseISO(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toISO(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function formatDisplay(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export interface DateInputProps {
  /** Valor en formato "YYYY-MM-DD" (igual que un <input type="date">). */
  value: string;
  onChange: (value: string) => void;
  /** Límites en formato "YYYY-MM-DD"; los días fuera del rango quedan deshabilitados. */
  min?: string;
  max?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  name?: string;
  id?: string;
  "aria-label"?: string;
}

/**
 * Campo de fecha con calendario propio: reemplaza al <input type="date"> nativo
 * (cuyo picker es chrome del browser y no se puede estilar) por el mismo panel
 * flotante que usan FancySelect / SearchableSelect.
 */
export function DateInput({
  value,
  onChange,
  min,
  max,
  placeholder = "dd/mm/aaaa",
  disabled,
  className,
  name,
  id,
  "aria-label": ariaLabel,
}: DateInputProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = parseISO(value);
  const minDate = min ? parseISO(min) : null;
  const maxDate = max ? parseISO(max) : null;

  // Mes que se está mirando; se reposiciona sobre el valor cada vez que se abre.
  const [view, setView] = useState(() => selected ?? new Date());

  function toggle() {
    if (!open) setView(parseISO(value) ?? new Date());
    setOpen((v) => !v);
  }

  useCerrarAlSalir(open, containerRef, () => setOpen(false));

  const celdas = useMemo(() => {
    const anio = view.getFullYear();
    const mes = view.getMonth();
    const primero = new Date(anio, mes, 1);
    const offset = (primero.getDay() + 6) % 7; // lunes = 0
    const total = new Date(anio, mes + 1, 0).getDate();
    return [
      ...Array.from({ length: offset }, () => null),
      ...Array.from({ length: total }, (_, i) => new Date(anio, mes, i + 1)),
    ];
  }, [view]);

  const hoyISO = toISO(new Date());

  function fueraDeRango(d: Date) {
    if (minDate && d < minDate) return true;
    if (maxDate && d > maxDate) return true;
    return false;
  }

  function moverMes(delta: number) {
    setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1));
  }

  function elegir(d: Date) {
    onChange(toISO(d));
    setOpen(false);
  }

  return (
    <div ref={containerRef} className={cn("relative", className)} id={id}>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggle}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-md bg-surface px-3.5 text-sm outline-none",
          "disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400",
          open ? "border-[1.5px] border-primary-600 ring-[3px] ring-primary-50" : "border border-neutral-300",
        )}
      >
        <span className={cn("truncate", selected ? "text-ink" : "text-neutral-400")}>
          {selected ? formatDisplay(selected) : placeholder}
        </span>
        <CalendarIcon size={16} className={cn("shrink-0 text-neutral-400", open && "text-primary-600")} />
      </button>

      {open && (
        <PickerPanel className="w-[268px]">
          <PickerHeader
            izquierda={
              <>
                <PickerNavBtn label="Año anterior" onClick={() => setView((v) => new Date(v.getFullYear() - 1, v.getMonth(), 1))}>
                  <ChevronLeftIcon size={13} />
                  <ChevronLeftIcon size={13} className="-ml-[7px]" />
                </PickerNavBtn>
                <PickerNavBtn label="Mes anterior" onClick={() => moverMes(-1)}>
                  <ChevronLeftIcon size={15} />
                </PickerNavBtn>
              </>
            }
            derecha={
              <>
                <PickerNavBtn label="Mes siguiente" onClick={() => moverMes(1)}>
                  <ChevronRightIcon size={15} />
                </PickerNavBtn>
                <PickerNavBtn label="Año siguiente" onClick={() => setView((v) => new Date(v.getFullYear() + 1, v.getMonth(), 1))}>
                  <ChevronRightIcon size={13} />
                  <ChevronRightIcon size={13} className="-ml-[7px]" />
                </PickerNavBtn>
              </>
            }
          >
            {MESES[view.getMonth()]} {view.getFullYear()}
          </PickerHeader>

          <div className="grid grid-cols-7 gap-0.5 pb-1">
            {DIAS.map((d, i) => (
              <span key={i} className="flex h-6 items-center justify-center text-[10px] font-bold uppercase text-neutral-400">
                {d}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {celdas.map((d, i) => {
              if (!d) return <span key={`v${i}`} />;
              const iso = toISO(d);
              const activo = iso === value;
              const deshabilitado = fueraDeRango(d);
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={deshabilitado}
                  onClick={() => elegir(d)}
                  className={cn(
                    "flex h-8 items-center justify-center rounded-[7px] text-[13px] transition-colors",
                    deshabilitado && "cursor-not-allowed text-neutral-300",
                    !deshabilitado && activo && "bg-primary-600 font-semibold text-white",
                    !deshabilitado && !activo && iso === hoyISO && "font-semibold text-primary-600 hover:bg-neutral-50",
                    !deshabilitado && !activo && iso !== hoyISO && "text-ink-soft hover:bg-neutral-50",
                  )}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          <PickerFooter>
            <PickerAction onClick={() => elegir(new Date())}>Hoy</PickerAction>
            {value && (
              <PickerAction
                tone="muted"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                Limpiar
              </PickerAction>
            )}
          </PickerFooter>
        </PickerPanel>
      )}
    </div>
  );
}
