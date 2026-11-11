# Supabase Manual Setup

## Storage Buckets

### `certificados` (private)

This bucket stores generated PDF certificates. It must be created manually in the Supabase dashboard or via the CLI before the certificate feature can be used.

**Steps (Dashboard):**
1. Go to **Storage** in the Supabase dashboard
2. Click **New bucket**
3. Name: `certificados`
4. **Public bucket**: OFF (private — access is controlled via signed URLs)
5. Click **Save**

**Steps (CLI):**
```bash
supabase storage create certificados --private
```

**RLS policy:** No public access policies needed. The application uses the service role key (`SUPABASE_SERVICE_ROLE_KEY`) via `createAdminClient()` to upload files and generate signed URLs server-side.

**File layout inside the bucket:**
```
certificados/
  {postulante_id}/
    {certificado_id}.pdf
```

Signed URLs are generated with a 1-hour expiration and served via `/api/certificado/descargar/[id]`.

## Auth — JWT expiry (session policy)

The role-based session policy expects a **short, global access-token lifetime**. Supabase's JWT expiry is a single project-wide value (it cannot be set per role, not even via Auth Hooks — hooks change claims, not `exp`).

**Set it to 5 minutes (300 s):**
1. Go to **Authentication → Sessions** (or **Settings → Auth**) in the Supabase dashboard
2. Set **Access token (JWT) expiry limit** to `300` seconds
3. Save

**Why 5 minutes:** it aligns with the most sensitive role (admin) and keeps the exposure window of a leaked token — or of a revoked session hitting Supabase directly via RLS — small. Supabase's native auto-refresh keeps every role logged in seamlessly; a shorter access token only increases refresh frequency, it does **not** shorten the session.

**What the app layer adds on top (no changes to Supabase Auth):**
- Admin: forced logout after **1 hour of inactivity** (client watcher + `proxy` as server-side safety net; `sesion_actividad` table). The proxy caches `check_session()` per user for 60 s, so the server-side cut can lag up to 60 s.
- Recruiter / Applicant: native Supabase persistence, no inactivity logout.
- Forced revocation of any session via the `revocada` flag (see `src/modules/admin/sessions.ts`). Takes effect within **60 s** (proxy cache, `src/lib/session/check-session-cache.ts`).

**JWT signing keys must stay asymmetric (ES256).** The app identifies users with `auth.getClaims()`, which verifies the token locally against the JWKS. With a symmetric key (HS256) it falls back to a round trip to Supabase Auth on every request — the load pattern behind the 2026-10-20 outage.

**Compute size:** the production project must not run on the smallest burstable compute. On 2026-10-20 sustained traffic exhausted its CPU / Disk IO budget and the whole API (auth + REST) degraded for ~14 h. Check **Reports → Database** (CPU, Disk IO budget) before onboarding a large cohort.

The inactivity limit lives in `src/lib/session/policy.ts` and is mirrored as `interval '1 hour'` in migration `20260715000000_sesion_actividad.sql` — keep both in sync.

## Migrations — naming

Every file in `supabase/migrations/` must be `<version>_<name>.sql`, where `<version>` is a **unique** 14-digit `YYYYMMDDHHMMSS` timestamp. The version is what orders the migrations and what the CLI records in `supabase_migrations.schema_migrations`.

Two files sharing a version is a bug: the apply order between them falls back to whatever the filesystem returns, and `supabase db push` cannot record both (the version column is the primary key). Two pairs collided and were renumbered in place:

| Was | Now |
| --- | --- |
| `20260709000001_ubicacion_geografica.sql` | `20260709000002_ubicacion_geografica.sql` |
| `20260714000001_puesto_carrera.sql` | `20260714000003_puesto_carrera.sql` |

Both files are independent of the migration they collided with, so the renumbering does not change any real dependency. `20260713000001_carreras.sql` referenced the old ubicación filename in a comment and was updated.

**If — and only if — these migrations were applied with `supabase db push`**, the recorded history still holds the old versions and has to be reconciled once, or the CLI will try to re-apply them:

```sql
UPDATE supabase_migrations.schema_migrations
   SET version = '20260709000002'
 WHERE version = '20260709000001' AND name = 'ubicacion_geografica';

UPDATE supabase_migrations.schema_migrations
   SET version = '20260714000003'
 WHERE version = '20260714000001' AND name = 'puesto_carrera';
```

If the schema was built by pasting SQL into the dashboard editor (no `config.toml`, no linked project), there is no history table to fix and the rename is enough.

### Still inconsistent

- `001_`–`005_` use a sequential prefix instead of a timestamp. They sort correctly ahead of every timestamped file, so nothing is ambiguous; renaming them would cost another history reconciliation for no functional gain. Left as is on purpose.
- `seed.sql`, `seed_informe_mock.sql` and `seed_ubicacion.sql` live inside `migrations/` but are not migrations. They have no version prefix so the CLI skips them, but they belong outside that directory.

## Local environment (Docker)

The local stack (`project_id = "miliors"`, ports 553xx) rebuilds production's `public` schema from `migrations/20261110000000_baseline.sql` and loads catalog data from `seed.sql`. The pre-baseline migrations live in `migrations_archivo/` for reference only.

```bash
supabase start          # bring the stack up (Studio: http://127.0.0.1:55323, mail: http://127.0.0.1:55324)
npm run env:local       # point `next dev` at the local stack (.env.development.local)
npm run env:prod        # point `next dev` back at production
supabase db reset --local   # rebuild the local DB from baseline + seed
supabase stop           # stop the stack, keeping its data
```

Never run `db reset`, `db push` or `migration repair` with `--linked` without an explicit decision: the CLI is linked to production.

## Deploy — controles previos a migraciones

### Migración `20261114000000_competencia_sugerida.sql` (H-205)

Antes de aplicar esta migración en producción, correr la siguiente consulta de solo lectura para detectar si existen competencias duplicadas que difieran únicamente en mayúsculas o espacios:

```sql
SELECT lower(btrim(nombre)) AS nombre, count(*), string_agg(id::text, ', ')
FROM public.competencia GROUP BY 1 HAVING count(*) > 1;
```

Si devuelve filas, el control de la migración va a abortar y hay que unificar esos duplicados a mano antes del deploy.


### Migración `20261115000000_guardar_resultado_eneagrama.sql` (H-207)

Esta migración crea la función transaccional `public.guardar_resultado_eneagrama(...)`. Debe estar aplicada en producción **antes** de desplegar el código que invoca a la RPC (`calcularEneatipo`), ya que versiones nuevas de la aplicación dependen de su existencia para persistir los resultados del test del Eneagrama.


### Migración `20261116000000_moderacion_postulante.sql` (H-230)

Esta migración agrega la columna `bloqueado_por_admin` en `public.perfil_postulante`, la función `private.postulante_cumple_visibilidad(uuid)` y actualiza la política RLS `postulante_select_propio` para aplicar la regla "visible al estar listo", restringiendo además los permisos de `INSERT` y `UPDATE` por columna para el rol `authenticated`.

**Notas de deploy:**
- La migración `20261116000000_moderacion_postulante.sql` debe aplicarse **antes** del despliegue del código.
- Al aplicarla, los perfiles sin test de Eneagrama (con dominante) o sin informe de personalidad en estado `LISTO` dejan de aparecer en el buscador de reclutadores. Es el comportamiento buscado.
- Las desactivaciones previas realizadas por administradores no se pueden distinguir de las desactivaciones por decisión propia del postulante (`logAuditoria` no persiste en la base de datos, por lo que no hay backfill).
- **Consulta de solo lectura previa al deploy:** correr la siguiente consulta en producción para saber cuántos perfiles con `perfil_en_busqueda = true` no cumplen actualmente los requisitos y dejarán de ser visibles en el buscador:

```sql
SELECT count(*) AS perfiles_que_dejaran_de_ser_visibles
FROM public.perfil_postulante pp
WHERE pp.perfil_en_busqueda = true
  AND NOT (
    EXISTS (
      SELECT 1
      FROM public.test_eneagrama te
      JOIN public.test_eneagrama_dominante ted ON ted.test_eneagrama_id = te.id
      WHERE te.postulante_id = pp.id
    )
    AND EXISTS (
      SELECT 1
      FROM public.informe_personalidad ip
      WHERE ip.postulante_id = pp.id
        AND ip.estado_informe = 'LISTO'::public.estado_informe
    )
  );
```
