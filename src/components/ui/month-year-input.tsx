"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Input, type InputProps } from "./input";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import {
  PickerPanel,
  PickerNavBtn,
  PickerHeader,
  PickerFooter,
  PickerAction,
  useCerrarAlSalir,
} from "./picker-shell";

const MESES_CORTOS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

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

/** Mes actual como `YYYY-MM`. */
function mesActual(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

export type MonthYearInputProps = Omit<InputProps, "type" | "value" | "onChange" | "min" | "max"> & {
  name: string;
  /** En formato `YYYY-MM`, igual que lo que se envía. */
  defaultValue?: string;
  /** Límites en `YYYY-MM`; los meses fuera del rango quedan deshabilitados. */
  min?: string;
  max?: string;
};

/**
 * Campo de mes y año. Se escribe y se lee como `MM/AAAA`, y viaja al server como
 * `YYYY-MM` por un input oculto: el formato humano nunca llega a la acción.
 *
 * El desplegable es propio y no el `<input type="month">` nativo: ese lo dibuja
 * el navegador con su chrome de sistema, ignora el tema de la app y no hay CSS
 * que lo alcance. Comparte el panel con `DateInput` a través de `picker-shell`.
 *
 * `min`/`max` sólo deshabilitan meses en la grilla; el campo de texto sigue
 * aceptando lo que se escriba, así que la validación de verdad es la del
 * servidor. Acá se trata de no ofrecer lo que después va a ser rechazado.
 */
export function MonthYearInput({
  name,
  defaultValue,
  status,
  min,
  max,
  ...rest
}: MonthYearInputProps) {
  const [display, setDisplay] = useState(() => toDisplay(defaultValue));
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const hidden = toYYYYMM(display);

  // Año que se está mirando; se reposiciona sobre el valor cada vez que abre.
  const [anio, setAnio] = useState(() => Number(hidden.slice(0, 4)) || new Date().getFullYear());

  useCerrarAlSalir(abierto, contenedorRef, () => setAbierto(false));

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const prev = display;
    let v = e.target.value.replace(/[^\d/]/g, "");
    // La barra se pone sola al pasar el mes, pero no al borrar hacia atrás.
    if (v.length === 2 && !v.includes("/") && prev.length < 2) v = v + "/";
    if (v.length <= 7) setDisplay(v);
  }

  function abrir() {
    if (!abierto) setAnio(Number(toYYYYMM(display).slice(0, 4)) || new Date().getFullYear());
    setAbierto((v) => !v);
  }

  function elegir(valor: string) {
    setDisplay(toDisplay(valor));
    setAbierto(false);
  }

  function fueraDeRango(valor: string) {
    if (min && valor < min) return true;
    if (max && valor > max) return true;
    return false;
  }

  const hoy = mesActual();

  return (
    <div ref={contenedorRef} className="relative">
      <input type="hidden" name={name} value={hidden} />

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
        onClick={abrir}
        tabIndex={-1}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        className={cn(
          "absolute right-2.5 top-[19px] -translate-y-1/2 transition-colors hover:text-neutral-600",
          abierto ? "text-primary-600" : "text-neutral-400",
        )}
        aria-label="Seleccionar mes y año"
      >
        <CalendarIcon size={16} />
      </button>

      {abierto && (
        <PickerPanel className="w-[236px]">
          <PickerHeader
            izquierda={
              <>
                <PickerNavBtn label="10 años atrás" onClick={() => setAnio((a) => a - 10)}>
                  <ChevronLeftIcon size={13} />
                  <ChevronLeftIcon size={13} className="-ml-[7px]" />
                </PickerNavBtn>
                <PickerNavBtn label="Año anterior" onClick={() => setAnio((a) => a - 1)}>
                  <ChevronLeftIcon size={15} />
                </PickerNavBtn>
              </>
            }
            derecha={
              <>
                <PickerNavBtn label="Año siguiente" onClick={() => setAnio((a) => a + 1)}>
                  <ChevronRightIcon size={15} />
                </PickerNavBtn>
                <PickerNavBtn label="10 años adelante" onClick={() => setAnio((a) => a + 10)}>
                  <ChevronRightIcon size={13} />
                  <ChevronRightIcon size={13} className="-ml-[7px]" />
                </PickerNavBtn>
              </>
            }
          >
            {anio}
          </PickerHeader>

          <div className="grid grid-cols-3 gap-0.5">
            {MESES_CORTOS.map((etiqueta, i) => {
              const valor = `${anio}-${String(i + 1).padStart(2, "0")}`;
              const activo = valor === hidden;
              const deshabilitado = fueraDeRango(valor);
              return (
                <button
                  key={valor}
                  type="button"
                  disabled={deshabilitado}
                  onClick={() => elegir(valor)}
                  className={cn(
                    "flex h-8 items-center justify-center rounded-[7px] text-[13px] capitalize transition-colors",
                    deshabilitado && "cursor-not-allowed text-neutral-300",
                    !deshabilitado && activo && "bg-primary-600 font-semibold text-white",
                    !deshabilitado && !activo && valor === hoy && "font-semibold text-primary-600 hover:bg-neutral-50",
                    !deshabilitado && !activo && valor !== hoy && "text-ink-soft hover:bg-neutral-50",
                  )}
                >
                  {etiqueta}
                </button>
              );
            })}
          </div>

          <PickerFooter>
            {!fueraDeRango(hoy) ? (
              <PickerAction onClick={() => elegir(hoy)}>Este mes</PickerAction>
            ) : (
              <span />
            )}
            {display && (
              <PickerAction
                tone="muted"
                onClick={() => {
                  setDisplay("");
                  setAbierto(false);
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
