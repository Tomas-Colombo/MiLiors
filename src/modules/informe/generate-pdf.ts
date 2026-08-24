import 'server-only'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { getLogoBase64 } from '@/lib/documento-logo'
import { InformePDF, type InformePDFProps } from './pdf-template'

export type InformePDFInput = Omit<InformePDFProps, 'logoBase64'>

/**
 * Renderiza el informe de personalidad a PDF on-demand.
 * NO se guarda: se regenera cada vez desde el JSON estructurado.
 */
export async function generarInformePDFBuffer(input: InformePDFInput): Promise<Buffer> {
  const logoBase64 = await getLogoBase64()
  // @ts-expect-error — renderToBuffer typing mismatch between React versions; works at runtime
  const buffer = await renderToBuffer(React.createElement(InformePDF, { ...input, logoBase64 }))
  return Buffer.from(buffer)
}
