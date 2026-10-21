import 'server-only'
import { cookies } from 'next/headers'
import { SIDEBAR_COLLAPSED_COOKIE } from './sidebar-prefs'

/** Lee en el servidor si la persona dejó la barra lateral retraída. */
export async function getSidebarColapsada(): Promise<boolean> {
  const store = await cookies()
  return store.get(SIDEBAR_COLLAPSED_COOKIE)?.value === 'true'
}
