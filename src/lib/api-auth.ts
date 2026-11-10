import { getSessionUser } from '@/lib/dal'
import type { SessionUser } from '@/lib/types/domain'

/**
 * Autorización común para las rutas de API administrativas (/api/admin/*).
 *
 * Verifica la existencia de sesión activa y que el rol sea ADMIN a través de
 * `getSessionUser()`. Devuelve un objeto discriminado con la sesión o con el
 * código de estado HTTP correspondiente (401 o 403) para que cada route handler
 * responda en el formato que espera su consumidor (JSON para fetch, texto plano
 * para descargas directas en pestaña de navegador).
 */
export async function autorizarAdmin(): Promise<
  { ok: true; session: SessionUser } | { ok: false; status: 401 | 403 }
> {
  const session = await getSessionUser()
  if (!session) {
    return { ok: false, status: 401 }
  }

  if (session.rol !== 'ADMIN') {
    return { ok: false, status: 403 }
  }

  return { ok: true, session }
}
