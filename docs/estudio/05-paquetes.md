# Consolidación en Paquetes de Trabajo (Fase 5 y 6)

Plan de ejecución para la estandarización, resolución de bugs y revisión pre-deploy de MiLiors.

---

## Etapas de ejecución (Fase 6)

Para aislar riesgos y proteger la base de datos de producción contra escrituras accidentales, la ejecución de la Fase 6 se divide de forma estricta en dos etapas consecutivas:

- **ETAPA A (solo código, sin base de prueba):** Se desarrolla íntegramente en la rama `fase-6/etapa-a`. Abarca los bloques A1 al A7. **Reglas duras de la Etapa A:** Prohibido tocar la base de datos (cero SQL, cero Supabase CLI, cero migraciones), prohibido correr suites E2E de Playwright (`npm run test:e2e` / `npx playwright`) porque el entorno local apunta a producción, y prohibido exponer secretos de credenciales. La verificación en la Etapa A se realiza exclusivamente mediante `npx tsc --noEmit`, `npm run lint`, `npm test` (Vitest con base de datos simulada en memoria) y `npm run build`. Los cambios se acumulan en la rama `fase-6/etapa-a` y no se despliegan a producción hasta haber completado los E2E en la Etapa B.
- **ETAPA B (con staging, al final):** Se ejecuta una vez aprovisionado el proyecto Supabase de staging independiente. Abarca todo lo que requiere base de datos activa: migraciones DDL/DML, verificación de drift, corrección de RLS P0, paso de clientes `createAdminClient` a clientes de usuario con RLS, tablas y funciones SQL nuevas, optimización de advisors, ejecución completa de la suite E2E de Playwright y repetición de la Fase 0 contra la línea base antes del despliegue productivo.

### Bloques de la Etapa A

Cada bloque agrupa archivos de código relacionados, resuelve sus hallazgos asociados y migra los consumidores de las piezas canónicas ([H-112](hallazgos.md), [H-115](hallazgos.md) y [H-117](hallazgos.md)) que caen en sus rutas:

| Bloque | Nombre | Hallazgos | Archivos involucrados |
| --- | --- | --- | --- |
| **A1** | Preparación | [H-001](hallazgos.md) | `e2e/fixtures/auth.ts`<br>`.env.example` (nuevo)<br>`.gitignore` |
| **A2** | Cimientos (PQ-03) | Cierra [H-226](hallazgos.md). Crea piezas canónicas de [H-108](hallazgos.md), [H-109](hallazgos.md), [H-112](hallazgos.md), [H-115](hallazgos.md) y [H-117](hallazgos.md). | `src/lib/types/domain.ts`<br>`src/lib/constants/enums.ts`<br>`src/lib/utils.ts`<br>`src/lib/utils.test.ts` (nuevo)<br>`src/lib/fecha.ts` (nuevo)<br>`src/lib/fecha.test.ts` (nuevo)<br>`src/components/shared/use-form-accion.ts` (nuevo)<br>`src/modules/auth/schema.ts`<br>`src/lib/supabase/server-admin.ts`<br>`src/lib/guards.ts`<br>`src/lib/guards.test.ts` (nuevo) |
| **A3** | Postulante | [H-107](hallazgos.md), [H-208](hallazgos.md), [H-209](hallazgos.md), [H-222](hallazgos.md), [H-224](hallazgos.md). Migra consumidores de [H-112](hallazgos.md), [H-115](hallazgos.md) y [H-117](hallazgos.md). | `src/modules/perfil/queries.ts`<br>`src/modules/perfil/actions.ts`<br>`src/modules/perfil-tecnico/actions.ts`<br>`src/components/perfil-tecnico/form-estado.ts`<br>`src/components/perfil-tecnico/use-form-accion.ts`<br>`src/modules/visibilidad/actions.ts`<br>`src/app/(postulante)/postulante/mi-perfil/form.tsx`<br>`src/app/(postulante)/postulante/onboarding/onboarding-form.tsx`<br>`src/app/(postulante)/postulante/puestos/page.tsx`<br>`src/app/(postulante)/postulante/puestos/postular-button.tsx`<br>`src/app/(postulante)/postulante/puestos/puesto-card.tsx`<br>`src/app/(postulante)/postulante/puestos/[id]/page.tsx`<br>`src/app/(postulante)/postulante/reclutadores/[id]/page.tsx`<br>`src/app/(postulante)/postulante/postulaciones/page.tsx`<br>`src/modules/eneagrama/actions.ts`<br>`src/modules/eneagrama/rehacer-policy.ts`<br>`src/modules/eneagrama/actions.test.ts` (nuevo)<br>`src/app/(postulante)/postulante/informe/informe-visor.tsx`<br>`src/app/(postulante)/postulante/informe/informe-feedback.tsx`<br>`src/modules/informe/pdf-template.tsx`<br>`src/modules/certificado/actions.ts`<br>`src/modules/certificado/certificado-display.tsx`<br>`src/modules/certificado/pdf-template.tsx`<br>`src/app/(postulante)/postulante/certificado/certificado-ui.tsx` |
| **A4** | Reclutador, puestos e IA | [H-103](hallazgos.md), [H-105](hallazgos.md), [H-113](hallazgos.md), [H-204](hallazgos.md), [H-210](hallazgos.md), [H-220](hallazgos.md), [H-221](hallazgos.md), [H-227](hallazgos.md). Migra consumidores de [H-112](hallazgos.md), [H-115](hallazgos.md) y [H-117](hallazgos.md). | `src/modules/puestos/actions.ts`<br>`src/modules/puestos/queries.ts`<br>`src/modules/puestos/schema.ts`<br>`src/app/(reclutador)/reclutador/puestos/page.tsx`<br>`src/app/(reclutador)/reclutador/puestos/nuevo/nuevo-puesto-form.tsx`<br>`src/app/(reclutador)/reclutador/puestos/[id]/page.tsx`<br>`src/app/(reclutador)/reclutador/puestos/[id]/editar/editar-puesto-form.tsx`<br>`src/app/(reclutador)/reclutador/empresas/empresas-ui.tsx`<br>`src/components/shared/nueva-empresa-modal.tsx`<br>`src/app/(reclutador)/reclutador/onboarding/onboarding-form.tsx`<br>`src/app/(reclutador)/reclutador/mi-perfil/form.tsx`<br>`src/modules/asistente/prompts.ts`<br>`src/modules/asistente/actions.ts`<br>`src/modules/seleccion/service.ts`<br>`src/modules/seleccion/pdf-template.tsx`<br>`src/lib/ai/adapters/gemini.ts`<br>`src/app/(reclutador)/reclutador/asistente/page.tsx` |
| **A5** | Reclutador, postulaciones y notas | [H-102](hallazgos.md), [H-114](hallazgos.md), [H-118](hallazgos.md), [H-203](hallazgos.md), [H-214](hallazgos.md), [H-217](hallazgos.md), [H-223](hallazgos.md), [H-225](hallazgos.md), [H-228](hallazgos.md). Migra consumidores de [H-112](hallazgos.md), [H-115](hallazgos.md) y [H-117](hallazgos.md). | `src/modules/postulaciones/actions.ts`<br>`src/modules/postulaciones/actions.test.ts` (nuevo)<br>`src/app/(reclutador)/reclutador/postulaciones/page.tsx`<br>`src/modules/postulantes/actions.ts`<br>`src/modules/postulantes/queries.ts`<br>`src/components/shared/notas-candidato.tsx` (nuevo)<br>`src/app/(reclutador)/reclutador/postulaciones/notas-modal-btn.tsx`<br>`src/app/(reclutador)/reclutador/postulantes/[id]/notas-panel.tsx`<br>`src/app/(reclutador)/reclutador/postulantes/[id]/page.tsx`<br>`src/app/(reclutador)/reclutador/notas/page.tsx` |
| **A6** | Admin | [H-104](hallazgos.md), [H-110](hallazgos.md), [H-111](hallazgos.md), [H-116](hallazgos.md), [H-206](hallazgos.md), [H-212](hallazgos.md), [H-215](hallazgos.md), [H-216](hallazgos.md). Migra consumidores de [H-112](hallazgos.md), [H-115](hallazgos.md) y [H-117](hallazgos.md). | `src/modules/admin/schema.ts` (nuevo)<br>`src/modules/admin/actions.ts`<br>`src/modules/carreras/queries.ts`<br>`src/modules/ubicacion/queries.ts`<br>`src/app/api/admin/preguntas/route.ts`<br>`src/app/api/admin/catalogos/export/route.ts`<br>`src/app/(admin)/admin/carreras/page.tsx`<br>`src/app/(admin)/admin/carreras/carreras-ui.tsx`<br>`src/app/(admin)/admin/competencias/page.tsx`<br>`src/app/(admin)/admin/competencias/competencias-ui.tsx`<br>`src/app/(admin)/admin/idiomas/page.tsx`<br>`src/app/(admin)/admin/idiomas/idiomas-ui.tsx`<br>`src/app/(admin)/admin/sectores/page.tsx`<br>`src/app/(admin)/admin/sectores/sectores-ui.tsx`<br>`src/app/(admin)/admin/ubicaciones/page.tsx`<br>`src/app/(admin)/admin/ubicaciones/ubicaciones-ui.tsx`<br>`src/app/(admin)/admin/preguntas/page.tsx`<br>`src/app/(admin)/admin/preguntas/preguntas-ui.tsx`<br>`src/modules/admin/sessions.ts`<br>`src/app/(admin)/admin/postulantes/page.tsx`<br>`src/app/(admin)/admin/empresas/page.tsx`<br>`src/app/(admin)/admin/empresas/config-inactividad.tsx`<br>`src/app/(admin)/admin/feedback/page.tsx`<br>`src/app/(admin)/admin/feedback/config-reactivacion.tsx`<br>`src/app/(admin)/admin/informes/page.tsx`<br>`src/app/(admin)/admin/tyc/tyc-ui.tsx` |
| **A7** | Acceso y pre-deploy | [H-004](hallazgos.md), [H-005](hallazgos.md), [H-108](hallazgos.md), [H-109](hallazgos.md), [H-229](hallazgos.md), [H-300](hallazgos.md), [H-301](hallazgos.md), [H-303](hallazgos.md), [H-304](hallazgos.md), [H-306](hallazgos.md). Cierre definitivo de [H-108](hallazgos.md), [H-109](hallazgos.md), [H-112](hallazgos.md) y [H-115](hallazgos.md). | `src/app/(acceso)/iniciar-sesion/iniciar-sesion-form.tsx`<br>`src/app/(acceso)/registro/registro-form.tsx`<br>`src/app/(acceso)/verificar/verify-form.tsx`<br>`src/app/(acceso)/verificar/[id]/page.tsx`<br>`src/app/(acceso)/recuperar-password/recuperar-form.tsx`<br>`src/app/(acceso)/recuperar-password/nueva/nueva-password-form.tsx`<br>`src/components/shared/cambiar-password-form.tsx`<br>`src/components/shared/brand-logo.tsx`<br>`src/modules/auth/actions.ts`<br>`src/lib/env.ts` (nuevo)<br>`src/lib/logger.ts` (nuevo)<br>`src/proxy.ts`<br>`eslint.config.mjs` (nota: H-305 en error.tsx y global-error.tsx queda fuera del plan)<br>`QA_PLAN.md`<br>`.github/workflows/ci.yml` (nuevo)<br>`src/app/robots.ts` (nuevo)<br>`src/app/(admin)/layout.tsx`<br>`src/app/(postulante)/layout.tsx`<br>`src/app/(reclutador)/layout.tsx`<br>`docs/runbooks/rollback.md` (nuevo)<br>`docs/runbooks/supabase-auth-config.md` (nuevo) |

### Alcance de la Etapa B (con Staging)

La Etapa B se ejecutará una vez configurado el proyecto de staging y abarca los siguientes componentes y hallazgos:
1. **Base reproducible y E2E:** [H-002](hallazgos.md), [H-006](hallazgos.md), [H-050](hallazgos.md), [H-051](hallazgos.md). Volcado de esquema productivo, detección de drift, generación de `20261102000000_drift_contratacion_eneagrama.sql`, baseline en producción con `supabase migration repair`, inicialización limpia en staging y configuración de Playwright contra staging.
2. **P0 de seguridad y políticas RLS:** [H-200](hallazgos.md), [H-201](hallazgos.md), [H-211](hallazgos.md), [H-202](hallazgos.md), [H-008](hallazgos.md), [H-213](hallazgos.md). Migración `20261102010000_p0_seguridad_rls.sql`, traslado de funciones al esquema `private`, revocación de privilegios de inserción indebidos y suite de tests RLS (`test:rls`).
3. **Migración de cliente admin a cliente del usuario:** [H-100](hallazgos.md) (perfil técnico) y [H-119](hallazgos.md) (notas privadas), eliminando el uso de `createAdminClient` para operaciones que deben respetar RLS.
4. **Tablas y funciones nuevas:**
   - [H-202](hallazgos.md) (Paso 1, 2 y 3): Creación de tabla `puesto_criterio_psicologico`, migración de código en puestos e IA, verificación de consistencia y eliminación de la columna `perfil_psicologico_deseado`.
   - [H-205](hallazgos.md): Tabla `competencia_sugerida`, panel de moderación en `/admin/competencias`, índice insensible a mayúsculas y corrección de reactivación de competencias desactivadas.
   - [H-207](hallazgos.md): Función SQL transaccional en PostgreSQL para el guardado atómico de puntajes y dominantes del eneatipo.
   - [H-302](hallazgos.md): Implementación técnica de consentimiento informado para evaluación psicométrica en registro, flujo de derecho de supresión (borrado de cuenta) y exportación completa de datos (Ley 25.326).
   - [H-230](hallazgos.md): Moderación propia del admin (`bloqueado_por_admin`), regla de visibilidad "visible al estar listo" en RLS (`private.postulante_cumple_visibilidad`), privilegios de INSERT/UPDATE granulares por columna en `perfil_postulante` y avisos en panel del postulante y admin.
5. **Optimización de políticas RLS:** [H-009](hallazgos.md) y [H-010](hallazgos.md) mediante la migración `20261102020000_rls_advisors.sql` (envoltura de subqueries escalares y consolidación de políticas permisivas múltiples).
6. **Verificación integral pre-deploy:** Ejecución de la suite completa de Playwright en staging y repetición exhaustiva de la Fase 0 contra la línea base.

---

## Resumen Ejecutivo

- **Cantidad de paquetes:** 15 paquetes de trabajo originales consolidados en 7 bloques de código para la Etapa A (A1 a A7) y una Etapa B de base de datos y staging.
- **Total de líneas de diff estimadas:** ~4.520 líneas (promedio de ~301 líneas por paquete; todos estrictamente por debajo del límite de 400 líneas).
- **Hallazgos cubiertos:** 62 hallazgos activos en el plan (más 3 gestionados fuera del plan: H-007, H-219, H-305).
- **Decisiones tomadas:** Todas las decisiones arquitectónicas y de producto han sido resueltas por Tomás (ver detalle en la sección respectiva).

---

## Diagrama de Dependencias

```
[PQ-01: Base y Staging]
         │
         ▼
[PQ-02: P0 Seguridad RLS y Función Privada (H-202 Paso 1 Base)]
         │
         ▼
[PQ-03: Cimientos Canónicos y Tests Unitarios]
         │
         ▼
[PQ-06: Puestos Reclutador (H-202 Paso 2 Puestos)]
         │
         ▼
[PQ-09: Asistente IA y Cierre Final H-202 (Paso Final Migración Base)]
         │
         ├───────────────────────┬───────────────────────────────┐
         ▼                       ▼                               ▼
[PQ-04: Postulante Perfil] [PQ-07: Postulaciones]       [PQ-10: Admin Catálogos]
         │                       │                               │
         ▼                       ▼                               ▼
[PQ-05: Eneagrama/Cert]    [PQ-08: Notas y Candidatos]  [PQ-11: Admin Sesiones]
         │                       │                               │
         └───────────┬───────────┘                               │
                     ▼                                           │
        [PQ-12: Acceso, A11y y TyC]                              │
                     │                                           │
                     ▼                                           │
        [PQ-13: Env, Logs y Monitor]                             │
                     │                                           │
                     ▼                                           │
        [PQ-14: Optimización RLS]                                │
                     │                                           │
                     ▼ ◄─────────────────────────────────────────┘
        [PQ-15: CI, SEO, QA y Runbooks]
```

---

## Detalle de Paquetes de Trabajo

### PQ-01: Base reproducible y entorno separado
- **Objetivo en una línea:** Aislar desarrollo y tests E2E en un proyecto Supabase independiente, establecer el baseline histórico en producción mediante volcado de esquema y configurar credenciales por entorno en Vercel.
- **Hallazgos que cierra:** [H-001](hallazgos.md), [H-002](hallazgos.md), [H-006](hallazgos.md), [H-050](hallazgos.md), [H-051](hallazgos.md).
- **Archivos que toca:**
  - `e2e/fixtures/auth.ts`
  - `playwright.config.ts`
  - `.env.example` (nuevo)
  - `supabase/migrations/20261102000000_drift_contratacion_eneagrama.sql` (nuevo)
  - `docs/runbooks/staging-baseline.md` (nuevo)
  - `src/lib/types/database.types.ts`
- **Diff estimado:** ~190 líneas.
- **Dependencias:** Ninguna (va primero de forma obligatoria).
- **Cambios en base de datos:**
  - Procedimiento de separación y baseline:
    1. **Volcado de producción y detección de drift:** Ejecutar un volcado del esquema de producción mediante `supabase db dump --schema public` (o `supabase db pull`) y contrastarlo mediante `diff` contra el estado que producen las migraciones existentes del repositorio. Esto garantiza capturar de forma exhaustiva no solo `contratacion` ([H-050](hallazgos.md)) y `resultado_puntaje_eneagrama` ([H-051](hallazgos.md)), sino cualquier otra discrepancia o drift oculto en índices o triggers.
    2. **Generación de migración de consolidación:** Crear `supabase/migrations/20261102000000_drift_contratacion_eneagrama.sql` con el DDL completo del drift detectado.
    3. **Línea base en producción:** La base de datos de producción ya cuenta con los objetos aplicados a mano; por ende, se ejecuta `supabase migration repair --status applied <version>` contra producción para registrar en `supabase_migrations.schema_migrations` que las migraciones del repo están aplicadas, sin recrear tablas existentes ni provocar downtime ([H-006](hallazgos.md)).
    4. **Inicialización de Staging desde cero:** Se crea un proyecto nuevo de Supabase (`miliors-staging`) que arranca completamente vacío. Se ejecuta `supabase db push` para aplicar secuencialmente la totalidad de las migraciones del repo, validando que reconstruyen la base desde cero de manera reproducible y limpia.
    5. **Configuración de entornos en Vercel:** Las variables de entorno de `Preview` y `Development` en el dashboard de Vercel se configuran apuntando al proyecto de Staging (`NEXT_PUBLIC_SUPABASE_URL`, claves de staging); únicamente el entorno de `Production` conserva las credenciales productivas.
    6. **Regeneración de tipos:** Se ejecuta `supabase gen types typescript` actualizando `src/lib/types/database.types.ts`.
- **Cómo se verifica:**
  - Ejecutar la suite E2E con credenciales de entorno en Staging: `npx playwright test`. Verificar que 0 mutaciones impacten en producción ([H-002](hallazgos.md)) y que `e2e/fixtures/auth.ts` consuma variables de entorno sin credenciales en texto plano ([H-001](hallazgos.md)).
- **Riesgo y marcha atrás:**
  - *Riesgo:* Bajo. No modifica lógica de la aplicación en producción.
  - *Rollback:* En caso de falla en Staging, resetear el proyecto de Staging. Revertir commits en GitHub.

---

### PQ-02: P0 de seguridad, mitigación RLS y función privada
- **Objetivo en una línea:** Eliminar vulnerabilidades críticas de RLS (fuga de experiencia laboral, escalamiento a admin, secuestro de empresas, asimetría técnica), trasladar la función de acceso a esquema privado y preparar la base para el aislamiento de perfil psicológico.
- **Hallazgos que aborda:** [H-008](hallazgos.md), [H-200](hallazgos.md), [H-201](hallazgos.md), [H-202](hallazgos.md) (paso 1 base), [H-211](hallazgos.md), [H-213](hallazgos.md).
- **Hallazgos que cierra de forma definitiva:** [H-008](hallazgos.md), [H-200](hallazgos.md), [H-201](hallazgos.md), [H-211](hallazgos.md), [H-213](hallazgos.md).
  > [!WARNING]
  > **Estado de H-202:** La vulnerabilidad H-202 **sigue abierta en producción tras PQ-02**, debido a que la columna `puesto.perfil_psicologico_deseado` debe preservarse temporalmente para no romper el código actual que ejecuta `select('*')` o consultas directas. El cierre definitivo y la eliminación/bloqueo de acceso de dicha columna se produce en **PQ-09**, tras migrar el código de puestos en **PQ-06** y de IA en **PQ-09**. Por este motivo, PQ-06 y PQ-09 se ubican inmediatamente después de PQ-03 para minimizar al máximo esta ventana temporal.
- **Archivos que toca:**
  - `supabase/migrations/20261111000000_p0_seguridad_rls.sql` (nuevo)
  - `supabase/migrations/20261111000100_puesto_criterio_psicologico.sql` (nuevo)
  - `test/rls/p0-seguridad.rls.ts` (nuevo)
  - `vitest.rls.config.ts` (nuevo)
  - `scripts/gen-database-types.mjs`
  - `package.json`
  - `src/lib/types/database.types.ts`
- **Diff estimado:** ~350 líneas.
- **Dependencias:** Stack local de Supabase (`supabase db reset --local`).
- **Cambios en base de datos:**
  - [H-200](hallazgos.md): Corregir la política `experiencia_select` en `public.experiencia_laboral`, reemplazando la tautología `pt.id = pt.id` por `pp.id = pt.postulante_id`.
  - [H-201](hallazgos.md): Eliminar la política `usuario_insert_service` en `public.usuario` y revocar `INSERT` a `anon` y `authenticated` para impedir inserciones cliente no autorizadas.
  - [H-008](hallazgos.md) y [H-213](hallazgos.md): Crear esquema `private` (`CREATE SCHEMA IF NOT EXISTS private;`). Mover la función `reclutador_ve_postulante` a `private.reclutador_ve_postulante(p_postulante_id uuid)` con `SET search_path = ''`. Al no estar en `public`, PostgREST no la expone por RPC HTTP (cerrando el riesgo de enumeración de H-008). Mantener `GRANT EXECUTE ON FUNCTION private.reclutador_ve_postulante TO authenticated, service_role;`. Actualizar las políticas que la consumen (`postulante_select_propio`, `formacion_select`, `curso_select`, `idioma_select`, `postulante_competencia_select` y `experiencia_select`) incorporando la condición `OR private.reclutador_ve_postulante(pp.id)`, desbloqueando el acceso legítimo de reclutadores a candidatos postulados (H-213).
  - [H-211](hallazgos.md): Revocar privilegios `INSERT` a `anon` y `authenticated` sobre `public.reclutador_empresa`, eliminar la política `reclutador_empresa_insert`, y requerir que la vinculación se realice exclusivamente mediante backend con service role validando titularidad previa de la empresa.
  - [H-202](hallazgos.md) (Paso 1 Opción C - Tabla dedicada `puesto_criterio_psicologico`):
    - Se crea la tabla `puesto_criterio_psicologico` con RLS restringido al reclutador titular del puesto y `ADMIN` (más `service_role`).
    - Se copian los datos existentes de `puesto.perfil_psicologico_deseado`.
    - Se conserva temporalmente la columna en `puesto` para compatibilidad hacia atrás hasta PQ-06 / PQ-09.
  - Aplicación: Aplicar en el stack local vía `supabase db reset --local`. Correr suite de RLS. Posteriormente aplicar en Producción en el deploy pre-aprobado.
  - Regenerar `src/lib/types/database.types.ts`.
- **Cómo se verifica:**
  - Se añade el script `"test:rls": "vitest run --config vitest.rls.config.ts"` en `package.json` apuntando a `test/rls/**/*.rls.ts`. Al tener extensión `.rls.ts`, `vitest run` por defecto (`npm test`) lo ignora en el pipeline de CI sin base conectada. Se ejecuta contra el stack local con `npm run test:rls`.
  - Comprobar que:
    1. Un postulante autenticado no puede leer la experiencia laboral de otros postulantes ([H-200](hallazgos.md)).
    2. La API no permite insertar usuarios con rol ADMIN desde cliente anónimo/autenticado ([H-201](hallazgos.md)).
    3. Un reclutador no puede insertar filas en `reclutador_empresa` asociadas a empresas ajenas ([H-211](hallazgos.md)).
    4. Un reclutador puede leer formación, cursos, idiomas, competencias y experiencia de candidatos que se postularon a sus puestos ([H-213](hallazgos.md)).
    5. La llamada RPC `/rest/v1/rpc/reclutador_ve_postulante` responde 404 Not Found al no estar expuesta en `public` ([H-008](hallazgos.md)).
    6. Anon y postulante no leen `puesto_criterio_psicologico`; el reclutador titular lee y escribe su criterio; otro reclutador no ([H-202](hallazgos.md) paso 1).
  - Casos del QA_PLAN: TC-PUE-008 y TC-PUE-009 siguen ⬜ hasta PQ-09.
- **Riesgo y marcha atrás:**
  - *Riesgo:* Medio. Las políticas de RLS alteran la visibilidad de datos.
  - *Rollback:* Script de reversión SQL de políticas en la base de datos. Rollback instantáneo en Vercel.

---

### PQ-03: Cimientos y piezas canónicas de la Fase 2
- **Objetivo en una línea:** Construir y probar unitariamente los guards, helpers de formato con zona horaria explícita, esquemas y tipos canónicos, protegiendo además los clientes con privilegios máximos.
- **Hallazgos que aborda:** [H-108](hallazgos.md), [H-109](hallazgos.md), [H-112](hallazgos.md), [H-115](hallazgos.md), [H-117](hallazgos.md), [H-217](hallazgos.md), [H-226](hallazgos.md).
- **Hallazgos que cierra de forma definitiva:** [H-226](hallazgos.md). *(H-108, H-109, H-112, H-115, H-117 y H-217 se cierran al migrar sus últimos consumidores).*
- **Archivos que toca:**
  - `src/lib/types/domain.ts`
  - `src/lib/constants/enums.ts`
  - `src/lib/utils.ts`
  - `src/lib/utils.test.ts` (nuevo)
  - `src/lib/fecha.ts` (nuevo)
  - `src/lib/fecha.test.ts` (nuevo)
  - `src/components/shared/use-form-accion.ts` (nuevo)
  - `src/modules/auth/schema.ts`
  - `src/lib/supabase/server-admin.ts`
  - `src/lib/guards.ts`
  - `src/lib/guards.test.ts` (nuevo)
- **Diff estimado:** ~310 líneas.
- **Dependencias:** `PQ-02`.
- **Cambios en base de datos:** Ninguno.
- **Detalle de implementación:**
  - [H-112](hallazgos.md): Exportar `INITIAL_ACTION_STATE: ActionResult = { success: false }` en `src/lib/types/domain.ts` para eliminar las más de 17 redefiniciones dispersas.
  - [H-117](hallazgos.md): Exportar mapas canónicos `ESTADO_POSTULACION_LABEL_POSTULANTE`, `ESTADO_POSTULACION_LABEL_RECLUTADOR` y `ESTADO_POSTULACION_TONE` en `src/lib/constants/enums.ts` basados exclusivamente en los 4 estados reales del enum de base (`ENVIADA`, `VISTO`, `PROCESO_FINALIZADO`, `CERRADA`).
  - [H-108](hallazgos.md): Centralizar el helper canónico `isUuid(value: string): boolean` en `src/lib/utils.ts` junto con su test unitario en `src/lib/utils.test.ts`.
  - [H-115](hallazgos.md), [H-217](hallazgos.md): Crear `src/lib/fecha.ts` implementando `formatFecha(date, variant)`: el locale fijado es `'es-AR'`, especificando que las columnas tipo DATE de base de datos se formatean con `{ timeZone: 'UTC' }` para evitar corrimientos por medianoche, mientras que timestamps con hora se formatean con `{ timeZone: 'America/Argentina/Buenos_Aires' }`. Test unitario en `src/lib/fecha.test.ts`.
  - [H-111](hallazgos.md): Crear hook canónico `src/components/shared/use-form-accion.ts` para coordinar `useActionState` ejecutando callbacks `onSuccess` sin requerir `useEffect` secundario en componentes cliente.
  - [H-109](hallazgos.md): Unificar en `src/modules/auth/schema.ts` el schema canónico de cambio de contraseña (`nuevaPasswordSchema`).
  - [H-226](hallazgos.md): Incorporar `import 'server-only'` en `src/lib/supabase/server-admin.ts`, garantizando que el cliente `service_role` jamás sea empaquetado en bundles del navegador.
  - Centralizar helper canónico `requireAdmin()` en `src/lib/guards.ts` con test en `src/lib/guards.test.ts`.
- **Cómo se verifica:**
  - `npm test` ejecutando `src/lib/fecha.test.ts`, `src/lib/utils.test.ts` y `src/lib/guards.test.ts`.
  - `npx tsc --noEmit` y `npm run lint`.
- **Riesgo y marcha atrás:**
  - *Riesgo:* Mínimo. Construye cimientos aditivos con tests unitarios.
  - *Rollback:* Revert de commit en git y redeploy en Vercel.

---

### PQ-06: Reclutador — Ciclo de vida de puestos y empresas
- **Objetivo en una línea:** Unificar invalidación de caché en el ciclo de puestos, impedir reactivación de puestos eliminados, capturar fallos en cascada y migrar el código de puestos al nuevo modelo de perfil psicológico.
- **Hallazgos que aborda:** [H-050](hallazgos.md), [H-103](hallazgos.md), [H-105](hallazgos.md), [H-108](hallazgos.md), [H-111](hallazgos.md), [H-112](hallazgos.md), [H-115](hallazgos.md), [H-202](hallazgos.md) (paso 2 código puestos), [H-204](hallazgos.md), [H-210](hallazgos.md), [H-223](hallazgos.md), [H-228](hallazgos.md).
- **Hallazgos que cierra de forma definitiva:** [H-103](hallazgos.md), [H-105](hallazgos.md), [H-204](hallazgos.md), [H-210](hallazgos.md).
- **Archivos que toca:**
  - `src/modules/puestos/actions.ts`
  - `src/modules/puestos/queries.ts`
  - `src/modules/puestos/schema.ts`
  - `src/app/(reclutador)/reclutador/puestos/page.tsx`
  - `src/app/(reclutador)/reclutador/puestos/nuevo/nuevo-puesto-form.tsx`
  - `src/app/(reclutador)/reclutador/puestos/[id]/page.tsx`
  - `src/app/(reclutador)/reclutador/puestos/[id]/editar/editar-puesto-form.tsx`
  - `src/app/(reclutador)/reclutador/empresas/empresas-ui.tsx`
  - `src/components/shared/nueva-empresa-modal.tsx`
  - `src/app/(reclutador)/reclutador/onboarding/onboarding-form.tsx`
  - `src/app/(reclutador)/reclutador/mi-perfil/form.tsx`
- **Diff estimado:** ~380 líneas.
- **Dependencias:** `PQ-02`, `PQ-03`.
- **Cambios en base de datos:** Ninguno (opera sobre la base preparada en PQ-01 y PQ-02).
- **Detalle de implementación:**
  - [H-204](hallazgos.md): En `src/modules/puestos/actions.ts:reactivarPuesto`, verificar `fecha_baja_puesto IS NULL`; rechazar la reactivación si el puesto fue dado de baja mediante `eliminarPuesto`.
  - [H-103](hallazgos.md), [H-223](hallazgos.md): En `cerrarPuesto`, `reactivarPuesto` y `eliminarPuesto`, invalidar canónicamente `/reclutador/puestos`, `/reclutador/puestos/[id]`, `/reclutador/postulaciones` y `/postulante/puestos`.
  - [H-210](hallazgos.md): En cierres en cascada de puestos de una empresa, capturar errores de Supabase y abortar con error explicativo en lugar de omitirlos.
  - [H-105](hallazgos.md): Eliminar la query expuesta en `actions.ts` y consolidar las lecturas en `queries.ts`.
  - [H-108](hallazgos.md): Validar identificadores UUID con `isUuid()` canónico.
  - [H-228](hallazgos.md): Limitar descripciones y motivos a un tope de 2.000 caracteres.
  - [H-202](hallazgos.md) (Paso 2 Código Puestos): Adaptar `puestos/actions.ts`, `puestos/queries.ts` y formularios del reclutador (`nuevo-puesto-form.tsx`, `editar-puesto-form.tsx`, `puestos/[id]/page.tsx`) para escribir y leer el perfil psicológico desde la estructura segura creada en PQ-02 (por ejemplo, en `puesto_criterio_psicologico` para la Opción C, o columnas explícitas para la Opción A).
  - [H-111](hallazgos.md), [H-112](hallazgos.md), [H-115](hallazgos.md): Migrar UIs a `INITIAL_ACTION_STATE`, `useFormAccion` y `formatFecha()`.
- **Cómo se verifica:**
  - `npx playwright test e2e/puestos.spec.ts` en Staging.
  - Casos del QA_PLAN que pasan a ✅: `TC-PUE-005`, `TC-PUE-006`.
- **Riesgo y marcha atrás:**
  - *Riesgo:* Medio. Ciclo comercial de publicación de empleos.
  - *Rollback:* Redeploy de versión previa en Vercel.

---

### PQ-09: Reclutador — Asistente IA y Selección (Cierre definitivo H-202)
- **Objetivo en una línea:** Sanitizar datos de candidatos contra Prompt Injection indirecto, limitar tasas de uso de IA, añadir timeout/retry en Gemini y ejecutar la migración final que elimina la columna confidencial en la base de datos cerrando definitivamente H-202.
- **Hallazgos que aborda:** [H-113](hallazgos.md), [H-115](hallazgos.md), [H-202](hallazgos.md) (paso 2 código IA + paso final migración de cierre), [H-220](hallazgos.md), [H-221](hallazgos.md), [H-227](hallazgos.md).
- **Hallazgos que cierra de forma definitiva:** [H-113](hallazgos.md), [H-202](hallazgos.md), [H-220](hallazgos.md), [H-221](hallazgos.md), [H-227](hallazgos.md).
- **Archivos que toca:**
  - `src/modules/asistente/prompts.ts`
  - `src/modules/asistente/actions.ts`
  - `src/modules/seleccion/service.ts`
  - `src/modules/seleccion/pdf-template.tsx`
  - `src/lib/ai/adapters/gemini.ts`
  - `src/app/(reclutador)/reclutador/asistente/page.tsx`
  - `supabase/migrations/20261112000000_cerrar_perfil_psicologico.sql` (nuevo)
  - `supabase/migrations/20261113000000_informe_seleccion_generado.sql` (nuevo)
  - `src/lib/types/database.types.ts`
- **Diff estimado:** ~310 líneas.
- **Dependencias:** `PQ-03`, `PQ-06`.
- **Cambios en base de datos:**
  - **Paso Final de H-202 en Base de Datos:** Se crea y aplica `supabase/migrations/20261112000000_cerrar_perfil_psicologico.sql`:
    - *Si se implementó Opción C:* Ejecutar `ALTER TABLE public.puesto DROP COLUMN perfil_psicologico_deseado;`. Al haber migrado el código de puestos en PQ-06 y de IA en este paquete, la columna se borra físicamente y la fuga queda sellada de forma absoluta.
    - *Si se implementó Opción A o B:* Ejecutar `REVOKE SELECT (perfil_psicologico_deseado) ON public.puesto FROM anon, authenticated;` o revocar SELECT en la tabla base a favor de la vista.
  - **H-221 (Cuota informe de selección):** Se crea y aplica `supabase/migrations/20261113000000_informe_seleccion_generado.sql` para registrar las ejecuciones del informe de selección grupal y permitir el control de cuota por reclutador (5/hora, 20/día).
  - **Nota de deploy e irreversibilidad:**
    - Las migraciones `20261111000100` y `20261112000000` se aplican juntas e inmediatamente antes de publicar el código.
    - Entre la migración y el deploy, el código viejo falla al ver o editar puestos.
    - Después del deploy no hay vuelta atrás automática en Vercel.
  - Aplicar primero en Staging y luego en Producción.
  - Regenerar `src/lib/types/database.types.ts`.
- **Detalle de implementación:**
  - [H-220](hallazgos.md): En `src/modules/asistente/prompts.ts`, sanear y encapsular campos de texto libre de candidatos (`carrera_otra`, notas, tareas) en bloques XML `<candidato_contexto>` con directivas estrictas de no ejecución de instrucciones inyectadas.
  - [H-221](hallazgos.md): Añadir limitación de tasa por usuario y cuota máxima en `consultarAsistente` y `generarInformeSeleccion`.
  - [H-227](hallazgos.md): En `src/lib/ai/adapters/gemini.ts`, incorporar `AbortSignal` con timeout de 30 segundos y reintentos ante error transitorio `503 UNAVAILABLE`.
  - [H-202](hallazgos.md): Actualizar `asistente/actions.ts` y `seleccion/service.ts` para consultar el perfil psicológico desde la ubicación segura (`puesto_criterio_psicologico`). Con la migración final ejecutada, **el hallazgo H-202 queda cerrado de forma definitiva**.
  - [H-113](hallazgos.md): Usar `<PageHeader>` en `asistente/page.tsx`.
  - [H-115](hallazgos.md): Usar `formatFecha()` en `pdf-template.tsx`.
- **Cómo se verifica:**
  - `npm test`, `npx tsc --noEmit`.
  - Verificar en Staging mediante consulta directa de PostgREST como usuario anónimo o postulante: `supabase.from('puesto').select('perfil_psicologico_deseado')` debe devolver error de columna inexistente o denegada.
  - Casos del QA_PLAN que pasan a ✅: `TC-IA-001`, `TC-IA-002`.
- **Riesgo y marcha atrás:**
  - *Riesgo:* Medio. Al eliminar o revocar la columna en base de datos, cualquier código rezagado que la consulte fallará. Se prueba exhaustivamente en Staging antes de Producción.
  - *Rollback:* Redeploy en Vercel y script SQL que recrea la columna si fuese necesario.

---

### PQ-04: Postulante — Perfil técnico, visibilidad y puestos
- **Objetivo en una línea:** Migrar mutaciones de perfil técnico a RLS con cliente de usuario, validar requisitos de visibilidad pública y corregir paginación y formateo en puestos.
- **Hallazgos que aborda:** [H-100](hallazgos.md), [H-105](hallazgos.md), [H-107](hallazgos.md), [H-111](hallazgos.md), [H-112](hallazgos.md), [H-115](hallazgos.md), [H-117](hallazgos.md), [H-205](hallazgos.md), [H-208](hallazgos.md), [H-223](hallazgos.md), [H-224](hallazgos.md).
- **Hallazgos que cierra de forma definitiva:** [H-100](hallazgos.md), [H-205](hallazgos.md), [H-208](hallazgos.md), [H-224](hallazgos.md).
- **Archivos que toca:**
  - `src/modules/perfil/queries.ts`
  - `src/modules/perfil/actions.ts`
  - `src/modules/perfil-tecnico/actions.ts`
  - `src/components/perfil-tecnico/form-estado.ts`
  - `src/components/perfil-tecnico/use-form-accion.ts`
  - `src/modules/visibilidad/actions.ts`
  - `src/app/(postulante)/postulante/mi-perfil/form.tsx`
  - `src/app/(postulante)/postulante/onboarding/onboarding-form.tsx`
  - `src/app/(postulante)/postulante/puestos/page.tsx`
  - `src/app/(postulante)/postulante/puestos/postular-button.tsx`
  - `src/app/(postulante)/postulante/puestos/puesto-card.tsx`
  - `src/app/(postulante)/postulante/puestos/[id]/page.tsx`
  - `src/app/(postulante)/postulante/reclutadores/[id]/page.tsx`
  - `src/app/(postulante)/postulante/postulaciones/page.tsx`
  - `src/modules/perfil-tecnico/queries.ts`
  - `src/modules/perfil-tecnico/certificado.ts` (nuevo)
  - `src/modules/perfil-tecnico/actions.test.ts` (nuevo)
  - `src/components/perfil-tecnico/use-seleccion-competencias.ts`
  - `src/components/perfil-tecnico/competencias-seleccionadas.tsx`
  - `src/modules/admin/queries.ts`
  - `src/modules/admin/actions.ts`
  - `src/modules/admin/actions.test.ts` (nuevo)
  - `src/app/(admin)/admin/competencias/page.tsx`
  - `src/app/(admin)/admin/competencias/competencias-ui.tsx`
  - `supabase/migrations/20261114000000_competencia_sugerida.sql` (nuevo)
  - `supabase/SETUP.md`
  - `test/rls/competencia-sugerida.rls.ts` (nuevo)
  - `src/lib/types/database.types.ts`
- **Diff estimado:** ~350 líneas.
- **Dependencias:** `PQ-02` (requiere H-213 resuelto en base), `PQ-03`.
- **Cambios en base de datos:** Migración `supabase/migrations/20261114000000_competencia_sugerida.sql` con creación de tabla `competencia_sugerida`, políticas RLS para postulante y admin, reemplazo de `competencia_nombre_key` por índice único insensible a mayúsculas `competencia_nombre_lower_key` y consulta previa de verificación en `supabase/SETUP.md`.
- **Detalle de implementación:**
  - [H-107](hallazgos.md): Exportar helper memoizado `getPostulanteId()` con `cache()` en `src/modules/perfil/queries.ts`.
  - [H-100](hallazgos.md): En `src/modules/perfil-tecnico/actions.ts`, reemplazar `createAdminClient()` por `createClient()` en funciones de alta (experiencia, educación, cursos, idiomas, competencias) respetando RLS (Grupo 1.1).
  - [H-105](hallazgos.md): Adaptar la firma de `guardarCompetenciasConCustom` a `Promise<ActionResult>`.
  - [H-205](hallazgos.md): Implementar el criterio de competencias custom definido por Tomás.
  - [H-208](hallazgos.md): En `src/modules/visibilidad/actions.ts:togglePerfilEnBusqueda`, verificar guard de rol `POSTULANTE`, confirmar que el postulante haya completado el test de eneagrama y que su informe psicológico figure en estado `LISTO` antes de permitir `perfil_en_busqueda = true`.
  - [H-223](hallazgos.md): Al modificar visibilidad, revalidar explícitamente `/reclutador/postulantes`.
  - [H-224](hallazgos.md): En `puestos/page.tsx` y `postulaciones/page.tsx`, sanitizar `page` (`Number.isFinite(p) ? Math.max(1, p) : 1`) evitando que `NaN` rompa las consultas `.range()`.
  - [H-111](hallazgos.md), [H-112](hallazgos.md), [H-115](hallazgos.md), [H-117](hallazgos.md): Migrar componentes a `INITIAL_ACTION_STATE`, `formatFecha()` y `ESTADO_POSTULACION_LABEL_POSTULANTE`.
- **Cómo se verifica:**
  - `npm test`, `npx tsc --noEmit`.
  - Navegación con parámetros inválidos (`/postulante/puestos?page=abc`).
  - Casos del QA_PLAN que pasan a ✅: `TC-PERF-001`, `TC-PERF-002`, `TC-PERF-003`, `TC-PERF-004`.
- **Riesgo y marcha atrás:**
  - *Riesgo:* Medio. Modifica la capa de altas técnicas del candidato.
  - *Rollback:* Redeploy de versión anterior en Vercel.

---

### PQ-05: Postulante — Eneagrama, informe y certificados
- **Objetivo en una línea:** Asegurar consistencia atómica en el cálculo de eneatipo, respetar el período de 6 meses para rehacer el test y corregir la hidratación en el informe.
- **Hallazgos que aborda:** [H-107](hallazgos.md), [H-112](hallazgos.md), [H-115](hallazgos.md), [H-207](hallazgos.md), [H-209](hallazgos.md), [H-222](hallazgos.md).
- **Hallazgos que cierra de forma definitiva:** [H-207](hallazgos.md), [H-209](hallazgos.md), [H-222](hallazgos.md). (H-207 completado en Etapa B).
- **Archivos que toca:**
  - `src/modules/eneagrama/actions.ts`
  - `src/modules/eneagrama/rehacer-policy.ts`
  - `src/modules/eneagrama/actions.test.ts` (nuevo)
  - `src/app/(postulante)/postulante/informe/informe-visor.tsx`
  - `src/app/(postulante)/postulante/informe/informe-feedback.tsx`
  - `src/modules/informe/pdf-template.tsx`
  - `src/modules/certificado/actions.ts`
  - `src/modules/certificado/certificado-display.tsx`
  - `src/modules/certificado/pdf-template.tsx`
  - `src/app/(postulante)/postulante/certificado/certificado-ui.tsx`
- **Diff estimado:** ~290 líneas.
- **Dependencias:** `PQ-03`, `PQ-04` (consume `getPostulanteId`).
- **Cambios en base de datos:** Ninguno.
- **Detalle de implementación:**
  - [H-207](hallazgos.md): En `src/modules/eneagrama/actions.ts:calcularEneatipo`, persistencia atómica mediante la función RPC `guardar_resultado_eneagrama` (migración `20261115000000_guardar_resultado_eneagrama.sql`), evitando descarte silencioso o estados inconsistentes.
  - [H-209](hallazgos.md): Invocar `evaluarRehacer` de `rehacer-policy.ts` comprobando que hayan transcurrido 6 meses desde el último test válido antes de permitir rehacerlo (`TC-ENE-004`).
  - [H-222](hallazgos.md): Eliminar cálculo impuro de `Date.now()` en el render inicial de `informe-visor.tsx` para evitar discrepancias de hidratación entre SSR y cliente.
  - [H-107](hallazgos.md): Usar `getPostulanteId()` canónico en `certificado/actions.ts`.
  - [H-112](hallazgos.md), [H-115](hallazgos.md): Usar `INITIAL_ACTION_STATE` y `formatFecha()` en vistas y PDFs de certificados e informes.
  - Test unitario junto al código en `src/modules/eneagrama/actions.test.ts`.
- **Cómo se verifica:**
  - `npm test` ejecutando `src/modules/eneagrama/actions.test.ts`.
  - Casos del QA_PLAN: `TC-ENE-004` pasa a ✅.
- **Riesgo y marcha atrás:**
  - *Riesgo:* Bajo. Flujo de evaluación psicométrica.
  - *Rollback:* Redeploy en Vercel.

---

### PQ-07: Reclutador — Postulaciones y máquina de estados
- **Objetivo en una línea:** Restringir transiciones a la máquina de estados real (ENVIADA→VISTO→PROCESO_FINALIZADO), validar rechazos terminales, unificar topes y sincronizar caché.
- **Hallazgos que aborda:** [H-107](hallazgos.md), [H-115](hallazgos.md), [H-117](hallazgos.md), [H-118](hallazgos.md), [H-203](hallazgos.md), [H-214](hallazgos.md), [H-219](hallazgos.md), [H-223](hallazgos.md), [H-228](hallazgos.md).
- **Hallazgos que cierra de forma definitiva:** [H-107](hallazgos.md), [H-117](hallazgos.md), [H-203](hallazgos.md), [H-214](hallazgos.md), [H-219](hallazgos.md), [H-223](hallazgos.md).
- **Archivos que toca:**
  - `src/modules/postulaciones/actions.ts`
  - `src/modules/postulaciones/actions.test.ts` (nuevo)
  - `src/app/(reclutador)/reclutador/postulaciones/page.tsx`
- **Diff estimado:** ~330 líneas.
- **Dependencias:** `PQ-03`, `PQ-06`.
- **Cambios en base de datos:** Ninguno.
- **Detalle de implementación:**
  - [H-203](hallazgos.md): En `src/modules/postulaciones/actions.ts:avanzarEstadoPostulacion`, validar la máquina de estados real de PostgreSQL (`estado_postulacion`): las únicas transiciones directas permitidas son `ENVIADA -> VISTO` y `VISTO -> PROCESO_FINALIZADO`. Si la candidatura se encuentra en `PROCESO_FINALIZADO` o `CERRADA`, rechazar la mutación sin alterar la base de datos.
  - [H-214](hallazgos.md): En `noAvanzarPostulacion`, verificar que el estado no sea `PROCESO_FINALIZADO` ni `CERRADA` antes de transicionar a `PROCESO_FINALIZADO`.
  - [H-228](hallazgos.md): Validar tope unificado de 2.000 caracteres en el motivo de descarte.
  - [H-219](hallazgos.md): Respetar el flag y configuración de email acordada para Resend.
  - [H-223](hallazgos.md): Revalidar simétricamente `/reclutador/postulaciones` y `/postulante/postulaciones`.
  - [H-107](hallazgos.md): Consumir `getPostulanteId()` canónico.
  - [H-117](hallazgos.md), [H-118](hallazgos.md): En `postulaciones/page.tsx`, consumir `ESTADO_POSTULACION_LABEL_RECLUTADOR` y botón con `variant="ghost"`.
  - Test unitario de transiciones junto al código en `src/modules/postulaciones/actions.test.ts`.
- **Cómo se verifica:**
  - `npm test` ejecutando `src/modules/postulaciones/actions.test.ts`.
  - `npx playwright test e2e/postulaciones.spec.ts` en Staging.
  - Casos del QA_PLAN que pasan a ✅: `TC-POST-004`, `TC-POST-005`, `TC-POST-006`.
- **Riesgo y marcha atrás:**
  - *Riesgo:* Medio. Proceso central de selección de candidatos.
  - *Rollback:* Redeploy en Vercel.

---

### PQ-08: Reclutador — Postulaciones, candidatos y notas privadas
- **Objetivo en una línea:** Migrar notas privadas a cliente RLS, unificar componentes duplicados de notas, formatear fechas con timezone y suprimir mutaciones en render GET de candidato.
- **Hallazgos que aborda:** [H-102](hallazgos.md), [H-108](hallazgos.md), [H-114](hallazgos.md), [H-115](hallazgos.md), [H-118](hallazgos.md), [H-119](hallazgos.md), [H-217](hallazgos.md), [H-225](hallazgos.md), [H-228](hallazgos.md).
- **Hallazgos que cierra de forma definitiva:** [H-102](hallazgos.md), [H-114](hallazgos.md), [H-118](hallazgos.md), [H-119](hallazgos.md), [H-217](hallazgos.md), [H-225](hallazgos.md), [H-228](hallazgos.md).
- **Archivos que toca:**
  - `src/modules/postulantes/actions.ts`
  - `src/modules/postulantes/queries.ts`
  - `src/components/shared/notas-candidato.tsx` (nuevo)
  - `src/app/(reclutador)/reclutador/postulaciones/notas-modal-btn.tsx`
  - `src/app/(reclutador)/reclutador/postulantes/[id]/notas-panel.tsx`
  - `src/app/(reclutador)/reclutador/postulantes/[id]/page.tsx`
  - `src/app/(reclutador)/reclutador/notas/page.tsx`
- **Diff estimado:** ~370 líneas.
- **Dependencias:** `PQ-03`, `PQ-07`.
- **Cambios en base de datos:** Ninguno.
- **Detalle de implementación:**
  - [H-119](hallazgos.md): En `src/modules/postulantes/actions.ts:crearNota`, usar `createClient()` con RLS para insertar en `nota_privada`, limitando el cliente `service_role` a la actualización de actividad de puesto.
  - [H-102](hallazgos.md): En `editarNota`, revalidar de forma consistente `/reclutador/notas`, `/reclutador/postulaciones` y `/reclutador/postulantes/[id]`.
  - [H-228](hallazgos.md): Validar tope de 2.000 caracteres en contenido de notas privadas.
  - [H-114](hallazgos.md): Crear componente compartido `src/components/shared/notas-candidato.tsx` y consumirlo tanto en `notas-modal-btn.tsx` como en `notas-panel.tsx`, eliminando la duplicación estructural de vistas.
  - [H-225](hallazgos.md): Eliminar las mutaciones impuras de base de datos (`marcarActividadPuesto` y `marcarPostulacionVista`) que ocurrían durante el render del Server Component GET en `postulantes/[id]/page.tsx`, vinculándolas a acciones explícitas disparadas por eventos de visualización en cliente.
  - [H-217](hallazgos.md), [H-115](hallazgos.md): Formatear timestamps con `formatFecha(d, { timeZone: 'America/Argentina/Buenos_Aires' })` y fechas con `{ timeZone: 'UTC' }` canónicos.
  - [H-108](hallazgos.md): Validar UUIDs con `isUuid()` en `postulantes/queries.ts`.
- **Cómo se verifica:**
  - `npx playwright test e2e/notas.spec.ts` en Staging.
  - Casos del QA_PLAN que pasan a ✅: `TC-NOTA-001`, `TC-NOTA-002`, `TC-NOTA-003`, `TC-NOTA-004`.
- **Riesgo y marcha atrás:**
  - *Riesgo:* Bajo. Limpia efectos secundarios no deseados en GET.
  - *Rollback:* Redeploy en Vercel.

---

### PQ-10: Administración — Catálogos maestros, preguntas y exportación
- **Objetivo en una línea:** Validar catálogos con esquema Zod, propagar errores de base de datos, estandarizar contratos JSON en Route Handlers y adoptar useFormAccion e INITIAL_ACTION_STATE.
- **Hallazgos que aborda:** [H-104](hallazgos.md), [H-110](hallazgos.md), [H-111](hallazgos.md), [H-112](hallazgos.md), [H-115](hallazgos.md), [H-206](hallazgos.md), [H-216](hallazgos.md).
- **Hallazgos que cierra de forma definitiva:** [H-104](hallazgos.md), [H-110](hallazgos.md), [H-206](hallazgos.md), [H-216](hallazgos.md).
- **Archivos que toca:**
  - `src/modules/admin/schema.ts` (nuevo)
  - `src/modules/admin/actions.ts`
  - `src/modules/carreras/queries.ts`
  - `src/modules/ubicacion/queries.ts`
  - `src/app/api/admin/preguntas/route.ts`
  - `src/app/api/admin/catalogos/export/route.ts`
  - `src/app/(admin)/admin/carreras/page.tsx`
  - `src/app/(admin)/admin/carreras/carreras-ui.tsx`
  - `src/app/(admin)/admin/competencias/page.tsx`
  - `src/app/(admin)/admin/competencias/competencias-ui.tsx`
  - `src/app/(admin)/admin/idiomas/page.tsx`
  - `src/app/(admin)/admin/idiomas/idiomas-ui.tsx`
  - `src/app/(admin)/admin/sectores/page.tsx`
  - `src/app/(admin)/admin/sectores/sectores-ui.tsx`
  - `src/app/(admin)/admin/ubicaciones/page.tsx`
  - `src/app/(admin)/admin/ubicaciones/ubicaciones-ui.tsx`
  - `src/app/(admin)/admin/preguntas/page.tsx`
  - `src/app/(admin)/admin/preguntas/preguntas-ui.tsx`
- **Diff estimado:** ~340 líneas.
- **Dependencias:** `PQ-03`.
- **Cambios en base de datos:** Ninguno.
- **Detalle de implementación:**
  - [H-110](hallazgos.md): Definir `catalogoItemSchema` en `src/modules/admin/schema.ts` y validar entradas de carreras, competencias, idiomas y sectores en `src/modules/admin/actions.ts`.
  - [H-216](hallazgos.md): En `carreras/queries.ts` y `ubicacion/queries.ts`, verificar `error` de Supabase y propagarlo en lugar de ocultarlo con `data ?? []`.
  - [H-104](hallazgos.md): En Route Handlers de `api/admin/`, retornar respuestas consistentes JSON `{ error: string }` con status 401/403.
  - [H-206](hallazgos.md): En `api/admin/preguntas/route.ts`, asignar código correlativo válido en lugar de fijar `'0'`.
  - Centralización de `requireAdmin`: Eliminar la copia local de `requireAdmin` en `src/modules/admin/actions.ts:11` y sustituirla por el import canónico de `@/lib/guards`.
  - [H-111](hallazgos.md), [H-112](hallazgos.md), [H-115](hallazgos.md): Migrar UIs a `useFormAccion`, `INITIAL_ACTION_STATE` y `formatFecha()`.
- **Cómo se verifica:**
  - `npm test`, `npx tsc --noEmit`.
  - Casos del QA_PLAN que pasan a ✅: `TC-ADM-001`, `TC-ADM-002`, `TC-ADM-003`, `TC-ADM-004`.
- **Riesgo y marcha atrás:**
  - *Riesgo:* Bajo. Limitado al módulo administrativo.
  - *Rollback:* Redeploy en Vercel.

---

### PQ-11: Administración — Sesiones, gestión de entidades y auditoría
- **Objetivo en una línea:** Impedir auto-revocación de sesiones de admin, validar transiciones de estado de postulantes, formatear fechas y aplicar helpers canónicos en entidades.
- **Hallazgos que aborda:** [H-111](hallazgos.md), [H-112](hallazgos.md), [H-115](hallazgos.md), [H-116](hallazgos.md), [H-212](hallazgos.md), [H-215](hallazgos.md).
- **Hallazgos que cierra de forma definitiva:** [H-111](hallazgos.md), [H-116](hallazgos.md), [H-212](hallazgos.md), [H-215](hallazgos.md).
- **Archivos que toca:**
  - `src/modules/admin/sessions.ts`
  - `src/app/(admin)/admin/postulantes/page.tsx`
  - `src/app/(admin)/admin/empresas/page.tsx`
  - `src/app/(admin)/admin/empresas/config-inactividad.tsx`
  - `src/app/(admin)/admin/feedback/page.tsx`
  - `src/app/(admin)/admin/feedback/config-reactivacion.tsx`
  - `src/app/(admin)/admin/informes/page.tsx`
  - `src/app/(admin)/admin/tyc/tyc-ui.tsx`
- **Diff estimado:** ~250 líneas.
- **Dependencias:** `PQ-03`, `PQ-10`.
- **Cambios en base de datos:** Ninguno.
- **Detalle de implementación:**
  - [H-212](hallazgos.md): En `src/modules/admin/sessions.ts:revocarSesion`, verificar si `usuarioDestinoId === session.user.id`; si coincide, rechazar la operación impidiendo que el administrador cierre su propio acceso. Eliminar además la copia local de `requireAdmin` en `sessions.ts:8` importando desde `@/lib/guards`.
  - [H-215](hallazgos.md): Validar que el estado actual requiera el cambio antes de ejecutar `desactivarPostulante` y `reactivarPostulante`.
  - [H-116](hallazgos.md): En `admin/postulantes/page.tsx`, utilizar el helper canónico `ubicacionLabel`.
  - [H-111](hallazgos.md), [H-112](hallazgos.md), [H-115](hallazgos.md): En `tyc-ui.tsx`, `config-inactividad.tsx`, `config-reactivacion.tsx`, `empresas/page.tsx`, `feedback/page.tsx` e `informes/page.tsx`, consumir `useFormAccion`, `INITIAL_ACTION_STATE` y `formatFecha()`.
- **Cómo se verifica:**
  - `npm test`, `npx tsc --noEmit`.
  - Casos del QA_PLAN que pasan a ✅: `TC-ADM-005`.
- **Riesgo y marcha atrás:**
  - *Riesgo:* Bajo.
  - *Rollback:* Redeploy en Vercel.

---

### PQ-12: Acceso, Autenticación y TyC Ley 25.326
- **Objetivo en una línea:** Ajustar accesibilidad en login/registro, unificar esquemas de credenciales y preparar flujos de supresión de cuenta y exportación bajo Ley 25.326.
- **Hallazgos que aborda:** [H-108](hallazgos.md), [H-109](hallazgos.md), [H-112](hallazgos.md), [H-115](hallazgos.md), [H-301](hallazgos.md), [H-302](hallazgos.md).
- **Hallazgos que cierra de forma definitiva:** [H-108](hallazgos.md), [H-109](hallazgos.md), [H-112](hallazgos.md), [H-115](hallazgos.md), [H-301](hallazgos.md), [H-302](hallazgos.md).
- **Archivos que toca:**
  - `src/app/(acceso)/iniciar-sesion/iniciar-sesion-form.tsx`
  - `src/app/(acceso)/registro/registro-form.tsx`
  - `src/app/(acceso)/verificar/verify-form.tsx`
  - `src/app/(acceso)/verificar/[id]/page.tsx`
  - `src/app/(acceso)/recuperar-password/recuperar-form.tsx`
  - `src/app/(acceso)/recuperar-password/nueva/nueva-password-form.tsx`
  - `src/components/shared/cambiar-password-form.tsx`
  - `src/components/shared/brand-logo.tsx`
  - `src/modules/auth/actions.ts`
  - `docs/legal/terminos_y_condiciones.md` (nuevo)
- **Diff estimado:** ~320 líneas.
- **Dependencias:** `PQ-03`.
- **Cambios en base de datos:** Ninguno en este paquete (el texto legal se incorpora tras decisión de Tomás).
- **Detalle de implementación:**
  - [H-301](hallazgos.md): En `iniciar-sesion-form.tsx` y `registro-form.tsx`, sustituir etiquetas `<span>` por `<label htmlFor="...">` asociados a inputs con `id`. En `BrandLogo`, asignar texto accesible para lectores de pantalla.
  - [H-108](hallazgos.md): Usar `isUuid()` en `verify-form.tsx`.
  - [H-109](hallazgos.md): Usar `nuevaPasswordSchema` en `nueva-password-form.tsx` y `cambiar-password-form.tsx`.
  - [H-112](hallazgos.md), [H-115](hallazgos.md): Migrar UIs a `INITIAL_ACTION_STATE` y `formatFecha()`.
  - [H-302](hallazgos.md): En `src/modules/auth/actions.ts`, crear la Server Action `solicitarBajaCuenta` (derecho de supresión / olvido Ley 25.326). Documentar en `docs/legal/terminos_y_condiciones.md` el pliego formal con cláusula de consentimiento explícito para tratamiento psicométrico.
- **Cómo se verifica:**
  - Navegación accesible por teclado y lector de pantalla en `/iniciar-sesion` y `/registro`.
  - Casos del QA_PLAN: `TC-AUTH-021`, `TC-AUTH-022`.
- **Riesgo y marcha atrás:**
  - *Riesgo:* Bajo. Flujo de supresión protegido por verificación de sesión.
  - *Rollback:* Redeploy en Vercel.

---

### PQ-13: Pre-deploy — Configuración, Observabilidad y Logs
- **Objetivo en una línea:** Validar variables de entorno requeridas al arrancar (fail-fast), crear logger estructurado de auditoría e instrumentar reporte centralizado de errores.
- **Hallazgos que cierra:** [H-303](hallazgos.md), [H-305](hallazgos.md), [H-306](hallazgos.md).
- **Archivos que toca:**
  - `src/lib/env.ts` (nuevo)
  - `src/lib/logger.ts` (nuevo)
  - `src/proxy.ts`
  - `src/app/error.tsx`
  - `src/app/global-error.tsx`
- **Diff estimado:** ~240 líneas.
- **Dependencias:** `PQ-03`.
- **Cambios en base de datos:** Ninguno.
- **Detalle de implementación:**
  - [H-303](hallazgos.md): Crear `src/lib/env.ts` con schema Zod validando presencia y formato de variables obligatorias al inicializar el servidor (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, `GEMINI_API_KEY`). Invocar en `src/proxy.ts`.
  - [H-306](hallazgos.md): Crear `src/lib/logger.ts` para emitir logs estructurados JSON con nivel (`INFO`, `WARN`, `ERROR`), identificador de usuario, nombre de la acción (`action`) y metadatos relevantes en operaciones críticas.
  - [H-305](hallazgos.md): Conectar `src/app/error.tsx` y `src/app/global-error.tsx` con el handler del SDK de observabilidad seleccionado por Tomás.
- **Cómo se verifica:**
  - Iniciar la app omitiendo una variable obligatoria: verificar que aborta con mensaje descriptivo en consola.
- **Riesgo y marcha atrás:**
  - *Riesgo:* Bajo.
  - *Rollback:* Redeploy en Vercel.

---

### PQ-14: Pre-deploy — Optimización RLS y subqueries escalares
- **Objetivo en una línea:** Resolver las 71 alertas auth_rls_initplan optimizando las políticas mediante subconsultas escalares y consolidar políticas permisivas redundantes.
- **Hallazgos que cierra:** [H-009](hallazgos.md), [H-010](hallazgos.md).
- **Archivos que toca:**
  - `supabase/migrations/20261102020000_rls_advisors.sql` (nuevo)
  - `src/lib/types/database.types.ts`
- **Diff estimado:** ~380 líneas.
- **Dependencias:** `PQ-01`, `PQ-02`, `PQ-09`.
- **Cambios en base de datos:**
  - Crea `supabase/migrations/20261102020000_rls_advisors.sql`:
    - [H-009](hallazgos.md): Recrear las políticas RLS envolviendo las llamadas directas a `auth.uid()` y `get_my_rol()` en subconsultas escalares `(select auth.uid())` y `(select get_my_rol())`. Esto fuerza a PostgreSQL a planificar la llamada una sola vez por consulta en lugar de evaluar la función volátil en cada fila escaneada.
    - [H-010](hallazgos.md): Consolidar políticas múltiples permisivas redundantes en tablas de catálogos y entidades compartidas.
  - Aplicación: Se aplica en Staging vía CLI; se corren los Advisors de Supabase comprobando que las advertencias desaparecen; se aplica en Producción.
  - Regeneración de `src/lib/types/database.types.ts`.
- **Cómo se verifica:**
  - Consultar `get_advisors` en Supabase Staging: 0 advertencias de nivel `auth_rls_initplan` y `multiple_permissive_policies`.
- **Riesgo y marcha atrás:**
  - *Riesgo:* Medio. Toca múltiples políticas existentes sin alterar la lógica de negocio.
  - *Rollback:* Script de reversión SQL de políticas pre-modificación.

---

### PQ-15: Pre-deploy — Calidad, CI, SEO y Runbooks
- **Objetivo en una línea:** Automatizar pipeline de CI en GitHub Actions, sanear linter y QA_PLAN, restringir indexación de áreas privadas y documentar procedimientos de rollback.
- **Hallazgos que cierra:** [H-004](hallazgos.md), [H-005](hallazgos.md), [H-007](hallazgos.md), [H-229](hallazgos.md), [H-300](hallazgos.md), [H-304](hallazgos.md).
- **Archivos que toca:**
  - `eslint.config.mjs`
  - `QA_PLAN.md`
  - `.github/workflows/ci.yml` (nuevo)
  - `src/app/robots.ts` (nuevo)
  - `src/app/(admin)/layout.tsx`
  - `src/app/(postulante)/layout.tsx`
  - `src/app/(reclutador)/layout.tsx`
  - `docs/runbooks/rollback.md` (nuevo)
  - `docs/runbooks/supabase-auth-config.md` (nuevo)
- **Diff estimado:** ~360 líneas.
- **Dependencias:** `PQ-01`, `PQ-02`, `PQ-13`, `PQ-14`.
- **Cambios en base de datos:** Ninguno.
- **Detalle de implementación:**
  - [H-004](hallazgos.md): En `eslint.config.mjs`, ignorar directorios `.agents/` y `.claude/` logrando 0 advertencias.
  - [H-304](hallazgos.md): Crear `.github/workflows/ci.yml` ejecutando `npm run lint`, `npx tsc --noEmit`, `npm test` y `npm run build` en cada push o pull request.
  - [H-300](hallazgos.md): Crear `src/app/robots.ts` con exclusión de indexación para `/admin/`, `/postulante/`, `/reclutador/` y `/api/`. Incorporar metadatos `robots: { index: false, follow: false }` en sus layouts.
  - [H-005](hallazgos.md), [H-229](hallazgos.md): Renumerar colisiones de IDs `TC-PERF-001..004` a `TC-LOAD-001..004`, retirar casos obsoletos de Human Design y depurar menciones a Gemini.
  - [H-007](hallazgos.md): Documentar activación de `auth_leaked_password_protection` en `docs/runbooks/supabase-auth-config.md`.
  - Redactar runbook de rollback operativo en `docs/runbooks/rollback.md`.
- **Cómo se verifica:**
  - `npm run lint` devolviendo 0 warnings.
  - Verificación del pipeline de GitHub Actions en verde.
- **Riesgo y marcha atrás:**
  - *Riesgo:* Bajo.
  - *Rollback:* Revert de commit en git.

---

## Decisiones tomadas

Todas las definiciones arquitectónicas y de alcance han sido resueltas por Tomás, estructurando el trabajo técnico en dos etapas bien diferenciadas:

### 1. Esquema de ejecución en dos etapas (Fase 6)
- **ETAPA A (solo código, sin base de prueba):** Se desarrolla íntegramente en la rama `fase-6/etapa-a`. No toca la base de datos (prohibido SQL, Supabase CLI o migraciones), no ejecuta suites E2E contra la base productiva y no expone secretos. Toda verificación se realiza mediante `npx tsc --noEmit`, `npm run lint`, `npm test` (Vitest con base de datos simulada en memoria) y `npm run build`. Los cambios se acumulan en esta rama y no se despliegan a producción hasta que se complete la Etapa B. No se prueban a mano flujos que escriban datos porque el servidor local apunta a producción.
- **ETAPA B (con staging, al final):** Se ejecuta una vez configurado el proyecto Supabase de staging independiente. Comprende la ejecución de migraciones DDL/DML, corrección de RLS P0, paso de clientes `createAdminClient` a cliente con RLS, tablas y funciones transaccionales nuevas, optimización de políticas, suite E2E completa de Playwright y la repetición de la Fase 0 contra la línea base antes del deploy final.

### 2. Aislamiento de perfil psicológico (H-202)
Tomás seleccionó la **Opción C** (tabla dedicada `puesto_criterio_psicologico`). El procedimiento se ejecuta en tres pasos coordinados:
1. **Creación de tabla y copia de datos:** Se crea la tabla `puesto_criterio_psicologico (puesto_id UUID PRIMARY KEY REFERENCES puesto(id) ON DELETE CASCADE, perfil_psicologico_deseado TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)` con RLS estricta para el reclutador titular de la empresa y `service_role`. Se copian los datos existentes de `puesto.perfil_psicologico_deseado`. La columna original en `puesto` se conserva temporalmente.
2. **Migración de código y sincronización pre-deploy:** Se modifican las pantallas, actions y queries de puestos e IA para leer y persistir en `puesto_criterio_psicologico`. Inmediatamente antes del despliegue a producción, se vuelven a copiar los datos desde `puesto` a `puesto_criterio_psicologico` para capturar cualquier registro creado durante la ventana de desarrollo.
3. **Eliminación definitiva de columna:** Se verifica exhaustivamente que ambas ubicaciones contienen exactamente el mismo contenido y se ejecuta `ALTER TABLE public.puesto DROP COLUMN perfil_psicologico_deseado;`.
> [!WARNING]
> **Implicancia crítica para rollback:** El borrado físico de la columna en PostgreSQL impide utilizar la función de rollback automático de Vercel a una versión previa del código, dado que versiones anteriores fallarán de inmediato al ejecutar `select('*')` o referenciar la columna eliminada.

### 3. Moderación de competencias libres en el catálogo (H-205)
- Lo que el postulante escriba como competencia nueva va a una tabla separada de sugerencias (`competencia_sugerida`), nunca directamente a la tabla oficial `competencia`.
- El postulante ve la sugerencia en su perfil como "pendiente"; los reclutadores no la ven.
- En `/admin/competencias`, el administrador dispone de un panel para moderar:
  - **Aprobar:** La suma al catálogo oficial, o la unifica con una competencia preexistente aunque cambien las mayúsculas/minúsculas, y se la asigna al postulante con su nivel correspondiente.
  - **Descartar:** La borra de la tabla de sugerencias.
- Se corrigen además dos comportamientos anómalos existentes:
  - Un nombre ingresado que coincide con una competencia desactivada hoy reutiliza indebidamente la desactivada; debe tratarse según el nuevo flujo de moderación.
  - El índice único de nombre actual distingue mayúsculas; se normaliza a índice insensible a mayúsculas (`CITEXT` o `UNIQUE (LOWER(nombre))`).

### 4. Términos y Condiciones y Ley 25.326 (H-302)
- El texto legal definitivo lo redacta Tomás.
- El plan técnico cubre exclusivamente la arquitectura de software y base de datos (consentimiento explícito para evaluación psicométrica en registro, derecho de supresión con borrado seguro de cuenta y exportación de datos en formato JSON portable), ejecutándose en la Etapa B.

---

## Fuera del plan

Los siguientes ítems quedan expresamente fuera del plan de ejecución de la Fase 6 por motivos operativos y de infraestructura:
- **H-007 (Protección contra contraseñas filtradas en Supabase Auth):** Lo activa Tomás directamente desde el panel de control de Supabase (Auth > Password security).
- **H-219 (Notificaciones por email en postulaciones y verificación Resend):** Deuda técnica hasta que el proyecto se instale formalmente en su infraestructura definitiva.
- **H-305 (Monitoreo y observabilidad APM en producción):** Herramienta (Sentry/Vercel) e integración definidas directamente por Tomás.

---

## Matriz archivo → paquete

| Archivo | Paquete |
| --- | --- |
| `e2e/fixtures/auth.ts` | PQ-01 |
| `playwright.config.ts` | PQ-01 |
| `.env.example` (nuevo) | PQ-01 |
| `supabase/migrations/20261102000000_drift_contratacion_eneagrama.sql` (nuevo) | PQ-01 |
| `docs/runbooks/staging-baseline.md` (nuevo) | PQ-01 |
| `supabase/migrations/20261102010000_p0_seguridad_rls.sql` (nuevo) | PQ-02 |
| `src/lib/supabase/rls-seguridad-p0.rls.ts` (nuevo) | PQ-02 |
| `package.json` | PQ-02 |
| `src/lib/types/domain.ts` | PQ-03 |
| `src/lib/constants/enums.ts` | PQ-03 |
| `src/lib/utils.ts` | PQ-03 |
| `src/lib/utils.test.ts` (nuevo) | PQ-03 |
| `src/lib/fecha.ts` (nuevo) | PQ-03 |
| `src/lib/fecha.test.ts` (nuevo) | PQ-03 |
| `src/components/shared/use-form-accion.ts` (nuevo) | PQ-03 |
| `src/modules/auth/schema.ts` | PQ-03 |
| `src/lib/supabase/server-admin.ts` | PQ-03 |
| `src/lib/guards.ts` | PQ-03 |
| `src/lib/guards.test.ts` (nuevo) | PQ-03 |
| `src/modules/puestos/actions.ts` | PQ-06 |
| `src/modules/puestos/queries.ts` | PQ-06 |
| `src/modules/puestos/schema.ts` | PQ-06 |
| `src/app/(reclutador)/reclutador/puestos/page.tsx` | PQ-06 |
| `src/app/(reclutador)/reclutador/puestos/nuevo/nuevo-puesto-form.tsx` | PQ-06 |
| `src/app/(reclutador)/reclutador/puestos/[id]/page.tsx` | PQ-06 |
| `src/app/(reclutador)/reclutador/puestos/[id]/editar/editar-puesto-form.tsx` | PQ-06 |
| `src/app/(reclutador)/reclutador/empresas/empresas-ui.tsx` | PQ-06 |
| `src/components/shared/nueva-empresa-modal.tsx` | PQ-06 |
| `src/app/(reclutador)/reclutador/onboarding/onboarding-form.tsx` | PQ-06 |
| `src/app/(reclutador)/reclutador/mi-perfil/form.tsx` | PQ-06 |
| `src/modules/asistente/prompts.ts` | PQ-09 |
| `src/modules/asistente/actions.ts` | PQ-09 |
| `src/modules/seleccion/service.ts` | PQ-09 |
| `src/modules/seleccion/pdf-template.tsx` | PQ-09 |
| `src/lib/ai/adapters/gemini.ts` | PQ-09 |
| `src/app/(reclutador)/reclutador/asistente/page.tsx` | PQ-09 |
| `supabase/migrations/20261112000000_cerrar_perfil_psicologico.sql` (nuevo) | PQ-09 |
| `supabase/migrations/20261113000000_informe_seleccion_generado.sql` (nuevo) | PQ-09 |
| `src/modules/perfil/queries.ts` | PQ-04 |
| `src/modules/perfil/actions.ts` | PQ-04 |
| `src/modules/perfil-tecnico/actions.ts` | PQ-04 |
| `src/components/perfil-tecnico/form-estado.ts` | PQ-04 |
| `src/components/perfil-tecnico/use-form-accion.ts` | PQ-04 |
| `src/modules/visibilidad/actions.ts` | PQ-04 |
| `src/app/(postulante)/postulante/mi-perfil/form.tsx` | PQ-04 |
| `src/app/(postulante)/postulante/onboarding/onboarding-form.tsx` | PQ-04 |
| `src/app/(postulante)/postulante/puestos/page.tsx` | PQ-04 |
| `src/app/(postulante)/postulante/puestos/postular-button.tsx` | PQ-04 |
| `src/app/(postulante)/postulante/puestos/puesto-card.tsx` | PQ-04 |
| `src/app/(postulante)/postulante/puestos/[id]/page.tsx` | PQ-04 |
| `src/app/(postulante)/postulante/reclutadores/[id]/page.tsx` | PQ-04 |
| `src/app/(postulante)/postulante/postulaciones/page.tsx` | PQ-04 |
| `src/modules/eneagrama/actions.ts` | PQ-05 |
| `src/modules/eneagrama/rehacer-policy.ts` | PQ-05 |
| `src/modules/eneagrama/actions.test.ts` (nuevo) | PQ-05 |
| `src/app/(postulante)/postulante/informe/informe-visor.tsx` | PQ-05 |
| `src/app/(postulante)/postulante/informe/informe-feedback.tsx` | PQ-05 |
| `src/modules/informe/pdf-template.tsx` | PQ-05 |
| `src/modules/certificado/actions.ts` | PQ-05 |
| `src/modules/certificado/certificado-display.tsx` | PQ-05 |
| `src/modules/certificado/pdf-template.tsx` | PQ-05 |
| `src/app/(postulante)/postulante/certificado/certificado-ui.tsx` | PQ-05 |
| `src/modules/postulaciones/actions.ts` | PQ-07 |
| `src/modules/postulaciones/actions.test.ts` (nuevo) | PQ-07 |
| `src/app/(reclutador)/reclutador/postulaciones/page.tsx` | PQ-07 |
| `src/modules/postulantes/actions.ts` | PQ-08 |
| `src/modules/postulantes/queries.ts` | PQ-08 |
| `src/components/shared/notas-candidato.tsx` (nuevo) | PQ-08 |
| `src/app/(reclutador)/reclutador/postulaciones/notas-modal-btn.tsx` | PQ-08 |
| `src/app/(reclutador)/reclutador/postulantes/[id]/notas-panel.tsx` | PQ-08 |
| `src/app/(reclutador)/reclutador/postulantes/[id]/page.tsx` | PQ-08 |
| `src/app/(reclutador)/reclutador/notas/page.tsx` | PQ-08 |
| `src/modules/admin/schema.ts` (nuevo) | PQ-10 |
| `src/modules/admin/actions.ts` | PQ-10 |
| `src/modules/carreras/queries.ts` | PQ-10 |
| `src/modules/ubicacion/queries.ts` | PQ-10 |
| `src/app/api/admin/preguntas/route.ts` | PQ-10 |
| `src/app/api/admin/catalogos/export/route.ts` | PQ-10 |
| `src/app/(admin)/admin/carreras/page.tsx` | PQ-10 |
| `src/app/(admin)/admin/carreras/carreras-ui.tsx` | PQ-10 |
| `src/app/(admin)/admin/competencias/page.tsx` | PQ-10 |
| `src/app/(admin)/admin/competencias/competencias-ui.tsx` | PQ-10 |
| `src/app/(admin)/admin/idiomas/page.tsx` | PQ-10 |
| `src/app/(admin)/admin/idiomas/idiomas-ui.tsx` | PQ-10 |
| `src/app/(admin)/admin/sectores/page.tsx` | PQ-10 |
| `src/app/(admin)/admin/sectores/sectores-ui.tsx` | PQ-10 |
| `src/app/(admin)/admin/ubicaciones/page.tsx` | PQ-10 |
| `src/app/(admin)/admin/ubicaciones/ubicaciones-ui.tsx` | PQ-10 |
| `src/app/(admin)/admin/preguntas/page.tsx` | PQ-10 |
| `src/app/(admin)/admin/preguntas/preguntas-ui.tsx` | PQ-10 |
| `src/modules/admin/sessions.ts` | PQ-11 |
| `src/app/(admin)/admin/postulantes/page.tsx` | PQ-11 |
| `src/app/(admin)/admin/empresas/page.tsx` | PQ-11 |
| `src/app/(admin)/admin/empresas/config-inactividad.tsx` | PQ-11 |
| `src/app/(admin)/admin/feedback/page.tsx` | PQ-11 |
| `src/app/(admin)/admin/feedback/config-reactivacion.tsx` | PQ-11 |
| `src/app/(admin)/admin/informes/page.tsx` | PQ-11 |
| `src/app/(admin)/admin/tyc/tyc-ui.tsx` | PQ-11 |
| `src/app/(acceso)/iniciar-sesion/iniciar-sesion-form.tsx` | PQ-12 |
| `src/app/(acceso)/registro/registro-form.tsx` | PQ-12 |
| `src/app/(acceso)/verificar/verify-form.tsx` | PQ-12 |
| `src/app/(acceso)/verificar/[id]/page.tsx` | PQ-12 |
| `src/app/(acceso)/recuperar-password/recuperar-form.tsx` | PQ-12 |
| `src/app/(acceso)/recuperar-password/nueva/nueva-password-form.tsx` | PQ-12 |
| `src/components/shared/cambiar-password-form.tsx` | PQ-12 |
| `src/components/shared/brand-logo.tsx` | PQ-12 |
| `src/modules/auth/actions.ts` | PQ-12 |
| `docs/legal/terminos_y_condiciones.md` (nuevo) | PQ-12 |
| `src/lib/env.ts` (nuevo) | PQ-13 |
| `src/lib/logger.ts` (nuevo) | PQ-13 |
| `src/proxy.ts` | PQ-13 |
| `src/app/error.tsx` | PQ-13 |
| `src/app/global-error.tsx` | PQ-13 |
| `supabase/migrations/20261102020000_rls_advisors.sql` (nuevo) | PQ-14 |
| `src/lib/types/database.types.ts` | PQ-01 |
| `src/lib/types/database.types.ts` | PQ-02 |
| `src/lib/types/database.types.ts` | PQ-09 |
| `src/lib/types/database.types.ts` | PQ-14 |
| `eslint.config.mjs` | PQ-15 |
| `QA_PLAN.md` | PQ-15 |
| `.github/workflows/ci.yml` (nuevo) | PQ-15 |
| `src/app/robots.ts` (nuevo) | PQ-15 |
| `src/app/(admin)/layout.tsx` | PQ-15 |
| `src/app/(postulante)/layout.tsx` | PQ-15 |
| `src/app/(reclutador)/layout.tsx` | PQ-15 |
| `docs/runbooks/rollback.md` (nuevo) | PQ-15 |
| `docs/runbooks/supabase-auth-config.md` (nuevo) | PQ-15 |

---

## Excepciones

- **`src/lib/types/database.types.ts`:** Se regenera en la Etapa B (`PQ-01`, `PQ-02`, migraciones de `H-202`, `H-205`, `H-207`, `H-302` y `PQ-14`).
  - *Justificación técnica:* Este archivo es un artefacto derivado y generado automáticamente mediante `supabase gen types typescript` de Supabase CLI. Cada vez que se aplican migraciones DDL/DML sobre staging, se regenera para mantener sincronizadas las definiciones de tipos de TypeScript con el esquema real de PostgreSQL.
- **`src/modules/perfil-tecnico/actions.ts`:** Se modifica en la Etapa A (bloque A3) y se vuelve a modificar en la Etapa B.
  - *Justificación técnica:* En el bloque A3 se resuelven firmas de retorno canónicas, helpers y validaciones de tipos; en la Etapa B se modifica para pasar las mutaciones de `createAdminClient` a cliente autenticado con RLS ([H-100](hallazgos.md)) y para conectar el flujo de guardado con la nueva tabla `competencia_sugerida` ([H-205](hallazgos.md)) una vez creada la migración en base.
- **`src/modules/postulantes/actions.ts`:** Se modifica en la Etapa A (bloque A5) y se vuelve a modificar en la Etapa B.
  - *Justificación técnica:* En el bloque A5 se corrige la revalidación de rutas dependientes ([H-102](hallazgos.md)) y se aplica validación Zod de longitud máxima de 2.000 caracteres en notas ([H-228](hallazgos.md)); en la Etapa B se modifica para migrar la inserción de `nota_privada` de service role a cliente autenticado del reclutador con RLS ([H-119](hallazgos.md)).
- **Archivos de puestos e IA por H-202 (`src/modules/puestos/actions.ts`, `src/modules/puestos/queries.ts`, `src/modules/asistente/actions.ts`, `src/modules/seleccion/service.ts`):** Se modifican en la Etapa A (bloque A4) y se vuelven a modificar en la Etapa B.
  - *Justificación técnica:* En el bloque A4 se resuelven bugs de ciclo de vida ([H-103](hallazgos.md), [H-204](hallazgos.md), [H-210](hallazgos.md)), sanitización de prompts anti-inyección ([H-220](hallazgos.md)), rate limiting ([H-221](hallazgos.md)) y timeouts con reintentos ([H-227](hallazgos.md)); en la Etapa B se modifican sus lecturas y mutaciones para apuntar a la tabla dedicada `puesto_criterio_psicologico` ([H-202](hallazgos.md)) una vez que dicha tabla y sus datos hayan sido aprovisionados en base.
- **`src/modules/eneagrama/actions.ts`:** Se modifica en la Etapa A (bloque A3) y se vuelve a modificar en la Etapa B.
  - *Justificación técnica:* En el bloque A3 se incorpora la validación de ventana temporal de 6 meses de `evaluarRehacer` ([H-209](hallazgos.md)); en la Etapa B se modifica para invocar la nueva función transaccional de PostgreSQL que persiste atómicamente los resultados del test ([H-207](hallazgos.md)).
- **`src/modules/auth/actions.ts`:** Se modifica en la Etapa A (bloque A7) y se vuelve a modificar en la Etapa B.
  - *Justificación técnica:* En el bloque A7 se integran schemas unificados y manejo de estados; en la Etapa B se implementan las Server Actions de consentimiento explícito, derecho de supresión de cuenta y exportación de datos en formato portable conforme a la Ley 25.326 ([H-302](hallazgos.md)).
- **`src/components/shared/cambiar-password-form.tsx`:** Pasa del bloque A7 al bloque A3a.
  - *Justificación técnica:* Se unifica junto con `src/modules/perfil/actions.ts` en el bloque A3a para adoptar atómicamente el schema canónico `nuevaPasswordSchema` ([H-109](hallazgos.md)), garantizando que los nombres de los campos de entrada (`password`, `confirmPassword`) coincidan con la Server Action y los errores por campo se muestren correctamente.
- **Excepciones incorporadas en el bloque A4:**
  - `src/modules/empresas/actions.ts`: Cascada de baja de empresa asegurando la verificación de errores en cada mutación previa a la baja lógica de la empresa ([H-210](hallazgos.md)).
  - `src/modules/seleccion/prompts.ts`: La función `formatearCandidato` es compartida por el asistente y el módulo de selección; se encapsulan los datos en tags `<datos_candidato>` y se sanitizan directivas libres ([H-220](hallazgos.md)).
  - `src/app/(reclutador)/reclutador/onboarding/page.tsx`: Migración del segundo `h1` al componente estándar `PageHeader` ([H-113](hallazgos.md)).
  - `src/components/ui/page-header.tsx`: Adición de la prop opcional `icon` para soportar encabezados estándar con íconos decorativos ([H-113](hallazgos.md)).
  - `src/app/(reclutador)/reclutador/puestos/puesto-acciones.tsx`: Consumidor cliente del modal de acciones de puesto adaptado al retorno de `ActionResult<T>` ([H-105](hallazgos.md)).
  - `src/lib/ai/port.ts`: Opción `timeoutMs` en `GenerateOptions` y categoría de error `'tiempo_agotado'` en `AIErrorKind` ([H-227](hallazgos.md)).
  - `src/lib/ai/errores.ts`: Mensaje para el usuario de `'tiempo_agotado'` en `MENSAJE_POR_ERROR`. Sin esa entrada, un timeout en el informe o el certificado mostraba un motivo vacío ([H-227](hallazgos.md)).
  - `src/modules/asistente/cuota.ts`: Regla pura de la cuota del asistente. Va fuera de `actions.ts` porque todo lo que exporta un archivo `'use server'` queda publicado como server action ([H-221](hallazgos.md)).
  - Tests unitarios nuevos y adaptados: `src/modules/puestos/actions.test.ts`, `src/modules/asistente/actions.test.ts`, `src/modules/asistente/prompts.test.ts`, `src/lib/ai/adapters/gemini.test.ts`, `src/modules/seleccion/service.test.ts` y `src/modules/seleccion/prompts.test.ts`.
- **Excepciones incorporadas en el bloque A5:**
  - `src/components/shared/marca-postulacion.tsx`: Tope compartido del motivo de descarte consumiendo `MAX_MOTIVO_NO_AVANZAR` ([H-228](hallazgos.md)).
  - `src/app/(reclutador)/reclutador/postulaciones/ver-perfil-btn.tsx` y `src/app/(reclutador)/reclutador/postulaciones/revertir-descarte-btn.tsx`: Captura del retorno `result` y renderizado de alerta de error en caso de fallo ([H-203](hallazgos.md)).
  - `src/app/(reclutador)/reclutador/notas/eliminar-nota-btn.tsx`: Botón compartido consumiendo `NotaIconButton` para no alterar estilos ni padding con `Button` ([H-118](hallazgos.md)).
  - `src/modules/postulaciones/transiciones.ts` (nuevo) y sus tests `src/modules/postulaciones/transiciones.test.ts`: Reglas puras de orígenes válidos para transiciones de estado de postulación ([H-203](hallazgos.md), [H-214](hallazgos.md)).
  - `src/modules/postulantes/schema.ts` (nuevo) y sus tests `src/modules/postulantes/schema.test.ts`: Schemas Zod y topes máximos de notas y motivos ([H-228](hallazgos.md)).
  - `src/modules/postulantes/actions.test.ts` (nuevo): Tests unitarios de revalidación y topes de notas privadas ([H-102](hallazgos.md), [H-228](hallazgos.md)).
- **Excepciones incorporadas en el bloque A6:**
  - `src/modules/visibilidad/regla.ts` (nuevo) y su test `src/modules/visibilidad/regla.test.ts`: Regla pura común de evaluación de requisitos de visibilidad entre postulante ([H-208](hallazgos.md)) y admin ([H-215](hallazgos.md)).
  - `src/modules/visibilidad/actions.ts`: Pasa a usar la regla pura común de visibilidad ([H-215](hallazgos.md)).
  - `src/modules/admin/queries.ts` y su test `src/modules/admin/queries.test.ts`: Consulta canónica `getRequisitosVisibilidadPostulante` con cliente admin para evaluar visibilidad de postulante por id sin depender de RLS de usuario ([H-215](hallazgos.md)).
  - `src/app/(admin)/admin/postulantes/postulantes-acciones.tsx`: Visualización de error `result.error` ante fallos de reactivación o desactivación ([H-215](hallazgos.md)).
  - `src/modules/ubicacion/actions.ts` y su test `src/modules/ubicacion/actions.test.ts`: Atajar errores en cascada devolviendo array vacío para no romper los selectores ([H-216](hallazgos.md)).
  - `src/app/(reclutador)/reclutador/postulantes/page.tsx`: Unificación de etiqueta de ubicación con `ubicacionLabel` conservando el emoji `📍` ([H-116](hallazgos.md)).
- **Excepciones incorporadas en el bloque A7:**
  - `src/instrumentation.ts` (nuevo): Valida el entorno al arrancar el servidor en runtime nodejs fuera de build ([H-303](hallazgos.md)).
  - `src/lib/supabase/server.ts`, `src/lib/supabase/server-admin.ts`, `src/lib/ai/adapters/gemini.ts`, `src/modules/postulaciones/actions.ts`: Leen las variables de entorno validadas a través de `getEnvServidor()` ([H-303](hallazgos.md)).
  - `src/modules/postulantes/queries.ts`: Pasa a consumir `isUuid` canónico eliminando regex local ([H-108](hallazgos.md)).
  - `src/lib/types/domain.ts`: Tipado de `INITIAL_ACTION_STATE` como variante de error `{ success: false; error: string }` para compatibilidad directa con `ActionResult<T>` ([H-112](hallazgos.md)).
  - `src/components/shared/use-form-accion.ts`: Remoción del casteo `as ActionResult<T>` innecesario tras H-112 ([H-112](hallazgos.md)).
  - `src/modules/puestos/actions.ts`, `src/modules/postulantes/actions.ts`, `src/modules/admin/actions.ts`, `src/modules/admin/sessions.ts`: Emisión de logs de auditoría estructurados `logAuditoria` en mutaciones críticas ([H-306](hallazgos.md)).
  - `src/lib/env.test.ts`, `src/lib/logger.test.ts`: Tests unitarios de validación de entorno y formato/sanitización de logs de auditoría y error.
  - `src/lib/api-auth.ts` (nuevo) y su test `src/lib/api-auth.test.ts`: Autorización común `autorizarAdmin` para rutas de API basada en `getSessionUser()` ([H-104](hallazgos.md)).
  - `src/app/api/admin/feedback/export/route.ts`: Unificación de autorización con `autorizarAdmin` manteniendo texto plano para descarga en navegador ([H-104](hallazgos.md)).
  - Tests unitarios nuevos: `src/modules/admin/schema.test.ts`, `src/modules/admin/sessions.test.ts`, `src/modules/admin/visibilidad-postulante.test.ts`, `src/modules/carreras/queries.test.ts`, `src/modules/ubicacion/queries.test.ts`.
