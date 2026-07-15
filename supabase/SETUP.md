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
