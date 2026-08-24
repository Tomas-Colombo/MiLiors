#!/usr/bin/env node
/**
 * Genera src/lib/types/database.types.ts desde el esquema vivo de Supabase.
 *
 * Hace lo mismo que `supabase gen types typescript`, pero leyendo el documento
 * OpenAPI que PostgREST publica en /rest/v1/ en vez de la API de management.
 * Ventaja: le alcanza con las claves que ya están en .env.local — no necesita
 * docker (`--local`), ni proyecto linkeado, ni personal access token.
 *
 *   node scripts/gen-database-types.mjs
 *
 * Lo único que no sale del OpenAPI son las firmas de las funciones RPC (el
 * documento no declara el tipo de retorno): están escritas a mano en RPCS, más
 * abajo, y hay que tocarlas si se agrega o cambia una función.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const SALIDA = 'src/lib/types/database.types.ts'

// ─── Config desde .env.local ─────────────────────────────────────────────────
function leerEnv() {
  const env = {}
  // split(/\r?\n/) y no split('\n'): en JS `.` no matchea \r, así que el CRLF
  // del final de línea deja fuera de juego al `(.*)$` del regex de abajo.
  for (const linea of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
  return env
}

const env = leerEnv()
const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!URL_BASE || !KEY) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL y/o las claves en .env.local')
  process.exit(1)
}

// ─── Firmas de las funciones RPC (el OpenAPI no trae el tipo de retorno) ─────
const RPCS = {
  cerrar_puestos_inactivos: { args: 'Record<PropertyKey, never>', returns: 'number' },
  check_session: { args: 'Record<PropertyKey, never>', returns: 'string | null' },
  get_my_rol: { args: 'Record<PropertyKey, never>', returns: 'Database["public"]["Enums"]["rol_usuario"]' },
  reclutador_ve_postulante: { args: '{ p_postulante_id: string }', returns: 'boolean' },
  touch_session_activity: { args: 'Record<PropertyKey, never>', returns: 'undefined' },
}

const ESCALARES = {
  uuid: 'string',
  text: 'string',
  'character varying': 'string',
  'timestamp with time zone': 'string',
  'timestamp without time zone': 'string',
  date: 'string',
  'time without time zone': 'string',
  integer: 'number',
  bigint: 'number',
  smallint: 'number',
  numeric: 'number',
  'double precision': 'number',
  real: 'number',
  boolean: 'boolean',
  json: 'Json',
  jsonb: 'Json',
}

const res = await fetch(`${URL_BASE}/rest/v1/`, {
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
})
if (!res.ok) {
  console.error(`PostgREST respondió ${res.status}: ${await res.text()}`)
  process.exit(1)
}
const defs = (await res.json()).definitions ?? {}

/**
 * UNIQUE de una sola columna, sacado de las migraciones: alimenta el
 * `isOneToOne` de las relaciones, que es lo que decide si un embed
 * (`.select('perfil_tecnico(*)')`) devuelve un objeto o un array. El OpenAPI
 * marca las PK y las FK, pero no los UNIQUE.
 */
const unicas = new Set()
{
  const { readdirSync } = await import('node:fs')
  const dir = 'supabase/migrations'
  for (const archivo of readdirSync(dir).filter((f) => f.endsWith('.sql'))) {
    const sql = readFileSync(`${dir}/${archivo}`, 'utf8')
    const tablas = sql.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?(\w+)\s*\(([\s\S]*?)\n\);/gi)
    for (const [, tabla, cuerpo] of tablas) {
      for (const linea of cuerpo.split('\n')) {
        const l = linea.trim()
        let m
        if ((m = l.match(/^(\w+)\s+\w[\w\s()]*?\bUNIQUE\b/i))) unicas.add(`${tabla}.${m[1]}`)
        if ((m = l.match(/^UNIQUE\s*\(\s*(\w+)\s*\)\s*,?$/i))) unicas.add(`${tabla}.${m[1]}`)
        if ((m = l.match(/^(\w+)\s+uuid\s+PRIMARY KEY/i))) unicas.add(`${tabla}.${m[1]}`)
      }
    }
  }
}

const enums = {}
for (const df of Object.values(defs)) {
  for (const p of Object.values(df.properties ?? {})) {
    if (p.format?.startsWith('public.') && p.enum) enums[p.format.slice(7)] = p.enum
  }
}

const tsTipo = (p) => {
  const f = p.format ?? ''
  if (f.startsWith('public.')) return `Database["public"]["Enums"]["${f.slice(7)}"]`
  if (f.endsWith('[]')) return `${ESCALARES[f.slice(0, -2)] ?? 'unknown'}[]`
  return ESCALARES[f] ?? 'unknown'
}

const fkDe = (p) => p.description?.match(/<fk table='(\w+)' column='(\w+)'\/>/)

const out = []
const w = (l = '') => out.push(l)

w('// Tipos del esquema `public`, derivados del esquema vivo que publica')
w('// PostgREST en /rest/v1/ (la misma base que lee `supabase gen types`).')
w('// NO EDITAR A MANO. Regenerar con: node scripts/gen-database-types.mjs')
w()
w('export type Json =')
w('  | string')
w('  | number')
w('  | boolean')
w('  | null')
w('  | { [key: string]: Json | undefined }')
w('  | Json[]')
w()
w('export type Database = {')
w('  public: {')
w('    Tables: {')

for (const tabla of Object.keys(defs).sort()) {
  const props = defs[tabla].properties ?? {}
  const req = new Set(defs[tabla].required ?? [])
  const cols = Object.keys(props).sort()
  w(`      ${tabla}: {`)

  w('        Row: {')
  for (const c of cols) {
    const t = tsTipo(props[c])
    w(`          ${c}: ${req.has(c) ? t : `${t} | null`}`)
  }
  w('        }')

  w('        Insert: {')
  for (const c of cols) {
    const t = tsTipo(props[c])
    const obligatorio = req.has(c) && props[c].default === undefined
    w(`          ${c}${obligatorio ? '' : '?'}: ${req.has(c) ? t : `${t} | null`}`)
  }
  w('        }')

  w('        Update: {')
  for (const c of cols) {
    const t = tsTipo(props[c])
    w(`          ${c}?: ${req.has(c) ? t : `${t} | null`}`)
  }
  w('        }')

  const rels = cols
    .map((c) => [c, fkDe(props[c])])
    .filter(([, fk]) => fk && defs[fk[1]])
  if (rels.length) {
    w('        Relationships: [')
    for (const [col, fk] of rels) {
      w('          {')
      w(`            foreignKeyName: "${tabla}_${col}_fkey"`)
      w(`            columns: ["${col}"]`)
      w(`            isOneToOne: ${unicas.has(`${tabla}.${col}`)}`)
      w(`            referencedRelation: "${fk[1]}"`)
      w(`            referencedColumns: ["${fk[2]}"]`)
      w('          },')
    }
    w('        ]')
  } else {
    w('        Relationships: []')
  }
  w('      }')
}

w('    }')
w('    Views: {')
w('      [_ in never]: never')
w('    }')
w('    Functions: {')
for (const nombre of Object.keys(RPCS).sort()) {
  w(`      ${nombre}: {`)
  w(`        Args: ${RPCS[nombre].args}`)
  w(`        Returns: ${RPCS[nombre].returns}`)
  w('      }')
}
w('    }')
w('    Enums: {')
for (const e of Object.keys(enums).sort()) {
  w(`      ${e}: ${enums[e].map((v) => `'${v}'`).join(' | ')}`)
}
w('    }')
w('    CompositeTypes: {')
w('      [_ in never]: never')
w('    }')
w('  }')
w('}')
w()
w('type PublicSchema = Database["public"]')
w()
w('export type Tables<T extends keyof PublicSchema["Tables"]> =')
w('  PublicSchema["Tables"][T]["Row"]')
w('export type TablesInsert<T extends keyof PublicSchema["Tables"]> =')
w('  PublicSchema["Tables"][T]["Insert"]')
w('export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =')
w('  PublicSchema["Tables"][T]["Update"]')
w('export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]')
w()

writeFileSync(SALIDA, out.join('\r\n'), 'utf8')
console.log(
  `${SALIDA}: ${Object.keys(defs).length} tablas, ${Object.keys(enums).length} enums, ${out.length} líneas`,
)
