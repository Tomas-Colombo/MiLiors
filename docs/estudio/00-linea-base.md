# Línea Base (Fase 0)

## Resumen Ejecutivo
Se estableció la línea base del proyecto MiLiors previa a la fase de estudio y refactorización. La suite de TypeScript (`tsc --noEmit`), las pruebas unitarias (`vitest run`, 281 tests) y la compilación productiva (`next build`, 51 páginas generadas) pasaron con exit code 0. `npm run lint` finalizó sin errores pero con 372 warnings en scripts auxiliares de skills en `.agents/` ([H-004](hallazgos.md)), con 0 warnings sobre el código fuente de la app. En `e2e/fixtures/auth.ts` se detectaron credenciales productivas en texto plano en un repo público e historial de git ([H-001](hallazgos.md)) y se constató que los specs E2E escriben sobre la base compartida ([H-002](hallazgos.md)). En `QA_PLAN.md` hay 136 casos pendientes (77 críticos 🔴 sin aprobar, con duplicación de IDs `TC-PERF-*` registrada en [H-005](hallazgos.md)) y 22 aprobados. En Supabase la base no posee tabla de migraciones ([H-006](hallazgos.md)), el muestreo manual no arrojó drift, RLS está activo y los advisors señalaron protección de passwords desactivada ([H-007](hallazgos.md)), RPC pública evaluable ([H-008](hallazgos.md)) y optimizaciones de RLS pendientes ([H-009](hallazgos.md), [H-010](hallazgos.md)).

---

## 1. Diagnóstico de Comandos

### Verificación previa de seguridad para pruebas unitarias
Antes de ejecutar `npm test`, se auditó [vitest.config.ts](file:///c:/Archivos%20de%20trabajo/MiLiors/vitest.config.ts) y todos los archivos `*.test.ts` en `src/`:
- `vitest.config.ts` excluye explícitamente `e2e/**` y `.claude/**`.
- Los módulos que interactúan con Supabase (`claims.test.ts`, `buscar-postulantes.test.ts`, `queries.test.ts`, `service.test.ts`) utilizan mocks locales (`vi.mock` y clientes simulados).
- Ningún test unitario realiza llamadas de red ni interactúa con la base de datos real de Supabase.

### Resultados de Ejecución

| Comando | Exit Code | Duración aprox. | Errores | Warnings | Estado |
| --- | --- | --- | --- | --- | --- |
| `npx tsc --noEmit` | `0` | ~4.0 s (3957 ms) | 0 | 0 | ✅ Limpio |
| `npm run lint` | `0` | ~46.7 s (46708 ms) | 0 | 372 | ⚠️ Warnings externos en `.agents/` ([H-004](hallazgos.md)) |
| `npm test` | `0` | ~8.3 s (8313 ms) | 0 | 0 | ✅ 32 suites, 281 tests pasaron |
| `npm run build` | `0` | ~104.8 s (local) | 0 | 0 | ✅ Compiló exitosamente (51 páginas; verificado por revisor).* |

*\* Nota sobre `npm run build`: En el entorno local de sandbox sin acceso a internet falló inicialmente al intentar descargar Google Fonts; el revisor ejecutó la compilación en un entorno con red verificando exit code 0 ("Compiled successfully", 51 páginas generadas). Hallazgo inicial [H-003](hallazgos.md) descartado.*

### Detalle de Errores y Warnings por Tipo

#### `npm run lint` (0 errores, 372 warnings)
Todos los warnings provienen de scripts de soporte de vendor y skills ubicados fuera del código de la aplicación. Correr `eslint src e2e test` produce exactamente **0 warnings** (verificado por el revisor):
1. **`@typescript-eslint/no-unused-vars` (15 warnings):**
   - `.agents/skills/impeccable/scripts/live-browser.js:292` ('cssId' is assigned a value but never used)
   - `.agents/skills/impeccable/scripts/live-browser.js:1368` ('configureModifierPillStyle' is defined but never used)
   - `.agents/skills/impeccable/scripts/live-browser.js:1415` ('bindConfigureModifierPillHover' is defined but never used)
2. **`@typescript-eslint/no-unused-expressions` (357 warnings):**
   - `.agents/skills/impeccable/scripts/modern-screenshot.umd.js:1:16` (Expected an assignment or function call and instead saw an expression)
   - `.agents/skills/impeccable/scripts/modern-screenshot.umd.js:1:597` (Expected an assignment or function call and instead saw an expression)
   - `.agents/skills/impeccable/scripts/modern-screenshot.umd.js:1:647` (Expected an assignment or function call and instead saw an expression)

---

## 2. Tamaño de Bundles por Ruta (`next build`)

- **Estado:** No disponible desde `next build`.
- **Causa técnica:** Next.js 16.2.9 ya no imprime el tamaño de bundles por ruta en la salida estándar de `next build`, ni siquiera cuando la compilación se completa exitosamente.
- **Pendiente:** Evaluar a futuro la integración de una herramienta específica de medición o análisis de bundles (como `@next/bundle-analyzer` u otra alternativa), sin instalar nada por el momento para respetar el congelamiento de dependencias.

---

## 3. Inventario de E2E (Playwright) — Sin Ejecución

Conforme a las reglas duras, no se ejecutó `npm run test:e2e` para prevenir la alteración de la base de producción compartida. Se analizaron estáticamente los 6 archivos de especificación y sus fixtures.

### Fixtures y Autenticación
- [e2e/fixtures/auth.ts](file:///c:/Archivos%20de%20trabajo/MiLiors/e2e/fixtures/auth.ts#L3-L19): Declara credenciales fijas para los roles `postulante`, `reclutador` y `admin` en texto plano.
- **Gravedad de seguridad:** El repositorio de GitHub es público (verificado por el revisor) y el archivo se encuentra en el historial de Git desde el commit `84d84f9`. Por ende, eliminar el archivo no es suficiente: es crítico rotar de inmediato las contraseñas comprometidas. Registrado en [H-001](hallazgos.md).

### Tabla de Especificaciones E2E

| Archivo Spec | Flujo que cubre | ¿Escribe en BD? | Evidencia (Archivo:Línea) | Cuentas que usa |
| --- | --- | :---: | --- | --- |
| [e2e/auth.spec.ts](file:///c:/Archivos%20de%20trabajo/MiLiors/e2e/auth.spec.ts) | Login, validaciones de login/registro, protección de rutas, recuperación de contraseña y registro de postulante. | **Sí** | [e2e/auth.spec.ts:133](file:///c:/Archivos%20de%20trabajo/MiLiors/e2e/auth.spec.ts#L133) (`click` en 'Crear cuenta' inserta usuario en `auth.users` y `perfil`). | `postulante`, `reclutador`, `admin`, y cuenta dinámica `@mailinator.com`. |
| [e2e/filtros-memoria.spec.ts](file:///c:/Archivos%20de%20trabajo/MiLiors/e2e/filtros-memoria.spec.ts) | Persistencia y restauración de filtros en query string al navegar por sidebar y detalle de candidato. | **No** | Navegación de lectura y manipulación de URL/sessionStorage sin mutaciones. | `reclutador`. |
| [e2e/notas.spec.ts](file:///c:/Archivos%20de%20trabajo/MiLiors/e2e/notas.spec.ts) | CRUD completo de notas privadas de candidatos y verificación de visibilidad/RLS. | **Sí** | [e2e/notas.spec.ts:36](file:///c:/Archivos%20de%20trabajo/MiLiors/e2e/notas.spec.ts#L36) (crea nota), [e2e/notas.spec.ts:62](file:///c:/Archivos%20de%20trabajo/MiLiors/e2e/notas.spec.ts#L62) (edita nota), [e2e/notas.spec.ts:87](file:///c:/Archivos%20de%20trabajo/MiLiors/e2e/notas.spec.ts#L87) (elimina nota). | `reclutador`, `postulante`. |
| [e2e/onboarding.spec.ts](file:///c:/Archivos%20de%20trabajo/MiLiors/e2e/onboarding.spec.ts) | Validaciones de formularios de onboarding (reclutador/postulante) y flujo completo de registro + TyC + creación de empresa. | **Sí** | [e2e/onboarding.spec.ts:99](file:///c:/Archivos%20de%20trabajo/MiLiors/e2e/onboarding.spec.ts#L99) (crea usuario), [e2e/onboarding.spec.ts:107](file:///c:/Archivos%20de%20trabajo/MiLiors/e2e/onboarding.spec.ts#L107) (acepta TyC), [e2e/onboarding.spec.ts:122](file:///c:/Archivos%20de%20trabajo/MiLiors/e2e/onboarding.spec.ts#L122) (crea y asocia empresa). | `reclutador`, `postulante`, y cuenta dinámica `@mailinator.com`. |
| [e2e/postulaciones.spec.ts](file:///c:/Archivos%20de%20trabajo/MiLiors/e2e/postulaciones.spec.ts) | Publicación de puesto activo, postulación de candidato, idempotencia y avance de estados (`ENVIADA` → `VISTO` → `PROCESO_FINALIZADO`). | **Sí** | [e2e/postulaciones.spec.ts:19](file:///c:/Archivos%20de%20trabajo/MiLiors/e2e/postulaciones.spec.ts#L19) (publica puesto), [e2e/postulaciones.spec.ts:60](file:///c:/Archivos%20de%20trabajo/MiLiors/e2e/postulaciones.spec.ts#L60) (postula candidato), [e2e/postulaciones.spec.ts:124](file:///c:/Archivos%20de%20trabajo/MiLiors/e2e/postulaciones.spec.ts#L124) y [148](file:///c:/Archivos%20de%20trabajo/MiLiors/e2e/postulaciones.spec.ts#L148) (muta estados). | `reclutador`, `postulante`. |
| [e2e/puestos.spec.ts](file:///c:/Archivos%20de%20trabajo/MiLiors/e2e/puestos.spec.ts) | Creación, validaciones, edición de puesto, ciclo de pausa/reactivación y aislamiento de campos confidenciales. | **Sí** | [e2e/puestos.spec.ts:38](file:///c:/Archivos%20de%20trabajo/MiLiors/e2e/puestos.spec.ts#L38) (inserta puesto), [e2e/puestos.spec.ts:72](file:///c:/Archivos%20de%20trabajo/MiLiors/e2e/puestos.spec.ts#L72) (actualiza), [e2e/puestos.spec.ts:92](file:///c:/Archivos%20de%20trabajo/MiLiors/e2e/puestos.spec.ts#L92) y [112](file:///c:/Archivos%20de%20trabajo/MiLiors/e2e/puestos.spec.ts#L112) (pausa/reactiva). | `reclutador`, `postulante`. |

Referencia de riesgo de escritura en producción: [H-002](hallazgos.md).

---

## 4. Estado de QA_PLAN.md

### Conteo General de Casos de Prueba

| Métrica | Cantidad | Porcentaje |
| --- | --- | --- |
| **Casos Totales Definidos** | **158** | 100% |
| ⬜ Casos Pendientes | 136 | 86.1% |
| ✅ Casos Aprobados | 22 | 13.9% |
| ❌ Casos Fallidos | 0 | 0% |
| *Checklist adicional (Smoke Test en tabla de cierre)* | *20 ítems sin columna de estado* | - |

### Casos Críticos (🔴) que Siguen Pendientes (⬜) — Total: 77

1. `TC-AUTH-002` (🔴): Registro exitoso como POSTULANTE → redirige a /postulante/onboarding
2. `TC-AUTH-003` (🔴): Registro con email ya existente → error
3. `TC-AUTH-010` (🔴): Login POSTULANTE → redirige a /postulante
4. `TC-AUTH-011` (🔴): Login ADMIN → redirige a /admin
5. `TC-AUTH-014` (🔴): Logout → sesión destruida, redirige a /iniciar-sesion
6. `TC-AUTH-015` (🔴): Post-logout, botón atrás del browser → no accede a páginas protegidas
7. `TC-AUTH-017` (🔴): Recuperar password con email no registrado → misma respuesta (no revela existencia)
8. `TC-AUTH-018` (🔴): Acceso directo a /reclutador sin sesión → redirige a /iniciar-sesion
9. `TC-AUTH-019` (🔴): POSTULANTE intenta acceder a /reclutador → prohibido
10. `TC-AUTH-020` (🔴): RECLUTADOR intenta acceder a /admin → prohibido
11. `TC-AUTH-023` (🔴 🔒): Admin revoca una sesión → el usuario es deslogueado en ≤ 60 s
12. `TC-ONB-POS-002` (🔴): nombre_completo vacío → error
13. `TC-EMP-003` (🔴): ⚠️ [PRÓXIMO] Subir logo — imagen válida (PNG/JPG) → guardado y visible
14. `TC-EMP-004` (🔴): ⚠️ [PRÓXIMO] Subir logo — archivo no imagen → error
15. `TC-PUE-002` (🔴): Crear puesto sin titulo_puesto → error
16. `TC-PUE-007` (🔴): Puesto activo aparece en /postulante/puestos
17. `TC-PUE-008` (🔴 🔒): perfil_psicologico_deseado NO aparece en vista del candidato
18. `TC-PUE-009` (🔴 🔒): perfil_psicologico_deseado NO aparece en ninguna respuesta de API pública
19. `TC-PUE-011` (🔴 🔒): Editar puesto ajeno → prohibido
20. `TC-PUE-012` (🔴): Cerrar puesto → activo=false, desaparece de /postulante/puestos
21. `TC-PUE-013` (🔴): Cerrar puesto → postulaciones ENVIADA y VISTO pasan a CERRADA
22. `TC-POST-006` (🔴): Al pasar a VISTO → candidato recibe email de notificación
23. `TC-POST-008` (🔴): Al pasar a PROCESO_FINALIZADO → candidato recibe email
24. `TC-POST-010` (🔴 🔒): Reclutador no ve postulaciones de puestos ajenos
25. `TC-CAND-001` (🔴): Solo aparecen candidatos con perfil_en_busqueda=true
26. `TC-CAND-004` (🔴): Contacto visible si perfil_en_busqueda=true
27. `TC-CAND-005` (🔴): Contacto visible si candidato aplicó a puesto del reclutador (aunque tenga toggle OFF)
28. `TC-CAND-006` (🔴 🔒): Contacto OCULTO si toggle OFF y no aplicó a ningún puesto del reclutador
29. `TC-CAND-007` (🔴): Informe visible en perfil si toggle ON e informe=LISTO
30. `TC-CAND-008` (🔴 🔒): Informe OCULTO si toggle OFF
31. `TC-NOTA-001` (🔴): Crear nota sobre candidato → guardada
32. `TC-NOTA-005` (🔴 🔒): Nota de Reclutador A no visible para Reclutador B
33. `TC-NOTA-006` (🔴 🔒): Candidato NO puede ver sus propias notas
34. `TC-FAV-001` (🔴): ⚠️ [PRÓXIMO] Marcar candidato como favorito → aparece marcado
35. `TC-FAV-002` (🔴): ⚠️ [PRÓXIMO] Desmarcar favorito → marcador desaparece
36. `TC-FAV-003` (🔴 🔒): ⚠️ [PRÓXIMO] Favorito de Reclutador A no aparece marcado para Reclutador B
37. `TC-ENE-001` (🔴): Iniciar test → preguntas cargadas correctamente
38. `TC-ENE-002` (🔴): Responder todas las preguntas → puede calcular resultado
39. `TC-ENE-003` (🔴): Calcular con preguntas sin responder → error o bloqueo
40. `TC-ENE-005` (🔴): Calcular → eneatipo asignado y visible en dashboard
41. `TC-ENE-006` (🔴): Calcular → informe_personalidad creado con estado PENDIENTE
42. `TC-ENE-008` (🔴 🔒): Guardar respuesta en el test de otro usuario → rechazado por RLS
43. `TC-ENE-010` (🔴): Rehacer y completar → informe y certificado marcados desactualizados, sin regeneración automática
44. `TC-HD-001` (🔴): Guardar HD con todos los campos → guardado exitoso
45. `TC-HD-002` (🔴): Guardar HD → informe se resetea a PENDIENTE
46. `TC-INF-002` (🔴): Informe LISTO → candidato ve contenido completo
47. `TC-INF-003` (🔴): Informe ERROR → candidato ve opción de reintentar
48. `TC-INF-004` (🔴): Reintentar desde ERROR → vuelve a PENDIENTE y luego LISTO o ERROR
49. `TC-INF-005` (🔴): Informe LISTO visible para reclutador si toggle=ON
50. `TC-INF-006` (🔴 🔒): Informe NO visible para reclutador si toggle=OFF
51. `TC-INF-007` (🔴): Fallo de OpenAI → mensaje amigable, no expone error técnico
52. `TC-PERF-001` (🔴) *[Formación del Perfil — ID duplicado con ítem 75, ver H-005]*: Agregar formación con institución y título → guardado
53. `TC-PERF-005` (🔴): Agregar experiencia con fecha_fin nula (trabajo actual) → guardado
54. `TC-PERF-006` (🔴): fecha_fin < fecha_inicio → error
55. `TC-PERF-011` (🔴): Seleccionar hasta 15 competencias → guardadas
56. `TC-PERF-012` (🔴): Intentar seleccionar 16 competencias → bloqueado
57. `TC-VIS-001` (🔴): Toggle ON → candidato aparece en búsqueda de reclutadores
58. `TC-VIS-002` (🔴): Toggle OFF → candidato desaparece de búsqueda
59. `TC-VIS-003` (🔴 🔒): Toggle OFF → contacto e informe ocultos para reclutadores
60. `TC-CV-001` (🔴): ⚠️ [PRÓXIMO] Subir CV en PDF → guardado correctamente
61. `TC-CV-002` (🔴): ⚠️ [PRÓXIMO] Subir archivo que no sea documento → error
62. `TC-CV-004` (🔴): ⚠️ [PRÓXIMO] Reclutador descarga CV si tiene acceso al contacto
63. `TC-CV-005` (🔴 🔒): ⚠️ [PRÓXIMO] Reclutador NO descarga CV si no tiene acceso al contacto
64. `TC-CERT-001` (🔴): Generar certificado con informe=LISTO → PDF descargable
65. `TC-CERT-002` (🔴): Intentar generar con informe≠LISTO → bloqueado con mensaje
66. `TC-CERT-003` (🔴): PDF contiene nombre, eneatipo y timestamp
67. `TC-CERT-004` (🔴): PDF contiene QR funcional que apunta a /verificar/[id]
68. `TC-CERT-005` (🔴): /verificar/[id] accesible sin autenticación
69. `TC-IA-001` (🔴): Reclutador hace pregunta sobre candidato-puesto → respuesta coherente
70. `TC-IA-003` (🔴 🔒): Reclutador solo puede consultar puestos propios
71. `TC-IA-005` (🔴): Fallo de OpenAI → mensaje de error amigable, sin stack trace visible
72. `TC-ADM-002` (🔴): Crear sector → aparece en catálogo
73. `TC-ADM-006` (🔴): Desactivar candidato → desaparece de búsqueda
74. `TC-ADM-009` (🔴 🔒): No-ADMIN intenta acceder a /admin → prohibido
75. `TC-PERF-001` (🔴) *[Rendimiento/Performance — ID duplicado con ítem 52, ver H-005]*: Carga del inicio del postulante → 0 llamadas a `/auth/v1/user` y ≤ 2 `check_session` en logs
76. `TC-PERF-002` (🔴) *[Rendimiento/Performance — ID duplicado con línea 206 de QA_PLAN, ver H-005]*: Responder una pregunta del Eneagrama → 1 sola escritura, sin lecturas previas
77. `TC-PERF-003` (🔴) *[Rendimiento/Performance — ID duplicado con línea 207 de QA_PLAN, ver H-005]*: Prueba de carga: cohorte de N postulantes haciendo el test en simultáneo → p95 < 1 s, sin 5xx

---

## 5. Supabase (Migraciones y Advisors)

*Relevamiento de solo lectura provisto por el revisor (31/10/2026).*

### Historial de Migraciones y Drift
- **Historial ausente en base:** La base no tiene tabla de historial de migraciones (`supabase_migrations.schema_migrations` no existe). Las migraciones se aplicaron a mano a lo largo del tiempo, por lo que no es posible una comparación automática del repositorio contra la base de datos ([H-006](hallazgos.md)).
- **Muestreo manual (migraciones 20260821 a 20260924):**
  - Tablas verificadas existentes: `departamento`, `feedback_informe_seccion`, `informe_auditoria`, `informe_anexo`.
  - Columnas agregadas: existen las 10 columnas introducidas por dichas migraciones.
  - Funciones verificadas existentes: `usuario_rol_inmutable`, `usuario_sync_rol_metadata`, `sincronizar_provincia_postulante`, `sincronizar_departamento_puesto`.
  - Elementos eliminados correctamente confirmados: ya no existen `human_design`, `fecha_hora_nacimiento`, `codigo_qr_url` ni `url_archivo`.
  - **Resultado de la muestra:** No se detectó drift en el lote muestreado (se aclara que no constituye una comparación exhaustiva del 100% del esquema).
- **Inventario local de migraciones:** 47 archivos `.sql` registrados en [supabase/migrations/](file:///c:/Archivos%20de%20trabajo/MiLiors/supabase/migrations/) (ver lista completa al final de la sección).

### RLS y Estado de Usuarios
- **RLS:** Habilitado en el 100% de las tablas del esquema `public`.
- **Limpieza de datos E2E:** Existen **0 usuarios** con dominio `@mailinator.com` en `auth.users`, confirmando que no quedaron remanentes de datos de pruebas E2E previas en la base productiva.

### Advisors de Seguridad
1. `WARN auth_leaked_password_protection`: Desactivada en la configuración de Supabase Auth ([H-007](hallazgos.md)).
2. `WARN authenticated_security_definer_function_executable`: Reportado en `check_session`, `get_my_rol`, `reclutador_ve_postulante` y `touch_session_activity`. Es intencional y está documentado en [20261028000000_endurecer_funciones_security_definer.sql:16-19](file:///c:/Archivos%20de%20trabajo/MiLiors/supabase/migrations/20261028000000_endurecer_funciones_security_definer.sql#L16-L19). Registrado en [H-008](hallazgos.md) para auditar en Fase 3 si la RPC `reclutador_ve_postulante(uuid)` puede filtrar información entre usuarios autenticados.
3. `INFO rls_enabled_no_policy`: Presente en `configuracion_sistema`, `informe_anexo`, `informe_auditoria` y `sesion_actividad`.

### Advisors de Performance
- `WARN auth_rls_initplan` (71 alertas): Políticas RLS que evalúan `auth.uid()` o `get_my_rol()` por cada fila sin envolver en subquery escalar ([H-009](hallazgos.md)).
- `WARN multiple_permissive_policies` (16 alertas): Múltiples políticas permisivas concurrentes para el mismo rol y comando ([H-010](hallazgos.md)).
- `INFO unindexed_foreign_keys` (9 alertas).
- `INFO unused_index` (8 alertas).

#### Migraciones Locales en `supabase/migrations/` (47 archivos):
1. `001_initial_schema.sql`
2. `002_rls.sql`
3. `003_fix_rls_recursion_perfil_postulante.sql`
4. `004_testing_trim_eneagrama_to_5.sql`
5. `005_test_eneagrama_dominante.sql`
6. `20260623223348_add_baja_y_pausada_pregunta_eneagrama.sql`
7. `20260626000001_human_design_veces_guardado.sql`
8. `20260627000001_postulacion_favorito.sql`
9. `20260702000001_separar_cierre_de_baja_puesto.sql`
10. `20260709000001_formulario_preselector.sql`
11. `20260709000002_ubicacion_geografica.sql`
12. `20260713000001_carreras.sql`
13. `20260713000002_sintesis_certificado.sql`
14. `20260714000000_puesto_actividad_y_config.sql`
15. `20260714000001_cerrar_puestos_inactivos_funcion.sql`
16. `20260714000002_cron_cerrar_puestos_inactivos.sql`
17. `20260714000003_puesto_carrera.sql`
18. `20260715000000_sesion_actividad.sql`
19. `20260716000001_postulacion_ciclo.sql`
20. `20260716000002_fix_trigger_perfil_tecnico.sql`
21. `20260722000001_puesto_carrera_multiple.sql`
22. `20260722000002_idioma_catalogo.sql`
23. `20260810000001_curso.sql`
24. `20260810000002_feedback_informe.sql`
25. `20260810000003_representatividad_porcentaje.sql`
26. `20260810000004_feedback_reactivacion.sql`
27. `20260813000001_postulacion_marca.sql`
28. `20260814000001_eneagrama_veces_completado.sql`
29. `20260819000001_reclutador_multi_empresa.sql`
30. `20260821000001_competencia_nivel.sql`
31. `20260821000002_personalidad_publica.sql`
32. `20260824000001_departamento.sql`
33. `20260824000002_rol_no_editable.sql`
34. `20260826000001_perfil_postulante_provincia.sql`
35. `20260827000001_puesto_departamento.sql`
36. `20260828000001_certificado_pdf_reconciliar_drift.sql`
37. `20260828000002_certificado_pdf_sin_storage.sql`
38. `20260828000003_carreras_catalogo_base.sql`
39. `20260924000001_informe_eneagrama_reconciliar_drift.sql`
40. `20260924000002_eliminar_human_design.sql`
41. `20260924000003_feedback_informe_seccion.sql`
42. `20260924000004_perfil_nombre_preferido.sql`
43. `20260924000005_informe_auditoria.sql`
44. `20260924000006_informe_anexo.sql`
45. `20260924000007_restringir_escritura_informe_certificado.sql`
46. `20260924000008_perfil_fecha_nacimiento.sql`
47. `20261028000000_endurecer_funciones_security_definer.sql`
*(Excluidos seeds auxiliares: `seed.sql`, `seed_informe_mock.sql`, `seed_ubicacion.sql`).*
