import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer'
import { agruparPorNivel, type CompetenciaDestacada, type NivelCert } from './niveles'
import { verificarLabel } from '@/lib/app-url'

/**
 * Certificado de perfil MiLiors.
 *
 * Es una pieza de captación: muestra lo justo para que un reclutador quiera ver
 * el perfil completo, y ese "completo" vive detrás del QR (/verificar/[id]).
 * Por eso la síntesis es un párrafo y no el informe entero.
 *
 * Paleta: navy + dorado de la marca (mismos valores que los tokens de
 * `globals.css`, acá literales porque react-pdf no lee CSS variables).
 */

const colors = {
  navy: '#16213a',
  navySoft: '#24304a',
  gold: '#c79a3f',
  goldDark: '#a4732a',
  goldLight: '#f0d089',
  goldBg: '#fdf6e6',
  ink: '#1a1d29',
  soft: '#3c414f',
  muted: '#6b7085',
  faint: '#9aa0b6',
  line: '#e6e7f0',
  bg: '#f7f8fb',
  white: '#ffffff',
}

/** El dorado no contrasta sobre blanco en texto chico: los niveles altos van en el tono AA. */
const nivelColor: Record<NivelCert, string> = {
  Avanzado: colors.goldDark,
  Medio: colors.navy,
  Básico: colors.muted,
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.white,
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 32,
    fontFamily: 'Helvetica',
  },

  // ── Cabecera de marca ──────────────────────────────────────────────────────
  header: {
    backgroundColor: colors.navy,
    borderRadius: 6,
    borderBottom: `3px solid ${colors.gold}`,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandName: { fontSize: 20, color: colors.white, fontFamily: 'Helvetica-Bold', letterSpacing: -0.2 },
  brandTagline: { fontSize: 8, color: colors.goldLight, fontFamily: 'Helvetica-Oblique', marginTop: 3 },
  verifiedPill: {
    borderRadius: 3,
    border: `1px solid ${colors.gold}`,
    paddingVertical: 3,
    paddingHorizontal: 8,
    alignSelf: 'flex-end',
  },
  verifiedText: { fontSize: 8, color: colors.goldLight, fontFamily: 'Helvetica-Bold', letterSpacing: 0.6 },
  headerMeta: { fontSize: 7.5, color: '#8ea0bd', marginTop: 4, textAlign: 'right' },

  // ── Datos del postulante ───────────────────────────────────────────────────
  perfilCard: {
    marginTop: 10,
    backgroundColor: colors.bg,
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  perfilNombre: { fontSize: 19, color: colors.navy, fontFamily: 'Helvetica-Bold' },
  perfilObjetivo: { fontSize: 10.5, color: colors.goldDark, fontFamily: 'Helvetica-Bold', marginTop: 3 },
  contactoRow: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 3, columnGap: 14, marginTop: 7 },
  contactoText: { fontSize: 8.5, color: colors.soft },
  contactoLabel: { fontFamily: 'Helvetica-Bold', color: colors.ink },

  // ── Secciones ──────────────────────────────────────────────────────────────
  section: { marginTop: 12 },
  sectionHead: { borderBottom: `1px solid ${colors.line}`, paddingBottom: 4 },
  sectionTitle: {
    fontSize: 9.5,
    color: colors.navy,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  sectionRule: { height: 2, width: 46, backgroundColor: colors.gold, marginTop: 3 },

  card: {
    marginTop: 7,
    backgroundColor: colors.bg,
    borderRadius: 5,
    paddingVertical: 10,
    paddingHorizontal: 13,
  },
  sintesisCard: {
    marginTop: 7,
    backgroundColor: colors.bg,
    borderLeft: `3px solid ${colors.gold}`,
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  bodyText: { fontSize: 9.5, color: colors.soft, lineHeight: 1.5 },
  fuenteText: { fontSize: 8.5, color: colors.muted, marginBottom: 8 },
  fuenteStrong: { fontSize: 8.5, color: colors.ink, fontFamily: 'Helvetica-Bold' },

  // ── Filas de nivel + chips ─────────────────────────────────────────────────
  nivelRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  nivelLabel: { width: 58, fontSize: 8.5, fontFamily: 'Helvetica-Bold', paddingTop: 3 },
  chipsWrap: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  chip: {
    borderRadius: 3,
    border: `1px solid ${colors.line}`,
    backgroundColor: colors.white,
    paddingVertical: 2.5,
    paddingHorizontal: 7,
  },
  chipDestacado: { backgroundColor: colors.goldBg, border: `1px solid ${colors.goldLight}` },
  chipText: { fontSize: 8.5, color: colors.soft },
  chipTextDestacado: { fontSize: 8.5, color: colors.goldDark, fontFamily: 'Helvetica-Bold' },

  // ── Ítems (experiencia / formación / cursos) ───────────────────────────────
  item: { marginTop: 7.5 },
  itemHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 },
  itemTitulo: { flex: 1, fontSize: 10, color: colors.navy, fontFamily: 'Helvetica-Bold' },
  itemOrg: { color: colors.goldDark },
  itemFecha: { fontSize: 8.5, color: colors.muted },
  itemDesc: { fontSize: 9, color: colors.soft, lineHeight: 1.5, marginTop: 2 },

  idiomasText: { fontSize: 9, color: colors.soft, marginTop: 8 },

  // ── Verificación ───────────────────────────────────────────────────────────
  verifCard: {
    marginTop: 12,
    backgroundColor: colors.bg,
    borderRadius: 6,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  verifTitle: {
    fontSize: 9,
    color: colors.navy,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 7,
  },
  verifLine: { flexDirection: 'row', marginBottom: 3 },
  verifLabel: { width: 92, fontSize: 8, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  verifValue: { flex: 1, fontSize: 8.5, color: colors.ink, fontFamily: 'Helvetica-Bold' },
  verifValueLink: { flex: 1, fontSize: 8.5, color: colors.goldDark, fontFamily: 'Helvetica-Bold' },
  qrBox: {
    backgroundColor: colors.white,
    border: `1px solid ${colors.line}`,
    borderRadius: 5,
    padding: 7,
    alignItems: 'center',
    width: 108,
  },
  qrCaption: { fontSize: 6.5, color: colors.muted, textAlign: 'center', marginTop: 4, lineHeight: 1.35 },
  legal: { fontSize: 6.8, color: colors.faint, lineHeight: 1.5, marginTop: 8 },
})

export type CertificadoPDFProps = {
  nombre: string
  email: string
  telefono?: string | null
  ubicacion?: string | null
  linkedin?: string | null
  /** Carrera declarada; se muestra bajo el nombre. Sin carrera cargada, no va nada. */
  objetivo?: string
  eneatipoNumero: number
  eneatipoNombre: string
  /** Síntesis de personalidad — un solo párrafo. */
  sintesis?: string
  /** Competencias destacadas derivadas del informe, ya filtradas y agrupadas por nivel. */
  destacadas: CompetenciaDestacada[]
  /** Habilidades técnicas y herramientas del perfil, con el nivel declarado. */
  competencias: { nombre: string; nivel: NivelCert }[]
  idiomas: { nombre: string; nivel_idioma: string }[]
  /** Últimos 3 puestos. */
  experiencias: { puesto: string; empresa: string; fecha_inicio: string; fecha_fin: string | null; descripcion: string | null }[]
  formaciones: { titulo: string; institucion: string; fecha_graduacion: string | null }[]
  cursos: { nombre: string; institucion: string; fecha_fin: string | null; duracion_horas: number | null }[]
  timestampFirma: string
  certificadoId: string
  qrBase64: string // PNG en base64 (data:image/png;base64,...)
  logoBase64: string // isotipo dorado en base64
}

const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function formatFecha(iso: string | null): string {
  if (!iso) return 'Actualidad'
  const parts = iso.split('-')
  if (parts.length >= 2) return `${MESES[parseInt(parts[1])]} ${parts[0]}`
  return iso
}

function anio(iso: string | null): string {
  return iso ? iso.split('-')[0] : ''
}

/** "2023 - Presente" / "2021 - 2023": en el certificado el rango va por año. */
function rangoAnios(inicio: string, fin: string | null): string {
  return `${anio(inicio)} - ${fin ? anio(fin) : 'Presente'}`
}

function SectionHead({ n, children }: { n: number; children: string }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>
        {n}. {children}
      </Text>
      <View style={styles.sectionRule} />
    </View>
  )
}

function NivelChips({ items }: { items: { nombre: string; nivel: NivelCert }[] }) {
  return (
    <>
      {agruparPorNivel(items, i => i.nivel).map(grupo => (
        <View key={grupo.nivel} style={styles.nivelRow} wrap={false}>
          <Text style={[styles.nivelLabel, { color: nivelColor[grupo.nivel] }]}>{grupo.nivel}</Text>
          <View style={styles.chipsWrap}>
            {grupo.items.map((item, i) => {
              const destacado = grupo.nivel === 'Avanzado'
              return (
                <View key={i} style={destacado ? [styles.chip, styles.chipDestacado] : styles.chip}>
                  <Text style={destacado ? styles.chipTextDestacado : styles.chipText}>{item.nombre}</Text>
                </View>
              )
            })}
          </View>
        </View>
      ))}
    </>
  )
}

export function CertificadoPDF({
  nombre,
  email,
  telefono,
  ubicacion,
  linkedin,
  objetivo,
  eneatipoNumero,
  eneatipoNombre,
  sintesis,
  destacadas,
  competencias,
  idiomas,
  experiencias,
  formaciones,
  cursos,
  timestampFirma,
  certificadoId,
  qrBase64,
  logoBase64,
}: CertificadoPDFProps) {
  const fechaFirma = new Date(timestampFirma).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  // Numeramos en runtime: idiomas y cursos van dentro de sus secciones, pero
  // cualquier bloque vacío no debe dejar un hueco en la numeración.
  let n = 0

  return (
    <Document title={`Certificado MiLiors — ${nombre}`} author="MiLiors">
      <Page size="A4" style={styles.page}>
        {/* Cabecera de marca */}
        <View style={styles.header}>
          <View>
            <View style={styles.brandRow}>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image no es un img HTML */}
              <Image src={logoBase64} style={{ width: 28, height: 24 }} />
              <Text style={styles.brandName}>MiLiors</Text>
            </View>
            <Text style={styles.brandTagline}>Talentos al Servicio del Mundo</Text>
          </View>
          <View>
            <View style={styles.verifiedPill}>
              <Text style={styles.verifiedText}>CERTIFICADO VERIFICADO</Text>
            </View>
            <Text style={styles.headerMeta}>ID: {certificadoId}</Text>
            <Text style={styles.headerMeta}>Emitido el {fechaFirma}</Text>
          </View>
        </View>

        {/* Datos del postulante */}
        <View style={styles.perfilCard}>
          <Text style={styles.perfilNombre}>{nombre}</Text>
          {objetivo && <Text style={styles.perfilObjetivo}>{objetivo}</Text>}
          <View style={styles.contactoRow}>
            <Text style={styles.contactoText}>
              <Text style={styles.contactoLabel}>Email: </Text>
              {email}
            </Text>
            {telefono && (
              <Text style={styles.contactoText}>
                <Text style={styles.contactoLabel}>Teléfono: </Text>
                {telefono}
              </Text>
            )}
            {ubicacion && (
              <Text style={styles.contactoText}>
                <Text style={styles.contactoLabel}>Ubicación: </Text>
                {ubicacion}
              </Text>
            )}
            {linkedin && (
              <Text style={styles.contactoText}>
                <Text style={styles.contactoLabel}>LinkedIn: </Text>
                {linkedin}
              </Text>
            )}
          </View>
        </View>

        {/* 1. Síntesis de personalidad */}
        {sintesis && (
          <View style={styles.section}>
            <SectionHead n={++n}>Síntesis de personalidad</SectionHead>
            <View style={styles.sintesisCard}>
              <Text style={styles.bodyText}>{sintesis}</Text>
            </View>
          </View>
        )}

        {/* 2. Competencias destacadas */}
        {destacadas.length > 0 && (
          <View style={styles.section}>
            <SectionHead n={++n}>Competencias destacadas</SectionHead>
            <View style={styles.card}>
              <Text style={styles.fuenteText}>
                <Text style={styles.fuenteStrong}>Evaluación de perfil y estilo de trabajo </Text>
                (Resultados derivados del test de Eneagrama — Tipo {eneatipoNumero}: {eneatipoNombre})
              </Text>
              <NivelChips items={destacadas} />
            </View>
          </View>
        )}

        {/* 3. Habilidades técnicas y herramientas (+ idiomas) */}
        {competencias.length > 0 && (
          <View style={styles.section}>
            <SectionHead n={++n}>Habilidades técnicas y herramientas</SectionHead>
            <View style={styles.card}>
              <NivelChips items={competencias} />
              {idiomas.length > 0 && (
                <Text style={styles.idiomasText}>
                  <Text style={styles.fuenteStrong}>Idiomas: </Text>
                  {idiomas.map(i => `${i.nombre} (${i.nivel_idioma.toLowerCase()})`).join(' · ')}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* 4. Experiencia laboral */}
        {experiencias.length > 0 && (
          <View style={styles.section}>
            <SectionHead n={++n}>Experiencia laboral (últimos 3 puestos)</SectionHead>
            {experiencias.map((e, i) => (
              <View key={i} style={styles.item} wrap={false}>
                <View style={styles.itemHead}>
                  <Text style={styles.itemTitulo}>
                    {e.puesto} <Text style={styles.itemOrg}>• {e.empresa}</Text>
                  </Text>
                  <Text style={styles.itemFecha}>{rangoAnios(e.fecha_inicio, e.fecha_fin)}</Text>
                </View>
                {e.descripcion && <Text style={styles.itemDesc}>{e.descripcion}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* 5. Formación académica (+ cursos) */}
        {(formaciones.length > 0 || cursos.length > 0) && (
          <View style={styles.section}>
            <SectionHead n={++n}>Formación académica</SectionHead>
            {formaciones.map((f, i) => (
              <View key={i} style={styles.item} wrap={false}>
                <View style={styles.itemHead}>
                  <Text style={styles.itemTitulo}>
                    {f.titulo} <Text style={styles.itemOrg}>• {f.institucion}</Text>
                  </Text>
                  <Text style={styles.itemFecha}>
                    {f.fecha_graduacion ? `Graduación ${anio(f.fecha_graduacion)}` : 'En curso'}
                  </Text>
                </View>
              </View>
            ))}
            {cursos.map((c, i) => (
              <View key={i} style={styles.item} wrap={false}>
                <View style={styles.itemHead}>
                  <Text style={styles.itemTitulo}>
                    {c.nombre} <Text style={styles.itemOrg}>• {c.institucion}</Text>
                  </Text>
                  <Text style={styles.itemFecha}>
                    {[c.fecha_fin ? formatFecha(c.fecha_fin) : null, c.duracion_horas ? `${c.duracion_horas} h` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 6. Verificación */}
        <View style={styles.verifCard} wrap={false}>
          <View style={{ flex: 1 }}>
            <Text style={styles.verifTitle}>{++n}. Cómo se comprueba este certificado</Text>
            <View style={styles.verifLine}>
              <Text style={styles.verifLabel}>ID de verificación</Text>
              <Text style={styles.verifValueLink}>{certificadoId}</Text>
            </View>
            <View style={styles.verifLine}>
              <Text style={styles.verifLabel}>Emitido</Text>
              <Text style={styles.verifValue}>{fechaFirma}</Text>
            </View>
            <View style={styles.verifLine}>
              <Text style={styles.verifLabel}>Verificá en</Text>
              <Text style={styles.verifValue}>{verificarLabel()}</Text>
            </View>
            <Text style={styles.legal}>
              Escaneá el código o ingresá el ID de verificación en {verificarLabel()}. La plataforma confirma que
              el documento fue emitido por MiLiors, que no fue alterado y que sigue vigente. Este certificado acredita
              la información validada por MiLiors; no constituye recomendación de contratación ni evaluación clínica.
              Las competencias reflejan un marco de autoconocimiento (Eneagrama), no un test psicométrico
              estandarizado.
            </Text>
          </View>
          <View style={styles.qrBox}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image no es un img HTML */}
            <Image src={qrBase64} style={{ width: 80, height: 80 }} />
            <Text style={styles.qrCaption}>Escaneá el código para ver el perfil de competencias completo</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
