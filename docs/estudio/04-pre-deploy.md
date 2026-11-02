# Revisión Pre-Deploy (Fase 4)

## Resumen Ejecutivo

- **Conteo general:** 7 ✅ cumple | 14 ❌ no cumple | 2 ⚠️ no verificable desde el repo (sobre 23 ítems auditados).
- **❌ Bloqueantes para el deploy a producción:**
  1. **Separación de bases dev/prod ([H-002](hallazgos.md)):** Hoy desarrollo, tests E2E y producción comparten la misma base de datos.
  2. **Claves de entorno compartidas ([H-001](hallazgos.md), [H-002](hallazgos.md)):** No existen credenciales independientes para un entorno de staging/desarrollo aislado y hay credenciales hardcodeadas en fixtures de tests.
  3. **Migraciones no reproducibles y drift ([H-006](hallazgos.md), [H-050](hallazgos.md), [H-051](hallazgos.md)):** La BD no tiene tabla de historial de migraciones y faltan DDL de `contratacion` y `resultado_puntaje_eneagrama` en el repositorio.
  4. **Vulnerabilidades críticas de seguridad / P0 ([H-200](hallazgos.md), [H-201](hallazgos.md), [H-202](hallazgos.md), [H-211](hallazgos.md)):** Fuga masiva de experiencia laboral por join trivial en RLS `experiencia_select` ([H-200](hallazgos.md)), escalamiento de privilegios a ADMIN en registro de usuarios ([H-201](hallazgos.md)), exposición pública de directivas confidenciales de perfil psicológico en puestos ([H-202](hallazgos.md)), y secuestro/defacement de empresas ajenas por falta de validación en `reclutador_empresa_insert` ([H-211](hallazgos.md)).
  5. **Smoke test del QA_PLAN con fallas bloqueantes ([H-201](hallazgos.md), [H-202](hallazgos.md), [H-203](hallazgos.md)):** TC-PUE-008 falla por exposición de `perfil_psicologico_deseado` en RLS ([H-202](hallazgos.md)), registro permite escalamiento a ADMIN ([H-201](hallazgos.md)) y `avanzarEstadoPostulacion` reabre postulaciones cerradas ([H-203](hallazgos.md)).
  6. **Incumplimiento de Ley 25.326 y TyC placeholder ([H-302](hallazgos.md)):** La versión vigente de `terminos_y_condiciones` es un texto de prueba ("Terminos y condiciones") sin consentimiento para tests de personalidad, sin finalidad ni derechos ARCO, y no existe flujo de borrado de cuenta ni exportación de datos.

---

## 1. Datos y Base

### 1.1 Separar la base de desarrollo de la de producción
- **Veredicto:** ❌ no cumple
- **Evidencia:** `PLAN_ESTUDIO_PRE_DEPLOY.md:27`, `docs/estudio/00-linea-base.md:4`, [H-002](hallazgos.md). Hoy existe un único proyecto de Supabase (`abhfueuhriqrtpdtdvzd`) compartido entre desarrollo local, suites E2E y producción.
- **Qué falta:** Crear un proyecto de Supabase independiente para desarrollo/staging y aislar la base productiva.

### 1.2 Las migraciones reconstruyen la base desde cero sin errores, y lo que está en el repo coincide con lo aplicado
- **Veredicto:** ❌ no cumple
- **Evidencia:** [H-006](hallazgos.md) (la BD no posee tabla `supabase_migrations.schema_migrations` por haberse aplicado a mano), [H-050](hallazgos.md) (drift de tabla `contratacion`, sus 4 políticas RLS y su trigger ausentes en migraciones) y [H-051](hallazgos.md) (drift de tabla `resultado_puntaje_eneagrama` omitida en migraciones iniciales pero referenciada después).
- **Qué falta:** Generar las migraciones faltantes para `contratacion` y `resultado_puntaje_eneagrama`, levantar una base limpia en staging y verificar paridad estructural 1:1.

### 1.3 Hay backups automáticos y un procedimiento de restauración probado una vez
- **Veredicto:** ⚠️ no verificable desde el repo
- **Evidencia:** En el repositorio no existen scripts de backup ni documentación de restauración (Point-In-Time Recovery / dumps).
- **Qué falta:** Verificar en Supabase Dashboard > Database > Backups que los respaldos automáticos estén activos y realizar un simulacro de restauración en staging.

### 1.4 Advisors de seguridad y performance de Supabase sin alertas críticas
- **Veredicto:** ❌ no cumple
- **Evidencia:** Sin alertas de nivel ERROR, pero con alertas activas de nivel WARN: [H-007](hallazgos.md) (`auth_leaked_password_protection` desactivada en Auth), [H-009](hallazgos.md) (71 advertencias `auth_rls_initplan` por falta de subquery escalar en políticas RLS) y [H-010](hallazgos.md) (16 advertencias `multiple_permissive_policies`).
- **Qué falta:** Activar la protección de contraseñas filtradas en Supabase Auth y consolidar las políticas RLS envolviendo `auth.uid()` y `get_my_rol()` en `(select ...)`.

### 1.5 RLS habilitado en todas las tablas expuestas
- **Veredicto:** ✅ cumple
- **Evidencia:** Consulta a catálogo `pg_tables`: las 47 tablas del esquema `public` tienen `rowsecurity = true` activo.
- **Qué falta:** Nada en cobertura de tablas; mantener activo RLS ante cualquier DDL futuro.

### 1.6 Funciones SECURITY DEFINER con search_path fijo y EXECUTE restringido
- **Veredicto:** ✅ cumple
- **Evidencia:** Consulta a catálogo `pg_proc`: las 6 funciones con `prosecdef = true` (`cerrar_puestos_inactivos`, `check_session`, `get_my_rol`, `reclutador_ve_postulante`, `touch_session_activity`, `usuario_sync_rol_metadata`) tienen `proconfig = search_path=public`, privilegio de ejecución revocado a `anon` y `public`, y restringido a `service_role` o `authenticated` según su rol operativo (migración `20261028000000_endurecer_funciones_security_definer.sql:30-74`).
- **Qué falta:** Cumplido en base de datos.

---

## 2. Configuración y Secretos

### 2.1 Variables de entorno se validan al arrancar y la app falla rápido si falta alguna
- **Veredicto:** ❌ no cumple
- **Evidencia:** [H-303](hallazgos.md). No existe schema de arranque ni `instrumentation.ts`. Relevamiento de variables leídas:
  1. `NEXT_PUBLIC_SUPABASE_URL`: leída en `src/proxy.ts:30`, `src/lib/supabase/server.ts:9`, `src/lib/supabase/server-admin.ts:7`, `next.config.ts:17`. No se valida al boot; si falta, falla en runtime en `createClient` o rompe el build en `next.config.ts`.
  2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`: leída en `src/proxy.ts:31`, `src/lib/supabase/server.ts:10`. No se valida al boot; si falta, falla en runtime con error de clave requerida.
  3. `SUPABASE_SERVICE_ROLE_KEY`: leída en `src/lib/supabase/server-admin.ts:8`. No se valida al boot; si falta, falla en runtime al ejecutar Server Actions administrativas o de sistema.
  4. `NEXT_PUBLIC_APP_URL`: leída en `src/lib/app-url.ts:17`, `src/modules/postulaciones/actions.ts:68`. No se valida al boot; si falta, falla en silencio retornando string vacío o generando links con prefijo `undefined/` en emails.
  5. `GEMINI_API_KEY`: leída en `src/lib/ai/adapters/gemini.ts:9`. No se valida al boot; si falta, lanza excepción en runtime únicamente al invocar el asistente o generar informes.
  6. `GEMINI_MODEL`: leída en `src/lib/ai/adapters/gemini.ts:45`. No se valida al boot; si falta, usa fallback silencioso a `'gemini-2.5-flash'`.
  7. `RESEND_API_KEY`: leída en `src/modules/postulaciones/actions.ts:45`. No se valida al boot; si falta, emite un `console.warn` y aborta silenciosamente el envío sin notificar al usuario.
  8. `EMAIL_POSTULACIONES_HABILITADO`: leída en `src/modules/postulaciones/actions.ts:35`. No se valida al boot; si falta, evalúa a `false` desactivando los envíos.
  9. `NODE_ENV`: leída en `next.config.ts:3` para alternar CSP y HSTS.
- **Qué falta:** Implementar un validador con Zod en `lib/env.ts` ejecutado al boot para asegurar fail-fast si falta cualquier variable obligatoria.

### 2.2 La service_role key no aparece en código cliente ni en el bundle
- **Veredicto:** ✅ cumple
- **Evidencia:** `src/lib/supabase/server-admin.ts:8`. La clave `SUPABASE_SERVICE_ROLE_KEY` no posee el prefijo `NEXT_PUBLIC_`, impidiendo su inlining automático por Next.js. Es consumida exclusivamente por funciones de servidor. Se identificó la falta preventiva de `import 'server-only'` ([H-226](hallazgos.md)) para evitar importaciones accidentales en clientes.
- **Qué falta:** Agregar `import 'server-only'` en `src/lib/supabase/server-admin.ts` ([H-226](hallazgos.md)).

### 2.3 Cada entorno tiene sus propias claves
- **Veredicto:** ❌ no cumple
- **Evidencia:** [H-002](hallazgos.md), `PLAN_ESTUDIO_PRE_DEPLOY.md:27`. Al existir una sola instancia de base de datos, los entornos de desarrollo, tests y producción utilizan idénticas claves `anon` y `service_role`.
- **Qué falta:** Crear proyecto de base de datos para staging y generar un par de claves independiente por cada entorno.

---

## 3. Seguridad

### 3.1 Headers de seguridad en `next.config.ts`
- **Veredicto:** ✅ cumple
- **Evidencia:** `next.config.ts:40-87`. Se configuran cabeceras estrictas:
  - `Content-Security-Policy`: define `default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`. Justifica `'unsafe-inline'` en `script-src` por requerimientos de RSC dinámico de Next.js sin sacrificar protección contra exfiltración (`connect-src`) ni clickjacking.
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()`
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains` (en producción)
  - `poweredByHeader: false` en `next.config.ts:91`
- **Qué falta:** Cumplido en la configuración de la aplicación.

### 3.2 Rate limiting en login, registro, recupero de contraseña y endpoints de IA
- **Veredicto:** ❌ no cumple
- **Evidencia:** En la aplicación no existe limitación de tasa en Server Actions ni en `src/proxy.ts`. En IA, `consultarAsistente` (`src/modules/asistente/actions.ts:13`) y `generarInformeSeleccion` (`src/modules/seleccion/service.ts:53`) no controlan cuota ni frecuencia ([H-221](hallazgos.md)). Lo que aplique Supabase Auth de forma nativa para login, registro y recupero es ⚠️ no verificable desde el repo (requiere consultar el panel de Supabase).
- **Qué falta:** Implementar rate limiting en endpoints de IA con control de cuotas en `consulta_asistente_ia` y middleware de limitación en acciones de autenticación.

### 3.3 Mensajes de error que no filtran detalles internos
- **Veredicto:** ✅ cumple
- **Evidencia:** `src/modules/auth/password-error.ts:12` traduce mensajes crudos de contraseñas de Supabase a texto amigable; `src/lib/ai/errores.ts:38` separa el error técnico para logs del mensaje al usuario; los Route Handlers en `src/app/api/` retornan mensajes genéricos en español (`status: 500`); y `src/app/error.tsx:31` y `src/app/global-error.tsx:34` solo exhiben el hash `digest` sin exponer stacks.
- **Qué falta:** Cumplido en la capa de interfaz y servicios.

### 3.4 Archivos subidos: tipo, tamaño y bucket con políticas
- **Veredicto:** ✅ cumple
- **Evidencia:** No aplica: la app no cuenta hoy con subida de archivos (los certificados PDF se construyen en memoria al vuelo con `@react-pdf/renderer` según migración `20260828000002_certificado_pdf_sin_storage.sql:1-34`). Los casos de subida de logos (`TC-EMP-003`) y CVs (`TC-CV-001`) figuran como `[PRÓXIMO]` en el QA_PLAN ([H-229](hallazgos.md)).
- **Qué falta:** Cuando se desarrollen las subidas futuras de logo y CV, crear buckets con RLS, límite de tamaño (5 MB) y validación de tipo MIME en el servidor.

---

## 4. Operación

### 4.1 Monitoreo de errores en producción
- **Veredicto:** ❌ no cumple
- **Evidencia:** [H-305](hallazgos.md). En `package.json:17` no existen librerías de APM o reporte de errores (Sentry, LogRocket, Datadog). Los límites de error en `src/app/error.tsx:27` y `src/app/global-error.tsx:30` solo emiten `console.error` local.
- **Qué falta:** Integrar un SDK de monitoreo de errores (Sentry o equivalente) en cliente y servidor.

### 4.2 Logs útiles en actions críticas
- **Veredicto:** ❌ no cumple
- **Evidencia:** [H-306](hallazgos.md). `src/modules/puestos/actions.ts:258` (publicación, cierre y baja de puestos) tiene 0 logs; `src/modules/admin/actions.ts:599` y `src/modules/admin/sessions.ts:28` (revocación de sesiones y cambios administrativos) no emiten registros; no existe pista de auditoría estructurada para acciones de negocio críticas.
- **Qué falta:** Crear un helper estructurado de auditoría en servidor que registre userId, acción, entidad y timestamp ante operaciones críticas.

### 4.3 Páginas error, not-found y global-error revisadas
- **Veredicto:** ✅ cumple
- **Evidencia:** `src/app/error.tsx:31`, `src/app/global-error.tsx:34`, `src/app/not-found.tsx:17` y las páginas por segmento en `src/app/(admin)/error.tsx:29`, `src/app/(postulante)/error.tsx` y `src/app/(reclutador)/error.tsx` utilizan el componente `PageState`, ocultan stacks técnicos, conservan la navegación lateral en áreas privadas y ofrecen reintento o retorno seguro al inicio.
- **Qué falta:** Cumplido en la estructura de vistas de error de Next.js.

### 4.4 Plan de rollback: cómo volver a la versión anterior de la app y de la base
- **Veredicto:** ❌ no cumple
- **Evidencia:** No existen procedimientos de marcha atrás, scripts de down-migration en `supabase/migrations/` ni runbooks de restauración documentados en `docs/`.
- **Qué falta:** Redactar un runbook operativo que detalle la reversión de despliegues en el host y la estrategia de snapshot/restauración de la base de datos ante incidentes.

### 4.5 Dominio y remitente de email verificados (SPF/DKIM) en Resend
- **Veredicto:** ⚠️ no verificable desde el repo
- **Evidencia:** [H-219](hallazgos.md). El código configura el remitente `MiLiors <notificaciones@miliors.com>` en `src/modules/postulaciones/actions.ts:61`, pero el flag `EMAIL_POSTULACIONES_HABILITADO` se encuentra apagado (`src/modules/postulaciones/actions.ts:35`). La verificación de registros DNS (SPF, DKIM, DMARC) de `miliors.com` solo puede comprobarse desde el panel de Resend.
- **Qué falta:** Validar en Resend Dashboard que el dominio `miliors.com` figure en estado "Verified" antes de encender el flag de notificaciones.

---

## 5. Calidad y Proceso

### 5.1 CI que corre tsc, lint, test y build en cada push o PR
- **Veredicto:** ❌ no cumple
- **Evidencia:** [H-304](hallazgos.md). No existe el directorio `.github/workflows` ni archivos de integración continua en el repositorio.
- **Qué falta:** Crear `.github/workflows/ci.yml` configurando la ejecución obligatoria de `tsc --noEmit`, `eslint`, `vitest run` y `next build`.

### 5.2 Smoke test del QA_PLAN.md aprobado
- **Veredicto:** ❌ no cumple
- **Evidencia:** `QA_PLAN.md:302-324`. Los 20 casos del smoke test no han sido ejecutados en un entorno de pruebas y presentan fallas estructurales activas: `TC-PUE-008` falla por exposición de `perfil_psicologico_deseado` ([H-202](hallazgos.md)), `TC-AUTH-001` expone escalamiento a ADMIN ([H-201](hallazgos.md)), y `TC-POST-005` corrompe estados al reabrir candidaturas cerradas ([H-203](hallazgos.md)).
- **Qué falta:** Resolver los hallazgos bloqueantes [H-201](hallazgos.md), [H-202](hallazgos.md) y [H-203](hallazgos.md), y completar la ejecución exitosa de los 20 casos de smoke test en staging.

### 5.3 robots y metadatos: las zonas privadas no se indexan
- **Veredicto:** ❌ no cumple
- **Evidencia:** [H-300](hallazgos.md). No existe `app/robots.ts` ni `robots.txt`. Los layouts privados en `src/app/(admin)/layout.tsx:1`, `src/app/(postulante)/layout.tsx:1` y `src/app/(reclutador)/layout.tsx:1` no definen `robots: { index: false, follow: false }`.
- **Qué falta:** Crear `app/robots.ts` con exclusión de rutas privadas (`/admin`, `/postulante`, `/reclutador`, `/api`) e incorporar la metadata `noindex` en los layouts correspondientes.

### 5.4 Accesibilidad básica (foco, labels, contraste) en los flujos principales
- **Veredicto:** ❌ no cumple
- **Evidencia:** [H-301](hallazgos.md). Si bien el foco visible está configurado globalmente (`:focus-visible` en `src/app/globals.css:463`), los formularios de acceso y registro en `src/app/(acceso)/iniciar-sesion/iniciar-sesion-form.tsx:24` y `src/app/(acceso)/registro/registro-form.tsx:88` usan elementos `<span>` en lugar de `<label htmlFor>` para inputs que carecen de `id`, y `src/components/shared/brand-logo.tsx:43` asigna `alt=""` por defecto al isotipo en enlaces de navegación principales sin texto accesible.
- **Qué falta:** Reemplazar `<span>` por `<label htmlFor>` asociado a `id` en inputs de autenticación y dotar de etiqueta accesible a los enlaces del isotipo.

---

## 6. Datos Personales (Ley 25.326)

### 6.1 Consentimiento para datos sensibles, finalidad, borrado de cuenta y exportación
- **Veredicto:** ❌ no cumple
- **Evidencia:** [H-302](hallazgos.md).
  1. **Términos y Condiciones vacíos:** La consulta a la tabla `terminos_y_condiciones` arrojó que la única versión cargada (`version = '0.0'`) contiene literalmente la frase de prueba `"Terminos y condiciones"`. No existe cláusula de consentimiento informado para el tratamiento de datos de personalidad (eneagrama, informe psicológico laboral), finalidad de reclutamiento ni información de cesión a terceros o reclutadores (Ley 25.326 arts. 7 y 8).
  2. **Ausencia de borrado de cuenta (Derecho de Supresión):** No existe ninguna Server Action ni interfaz para que un usuario solicite la baja de su cuenta o la supresión de sus datos personales (`src/modules/auth/actions.ts:123` solo contiene un rollback interno ante fallos de registro).
  3. **Ausencia de exportación de datos:** No hay funcionalidad de portabilidad o descarga integral de datos para el titular.
  4. **Exposición horizontal de datos personales en RLS:** Se agrava por [H-200](hallazgos.md) (la política `experiencia_select` permite leer la experiencia de cualquier candidato) y [H-202](hallazgos.md) (exposición de directivas psicológicas de puestos).
- **Qué falta:** Redactar y publicar en `terminos_y_condiciones` el texto legal completo con consentimiento informado bajo la Ley 25.326 e incorporar mecanismo para solicitar la eliminación de cuenta y supresión de datos.

---

## Verificar Fuera del Repo

Lista de elementos clasificados como ⚠️ que requieren validación obligatoria en consolas de servicios externos:

| Ítem | Servicio | Dónde mirar | Qué comprobar |
| --- | --- | --- | --- |
| **Backups automáticos** | Supabase | Dashboard del proyecto > Database > Backups | Confirmar que los respaldos automáticos diarios o Point-In-Time Recovery (PITR) estén habilitados y registrar la retención. |
| **Restauración de base** | Supabase | Dashboard de Supabase / Staging | Probar al menos un procedimiento de restauración sobre un entorno de pruebas para verificar integridad. |
| **Protección de passwords filtradas** | Supabase Auth | Dashboard del proyecto > Authentication > Password Security | Activar el toggle de "Leaked password protection" (HaveIBeenPwned) reportado en [H-007](hallazgos.md). |
| **Rate limits de Supabase Auth** | Supabase Auth | Dashboard del proyecto > Authentication > Rate Limits | Verificar las cuotas por hora y por IP en envío de emails de confirmación y recuperación de contraseñas. |
| **Dominio y remitente de email** | Resend | Panel de Resend > Domains > `miliors.com` | Comprobar que los registros DNS `SPF`, `DKIM` y `DMARC` figuren en estado "Verified" antes de activar `EMAIL_POSTULACIONES_HABILITADO`. |
| **Rollback de aplicaciones** | Plataforma de Hosting | Dashboard de hosting (Vercel / Railway / Netlify) | Verificar que la función de "Instant Rollback" o redeploy de despliegues previos se encuentre disponible para producción. |

---

## Consultas SQL Utilizadas (Catálogos y Términos)

```sql
-- 1. Verificación de RLS en todas las tablas del esquema público
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Verificación de funciones SECURITY DEFINER, search_path y privilegios EXECUTE
SELECT 
  p.proname,
  pg_get_function_identity_arguments(p.oid) AS args,
  p.prosecdef,
  p.proconfig,
  p.proacl
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.prosecdef = true
ORDER BY p.proname;

-- 3. Verificación de versión vigente de Términos y Condiciones
SELECT id, version, descripcion, fecha_publicacion, fecha_baja_tyc
FROM terminos_y_condiciones
WHERE fecha_baja_tyc IS NULL
ORDER BY fecha_publicacion DESC;

-- 4. Verificación de existencia de buckets de Storage
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets;

-- 5. Comprobación de políticas RLS citadas en hallazgos de seguridad
SELECT tablename, policyname
FROM pg_policies
WHERE policyname IN (
  'experiencia_select',
  'usuario_insert_service',
  'puesto_select',
  'puesto_select_public',
  'reclutador_empresa_insert'
);
```
