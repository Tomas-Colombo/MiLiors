import Link from 'next/link'
import { PageState } from '@/components/shell/page-state'
import { buttonClassName } from '@/components/ui'
import { SearchIcon } from '@/components/icons'

export const metadata = { title: 'Página no encontrada — MiLiors' }

/**
 * 404 de la raíz. Cubre dos casos: una URL que no matchea ninguna ruta, y un
 * `notFound()` lanzado fuera de los grupos autenticados (que tienen el suyo,
 * para conservar la barra lateral).
 *
 * `/` redirige según el rol de la sesión, o al login si no hay: alcanza con ese
 * único destino para sacar al visitante de acá.
 */
export default function NotFound() {
  return (
    <PageState
      screen
      icon={<SearchIcon size={24} />}
      code="404"
      title="Esta página no existe"
      description="El enlace puede estar mal escrito o apuntar a algo que ya no está publicado."
      actions={
        <Link href="/" className={buttonClassName({ size: 'md' })}>
          Ir al inicio
        </Link>
      }
    />
  )
}
