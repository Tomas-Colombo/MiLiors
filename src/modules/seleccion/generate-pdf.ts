import 'server-only'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { InformeSeleccionPDF, type InformeSeleccionPDFProps } from './pdf-template'

/**
 * Renderiza el informe de selección a PDF on-demand.
 * NO se guarda: se genera, se descarga y se descarta.
 */
export async function generarInformeSeleccionPDFBuffer(
  input: InformeSeleccionPDFProps
): Promise<Buffer> {
  // @ts-expect-error — renderToBuffer typing mismatch between React versions; works at runtime
  const buffer = await renderToBuffer(React.createElement(InformeSeleccionPDF, input))
  return Buffer.from(buffer)
}
