import Link from 'next/link'
import { PageState } from '@/components/shell/page-state'
import { buttonClassName } from '@/components/ui'
import { SearchIcon } from '@/components/icons'

export const metadata = { title: 'No encontrado — MiLiors' }

/**
 * Cubre los `notFound()` de este grupo. Va acá y no en la raíz para que la
 * pantalla siga dentro del layout con barra lateral: quien entra a un recurso
 * que ya no existe se queda dentro de tu panel y puede seguir navegando.
 */
export default function NotFound() {
  return (
    <PageState
      icon={<SearchIcon size={24} />}
      code="404"
      title="No encontramos esto"
      description="El recurso no existe, se dio de baja, o no está disponible para tu cuenta."
      actions={
        <Link href="/postulante" className={buttonClassName({ size: 'md' })}>
          Volver al inicio
        </Link>
      }
    />
  )
}
