import 'server-only'
import { renderToBuffer } from '@react-pdf/renderer'
import QRCode from 'qrcode'
import React from 'react'
import { appUrlPublico } from '@/lib/app-url'
import { getLogoBase64 } from '@/lib/documento-logo'
import { CertificadoPDF } from './pdf-template'
import type { CertificadoPDFProps } from './pdf-template'

export type CertificadoInput = Omit<CertificadoPDFProps, 'qrBase64' | 'logoBase64'>

export async function generarPDFBuffer(input: CertificadoInput): Promise<Buffer> {
  const verificarUrl = appUrlPublico(`/verificar/${input.certificadoId}`)

  const [qrBase64, logoBase64] = await Promise.all([
    QRCode.toDataURL(verificarUrl, {
      width: 240,
      margin: 1,
      color: { dark: '#16213a', light: '#ffffff' },
    }),
    getLogoBase64(),
  ])

  const props: CertificadoPDFProps = { ...input, qrBase64, logoBase64 }

  // Render PDF to Buffer
  // @ts-expect-error — renderToBuffer typing mismatch between React versions; works at runtime
  const buffer = await renderToBuffer(React.createElement(CertificadoPDF, props))
  return Buffer.from(buffer)
}
