import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { InformePersonalidadJSON, BloqueCompetencia } from '@/lib/types/informe'
import { BLOQUES_ORDEN, TALENTOS_ACLARACION, barrasAString } from './competencias'

const colors = {
  primary: '#5b4be6',
  primaryTint: '#eeedfd',
  ink: '#1c2030',
  soft: '#4b5160',
  muted: '#6b7280',
  faint: '#9aa0ab',
  neutral200: '#ecedf1',
  white: '#ffffff',
}

const styles = StyleSheet.create({
  // paddingTop/Bottom dan margen en las páginas de continuación; el header lo
  // compensa con marginTop negativo para quedar a tope en la portada.
  page: { backgroundColor: '#f6f7f9', paddingTop: 24, paddingBottom: 24, fontFamily: 'Helvetica' },
  header: { backgroundColor: colors.primary, paddingVertical: 30, paddingHorizontal: 40, marginTop: -24 },
  headerBrand: { fontSize: 20, color: colors.white, fontFamily: 'Helvetica-Bold', letterSpacing: 0.5 },
  headerTitle: {
    fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 12,
    fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 1.5,
  },
  body: {
    paddingHorizontal: 40, paddingTop: 26, paddingBottom: 40,
    backgroundColor: colors.white, marginHorizontal: 24, marginTop: -12, borderRadius: 8,
  },
  section: { marginBottom: 18 },
  sectionTitle: {
    fontSize: 9, color: colors.primary, fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8,
    borderBottom: `1px solid ${colors.neutral200}`, paddingBottom: 4,
  },
  nameText: { fontSize: 22, color: colors.ink, fontFamily: 'Helvetica-Bold' },
  subtitulo: { fontSize: 11, color: colors.muted, marginTop: 2 },
  bodyText: { fontSize: 10, color: colors.soft, lineHeight: 1.6 },
  framing: { fontSize: 8.5, color: colors.muted, fontStyle: 'italic', marginBottom: 10, lineHeight: 1.5 },
  // Mapa
  mapaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  mapaLabel: { fontSize: 9, color: colors.soft, width: 130 },
  mapaBarTrack: { flex: 1, height: 6, backgroundColor: colors.neutral200, borderRadius: 3 },
  mapaBarFill: { height: 6, backgroundColor: colors.primary, borderRadius: 3 },
  mapaScore: { fontSize: 9, color: colors.muted, width: 26, textAlign: 'right' },
  // Bloques
  bloqueTitle: { fontSize: 10, color: colors.ink, fontFamily: 'Helvetica-Bold', marginTop: 8, marginBottom: 4 },
  compRow: { marginBottom: 6 },
  compHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  compName: { fontSize: 10, color: colors.ink, fontFamily: 'Helvetica-Bold' },
  compNivel: { fontSize: 9, color: colors.primary },
  compBarras: { fontSize: 10, color: colors.primary, letterSpacing: 1 },
  compDesc: { fontSize: 9, color: colors.soft, lineHeight: 1.5, marginTop: 1 },
  // Talentos / cómo trabajás
  itemBlock: { marginBottom: 9 },
  itemTitle: { fontSize: 10, color: colors.ink, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  itemText: { fontSize: 9.5, color: colors.soft, lineHeight: 1.55 },
  footer: {
    marginTop: 18, paddingTop: 12, borderTop: `1px solid ${colors.neutral200}`,
  },
  footerText: { fontSize: 8, color: colors.faint },
})

export type InformePDFProps = {
  informe: InformePersonalidadJSON
  email?: string
  fechaGeneracion?: string
}

export function InformePDF({ informe, email, fechaGeneracion }: InformePDFProps) {
  const porBloque = BLOQUES_ORDEN.map((bloque: BloqueCompetencia) => ({
    bloque,
    items: informe.competencias.filter(c => c.bloque === bloque),
  })).filter(b => b.items.length > 0)

  const fecha = fechaGeneracion
    ? new Date(fechaGeneracion).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null

  return (
    <Document title={`Informe de Personalidad — ${informe.nombre}`} author="TalentID">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerBrand}>TalentID</Text>
          <Text style={styles.headerTitle}>Informe de Personalidad</Text>
        </View>

        <View style={styles.body}>
          {/* Encabezado */}
          <View style={styles.section}>
            <Text style={styles.nameText}>{informe.nombre}</Text>
            {informe.subtitulo ? <Text style={styles.subtitulo}>{informe.subtitulo}</Text> : null}
            {email ? <Text style={[styles.bodyText, { marginTop: 3 }]}>{email}</Text> : null}
          </View>

          {/* Descripción */}
          {informe.descripcionPersonalidad ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Breve descripción de personalidad</Text>
              <Text style={styles.bodyText}>{informe.descripcionPersonalidad}</Text>
            </View>
          ) : null}

          {/* Mapa de personalidad */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tu mapa de personalidad</Text>
            {informe.mapaPersonalidad.map(m => (
              <View key={m.eneatipo} style={styles.mapaRow}>
                <Text style={styles.mapaLabel}>{m.eneatipo}. {m.nombre}</Text>
                <View style={styles.mapaBarTrack}>
                  <View style={[styles.mapaBarFill, { width: `${Math.max(2, m.score)}%` }]} />
                </View>
                <Text style={styles.mapaScore}>{m.score}</Text>
              </View>
            ))}
          </View>

          {/* Competencias */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tus competencias</Text>
            {porBloque.map(b => (
              <View key={b.bloque} wrap={false}>
                <Text style={styles.bloqueTitle}>{b.bloque}</Text>
                {b.items.map(c => (
                  <View key={c.nombre} style={styles.compRow}>
                    <View style={styles.compHead}>
                      <Text style={styles.compName}>{c.nombre}</Text>
                      <Text style={styles.compNivel}>
                        {c.nivel}  <Text style={styles.compBarras}>{barrasAString(c.barras)}</Text>
                      </Text>
                    </View>
                    {c.descripcion ? <Text style={styles.compDesc}>{c.descripcion}</Text> : null}
                  </View>
                ))}
              </View>
            ))}
          </View>

          {/* Talentos */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tus 4 talentos más fuertes</Text>
            <Text style={styles.framing}>{TALENTOS_ACLARACION}</Text>
            {informe.talentosTop.map(t => (
              <View key={t.nombre} style={styles.itemBlock} wrap={false}>
                <Text style={styles.itemTitle}>{t.nombre}</Text>
                {t.descripcion ? <Text style={styles.itemText}>{t.descripcion}</Text> : null}
              </View>
            ))}
          </View>

          {/* Cómo trabajás */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cómo trabajás</Text>
            {informe.comoTrabajas.map(item => (
              <View key={item.titulo} style={styles.itemBlock} wrap={false}>
                <Text style={styles.itemTitle}>{item.titulo}</Text>
                {item.texto ? <Text style={styles.itemText}>{item.texto}</Text> : null}
              </View>
            ))}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Generado por TalentID{fecha ? ` · ${fecha}` : ''} — a partir del Eneagrama y Human Design.
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
