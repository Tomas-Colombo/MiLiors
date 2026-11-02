# PLAN — Estudio del código, estandarización y revisión pre-deploy

- **Proyecto:** MiLiors
- **Fecha:** 30 de Octubre de 2026
- **Estado:** Borrador, pendiente de aprobación para arrancar
- **Ejecutor previsto:** un agente por fase, con este documento como brief

---

## 1. Objetivo

1. **Estandarizar:** que lo que se repite exista una sola vez (componente, helper, guard o schema canónico) y que cada pieza del código se modifique **una sola vez** durante la optimización.
2. **Encontrar bugs** antes de que los encuentre un usuario.
3. **Revisión pre-deploy:** confirmar que la aplicación está lista para producción (seguridad, datos, configuración, operación).

## 2. Principio rector: estudiar todo antes de tocar nada

Cambiar un componente tres veces pasa cuando se arregla por tema: primero la duplicación, después un bug y, por último, la seguridad. Para evitarlo:

- **Fases 1 a 4 son de solo lectura.** Producen hallazgos, no cambios.
- Todos los hallazgos van a **un único registro** (sección 9), indexado por archivo.
- En la **Fase 5** los hallazgos se agrupan por archivo o componente en **paquetes de trabajo**. Cada paquete resuelve de una vez la estandarización, los bugs y los ajustes pre-deploy de esos archivos.
- Primero se construyen las piezas canónicas y después se migran sus consumidores. Cada consumidor se migra una sola vez, con sus bugs incluidos.

## 3. Reglas para el agente ejecutor

- **La base de datos es compartida entre desarrollo y producción.** Durante el estudio está prohibido ejecutar migraciones, `INSERT`, `UPDATE`, `DELETE` o scripts de reset contra Supabase. Solo se permiten consultas de lectura y los advisors.
- Nada de refactors oportunistas durante el estudio: si algo se ve mal, se registra.
- Cada hallazgo lleva evidencia: `archivo:línea`, el fragmento relevante y un escenario concreto de falla (entrada → resultado incorrecto).
- Hay que diferenciar lo **confirmado** (verificado leyendo el código o reproduciéndolo) de lo **plausible** (sospecha que necesita prueba).
- Los artefactos generados (código, comentarios, nombres) siguen las convenciones existentes del proyecto.
- Next.js 16 tiene cambios incompatibles con versiones previas: ante cualquier duda de API se consulta `node_modules/next/dist/docs/`.
- Los entregables de cada fase van a `docs/estudio/` (ver sección 10).

## 4. Fase 0 — Línea base

**Meta:** saber de dónde partimos para poder medir lo que mejora o lo que se rompe.

- Ejecutar y registrar el resultado de:
  - `npx tsc --noEmit`
  - `npm run lint`
  - `npm test`
  - `npm run build`
  - `npx playwright test`
- Registrar el tamaño de los bundles por ruta (salida de `next build`).
- Estado del `QA_PLAN.md`: cuántos casos están en ⬜, ✅ y ❌, y cuáles son 🔴 sin aprobar.
- Supabase: `list_migrations` comparado con `supabase/migrations/` (¿hay migraciones aplicadas que no están en el repo, o al revés?) y `get_advisors` de seguridad y performance.

**Entregable:** `00-linea-base.md`.

## 5. Fase 1 — Mapa del sistema

**Meta:** un inventario que las demás fases usan como índice.

- Rutas por rol: `(acceso)`, `(postulante)`, `(reclutador)`, `(admin)` y `api/`. Para cada ruta: guard aplicado, queries y actions que usa, y si es server o client.
- Inventario de **server actions** y **route handlers**. Para cada uno: cómo verifica la sesión, cómo verifica la pertenencia y qué cliente usa (usuario/RLS o `service_role`).
- Tablas, políticas RLS y funciones `SECURITY DEFINER`.
- Máquinas de estado del dominio: estados de `postulacion`, ciclos de `puesto`/`historial_puesto`, onboarding, visibilidad del perfil y aceptación de TyC.
- Inventario de `src/components/ui` y `src/components/shared`: qué existe y quién lo usa.

**Entregable:** `01-mapa-del-sistema.md`.

## 6. Fase 2 — Estudio de duplicación y estandarización

**Meta:** detectar todo lo que se resuelve de más de una forma y definir **la forma canónica**.

Ejes a revisar:

| Eje | Qué buscar |
| --- | --- |
| UI | Tablas, listados con filtros/paginación, formularios, modales, estados vacíos, carga y error, badges de estado, headers de página. Componentes de `app/` que reimplementan algo que ya existe en `components/ui`. |
| Formularios | Manejo de `useActionState`, mensajes de error, validación en cliente vs servidor, estados de envío. |
| Acceso a datos | Patrón para "verificar sesión + pertenencia + elegir cliente". En el merge del 30/10 había dos variantes (RLS con el cliente del usuario vs `getPostulacionPropia` + admin): hay que unificar el criterio. |
| Resultados de actions | Uso consistente de `ActionResult`, mensajes de error y `revalidatePath`. |
| Validación | Schemas `zod` repetidos o validaciones manuales que duplican un schema. |
| Formato | Fechas, nombres, textos, normalización sin tildes, ubicación: helpers duplicados entre módulos. |
| Constantes | Estados, labels y enums definidos en más de un lugar. |
| Estilos | Clases y tokens repetidos que deberían salir de `DESIGN.md` o de un componente. |

Para cada grupo duplicado:
- Lista de todas las variantes, con `archivo:línea`.
- Diferencias reales entre variantes: ¿son intencionales o son deriva?
- Propuesta de pieza canónica: ubicación, API y qué variante absorbe.
- Lista de consumidores a migrar.
- Riesgo de la migración.

Criterio: se estandariza a partir de **3 o más** repeticiones, o con 2 si ya divergieron en comportamiento. No se abstrae lo que solo se parece en la forma.

**Entregable:** `02-duplicacion.md`.

## 7. Fase 3 — Caza de bugs

**Meta:** encontrar fallas de comportamiento, recorriendo **por rol** y **de forma transversal**.

**Por rol** (postulante, reclutador, admin): recorrer cada flujo del mapa de la Fase 1 contra el `QA_PLAN.md`. Prioridad para los casos 🔴 que todavía están ⬜.

**Transversal:**
- **Autorización:** toda action y route handler verifica sesión y pertenencia antes de leer o escribir. Prestar especial atención a todo uso de `createAdminClient` (ignora RLS). Hay que probar el acceso de un rol a datos de otro rol y de un reclutador a datos de otro reclutador.
- **Transiciones de estado:** transiciones inválidas, operaciones repetidas (doble click, reintentos), condiciones de carrera entre dos pestañas o dos reclutadores, y ciclos de puesto (reapertura, cierre automático).
- **Errores silenciosos:** `error` de Supabase ignorado, `catch` vacíos y `data ?? []` que esconden fallas.
- **Bordes:** listas vacías, `null` en relaciones, textos largos, tildes y mayúsculas en búsquedas, fechas y zona horaria (`-03:00`), paginación en el último elemento.
- **Caché y revalidación:** pantallas que quedan desactualizadas después de una action, `cache()` mal aplicado, revalidación durante el render.
- **Frontera cliente/servidor:** imports de `server-only` y secretos que podrían llegar al bundle, errores de hidratación.
- **IA (Gemini):** timeouts, respuestas malformadas, prompts con datos no saneados y costo por request.
- **PDF, Excel y email:** generación con datos incompletos y manejo de errores de Resend.

**Entregable:** `03-bugs.md`, con severidad por hallazgo (sección 9).

## 8. Fase 4 — Revisión pre-deploy

**Meta:** checklist de preparación para producción, con veredicto ✅/❌ y evidencia por ítem.

**Datos y base**
- [ ] **Separar la base de desarrollo de la de producción.** Hoy es la misma, y este es el riesgo más grande antes de salir.
- [ ] Las migraciones reconstruyen la base desde cero sin errores, y lo que está en el repo coincide con lo aplicado.
- [ ] Hay backups automáticos y un procedimiento de restauración probado una vez.
- [ ] Advisors de seguridad y performance de Supabase sin alertas críticas.
- [ ] RLS habilitado en todas las tablas expuestas.
- [ ] Funciones `SECURITY DEFINER` con `search_path` fijo y `EXECUTE` restringido.

**Configuración y secretos**
- [ ] Las variables de entorno (`SUPABASE_*`, `GEMINI_*`, `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL`, `EMAIL_POSTULACIONES_HABILITADO`) se validan al arrancar y la app falla rápido si falta alguna.
- [ ] La `service_role` key no aparece en código cliente ni en el bundle.
- [ ] Cada entorno tiene sus propias claves.

**Seguridad**
- [ ] Headers de seguridad (CSP, `X-Frame-Options`, `Referrer-Policy`) en `next.config.ts`.
- [ ] Rate limiting en login, registro, recupero de contraseña y endpoints de IA.
- [ ] Mensajes de error que no filtran detalles internos.
- [ ] Archivos subidos (si aplica): tipo, tamaño y bucket con políticas.

**Operación**
- [ ] Monitoreo de errores en producción. Hoy no hay ninguno: sin esto, los bugs en producción solo los vemos cuando alguien se queja.
- [ ] Logs útiles en actions críticas.
- [ ] Páginas `error`, `not-found` y `global-error` revisadas.
- [ ] Plan de rollback: cómo volver a la versión anterior de la app y de la base.
- [ ] Dominio y remitente de email verificados (SPF/DKIM) en Resend.

**Calidad y proceso**
- [ ] CI que corre `tsc`, `lint`, `test` y `build` en cada push o PR. Hoy no existe `.github/workflows`.
- [ ] Smoke test del `QA_PLAN.md` aprobado.
- [ ] `robots` y metadatos: las zonas privadas no se indexan.
- [ ] Accesibilidad básica (foco, labels, contraste) en los flujos principales.

**Datos personales**
- [ ] La app trata datos sensibles (tests de personalidad, perfiles, CV). Revisar consentimiento en TyC, quién puede ver qué, borrado de cuenta y exportación de datos, en línea con la Ley 25.326.

**Entregable:** `04-pre-deploy.md`.

## 9. Registro único de hallazgos

Todas las fases escriben en `docs/estudio/hallazgos.md` con este formato:

| ID | Tipo | Severidad | Estado | Archivos | Resumen | Propuesta | Paquete |
| --- | --- | --- | --- | --- | --- | --- | --- |
| H-001 | bug / duplicación / seguridad / pre-deploy | P0–P3 | confirmado / plausible | `ruta:línea` | una línea | una línea | se asigna en la Fase 5 |

- **P0:** pérdida o filtración de datos, acceso indebido, o algo que bloquea el deploy.
- **P1:** flujo principal roto o resultado incorrecto visible.
- **P2:** caso borde, inconsistencia o deuda que va a generar bugs.
- **P3:** mejora menor.

## 10. Fase 5 — Consolidación en paquetes de trabajo

**Meta:** convertir el registro en un plan de ejecución donde **cada archivo se toca una vez**.

1. Agrupar los hallazgos por archivo y por pieza canónica.
2. Armar paquetes de trabajo chicos, revisables y de menos de 400 líneas cada uno, en este orden:
   1. **P0 de seguridad y datos**, aislados: van primero y solos, porque no esperan a la estandarización.
   2. **Cimientos:** crear las piezas canónicas de la Fase 2 (componentes, guards, helpers, schemas), con sus tests.
   3. **Migración por zona** (postulante, reclutador, admin): cada paquete migra un grupo de consumidores a las piezas canónicas y resuelve en la misma pasada los bugs P1 a P3 de esos archivos.
   4. **Pre-deploy:** CI, monitoreo, headers, variables de entorno y separación de bases.
3. Para cada paquete: archivos, hallazgos que cierra, dependencias y cómo se verifica.

**Entregable:** `05-paquetes.md`, que debe aprobarse antes de escribir código.

## 11. Fase 6 — Ejecución y verificación

La Fase 6 se organiza en dos etapas estrictamente secuenciadas para aislar riesgos:
- **Etapa A (solo código, sin base de prueba):** Se ejecuta en la rama `fase-6/etapa-a`. Abarca los bloques A1 a A7 (preparación, cimientos, postulante, reclutador, admin, acceso y pre-deploy). Toda verificación se realiza en hermético (`tsc`, `lint`, `test` con mocks en memoria y `build`). Prohibido tocar la base de datos o ejecutar Playwright contra producción. Los cambios se acumulan en esta rama.
- **Etapa B (con staging, al final):** Se ejecuta una vez aprovisionado el proyecto Supabase de staging aislado. Abarca migraciones DDL/DML, endurecimiento de RLS, migración de clientes a RLS, nuevas tablas/funciones, optimizaciones de advisors, la suite E2E completa y la repetición de la Fase 0 contra la línea base antes del despliegue productivo.

Reglas operativas de ejecución:
- Un bloque/paquete por vez, con un único agente escritor.
- Antes de cada commit: `tsc`, `lint`, `test` y `build` en verde.
- Cada bug cerrado lleva un test que lo reproduce, cuando es posible.
- Se actualizan el estado en `hallazgos.md` y los casos correspondientes del `QA_PLAN.md`.
- Al terminar todos los paquetes y la Etapa B se repite la Fase 0 y se compara contra la línea base.

## 12. Estructura de entregables

```
docs/estudio/
  00-linea-base.md
  01-mapa-del-sistema.md
  02-duplicacion.md
  03-bugs.md
  04-pre-deploy.md
  05-paquetes.md
  hallazgos.md
```

## 13. Orden y dependencias

```
Fase 0 → Fase 1 → { Fase 2, Fase 3, Fase 4 } → Fase 5 → (aprobación) → Fase 6
```

Las fases 2, 3 y 4 pueden correr en paralelo porque son de solo lectura y comparten el mapa de la Fase 1. Tienen que escribir en el registro único sin pisarse; si corren en paralelo, cada una usa un rango de IDs propio.
