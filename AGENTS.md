<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Supabase CLI: production is linked — hard rules

The Supabase CLI in this repo is linked to the PRODUCTION project (`abhfueuhriqrtpdtdvzd`). Production is live and its data must never be modified from a dev machine. Any agent (and any human) MUST follow these rules:

1. **Never run these against production** — that is, never with `--linked`, `--db-url`, or `-p/--password`:
   `supabase db reset`, `supabase db push`, `supabase db pull`, `supabase migration repair`, `supabase migration up`, `supabase migration down`, `supabase seed`, `supabase config push`, `supabase storage rm|cp|mv`.
2. **`supabase db reset` always carries `--local` explicitly.** Never rely on the default.
3. **`supabase db push` is never run on your own** — its default target is the linked (production) project. It only runs as part of a deploy, under rule 5.
4. **The only allowed operations on production are read-only dumps** (`supabase db dump --linked ...`), and only when Tomás asks for them.
5. **Production writes happen only at deploy time, with Tomás's explicit OK in chat at that moment.** A previous OK does not carry over. The first deploy (12/11/2026) already ran `supabase migration repair 20261110000000 --status applied --linked` and `supabase db push --linked` (migrations `20261111000000`–`20261118000000`); never re-run the repair. Later deploys apply new migrations with `supabase db push --linked`, under the same OK. See `docs/estudio/04-pre-deploy.md` (deploy log).
6. If a command's target is unclear, do not run it: ask first.
