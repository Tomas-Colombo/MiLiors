import Link from 'next/link'
import { HelpCircleIcon, ChevronDownIcon } from '@/components/icons'
import { MAX_CANDIDATOS_SELECCION } from '@/modules/seleccion/constants'

/**
 * Manual de uso de la pantalla, in situ.
 *
 * El asistente compara candidatos entre sí y devuelve un orden de mérito, pero
 * nada en la pantalla lo decía: quien entraba veía una lista y un botón
 * "Consultar" sin saber qué compara, de dónde salió esa lista ni qué recibe a
 * cambio. Las reglas —marcar en Postulaciones, el tope por consulta, que el
 * informe no decide— vivían sólo en el código.
 *
 * Va en un <details> nativo: cerrado por defecto para no tapar la pantalla a
 * quien ya la conoce, y a un clic de distancia para el que llega por primera
 * vez, sin sumar estado de cliente a una página de servidor.
 */

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">{titulo}</h3>
      <div className="mt-1.5 space-y-1.5 text-[12.5px] leading-relaxed text-ink-soft">{children}</div>
    </section>
  )
}

export function ComoFunciona() {
  return (
    <details
      className="group rounded-xl border border-neutral-200 bg-surface [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3">
        <HelpCircleIcon size={15} className="flex-none text-primary-600" />
        <span className="text-[13px] font-bold text-ink">Cómo funciona el asistente</span>
        <span className="text-[12px] text-muted">para qué sirve y cómo se arma la lista</span>
        <ChevronDownIcon
          size={15}
          className="ml-auto flex-none text-neutral-400 transition-transform group-open:rotate-180"
        />
      </summary>

      <div className="grid gap-5 border-t border-neutral-200 px-4 py-4 sm:grid-cols-2">
        <Bloque titulo="Para qué sirve">
          <p>
            Compara <span className="font-medium text-ink">entre sí</span> a los candidatos de este
            puesto y devuelve un informe en PDF con un{' '}
            <span className="font-medium text-ink">orden de mérito</span>: quién se ajusta mejor a
            esta búsqueda en particular, y por qué.
          </p>
          <p>
            No es un evaluador de perfiles sueltos. Para analizar a una persona de forma
            individual está <span className="font-medium text-ink">Evaluar perfil</span>, en cada
            fila de la lista.
          </p>
          <p className="text-[12px] text-muted">
            El informe no decide: ordena y fundamenta. La contratación es siempre del reclutador.
          </p>
        </Bloque>

        <Bloque titulo="Cómo llega un candidato a esta lista">
          <p>
            Ingresa todo candidato marcado con{' '}
            <span className="font-medium text-ink">Avanzar</span> o{' '}
            <span className="font-medium text-ink">En duda</span>, ya sea desde{' '}
            <Link
              href="/reclutador/postulaciones"
              className="font-medium text-primary-600 hover:underline"
            >
              Postulaciones
            </Link>{' '}
            o desde la botonera de cada fila de esta misma pantalla. Ambas marcas avanzan igual; “En
            duda” sólo queda señalada.
          </p>
          <p>
            Sin marca no aparece. Si la lista está vacía, corresponde marcar a algún candidato
            antes de consultar.
          </p>
          <p className="text-[12px] text-muted">
            La ✕ retira a un candidato únicamente de esta comparación: no modifica su marca y la
            lista se restablece al recargar la página. “No avanzar”, en cambio, cierra el proceso
            y lo quita de forma definitiva.
          </p>
        </Bloque>

        <Bloque titulo="Qué mira para comparar">
          <p>
            <span className="font-medium text-ink">Del puesto:</span> título, descripción, carga
            horaria, modalidad, nivel de experiencia y las notas privadas del reclutador.
          </p>
          <p>
            <span className="font-medium text-ink">De cada candidato:</span> su perfil técnico, su
            informe de personalidad y las notas privadas registradas sobre él.
          </p>
          <p className="text-[12px] text-muted">
            Cuanto más completa esté la descripción del puesto, más preciso es el resultado. Si a un
            candidato le falta información, el informe lo señala en lugar de suponerla.
          </p>
        </Bloque>

        <Bloque titulo="Qué te devuelve">
          <p>
            Un PDF con un resumen ejecutivo, el ranking con la compatibilidad de cada uno (
            <span className="font-medium text-ink">Alta</span>,{' '}
            <span className="font-medium text-ink">Media</span> o{' '}
            <span className="font-medium text-ink">Baja</span>), el análisis detallado de los que
            mejor ajustan y una nota breve sobre los <span className="font-medium text-ink">menos
            relevantes</span> para esta búsqueda.
          </p>
          <p className="text-[12px] text-muted">
            “Menos relevante” no es un descarte: sigue en el proceso.
          </p>
        </Bloque>
      </div>

      <div className="border-t border-neutral-200 px-4 py-3 text-[12px] leading-relaxed text-muted">
        Hasta <span className="font-medium text-ink-soft">{MAX_CANDIDATOS_SELECCION} candidatos</span>{' '}
        por consulta. El informe se genera en el momento y no queda almacenado: conviene descargar
        el PDF si se lo va a necesitar más adelante.
      </div>
    </details>
  )
}
