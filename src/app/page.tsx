import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/dal'
import { RUTAS_POR_ROL } from '@/lib/constants/enums'

export default async function RootPage() {
  const user = await getSessionUser()

  if (user) {
    redirect(RUTAS_POR_ROL[user.rol] ?? '/iniciar-sesion')
  }

  redirect('/iniciar-sesion')
}
