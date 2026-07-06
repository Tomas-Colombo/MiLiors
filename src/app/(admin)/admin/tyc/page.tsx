import { getTyCVersiones } from '@/modules/admin/queries'
import { TyCAdmin } from './tyc-ui'

export const metadata = { title: 'Términos y Condiciones — Admin TalentID' }

export default async function TyCPage() {
  const versiones = await getTyCVersiones()

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <h1 className="text-[22px] font-extrabold tracking-tight text-ink">Términos y Condiciones</h1>
      <p className="mt-1 text-[13px] text-muted">
        Publicá nuevas versiones de los Términos y Condiciones y consultá el historial de cambios.
      </p>

      <TyCAdmin versiones={versiones} />
    </div>
  )
}
