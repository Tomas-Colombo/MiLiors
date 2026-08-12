import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer'

// Design System palette
const colors = {
  primary: '#7c5cfc',
  primaryTint: '#f1edff',
  ink: '#1a1d29',
  soft: '#3c414f',
  muted: '#6b7085',
  faint: '#9aa0b6',
  neutral200: '#e6e7f0',
  white: '#ffffff',
  successFg: '#178a52',
  successBg: '#e3f7ed',
}

const styles = StyleSheet.create({
  // paddingTop/Bottom dan margen en las páginas de continuación; el header lo
  // compensa con marginTop negativo para quedar a tope en la portada.
  page: {
    backgroundColor: '#faf3f7',
    paddingTop: 24,
    paddingBottom: 24,
    fontFamily: 'Helvetica',
  },
  header: {
    backgroundColor: colors.primary,
    paddingVertical: 32,
    paddingHorizontal: 40,
    marginTop: -24,
  },
  headerBrand: {
    fontSize: 22,
    color: colors.white,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
  },
  headerTagline: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  headerTitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 14,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  body: {
    paddingHorizontal: 40,
    paddingTop: 28,
    paddingBottom: 40,
    backgroundColor: colors.white,
    marginHorizontal: 24,
    marginTop: -12,
    borderRadius: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 9,
    color: colors.primary,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
    borderBottom: `1px solid ${colors.neutral200}`,
    paddingBottom: 4,
  },
  nameText: {
    fontSize: 22,
    color: colors.ink,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  eneatipoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  eneatipoTag: {
    backgroundColor: colors.primaryTint,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  eneatipoText: {
    fontSize: 11,
    color: colors.primary,
    fontFamily: 'Helvetica-Bold',
  },
  bodyText: {
    fontSize: 10,
    color: colors.soft,
    lineHeight: 1.6,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  col: {
    flex: 1,
    minWidth: 200,
  },
  itemRow: {
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 10,
    color: colors.ink,
    fontFamily: 'Helvetica-Bold',
  },
  fortalezaItem: {
    marginBottom: 10,
    paddingLeft: 10,
    borderLeft: `2px solid ${colors.primaryTint}`,
  },
  fortalezaTitulo: {
    fontSize: 10,
    color: colors.ink,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  itemSub: {
    fontSize: 9,
    color: colors.muted,
    marginTop: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successBg,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  badgeText: {
    fontSize: 9,
    color: colors.successFg,
    fontFamily: 'Helvetica-Bold',
  },
  footer: {
    marginTop: 24,
    paddingTop: 14,
    borderTop: `1px solid ${colors.neutral200}`,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  footerText: {
    fontSize: 8,
    color: colors.faint,
  },
  qrContainer: {
    alignItems: 'flex-end',
  },
  qrLabel: {
    fontSize: 7,
    color: colors.faint,
    marginBottom: 3,
    textAlign: 'right',
  },
})

export type CertificadoPDFProps = {
  nombre: string
  email: string
  eneatipoNumero: number
  eneatipoNombre: string
  humanDesign: {
    tipo_energetico: string
    autoridad_hd: string
    perfil_hd: string
    estrategia_hd: string
  } | null
  formaciones: { titulo: string; institucion: string; fecha_graduacion: string | null }[]
  cursos: { nombre: string; institucion: string; fecha_fin: string | null; duracion_horas: number | null }[]
  experiencias: { puesto: string; empresa: string; fecha_inicio: string; fecha_fin: string | null }[]
  idiomas: { nombre: string; nivel_idioma: string }[]
  /** Competencias a listar: cuando hay perfil integrado, son solo las NO integradas. */
  competencias: { nombre: string }[]
  /** "¿Qué estudiaste / qué buscás?" declarado en el perfil — nunca vacío al emitir. */
  objetivo?: string
  /** Perfil profesional integrado (personalidad + trayectoria técnica), en 3ª persona. */
  perfilIntegrado?: string
  /** Cruces personalidad × perfil técnico. Ausente en síntesis v1. */
  fortalezas?: { titulo: string; texto: string }[]
  /** Entorno donde despliega su potencial. Ausente en síntesis v1. */
  contextoIdeal?: string
  /** Fallback: párrafo de personalidad del informe (si no hay perfil integrado). */
  personalidad?: string
  timestampFirma: string
  certificadoId: string
  qrBase64: string // PNG en base64 (data:image/png;base64,...)
}

function formatFecha(iso: string | null): string {
  if (!iso) return 'Actualidad'
  // iso puede ser 'YYYY-MM' o 'YYYY-MM-DD'
  const parts = iso.split('-')
  const meses = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  if (parts.length >= 2) {
    return `${meses[parseInt(parts[1])]} ${parts[0]}`
  }
  return iso
}

export function CertificadoPDF({
  nombre,
  email,
  eneatipoNumero,
  eneatipoNombre,
  humanDesign,
  formaciones,
  cursos,
  experiencias,
  idiomas,
  competencias,
  objetivo,
  perfilIntegrado,
  fortalezas,
  contextoIdeal,
  personalidad,
  timestampFirma,
  certificadoId,
  qrBase64,
}: CertificadoPDFProps) {
  const prosa = perfilIntegrado ?? personalidad
  const parrafos = prosa ? prosa.split(/\n\n+/).map(p => p.trim()).filter(Boolean) : []
  const fechaFirma = new Date(timestampFirma).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return (
    <Document title={`Certificado TalentID — ${nombre}`} author="TalentID">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerBrand}>TalentID</Text>
          <Text style={styles.headerTagline}>Plataforma de Reclutamiento con Perfilado de Personalidad</Text>
          <Text style={styles.headerTitle}>Certificado de Perfil Verificado</Text>
        </View>

        {/* Body card */}
        <View style={styles.body}>

          {/* Sección: Datos del candidato */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Candidato</Text>
            <Text style={styles.nameText}>{nombre}</Text>
            <Text style={styles.bodyText}>{email}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>✓ Perfil verificado por TalentID</Text>
            </View>
          </View>

          {/* Sección: Perfil profesional integrado */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{perfilIntegrado ? 'Perfil Profesional' : 'Perfil de Personalidad'}</Text>
            {objetivo && (
              <Text style={[styles.bodyText, { marginBottom: 6 }]}>
                <Text style={{ fontFamily: 'Helvetica-Bold', color: colors.ink }}>Qué estudió / qué busca: </Text>
                {objetivo}
              </Text>
            )}
            <View style={styles.eneatipoRow}>
              <View style={styles.eneatipoTag}>
                <Text style={styles.eneatipoText}>Eneatipo {eneatipoNumero} — {eneatipoNombre}</Text>
              </View>
            </View>
            {humanDesign && (
              <View style={{ marginTop: 10 }}>
                <Text style={[styles.bodyText, { marginBottom: 3 }]}>Human Design:</Text>
                <Text style={styles.bodyText}>
                  Tipo: {humanDesign.tipo_energetico} · Autoridad: {humanDesign.autoridad_hd} · Perfil: {humanDesign.perfil_hd}
                </Text>
              </View>
            )}
            {parrafos.map((p, i) => (
              <Text key={i} style={[styles.bodyText, { marginTop: 8 }]}>{p}</Text>
            ))}
          </View>

          {/* Sección: Fortalezas en acción — cada rasgo anclado en el perfil técnico */}
          {fortalezas && fortalezas.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Fortalezas en Acción</Text>
              {fortalezas.map((f, i) => (
                // wrap={false} evita que una fortaleza quede partida entre dos páginas.
                <View key={i} style={styles.fortalezaItem} wrap={false}>
                  <Text style={styles.fortalezaTitulo}>{f.titulo}</Text>
                  <Text style={styles.bodyText}>{f.texto}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Sección: Contexto donde rinde mejor */}
          {contextoIdeal && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contexto Donde Rinde Mejor</Text>
              <Text style={styles.bodyText}>{contextoIdeal}</Text>
            </View>
          )}

          {/* Sección: Formación académica */}
          {formaciones.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Formación Académica</Text>
              {formaciones.map((f, i) => (
                <View key={i} style={styles.itemRow}>
                  <Text style={styles.itemTitle}>{f.titulo}</Text>
                  <Text style={styles.itemSub}>
                    {f.institucion}{f.fecha_graduacion ? ` · ${formatFecha(f.fecha_graduacion)}` : ''}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Sección: Cursos */}
          {cursos.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cursos y Capacitaciones</Text>
              {cursos.map((c, i) => (
                <View key={i} style={styles.itemRow}>
                  <Text style={styles.itemTitle}>{c.nombre}</Text>
                  <Text style={styles.itemSub}>
                    {[
                      c.institucion,
                      c.fecha_fin ? formatFecha(c.fecha_fin) : null,
                      c.duracion_horas ? `${c.duracion_horas} h` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Sección: Experiencia */}
          {experiencias.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Experiencia Laboral</Text>
              {experiencias.map((e, i) => (
                <View key={i} style={styles.itemRow}>
                  <Text style={styles.itemTitle}>{e.puesto}</Text>
                  <Text style={styles.itemSub}>
                    {e.empresa} · {formatFecha(e.fecha_inicio)} — {formatFecha(e.fecha_fin)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Competencias e idiomas */}
          <View style={[styles.section, styles.row]}>
            {competencias.length > 0 && (
              <View style={styles.col}>
                <Text style={styles.sectionTitle}>{perfilIntegrado ? 'Otras Competencias' : 'Competencias'}</Text>
                <Text style={styles.bodyText}>{competencias.map(c => c.nombre).join(' · ')}</Text>
              </View>
            )}
            {idiomas.length > 0 && (
              <View style={styles.col}>
                <Text style={styles.sectionTitle}>Idiomas</Text>
                {idiomas.map((idioma, idx) => (
                  <Text key={idx} style={styles.bodyText}>{idioma.nombre} — {idioma.nivel_idioma}</Text>
                ))}
              </View>
            )}
          </View>

          {/* Footer: firma + QR */}
          <View style={styles.footer}>
            <View>
              <Text style={styles.footerText}>Firmado digitalmente el {fechaFirma}</Text>
              <Text style={styles.footerText}>ID de verificación: {certificadoId}</Text>
              <Text style={styles.footerText}>talentid.com.ar/verificar/{certificadoId}</Text>
            </View>
            <View style={styles.qrContainer}>
              <Text style={styles.qrLabel}>Escanear para verificar</Text>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image is not an HTML img; alt prop does not exist */}
              <Image src={qrBase64} style={{ width: 72, height: 72 }} />
            </View>
          </View>

        </View>
      </Page>
    </Document>
  )
}
