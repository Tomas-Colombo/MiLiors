import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { InformeSeleccionJSON } from './prompts'

const colors = {
  primary: '#7c5cfc',
  primaryTint: '#f1edff',
  ink: '#1a1d29',
  soft: '#3c414f',
  muted: '#6b7085',
  faint: '#9aa0b6',
  neutral200: '#e6e7f0',
  white: '#ffffff',
}

const styles = StyleSheet.create({
  page: { backgroundColor: '#faf3f7', paddingTop: 24, paddingBottom: 24, fontFamily: 'Helvetica' },
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
  tituloText: { fontSize: 18, color: colors.ink, fontFamily: 'Helvetica-Bold' },
  bodyText: { fontSize: 10, color: colors.soft, lineHeight: 1.6 },
  // Tabla de ranking
  tableHeader: {
    flexDirection: 'row', backgroundColor: colors.primaryTint,
    borderRadius: 4, paddingVertical: 5, paddingHorizontal: 6, marginBottom: 2,
  },
  tableRow: {
    flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6,
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  thText: { fontSize: 8.5, color: colors.primary, fontFamily: 'Helvetica-Bold' },
  tdText: { fontSize: 9, color: colors.soft },
  tdBold: { fontSize: 9, color: colors.ink, fontFamily: 'Helvetica-Bold' },
  colPos: { width: 50 },
  colNombre: { width: 105 },
  colCompat: { width: 75 },
  colFormacion: { flex: 1, paddingRight: 6 },
  colEstado: { width: 130 },
  // Justificaciones
  itemBlock: { marginBottom: 11 },
  itemTitle: { fontSize: 10.5, color: colors.ink, fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  itemText: { fontSize: 9.5, color: colors.soft, lineHeight: 1.55 },
  footer: { marginTop: 18, paddingTop: 12, borderTop: `1px solid ${colors.neutral200}` },
  footerText: { fontSize: 8, color: colors.faint },
})

export type InformeSeleccionPDFProps = {
  informe: InformeSeleccionJSON
  tituloPuesto: string
  fechaGeneracion?: string
}

function ordinal(posicion: number): string {
  return `${posicion}° Lugar`
}

export function InformeSeleccionPDF({
  informe,
  tituloPuesto,
  fechaGeneracion,
}: InformeSeleccionPDFProps) {
  const fecha = fechaGeneracion
    ? new Date(fechaGeneracion).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <Document title={`Informe de Selección — ${tituloPuesto}`} author="TalentID">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerBrand}>TalentID</Text>
          <Text style={styles.headerTitle}>Informe de Selección</Text>
        </View>

        <View style={styles.body}>
          {/* Encabezado */}
          <View style={styles.section}>
            <Text style={styles.tituloText}>{tituloPuesto}</Text>
          </View>

          {/* 1. Resumen ejecutivo y ranking */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Resumen Ejecutivo y Ranking Final</Text>
            <Text style={[styles.bodyText, { marginBottom: 10 }]}>{informe.resumenEjecutivo}</Text>

            <View style={styles.tableHeader}>
              <Text style={[styles.thText, styles.colPos]}>Puesto</Text>
              <Text style={[styles.thText, styles.colNombre]}>Candidato</Text>
              <Text style={[styles.thText, styles.colCompat]}>Compatibilidad</Text>
              <Text style={[styles.thText, styles.colFormacion]}>Formación</Text>
              <Text style={[styles.thText, styles.colEstado]}>Estado en el proceso</Text>
            </View>
            {informe.ranking.map((r) => (
              <View key={`${r.posicion}-${r.nombre}`} style={styles.tableRow} wrap={false}>
                <Text style={[styles.tdBold, styles.colPos]}>{ordinal(r.posicion)}</Text>
                <Text style={[styles.tdBold, styles.colNombre]}>{r.nombre}</Text>
                <Text style={[styles.tdText, styles.colCompat]}>{r.compatibilidad}</Text>
                <Text style={[styles.tdText, styles.colFormacion]}>{r.formacion}</Text>
                <Text style={[styles.tdText, styles.colEstado]}>{r.estado}</Text>
              </View>
            ))}
          </View>

          {/* 2. Justificación detallada */}
          {informe.justificaciones.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. Justificación Detallada del Ranking</Text>
              {informe.justificaciones.map((j) => (
                <View key={`${j.posicion}-${j.nombre}`} style={styles.itemBlock} wrap={false}>
                  <Text style={styles.itemTitle}>
                    {ordinal(j.posicion)}: {j.nombre} — {j.subtitulo}
                  </Text>
                  <Text style={styles.itemText}>{j.texto}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 3. Postulantes menos relevantes para el puesto */}
          {informe.menosRelevantes.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                3. Postulantes Menos Relevantes para el Puesto
              </Text>
              {informe.menosRelevantes.map((m) => (
                <View key={m.nombre} style={styles.itemBlock} wrap={false}>
                  <Text style={styles.itemTitle}>{m.nombre}</Text>
                  <Text style={styles.itemText}>{m.texto}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Generado por TalentID{fecha ? ` · ${fecha}` : ''} — informe orientativo elaborado con
              IA a partir de los perfiles de la plataforma. La decisión final es del reclutador.
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
