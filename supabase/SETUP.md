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
