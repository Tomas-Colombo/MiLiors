import Link from 'next/link'
import { leerDestino } from '@/lib/destino-cookie'
import { tokenDeDestinoEmpleos } from '@/lib/sanitizar-next'
import { Alert, Button } from '@/components/ui'
import { getMisPostulacionesPuestoIds, getPuestoPorEnlace } from '@/modules/puestos/queries'
import { descartarDestino } from '@/modules/puestos/destino-actions'

/**
 * Aviso "Seguí con tu postulación" para el postulante que entró por el link de un
 * puesto pero todavía no se postuló (primero hay que completar el perfil, el
 * Eneagrama y el certificado). Lo dispara la cookie `miliors-destino`.
 *
 * Es un Server Component de sólo lectura: la cookie se borra al postularse o al
 * descartarlo (`descartarDestino`), nunca acá.
 *
 * Si el destino es un link de /empleos que ya no resuelve (regenerado o puesto dado
 * de baja), o el puesto ya está postulado, no se muestra: llevaría a un 404 o sería
 * ruido. Un destino /postulante/... usa un texto genérico.
 */
export async function SeguirPostulacion() {
  const destino = await leerDestino()
  if (!destino) return null

  let titulo: string | null = null
  const token = tokenDeDestinoEmpleos(destino)
  if (token) {
    const puesto = await getPuestoPorEnlace(token)
    if (!puesto) return null
    if ((await getMisPostulacionesPuestoIds()).has(puesto.puestoId)) return null
    titulo = puesto.titulo_puesto
  }

  return (
    <Alert
      tone="info"
      title={titulo ? `Seguí con tu postulación a ${titulo}` : 'Seguí con tu postulación'}
      className="mb-6"
    >
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <Link href={destino} className="font-semibold underline underline-offset-2">
          Ir al puesto
        </Link>
        <form action={descartarDestino}>
          <Button type="submit" variant="ghost" size="sm">
            Descartar
          </Button>
        </form>
      </div>
    </Alert>
  )
}
