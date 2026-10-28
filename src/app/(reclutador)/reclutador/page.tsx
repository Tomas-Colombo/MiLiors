import { Suspense } from 'react'
import { PageHeader } from '@/components/ui'
import { redirect } from 'next/navigation'
import { getMisEmpresasBase, getPerfilReclutador } from '@/modules/empresas/queries'
import { QuickLinksReclutador } from './quick-links'
import { MetricasSection } from './metricas-section'
import { MetricasSkeleton } from './metricas-skeleton'

export const metadata = { title: 'Inicio — MiLiors Reclutador' }

export default async function ReclutadorDashboard() {
  const rec = await getPerfilReclutador()

  // Sin ninguna empresa cargada no hay nada que gestionar: va al onboarding.
  const empresas = await getMisEmpresasBase()
  if (!rec || empresas.length === 0) {
    redirect('/reclutador/onboarding')
  }

  const empresasActivas = empresas.filter((e) => e.activa)
  const subtitulo =
    empresasActivas.length === 1
      ? empresasActivas[0].nombre_empresa
      : `${empresasActivas.length} empresas activas`

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10 space-y-8">
      {/* Header */}
      <PageHeader title={<>¡Hola, {rec.nombre_reclutador.split(' ')[0]}!</>} description={subtitulo} />

      {/* Accesos rápidos */}
      <div>
        <h2 className="text-compact font-bold text-ink mb-3">Accesos rápidos</h2>
        <QuickLinksReclutador />
      </div>

      {/* Métricas */}
      <div>
        <h2 className="text-compact font-bold text-ink mb-3">Métricas</h2>
        <Suspense fallback={<MetricasSkeleton />}>
          <MetricasSection />
        </Suspense>
      </div>
    </div>
  )
}
