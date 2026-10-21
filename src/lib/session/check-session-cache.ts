/**
 * Cache en memoria del resultado de la RPC `check_session()` por usuario.
 *
 * El proxy la consultaba en cada request protegido: una navegación dispara
 * varios requests (página, RSC, server actions) y el 2026-10-21 se vieron
 * ráfagas de ~15 llamadas en 2 s para un solo usuario.
 *
 * Vive en el módulo del proxy (runtime Node, el estado persiste mientras la
 * instancia esté caliente). No se usa un cookie porque el cliente podría
 * falsificarlo y saltarse la revocación; este cache no es accesible desde el
 * navegador.
 *
 * Reglas:
 *  - Sólo se cachea "sesión OK" (null). Un motivo de cierre no se cachea:
 *    el proxy hace signOut y la próxima sesión vuelve a consultar.
 *  - Los errores no se cachean: el próximo request reintenta.
 *  - Requests concurrentes del mismo usuario comparten la consulta en curso.
 *
 * Contrapartida: una revocación (o la inactividad del admin) se detecta con
 * hasta CHECK_SESSION_TTL_MS de demora, por instancia.
 */

export const CHECK_SESSION_TTL_MS = 60_000
const MAX_ENTRADAS = 5_000

type Entrada = { expira: number; resultado: Promise<string | null> }

const cache = new Map<string, Entrada>()

export function checkSessionCacheado(
  usuarioId: string,
  consultar: () => Promise<string | null>,
  ahora: number = Date.now(),
): Promise<string | null> {
  const vigente = cache.get(usuarioId)
  if (vigente && vigente.expira > ahora) return vigente.resultado

  const resultado = consultar().then(
    (motivo) => {
      if (motivo) olvidar(usuarioId, resultado)
      return motivo
    },
    (error: unknown) => {
      olvidar(usuarioId, resultado)
      throw error
    },
  )

  liberarEspacio(ahora)
  cache.set(usuarioId, { expira: ahora + CHECK_SESSION_TTL_MS, resultado })
  return resultado
}

/** Borra la entrada sólo si sigue siendo la de esta consulta. */
function olvidar(usuarioId: string, resultado: Promise<string | null>) {
  if (cache.get(usuarioId)?.resultado === resultado) cache.delete(usuarioId)
}

function liberarEspacio(ahora: number) {
  if (cache.size < MAX_ENTRADAS) return
  for (const [id, entrada] of cache) {
    if (entrada.expira <= ahora) cache.delete(id)
  }
  // Todas vigentes: se descarta la más vieja (Map conserva el orden de inserción).
  if (cache.size >= MAX_ENTRADAS) {
    const masVieja = cache.keys().next().value
    if (masVieja !== undefined) cache.delete(masVieja)
  }
}

/** Sólo para tests. */
export function _resetCheckSessionCache() {
  cache.clear()
}
