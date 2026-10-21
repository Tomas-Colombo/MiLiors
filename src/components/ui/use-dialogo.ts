"use client";

import { useEffect, useRef, type RefObject } from "react";

/** Elementos que pueden recibir foco dentro del diálogo. */
const FOCUSABLES =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Comportamiento de capa modal compartido por `Modal` y la hoja de navegación
 * mobile: mientras `open` es true cierra con Escape, atrapa el foco adentro
 * (Tab cicla sin salirse), bloquea el scroll del fondo y devuelve el foco a lo
 * que estaba enfocado antes al cerrarse. El foco inicial va al elemento marcado
 * con `data-autofocus` si lo hay, y si no al contenedor, para que el lector de
 * pantalla anuncie el título antes que los botones.
 *
 * `dialogoRef` debe apuntar al contenedor ya montado cuando `open` pasa a true.
 */
export function useDialogo(
  open: boolean,
  dialogoRef: RefObject<HTMLElement | null>,
  onClose: () => void,
) {
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
      // El foco inicial puede estar en el contenedor, que no es ni el primero
      // ni el último: Shift+Tab desde ahí también tiene que ciclar al final.
      if (e.shiftKey && (document.activeElement === primero || document.activeElement === dialogo)) {
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
  }, [open, dialogoRef]);
}
