import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer'
import type { InformePersonalidadJSON, BloqueCompetencia, NivelCompetencia } from '@/lib/types/informe'
import { BLOQUES_ORDEN, TALENTOS_ACLARACION } from './competencias'
import { DOC } from '@/lib/constants/documento'

/**
 * Informe de personalidad en PDF.
 *
 * Comparte el lenguaje visual del certificado (navy + dorado, cabecera de marca,
 * secciones numeradas con regla dorada) y es espejo de `informe-papel.tsx`: lo
 * que el postulante ve en pantalla y lo que descarga tienen que coincidir.
 */

/** Los niveles altos van en el dorado AA; el resto en navy/gris para no gritar. */
const nivelColor: Record<NivelCompetencia, string> = {
  'Alto': DOC.goldDark,
  'Medio-Alto': DOC.goldDark,
  'Medio': DOC.navy,
  'Medio-Bajo': DOC.muted,
  'Bajo': DOC.muted,
}

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
  framing: { fontSize: 8, color: DOC.muted, fontFamily: 'Helvetica-Oblique', marginTop: 6, lineHeight: 1.45 },

  // Mapa de personalidad
  mapaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3.5 },
  mapaLabel: { fontSize: 8.5, color: DOC.soft, width: 128 },
  mapaBarTrack: { flex: 1, height: 6, backgroundColor: DOC.line, borderRadius: 3 },
  mapaBarFill: { height: 6, backgroundColor: DOC.gold, borderRadius: 3 },
  mapaScore: { fontSize: 8.5, color: DOC.muted, width: 24, textAlign: 'right' },

  // Competencias
  bloqueTitle: { fontSize: 9.5, color: DOC.navy, fontFamily: 'Helvetica-Bold', marginTop: 9, marginBottom: 4 },
  compRow: { marginBottom: 6 },
  compHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  compName: { flex: 1, fontSize: 9.5, color: DOC.ink, fontFamily: 'Helvetica-Bold' },
  compNivelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  compNivel: { fontSize: 8.5, fontFamily: 'Helvetica-Bold' },
  barras: { flexDirection: 'row', gap: 1.5 },
  barra: { width: 6, height: 6, borderRadius: 1 },
  compDesc: { fontSize: 9, color: DOC.soft, lineHeight: 1.45, marginTop: 1.5 },

  // Talentos / cómo trabajás
  itemBlock: { marginTop: 7.5 },
  itemTitle: { fontSize: 10, color: DOC.navy, fontFamily: 'Helvetica-Bold' },
  itemText: { fontSize: 9, color: DOC.soft, lineHeight: 1.5, marginTop: 1.5 },

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

function Barras({ n, tone }: { n: number; tone: string }) {
  return (
    <View style={styles.barras}>
      {[0, 1, 2, 3, 4].map(i => (
        <View key={i} style={[styles.barra, { backgroundColor: i < n ? tone : DOC.line }]} />
      ))}
    </View>
  )
}

export function InformePDF({ informe, email, fechaGeneracion, logoBase64 }: InformePDFProps) {
  const porBloque = BLOQUES_ORDEN.map((bloque: BloqueCompetencia) => ({
    bloque,
    items: informe.competencias.filter(c => c.bloque === bloque),
  })).filter(b => b.items.length > 0)

  const fecha = fechaGeneracion
    ? new Date(fechaGeneracion).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null

  const maxScore = Math.max(1, ...informe.mapaPersonalidad.map(m => m.score))
  let n = 0

  return (
    <Document title={`Informe de Personalidad — ${informe.nombre}`} author="MiLiors">
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
              <Text style={styles.docPillText}>INFORME DE PERSONALIDAD</Text>
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

        {/* 1. Descripción */}
        {informe.descripcionPersonalidad ? (
          <View style={styles.section}>
            <SectionHead n={++n}>Breve descripción de personalidad</SectionHead>
            <View style={styles.descripcionCard}>
              <Text style={styles.bodyText}>{informe.descripcionPersonalidad}</Text>
            </View>
          </View>
        ) : null}

        {/* 2. Mapa de personalidad */}
        <View style={styles.section}>
          <SectionHead n={++n}>Tu mapa de personalidad</SectionHead>
          <View style={styles.card}>
            {informe.mapaPersonalidad.map(m => (
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

        {/* 3. Competencias */}
        <View style={styles.section}>
          <SectionHead n={++n}>Tus competencias</SectionHead>
          {porBloque.map(b => (
            <View key={b.bloque} wrap={false}>
              <Text style={styles.bloqueTitle}>{b.bloque}</Text>
              {b.items.map(c => (
                <View key={c.nombre} style={styles.compRow}>
                  <View style={styles.compHead}>
                    <Text style={styles.compName}>{c.nombre}</Text>
                    <View style={styles.compNivelRow}>
                      <Text style={[styles.compNivel, { color: nivelColor[c.nivel] }]}>{c.nivel}</Text>
                      <Barras n={c.barras} tone={nivelColor[c.nivel]} />
                    </View>
                  </View>
                  {c.descripcion ? <Text style={styles.compDesc}>{c.descripcion}</Text> : null}
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* 4. Talentos */}
        {informe.talentosTop.length > 0 && (
          <View style={styles.section}>
            <SectionHead n={++n}>Tus 4 talentos más fuertes</SectionHead>
            <Text style={styles.framing}>{TALENTOS_ACLARACION}</Text>
            {informe.talentosTop.map(t => (
              <View key={t.nombre} style={styles.itemBlock} wrap={false}>
                <Text style={styles.itemTitle}>{t.nombre}</Text>
                {t.descripcion ? <Text style={styles.itemText}>{t.descripcion}</Text> : null}
              </View>
            ))}
          </View>
        )}

        {/* 5. Cómo trabajás */}
        {informe.comoTrabajas.length > 0 && (
          <View style={styles.section}>
            <SectionHead n={++n}>Cómo trabajás</SectionHead>
            {informe.comoTrabajas.map(item => (
              <View key={item.titulo} style={styles.itemBlock} wrap={false}>
                <Text style={styles.itemTitle}>{item.titulo}</Text>
                {item.texto ? <Text style={styles.itemText}>{item.texto}</Text> : null}
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Generado por MiLiors{fecha ? ` · ${fecha}` : ''} a partir del Eneagrama y Human Design. Es un marco de
            autoconocimiento, no un test psicométrico estandarizado ni una evaluación clínica.
          </Text>
        </View>
      </Page>
    </Document>
  )
}
