import type { CertificadoContenido } from './queries'

/**
 * Render presentacional del contenido del certificado — mismas secciones que el
 * PDF (candidato, perfil de personalidad, formación, experiencia, competencias,
 * idiomas). Sin estado ni hooks; homogéneo con `InformeDisplay`.
 */

const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function formatFecha(iso: string | null): string {
  if (!iso) return 'Actualidad'
  const parts = iso.split('-')
  if (parts.length >= 2) return `${MESES[parseInt(parts[1])]} ${parts[0]}`
  return iso
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-primary-600">{children}</h3>
}

export function CertificadoDisplay({ data }: { data: CertificadoContenido }) {
  const prosa = data.perfilIntegrado ?? data.personalidad
  const parrafos = prosa ? prosa.split(/\n\n+/).map(p => p.trim()).filter(Boolean) : []
  const competenciasTitulo = data.perfilIntegrado ? 'Otras competencias' : 'Competencias'

  return (
    <div className="space-y-6">
      {/* Perfil profesional integrado (personalidad + trayectoria técnica) */}
      <section>
        <SectionTitle>{data.perfilIntegrado ? 'Perfil profesional' : 'Perfil de personalidad'}</SectionTitle>
        <span className="inline-flex rounded bg-primary-50 px-2.5 py-1 text-[13px] font-semibold text-primary-600">
          Eneatipo {data.eneatipoNumero} — {data.eneatipoNombre}
        </span>
        {data.humanDesign && (
          <p className="mt-2 text-[13px] leading-relaxed text-soft">
            <span className="font-semibold text-ink">Human Design:</span> Tipo {data.humanDesign.tipo_energetico} ·
            Autoridad {data.humanDesign.autoridad_hd} · Perfil {data.humanDesign.perfil_hd}
          </p>
        )}
        {parrafos.map((p, i) => (
          <p key={i} className="mt-2 text-[13.5px] leading-relaxed text-ink">{p}</p>
        ))}
      </section>

      {/* Formación académica */}
      {data.formaciones.length > 0 && (
        <section>
          <SectionTitle>Formación académica</SectionTitle>
          <div className="space-y-2">
            {data.formaciones.map((f, i) => (
              <div key={i}>
                <p className="text-[13.5px] font-semibold text-ink">{f.titulo}</p>
                <p className="text-[13px] text-muted">
                  {f.institucion}
                  {f.fecha_graduacion ? ` · ${formatFecha(f.fecha_graduacion)}` : ''}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Experiencia laboral */}
      {data.experiencias.length > 0 && (
        <section>
          <SectionTitle>Experiencia laboral</SectionTitle>
          <div className="space-y-2">
            {data.experiencias.map((e, i) => (
              <div key={i}>
                <p className="text-[13.5px] font-semibold text-ink">{e.puesto}</p>
                <p className="text-[13px] text-muted">
                  {e.empresa} · {formatFecha(e.fecha_inicio)} — {formatFecha(e.fecha_fin)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Competencias e idiomas */}
      {(data.competencias.length > 0 || data.idiomas.length > 0) && (
        <section className="grid gap-6 sm:grid-cols-2">
          {data.competencias.length > 0 && (
            <div>
              <SectionTitle>{competenciasTitulo}</SectionTitle>
              <div className="flex flex-wrap gap-1.5">
                {data.competencias.map((c, i) => (
                  <span key={i} className="rounded bg-neutral-100 px-2 py-0.5 text-[12.5px] text-soft">
                    {c.nombre}
                  </span>
                ))}
              </div>
            </div>
          )}
          {data.idiomas.length > 0 && (
            <div>
              <SectionTitle>Idiomas</SectionTitle>
              <div className="space-y-1">
                {data.idiomas.map((idioma, i) => (
                  <p key={i} className="text-[13px] text-soft">
                    {idioma.nombre} — {idioma.nivel_idioma}
                  </p>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
