import 'server-only'
import { renderToBuffer } from '@react-pdf/renderer'
import QRCode from 'qrcode'
import React from 'react'
import { CertificadoPDF } from './pdf-template'
import type { CertificadoPDFProps } from './pdf-template'

export type CertificadoInput = Omit<CertificadoPDFProps, 'qrBase64'>

export async function generarPDFBuffer(input: CertificadoInput): Promise<Buffer> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://talentid.com.ar'
  const verificarUrl = `${appUrl}/verificar/${input.certificadoId}`

  // Generate QR as base64 PNG
  const qrBase64 = await QRCode.toDataURL(verificarUrl, {
    width: 200,
    margin: 1,
    color: { dark: '#1c2030', light: '#ffffff' },
  })

  const props: CertificadoPDFProps = { ...input, qrBase64 }

  // Render PDF to Buffer
  // @ts-expect-error — renderToBuffer typing mismatch between React versions; works at runtime
  const buffer = await renderToBuffer(React.createElement(CertificadoPDF, props))
  return Buffer.from(buffer)
}
