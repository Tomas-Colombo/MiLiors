# Mapa del Sistema — Inventario de Componentes (Fase 1)

> Documento anexo a [01-mapa-del-sistema.md](01-mapa-del-sistema.md) con el inventario de `src/components/ui`, `src/components/shared` y el detalle de los directorios de componentes específicos de la aplicación.

## 1. Componentes Base de UI (`src/components/ui`)

| Componente | Qué hace | Cantidad consumidores | Consumidores |
| --- | --- | :---: | --- |
| `avatar.tsx` | Iniciales o texto corto. Si se omite, muestra el gradiente de marca. | 0 | *Sin consumidores directos (exportado/preparado)* |
| `badge.tsx` | Pill de estado de bajo contraste. 24px de alto · texto 12px / peso 600. | 2 | `src/app/(postulante)/postulante/postulaciones/page.tsx`, `src/app/(reclutador)/reclutador/postulaciones/page.tsx` |
| `button.tsx` | Clases de un botón, sin el <button>. Sirve para pintar como botón algo que | 0 | *Sin consumidores directos (exportado/preparado)* |
| `card.tsx` | Padding interno. Default "md" (24px). Escala de 4px: 20 · 24 · 28 desde `sm`; en celular se achica a 14 · 16 · 16. | 0 | *Sin consumidores directos (exportado/preparado)* |
| `choice.tsx` | Los dos grises salen de tokens y no de hex fijos: así el riel del | 0 | *Sin consumidores directos (exportado/preparado)* |
| `date-picker.tsx` | "YYYY-MM-DD" → Date local (evita el corrimiento de zona horaria de `new Date(iso)`). | 0 | *Sin consumidores directos (exportado/preparado)* |
| `feedback.tsx` | Íconos y texto usan `-ink`: legibles sobre su `-bg` en claro y en oscuro | 0 | *Sin consumidores directos (exportado/preparado)* |
| `index.ts` | MiLiors · UI — Punto de entrada único de los componentes del design system. | 0 | *Sin consumidores directos (exportado/preparado)* |
| `input.tsx` | Escala de alto compartida con `Button` (sm 32 · md 40 · lg 48). | 0 | *Sin consumidores directos (exportado/preparado)* |
| `month-year-input.tsx` | `'2024-03'` → `'03/2024'`. | 0 | *Sin consumidores directos (exportado/preparado)* |
| `navigation.tsx` | Ítem de navegación lateral. Activo: fondo tonal + texto primario. | 0 | *Sin consumidores directos (exportado/preparado)* |
| `overlay.tsx` | Tooltip de fondo oscuro para ayuda breve. Aparece en hover/focus. | 0 | *Sin consumidores directos (exportado/preparado)* |
| `page-header.tsx` | Título de la página: el único <h1> de la vista. | 0 | *Sin consumidores directos (exportado/preparado)* |
| `picker-shell.tsx` | Piezas compartidas por los campos que abren un panel flotante para elegir una | 0 | *Sin consumidores directos (exportado/preparado)* |
| `segmented.tsx` | Obligatorio: el grupo no tiene etiqueta visible propia. | 0 | *Sin consumidores directos (exportado/preparado)* |
| `select.tsx` | La opción nunca se filtra por la búsqueda: sigue visible aunque el texto | 3 | `src/components/shared/carrera-selector.tsx`, `src/components/shared/carreras-multi-select.tsx`, `src/components/shared/ubicacion-selector.tsx` |
| `skeleton.tsx` | Skeleton · placeholder de contenido en vuelo. | 0 | *Sin consumidores directos (exportado/preparado)* |
| `table.tsx` | Render de celda. | 0 | *Sin consumidores directos (exportado/preparado)* |
| `use-dialogo.ts` | Elementos que pueden recibir foco dentro del diálogo. | 1 | `src/components/shared/mobile-nav.tsx` |

---

## 2. Componentes Compartidos (`src/components/shared`)

| Componente | Qué hace | Cantidad consumidores | Consumidores |
| --- | --- | :---: | --- |
| `app-sidebar.tsx` | Si viene, los ítems del nav no navegan y este texto explica por qué. | 3 | `src/app/(admin)/layout.tsx`, `src/app/(postulante)/layout.tsx`, `src/app/(reclutador)/layout.tsx` |
| `aviso-certificado.tsx` | Aviso de que hace falta un certificado vigente para poder postularse. | 2 | `src/app/(postulante)/postulante/puestos/page.tsx`, `src/app/(postulante)/postulante/puestos/[id]/page.tsx` |
| `aviso-desactualizado.tsx` | Barra fina que acompaña al postulante por toda el área mientras su informe o | 1 | `src/app/(postulante)/layout.tsx` |
| `brand-logo.tsx` | Marca MiLiors. | 7 | `src/app/(acceso)/verificar/[id]/loading.tsx`, `src/app/(acceso)/verificar/[id]/page.tsx`, `src/app/(postulante)/postulante/eneagrama/eneagrama-wizard.tsx`, `src/app/(postulante)/postulante/onboarding/loading.tsx`, `src/app/(postulante)/postulante/onboarding/page.tsx`, `src/components/acceso/acceso-chrome.tsx`, `src/components/shared/app-sidebar.tsx` |
| `cambiar-password-form.tsx` | Componente cambiar-password-form | 3 | `src/app/(admin)/admin/mi-perfil/page.tsx`, `src/app/(postulante)/postulante/mi-perfil/page.tsx`, `src/app/(reclutador)/reclutador/mi-perfil/page.tsx` |
| `carrera-selector.tsx` | Selector de carrera/título reutilizable. | 2 | `src/app/(postulante)/postulante/mi-perfil/form.tsx`, `src/app/(postulante)/postulante/onboarding/onboarding-form.tsx` |
| `carreras-multi-select.tsx` | Nombre del <input hidden> donde se serializa el array de ids (JSON). | 2 | `src/app/(reclutador)/reclutador/puestos/nuevo/nuevo-puesto-form.tsx`, `src/app/(reclutador)/reclutador/puestos/[id]/editar/editar-puesto-form.tsx` |
| `documento-papel.tsx` | Chrome compartido de los documentos MiLiors en pantalla (certificado e | 3 | `src/app/(acceso)/verificar/verify-form.tsx`, `src/modules/certificado/certificado-display.tsx`, `src/modules/informe/informe-papel.tsx` |
| `exportar-excel.tsx` | Botón de descarga de los .xlsx de admin. | 11 | `src/app/(admin)/admin/carreras/loading.tsx`, `src/app/(admin)/admin/carreras/page.tsx`, `src/app/(admin)/admin/competencias/loading.tsx`, `src/app/(admin)/admin/competencias/page.tsx`, `src/app/(admin)/admin/empresas/loading.tsx`, `src/app/(admin)/admin/empresas/page.tsx`, `src/app/(admin)/admin/feedback/loading.tsx`, `src/app/(admin)/admin/idiomas/loading.tsx`, `src/app/(admin)/admin/idiomas/page.tsx`, `src/app/(admin)/admin/sectores/loading.tsx`, `src/app/(admin)/admin/sectores/page.tsx` |
| `filter-memory.tsx` | Recuerda la query string de cada ruta visitada (ver lib/filter-memory.ts). | 3 | `src/app/(admin)/layout.tsx`, `src/app/(postulante)/layout.tsx`, `src/app/(reclutador)/layout.tsx` |
| `list-controls.tsx` | Primitivos de listado ligados a la URL (searchParams). | 24 | `src/app/(admin)/admin/carreras/page.tsx`, `src/app/(admin)/admin/competencias/page.tsx`, `src/app/(admin)/admin/empresas/page.tsx`, `src/app/(admin)/admin/feedback/filtros-feedback.tsx`, `src/app/(admin)/admin/feedback/page.tsx`, `src/app/(admin)/admin/idiomas/page.tsx`, `src/app/(admin)/admin/informes/page.tsx`, `src/app/(admin)/admin/postulantes/page.tsx`, `src/app/(admin)/admin/preguntas/page.tsx`, `src/app/(admin)/admin/sectores/page.tsx`, `src/app/(admin)/admin/ubicaciones/page.tsx`, `src/app/(postulante)/postulante/postulaciones/filtros-postulaciones.tsx`, `src/app/(postulante)/postulante/puestos/filtros-puestos.tsx`, `src/app/(postulante)/postulante/reclutadores/[id]/page.tsx`, `src/app/(reclutador)/reclutador/empresas/filtros-empresas.tsx`, `src/app/(reclutador)/reclutador/empresas/page.tsx`, `src/app/(reclutador)/reclutador/notas/filtros-notas.tsx`, `src/app/(reclutador)/reclutador/notas/page.tsx`, `src/app/(reclutador)/reclutador/postulaciones/filtros-postulaciones.tsx`, `src/app/(reclutador)/reclutador/postulaciones/page.tsx`, `src/app/(reclutador)/reclutador/postulantes/filtros-postulantes.tsx`, `src/app/(reclutador)/reclutador/postulantes/page.tsx`, `src/app/(reclutador)/reclutador/puestos/filtros-puestos.tsx`, `src/app/(reclutador)/reclutador/puestos/page.tsx` |
| `marca-postulacion.tsx` | Selección visible del grupo: la marca del reclutador o el descarte. | 2 | `src/app/(reclutador)/reclutador/postulaciones/page.tsx`, `src/app/(reclutador)/reclutador/puestos/[id]/asistente/asistente-candidatos.tsx` |
| `mobile-nav.tsx` | Si viene, los ítems no navegan y este texto explica por qué. | 1 | `src/components/shared/app-sidebar.tsx` |
| `nav-shared.ts` | Etiqueta corta para la barra inferior en mobile; si falta se usa `label`. | 2 | `src/components/shared/app-sidebar.tsx`, `src/components/shared/mobile-nav.tsx` |
| `nota-texto.tsx` | Contenido de una nota acotado a pocas líneas, para que las tarjetas y los | 3 | `src/app/(reclutador)/reclutador/notas/page.tsx`, `src/app/(reclutador)/reclutador/postulaciones/notas-modal-btn.tsx`, `src/app/(reclutador)/reclutador/postulantes/[id]/notas-panel.tsx` |
| `nueva-empresa-modal.tsx` | Lo que precarga los campos en modo edición. | 2 | `src/app/(reclutador)/reclutador/empresas/empresas-ui.tsx`, `src/app/(reclutador)/reclutador/puestos/nuevo/nuevo-puesto-form.tsx` |
| `tyc-documento.tsx` | Ancho único del diálogo de Términos y Condiciones, para que el bloqueante y | 1 | `src/app/(admin)/admin/tyc/tyc-ui.tsx` |
| `tyc-gate.tsx` | Componente tyc-gate | 2 | `src/app/(postulante)/layout.tsx`, `src/app/(reclutador)/layout.tsx` |
| `tyc-lector.tsx` | Acceso directo de solo lectura a los Términos y Condiciones vigentes. | 2 | `src/app/(postulante)/postulante/mi-perfil/page.tsx`, `src/app/(reclutador)/reclutador/mi-perfil/page.tsx` |
| `tyc-modal.tsx` | Si success, el revalidatePath en la action recargará el Server Component | 0 | *Sin consumidores directos (exportado/preparado)* |
| `ubicacion-selector.tsx` | Cadena ya guardada + las opciones de cada nivel elegido (modo edición). | 4 | `src/app/(postulante)/postulante/mi-perfil/form.tsx`, `src/app/(postulante)/postulante/onboarding/onboarding-form.tsx`, `src/app/(reclutador)/reclutador/puestos/nuevo/nuevo-puesto-form.tsx`, `src/app/(reclutador)/reclutador/puestos/[id]/editar/editar-puesto-form.tsx` |
| `volver-link.tsx` | Enlace "Volver" hacia un listado, que restaura los filtros con los que el usuario lo dejó | 5 | `src/app/(postulante)/postulante/puestos/[id]/page.tsx`, `src/app/(postulante)/postulante/reclutadores/[id]/page.tsx`, `src/app/(reclutador)/reclutador/postulantes/[id]/page.tsx`, `src/app/(reclutador)/reclutador/puestos/[id]/asistente/page.tsx`, `src/app/(reclutador)/reclutador/puestos/[id]/page.tsx` |

---

## 3. Otras Carpetas de Componentes Específicos

- **`src/components/acceso/`**: Componentes visuales y contenedores de autenticación compartidos para login, registro y recuperación (`acceso-chrome.tsx`, `auth-card.tsx`, etc.).
- **`src/components/admin/`**: Widgets específicos del panel de administración, incluyendo el monitor de latidos e inactividad (`inactivity-watcher.tsx`).
- **`src/components/perfil-tecnico/`**: Formularios y selectores específicos para la edición del perfil técnico del postulante (experiencias, formación, idiomas, habilidades, cursos).
- **`src/components/shell/`**: Estructuras de layout y wrappers de navegación global (`page-shell.tsx`, `section-shell.tsx`).
- **`src/components/icons.tsx`**: Catálogo centralizado de iconos vectoriales SVG utilizados en navegación, botones y feedback visual de toda la app.
