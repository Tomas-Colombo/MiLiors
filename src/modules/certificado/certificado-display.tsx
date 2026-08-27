import type { CertificadoContenido } from './queries'
import { agruparPorNivel, type CompetenciaDestacada, type NivelCert } from './niveles'
import { DOC } from '@/lib/constants/documento'
import { verificarLabel } from '@/lib/app-url'
import { Papel, PapelHeader, PapelIdentidad, PapelSectionHead } from '@/components/shared/documento-papel'

/**
 * Previsualización del certificado — espejo en HTML de `pdf-template.tsx`.
 *
 * Se renderiza como "papel": fondo claro y colores fijos aunque la app esté en
 * modo oscuro, porque lo que muestra es un documento impreso, no una pantalla.
 * Si cambia una sección acá, tiene que cambiar también en el PDF: lo que el
 * postulante ve y lo que descarga deben ser lo mismo.
 */

const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const NAVY = DOC.navy
const GOLD = DOC.gold
const GOLD_DARK = DOC.goldDark

const nivelColor: Record<NivelCert, string> = {
  Avanzado: GOLD_DARK,
  Medio: NAVY,
  Básico: DOC.muted,
}

function formatFecha(iso: string | null): string {
  if (!iso) return 'Actualidad'
  const parts = iso.split('-')
  if (parts.length >= 2) return `${MESES[parseInt(parts[1])]} ${parts[0]}`
  return iso
}

function anio(iso: string | null): string {
  return iso ? iso.split('-')[0] : ''
}

function rangoAnios(inicio: string, fin: string | null): string {
  return `${anio(inicio)} - ${fin ? anio(fin) : 'Presente'}`
}

function NivelChips({ items }: { items: { nombre: string; nivel: NivelCert }[] }) {
  return (
    <div className="space-y-1.5">
      {agruparPorNivel(items, i => i.nivel).map(grupo => (
        <div key={grupo.nivel} className="flex items-start gap-3">
          <span
            className="w-16 shrink-0 pt-[3px] text-[11.5px] font-bold"
            style={{ color: nivelColor[grupo.nivel] }}
          >
            {grupo.nivel}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {grupo.items.map((item, i) => (
              <span
                key={i}
                className={
                  grupo.nivel === 'Avanzado'
                    ? 'rounded border border-[#f0d089] bg-[#fdf6e6] px-2 py-0.5 text-[11.5px] font-semibold'
                    : 'rounded border border-[#e6e7f0] bg-white px-2 py-0.5 text-[11.5px] text-[#3c414f]'
                }
                style={grupo.nivel === 'Avanzado' ? { color: GOLD_DARK } : undefined}
              >
                {item.nombre}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ItemRow({ titulo, org, fecha, descripcion }: { titulo: string; org: string; fecha: string; descripcion?: string | null }) {
  return (
    <div className="mt-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13.5px] font-bold" style={{ color: NAVY }}>
          {titulo} <span style={{ color: GOLD_DARK }}>• {org}</span>
        </p>
        <span className="shrink-0 text-[11.5px] text-[#6b7085]">{fecha}</span>
      </div>
      {descripcion && <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#3c414f]">{descripcion}</p>}
    </div>
  )
}

export function CertificadoDisplay({
  data,
  certificadoId,
  emitidoEl,
}: {
  data: CertificadoContenido
  /** Presentes solo cuando el certificado ya fue emitido: habilitan el bloque de verificación. */
  certificadoId?: string
  emitidoEl?: string
}) {
  const sintesis = data.perfilIntegrado ?? data.personalidad
  const destacadas: CompetenciaDestacada[] = data.destacadas
  let n = 0

  return (
    <Papel>
      <PapelHeader
        titulo="Certificado verificado"
        meta={emitidoEl ? <>Emitido el {emitidoEl}</> : undefined}
      />

      <div className="px-5 pb-6 pt-4">
        <PapelIdentidad nombre={data.nombre} subtitulo={data.objetivo}>
          <span>
            <strong className="text-[#1a1d29]">Email:</strong> {data.email}
          </span>
          {data.telefono && (
            <span>
              <strong className="text-[#1a1d29]">Teléfono:</strong> {data.telefono}
            </span>
          )}
          {data.ubicacion && (
            <span>
              <strong className="text-[#1a1d29]">Ubicación:</strong> {data.ubicacion}
            </span>
          )}
          {data.linkedin && (
            <span>
              <strong className="text-[#1a1d29]">LinkedIn:</strong> {data.linkedin}
            </span>
          )}
        </PapelIdentidad>

        {/* 1. Síntesis de personalidad */}
        {sintesis && (
          <section className="mt-5">
            <PapelSectionHead n={++n}>Síntesis de personalidad</PapelSectionHead>
            <div
              className="mt-2 rounded-r-lg bg-[#f7f8fb] px-4 py-3 text-[13px] leading-relaxed text-[#3c414f]"
              style={{ borderLeft: `3px solid ${GOLD}` }}
            >
              {sintesis}
            </div>
          </section>
        )}

        {/* 2. Competencias destacadas */}
        {destacadas.length > 0 && (
          <section className="mt-5">
            <PapelSectionHead n={++n}>Competencias destacadas</PapelSectionHead>
            <div className="mt-2 rounded-lg bg-[#f7f8fb] px-4 py-3">
              <p className="mb-2.5 text-[11.5px] text-[#6b7085]">
                <strong className="text-[#1a1d29]">Evaluación de perfil y estilo de trabajo</strong> (Resultados
                derivados del test de Eneagrama — Tipo {data.eneatipoNumero}: {data.eneatipoNombre})
              </p>
              <NivelChips items={destacadas} />
            </div>
          </section>
        )}

        {/* 3. Habilidades técnicas y herramientas (+ idiomas) */}
        {data.competencias.length > 0 && (
          <section className="mt-5">
            <PapelSectionHead n={++n}>Habilidades técnicas y herramientas</PapelSectionHead>
            <div className="mt-2 rounded-lg bg-[#f7f8fb] px-4 py-3">
              <NivelChips items={data.competencias} />
              {data.idiomas.length > 0 && (
                <p className="mt-3 text-[12.5px] text-[#3c414f]">
                  <strong className="text-[#1a1d29]">Idiomas:</strong>{' '}
                  {data.idiomas.map(i => `${i.nombre} (${i.nivel_idioma.toLowerCase()})`).join(' · ')}
                </p>
              )}
            </div>
          </section>
        )}

        {/* 4. Experiencia laboral */}
        {data.experiencias.length > 0 && (
          <section className="mt-5">
            <PapelSectionHead n={++n}>Experiencia laboral (últimos 3 puestos)</PapelSectionHead>
            {data.experiencias.map((e, i) => (
              <ItemRow
                key={i}
                titulo={e.puesto}
                org={e.empresa}
                fecha={rangoAnios(e.fecha_inicio, e.fecha_fin)}
                descripcion={e.descripcion}
              />
            ))}
          </section>
        )}

        {/* 5. Formación académica (+ cursos) */}
        {(data.formaciones.length > 0 || data.cursos.length > 0) && (
          <section className="mt-5">
            <PapelSectionHead n={++n}>Formación académica</PapelSectionHead>
            {data.formaciones.map((f, i) => (
              <ItemRow
                key={`f${i}`}
                titulo={f.titulo}
                org={f.institucion}
                fecha={f.fecha_graduacion ? `Graduación ${anio(f.fecha_graduacion)}` : 'En curso'}
              />
            ))}
            {data.cursos.map((c, i) => (
              <ItemRow
                key={`c${i}`}
                titulo={c.nombre}
                org={c.institucion}
                fecha={[c.fecha_fin ? formatFecha(c.fecha_fin) : null, c.duracion_horas ? `${c.duracion_horas} h` : null]
                  .filter(Boolean)
                  .join(' · ')}
              />
            ))}
          </section>
        )}

        {/* 6. Verificación — solo con certificado emitido */}
        {certificadoId && (
          <section className="mt-6 rounded-lg bg-[#f7f8fb] p-4">
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.09em]" style={{ color: NAVY }}>
              {++n}. Cómo se comprueba este certificado
            </h3>
            <dl className="space-y-1 text-[12px]">
              <div className="flex gap-3">
                <dt className="w-32 shrink-0 text-[10.5px] uppercase tracking-wide text-[#6b7085]">
                  ID de verificación
                </dt>
                <dd className="font-bold" style={{ color: GOLD_DARK }}>
                  {certificadoId}
                </dd>
              </div>
              {emitidoEl && (
                <div className="flex gap-3">
                  <dt className="w-32 shrink-0 text-[10.5px] uppercase tracking-wide text-[#6b7085]">Emitido</dt>
                  <dd className="font-bold text-[#1a1d29]">{emitidoEl}</dd>
                </div>
              )}
              <div className="flex gap-3">
                <dt className="w-32 shrink-0 text-[10.5px] uppercase tracking-wide text-[#6b7085]">Verificá en</dt>
                <dd>
                  <a
                    href={`/verificar/${certificadoId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold underline"
                    style={{ color: GOLD_DARK }}
                  >
                    {verificarLabel()}
                  </a>
                </dd>
              </div>
            </dl>
            <p className="mt-2.5 text-[10.5px] leading-relaxed text-[#9aa0b6]">
              El PDF descargable lleva el código QR que abre esta verificación. La plataforma confirma que el
              documento fue emitido por MiLiors, que no fue alterado y que sigue vigente. Este certificado acredita la
              información validada por MiLiors; no constituye recomendación de contratación ni evaluación clínica. Las
              competencias reflejan un marco de autoconocimiento (Eneagrama), no un test psicométrico estandarizado.
            </p>
          </section>
        )}

        {/* Transparencia: qué se dejó fuera del certificado y por qué */}
        {data.descartados && data.descartados.length > 0 && (
          <section className="mt-5 border-t border-[#e6e7f0] pt-3">
            <p className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.09em] text-[#6b7085]">
              No incluido en este certificado
            </p>
            {data.descartados.map((d, i) => (
              <p key={i} className="text-[11.5px] leading-relaxed text-[#6b7085]">
                <span className="font-semibold">{d.label}</span> — {d.motivo}
              </p>
            ))}
          </section>
        )}
      </div>
    </Papel>
  )
}
