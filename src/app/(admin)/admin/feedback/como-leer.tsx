import { HelpCircleIcon, ChevronDownIcon } from '@/components/icons'

/**
 * Manual de lectura de la pantalla, in situ.
 *
 * Los números de acá (sesgo, distribución, representatividad) no significan
 * nada sin la convención que los produce, y esa convención vivía sólo en la
 * cabeza de quien la programó y en una línea al pie de la tabla. Quien abre
 * esta pantalla tiene que poder decidir qué tocar en el motor sin preguntarle
 * a nadie.
 *
 * Va en un <details> nativo: cerrado por defecto para no tapar la pantalla a
 * quien ya la conoce, y a un clic de distancia para el que llega por primera
 * vez, sin sumar estado de cliente a una página de servidor.
 */

/** Chip de color de la leyenda, con el mismo tono que pinta la barra de la tabla. */
function Muestra({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className={`h-2.5 w-2.5 flex-none rounded-full ${className}`} />
      <span className="text-[12px] text-ink-soft">{children}</span>
    </span>
  )
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">{titulo}</h3>
      <div className="mt-1.5 space-y-1.5 text-[12.5px] leading-relaxed text-ink-soft">{children}</div>
    </section>
  )
}

const FILAS: { sesgo: string; significa: string; hacer: string; tone: string }[] = [
  {
    sesgo: '+30 o más',
    significa: 'El motor la subestima muchas más veces de las que la sobrestima.',
    hacer: 'Subir su peso en la matriz eneatipo→competencia.',
    tone: 'text-error',
  },
  {
    sesgo: '+15 a +29',
    significa: 'Tiende a quedarse corta.',
    hacer: 'Subir el peso un punto y volver a medir.',
    tone: 'text-warning',
  },
  {
    sesgo: 'Entre −14 y +14',
    significa: 'Calibrada, siempre que el “% correcto” sea alto.',
    hacer: 'No tocar.',
    tone: 'text-success',
  },
  {
    sesgo: '−15 a −29',
    significa: 'Tiende a pasarse.',
    hacer: 'Bajar el peso un punto y volver a medir.',
    tone: 'text-warning',
  },
  {
    sesgo: '−30 o menos',
    significa: 'El motor la sobrestima muchas más veces de las que la subestima.',
    hacer: 'Bajar su peso en la matriz.',
    tone: 'text-error',
  },
]

export function ComoLeer() {
  return (
    <details
      className="group rounded-xl border border-neutral-200 bg-surface [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3">
        <HelpCircleIcon size={15} className="flex-none text-primary-600" />
        <span className="text-[13px] font-bold text-ink">Cómo leer esta pantalla</span>
        <span className="text-[12px] text-muted">y qué hacer con lo que dice</span>
        <ChevronDownIcon
          size={15}
          className="ml-auto flex-none text-neutral-400 transition-transform group-open:rotate-180"
        />
      </summary>

      <div className="grid gap-5 border-t border-neutral-200 px-4 py-4 sm:grid-cols-2">
        <Bloque titulo="De dónde salen estos números">
          <p>
            Cada postulante ve en su informe 13 competencias con un nivel calculado por el motor
            (<span className="font-medium text-ink">Alto</span> a{' '}
            <span className="font-medium text-ink">Bajo</span>). Debajo de cada una elige si ese
            nivel es correcto, o si su nivel real es mayor o menor.
          </p>
          <p>
            La pregunta es <span className="font-medium text-ink">direccional</span> a propósito: un
            simple “no estoy de acuerdo” no diría para qué lado corregir.
          </p>
          <p className="text-[12px] text-muted">
            El postulante responde desde su lado (“mi nivel es mayor”). Acá se lee desde el motor,
            que es lo que se corrige: esa misma respuesta figura como{' '}
            <span className="font-medium text-ink">subestimado</span>.
          </p>
        </Bloque>

        <Bloque titulo="La barra de distribución">
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            <Muestra className="bg-primary-500">Subestimado</Muestra>
            <Muestra className="bg-emerald-500">Correcto</Muestra>
            <Muestra className="bg-amber-500">Sobrestimado</Muestra>
          </div>
          <p>
            Cuanto más verde, mejor calibrada. Azul a la izquierda: el motor se queda corto. Ámbar a
            la derecha: se pasa.
          </p>
        </Bloque>

        <Bloque titulo="El sesgo y qué hacer">
          <p className="text-[12px] text-muted">
            Sesgo = % subestimado − % sobrestimado.
          </p>
          <div className="overflow-hidden rounded-lg border border-neutral-200">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-neutral-50">
                  <th className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-neutral-400">
                    Sesgo
                  </th>
                  <th className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-neutral-400">
                    Qué hacer
                  </th>
                </tr>
              </thead>
              <tbody>
                {FILAS.map(f => (
                  <tr key={f.sesgo} className="border-t border-neutral-200 align-top">
                    <td
                      className={`whitespace-nowrap px-2.5 py-1.5 text-[12px] font-semibold tabular-nums ${f.tone}`}
                    >
                      {f.sesgo}
                    </td>
                    <td className="px-2.5 py-1.5 text-[12px] text-ink-soft">
                      <span className="text-muted">{f.significa}</span> {f.hacer}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Bloque>

        <Bloque titulo="Ojo con el sesgo cerca de cero">
          <p>
            Un sesgo de 0 sale tanto de una competencia bien calibrada como de una{' '}
            <span className="font-medium text-ink">partida al medio</span>: la mitad la ve
            subestimada, la otra mitad sobrestimada, y casi nadie la da por correcta.
          </p>
          <p>
            Por eso hay que mirar el <span className="font-medium text-ink">% correcto</span> al lado. Si
            el sesgo es bajo pero el “% correcto” no llega al 40%, el problema no es el peso: es que esa
            competencia depende de algo que el motor todavía no está mirando.
          </p>
        </Bloque>

        <Bloque titulo="Representatividad y comentarios">
          <p>
            La <span className="font-medium text-ink">representatividad</span> es una sola pregunta
            de cierre: cuánto siente el postulante que el informe lo describe, de 10% a 100%. No
            habla de una competencia puntual sino del texto completo — la redacción, los talentos,
            el “cómo trabaja”.
          </p>
          <p>
            Si el sesgo está sano pero la representatividad es baja, el problema está en la prosa,
            no en el cálculo. Ahí los comentarios de abajo son la fuente.
          </p>
        </Bloque>

        <Bloque titulo="El Excel que se descarga">
          <p>Baja exactamente lo que estos filtros dejan a la vista, en cuatro hojas:</p>
          <ul className="ml-3.5 list-disc space-y-1">
            <li>
              <span className="font-medium text-ink">Resumen</span> — una fila por competencia, con
              el sesgo y qué hacer.
            </li>
            <li>
              <span className="font-medium text-ink">Por nivel</span> — la misma cuenta abierta por
              el nivel que la persona tenía delante. Si una competencia sólo se queja cuando se
              muestra en Alto, hay que tocar el factor de contraste, no su peso.
            </li>
            <li>
              <span className="font-medium text-ink">Comentarios</span> — el texto libre, ordenado
              de peor a mejor puntuado.
            </li>
            <li>
              <span className="font-medium text-ink">Detalle</span> — una fila por respuesta, para
              rehacer las cuentas. Lleva un id seudónimo por postulante — sirve para agrupar sus
              respuestas, nunca expone nombre ni email.
            </li>
          </ul>
        </Bloque>
      </div>
    </details>
  )
}
