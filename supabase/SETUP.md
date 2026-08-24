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
- Admin: forced logout after **1 hour of inactivity** (client watcher + `proxy` as server-side safety net; `sesion_actividad` table).
- Recruiter / Applicant: native Supabase persistence, no inactivity logout.
- Forced revocation of any session via the `revocada` flag (see `src/modules/admin/sessions.ts`).

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
