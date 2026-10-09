import { getTyCVersiones } from '@/modules/admin/queries'
import { PageHeader } from '@/components/ui'
import { TyCAdmin } from './tyc-ui'

export const metadata = { title: 'Términos y Condiciones — Admin MiLiors' }

export default async function TyCPage() {
  const versiones = await getTyCVersiones()

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader title="Términos y Condiciones" description="Publicá nuevas versiones de los Términos y Condiciones y consultá el historial de cambios." />

      <TyCAdmin versiones={versiones} />
    </div>
  )
}
