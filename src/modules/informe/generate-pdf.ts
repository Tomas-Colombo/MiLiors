import 'server-only'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { InformePDF, type InformePDFProps } from './pdf-template'

/**
 * Renderiza el informe de personalidad a PDF on-demand.
 * NO se guarda: se regenera cada vez desde el JSON estructurado.
 */
export async function generarInformePDFBuffer(input: InformePDFProps): Promise<Buffer> {
  // @ts-expect-error — renderToBuffer typing mismatch between React versions; works at runtime
  const buffer = await renderToBuffer(React.createElement(InformePDF, input))
  return Buffer.from(buffer)
}
