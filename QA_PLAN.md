# QA Plan — TalentID

> Leyenda: ⬜ Pendiente · ✅ Aprobado · ❌ Falló

---

## M01 — Autenticación

| ID | Caso | Pri | Estado |
|----|------|-----|--------|
| TC-AUTH-001 | Registro exitoso como RECLUTADOR → redirige a /reclutador/onboarding | 🔴 | ✅ |
| TC-AUTH-002 | Registro exitoso como POSTULANTE → redirige a /postulante/onboarding | 🔴 | ⬜ |
| TC-AUTH-003 | Registro con email ya existente → error | 🔴 | ⬜ |
| TC-AUTH-004 | Password sin mayúscula → error de validación | 🟡 | ✅ |
| TC-AUTH-005 | Password sin número → error de validación | 🟡 | ✅ |
| TC-AUTH-006 | Password < 8 chars → error | 🟡 | ⬜ |
| TC-AUTH-007 | Passwords no coinciden → error | 🟡 | ✅ |
| TC-AUTH-008 | Email con formato inválido → error | 🟡 | ✅ |
| TC-AUTH-009 | Login RECLUTADOR → redirige a /reclutador | 🔴 | ✅ |
| TC-AUTH-010 | Login POSTULANTE → redirige a /postulante | 🔴 | ⬜ |
| TC-AUTH-011 | Login ADMIN → redirige a /admin | 🔴 | ⬜ |
| TC-AUTH-012 | Login con password incorrecto → error genérico (no revela si el email existe) | 🔴 | ✅ |
| TC-AUTH-013 | Login con email no registrado → mismo mensaje que TC-AUTH-012 | 🔴 | ✅ |
| TC-AUTH-014 | Logout → sesión destruida, redirige a /login | 🔴 | ⬜ |
| TC-AUTH-015 | Post-logout, botón atrás del browser → no accede a páginas protegidas | 🔴 | ⬜ |
| TC-AUTH-016 | Recuperar password con email registrado → email enviado | 🟡 | ⬜ |
| TC-AUTH-017 | Recuperar password con email no registrado → misma respuesta (no revela existencia) | 🔴 | ⬜ |
| TC-AUTH-018 | Acceso directo a /reclutador sin sesión → redirige a /login | 🔴 | ⬜ |
| TC-AUTH-019 | POSTULANTE intenta acceder a /reclutador → prohibido | 🔴 | ⬜ |
| TC-AUTH-020 | RECLUTADOR intenta acceder a /admin → prohibido | 🔴 | ⬜ |
| TC-AUTH-021 | TyC Gate — usuario sin TyC aceptado ve modal bloqueante | 🔴 | ⬜ |
| TC-AUTH-022 | TyC Gate — aceptar TyC dos veces seguidas → sin error (idempotente) | 🟡 | ⬜ |

---

## M02 — Onboarding Reclutador

| ID | Caso | Pri | Estado |
|----|------|-----|--------|
| TC-ONB-REC-001 | Completar con solo nombre_empresa → redirige a /reclutador/puestos | 🔴 | ✅ |
| TC-ONB-REC-002 | Completar con todos los campos (nombre, descripción, URL) | 🟡 | ⬜ |
| TC-ONB-REC-003 | nombre_empresa < 2 chars → error | 🟡 | ⬜ |
| TC-ONB-REC-004 | descripcion > 1000 chars → error | 🟡 | ⬜ |
| TC-ONB-REC-005 | url_empresa con formato inválido → error | 🟡 | ⬜ |
| TC-ONB-REC-006 | url_empresa vacía → aceptada (opcional) | 🟢 | ✅ |
| TC-ONB-REC-007 | Reclutador con empresa ya creada accede a /onboarding → redirige al dashboard | 🟡 | ✅ |

---

## M03 — Onboarding Postulante

| ID | Caso | Pri | Estado |
|----|------|-----|--------|
| TC-ONB-POS-001 | Completar con solo nombre_completo → redirige a /postulante/eneagrama | 🔴 | ⬜ |
| TC-ONB-POS-002 | nombre_completo vacío → error | 🔴 | ⬜ |
| TC-ONB-POS-003 | enlace_linkedin con URL inválida → error | 🟡 | ⬜ |
| TC-ONB-POS-004 | portfolio con URL inválida → error | 🟡 | ⬜ |
| TC-ONB-POS-005 | especificidad_puesto > 200 chars → error | 🟡 | ⬜ |

---

## M04 — Empresa

| ID | Caso | Pri | Estado |
|----|------|-----|--------|
| TC-EMP-001 | Datos de empresa visibles en el perfil del reclutador | 🟡 | ⬜ |
| TC-EMP-002 | Admin ve listado de empresas con reclutadores asociados | 🟡 | ⬜ |
| TC-EMP-003 | ⚠️ [PRÓXIMO] Subir logo — imagen válida (PNG/JPG) → guardado y visible | 🔴 | ⬜ |
| TC-EMP-004 | ⚠️ [PRÓXIMO] Subir logo — archivo no imagen → error | 🔴 | ⬜ |
| TC-EMP-005 | ⚠️ [PRÓXIMO] Subir logo — imagen > límite de tamaño → error | 🟡 | ⬜ |
| TC-EMP-006 | ⚠️ [PRÓXIMO] Reemplazar logo existente → versión anterior reemplazada | 🟡 | ⬜ |

---

## M05 — Puestos de Trabajo

| ID | Caso | Pri | Estado |
|----|------|-----|--------|
| TC-PUE-001 | Crear puesto con todos los campos → aparece en /reclutador/puestos | 🔴 | ✅ |
| TC-PUE-002 | Crear puesto sin titulo_puesto → error | 🔴 | ⬜ |
| TC-PUE-003 | titulo_puesto < 3 chars → error | 🟡 | ⬜ |
| TC-PUE-004 | titulo_puesto > 200 chars → error | 🟡 | ⬜ |
| TC-PUE-005 | descripcion_texto > 3000 chars → error | 🟡 | ⬜ |
| TC-PUE-006 | perfil_psicologico_deseado > 2000 chars → error | 🟡 | ⬜ |
| TC-PUE-007 | Puesto activo aparece en /postulante/puestos | 🔴 | ⬜ |
| TC-PUE-008 | **perfil_psicologico_deseado NO aparece en vista del candidato** | 🔴 🔒 | ⬜ |
| TC-PUE-009 | **perfil_psicologico_deseado NO aparece en ninguna respuesta de API pública** | 🔴 🔒 | ⬜ |
| TC-PUE-010 | Editar puesto propio → cambios reflejados | 🔴 | ✅ |
| TC-PUE-011 | Editar puesto ajeno → prohibido | 🔴 🔒 | ⬜ |
| TC-PUE-012 | Cerrar puesto → activo=false, desaparece de /postulante/puestos | 🔴 | ⬜ |
| TC-PUE-013 | Cerrar puesto → postulaciones ENVIADA y VISTO pasan a CERRADA | 🔴 | ⬜ |
| TC-PUE-014 | Reactivar puesto → vuelve a aparecer en /postulante/puestos | 🔴 | ✅ |
| TC-PUE-015 | Filtrar por sector en vista candidato | 🟡 | ⬜ |
| TC-PUE-016 | Filtrar por carga_horaria en vista candidato | 🟡 | ⬜ |
| TC-PUE-017 | Filtrar por ubicacion en vista candidato | 🟡 | ⬜ |
| TC-PUE-018 | Búsqueda por texto en título → resultados correctos | 🟡 | ⬜ |
| TC-PUE-019 | Sin resultados de filtro → mensaje vacío, no error | 🟢 | ⬜ |

---

## M06 — Postulaciones

| ID | Caso | Pri | Estado |
|----|------|-----|--------|
| TC-POST-001 | Candidato postula a puesto activo → estado ENVIADA | 🔴 | ⬜ |
| TC-POST-002 | Candidato intenta postular dos veces → botón deshabilitado / error | 🔴 | ⬜ |
| TC-POST-003 | Candidato ve sus postulaciones en /postulante/postulaciones | 🔴 | ⬜ |
| TC-POST-004 | Candidato no puede cambiar ni retirar postulación | 🟡 | ⬜ |
| TC-POST-005 | Reclutador avanza estado ENVIADA → VISTO | 🔴 | ⬜ |
| TC-POST-006 | Al pasar a VISTO → candidato recibe email de notificación | 🔴 | ⬜ |
| TC-POST-007 | Reclutador avanza VISTO → PROCESO_FINALIZADO | 🔴 | ⬜ |
| TC-POST-008 | Al pasar a PROCESO_FINALIZADO → candidato recibe email | 🔴 | ⬜ |
| TC-POST-009 | Fallo de Resend (email) → postulación sigue avanzando igual | 🟡 | ⬜ |
| TC-POST-010 | Reclutador no ve postulaciones de puestos ajenos | 🔴 🔒 | ⬜ |

---

## M07 — Búsqueda y Perfil de Candidatos

| ID | Caso | Pri | Estado |
|----|------|-----|--------|
| TC-CAND-001 | Solo aparecen candidatos con perfil_en_busqueda=true | 🔴 | ⬜ |
| TC-CAND-002 | Buscar por nombre → resultados filtrados | 🟡 | ⬜ |
| TC-CAND-003 | Filtrar por competencia → resultados filtrados | 🟡 | ⬜ |
| TC-CAND-004 | Contacto visible si perfil_en_busqueda=true | 🔴 | ⬜ |
| TC-CAND-005 | Contacto visible si candidato aplicó a puesto del reclutador (aunque tenga toggle OFF) | 🔴 | ⬜ |
| TC-CAND-006 | **Contacto OCULTO si toggle OFF y no aplicó a ningún puesto del reclutador** | 🔴 🔒 | ⬜ |
| TC-CAND-007 | Informe visible en perfil si toggle ON e informe=LISTO | 🔴 | ⬜ |
| TC-CAND-008 | **Informe OCULTO si toggle OFF** | 🔴 🔒 | ⬜ |

---

## M08 — Notas Privadas

| ID | Caso | Pri | Estado |
|----|------|-----|--------|
| TC-NOTA-001 | Crear nota sobre candidato → guardada | 🔴 | ⬜ |
| TC-NOTA-002 | Crear nota asociada a un puesto → guardada con relación | 🟡 | ⬜ |
| TC-NOTA-003 | Editar nota existente → contenido actualizado | 🟡 | ⬜ |
| TC-NOTA-004 | Eliminar nota → desaparece | 🟡 | ⬜ |
| TC-NOTA-005 | **Nota de Reclutador A no visible para Reclutador B** | 🔴 🔒 | ⬜ |
| TC-NOTA-006 | **Candidato NO puede ver sus propias notas** | 🔴 🔒 | ⬜ |

---

## M09 — Favoritos ⚠️ PRÓXIMO

| ID | Caso | Pri | Estado |
|----|------|-----|--------|
| TC-FAV-001 | ⚠️ [PRÓXIMO] Marcar candidato como favorito → aparece marcado | 🔴 | ⬜ |
| TC-FAV-002 | ⚠️ [PRÓXIMO] Desmarcar favorito → marcador desaparece | 🔴 | ⬜ |
| TC-FAV-003 | ⚠️ [PRÓXIMO] Favorito de Reclutador A no aparece marcado para Reclutador B | 🔴 🔒 | ⬜ |
| TC-FAV-004 | ⚠️ [PRÓXIMO] Filtrar candidatos por favoritos | 🟡 | ⬜ |
| TC-FAV-005 | ⚠️ [PRÓXIMO] Favorito persiste entre sesiones | 🟡 | ⬜ |

---

## M10 — Test Eneagrama

| ID | Caso | Pri | Estado |
|----|------|-----|--------|
| TC-ENE-001 | Iniciar test → preguntas cargadas correctamente | 🔴 | ⬜ |
| TC-ENE-002 | Responder todas las preguntas → puede calcular resultado | 🔴 | ⬜ |
| TC-ENE-003 | Calcular con preguntas sin responder → error o bloqueo | 🔴 | ⬜ |
| TC-ENE-004 | Misma respuesta guardada dos veces → no duplica (idempotente) | 🟡 | ⬜ |
| TC-ENE-005 | Calcular → eneatipo asignado y visible en dashboard | 🔴 | ⬜ |
| TC-ENE-006 | Calcular → informe_personalidad creado con estado PENDIENTE | 🔴 | ⬜ |
| TC-ENE-007 | Reiniciar test → respuestas anteriores eliminadas | 🟡 | ⬜ |

---

## M11 — Human Design

| ID | Caso | Pri | Estado |
|----|------|-----|--------|
| TC-HD-001 | Guardar HD con todos los campos → guardado exitoso | 🔴 | ⬜ |
| TC-HD-002 | Guardar HD → informe se resetea a PENDIENTE | 🔴 | ⬜ |
| TC-HD-003 | Guardar HD con datos previos → actualiza (upsert, no duplica) | 🟡 | ⬜ |
| TC-HD-004 | Eliminar HD → registro borrado e informe se resetea | 🟡 | ⬜ |

---

## M12 — Informe de Personalidad

| ID | Caso | Pri | Estado |
|----|------|-----|--------|
| TC-INF-001 | Informe PENDIENTE → candidato ve indicador de espera | 🟡 | ⬜ |
| TC-INF-002 | Informe LISTO → candidato ve contenido completo | 🔴 | ⬜ |
| TC-INF-003 | Informe ERROR → candidato ve opción de reintentar | 🔴 | ⬜ |
| TC-INF-004 | Reintentar desde ERROR → vuelve a PENDIENTE y luego LISTO o ERROR | 🔴 | ⬜ |
| TC-INF-005 | Informe LISTO visible para reclutador si toggle=ON | 🔴 | ⬜ |
| TC-INF-006 | **Informe NO visible para reclutador si toggle=OFF** | 🔴 🔒 | ⬜ |
| TC-INF-007 | Fallo de OpenAI → mensaje amigable, no expone error técnico | 🔴 | ⬜ |

---

## M13 — Perfil Técnico

| ID | Caso | Pri | Estado |
|----|------|-----|--------|
| TC-PERF-001 | Agregar formación con institución y título → guardado | 🔴 | ⬜ |
| TC-PERF-002 | Formación sin institución o sin título → error | 🟡 | ⬜ |
| TC-PERF-003 | Editar formación → actualizado | 🟡 | ⬜ |
| TC-PERF-004 | Eliminar formación → desaparece | 🟡 | ⬜ |
| TC-PERF-005 | Agregar experiencia con fecha_fin nula (trabajo actual) → guardado | 🔴 | ⬜ |
| TC-PERF-006 | fecha_fin < fecha_inicio → error | 🔴 | ⬜ |
| TC-PERF-007 | descripcion de experiencia > 1000 chars → error | 🟡 | ⬜ |
| TC-PERF-008 | Editar / eliminar experiencia → funciona | 🟡 | ⬜ |
| TC-PERF-009 | Agregar idioma con nombre y nivel → guardado | 🟡 | ⬜ |
| TC-PERF-010 | Eliminar idioma → desaparece | 🟡 | ⬜ |
| TC-PERF-011 | Seleccionar hasta 15 competencias → guardadas | 🔴 | ⬜ |
| TC-PERF-012 | Intentar seleccionar 16 competencias → bloqueado | 🔴 | ⬜ |
| TC-PERF-013 | Guardar competencias reemplaza la selección anterior (no acumula) | 🟡 | ⬜ |

---

## M14 — Visibilidad de Perfil

| ID | Caso | Pri | Estado |
|----|------|-----|--------|
| TC-VIS-001 | Toggle ON → candidato aparece en búsqueda de reclutadores | 🔴 | ⬜ |
| TC-VIS-002 | Toggle OFF → candidato desaparece de búsqueda | 🔴 | ⬜ |
| TC-VIS-003 | Toggle OFF → contacto e informe ocultos para reclutadores | 🔴 🔒 | ⬜ |

---

## M15 — CV Upload ⚠️ PRÓXIMO

| ID | Caso | Pri | Estado |
|----|------|-----|--------|
| TC-CV-001 | ⚠️ [PRÓXIMO] Subir CV en PDF → guardado correctamente | 🔴 | ⬜ |
| TC-CV-002 | ⚠️ [PRÓXIMO] Subir archivo que no sea documento → error | 🔴 | ⬜ |
| TC-CV-003 | ⚠️ [PRÓXIMO] Subir CV > límite de tamaño → error con mensaje claro | 🟡 | ⬜ |
| TC-CV-004 | ⚠️ [PRÓXIMO] Reclutador descarga CV si tiene acceso al contacto | 🔴 | ⬜ |
| TC-CV-005 | ⚠️ [PRÓXIMO] **Reclutador NO descarga CV si no tiene acceso al contacto** | 🔴 🔒 | ⬜ |
| TC-CV-006 | ⚠️ [PRÓXIMO] Reemplazar CV existente → versión anterior reemplazada | 🟡 | ⬜ |

---

## M16 — Certificado PDF

| ID | Caso | Pri | Estado |
|----|------|-----|--------|
| TC-CERT-001 | Generar certificado con informe=LISTO → PDF descargable | 🔴 | ⬜ |
| TC-CERT-002 | Intentar generar con informe≠LISTO → bloqueado con mensaje | 🔴 | ⬜ |
| TC-CERT-003 | PDF contiene nombre, eneatipo y timestamp | 🔴 | ⬜ |
| TC-CERT-004 | PDF contiene QR funcional que apunta a /verificar/[id] | 🔴 | ⬜ |
| TC-CERT-005 | /verificar/[id] accesible sin autenticación | 🔴 | ⬜ |
| TC-CERT-006 | /verificar/[id] con UUID inválido → 404 o mensaje apropiado | 🟡 | ⬜ |
| TC-CERT-007 | URL de descarga expira después de 1 hora (signed URL) | 🟡 | ⬜ |

---

## M17 — Asistente IA

| ID | Caso | Pri | Estado |
|----|------|-----|--------|
| TC-IA-001 | Reclutador hace pregunta sobre candidato-puesto → respuesta coherente | 🔴 | ⬜ |
| TC-IA-002 | Consulta registrada en tabla consulta_asistente_ia | 🟡 | ⬜ |
| TC-IA-003 | **Reclutador solo puede consultar puestos propios** | 🔴 🔒 | ⬜ |
| TC-IA-004 | Consulta vacía → no envía request | 🟡 | ⬜ |
| TC-IA-005 | Fallo de OpenAI → mensaje de error amigable, sin stack trace visible | 🔴 | ⬜ |

---

## M18 — Panel Admin

| ID | Caso | Pri | Estado |
|----|------|-----|--------|
| TC-ADM-001 | Dashboard muestra KPIs correctos | 🟡 | ⬜ |
| TC-ADM-002 | Crear sector → aparece en catálogo | 🔴 | ⬜ |
| TC-ADM-003 | Crear sector duplicado → error | 🟡 | ⬜ |
| TC-ADM-004 | Desactivar / reactivar sector | 🟡 | ⬜ |
| TC-ADM-005 | Crear / desactivar / reactivar competencia | 🟡 | ⬜ |
| TC-ADM-006 | Desactivar candidato → desaparece de búsqueda | 🔴 | ⬜ |
| TC-ADM-007 | Admin ve lista de empresas con reclutadores | 🟡 | ⬜ |
| TC-ADM-008 | Monitor de informes muestra estados LISTO/PENDIENTE/ERROR | 🟡 | ⬜ |
| TC-ADM-009 | **No-ADMIN intenta acceder a /admin → prohibido** | 🔴 🔒 | ⬜ |

---

## 🚨 Smoke Test — Ejecutar primero

Si alguno falla, detener y escalar.

| # | ID | Descripción |
|---|----|-------------|
| 1 | TC-AUTH-001 | Registro RECLUTADOR → onboarding |
| 2 | TC-AUTH-010 | Login POSTULANTE → dashboard |
| 3 | TC-AUTH-015 | Logout → no puede volver atrás |
| 4 | TC-AUTH-019 | POSTULANTE no accede a /reclutador |
| 5 | TC-ONB-REC-001 | Onboarding reclutador → crea empresa |
| 6 | TC-PUE-001 | Crear puesto → aparece en lista |
| 7 | TC-PUE-008 | **perfil_psicologico_deseado NO visible al candidato** |
| 8 | TC-PUE-012 | Cerrar puesto → desaparece de /postulante/puestos |
| 9 | TC-POST-001 | Candidato postula → estado ENVIADA |
| 10 | TC-POST-005 | Reclutador avanza estado → VISTO |
| 11 | TC-CAND-006 | **Contacto oculto si toggle OFF y no aplicó** |
| 12 | TC-NOTA-006 | **Candidato no ve sus notas privadas** |
| 13 | TC-ENE-005 | Completar test → eneatipo asignado |
| 14 | TC-INF-002 | Informe LISTO → candidato ve contenido |
| 15 | TC-INF-006 | **Informe oculto para reclutador si toggle OFF** |
| 16 | TC-CERT-001 | Generar certificado → PDF descargable |
| 17 | TC-CERT-005 | /verificar/[id] accesible sin auth |
| 18 | TC-IA-003 | **Reclutador solo consulta puestos propios** |
| 19 | TC-ADM-009 | **No-ADMIN no accede a /admin** |
| 20 | TC-AUTH-021 | TyC Gate bloquea hasta aceptar |

---

## 🔴 Riesgos Críticos

| # | Riesgo | Módulo |
|---|--------|--------|
| 1 | `perfil_psicologico_deseado` expuesto al candidato (RLS) | Puestos |
| 2 | Notas privadas visibles al candidato (RLS) | Notas |
| 3 | Informe visible con toggle=OFF (RLS) | Visibilidad |
| 4 | Reclutador consulta asistente con puesto ajeno | Asistente IA |
| 5 | Email de Resend falla silenciosamente → candidato no notificado | Postulaciones |
| 6 | OpenAI falla → informe queda en PENDIENTE indefinidamente | Informe |
| 7 | URL signed del certificado expira en 1h → UX riesgo | Certificado |

---

## 🐛 Registro de Bugs

| ID | TC | Módulo | Descripción | Severidad | Estado |
|----|----|--------|-------------|-----------|--------|
| BUG-001 | | | | | Abierto |
