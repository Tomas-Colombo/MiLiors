# Mapa del Sistema (Fase 1)

## Resumen Ejecutivo

- **Rutas (`page.tsx`):** 46 páginas en 4 grupos y raíz (`(acceso)`: 6, `(postulante)`: 12, `(reclutador)`: 14, `(admin)`: 13, raíz: 1).
- **Route handlers (`route.ts`):** 8 endpoints (7 en `src/app/api/` y 1 en `src/app/(acceso)/recuperar-password/confirmar/`).
- **Server actions:** 95 funciones exportadas en 16 archivos de `src/modules/`.
- **Usos de `createAdminClient`:** 123 llamadas distribuidas en 32 archivos (acciones, queries de bypass RLS y handlers).
- **Base de datos de producción (`public`):** 47 tablas, 100% con RLS habilitado (0% forzado); 102 políticas RLS activas; 4 tablas sin políticas (acceso exclusivo service role).
- **Funciones `SECURITY DEFINER` y Triggers:** 6 funciones `SECURITY DEFINER` en `public` (todas con `search_path = public`; permisos restringidos) y 24 triggers no internos (`pg_trigger` con `tgisinternal = false`).
- **Drifts de base de datos encontrados:** 2 tablas huérfanas en producción no creadas en el repositorio (`public.contratacion` [H-050] y `public.resultado_puntaje_eneagrama` [H-051], con 5 políticas y 1 trigger asociados).
- **Filas marcadas "A revisar":** 16 filas en total (2 páginas, 1 route handler, 12 server actions de visibilidad/perfil técnico/admin/ubicación, y 1 máquina de estados en `avanzarEstadoPostulacion`).

---

## 1. Protección Global

### Middleware / Proxy (`src/proxy.ts`)
- **Rutas cubiertas:** Se ejecuta en toda la aplicación excepto assets estáticos (`_next/static`, `_next/image`, favicon, imágenes, fuentes, `.svg`, `.png`, etc.) mediante matcher regex.
- **Rutas públicas (`PUBLIC_PATHS`):** `/iniciar-sesion`, `/registro`, `/recuperar-password`, `/verificar`.
  - Si un usuario autenticado navega por `GET` a `/iniciar-sesion` o `/registro`, el proxy lo redirige automáticamente al tablero de su rol (`rutaDeRol(rolDeUsuario(user))`). En requests `POST` (ej. server actions de login) no redirige para evitar el error de Next "unexpected response".
- **Rutas protegidas y sin sesión:** Cualquier ruta fuera de `PUBLIC_PATHS` sin sesión activa (`!user`) redirige a `/iniciar-sesion`.
- **Política de sesión (Revocación e Inactividad):**
  - Omite prefetchs nativos de navegador (`purpose: prefetch`).
  - Llama a `checkSessionCacheado(user.id, supabase.rpc("check_session"))` (cacheado hasta 60 s para absorber ráfagas de RSC/links).
  - Si la RPC devuelve motivo (`revocada` o `inactividad`), ejecuta `supabase.auth.signOut()` y redirige a `/iniciar-sesion?motivo=${motivo}` propagando las cookies de limpieza.
- **Restricción de rol por prefijo (`ROLE_PATHS`):**
  - `/postulante` exige rol `POSTULANTE`.
  - `/reclutador` exige rol `RECLUTADOR`.
  - `/admin` exige rol `ADMIN`.
  - Si el rol no coincide, redirige al dashboard de su rol (`rutaDeRol(rol)`) o `/iniciar-sesion` si no tiene rol válido.

### Guards (`src/lib/guards.ts` y `src/lib/dal.ts`)

| Guard | Firma | Qué verifica | Redirección | Usa `cache()` |
| --- | --- | --- | --- | :---: |
| `verifySession` (`dal.ts:13`) | `(): Promise<SessionUser>` | Autenticación vía `getUsuarioAutenticado(supabase)` y rol válido. | A `/iniciar-sesion` si no hay sesión o no hay rol. | **Sí** (React `cache()`) |
| `getSessionUser` (`dal.ts:36`) | `(): Promise<SessionUser \| null>` | Autenticación y rol de la sesión actual; no arroja error ni redirige. | Ninguna (retorna `null`). | **Sí** (React `cache()`) |
| `getTyCStatus` (`dal.ts:56`) | `(): Promise<{ tyc, aceptada } \| null>` | Obtiene TyC vigente (`fecha_baja_tyc IS NULL`) y verifica si el usuario actual la aceptó en `aceptacion_tyc`. | Ninguna (consumido por `TyCGate`). | **Sí** (React `cache()`) |
| `getTyCVigente` (`dal.ts:96`) | `(): Promise<TyCVigente \| null>` | Lee TyC vigente sin evaluar aceptación del usuario. | Ninguna. | **Sí** (React `cache()`) |
| `requireRol` (`guards.ts:32`) | `(esperado: RolUsuario): Promise<SessionUser>` | Llama a `verifySession()` y compara `session.rol === esperado`. | Al tablero de su rol si no coincide. | No directo (usa `verifySession` memoizado) |
| `requireEmpresaCargada` (`guards.ts:45`) | `(): Promise<void>` | Llama a `getMisEmpresasBase()`. Si no tiene ninguna empresa asociada, bloquea el área. | A `/reclutador/onboarding`. | No |
| `requireEneagramaCompleto` (`guards.ts:61`) | `(): Promise<void>` | Verifica perfil básico y que el test de eneagrama tenga al menos un dominante en `test_eneagrama_dominante`. | A `/postulante/onboarding` (sin perfil) o `/postulante/eneagrama` (sin test). | No (queries internas memoizadas) |

---

## 2. Inventario de Rutas (`page.tsx`)

### Grupo Público / Acceso (`src/app/(acceso)`)

| Ruta | Page Server o Client | Guard aplicado y ubicación | Queries que usa | Actions que dispara | A revisar |
| --- | :---: | --- | --- | --- | --- |
| `/iniciar-sesion` | Server | PUBLIC_PATHS (proxy) | Ninguna (página estática con formulario cliente) | `iniciarSesion` | Limpio. |
| `/recuperar-password` | Server | PUBLIC_PATHS (proxy) | Ninguna | `recuperarPassword` | Limpio. |
| `/recuperar-password/nueva` | Server | PUBLIC_PATHS (proxy) | `createClient().auth.getUser()` | `establecerPasswordNueva` | Limpio. |
| `/registro` | Server | PUBLIC_PATHS (proxy) | Ninguna | `registrarUsuario` | Limpio. |
| `/verificar` | Server | PUBLIC_PATHS (proxy) | Ninguna | Formulario cliente redirige a `/verificar/[id]` | Limpio. |
| `/verificar/[id]` | Server | PUBLIC_PATHS (proxy) | `createAdminClient()` lee `certificado_pdf` y `perfil_postulante` | Ninguna (vista pública de validez de certificado) | ⚠️ Usa createAdminClient en página pública para resolver QR sin auth (diseño deliberado). |

### Grupo Postulante (`src/app/(postulante)`)

| Ruta | Page Server o Client | Guard aplicado y ubicación | Queries que usa | Actions que dispara | A revisar |
| --- | :---: | --- | --- | --- | --- |
| `/postulante` | Server | requireRol POSTULANTE + TyCGate (layout), proxy /postulante; requireEneagramaCompleto (page); verifySession (page) | `perfil/queries`, `eneagrama/queries`, `puestos/queries`, `certificado/queries` | Acciones de perfil, eneagrama, postulaciones, visibilidad | Limpio. |
| `/postulante/certificado` | Server | requireRol POSTULANTE + TyCGate (layout), proxy /postulante; requireEneagramaCompleto (page); verifySession (page) | `perfil/queries`, `eneagrama/queries`, `puestos/queries`, `certificado/queries` | Acciones de perfil, eneagrama, postulaciones, visibilidad | Limpio. |
| `/postulante/eneagrama` | Server | requireRol POSTULANTE + TyCGate (layout), proxy /postulante; verifySession (page) | `perfil/queries`, `eneagrama/queries`, `puestos/queries`, `certificado/queries` | Acciones de perfil, eneagrama, postulaciones, visibilidad | Limpio. |
| `/postulante/informe` | Server | requireRol POSTULANTE + TyCGate (layout), proxy /postulante; requireEneagramaCompleto (page); verifySession (page) | `perfil/queries`, `eneagrama/queries`, `puestos/queries`, `certificado/queries` | Acciones de perfil, eneagrama, postulaciones, visibilidad | Limpio. |
| `/postulante/mi-perfil` | Server | requireRol POSTULANTE + TyCGate (layout), proxy /postulante; verifySession (page) | `perfil/queries`, `eneagrama/queries`, `puestos/queries`, `certificado/queries` | Acciones de perfil, eneagrama, postulaciones, visibilidad | Limpio. |
| `/postulante/onboarding` | Server | requireRol POSTULANTE + TyCGate (layout), proxy /postulante; verifySession (page) | `perfil/queries`, `eneagrama/queries`, `puestos/queries`, `certificado/queries` | Acciones de perfil, eneagrama, postulaciones, visibilidad | Limpio. |
| `/postulante/perfil` | Server | requireRol POSTULANTE + TyCGate (layout), proxy /postulante; requireEneagramaCompleto (page); verifySession (page) | `perfil/queries`, `eneagrama/queries`, `puestos/queries`, `certificado/queries` | Acciones de perfil, eneagrama, postulaciones, visibilidad | Limpio. |
| `/postulante/personalidad` | Server | requireRol POSTULANTE + TyCGate (layout), proxy /postulante; requireEneagramaCompleto (page); verifySession (page) | `perfil/queries`, `eneagrama/queries`, `puestos/queries`, `certificado/queries` | Acciones de perfil, eneagrama, postulaciones, visibilidad | Limpio. |
| `/postulante/postulaciones` | Server | requireRol POSTULANTE + TyCGate (layout), proxy /postulante; requireEneagramaCompleto (page) | `perfil/queries`, `eneagrama/queries`, `puestos/queries`, `certificado/queries` | Acciones de perfil, eneagrama, postulaciones, visibilidad | Limpio. |
| `/postulante/puestos` | Server | requireRol POSTULANTE + TyCGate (layout), proxy /postulante; requireEneagramaCompleto (page) | `perfil/queries`, `eneagrama/queries`, `puestos/queries`, `certificado/queries` | Acciones de perfil, eneagrama, postulaciones, visibilidad | Limpio. |
| `/postulante/puestos/[id]` | Server | requireRol POSTULANTE + TyCGate (layout), proxy /postulante; requireEneagramaCompleto (page) | `perfil/queries`, `eneagrama/queries`, `puestos/queries`, `certificado/queries` | Acciones de perfil, eneagrama, postulaciones, visibilidad | Limpio. |
| `/postulante/reclutadores/[id]` | Server | requireRol POSTULANTE + TyCGate (layout), proxy /postulante; requireEneagramaCompleto (page) | `perfil/queries`, `eneagrama/queries`, `puestos/queries`, `certificado/queries` | Acciones de perfil, eneagrama, postulaciones, visibilidad | Limpio. |

### Grupo Reclutador (`src/app/(reclutador)`)

| Ruta | Page Server o Client | Guard aplicado y ubicación | Queries que usa | Actions que dispara | A revisar |
| --- | :---: | --- | --- | --- | --- |
| `/reclutador` | Server | requireRol RECLUTADOR + TyCGate (layout), proxy /reclutador | `empresas/queries`, `puestos/queries`, `postulantes/queries`, `dashboard/queries` | Acciones de puestos, postulaciones, notas, asistente IA | Limpio. |
| `/reclutador/asistente` | Server | requireRol RECLUTADOR + TyCGate (layout), proxy /reclutador; requireEmpresaCargada (page) | `empresas/queries`, `puestos/queries`, `postulantes/queries`, `dashboard/queries` | Acciones de puestos, postulaciones, notas, asistente IA | Limpio. |
| `/reclutador/empresas` | Server | requireRol RECLUTADOR + TyCGate (layout), proxy /reclutador; requireEmpresaCargada (page) | `empresas/queries`, `puestos/queries`, `postulantes/queries`, `dashboard/queries` | Acciones de puestos, postulaciones, notas, asistente IA | Limpio. |
| `/reclutador/mi-perfil` | Server | requireRol RECLUTADOR + TyCGate (layout), proxy /reclutador | `empresas/queries`, `puestos/queries`, `postulantes/queries`, `dashboard/queries` | Acciones de puestos, postulaciones, notas, asistente IA | Limpio. |
| `/reclutador/notas` | Server | requireRol RECLUTADOR + TyCGate (layout), proxy /reclutador; requireEmpresaCargada (page) | `empresas/queries`, `puestos/queries`, `postulantes/queries`, `dashboard/queries` | Acciones de puestos, postulaciones, notas, asistente IA | Limpio. |
| `/reclutador/onboarding` | Server | requireRol RECLUTADOR + TyCGate (layout), proxy /reclutador | `empresas/queries`, `puestos/queries`, `postulantes/queries`, `dashboard/queries` | Acciones de puestos, postulaciones, notas, asistente IA | Limpio. |
| `/reclutador/postulaciones` | Server | requireRol RECLUTADOR + TyCGate (layout), proxy /reclutador; requireEmpresaCargada (page) | `empresas/queries`, `puestos/queries`, `postulantes/queries`, `dashboard/queries` | Acciones de puestos, postulaciones, notas, asistente IA | Limpio. |
| `/reclutador/postulantes` | Server | requireRol RECLUTADOR + TyCGate (layout), proxy /reclutador; requireEmpresaCargada (page) | `empresas/queries`, `puestos/queries`, `postulantes/queries`, `dashboard/queries` | Acciones de puestos, postulaciones, notas, asistente IA | Limpio. |
| `/reclutador/postulantes/[id]` | Server | requireRol RECLUTADOR + TyCGate (layout), proxy /reclutador; requireEmpresaCargada (page) | `empresas/queries`, `puestos/queries`, `postulantes/queries`, `dashboard/queries` | Acciones de puestos, postulaciones, notas, asistente IA | Limpio. |
| `/reclutador/puestos` | Server | requireRol RECLUTADOR + TyCGate (layout), proxy /reclutador; requireEmpresaCargada (page) | `empresas/queries`, `puestos/queries`, `postulantes/queries`, `dashboard/queries` | Acciones de puestos, postulaciones, notas, asistente IA | Limpio. |
| `/reclutador/puestos/[id]` | Server | requireRol RECLUTADOR + TyCGate (layout), proxy /reclutador; requireEmpresaCargada (page) | `empresas/queries`, `puestos/queries`, `postulantes/queries`, `dashboard/queries` | Acciones de puestos, postulaciones, notas, asistente IA | Limpio. |
| `/reclutador/puestos/[id]/asistente` | Server | requireRol RECLUTADOR + TyCGate (layout), proxy /reclutador; requireEmpresaCargada (page) | `empresas/queries`, `puestos/queries`, `postulantes/queries`, `dashboard/queries` | Acciones de puestos, postulaciones, notas, asistente IA | Limpio. |
| `/reclutador/puestos/[id]/editar` | Server | requireRol RECLUTADOR + TyCGate (layout), proxy /reclutador; requireEmpresaCargada (page) | `empresas/queries`, `puestos/queries`, `postulantes/queries`, `dashboard/queries` | Acciones de puestos, postulaciones, notas, asistente IA | Limpio. |
| `/reclutador/puestos/nuevo` | Server | requireRol RECLUTADOR + TyCGate (layout), proxy /reclutador; requireEmpresaCargada (page) | `empresas/queries`, `puestos/queries`, `postulantes/queries`, `dashboard/queries` | Acciones de puestos, postulaciones, notas, asistente IA | Limpio. |

### Grupo Administrador (`src/app/(admin)`)

| Ruta | Page Server o Client | Guard aplicado y ubicación | Queries que usa | Actions que dispara | A revisar |
| --- | :---: | --- | --- | --- | --- |
| `/admin` | Server | requireRol ADMIN (layout), proxy /admin | `src/modules/admin/queries.ts`, `dal.ts` | Acciones de catálogo / preguntas / tyc en `src/modules/admin/actions.ts` | Limpio. |
| `/admin/carreras` | Server | requireRol ADMIN (layout), proxy /admin | `src/modules/admin/queries.ts`, `dal.ts` | Acciones de catálogo / preguntas / tyc en `src/modules/admin/actions.ts` | Limpio. |
| `/admin/competencias` | Server | requireRol ADMIN (layout), proxy /admin | `src/modules/admin/queries.ts`, `dal.ts` | Acciones de catálogo / preguntas / tyc en `src/modules/admin/actions.ts` | Limpio. |
| `/admin/empresas` | Server | requireRol ADMIN (layout), proxy /admin | `src/modules/admin/queries.ts`, `dal.ts` | Acciones de catálogo / preguntas / tyc en `src/modules/admin/actions.ts` | Limpio. |
| `/admin/feedback` | Server | requireRol ADMIN (layout), proxy /admin | `src/modules/admin/queries.ts`, `dal.ts` | Acciones de catálogo / preguntas / tyc en `src/modules/admin/actions.ts` | Limpio. |
| `/admin/idiomas` | Server | requireRol ADMIN (layout), proxy /admin | `src/modules/admin/queries.ts`, `dal.ts` | Acciones de catálogo / preguntas / tyc en `src/modules/admin/actions.ts` | Limpio. |
| `/admin/informes` | Server | requireRol ADMIN (layout), proxy /admin | `src/modules/admin/queries.ts`, `dal.ts` | Acciones de catálogo / preguntas / tyc en `src/modules/admin/actions.ts` | Limpio. |
| `/admin/mi-perfil` | Server | requireRol ADMIN (layout), proxy /admin; verifySession (page) | `src/modules/admin/queries.ts`, `dal.ts` | Acciones de catálogo / preguntas / tyc en `src/modules/admin/actions.ts` | Limpio. |
| `/admin/postulantes` | Server | requireRol ADMIN (layout), proxy /admin | `src/modules/admin/queries.ts`, `dal.ts` | Acciones de catálogo / preguntas / tyc en `src/modules/admin/actions.ts` | Limpio. |
| `/admin/preguntas` | Server | requireRol ADMIN (layout), proxy /admin | `src/modules/admin/queries.ts`, `dal.ts` | Acciones de catálogo / preguntas / tyc en `src/modules/admin/actions.ts` | Limpio. |
| `/admin/sectores` | Server | requireRol ADMIN (layout), proxy /admin | `src/modules/admin/queries.ts`, `dal.ts` | Acciones de catálogo / preguntas / tyc en `src/modules/admin/actions.ts` | Limpio. |
| `/admin/tyc` | Server | requireRol ADMIN (layout), proxy /admin | `src/modules/admin/queries.ts`, `dal.ts` | Acciones de catálogo / preguntas / tyc en `src/modules/admin/actions.ts` | Limpio. |
| `/admin/ubicaciones` | Server | requireRol ADMIN (layout), proxy /admin | `src/modules/admin/queries.ts`, `dal.ts` | Acciones de catálogo / preguntas / tyc en `src/modules/admin/actions.ts` | Limpio. |

### Ruta Raíz (`src/app/page.tsx`)

| Ruta | Page Server o Client | Guard aplicado y ubicación | Queries que usa | Actions que dispara | A revisar |
| --- | :---: | --- | --- | --- | --- |
| `/` | Server | proxy + getSessionUser redirect (page); getSessionUser (page) | `getSessionUser()` | Redirect según rol | ⚠️ Redirección pura a `/iniciar-sesion` o panel según cookie sin render de UI. |

---

## 3. Inventario de Route Handlers (`src/app/api/` y auxiliares)

| Ruta + Método | Archivo:Línea | Verificación de Sesión | Verificación de Pertenencia o Rol | Cliente (RLS o Admin) | Qué devuelve | A revisar |
| --- | --- | --- | --- | :---: | --- | --- |
| `GET /(acceso)/recuperar-password/confirmar` | [`src/app/(acceso)/recuperar-password/confirmar/route.ts:23`](file:///src/app/(acceso)/recuperar-password/confirmar/route.ts:23) | No requiere (pública). Recibe `code` por query y canjea vía `exchangeCodeForSession`. | N/A (canje de código PKCE de recuperación emitido por Supabase Auth). | `createClient (usuario)` | Redirect 307 a `/recuperar-password/nueva` (o `/recuperar-password?error=enlace`). | Limpio. |
| `GET /api/admin/catalogos/export` | [`src/app/api/admin/catalogos/export/route.ts:46`](file:///src/app/api/admin/catalogos/export/route.ts:46) | getSessionUser() (retorna 401 si no hay sesión). | `session.rol === "ADMIN"` (retorna 403 si no es ADMIN). | `createClient (usuario / RLS en queries de admin).` | Buffer de archivo `.xlsx` (Excel) con cabeceras `Content-Type: application/vnd.openxmlformats-...`. | Limpio. |
| `GET /api/admin/feedback/export` | [`src/app/api/admin/feedback/export/route.ts:31`](file:///src/app/api/admin/feedback/export/route.ts:31) | getSessionUser() (retorna 401 si no hay sesión). | `session.rol === "ADMIN"` (retorna 403 si no es ADMIN). | `createClient (usuario / RLS en getFeedbackAdmin).` | Buffer de archivo `.xlsx` (Excel). | Limpio. |
| `POST /api/admin/preguntas` | [`src/app/api/admin/preguntas/route.ts:8`](file:///src/app/api/admin/preguntas/route.ts:8) | getUsuarioAutenticado(supabase) (retorna 401). | `rolDeUsuario(user) === "ADMIN"` (retorna 403 si no es ADMIN). | `createAdminClient (para calcular `max(numero_pregunta)` e insertar en `pregunta_eneagrama`).` | JSON `{ id: string }` con status 201. | Usa createAdminClient para insertar preguntas tras validar rol ADMIN. |
| `GET /api/certificado/descargar/[id]` | [`src/app/api/certificado/descargar/[id]/route.ts:19`](file:///src/app/api/certificado/descargar/[id]/route.ts:19) | getUsuarioAutenticado(supabase) (retorna 401). | Verifica pertenencia explícita: lee `perfil_postulante.usuario_id` y compara con `user.id` (retorna 403 si no coincide). | `createAdminClient (para leer `certificado_pdf` y `perfil_postulante`).` | Buffer PDF de certificado (`application/pdf`) con `Content-Disposition: attachment`. | Limpio. Pertenencia validada explícitamente. |
| `GET /api/informe/descargar` | [`src/app/api/informe/descargar/route.ts:21`](file:///src/app/api/informe/descargar/route.ts:21) | getUsuarioAutenticado(supabase) (retorna 401). | Filtrado por RLS / ownership directo: `perfil_postulante.usuario_id = user.id`. | `createClient (usuario / RLS).` | Buffer PDF de informe de personalidad (`application/pdf`). | Limpio. |
| `POST /api/seleccion/informe` | [`src/app/api/seleccion/informe/route.ts:12`](file:///src/app/api/seleccion/informe/route.ts:12) | verifySession() dentro de `generarInformeSeleccion` (service.ts:57). | `getReclutadorId()` + consulta de puesto con `reclutador_id` + verificación de que cada candidato postuló a este puesto (service.ts:73-100). | `createClient (puesto) y createAdminClient (para armar contexto completo de candidatos postulados).` | Buffer PDF de informe grupal de selección (`application/pdf`). | Limpio. Pertenencia estricta en service.ts. |
| `POST /api/session/heartbeat` | [`src/app/api/session/heartbeat/route.ts:7`](file:///src/app/api/session/heartbeat/route.ts:7) | getUsuarioAutenticado(supabase) (retorna 401). | Llama RPC `touch_session_activity()`, que lee `auth.uid()` internamente en Postgres. | `createClient (usuario / RPC).` | 204 No Content. | Limpio. |

---

## 4. Inventario de Server Actions (`src/modules/*/actions.ts`)

> Total: 95 funciones exportadas en 16 archivos. Las actions de admin sobre catálogos globales con `requireAdmin` se consideran limpias. Se señalan en "A revisar" las acciones con `createAdminClient` sin control de pertenencia, o mutaciones sobre otros usuarios.

### Módulo `admin`

| Función | Archivo:Línea | Verificación de Sesión | Verificación de Pertenencia / Rol | Cliente | Validación | Retorno | Revalidate / Redirect | A revisar |
| --- | --- | --- | --- | :---: | --- | --- | --- | --- |
| `crearSector` | [`src/modules/admin/actions.ts:19`](file:///src/modules/admin/actions.ts#L19) | No verificada | Ninguna explícita | `createAdminClient` | manual | `ActionResult` | revalidatePath | Limpio (requireAdmin autoriza rol global ADMIN sobre catálogos del sistema). |
| `desactivarSector` | [`src/modules/admin/actions.ts:36`](file:///src/modules/admin/actions.ts#L36) | No verificada | Ninguna explícita | `createAdminClient` | Sin validación | `ActionResult` | revalidatePath | Limpio (requireAdmin autoriza rol global ADMIN sobre catálogos del sistema). |
| `reactivarSector` | [`src/modules/admin/actions.ts:47`](file:///src/modules/admin/actions.ts#L47) | No verificada | Ninguna explícita | `createAdminClient` | Sin validación | `ActionResult` | revalidatePath | Limpio (requireAdmin autoriza rol global ADMIN sobre catálogos del sistema). |
| `crearCompetencia` | [`src/modules/admin/actions.ts:60`](file:///src/modules/admin/actions.ts#L60) | No verificada | Ninguna explícita | `createAdminClient` | manual | `ActionResult` | revalidatePath | Limpio (requireAdmin autoriza rol global ADMIN sobre catálogos del sistema). |
| `desactivarCompetencia` | [`src/modules/admin/actions.ts:77`](file:///src/modules/admin/actions.ts#L77) | No verificada | Ninguna explícita | `createAdminClient` | Sin validación | `ActionResult` | revalidatePath | Limpio (requireAdmin autoriza rol global ADMIN sobre catálogos del sistema). |
| `reactivarCompetencia` | [`src/modules/admin/actions.ts:88`](file:///src/modules/admin/actions.ts#L88) | No verificada | Ninguna explícita | `createAdminClient` | Sin validación | `ActionResult` | revalidatePath | Limpio (requireAdmin autoriza rol global ADMIN sobre catálogos del sistema). |
| `crearIdioma` | [`src/modules/admin/actions.ts:101`](file:///src/modules/admin/actions.ts#L101) | No verificada | Ninguna explícita | `createAdminClient` | manual | `ActionResult` | revalidatePath | Limpio (requireAdmin autoriza rol global ADMIN sobre catálogos del sistema). |
| `desactivarIdioma` | [`src/modules/admin/actions.ts:118`](file:///src/modules/admin/actions.ts#L118) | No verificada | Ninguna explícita | `createAdminClient` | Sin validación | `ActionResult` | revalidatePath | Limpio (requireAdmin autoriza rol global ADMIN sobre catálogos del sistema). |
| `reactivarIdioma` | [`src/modules/admin/actions.ts:129`](file:///src/modules/admin/actions.ts#L129) | No verificada | Ninguna explícita | `createAdminClient` | manual | `ActionResult` | revalidatePath | Limpio (requireAdmin autoriza rol global ADMIN sobre catálogos del sistema). |
| `crearCarrera` | [`src/modules/admin/actions.ts:172`](file:///src/modules/admin/actions.ts#L172) | No verificada | Ninguna explícita | `createAdminClient` | manual | `ActionResult` | revalidatePath | Limpio (requireAdmin autoriza rol global ADMIN sobre catálogos del sistema). |
| `renombrarCarrera` | [`src/modules/admin/actions.ts:194`](file:///src/modules/admin/actions.ts#L194) | No verificada | Ninguna explícita | `createAdminClient` | manual | `ActionResult` | revalidatePath | Limpio (requireAdmin autoriza rol global ADMIN sobre catálogos del sistema). |
| `desactivarCarrera` | [`src/modules/admin/actions.ts:213`](file:///src/modules/admin/actions.ts#L213) | No verificada | Ninguna explícita | `createAdminClient` | Sin validación | `ActionResult` | revalidatePath | Limpio (requireAdmin autoriza rol global ADMIN sobre catálogos del sistema). |
| `reactivarCarrera` | [`src/modules/admin/actions.ts:224`](file:///src/modules/admin/actions.ts#L224) | No verificada | Ninguna explícita | `createAdminClient` | Sin validación | `ActionResult` | revalidatePath | Limpio (requireAdmin autoriza rol global ADMIN sobre catálogos del sistema). |
| `promoverCarreraOtra` | [`src/modules/admin/actions.ts:246`](file:///src/modules/admin/actions.ts#L246) | No verificada | Ninguna explícita | `createAdminClient` | manual | `ActionResult` | revalidatePath | Limpio (requireAdmin autoriza rol global ADMIN sobre catálogos del sistema). |
| `crearProvincia` | [`src/modules/admin/actions.ts:291`](file:///src/modules/admin/actions.ts#L291) | No verificada | Ninguna explícita | `createAdminClient` | manual | `ActionResult` | revalidatePath | Limpio (requireAdmin autoriza rol global ADMIN sobre catálogos del sistema). |
| `renombrarProvincia` | [`src/modules/admin/actions.ts:308`](file:///src/modules/admin/actions.ts#L308) | No verificada | Ninguna explícita | `createAdminClient` | manual | `ActionResult` | revalidatePath | Limpio (requireAdmin autoriza rol global ADMIN sobre catálogos del sistema). |
| `desactivarProvincia` | [`src/modules/admin/actions.ts:322`](file:///src/modules/admin/actions.ts#L322) | No verificada | Ninguna explícita | `createAdminClient` | Sin validación | `ActionResult` | revalidatePath | Limpio (requireAdmin autoriza rol global ADMIN sobre catálogos del sistema). |
| `reactivarProvincia` | [`src/modules/admin/actions.ts:333`](file:///src/modules/admin/actions.ts#L333) | No verificada | Ninguna explícita | `createAdminClient` | Sin validación | `ActionResult` | revalidatePath | Limpio (requireAdmin autoriza rol global ADMIN sobre catálogos del sistema). |
| `crearDepartamento` | [`src/modules/admin/actions.ts:344`](file:///src/modules/admin/actions.ts#L344) | No verificada | Ninguna explícita | `createAdminClient` | manual | `ActionResult` | revalidatePath | Limpio (requireAdmin autoriza rol global ADMIN sobre catálogos del sistema). |
| `renombrarDepartamento` | [`src/modules/admin/actions.ts:366`](file:///src/modules/admin/actions.ts#L366) | No verificada | Ninguna explícita | `createAdminClient` | manual | `ActionResult` | revalidatePath | Limpio (requireAdmin autoriza rol global ADMIN sobre catálogos del sistema). |
| `desactivarDepartamento` | [`src/modules/admin/actions.ts:380`](file:///src/modules/admin/actions.ts#L380) | No verificada | Ninguna explícita | `createAdminClient` | Sin validación | `ActionResult` | revalidatePath | Limpio (requireAdmin autoriza rol global ADMIN sobre catálogos del sistema). |
| `reactivarDepartamento` | [`src/modules/admin/actions.ts:391`](file:///src/modules/admin/actions.ts#L391) | No verificada | Ninguna explícita | `createAdminClient` | Sin validación | `ActionResult` | revalidatePath | Limpio (requireAdmin autoriza rol global ADMIN sobre catálogos del sistema). |
| `crearLocalidad` | [`src/modules/admin/actions.ts:402`](file:///src/modules/admin/actions.ts#L402) | No verificada | Ninguna explícita | `createAdminClient` | manual | `ActionResult` | revalidatePath | Limpio (requireAdmin autoriza rol global ADMIN sobre catálogos del sistema). |
| `renombrarLocalidad` | [`src/modules/admin/actions.ts:423`](file:///src/modules/admin/actions.ts#L423) | No verificada | Ninguna explícita | `createAdminClient` | manual | `ActionResult` | revalidatePath | Limpio (requireAdmin autoriza rol global ADMIN sobre catálogos del sistema). |
| `desactivarLocalidad` | [`src/modules/admin/actions.ts:436`](file:///src/modules/admin/actions.ts#L436) | No verificada | Ninguna explícita | `createAdminClient` | Sin validación | `ActionResult` | revalidatePath | Limpio (requireAdmin autoriza rol global ADMIN sobre catálogos del sistema). |
| `reactivarLocalidad` | [`src/modules/admin/actions.ts:447`](file:///src/modules/admin/actions.ts#L447) | No verificada | Ninguna explícita | `createAdminClient` | Sin validación | `ActionResult` | revalidatePath | Limpio (requireAdmin autoriza rol global ADMIN sobre catálogos del sistema). |
| `editarPregunta` | [`src/modules/admin/actions.ts:461`](file:///src/modules/admin/actions.ts#L461) | No verificada | Ninguna explícita | `createAdminClient` | manual | `ActionResult` | revalidatePath | Limpio (requireAdmin autoriza rol global ADMIN sobre catálogos del sistema). |
| `eliminarPregunta` | [`src/modules/admin/actions.ts:484`](file:///src/modules/admin/actions.ts#L484) | No verificada | Ninguna explícita | `createAdminClient` | Sin validación | `ActionResult` | revalidatePath | Limpio (requireAdmin autoriza rol global ADMIN sobre catálogos del sistema). |
| `togglePausarPregunta` | [`src/modules/admin/actions.ts:496`](file:///src/modules/admin/actions.ts#L496) | No verificada | Ninguna explícita | `createAdminClient` | Sin validación | `ActionResult` | revalidatePath | Limpio (requireAdmin autoriza rol global ADMIN sobre catálogos del sistema). |
| `publicarTyC` | [`src/modules/admin/actions.ts:510`](file:///src/modules/admin/actions.ts#L510) | No verificada | Ninguna explícita | `createAdminClient` | manual | `ActionResult` | revalidatePath | Limpio (requireAdmin autoriza rol global ADMIN sobre catálogos del sistema). |
| `actualizarDiasInactividad` | [`src/modules/admin/actions.ts:551`](file:///src/modules/admin/actions.ts#L551) | No verificada | Ninguna explícita | `createAdminClient` | manual | `ActionResult` | revalidatePath | Limpio (requireAdmin autoriza rol global ADMIN sobre catálogos del sistema). |
| `actualizarDiasReactivarFeedback` | [`src/modules/admin/actions.ts:576`](file:///src/modules/admin/actions.ts#L576) | No verificada | Ninguna explícita | `createAdminClient` | manual | `ActionResult` | revalidatePath | Limpio (requireAdmin autoriza rol global ADMIN sobre catálogos del sistema). |
| `desactivarPostulante` | [`src/modules/admin/actions.ts:599`](file:///src/modules/admin/actions.ts#L599) | No verificada | Ninguna explícita | `createAdminClient` | Sin validación | `ActionResult` | revalidatePath | ⚠️ Muta estado de usuario en `usuario` vía `createAdminClient` sin validar existencia previa ni rol del target. |
| `reactivarPostulante` | [`src/modules/admin/actions.ts:610`](file:///src/modules/admin/actions.ts#L610) | No verificada | Ninguna explícita | `createAdminClient` | Sin validación | `ActionResult` | revalidatePath | ⚠️ Muta estado de usuario en `usuario` vía `createAdminClient` sin validar existencia previa ni rol del target. |
| `revocarSesion` | [`src/modules/admin/sessions.ts:28`](file:///src/modules/admin/sessions.ts#L28) | No verificada | Ninguna explícita | `createAdminClient` | manual | `ActionResult` | - | ⚠️ Upsert directo en `sesion_actividad` vía `createAdminClient` para cualquier ID de usuario arbitrario. |

### Módulo `asistente`

| Función | Archivo:Línea | Verificación de Sesión | Verificación de Pertenencia / Rol | Cliente | Validación | Retorno | Revalidate / Redirect | A revisar |
| --- | --- | --- | --- | :---: | --- | --- | --- | --- |
| `consultarAsistente` | [`src/modules/asistente/actions.ts:13`](file:///src/modules/asistente/actions.ts#L13) | verifySession() | Propiedad de reclutador vía getReclutadorId() | `createClient + createAdminClient` | manual | `ActionResult<T>` | - | Limpio (sesión y pertenencia validadas antes de consultar o mutar datos). |

### Módulo `auth`

| Función | Archivo:Línea | Verificación de Sesión | Verificación de Pertenencia / Rol | Cliente | Validación | Retorno | Revalidate / Redirect | A revisar |
| --- | --- | --- | --- | :---: | --- | --- | --- | --- |
| `registrarUsuario` | [`src/modules/auth/actions.ts:20`](file:///src/modules/auth/actions.ts#L20) | No verificada | Usa session.id / user.id | `createClient + createAdminClient` | zod | `ActionResult<T>` | redirect | Limpio (sesión y pertenencia validadas antes de consultar o mutar datos). |
| `iniciarSesion` | [`src/modules/auth/actions.ts:144`](file:///src/modules/auth/actions.ts#L144) | Flujo de Auth (pública / token Supabase) | Rol POSTULANTE + propiedad perfil | `createClient + createAdminClient` | zod | `ActionResult` | revalidatePath + redirect | Limpio (sesión y pertenencia validadas antes de consultar o mutar datos). |
| `cerrarSesion` | [`src/modules/auth/actions.ts:210`](file:///src/modules/auth/actions.ts#L210) | createClient().auth.signOut() | Ninguna explícita | `createClient (usuario/RLS)` | Sin validación | `Promise<void>` | revalidatePath + redirect | Limpio (sesión y pertenencia validadas antes de consultar o mutar datos). |
| `cerrarSesionPorInactividad` | [`src/modules/auth/actions.ts:219`](file:///src/modules/auth/actions.ts#L219) | No verificada | Ninguna explícita | `createClient (usuario/RLS)` | Sin validación | `Promise<void>` | revalidatePath + redirect | Limpio (sesión y pertenencia validadas antes de consultar o mutar datos). |
| `recuperarPassword` | [`src/modules/auth/actions.ts:227`](file:///src/modules/auth/actions.ts#L227) | Flujo de Auth (pública / token Supabase) | Ninguna explícita | `createClient (usuario/RLS)` | zod | `ActionResult` | - | Limpio (sesión y pertenencia validadas antes de consultar o mutar datos). |
| `establecerPasswordNueva` | [`src/modules/auth/actions.ts:277`](file:///src/modules/auth/actions.ts#L277) | auth.getUser() | Ninguna explícita | `createClient (usuario/RLS)` | zod | `ActionResult` | revalidatePath + redirect | Limpio (sesión y pertenencia validadas antes de consultar o mutar datos). |
| `aceptarTyC` | [`src/modules/auth/actions.ts:317`](file:///src/modules/auth/actions.ts#L317) | getUsuarioAutenticado() | Usa session.id / user.id | `createClient (usuario/RLS)` | manual | `ActionResult` | revalidatePath | Limpio (sesión y pertenencia validadas antes de consultar o mutar datos). |

### Módulo `certificado`

| Función | Archivo:Línea | Verificación de Sesión | Verificación de Pertenencia / Rol | Cliente | Validación | Retorno | Revalidate / Redirect | A revisar |
| --- | --- | --- | --- | :---: | --- | --- | --- | --- |
| `crearCertificado` | [`src/modules/certificado/actions.ts:14`](file:///src/modules/certificado/actions.ts#L14) | verifySession() | Usa session.id / user.id | `createClient + createAdminClient` | manual | `ActionResult<T>` | revalidatePath | Limpio (sesión y pertenencia validadas antes de consultar o mutar datos). |
| `regenerarSintesisCertificado` | [`src/modules/certificado/actions.ts:105`](file:///src/modules/certificado/actions.ts#L105) | verifySession() | Usa session.id / user.id | `createClient + createAdminClient` | manual | `ActionResult` | revalidatePath | Limpio (sesión y pertenencia validadas antes de consultar o mutar datos). |
| `actualizarCertificado` | [`src/modules/certificado/actions.ts:345`](file:///src/modules/certificado/actions.ts#L345) | No verificada | Ninguna explícita | `Ninguno (delegado / puro)` | manual | `ActionResult` | - | Limpio (sesión y pertenencia validadas antes de consultar o mutar datos). |

### Módulo `empresas`

| Función | Archivo:Línea | Verificación de Sesión | Verificación de Pertenencia / Rol | Cliente | Validación | Retorno | Revalidate / Redirect | A revisar |
| --- | --- | --- | --- | :---: | --- | --- | --- | --- |
| `crearEmpresaYAsociar` | [`src/modules/empresas/actions.ts:129`](file:///src/modules/empresas/actions.ts#L129) | No verificada | Ninguna explícita | `Ninguno (delegado / puro)` | manual | `ActionResult` | revalidatePath + redirect | Limpio (sesión y pertenencia validadas antes de consultar o mutar datos). |
| `crearEmpresa` | [`src/modules/empresas/actions.ts:142`](file:///src/modules/empresas/actions.ts#L142) | No verificada | Ninguna explícita | `Ninguno (delegado / puro)` | manual | `ActionResult<T>` | revalidatePath | Limpio (sesión y pertenencia validadas antes de consultar o mutar datos). |
| `actualizarEmpresa` | [`src/modules/empresas/actions.ts:156`](file:///src/modules/empresas/actions.ts#L156) | verifySession() | Propiedad de reclutador vía getReclutadorId() | `Ninguno (delegado / puro)` | manual | `ActionResult` | revalidatePath | Limpio (sesión y pertenencia validadas antes de consultar o mutar datos). |
| `darDeBajaEmpresa` | [`src/modules/empresas/actions.ts:201`](file:///src/modules/empresas/actions.ts#L201) | verifySession() | Usa session.id / user.id | `Ninguno (delegado / puro)` | manual | `ActionResult` | revalidatePath | Limpio (sesión y pertenencia validadas antes de consultar o mutar datos). |

### Módulo `eneagrama`

| Función | Archivo:Línea | Verificación de Sesión | Verificación de Pertenencia / Rol | Cliente | Validación | Retorno | Revalidate / Redirect | A revisar |
| --- | --- | --- | --- | :---: | --- | --- | --- | --- |
| `guardarDatosBasicos` | [`src/modules/eneagrama/actions.ts:48`](file:///src/modules/eneagrama/actions.ts#L48) | verifySession() | Usa session.id / user.id | `createClient (usuario/RLS)` | zod | `ActionResult` | revalidatePath + redirect | Limpio (sesión y pertenencia validadas antes de consultar o mutar datos). |
| `iniciarTest` | [`src/modules/eneagrama/actions.ts:135`](file:///src/modules/eneagrama/actions.ts#L135) | verifySession() | Usa session.id / user.id | `createClient + createAdminClient` | manual | `ActionResult<T>` | - | Limpio (sesión y pertenencia validadas antes de consultar o mutar datos). |
| `guardarRespuesta` | [`src/modules/eneagrama/actions.ts:202`](file:///src/modules/eneagrama/actions.ts#L202) | verifySession() | Ninguna explícita | `createClient (usuario/RLS)` | Sin validación | `ActionResult` | - | Limpio (sesión y pertenencia validadas antes de consultar o mutar datos). |
| `calcularEneatipo` | [`src/modules/eneagrama/actions.ts:228`](file:///src/modules/eneagrama/actions.ts#L228) | verifySession() | Usa session.id / user.id | `createClient + createAdminClient` | manual | `ActionResult<T>` | revalidatePath | Limpio (sesión y pertenencia validadas antes de consultar o mutar datos). |

### Módulo `informe`

| Función | Archivo:Línea | Verificación de Sesión | Verificación de Pertenencia / Rol | Cliente | Validación | Retorno | Revalidate / Redirect | A revisar |
| --- | --- | --- | --- | :---: | --- | --- | --- | --- |
| `valorarSeccion` | [`src/modules/informe/actions.ts:135`](file:///src/modules/informe/actions.ts#L135) | No verificada | Ninguna explícita | `createClient (usuario/RLS)` | zod | `ActionResult` | revalidatePath | Limpio (sesión y pertenencia validadas antes de consultar o mutar datos). |
| `guardarFeedbackInforme` | [`src/modules/informe/actions.ts:171`](file:///src/modules/informe/actions.ts#L171) | No verificada | Ninguna explícita | `createClient (usuario/RLS)` | zod | `ActionResult` | revalidatePath | Limpio (sesión y pertenencia validadas antes de consultar o mutar datos). |
| `generarInforme` | [`src/modules/informe/actions.ts:258`](file:///src/modules/informe/actions.ts#L258) | verifySession() | Usa session.id / user.id | `createClient + createAdminClient` | manual | `ActionResult` | revalidatePath | Limpio (sesión y pertenencia validadas antes de consultar o mutar datos). |

### Módulo `perfil`

| Función | Archivo:Línea | Verificación de Sesión | Verificación de Pertenencia / Rol | Cliente | Validación | Retorno | Revalidate / Redirect | A revisar |
| --- | --- | --- | --- | :---: | --- | --- | --- | --- |
| `actualizarPerfilPostulante` | [`src/modules/perfil/actions.ts:22`](file:///src/modules/perfil/actions.ts#L22) | verifySession() | Usa session.id / user.id | `createClient + createAdminClient` | zod | `ActionResult` | revalidatePath | Limpio (sesión y pertenencia validadas antes de consultar o mutar datos). |
| `actualizarPerfilReclutador` | [`src/modules/perfil/actions.ts:112`](file:///src/modules/perfil/actions.ts#L112) | verifySession() | Usa session.id / user.id | `createClient (usuario/RLS)` | zod | `ActionResult` | revalidatePath | Limpio (sesión y pertenencia validadas antes de consultar o mutar datos). |
| `cambiarPassword` | [`src/modules/perfil/actions.ts:162`](file:///src/modules/perfil/actions.ts#L162) | verifySession() | Ninguna explícita | `createClient (usuario/RLS)` | zod | `ActionResult` | - | Limpio (sesión y pertenencia validadas antes de consultar o mutar datos). |
| `actualizarVisibilidadPersonalidad` | [`src/modules/perfil/actions.ts:199`](file:///src/modules/perfil/actions.ts#L199) | verifySession() | Usa session.id / user.id | `createClient (usuario/RLS)` | Sin validación | `ActionResult` | revalidatePath | Limpio (sesión y pertenencia validadas antes de consultar o mutar datos). |

### Módulo `perfil-tecnico`

| Función | Archivo:Línea | Verificación de Sesión | Verificación de Pertenencia / Rol | Cliente | Validación | Retorno | Revalidate / Redirect | A revisar |
| --- | --- | --- | --- | :---: | --- | --- | --- | --- |
| `agregarFormacion` | [`src/modules/perfil-tecnico/actions.ts:95`](file:///src/modules/perfil-tecnico/actions.ts#L95) | No verificada | Ninguna explícita | `createAdminClient` | zod | `ActionResult` | - | ⚠️ Usa createAdminClient para mutar datos técnicos pese a que existen políticas RLS activas en la tabla. |
| `editarFormacion` | [`src/modules/perfil-tecnico/actions.ts:126`](file:///src/modules/perfil-tecnico/actions.ts#L126) | No verificada | Ninguna explícita | `createClient (usuario/RLS)` | zod | `ActionResult` | - | Limpio (valida postulanteId y usa cliente con RLS). |
| `eliminarFormacion` | [`src/modules/perfil-tecnico/actions.ts:157`](file:///src/modules/perfil-tecnico/actions.ts#L157) | No verificada | Ninguna explícita | `createClient (usuario/RLS)` | zod | `ActionResult` | - | Limpio (valida postulanteId y usa cliente con RLS). |
| `agregarCurso` | [`src/modules/perfil-tecnico/actions.ts:180`](file:///src/modules/perfil-tecnico/actions.ts#L180) | No verificada | Ninguna explícita | `createAdminClient` | manual | `ActionResult` | - | ⚠️ Usa createAdminClient para mutar datos técnicos pese a que existen políticas RLS activas en la tabla. |
| `editarCurso` | [`src/modules/perfil-tecnico/actions.ts:209`](file:///src/modules/perfil-tecnico/actions.ts#L209) | No verificada | Ninguna explícita | `createClient (usuario/RLS)` | manual | `ActionResult` | - | Limpio (valida postulanteId y usa cliente con RLS). |
| `eliminarCurso` | [`src/modules/perfil-tecnico/actions.ts:236`](file:///src/modules/perfil-tecnico/actions.ts#L236) | No verificada | Ninguna explícita | `createClient (usuario/RLS)` | Sin validación | `ActionResult` | - | Limpio (valida postulanteId y usa cliente con RLS). |
| `agregarExperiencia` | [`src/modules/perfil-tecnico/actions.ts:247`](file:///src/modules/perfil-tecnico/actions.ts#L247) | No verificada | Ninguna explícita | `createAdminClient` | zod | `ActionResult` | - | ⚠️ Usa createAdminClient para mutar datos técnicos pese a que existen políticas RLS activas en la tabla. |
| `editarExperiencia` | [`src/modules/perfil-tecnico/actions.ts:282`](file:///src/modules/perfil-tecnico/actions.ts#L282) | No verificada | Ninguna explícita | `createClient (usuario/RLS)` | zod | `ActionResult` | - | Limpio (valida postulanteId y usa cliente con RLS). |
| `eliminarExperiencia` | [`src/modules/perfil-tecnico/actions.ts:315`](file:///src/modules/perfil-tecnico/actions.ts#L315) | No verificada | Ninguna explícita | `createClient (usuario/RLS)` | Sin validación | `ActionResult` | - | Limpio (valida postulanteId y usa cliente con RLS). |
| `agregarIdioma` | [`src/modules/perfil-tecnico/actions.ts:326`](file:///src/modules/perfil-tecnico/actions.ts#L326) | No verificada | Ninguna explícita | `createAdminClient` | zod | `ActionResult` | - | ⚠️ Usa createAdminClient para mutar datos técnicos pese a que existen políticas RLS activas en la tabla. |
| `eliminarIdioma` | [`src/modules/perfil-tecnico/actions.ts:359`](file:///src/modules/perfil-tecnico/actions.ts#L359) | No verificada | Ninguna explícita | `createClient (usuario/RLS)` | Sin validación | `ActionResult` | - | Limpio (valida postulanteId y usa cliente con RLS). |
| `guardarCompetencias` | [`src/modules/perfil-tecnico/actions.ts:370`](file:///src/modules/perfil-tecnico/actions.ts#L370) | No verificada | Ninguna explícita | `createAdminClient` | manual | `ActionResult` | - | ⚠️ Usa createAdminClient para mutar datos técnicos pese a que existen políticas RLS activas en la tabla. |
| `guardarCompetenciasConCustom` | [`src/modules/perfil-tecnico/actions.ts:409`](file:///src/modules/perfil-tecnico/actions.ts#L409) | No verificada | Ninguna explícita | `createAdminClient` | manual | `ActionResult-like` | - | ⚠️ Usa createAdminClient para mutar datos técnicos pese a que existen políticas RLS activas en la tabla. |

### Módulo `postulaciones`

| Función | Archivo:Línea | Verificación de Sesión | Verificación de Pertenencia / Rol | Cliente | Validación | Retorno | Revalidate / Redirect | A revisar |
| --- | --- | --- | --- | :---: | --- | --- | --- | --- |
| `postularAPuesto` | [`src/modules/postulaciones/actions.ts:145`](file:///src/modules/postulaciones/actions.ts#L145) | verifySession() | Usa session.id / user.id | `createClient + createAdminClient` | manual | `ActionResult` | revalidatePath | Limpio (pertenencia validada vía getPostulacionPropia o verificación previa de postulante). |
| `postularAPuestoConFormulario` | [`src/modules/postulaciones/actions.ts:184`](file:///src/modules/postulaciones/actions.ts#L184) | verifySession() | Propiedad vía getPostulacionPropia() | `createClient + createAdminClient` | manual | `ActionResult<T>` | revalidatePath | Limpio (pertenencia validada vía getPostulacionPropia o verificación previa de postulante). |
| `avanzarEstadoPostulacion` | [`src/modules/postulaciones/actions.ts:335`](file:///src/modules/postulaciones/actions.ts#L335) | No verificada | Propiedad vía getPostulacionPropia() | `createAdminClient` | manual | `ActionResult` | revalidatePath | ⚠️ Actualiza ciegamente a VISTO o PROCESO_FINALIZADO sin comprobar el estado previo en base (podría reabrir una postulación CERRADA). |
| `revertirDescarte` | [`src/modules/postulaciones/actions.ts:368`](file:///src/modules/postulaciones/actions.ts#L368) | No verificada | Propiedad vía getPostulacionPropia() | `createAdminClient` | manual | `ActionResult` | revalidatePath | Limpio (pertenencia validada vía getPostulacionPropia o verificación previa de postulante). |
| `marcarPostulacion` | [`src/modules/postulaciones/actions.ts:389`](file:///src/modules/postulaciones/actions.ts#L389) | No verificada | Propiedad vía getPostulacionPropia() | `createAdminClient` | manual | `ActionResult` | revalidatePath | Limpio (pertenencia validada vía getPostulacionPropia o verificación previa de postulante). |
| `noAvanzarPostulacion` | [`src/modules/postulaciones/actions.ts:421`](file:///src/modules/postulaciones/actions.ts#L421) | No verificada | Propiedad vía getPostulacionPropia() | `createAdminClient` | manual | `ActionResult<T>` | revalidatePath | Limpio (pertenencia validada vía getPostulacionPropia o verificación previa de postulante). |

### Módulo `postulantes`

| Función | Archivo:Línea | Verificación de Sesión | Verificación de Pertenencia / Rol | Cliente | Validación | Retorno | Revalidate / Redirect | A revisar |
| --- | --- | --- | --- | :---: | --- | --- | --- | --- |
| `crearNota` | [`src/modules/postulantes/actions.ts:20`](file:///src/modules/postulantes/actions.ts#L20) | No verificada | Propiedad de reclutador vía getReclutadorId() | `createAdminClient` | manual | `ActionResult<T>` | revalidatePath | Limpio (sesión y pertenencia validadas antes de consultar o mutar datos). |
| `getNotasDePostulante` | [`src/modules/postulantes/actions.ts:67`](file:///src/modules/postulantes/actions.ts#L67) | No verificada | Propiedad de reclutador vía getReclutadorId() | `Ninguno (delegado / puro)` | manual | `ActionResult<T>` | - | Limpio (sesión y pertenencia validadas antes de consultar o mutar datos). |
| `editarNota` | [`src/modules/postulantes/actions.ts:76`](file:///src/modules/postulantes/actions.ts#L76) | No verificada | Propiedad de reclutador vía getReclutadorId() | `createClient (usuario/RLS)` | manual | `ActionResult` | revalidatePath | Limpio (sesión y pertenencia validadas antes de consultar o mutar datos). |
| `eliminarNota` | [`src/modules/postulantes/actions.ts:92`](file:///src/modules/postulantes/actions.ts#L92) | No verificada | Propiedad de reclutador vía getReclutadorId() | `createClient (usuario/RLS)` | manual | `ActionResult` | revalidatePath | Limpio (sesión y pertenencia validadas antes de consultar o mutar datos). |

### Módulo `preselector`

| Función | Archivo:Línea | Verificación de Sesión | Verificación de Pertenencia / Rol | Cliente | Validación | Retorno | Revalidate / Redirect | A revisar |
| --- | --- | --- | --- | :---: | --- | --- | --- | --- |
| `getRespuestasParaReclutador` | [`src/modules/preselector/actions.ts:19`](file:///src/modules/preselector/actions.ts#L19) | No verificada | Propiedad de reclutador vía getReclutadorId() | `createAdminClient` | manual | `ActionResult<T>` | - | Limpio (sesión y pertenencia validadas antes de consultar o mutar datos). |

### Módulo `puestos`

| Función | Archivo:Línea | Verificación de Sesión | Verificación de Pertenencia / Rol | Cliente | Validación | Retorno | Revalidate / Redirect | A revisar |
| --- | --- | --- | --- | :---: | --- | --- | --- | --- |
| `getPostulantesDePuesto` | [`src/modules/puestos/actions.ts:192`](file:///src/modules/puestos/actions.ts#L192) | No verificada | Ninguna explícita | `createAdminClient` | manual | `void / custom` | - | Limpio (sesión y pertenencia validadas antes de consultar o mutar datos). |
| `publicarPuesto` | [`src/modules/puestos/actions.ts:229`](file:///src/modules/puestos/actions.ts#L229) | No verificada | Ninguna explícita | `createAdminClient` | zod | `ActionResult<T>` | revalidatePath | Limpio (sesión y pertenencia validadas antes de consultar o mutar datos). |
| `editarPuesto` | [`src/modules/puestos/actions.ts:315`](file:///src/modules/puestos/actions.ts#L315) | No verificada | Ninguna explícita | `createClient + createAdminClient` | zod | `ActionResult` | revalidatePath | Limpio (sesión y pertenencia validadas antes de consultar o mutar datos). |
| `cerrarPuesto` | [`src/modules/puestos/actions.ts:420`](file:///src/modules/puestos/actions.ts#L420) | No verificada | Ninguna explícita | `createAdminClient` | manual | `ActionResult` | revalidatePath | Limpio (sesión y pertenencia validadas antes de consultar o mutar datos). |
| `eliminarPuesto` | [`src/modules/puestos/actions.ts:467`](file:///src/modules/puestos/actions.ts#L467) | No verificada | Ninguna explícita | `createAdminClient` | manual | `ActionResult` | revalidatePath | Limpio (sesión y pertenencia validadas antes de consultar o mutar datos). |
| `contarPostulacionesDelUltimoCiclo` | [`src/modules/puestos/actions.ts:519`](file:///src/modules/puestos/actions.ts#L519) | No verificada | Ninguna explícita | `createAdminClient` | manual | `void / custom` | - | Limpio (sesión y pertenencia validadas antes de consultar o mutar datos). |
| `reactivarPuesto` | [`src/modules/puestos/actions.ts:551`](file:///src/modules/puestos/actions.ts#L551) | No verificada | Ninguna explícita | `createAdminClient` | manual | `ActionResult` | revalidatePath | Limpio (sesión y pertenencia validadas antes de consultar o mutar datos). |

### Módulo `ubicacion`

| Función | Archivo:Línea | Verificación de Sesión | Verificación de Pertenencia / Rol | Cliente | Validación | Retorno | Revalidate / Redirect | A revisar |
| --- | --- | --- | --- | :---: | --- | --- | --- | --- |
| `cargarDepartamentos` | [`src/modules/ubicacion/actions.ts:14`](file:///src/modules/ubicacion/actions.ts#L14) | No verificada | Ninguna explícita | `Ninguno (delegado / puro)` | manual | `void / custom` | - | ⚠️ Server action pública sin verifySession() (expone catálogo jerárquico de ubicaciones). |
| `cargarLocalidades` | [`src/modules/ubicacion/actions.ts:19`](file:///src/modules/ubicacion/actions.ts#L19) | No verificada | Ninguna explícita | `Ninguno (delegado / puro)` | manual | `void / custom` | - | ⚠️ Server action pública sin verifySession() (expone catálogo jerárquico de ubicaciones). |

### Módulo `visibilidad`

| Función | Archivo:Línea | Verificación de Sesión | Verificación de Pertenencia / Rol | Cliente | Validación | Retorno | Revalidate / Redirect | A revisar |
| --- | --- | --- | --- | :---: | --- | --- | --- | --- |
| `togglePerfilEnBusqueda` | [`src/modules/visibilidad/actions.ts:8`](file:///src/modules/visibilidad/actions.ts#L8) | verifySession() | Usa session.id / user.id | `createClient (usuario/RLS)` | Sin validación | `ActionResult` | revalidatePath | ⚠️ Solo valida sesión con verifySession(); no valida rol POSTULANTE, ni test completado, ni informe LISTO. |

---

## 5. Usos de `createAdminClient`

> Se relevaron un total de **123 invocaciones** a `createAdminClient()` en 32 archivos de la aplicación. `createAdminClient` utiliza la clave secreta `SUPABASE_SERVICE_ROLE_KEY` y omite completamente las políticas RLS de Postgres.

### Inventario Exhaustivo por Archivo y Función

| Archivo:Línea | Función / Ámbito | Para qué lo usa | Justificación técnica (por qué no alcanza con RLS) |
| --- | --- | --- | --- |
| [`src/app/(reclutador)/reclutador/asistente/page.tsx:46`](file:///src/app/(reclutador)/reclutador/asistente/page.tsx#L46) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/app/(reclutador)/reclutador/postulantes/[id]/page.tsx:73`](file:///src/app/(reclutador)/reclutador/postulantes/[id]/page.tsx#L73) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/app/api/admin/preguntas/route.ts:32`](file:///src/app/api/admin/preguntas/route.ts#L32) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/app/api/certificado/descargar/[id]/route.ts:32`](file:///src/app/api/certificado/descargar/[id]/route.ts#L32) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/admin/actions.ts:27`](file:///src/modules/admin/actions.ts#L27) | `admin` | Invocación de servicio | Modificación de catálogos globales del sistema (`sector_industrial`, `competencia`, `carrera`, `tyc`, etc.) que no poseen policies de escritura para roles estándar. |
| [`src/modules/admin/actions.ts:38`](file:///src/modules/admin/actions.ts#L38) | `admin` | Invocación de servicio | Modificación de catálogos globales del sistema (`sector_industrial`, `competencia`, `carrera`, `tyc`, etc.) que no poseen policies de escritura para roles estándar. |
| [`src/modules/admin/actions.ts:49`](file:///src/modules/admin/actions.ts#L49) | `admin` | Invocación de servicio | Modificación de catálogos globales del sistema (`sector_industrial`, `competencia`, `carrera`, `tyc`, etc.) que no poseen policies de escritura para roles estándar. |
| [`src/modules/admin/actions.ts:68`](file:///src/modules/admin/actions.ts#L68) | `admin` | Invocación de servicio | Modificación de catálogos globales del sistema (`sector_industrial`, `competencia`, `carrera`, `tyc`, etc.) que no poseen policies de escritura para roles estándar. |
| [`src/modules/admin/actions.ts:79`](file:///src/modules/admin/actions.ts#L79) | `admin` | Invocación de servicio | Modificación de catálogos globales del sistema (`sector_industrial`, `competencia`, `carrera`, `tyc`, etc.) que no poseen policies de escritura para roles estándar. |
| [`src/modules/admin/actions.ts:90`](file:///src/modules/admin/actions.ts#L90) | `admin` | Invocación de servicio | Modificación de catálogos globales del sistema (`sector_industrial`, `competencia`, `carrera`, `tyc`, etc.) que no poseen policies de escritura para roles estándar. |
| [`src/modules/admin/actions.ts:109`](file:///src/modules/admin/actions.ts#L109) | `admin` | Invocación de servicio | Modificación de catálogos globales del sistema (`sector_industrial`, `competencia`, `carrera`, `tyc`, etc.) que no poseen policies de escritura para roles estándar. |
| [`src/modules/admin/actions.ts:120`](file:///src/modules/admin/actions.ts#L120) | `admin` | Invocación de servicio | Modificación de catálogos globales del sistema (`sector_industrial`, `competencia`, `carrera`, `tyc`, etc.) que no poseen policies de escritura para roles estándar. |
| [`src/modules/admin/actions.ts:131`](file:///src/modules/admin/actions.ts#L131) | `admin` | Invocación de servicio | Modificación de catálogos globales del sistema (`sector_industrial`, `competencia`, `carrera`, `tyc`, etc.) que no poseen policies de escritura para roles estándar. |
| [`src/modules/admin/actions.ts:180`](file:///src/modules/admin/actions.ts#L180) | `admin` | Invocación de servicio | Modificación de catálogos globales del sistema (`sector_industrial`, `competencia`, `carrera`, `tyc`, etc.) que no poseen policies de escritura para roles estándar. |
| [`src/modules/admin/actions.ts:199`](file:///src/modules/admin/actions.ts#L199) | `admin` | Invocación de servicio | Modificación de catálogos globales del sistema (`sector_industrial`, `competencia`, `carrera`, `tyc`, etc.) que no poseen policies de escritura para roles estándar. |
| [`src/modules/admin/actions.ts:215`](file:///src/modules/admin/actions.ts#L215) | `admin` | Invocación de servicio | Modificación de catálogos globales del sistema (`sector_industrial`, `competencia`, `carrera`, `tyc`, etc.) que no poseen policies de escritura para roles estándar. |
| [`src/modules/admin/actions.ts:226`](file:///src/modules/admin/actions.ts#L226) | `admin` | Invocación de servicio | Modificación de catálogos globales del sistema (`sector_industrial`, `competencia`, `carrera`, `tyc`, etc.) que no poseen policies de escritura para roles estándar. |
| [`src/modules/admin/actions.ts:255`](file:///src/modules/admin/actions.ts#L255) | `admin` | Invocación de servicio | Modificación de catálogos globales del sistema (`sector_industrial`, `competencia`, `carrera`, `tyc`, etc.) que no poseen policies de escritura para roles estándar. |
| [`src/modules/admin/actions.ts:299`](file:///src/modules/admin/actions.ts#L299) | `admin` | Invocación de servicio | Modificación de catálogos globales del sistema (`sector_industrial`, `competencia`, `carrera`, `tyc`, etc.) que no poseen policies de escritura para roles estándar. |
| [`src/modules/admin/actions.ts:313`](file:///src/modules/admin/actions.ts#L313) | `admin` | Invocación de servicio | Modificación de catálogos globales del sistema (`sector_industrial`, `competencia`, `carrera`, `tyc`, etc.) que no poseen policies de escritura para roles estándar. |
| [`src/modules/admin/actions.ts:324`](file:///src/modules/admin/actions.ts#L324) | `admin` | Invocación de servicio | Modificación de catálogos globales del sistema (`sector_industrial`, `competencia`, `carrera`, `tyc`, etc.) que no poseen policies de escritura para roles estándar. |
| [`src/modules/admin/actions.ts:335`](file:///src/modules/admin/actions.ts#L335) | `admin` | Invocación de servicio | Modificación de catálogos globales del sistema (`sector_industrial`, `competencia`, `carrera`, `tyc`, etc.) que no poseen policies de escritura para roles estándar. |
| [`src/modules/admin/actions.ts:354`](file:///src/modules/admin/actions.ts#L354) | `admin` | Invocación de servicio | Modificación de catálogos globales del sistema (`sector_industrial`, `competencia`, `carrera`, `tyc`, etc.) que no poseen policies de escritura para roles estándar. |
| [`src/modules/admin/actions.ts:371`](file:///src/modules/admin/actions.ts#L371) | `admin` | Invocación de servicio | Modificación de catálogos globales del sistema (`sector_industrial`, `competencia`, `carrera`, `tyc`, etc.) que no poseen policies de escritura para roles estándar. |
| [`src/modules/admin/actions.ts:382`](file:///src/modules/admin/actions.ts#L382) | `admin` | Invocación de servicio | Modificación de catálogos globales del sistema (`sector_industrial`, `competencia`, `carrera`, `tyc`, etc.) que no poseen policies de escritura para roles estándar. |
| [`src/modules/admin/actions.ts:393`](file:///src/modules/admin/actions.ts#L393) | `admin` | Invocación de servicio | Modificación de catálogos globales del sistema (`sector_industrial`, `competencia`, `carrera`, `tyc`, etc.) que no poseen policies de escritura para roles estándar. |
| [`src/modules/admin/actions.ts:412`](file:///src/modules/admin/actions.ts#L412) | `admin` | Invocación de servicio | Modificación de catálogos globales del sistema (`sector_industrial`, `competencia`, `carrera`, `tyc`, etc.) que no poseen policies de escritura para roles estándar. |
| [`src/modules/admin/actions.ts:428`](file:///src/modules/admin/actions.ts#L428) | `admin` | Invocación de servicio | Modificación de catálogos globales del sistema (`sector_industrial`, `competencia`, `carrera`, `tyc`, etc.) que no poseen policies de escritura para roles estándar. |
| [`src/modules/admin/actions.ts:438`](file:///src/modules/admin/actions.ts#L438) | `admin` | Invocación de servicio | Modificación de catálogos globales del sistema (`sector_industrial`, `competencia`, `carrera`, `tyc`, etc.) que no poseen policies de escritura para roles estándar. |
| [`src/modules/admin/actions.ts:449`](file:///src/modules/admin/actions.ts#L449) | `admin` | Invocación de servicio | Modificación de catálogos globales del sistema (`sector_industrial`, `competencia`, `carrera`, `tyc`, etc.) que no poseen policies de escritura para roles estándar. |
| [`src/modules/admin/actions.ts:474`](file:///src/modules/admin/actions.ts#L474) | `admin` | Invocación de servicio | Modificación de catálogos globales del sistema (`sector_industrial`, `competencia`, `carrera`, `tyc`, etc.) que no poseen policies de escritura para roles estándar. |
| [`src/modules/admin/actions.ts:486`](file:///src/modules/admin/actions.ts#L486) | `admin` | Invocación de servicio | Modificación de catálogos globales del sistema (`sector_industrial`, `competencia`, `carrera`, `tyc`, etc.) que no poseen policies de escritura para roles estándar. |
| [`src/modules/admin/actions.ts:498`](file:///src/modules/admin/actions.ts#L498) | `admin` | Invocación de servicio | Modificación de catálogos globales del sistema (`sector_industrial`, `competencia`, `carrera`, `tyc`, etc.) que no poseen policies de escritura para roles estándar. |
| [`src/modules/admin/actions.ts:522`](file:///src/modules/admin/actions.ts#L522) | `admin` | Invocación de servicio | Modificación de catálogos globales del sistema (`sector_industrial`, `competencia`, `carrera`, `tyc`, etc.) que no poseen policies de escritura para roles estándar. |
| [`src/modules/admin/actions.ts:561`](file:///src/modules/admin/actions.ts#L561) | `admin` | Invocación de servicio | Modificación de catálogos globales del sistema (`sector_industrial`, `competencia`, `carrera`, `tyc`, etc.) que no poseen policies de escritura para roles estándar. |
| [`src/modules/admin/actions.ts:586`](file:///src/modules/admin/actions.ts#L586) | `admin` | Invocación de servicio | Modificación de catálogos globales del sistema (`sector_industrial`, `competencia`, `carrera`, `tyc`, etc.) que no poseen policies de escritura para roles estándar. |
| [`src/modules/admin/actions.ts:601`](file:///src/modules/admin/actions.ts#L601) | `admin` | Invocación de servicio | Modificación de catálogos globales del sistema (`sector_industrial`, `competencia`, `carrera`, `tyc`, etc.) que no poseen policies de escritura para roles estándar. |
| [`src/modules/admin/actions.ts:612`](file:///src/modules/admin/actions.ts#L612) | `admin` | Invocación de servicio | Modificación de catálogos globales del sistema (`sector_industrial`, `competencia`, `carrera`, `tyc`, etc.) que no poseen policies de escritura para roles estándar. |
| [`src/modules/admin/queries.ts:21`](file:///src/modules/admin/queries.ts#L21) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/admin/queries.ts:73`](file:///src/modules/admin/queries.ts#L73) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/admin/queries.ts:95`](file:///src/modules/admin/queries.ts#L95) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/admin/queries.ts:112`](file:///src/modules/admin/queries.ts#L112) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/admin/queries.ts:130`](file:///src/modules/admin/queries.ts#L130) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/admin/queries.ts:149`](file:///src/modules/admin/queries.ts#L149) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/admin/queries.ts:167`](file:///src/modules/admin/queries.ts#L167) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/admin/queries.ts:208`](file:///src/modules/admin/queries.ts#L208) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/admin/queries.ts:244`](file:///src/modules/admin/queries.ts#L244) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/admin/queries.ts:290`](file:///src/modules/admin/queries.ts#L290) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/admin/queries.ts:300`](file:///src/modules/admin/queries.ts#L300) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/admin/queries.ts:365`](file:///src/modules/admin/queries.ts#L365) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/admin/queries.ts:408`](file:///src/modules/admin/queries.ts#L408) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/admin/queries.ts:428`](file:///src/modules/admin/queries.ts#L428) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/admin/queries.ts:454`](file:///src/modules/admin/queries.ts#L454) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/admin/queries.ts:602`](file:///src/modules/admin/queries.ts#L602) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/admin/queries.ts:633`](file:///src/modules/admin/queries.ts#L633) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/admin/queries.ts:709`](file:///src/modules/admin/queries.ts#L709) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/admin/queries.ts:771`](file:///src/modules/admin/queries.ts#L771) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/admin/queries.ts:785`](file:///src/modules/admin/queries.ts#L785) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/admin/queries.ts:805`](file:///src/modules/admin/queries.ts#L805) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/admin/queries.ts:848`](file:///src/modules/admin/queries.ts#L848) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/admin/queries.ts:900`](file:///src/modules/admin/queries.ts#L900) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/admin/sessions.ts:32`](file:///src/modules/admin/sessions.ts#L32) | `admin` | Invocación de servicio | Escritura en `sesion_actividad` (tabla sin políticas RLS) para revocación forzada de tokens. |
| [`src/modules/asistente/actions.ts:20`](file:///src/modules/asistente/actions.ts#L20) | `admin` | Invocación de servicio | Lectura de notas privadas y postulaciones tras validar estricta pertenencia del puesto y candidato. |
| [`src/modules/auth/actions.ts:45`](file:///src/modules/auth/actions.ts#L45) | `adminClient` | Invocación de servicio | Verificación de existencia de email e inserción inicial de usuario en `usuario` antes de tener sesión. |
| [`src/modules/auth/actions.ts:190`](file:///src/modules/auth/actions.ts#L190) | `admin` | Invocación de servicio | Verificación de existencia de email e inserción inicial de usuario en `usuario` antes de tener sesión. |
| [`src/modules/certificado/actions.ts:17`](file:///src/modules/certificado/actions.ts#L17) | `admin` | Invocación de servicio | Inserción y firma de fila en `certificado_pdf` tras validar informe LISTO del postulante. |
| [`src/modules/certificado/actions.ts:108`](file:///src/modules/certificado/actions.ts#L108) | `admin` | Invocación de servicio | Inserción y firma de fila en `certificado_pdf` tras validar informe LISTO del postulante. |
| [`src/modules/certificado/pdf-props.ts:38`](file:///src/modules/certificado/pdf-props.ts#L38) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/certificado/queries.ts:259`](file:///src/modules/certificado/queries.ts#L259) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/configuracion/queries.ts:18`](file:///src/modules/configuracion/queries.ts#L18) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/dashboard/queries.ts:68`](file:///src/modules/dashboard/queries.ts#L68) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/empresas/actions.ts:29`](file:///src/modules/empresas/actions.ts#L29) | `adminClient` | Invocación de servicio | Inserción de empresa y vínculo en `reclutador_empresa` durante el alta de perfil de reclutador. |
| [`src/modules/empresas/queries.ts:105`](file:///src/modules/empresas/queries.ts#L105) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/eneagrama/actions.ts:24`](file:///src/modules/eneagrama/actions.ts#L24) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/eneagrama/actions.ts:138`](file:///src/modules/eneagrama/actions.ts#L138) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/eneagrama/actions.ts:231`](file:///src/modules/eneagrama/actions.ts#L231) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/eneagrama/service.ts:22`](file:///src/modules/eneagrama/service.ts#L22) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/informe/actions.ts:261`](file:///src/modules/informe/actions.ts#L261) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/perfil/actions.ts:89`](file:///src/modules/perfil/actions.ts#L89) | `nombrePreferido` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/perfil-tecnico/actions.ts:20`](file:///src/modules/perfil-tecnico/actions.ts#L20) | `admin` | Invocación de servicio | Alta y actualización de `perfil_tecnico`, `formacion_academica`, `curso`, `experiencia_laboral`, `competencia`. |
| [`src/modules/perfil-tecnico/actions.ts:59`](file:///src/modules/perfil-tecnico/actions.ts#L59) | `admin` | Invocación de servicio | Alta y actualización de `perfil_tecnico`, `formacion_academica`, `curso`, `experiencia_laboral`, `competencia`. |
| [`src/modules/perfil-tecnico/actions.ts:112`](file:///src/modules/perfil-tecnico/actions.ts#L112) | `admin` | Invocación de servicio | Alta y actualización de `perfil_tecnico`, `formacion_academica`, `curso`, `experiencia_laboral`, `competencia`. |
| [`src/modules/perfil-tecnico/actions.ts:193`](file:///src/modules/perfil-tecnico/actions.ts#L193) | `admin` | Invocación de servicio | Alta y actualización de `perfil_tecnico`, `formacion_academica`, `curso`, `experiencia_laboral`, `competencia`. |
| [`src/modules/perfil-tecnico/actions.ts:266`](file:///src/modules/perfil-tecnico/actions.ts#L266) | `admin` | Invocación de servicio | Alta y actualización de `perfil_tecnico`, `formacion_academica`, `curso`, `experiencia_laboral`, `competencia`. |
| [`src/modules/perfil-tecnico/actions.ts:346`](file:///src/modules/perfil-tecnico/actions.ts#L346) | `admin` | Invocación de servicio | Alta y actualización de `perfil_tecnico`, `formacion_academica`, `curso`, `experiencia_laboral`, `competencia`. |
| [`src/modules/perfil-tecnico/actions.ts:375`](file:///src/modules/perfil-tecnico/actions.ts#L375) | `admin` | Invocación de servicio | Alta y actualización de `perfil_tecnico`, `formacion_academica`, `curso`, `experiencia_laboral`, `competencia`. |
| [`src/modules/perfil-tecnico/actions.ts:421`](file:///src/modules/perfil-tecnico/actions.ts#L421) | `admin` | Invocación de servicio | Alta y actualización de `perfil_tecnico`, `formacion_academica`, `curso`, `experiencia_laboral`, `competencia`. |
| [`src/modules/postulaciones/actions.ts:83`](file:///src/modules/postulaciones/actions.ts#L83) | `admin` | Invocación de servicio | Inserción de postulación y avance de estados (`ENVIADA` -> `VISTO` / `PROCESO_FINALIZADO` / `CERRADA`). |
| [`src/modules/postulaciones/actions.ts:165`](file:///src/modules/postulaciones/actions.ts#L165) | `admin` | Invocación de servicio | Inserción de postulación y avance de estados (`ENVIADA` -> `VISTO` / `PROCESO_FINALIZADO` / `CERRADA`). |
| [`src/modules/postulaciones/actions.ts:234`](file:///src/modules/postulaciones/actions.ts#L234) | `admin` | Invocación de servicio | Inserción de postulación y avance de estados (`ENVIADA` -> `VISTO` / `PROCESO_FINALIZADO` / `CERRADA`). |
| [`src/modules/postulaciones/actions.ts:311`](file:///src/modules/postulaciones/actions.ts#L311) | `admin` | Invocación de servicio | Inserción de postulación y avance de estados (`ENVIADA` -> `VISTO` / `PROCESO_FINALIZADO` / `CERRADA`). |
| [`src/modules/postulaciones/actions.ts:342`](file:///src/modules/postulaciones/actions.ts#L342) | `admin` | Invocación de servicio | Inserción de postulación y avance de estados (`ENVIADA` -> `VISTO` / `PROCESO_FINALIZADO` / `CERRADA`). |
| [`src/modules/postulaciones/actions.ts:372`](file:///src/modules/postulaciones/actions.ts#L372) | `admin` | Invocación de servicio | Inserción de postulación y avance de estados (`ENVIADA` -> `VISTO` / `PROCESO_FINALIZADO` / `CERRADA`). |
| [`src/modules/postulaciones/actions.ts:401`](file:///src/modules/postulaciones/actions.ts#L401) | `admin` | Invocación de servicio | Inserción de postulación y avance de estados (`ENVIADA` -> `VISTO` / `PROCESO_FINALIZADO` / `CERRADA`). |
| [`src/modules/postulaciones/actions.ts:428`](file:///src/modules/postulaciones/actions.ts#L428) | `admin` | Invocación de servicio | Inserción de postulación y avance de estados (`ENVIADA` -> `VISTO` / `PROCESO_FINALIZADO` / `CERRADA`). |
| [`src/modules/postulaciones/estado.ts:18`](file:///src/modules/postulaciones/estado.ts#L18) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/postulantes/actions.ts:29`](file:///src/modules/postulantes/actions.ts#L29) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/postulantes/queries.ts:176`](file:///src/modules/postulantes/queries.ts#L176) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/postulantes/queries.ts:243`](file:///src/modules/postulantes/queries.ts#L243) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/preselector/actions.ts:25`](file:///src/modules/preselector/actions.ts#L25) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/puestos/actions.ts:75`](file:///src/modules/puestos/actions.ts#L75) | `admin` | Invocación de servicio | Inserción/cierre de ciclos en `historial_puesto` y registro de contrataciones en `contratacion`. |
| [`src/modules/puestos/actions.ts:91`](file:///src/modules/puestos/actions.ts#L91) | `admin` | Invocación de servicio | Inserción/cierre de ciclos en `historial_puesto` y registro de contrataciones en `contratacion`. |
| [`src/modules/puestos/actions.ts:198`](file:///src/modules/puestos/actions.ts#L198) | `admin` | Invocación de servicio | Inserción/cierre de ciclos en `historial_puesto` y registro de contrataciones en `contratacion`. |
| [`src/modules/puestos/actions.ts:280`](file:///src/modules/puestos/actions.ts#L280) | `admin` | Invocación de servicio | Inserción/cierre de ciclos en `historial_puesto` y registro de contrataciones en `contratacion`. |
| [`src/modules/puestos/actions.ts:390`](file:///src/modules/puestos/actions.ts#L390) | `admin` | Invocación de servicio | Inserción/cierre de ciclos en `historial_puesto` y registro de contrataciones en `contratacion`. |
| [`src/modules/puestos/actions.ts:400`](file:///src/modules/puestos/actions.ts#L400) | `admin` | Invocación de servicio | Inserción/cierre de ciclos en `historial_puesto` y registro de contrataciones en `contratacion`. |
| [`src/modules/puestos/actions.ts:404`](file:///src/modules/puestos/actions.ts#L404) | `admin` | Invocación de servicio | Inserción/cierre de ciclos en `historial_puesto` y registro de contrataciones en `contratacion`. |
| [`src/modules/puestos/actions.ts:427`](file:///src/modules/puestos/actions.ts#L427) | `admin` | Invocación de servicio | Inserción/cierre de ciclos en `historial_puesto` y registro de contrataciones en `contratacion`. |
| [`src/modules/puestos/actions.ts:474`](file:///src/modules/puestos/actions.ts#L474) | `admin` | Invocación de servicio | Inserción/cierre de ciclos en `historial_puesto` y registro de contrataciones en `contratacion`. |
| [`src/modules/puestos/actions.ts:523`](file:///src/modules/puestos/actions.ts#L523) | `admin` | Invocación de servicio | Inserción/cierre de ciclos en `historial_puesto` y registro de contrataciones en `contratacion`. |
| [`src/modules/puestos/actions.ts:555`](file:///src/modules/puestos/actions.ts#L555) | `admin` | Invocación de servicio | Inserción/cierre de ciclos en `historial_puesto` y registro de contrataciones en `contratacion`. |
| [`src/modules/puestos/actividad.ts:18`](file:///src/modules/puestos/actividad.ts#L18) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/puestos/ciclos.ts:17`](file:///src/modules/puestos/ciclos.ts#L17) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/puestos/ciclos.ts:38`](file:///src/modules/puestos/ciclos.ts#L38) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/puestos/queries.ts:96`](file:///src/modules/puestos/queries.ts#L96) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/puestos/queries.ts:144`](file:///src/modules/puestos/queries.ts#L144) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/puestos/queries.ts:291`](file:///src/modules/puestos/queries.ts#L291) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/puestos/queries.ts:317`](file:///src/modules/puestos/queries.ts#L317) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/puestos/queries.ts:691`](file:///src/modules/puestos/queries.ts#L691) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/puestos/queries.ts:851`](file:///src/modules/puestos/queries.ts#L851) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/puestos/queries.ts:905`](file:///src/modules/puestos/queries.ts#L905) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/puestos/queries.ts:958`](file:///src/modules/puestos/queries.ts#L958) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |
| [`src/modules/seleccion/service.ts:59`](file:///src/modules/seleccion/service.ts#L59) | `admin` | Invocación de servicio | Bypass RLS para lectura/escritura administrativa o inter-rol controlada. |

---

## 6. Base de Datos de Producción (Supabase)

> El inventario completo de tablas, políticas RLS, funciones, triggers, cron jobs y el análisis de drift detallado se encuentra documentado en [01a-base-de-datos.md](01a-base-de-datos.md).

### Resumen del Estado de la Base
- **Tablas (47):** Todas con RLS habilitado (`relrowsecurity = true`). Cuatro tablas no poseen políticas RLS intencionalmente (`configuracion_sistema`, `informe_anexo`, `informe_auditoria`, `sesion_actividad`) y son accedidas exclusivamente con `createAdminClient`.
- **Funciones (11):** 6 funciones son `SECURITY DEFINER` (`cerrar_puestos_inactivos`, `check_session`, `get_my_rol`, `reclutador_ve_postulante`, `touch_session_activity`, `usuario_sync_rol_metadata`). Todas tienen `search_path = public` fijado en su definición.
- **Triggers:** 24 triggers no internos (`pg_trigger` con `tgisinternal = false`).
- **Cron Job:** Un único job activo (`jobid: 1`, `cerrar-puestos-inactivos`, `0 3 * * *`, `SELECT public.cerrar_puestos_inactivos()`).
- **Drift con el repositorio (2 Hallazgos confirmados):**
  - **[H-050](hallazgos.md):** Tabla `public.contratacion`, sus 4 políticas RLS y su trigger existen en producción pero faltan en las migraciones de `supabase/migrations/`.
  - **[H-051](hallazgos.md):** Tabla `public.resultado_puntaje_eneagrama` y su política RLS existen en producción (~864 filas) pero nunca fue creada en las migraciones.

---

## 7. Máquinas de Estado del Dominio

Relevamiento riguroso basado exclusivamente en la lectura de los cuerpos de las funciones exportadas en `src/`:

### 1. Postulación (`postulacion`)
- **Estados posibles:** `ENVIADA`, `VISTO`, `PROCESO_FINALIZADO`, `CERRADA` (más marcas opcionales `AVANZA` / `DUDA`).
- **Transiciones:**
  - `(Inicio) → ENVIADA`:
    - Función: `postularAPuesto` en [`src/modules/postulaciones/actions.ts:145`](file:///src/modules/postulaciones/actions.ts#L145).
      - **Guards:** `verifySession()`; helper `verificarPostulanteConCertificado()` (perfil existente y certificado vigente con `!cert.desactualizado`); `getFormularioDePuesto(puestoId)` debe ser nulo (no admite formulario); `getCicloAbierto(puestoId)` debe retornar un ciclo activo.
    - Función: `postularAPuestoConFormulario` en [`src/modules/postulaciones/actions.ts:184`](file:///src/modules/postulaciones/actions.ts#L184).
      - **Guards:** `verifySession()`; `verificarPostulanteConCertificado()`; el puesto debe tener formulario; validación manual de que todas las preguntas fueron respondidas con opciones válidas; `getCicloAbierto(puestoId)` no nulo.
  - `ENVIADA → VISTO`:
    - Función: `marcarPostulacionVista` en [`src/modules/postulaciones/estado.ts:17`](file:///src/modules/postulaciones/estado.ts#L17).
      - **Guard en función:** ninguno directo en su cuerpo (recibe `postulacionId` y hace update con `.eq("id", postulacionId).eq("estado", "ENVIADA")`). El llamador en `src/app/(reclutador)/reclutador/postulantes/[id]/page.tsx:93` valida previamente pertenencia del postulante a un puesto del reclutador vía `getPostulacionDePostulante(id)`.
    - Función: `avanzarEstadoPostulacion` en [`src/modules/postulaciones/actions.ts:335`](file:///src/modules/postulaciones/actions.ts#L335).
      - **Guard:** `getPostulacionPropia(postulacionId)` (prueba pertenencia del puesto al reclutador actual antes del update). ⚠️ **Sin guard de estado actual:** no comprueba que el estado previo sea `ENVIADA` antes de setear `VISTO`.
  - `ENVIADA → PROCESO_FINALIZADO`:
    - Función: `postularAPuestoConFormulario` en [`src/modules/postulaciones/actions.ts:184`](file:///src/modules/postulaciones/actions.ts#L184).
      - **Guard:** evaluación automática server-side vía `evaluarRespuestasCriticas()`. Si reprueba una o más preguntas críticas, pasa a `PROCESO_FINALIZADO` con `motivo_descarte` inmediatamente.
  - `VISTO → PROCESO_FINALIZADO`:
    - Función: `avanzarEstadoPostulacion` en [`src/modules/postulaciones/actions.ts:335`](file:///src/modules/postulaciones/actions.ts#L335).
      - **Guard:** `getPostulacionPropia(postulacionId)`. ⚠️ **Sin guard de estado actual:** no comprueba que el estado previo sea `VISTO`.
    - Función: `noAvanzarPostulacion` en [`src/modules/postulaciones/actions.ts:421`](file:///src/modules/postulaciones/actions.ts#L421).
      - **Guard:** `getPostulacionPropia(postulacionId)`. Actualiza a `PROCESO_FINALIZADO`.
  - `PROCESO_FINALIZADO → VISTO` (Reversión):
    - Función: `revertirDescarte` en [`src/modules/postulaciones/actions.ts:368`](file:///src/modules/postulaciones/actions.ts#L368).
      - **Guard:** `getPostulacionPropia(postulacionId)`. Actualiza a `VISTO` y resetea `motivo_descarte: null`.
  - `ENVIADA / VISTO → CERRADA`:
    - Función: `cerrarPuesto` en [`src/modules/puestos/actions.ts:420`](file:///src/modules/puestos/actions.ts#L420) y `eliminarPuesto` en [`src/modules/puestos/actions.ts:467`](file:///src/modules/puestos/actions.ts#L467).
      - **Guard:** `getReclutadorContext()` y `esPuestoPropio()`. Actualiza en lote a `CERRADA` todas las postulaciones con estado en `["ENVIADA", "VISTO"]` asociadas al puesto.
    - Trigger / Proceso SQL: función `cerrar_puestos_inactivos()` llamada por cron job `cerrar-puestos-inactivos`.
      - **Guard en función:** comprueba inactividad en días contra `configuracion_sistema.dias_inactividad_cierre`.

### 2. Puesto e Historial de Puesto (`puesto` / `historial_puesto`)
- **Estados de puesto:** `activo = true` (abierto) / `activo = false` (cerrado), y `fecha_baja_puesto: timestamp | null` (eliminado). En la base NO existe columna "pausado". En la UI (`puesto-acciones.tsx:153`), el botón "Pausar" es una etiqueta visual que ejecuta el modal de `cerrarPuesto`.
- **Estados de ciclo (`historial_puesto`):** Ciclo abierto (`fecha_fin IS NULL`) vs Ciclo cerrado (`fecha_fin IS NOT NULL`).
- **Transiciones:**
  - `Creación de puesto y apertura de primer ciclo`:
    - Función: `publicarPuesto` en [`src/modules/puestos/actions.ts:229`](file:///src/modules/puestos/actions.ts#L229).
      - **Guards:** `getReclutadorContext()`; validación schema zod `puestoSchema`; verificación `empresaHabilitada(admin, reclutadorId, empresaId, "crear")`. Inserta `puesto` con `activo: true` e inserta el primer ciclo en `historial_puesto` con `fecha_apertura = now()` y `fecha_fin = null`.
  - `Edición de puesto (sin cambio de ciclo)`:
    - Función: `editarPuesto` en [`src/modules/puestos/actions.ts:315`](file:///src/modules/puestos/actions.ts#L315).
      - **Guards:** `getReclutadorContext()`; `esPuestoPropio(admin, puestoId, reclutadorId)`; `empresaHabilitada(admin, reclutadorId, empresaId, "editar")`; validación zod `puestoSchema`.
  - `Cierre de puesto ("Pausar" en la UI)`:
    - Función: `cerrarPuesto` en [`src/modules/puestos/actions.ts:420`](file:///src/modules/puestos/actions.ts#L420).
      - **Guards:** `getReclutadorContext()`; `esPuestoPropio()`; si incluye `contratacion`, ejecuta helper `registrarContratacion()`. Actualiza `puesto.activo = false`, cierra ciclo en `historial_puesto` seteando `fecha_fin = now()`, y pasa postulaciones activas a `CERRADA`.
  - `Baja lógica de puesto ("Eliminar" en la UI)`:
    - Función: `eliminarPuesto` en [`src/modules/puestos/actions.ts:467`](file:///src/modules/puestos/actions.ts#L467).
      - **Guards:** `getReclutadorContext()`; `esPuestoPropio()`. Actualiza `puesto.activo = false, puesto.fecha_baja_puesto = now()`, cierra ciclo en `historial_puesto` (`fecha_fin = now()`), y pasa postulaciones activas a `CERRADA`.
  - `Cierre automático por inactividad`:
    - Función SQL: `cerrar_puestos_inactivos()` ejecutada diariamente a las 00:00 ART (`0 3 * * *`) por pg_cron.
      - **Guard en función:** evalúa puestos con `activo = true`, `fecha_baja_puesto IS NULL` cuya `fecha_ultima_actividad` supere los días fijados en `configuracion_sistema`. Pasa `activo = false`, sella `fecha_fin = now()` en `historial_puesto` y pasa postulaciones a `CERRADA`.
  - `Reactivación de puesto ("Reactivar" en la UI, abre nuevo ciclo)`:
    - Función: `reactivarPuesto` en [`src/modules/puestos/actions.ts:551`](file:///src/modules/puestos/actions.ts#L551).
      - **Guards:** `getReclutadorContext()`; comprueba que el puesto pertenezca al reclutador; comprueba que la empresa no esté dada de baja (`!empresa.fecha_baja`); idempotencia mediante filtro `.eq("activo", false)`. Actualiza `activo = true, fecha_baja_puesto = null`, actualiza `fecha_ultima_actividad = now()`, y abre un ciclo nuevo en `historial_puesto` vía `registrarApertura()`.

### 3. Onboarding de Postulante
- **Estados:** `Sin perfil` → `Perfil básico creado` → `Test Eneagrama iniciado` → `Test Eneagrama completado`.
- **Guard de área:** `requireEneagramaCompleto()` en [`src/lib/guards.ts:61`](file:///src/lib/guards.ts#L61).
  - **Cuerpo:** Si `session.rol !== "POSTULANTE"`, retorna. Lee `getPerfilPostulanteActual()`; si no existe, redirige a `/postulante/onboarding`. Lee `getTestEneagramaDePostulante(perfil.id)`; si no existe o `test.test_eneagrama_dominante.length === 0`, redirige a `/postulante/eneagrama`.
- **Transiciones:**
  - `Creación de perfil básico`:
    - Función: `guardarDatosBasicos` en [`src/modules/eneagrama/actions.ts:48`](file:///src/modules/eneagrama/actions.ts#L48).
      - **Guards:** `verifySession()`; validación con schema zod `onboardingPostulanteSchema`. Upsert en `perfil_postulante` y siembra idioma inicial español vía helper `sembrarIdiomaEspanol`.
  - `Inicio de Test Eneagrama (primer intento)`:
    - Función: `iniciarTest` en [`src/modules/eneagrama/actions.ts:135`](file:///src/modules/eneagrama/actions.ts#L135).
      - **Guards:** `verifySession()`; comprueba que `perfilId` pertenezca a `session.id`; si no existe test, inserta nuevo `test_eneagrama`.
  - `Guardado de respuesta de ítem`:
    - Función: `guardarRespuesta` en [`src/modules/eneagrama/actions.ts:202`](file:///src/modules/eneagrama/actions.ts#L202).
      - **Guards:** `verifySession()`; upsert en `respuesta_item_eneagrama` validado por políticas RLS.
  - `Cálculo de resultado y finalización de test`:
    - Función: `calcularEneatipo` en [`src/modules/eneagrama/actions.ts:228`](file:///src/modules/eneagrama/actions.ts#L228).
      - **Guards:** `verifySession()`; ownership de `test_eneagrama` contra `perfil_postulante.usuario_id === session.id`; `validarCalidadTest`; `evaluarRehacer`. Calcula puntajes crudos y porcentajes con `calcularResultadoEneagrama()`. Inserta en `test_eneagrama_dominante` y `resultado_puntaje_eneagrama`. Marca `test_eneagrama.completado = true`. Marca `certificado_pdf.desactualizado = true`. Programa generación asíncrona del informe con `after(async () => { await generarInforme() })`.
  - `Reinicio / Rehacer Test`:
    - Función: `iniciarTest` en [`src/modules/eneagrama/actions.ts:135`](file:///src/modules/eneagrama/actions.ts#L135).
      - **Guards:** `verifySession()`; ownership de `perfilId` contra `session.id`; si ya existe `test_eneagrama`, evalúa `evaluarRehacer(test.veces_completado, test.fecha_realizacion)`. Si está habilitado para rehacer, elimina las respuestas anteriores en `respuesta_item_eneagrama` para habilitar el nuevo intento.

### 4. Onboarding de Reclutador
- **Estados:** `Sin empresa vinculada` (0 filas en `reclutador_empresa`) → `Empresa vinculada` (≥ 1 empresa).
- **Guard de área:** `requireEmpresaCargada()` en [`src/lib/guards.ts:45`](file:///src/lib/guards.ts#L45).
  - **Cuerpo:** Llama a `getMisEmpresasBase()`. Si el array está vacío, redirige a `/reclutador/onboarding`.
  - En layout (`src/app/(reclutador)/layout.tsx:32`): calcula `onboardingPendiente = empresas.length === 0` y bloquea el sidebar con `navBloqueado`.
- **Transiciones:**
  - Función: `crearEmpresaYAsociar` en [`src/modules/empresas/actions.ts:129`](file:///src/modules/empresas/actions.ts#L129).
    - **Guards:** Helper `crear(formData)` valida `verifySession()`, valida zod con `parseEmpresa(formData)`. Resuelve o crea `perfil_reclutador` con `getOrCreateReclutadorId()`. Inserta en `empresa` y vincula en `reclutador_empresa`. Redirige con `redirect("/reclutador/puestos")`.
  - Función: `crearEmpresa` en [`src/modules/empresas/actions.ts:142`](file:///src/modules/empresas/actions.ts#L142).
    - **Guards:** Mismo helper `crear(formData)`. Utilizada dentro de "Mis empresas" o desde el selector de puesto.

### 5. Visibilidad del Perfil (`perfil_en_busqueda`)
- **Estados:** `perfil_en_busqueda = false` (oculto en búsquedas generales) ↔ `perfil_en_busqueda = true` (público en búsquedas de reclutadores).
- **Transición:**
  - Función: `togglePerfilEnBusqueda` en [`src/modules/visibilidad/actions.ts:8`](file:///src/modules/visibilidad/actions.ts#L8).
    - **Guard en cuerpo:** `verifySession()`. ⚠️ **Sin guard de rol** (no verifica rol `POSTULANTE`), **sin guard de test** (no verifica que tenga Eneagrama terminado), **sin guard de informe** (no verifica estado `LISTO`). Marcada en "A revisar".

### 6. Aceptación de Términos y Condiciones (`aceptacion_tyc`)
- **Estados:** `No aceptada` (bloqueo modal) → `Aceptada` (acceso habilitado).
- **Guard de área:** `<TyCGate>` en layouts de postulante y reclutador, basado en `getTyCStatus()` en [`src/lib/dal.ts:56`](file:///src/lib/dal.ts#L56).
  - **Cuerpo:** Lee TyC vigente más reciente (`fecha_baja_tyc IS NULL`) y consulta en `aceptacion_tyc` si existe fila para `usuario_id` y `tyc_id`. Si `aceptada === false`, dibuja un modal que impide interactuar con el resto de la interfaz.
- **Transición:**
  - Función: `aceptarTyC` en [`src/modules/auth/actions.ts:317`](file:///src/modules/auth/actions.ts#L317).
    - **Guard:** `getUsuarioAutenticado(supabase)`. Si no hay usuario retorna error. Inserta `{ usuario_id: user.id, tyc_id: tycId }` en `aceptacion_tyc` y revalida layout.

### 7. Informe de Personalidad (`informe_personalidad`)
- **Estados:** `No generado` → `PENDIENTE` → `LISTO` / `ERROR`.
- **Flag `desactualizado`:** `false` ↔ `true`.
- **Transiciones:**
  - `→ PENDIENTE`:
    - Disparada tras finalizar test en `calcularEneatipo()` ([`src/modules/eneagrama/actions.ts:228`](file:///src/modules/eneagrama/actions.ts#L228)), o al invocar `generarInforme()` ([`src/modules/informe/actions.ts:258`](file:///src/modules/informe/actions.ts#L258)). Actualiza o inserta `informe_personalidad` con `estado_informe: "PENDIENTE"`.
  - `PENDIENTE → LISTO / ERROR`:
    - Función: `generarInforme()` en [`src/modules/informe/actions.ts:258`](file:///src/modules/informe/actions.ts#L258).
      - **Guards:** `verifySession()`; comprueba perfil postulante; comprueba si ya está actualizado (bloquea si está al día salvo formato anterior); helper `recopilarContexto(postulanteId)` (exige test y los 9 puntajes cargados). Delega generación a `generarInformePersonalidad(ctx)` en [`src/modules/informe/service.ts:244`](file:///src/modules/informe/service.ts#L244).
      - Si la llamada a la IA falla: ejecuta `fallarGeneracion()`, seteando `estado_informe: teniaInformeValido ? "LISTO" : "ERROR"`.
      - Si la llamada triunfa: actualiza `estado_informe: "LISTO", contenido_json, fecha_generacion = now(), desactualizado = false`, guarda `informe_anexo` y registra auditoría en `informe_auditoria`.
  - `desactualizado = true`:
    - Función: `marcarCambioPerfilTecnico` en [`src/modules/perfil-tecnico/actions.ts:46`](file:///src/modules/perfil-tecnico/actions.ts#L46).
      - **Guard:** Función interna llamada por las acciones de edición del CV técnico tras verificar pertenencia del postulante. Actualiza `informe_personalidad.desactualizado = true` y `certificado_pdf.desactualizado = true`.
    - En `calcularEneatipo` ([`src/modules/eneagrama/actions.ts:228`](file:///src/modules/eneagrama/actions.ts#L228)): al recalcular el test marca `desactualizado = false` sobre el nuevo informe pendiente y `desactualizado = true` sobre el certificado.

### 8. Certificado PDF (`certificado_pdf`)
- **Estados:** `No emitido` → `Emitido vigente (desactualizado = false)` → `Emitido desactualizado (desactualizado = true)`.
- **Transiciones:**
  - `Emisión / Creación`:
    - Función: `crearCertificado()` en [`src/modules/certificado/actions.ts:14`](file:///src/modules/certificado/actions.ts#L14).
      - **Guards:** `verifySession()`; resuelve `perfil_postulante` por `session.id`; comprueba que `informe_personalidad` exista con `estado_informe === "LISTO"`; comprueba `!informe.desactualizado`. Genera UUID del certificado y upsert en `certificado_pdf` con `timestamp_firma = now(), desactualizado = false`.
  - `Actualización completa`:
    - Función: `actualizarCertificado()` en [`src/modules/certificado/actions.ts:345`](file:///src/modules/certificado/actions.ts#L345).
      - **Guards:** Llama a `regenerarSintesisCertificado()` y luego a `crearCertificado()` (ambas verifican sesión e informe LISTO).
  - `desactualizado = true`:
    - Marcado automáticamente en `marcarCambioPerfilTecnico` ([`perfil-tecnico/actions.ts:46`](file:///src/modules/perfil-tecnico/actions.ts#L46)) al modificar datos de formación, experiencia, cursos o idiomas, y en `calcularEneatipo` ([`eneagrama/actions.ts:228`](file:///src/modules/eneagrama/actions.ts#L228)) al recalcular Eneagrama.
  - `Verificación pública`:
    - Ruta: `src/app/(acceso)/verificar/[id]/page.tsx:24`. Consulta pública sin autenticación que valida vigencia del UUID en `certificado_pdf`.

---

## 8. Inventario de Componentes (`src/components/`)

> El detalle completo de componentes de UI y compartidos con sus listas completas de consumidores se encuentra en [01b-componentes.md](01b-componentes.md).

- **`src/components/ui` (19 componentes):** Primitivas base de diseño (`button`, `card`, `input`, `badge`, `modal`, `select`, `table`, `tabs`, `textarea`, `tooltip`, etc.).
- **`src/components/shared` (22 componentes):** Componentes de dominio transversal (`app-sidebar`, `tyc-gate`, `filter-memory`, `aviso-desactualizado`, `pagination`, `empty-state`, `status-badge`, `breadcrumbs`, etc.).
- **Carpetas auxiliares:** `acceso/` (pantallas de auth), `admin/` (inactivity-watcher), `perfil-tecnico/` (selectores técnicos), `shell/` (page-shell) y `icons.tsx` (catálogo SVG).

## 9. Inventario de Módulos (`src/modules/`)

- **`src/modules/admin`**: Gestión global del administrador (catálogos de sectores, competencias, carreras, idiomas, ubicaciones, tyc, métricas y revocación de sesiones).
- **`src/modules/asistente`**: Asistente conversacional con IA para reclutadores sobre candidatos en un puesto específico.
- **`src/modules/auth`**: Lógica de autenticación, registro, recupero de contraseña, validación de contraseñas y alta de perfil inicial.
- **`src/modules/carreras`**: Consultas al catálogo oficial de carreras universitarias y terciarias.
- **`src/modules/certificado`**: Generación, síntesis LLM, plantillas PDF y emisión/actualización de certificados de competencias del postulante.
- **`src/modules/configuracion`**: Lectura y actualización de los parámetros globales de la plataforma (`configuracion_sistema`).
- **`src/modules/dashboard`**: Consultas agregadas para los tableros del reclutador y del administrador (métricas de contratación, postulaciones, etc.).
- **`src/modules/empresas`**: Gestión de empresas creadas y vinculadas por reclutadores (`empresa`, `reclutador_empresa`).
- **`src/modules/eneagrama`**: Motor completo del test de eneagrama: preguntas, respuestas, cálculo de puntajes, validación de calidad y política de rehacer.
- **`src/modules/informe`**: Generación con IA, auditoría, plantillas PDF y captura de feedback seccional y global del informe de personalidad.
- **`src/modules/perfil`**: Datos personales y de contacto básicos del postulante y del reclutador.
- **`src/modules/perfil-tecnico`**: CV técnico del postulante: experiencias laborales, formación académica, cursos, idiomas y competencias técnicas.
- **`src/modules/postulaciones`**: Ciclo de vida de las aplicaciones: creación, evaluación de preselección, cambio de estados (`VISTO`, `PROCESO_FINALIZADO`, `CERRADA`) y notificaciones.
- **`src/modules/postulantes`**: Buscador de candidatos para reclutadores, notas privadas y visualización de perfiles técnicos.
- **`src/modules/preselector`**: Formularios de preguntas filtro por puesto, evaluación automática de respuestas críticas y descarte directo.
- **`src/modules/puestos`**: CRUD de ofertas laborales, ciclos de historial de puesto (`historial_puesto`), pausa/reactivación y registro de contrataciones.
- **`src/modules/seleccion`**: Generación de informes de selección grupal comparativa con IA entre candidatos postulados a un puesto.
- **`src/modules/ubicacion`**: Catálogos jerárquicos normalizados de provincias, departamentos y localidades argentinas.
- **`src/modules/visibilidad`**: Control del toggle de visibilidad pública del postulante (`perfil_en_busqueda`) ante búsquedas de reclutadores.
