import 'server-only'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

// El isotipo se lee una sola vez por proceso: es el mismo archivo en todos los
// documentos y react-pdf necesita los bytes, no una URL.
let cache: string | null = null

/** Isotipo dorado de MiLiors como data URI, para embeber en los PDF. */
export async function getLogoBase64(): Promise<string> {
  if (cache) return cache
  const file = await readFile(path.join(process.cwd(), 'public', 'brand', 'miliors-isotipo.png'))
  cache = `data:image/png;base64,${file.toString('base64')}`
  return cache
}
