# SPEC — Visibilidad de puestos y link para compartir

> **Origen:** Requerimiento 10 (ítem 11, 13/11/2026, rol Reclutador).
> *"Si la empresa quiere hacer una publicación interna, solo para compartir a las personas que trabajan en su empresa, o solo a los candidatos que desea, o abierto a todo el público."*
> Nota sobre la captura del detalle del puesto: *"En alguna de estas partes puede ir el link para compartir. Un botón que diga solo compartir a quien tenga el link."*
>
> **Estado:** borrador para revisión · 18/11/2026

---

## Índice

- A. Resumen
- B. Decisiones de producto
- C. Situación actual (hallazgos del código)
- D. Modelo de datos y RLS
- E. Lado reclutador
- F. Lado candidato: vista previa pública y postulación
- G. Cierre de fugas existentes
- H. Escenarios (criterios de aceptación)
- I. Plan de entrega
- J. Pruebas
- K. Fuera de alcance y preguntas abiertas

---

## A. Resumen

Cada puesto tiene una **visibilidad** que elige el reclutador:

| Visibilidad | En el buscador de Miliors | Con el link |
|---|---|---|
| **Pública** (default, comportamiento actual) | Sí | Sí |
| **Privada** | No | Sí: solo quien tenga el link |

Todo puesto tiene **un link para compartir** (`/empleos/{token}`). El link abre una **vista previa pública** (sin login) con un botón *Postularme* que lleva a login/registro y después vuelve al puesto.

"Publicación interna" y "solo los candidatos que deseo" **son el mismo mecanismo**: un puesto privado cuyo link la empresa reparte por su propio canal (mail interno, WhatsApp, etc.).

## B. Decisiones de producto

| # | Decisión | Motivo |
|---|---|---|
| D1 | Dos visibilidades: `PUBLICA` y `PRIVADA`. No hay modo "interno" separado. | Miliors no tiene concepto de "empleado"; modelarlo (dominio, listas) no se justifica en v1. |
| D2 | "Candidatos elegidos" = mismo link privado. No hay invitaciones nominales ni cupos. | Mantiene un solo mecanismo y una sola UI. |
| D3 | El link sin login muestra una **vista previa pública** del puesto. | Mejor conversión y preview al compartir por WhatsApp. |
| D4 | Hay **un único link por puesto**, también para los públicos. | Una sola ruta, una sola UI de "Compartir". En los públicos el token no es secreto y no se pierde nada. |
| D5 | El reclutador puede **regenerar** el link: el anterior deja de funcionar. | Si el link se filtra a quien no debía. |
| D6 | Quien ya se postuló **conserva el acceso** al puesto aunque se regenere el link o el puesto pase a privado. | No romper "Mis postulaciones" ni la liberación de contacto. |
| D7 | La visibilidad es **independiente de `activo`** (pausado/activo) y de la baja lógica. | `cerrarPuesto`, `reactivarPuesto` y el cron `cerrar_puestos_inactivos()` no la tocan. |
| D8 | Los puestos existentes quedan `PUBLICA`. | Retrocompatible: sin cambio visible al desplegar. |

## C. Situación actual (hallazgos del código)

| # | Hallazgo | Dónde | Impacto |
|---|---|---|---|
| H1 | `puesto` no tiene visibilidad, token ni slug. | `supabase/migrations/20261110000000_baseline.sql:995` | Hay que modelarlo. |
| H2 | `puesto_select` (authenticated) permite ver **todo puesto activo** de cualquier empresa. | `20261117000000_rls_initplan.sql:426` | Ocultar en la UI no alcanza: hay que cerrar RLS. |
| H3 | `puesto_select_public` (anon) permite leer **todo puesto activo**. | `baseline.sql:2853`, `20261118000000:289` | Ídem, para usuarios sin sesión. |
| H4 | `puesto_carrera_select(_public)`, `formulario_preselector_select`, `pregunta_preselector_select`, `opcion_pregunta_preselector_select` dependen de `p.activo = true`. | `docs/estudio/01a-base-de-datos.md:109-154` | Exponen datos de puestos privados si no se ajustan. |
| H5 | `postularAPuesto` / `postularAPuestoConFormulario` insertan con service role y **no verifican que el puesto sea visible ni activo** (solo ciclo abierto). | `src/modules/postulaciones/actions.ts:173`, `:212` | Cualquiera con el UUID se postula a un puesto privado. |
| H6 | **Trampa:** `getFormularioDePuesto` usa el cliente RLS. Si RLS oculta el formulario de un puesto privado, `postularAPuesto` cree que "no hay formulario" y **saltea el preselector**. | `src/modules/preselector/queries.ts:29` | Bypass del formulario al cerrar RLS. Obligatorio resolverlo junto con D/F. |
| H7 | `getReclutadorPublico` lista los puestos activos del reclutador con service role. | `src/modules/puestos/queries.ts` (~970-1000), `/postulante/reclutadores/[id]` | Mostraría puestos privados. |
| H8 | `getPuestoPublicoById` no filtra `activo` ni baja: depende solo de RLS. | `src/modules/puestos/queries.ts:495` | Se ve afectado por el cambio de RLS (bien), pero hay que sumar la vía "con link". |
| H9 | No existe ninguna página de puesto sin login. Rutas públicas: `/iniciar-sesion`, `/registro`, `/recuperar-password`, `/verificar`. | `src/proxy.ts:10` | Hay que crear la vista previa y agregarla a `PUBLIC_PATHS`. |
| H10 | El proxy redirige a `/iniciar-sesion` **sin `next`**, y `iniciarSesion` siempre redirige al panel del rol. | `src/proxy.ts:68`, `src/modules/auth/actions.ts:206` | El link se pierde en el login. |
| H11 | Ya existe `src/modules/visibilidad` (= `perfil_en_busqueda` del postulante). | `src/modules/visibilidad/` | No reutilizar el nombre: usar `visibilidad_puesto` / `enlace`. |
| H12 | Precedente de link público: `/verificar/[id]` lee con service role tras validar el id. URL absoluta con `appUrlPublico()`. | `src/app/(acceso)/verificar/[id]`, `src/lib/app-url.ts` | Patrón a seguir. |
| H13 | La policy `postulacion_insert` (y `respuesta_preselector_insert`) permite a cualquier POSTULANTE insertar directo con anon key + JWT propio, salteando visibilidad/token, preselector, `activo` y certificado de la server action. Todos los inserts de la app ya usan `createAdminClient()`. | `baseline.sql:2694`, `20261117000000_rls_initplan.sql:362`, `src/modules/postulaciones/actions.ts:227,304,321` | Se eliminan las policies y se revoca INSERT a clientes (ver D.2). |

No hay notificaciones por email al publicar puestos, así que no hay difusión que respetar hoy.

## D. Modelo de datos y RLS

Migración nueva: `supabase/migrations/20261120000000_visibilidad_puesto.sql`. **No se aplica a producción fuera de un deploy con OK explícito de Tomás** (ver `AGENTS.md`).

### D.1 Esquema

```sql
CREATE TYPE public.visibilidad_puesto AS ENUM ('PUBLICA', 'PRIVADA');

ALTER TABLE public.puesto
  ADD COLUMN visibilidad public.visibilidad_puesto NOT NULL DEFAULT 'PUBLICA';

-- Token en tabla aparte: no se expone por `select *` ni por embeds de puesto.
CREATE TABLE public.puesto_enlace (
  puesto_id     uuid PRIMARY KEY REFERENCES public.puesto(id) ON DELETE CASCADE,
  token         text NOT NULL UNIQUE,
  creado_en     timestamptz NOT NULL DEFAULT now(),
  regenerado_en timestamptz
);
ALTER TABLE public.puesto_enlace ENABLE ROW LEVEL SECURITY;
```

- **Token:** 24 bytes de `extensions.gen_random_bytes` (pgcrypto ya está instalado, `baseline.sql:46`) en base64url, sin padding (32 caracteres). Función `private.nuevo_token_enlace()`.
- **Alta:** trigger `AFTER INSERT ON puesto` que crea la fila en `puesto_enlace`. Es más robusto que hacerlo en `publicarPuesto`, que inserta con service role.
- **Backfill:** un token para cada puesto existente.
- **Regenerar:** RPC `public.regenerar_enlace_puesto(p_puesto_id uuid) RETURNS text`, `SECURITY DEFINER`, `search_path = ''`, que verifica que `auth.uid()` sea el reclutador dueño. `EXECUTE` solo para `authenticated`. Sigue el mismo endurecimiento que `20261028000000_endurecer_funciones_security_definer.sql`.
- Regenerar `src/lib/types/database.types.ts`.

### D.2 RLS

| Policy | Hoy | Después |
|---|---|---|
| `puesto_select` (authenticated) | `activo OR admin OR dueño` | `(activo AND visibilidad = 'PUBLICA') OR admin OR dueño OR private.postulante_postulado_a(puesto.id)` |
| `puesto_select_public` (anon) | `activo AND fecha_baja_puesto IS NULL` | `... AND visibilidad = 'PUBLICA'` |
| `puesto_carrera_select(_public)`, `formulario_preselector_select`, `pregunta_preselector_select`, `opcion_pregunta_preselector_select` | `p.activo = true ...` | Misma condición que `puesto_select` / `puesto_select_public` sobre el puesto padre. |
| `puesto_enlace` | — | SELECT solo para el reclutador dueño y el admin. Sin INSERT/UPDATE/DELETE para clientes: se escribe por trigger y RPC. Sin acceso anon. |
| `postulacion_insert`, `respuesta_preselector_insert` | POSTULANTE inserta directo con su JWT | Eliminadas, y `REVOKE INSERT` a `anon`/`authenticated` sobre ambas tablas. Las server actions con service role son la única vía de escritura (cierra H13). |

- `private.postulante_postulado_a(puesto_id)`: función `SECURITY DEFINER` (patrón `private.reclutador_ve_postulante`) que devuelve si el usuario actual tiene una `postulacion` en ese puesto. Así se cumple D6 sin recursión de RLS.
- Usar `(SELECT auth.uid())` / `(SELECT public.get_my_rol())` (initplan), como en `20261117000000_rls_initplan.sql`.
- **El acceso por link NO pasa por RLS.** El servidor valida el token y lee con service role (ver F.2), igual que `/verificar/[id]`.

## E. Lado reclutador

### E.1 Formulario de alta y edición

Archivos: `nuevo/nuevo-puesto-form.tsx`, `[id]/editar/editar-puesto-form.tsx`, `src/modules/puestos/schema.ts`, `publicarPuesto` (`actions.ts:253`), `editarPuesto` (`actions.ts:355`).

- Campo nuevo **"¿Quién puede ver este puesto?"**: un grupo de radios con dos tarjetas.
  - **Público** — "Aparece en el buscador de Miliors y cualquiera con el link puede verlo." (seleccionado por defecto)
  - **Privado** — "No aparece en el buscador. Solo lo ven quienes reciban el link. Ideal para búsquedas internas o candidatos que elijas."
- `puestoSchema`: `visibilidad: z.enum(['PUBLICA', 'PRIVADA'])`. Sumarlo al parseo manual campo por campo, al insert y al `.update`.
- En edición, cambiar a **Privado** muestra un aviso en línea: "El puesto dejará de aparecer en el buscador. Quienes ya se postularon lo siguen viendo."

### E.2 Tarjeta "Compartir" en el detalle del puesto

Archivo: `src/app/(reclutador)/reclutador/puestos/[id]/page.tsx`. Va entre la tarjeta de cabecera (`:114`) y el contador de postulaciones (`:116`).

Contenido:

1. **Título + badge de visibilidad:** "Compartir" · `Público` / `Privado`.
2. **Texto de ayuda** según visibilidad:
   - Público: "Cualquier persona puede encontrarlo en Miliors. Compartí el link para llegar a más candidatos."
   - Privado: "Solo quienes tengan este link pueden ver el puesto y postularse."
3. **Link** de solo lectura (`appUrlPublico('/empleos/' + token)`) y botón **Copiar link**, con feedback "Link copiado". Reusar el patrón de `src/components/shared/copy-id.tsx`.
4. **Regenerar link** (acción secundaria) con un `Modal` de confirmación: "El link actual va a dejar de funcionar. Quienes ya se postularon conservan su postulación." Llama a la server action `regenerarEnlacePuesto(puestoId)`, que usa la RPC.
5. Link "Cambiar visibilidad", que lleva a `/reclutador/puestos/[id]/editar`.

Si el puesto está **pausado**, mostrar una nota: "El puesto está pausado: quien abra el link lo verá, pero no podrá postularse."

Datos:
- `getPuestoById` (`queries.ts:207`) suma `visibilidad` al select.
- Nueva query `getEnlacePuesto(puestoId)`, con `cache()` y cliente RLS (dueño).

### E.3 Lista "Mis puestos"

`src/app/(reclutador)/reclutador/puestos/page.tsx`: badge `Privado` junto al estado, solo en los privados para no meter ruido. `getMisPuestos` (`queries.ts:170`) suma `visibilidad`.

## F. Lado candidato: vista previa pública y postulación

### F.1 Ruta pública `/empleos/[token]`

- Nueva ruta en el grupo `(acceso)` o en uno propio. Se agrega `'/empleos'` a `PUBLIC_PATHS` en `src/proxy.ts`.
- Query `getPuestoPorEnlace(token)` en `src/modules/puestos/queries.ts`:
  - Valida el formato del token (base64url, 32 caracteres) antes de consultar.
  - Busca con service role y devuelve **solo campos de presentación**: título, empresa, rubro/sector, ubicación (localidad/departamento), carga horaria, nivel de experiencia, idioma, descripción, carreras, `fecha_publicacion`, `activo`, si tiene ciclo abierto, y el `puesto_id`.
  - **Nunca** devuelve `puesto_criterio_psicologico`, datos del reclutador, contadores de postulaciones ni preguntas del preselector.
  - Token inexistente o puesto dado de baja → `notFound()`, con la misma respuesta en los dos casos para no enumerar.
- Estados de la página:

| Caso | Qué ve |
|---|---|
| Sin sesión, puesto activo con ciclo abierto | Datos del puesto + **Postularme** → `/iniciar-sesion?next=/empleos/{token}` (con link secundario "Crear cuenta" → `/registro?next=...`) |
| Puesto pausado o sin ciclo abierto | Datos del puesto + aviso "Este puesto no está recibiendo postulaciones por ahora." Sin botón. Vale igual para sesión POSTULANTE; si ya se postuló, manda "Ya te postulaste". El detalle del postulante (F.2) deshabilita *Postularme* con el mismo aviso. |
| Sesión POSTULANTE | **Postularme** → `/postulante/puestos/{puestoId}?enlace={token}` |
| Sesión POSTULANTE que ya se postuló | "Ya te postulaste" + link a Mis postulaciones |
| Sesión RECLUTADOR / ADMIN | Vista previa sin botón, con la leyenda "Así ven el puesto los candidatos". |
| Sesión POSTULANTE sin onboarding, Eneagrama o certificado | *Postularme* lo lleva al detalle (`/postulante/puestos/{id}?enlace=…`), y ahí los gates de siempre (`requireEneagramaCompleto`, certificado vigente) lo mandan a completar el perfil, el Eneagrama o el certificado. Como el destino quedó en la cookie `miliors-destino`, el aviso "Seguí con tu postulación" lo trae de vuelta al puesto desde esas pantallas. |
| Sesión revocada o cerrada por inactividad | El proxy lo manda a `/iniciar-sesion?motivo=…&next=…`; al volver a ingresar retoma el puesto. |

- **Metadatos y seguridad:**
  - `generateMetadata` con título "{Puesto} en {Empresa} — MiLiors" (el título raíz es `%s` sin sufijo, la marca se agrega en la página), una descripción corta y `openGraph` con URL absoluta (`appUrlPublico()`; el layout raíz no define `metadataBase`), para el preview de WhatsApp.
  - `robots: { index: false, follow: false }` en todos los casos (ver K).
  - Header `Referrer-Policy: no-referrer` en `/empleos/*` (desde `next.config.ts` `headers()`), para que el token no se filtre por `Referer` a los links externos de la descripción o de la empresa.
- Leer la guía de Next 16 en `node_modules/next/dist/docs/` para `generateMetadata`, `params` asíncronos y `headers()` antes de implementar (`AGENTS.md`).

### F.2 Detalle del postulante con link

`/postulante/puestos/[id]` acepta `?enlace={token}`. Hoy usa `getPuestoPublicoById` (`queries.ts:495`), que solo depende de RLS.

Nuevo helper de acceso, del lado del servidor, en `src/modules/puestos/acceso.ts`:

```ts
// Single source of truth for "can this postulante see/apply to this puesto?"
resolverAccesoPuesto(puestoId: string, enlace?: string | null):
  Promise<{ via: 'publico' | 'enlace' | 'postulado' } | null>
```

- `publico`: el puesto es visible por RLS (activo + `PUBLICA`).
- `enlace`: el token existe en `puesto_enlace` **y** pertenece a ese `puestoId`, verificado con service role. Un token válido de otro puesto **no** sirve.
- `postulado`: el postulante ya tiene una postulación en ese puesto.
- `null` → `notFound()`.

Si el acceso es por `enlace`, las lecturas de la página (puesto, carreras, formulario preselector) se hacen con service role **después** de validar el acceso. Los gates actuales se mantienen: `requireEneagramaCompleto` y certificado vigente para postular.

Construido: la página llama a `resolverAccesoPuesto(id, enlace)` (`null` → `notFound()`) y lee con `getPuestoParaPostulante(id)` (service role, para todas las vías, porque RLS tampoco deja leer la empresa a un postulante; ver K.2) y `getFormularioDePuestoAdmin(id)`, conservando la sanitización que nunca manda `esCritica` ni `esValida` al cliente. Además calcula `recibePostulaciones` (activo, sin baja y con ciclo abierto): si es falso, *Postularme* queda deshabilitado con "Este puesto no está recibiendo postulaciones por ahora.". `PostularButton` recibe `enlace`, lo manda a `postularAPuesto` y como hidden input del formulario del preselector, y ahora muestra el error de la action en la ruta sin formulario (antes se perdía).

### F.3 Postulación (cierra H5 y H6)

`postularAPuesto` y `postularAPuestoConFormulario` reciben el `enlace` opcional (hidden input) y:

1. Llaman a `resolverAccesoPuesto(puestoId, enlace)`. Si da `null` → error "Este puesto no está disponible.".
2. Verifican que el puesto esté `activo` y no dado de baja. Hoy esto solo se infiere del ciclo abierto.
3. **Cargan el formulario preselector con service role** (variante `getFormularioDePuestoAdmin` o un parámetro de cliente), nunca con el cliente RLS. Así se evita que un formulario oculto por RLS se interprete como "sin formulario" (H6).
4. El resto queda igual: ciclo abierto, insert con service role y manejo de `23505`.

### F.4 Volver al puesto después del login (cierra H10)

- `/iniciar-sesion` y `/registro` aceptan `?next=`.
- `sanitizarNext(next)` en `src/lib/` acepta solo rutas relativas internas: empieza con `/`, no empieza con `//` ni `/\`, sin esquema. Allowlist de prefijos: `/empleos/` y `/postulante/`. Cualquier otro valor se ignora.
- **Login:** `iniciarSesion` redirige, en este orden, al `next` saneado del formulario, a la cookie `miliors-destino` o a `RUTAS_POR_ROL[rol]`. `/postulante/...` solo se respeta para un POSTULANTE; `/empleos/...` sirve a cualquier rol (un reclutador que entra con `next=/empleos/...` va a la vista previa). Cuando el login trae un `next` válido también escribe la cookie, para no perder el camino si de ahí se pasa por onboarding, Eneagrama o certificado.
- **Registro (lo construido):** el embudo pasa por verificación de email, onboarding, Eneagrama y certificado, y el email de verificación puede abrirse en otro navegador. **No hay callback de email que retome el `next`**: no se tocó la configuración de confirmación ni `emailRedirectTo` (eso es configuración del dashboard de Supabase). Lo que sí hay:
  - Con `next` válido, `registrarUsuario` **fuerza el rol POSTULANTE en el servidor** (el formulario solo oculta el selector de tipo de cuenta) y guarda la cookie `miliors-destino` (httpOnly, `SameSite=Lax`, `path=/`, 7 días, valor saneado).
  - Al confirmar el mail e ingresar, el login usa la cookie y vuelve a la vista previa.
  - **Dueño de la cookie:** el valor es JSON `{ d: destino, u: usuarioId | null }`. El registro todavía no tiene sesión y guarda `u: null`; en el primer login la cookie se ata a ese usuario. Si `u` es de otro usuario, el login la ignora **y la borra**, y el aviso tampoco la muestra. Al leerla se vuelve a sanear el destino y un valor ilegible (incluido el formato viejo, un string suelto) se ignora.
  - **Solo POSTULANTE:** el login escribe y usa la cookie únicamente para el rol POSTULANTE; un reclutador o admin que prueba su propio link no deja cookie ni la adopta.
  - **Link vencido:** si el login cae a la cookie y el destino es un `/empleos/{token}` que ya no resuelve (regenerado o puesto dado de baja), se borra la cookie y se sigue al panel del rol. `limpiarDestinoDePuesto` también la borra en ese caso.
  - **Fin de sesión:** la cookie se borra en `cerrarSesion`, en `cerrarSesionPorInactividad` y en el cierre forzado del proxy (revocada o inactiva).
  - El aviso "Seguí con tu postulación a {Puesto} en {Empresa}" (Server Component de solo lectura, con link y *Descartar*) aparece en el inicio, Buscar puestos, certificado, Eneagrama y datos básicos mientras exista la cookie. Si el destino es un `/empleos/{token}` que ya no resuelve (link regenerado, puesto dado de baja) o el puesto ya está postulado, no se muestra. La cookie se borra al postularse a ese puesto (en las dos actions), al descartar (server action) y al cerrar sesión.
  - Si la cookie se perdió, el usuario vuelve a abrir el link y entra directo. Es aceptable.
- **Proxy:** `?next=` (saneado, solo si cae en la allowlist) se agrega en tres redirecciones: ruta protegida sin sesión, sesión revocada o inactiva (`/iniciar-sesion?motivo=…&next=…`) y, a la inversa, un usuario ya logueado que abre `/iniciar-sesion?next=…` o `/registro?next=…` va directo al `next` compatible con su rol en lugar de a su panel. Los POST (server actions) siguen sin redirigirse.

## G. Cierre de fugas existentes

| Fuga | Corrección |
|---|---|
| Buscador `getPuestosActivos` (`queries.ts:349`) | RLS ya filtra. Sumar además `.eq('visibilidad', 'PUBLICA')` explícito, como defensa en profundidad e intención legible. |
| `getReclutadorPublico` (service role) | Filtrar `visibilidad = 'PUBLICA'`. |
| `getPuestoPublicoById` | Reemplazada por `resolverAccesoPuesto` + `getPuestoParaPostulante`; la función se eliminó por no tener usos. |
| Cualquier otra lectura de `puesto` con `createAdminClient` del lado postulante | Auditar con `rg "from\('puesto'\)"` sobre los usos de admin y aplicar el mismo filtro. |

## H. Escenarios (criterios de aceptación)

**Reclutador**
1. **Dado** un reclutador que crea un puesto sin tocar la visibilidad, **entonces** queda `PUBLICA` y tiene un link `/empleos/{token}`.
2. **Dado** un puesto público, **cuando** el reclutador lo cambia a privado, **entonces** desaparece del buscador y de su perfil público de reclutador, y los postulantes que ya se postularon lo siguen viendo en Mis postulaciones.
3. **Dado** el detalle del puesto, **cuando** el reclutador toca *Copiar link*, **entonces** el link absoluto queda en el portapapeles y ve "Link copiado".
4. **Dado** un link, **cuando** el reclutador lo regenera y confirma, **entonces** el link viejo da 404 y el nuevo funciona.
5. **Dado** otro reclutador (de otra empresa), **entonces** no puede leer `puesto_enlace` ni regenerar el link de un puesto ajeno.

**Candidato**

6. **Dado** un puesto privado, **cuando** un postulante busca en el buscador, **entonces** no aparece.
7. **Dado** un puesto privado, **cuando** un postulante abre `/postulante/puestos/{id}` sin `enlace` y sin postulación previa, **entonces** ve 404.
8. **Dado** un usuario sin sesión, **cuando** abre el link de un puesto privado activo, **entonces** ve la vista previa con *Postularme*, inicia sesión y vuelve al puesto.
9. **Dado** un postulante con requisitos completos y el link, **cuando** se postula, **entonces** se crea la postulación. Si el puesto tiene preselector, **debe** completarlo.
10. **Dado** un postulante sin link, **cuando** llama a `postularAPuesto` con el UUID de un puesto privado, **entonces** recibe "Este puesto no está disponible." y no se crea nada.
11. **Dado** un token válido del puesto A, **cuando** se usa con el `puestoId` de B, **entonces** se rechaza.
12. **Dado** un puesto pausado, **cuando** alguien abre el link, **entonces** ve el puesto sin botón de postulación.
13. **Dado** `?next=https://evil.com` o `?next=//evil.com`, **entonces** el login ignora `next` y va al panel del rol.

**Anon / RLS**

14. **Dado** el rol `anon`, **entonces** `select` sobre `puesto` no devuelve puestos privados, y `puesto_enlace` no devuelve filas.

## I. Plan de entrega

Estimación total: ~1.000–1.300 líneas con tests, por encima del presupuesto de 400 por PR. Propuesta: **3 PRs encadenados**.

| PR | Contenido | Efecto visible |
|---|---|---|
| 1. Datos y seguridad | Migración (enum, columna, `puesto_enlace`, trigger, backfill, RPC, RLS), `database.types.ts`, `resolverAccesoPuesto`, cambios en las actions de postulación (H5/H6), filtros de G, tests RLS. | Ninguno: todo queda `PUBLICA`. |
| 2. UI reclutador | Campo de visibilidad en alta y edición, tarjeta *Compartir*, regenerar link, badge en Mis puestos. | El reclutador ya puede crear privados. El link todavía no tiene destino público: hasta el PR 3, mergear 2 y 3 juntos o dejar el PR 2 detrás de un flag. |
| 3. Vista previa y embudo | `/empleos/[token]`, `PUBLIC_PATHS`, metadatos y `Referrer-Policy`, `?enlace=` en el detalle del postulante, `next` + `sanitizarNext`, cookie `miliors-destino`, aviso en el panel, e2e. | Feature completa. |

La migración se aplica a producción **solo en el deploy**, con OK explícito de Tomás en ese momento (`supabase db push --linked`).

## J. Pruebas

- **Unitarias (vitest):** `puestoSchema` con `visibilidad`; `sanitizarNext` (relativas, `//`, `/\`, esquemas, prefijos fuera de la allowlist); validación del formato de token; `resolverAccesoPuesto`, con un mock del cliente para cada vía y el token de otro puesto.
- **RLS (`vitest.rls.config.ts`, `test/rls/`, solo Supabase local):**
  - anon y postulante no ven privados.
  - El postulante postulado sí ve el puesto.
  - El dueño y el admin ven todo.
  - `puesto_enlace` solo es visible para el dueño o el admin.
  - Las tablas hijas (carrera y preselector) siguen la misma regla.
  - La RPC de regenerar rechaza a quien no es dueño.
- **e2e (Playwright, `e2e/puestos.spec.ts`):**
  - Crear un puesto privado, copiar el link y abrirlo en un contexto sin sesión.
  - Login con vuelta al puesto y postulación.
  - Verificar que el puesto no figure en el buscador.
  - Regenerar el link y comprobar que el viejo da 404.

## K. Fuera de alcance y preguntas abiertas

**Fuera de alcance (v1):**
- Modo "interno" por dominio de email o por lista de empleados.
- Invitaciones nominales, links con cupo o con vencimiento.
- Métricas de aperturas del link.
- Moderación de puestos desde admin.

**Preguntas abiertas (no bloquean el PR 1):**
1. **Indexación de puestos públicos:** ¿queremos que Google indexe `/empleos/{token}` de los puestos públicos? Default de este spec: `noindex` para todo. Abrirlo implica pensar SEO y URLs con slug.
2. **Exponer el nombre de la empresa sin login:** la vista previa muestra empresa y descripción a cualquiera con el link, incluso en puestos públicos. Hoy anon ya puede leer puestos activos vía RLS, así que no empeora, pero conviene confirmarlo con negocio.
   - **Corrección (hallazgo al construir el PR 3):** la premisa "postulantes ya ven la empresa vía `getReclutadorPublico`" es cierta solo porque esa query usa service role. Por RLS, `empresa_select` es solo admin y reclutador: **un postulante no lee `empresa`**, así que los embeds `empresa(nombre_empresa)` hechos con el cliente RLS (`getPuestosActivos`, `getPuestoPublicoById`) devuelven `null` para un postulante. Es un bug previo y queda **fuera de alcance**; hay que corregirlo aparte (leer el nombre con service role o abrir una policy acotada). El detalle del postulante nuevo (`getPuestoParaPostulante`, service role tras validar el acceso) sí trae la empresa; el buscador todavía no.

3. **Cambio de visibilidad con el puesto pausado:** se permite. Confirmar que no haga falta un aviso extra.

**Limitaciones conocidas de la v1:**
- **Co-reclutadores de la misma empresa:** `puesto_enlace` solo se lee para el reclutador dueño del puesto y el admin, así que otro reclutador de la misma empresa no puede ver ni copiar el link ni regenerarlo. Si hace falta, se abre la policy y la RPC al resto de los reclutadores vinculados a la empresa.
- **Cookie de destino por navegador:** `miliors-destino` está atada al usuario (ver F.4), así que otra persona que use el mismo navegador no la hereda. Pero la misma persona que ingresa sin `next` usa la cookie vigente (hasta 7 días, o hasta postularse, descartar el aviso o cerrar sesión) y puede terminar en la vista previa de un puesto que dejó pendiente.
- **Sin callback de email** (ver F.4): si el mail de verificación se abre en otro navegador, la cookie no viaja y el usuario tiene que volver a abrir el link.
