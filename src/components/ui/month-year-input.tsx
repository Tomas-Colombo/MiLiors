"use client";

import { useRef, useState } from "react";
import { Input, type InputProps } from "./input";
import { CalendarIcon } from "@/components/icons";

/** `'2024-03'` → `'03/2024'`. */
function toDisplay(yyyymm?: string | null): string {
  if (!yyyymm) return "";
  const [y, m] = yyyymm.split("-");
  return m && y ? `${m}/${y}` : "";
}

/** `'03/2024'` → `'2024-03'`. Cadena vacía si todavía está a medio escribir. */
function toYYYYMM(display: string): string {
  const match = display.match(/^(\d{2})\/(\d{4})$/);
  return match ? `${match[2]}-${match[1]}` : "";
}

export type MonthYearInputProps = Omit<InputProps, "type" | "value" | "onChange"> & {
  name: string;
  /** En formato `YYYY-MM`, igual que lo que se envía. */
  defaultValue?: string;
};

/**
 * Campo de mes y año. Se escribe y se lee como `MM/AAAA`, y viaja al server como
 * `YYYY-MM` por un input oculto: el formato humano nunca llega a la acción.
 *
 * El `<input type="month">` nativo va aparte, fuera de la vista, y sólo lo abre
 * el botón del calendario. Ponerlo como campo visible no era opción: su aspecto
 * lo dicta el navegador y no hay forma de que entone con el resto del kit.
 */
export function MonthYearInput({ name, defaultValue, status, ...rest }: MonthYearInputProps) {
  const [display, setDisplay] = useState(() => toDisplay(defaultValue));
  const pickerRef = useRef<HTMLInputElement>(null);
  const hidden = toYYYYMM(display);

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const prev = display;
    let v = e.target.value.replace(/[^\d/]/g, "");
    // La barra se pone sola al pasar el mes, pero no al borrar hacia atrás.
    if (v.length === 2 && !v.includes("/") && prev.length < 2) v = v + "/";
    if (v.length <= 7) setDisplay(v);
  }

  function handlePickerChange(e: React.ChangeEvent<HTMLInputElement>) {
    setDisplay(toDisplay(e.target.value));
  }

  function openPicker() {
    try {
      pickerRef.current?.showPicker();
    } catch {
      pickerRef.current?.click();
    }
  }

  return (
    <>
      <input type="hidden" name={name} value={hidden} />

      <input
        ref={pickerRef}
        type="month"
        value={hidden}
        onChange={handlePickerChange}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />

      <div className="relative">
        <Input
          value={display}
          onChange={handleTextChange}
          placeholder="MM/AAAA"
          maxLength={7}
          status={status}
          inputMode="numeric"
          className="pr-9"
          {...rest}
        />
        <button
          type="button"
          onClick={openPicker}
          tabIndex={-1}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 transition-colors hover:text-neutral-600"
          aria-label="Seleccionar mes y año"
        >
          <CalendarIcon size={16} />
        </button>
      </div>
    </>
  );
}
