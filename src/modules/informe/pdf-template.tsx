import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer'
import type { InformePersonalidadJSON } from '@/lib/types/informe'
import { LEYENDA_INFORME } from './competencias'
import { seccionesInforme, type BloqueInforme, type SeccionInforme } from './secciones'
import { DOC } from '@/lib/constants/documento'

/**
 * Informe de personalidad en PDF.
 *
 * Comparte el lenguaje visual del certificado (navy + dorado, cabecera de marca,
 * secciones numeradas con regla dorada) y es espejo de `informe-papel.tsx`: lo
 * que el postulante ve en pantalla y lo que descarga tienen que coincidir.
 */

const styles = StyleSheet.create({
  page: {
    backgroundColor: DOC.white,
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 32,
    fontFamily: 'Helvetica',
  },

  header: {
    backgroundColor: DOC.navy,
    borderRadius: 6,
    borderBottom: `3px solid ${DOC.gold}`,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandName: { fontSize: 20, color: DOC.white, fontFamily: 'Helvetica-Bold', letterSpacing: -0.2 },
  brandTagline: { fontSize: 8, color: DOC.goldLight, fontFamily: 'Helvetica-Oblique', marginTop: 3 },
  docPill: {
    borderRadius: 3,
    border: `1px solid ${DOC.gold}`,
    paddingVertical: 3,
    paddingHorizontal: 8,
    alignSelf: 'flex-end',
  },
  docPillText: { fontSize: 8, color: DOC.goldLight, fontFamily: 'Helvetica-Bold', letterSpacing: 0.6 },
  headerMeta: { fontSize: 7.5, color: DOC.navyMuted, marginTop: 4, textAlign: 'right' },

  identidad: {
    marginTop: 10,
    backgroundColor: DOC.bg,
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  nombre: { fontSize: 19, color: DOC.navy, fontFamily: 'Helvetica-Bold' },
  subtitulo: { fontSize: 10.5, color: DOC.goldDark, fontFamily: 'Helvetica-Bold', marginTop: 3 },
  email: { fontSize: 8.5, color: DOC.soft, marginTop: 6 },

  section: { marginTop: 12 },
  sectionHead: { borderBottom: `1px solid ${DOC.line}`, paddingBottom: 4 },
  sectionTitle: {
    fontSize: 9.5,
    color: DOC.navy,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  sectionRule: { height: 2, width: 46, backgroundColor: DOC.gold, marginTop: 3 },

  descripcionCard: {
    marginTop: 7,
    backgroundColor: DOC.bg,
    borderLeft: `3px solid ${DOC.gold}`,
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  card: {
    marginTop: 7,
    backgroundColor: DOC.bg,
    borderRadius: 5,
    paddingVertical: 10,
    paddingHorizontal: 13,
  },
  bodyText: { fontSize: 9.5, color: DOC.soft, lineHeight: 1.5 },

  // Mapa de personalidad
  mapaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3.5 },
  mapaLabel: { fontSize: 8.5, color: DOC.soft, width: 128 },
  mapaBarTrack: { flex: 1, height: 6, backgroundColor: DOC.line, borderRadius: 3 },
  mapaBarFill: { height: 6, backgroundColor: DOC.gold, borderRadius: 3 },
  mapaScore: { fontSize: 8.5, color: DOC.muted, width: 24, textAlign: 'right' },

  // Ítems y listas de las secciones
  itemBlock: { marginTop: 7.5 },
  itemTitle: { fontSize: 10, color: DOC.navy, fontFamily: 'Helvetica-Bold' },
  itemText: { fontSize: 9, color: DOC.soft, lineHeight: 1.5, marginTop: 1.5 },
  itemNota: { fontSize: 8.5, color: DOC.muted, lineHeight: 1.45, marginTop: 1.5, fontFamily: 'Helvetica-Oblique' },
  listaItem: { fontSize: 9, color: DOC.soft, lineHeight: 1.5, marginTop: 1.5, paddingLeft: 8 },

  footer: { marginTop: 14, paddingTop: 10, borderTop: `1px solid ${DOC.line}` },
  footerText: { fontSize: 7, color: DOC.faint, lineHeight: 1.5 },
})

export type InformePDFProps = {
  informe: InformePersonalidadJSON
  email?: string
  fechaGeneracion?: string
  logoBase64: string
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

function Bloque({ b }: { b: BloqueInforme }) {
  if (b.tipo === 'parrafo') {
    return (
      <View style={styles.descripcionCard}>
        <Text style={styles.bodyText}>{b.texto}</Text>
      </View>
    )
  }
  return (
    <View style={styles.itemBlock} wrap={false}>
      <Text style={styles.itemTitle}>{b.titulo}</Text>
      {b.tipo === 'item' ? (
        <>
          <Text style={styles.itemText}>{b.texto}</Text>
          {b.nota ? <Text style={styles.itemNota}>{b.nota}</Text> : null}
        </>
      ) : (
        b.items.map(i => (
          <Text key={i} style={styles.listaItem}>
            • {i}
          </Text>
        ))
      )}
    </View>
  )
}

export function InformePDF({ informe, email, fechaGeneracion, logoBase64 }: InformePDFProps) {
  const [sintesis, ...resto] = seccionesInforme(informe)
  const fecha = fechaGeneracion
    ? new Date(fechaGeneracion).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null

  const maxScore = Math.max(1, ...informe.mapaPersonalidad.map(m => m.score))
  let n = 0

  const seccion = (sec: SeccionInforme) => (
    <View key={sec.key} style={styles.section}>
      <SectionHead n={++n}>{sec.titulo}</SectionHead>
      {sec.bloques.map((b, i) => (
        <Bloque key={i} b={b} />
      ))}
    </View>
  )

  return (
    <Document title={`Informe de Talentos — ${informe.nombre}`} author="MiLiors">
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
            <View style={styles.docPill}>
              <Text style={styles.docPillText}>INFORME DE TALENTOS</Text>
            </View>
            {fecha && <Text style={styles.headerMeta}>Generado el {fecha}</Text>}
          </View>
        </View>

        {/* Identidad */}
        <View style={styles.identidad}>
          <Text style={styles.nombre}>{informe.nombre}</Text>
          {informe.subtitulo ? <Text style={styles.subtitulo}>{informe.subtitulo}</Text> : null}
          {email ? <Text style={styles.email}>{email}</Text> : null}
        </View>

        {seccion(sintesis)}

        {/* Mapa de personalidad: lo dibuja el sistema, no el LLM. */}
        <View style={styles.section}>
          <SectionHead n={++n}>Mapa de personalidad</SectionHead>
          <View style={styles.card}>
            {[...informe.mapaPersonalidad].sort((a, b) => b.score - a.score).map(m => (
              <View key={m.eneatipo} style={styles.mapaRow}>
                <Text style={styles.mapaLabel}>
                  {m.eneatipo}. {m.nombre}
                </Text>
                <View style={styles.mapaBarTrack}>
                  <View style={[styles.mapaBarFill, { width: `${Math.max(2, (m.score / maxScore) * 100)}%` }]} />
                </View>
                <Text style={styles.mapaScore}>{m.score}</Text>
              </View>
            ))}
          </View>
        </View>

        {resto.map(seccion)}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Generado por MiLiors{fecha ? ` · ${fecha}` : ''}. {LEYENDA_INFORME}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
