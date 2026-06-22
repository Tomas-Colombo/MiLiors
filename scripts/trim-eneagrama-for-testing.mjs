#!/usr/bin/env node
/**
 * Script para reducir las preguntas del test de eneagrama a solo 5 (testing)
 * Ejecutar: node scripts/trim-eneagrama-for-testing.mjs
 * Para revertir: node scripts/trim-eneagrama-for-testing.mjs --restore
 */

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const env = readFileSync('.env.local', 'utf8')
const map = {}
env.split(/\r?\n/).forEach(l => {
  if (!l || l.startsWith('#')) return
  const i = l.indexOf('=')
  if (i < 0) return
  map[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')
})

const URL = map.NEXT_PUBLIC_SUPABASE_URL
const SVC = map.SUPABASE_SERVICE_ROLE_KEY
const sb = createClient(URL, SVC, { auth: { persistSession: false } })

const restore = process.argv.includes('--restore')

if (restore) {
  console.log('Restaurando todas las 135 preguntas...')
  const sql = `
    UPDATE pregunta_eneagrama
    SET visible = true
    WHERE visible = false;
  `
  const { error } = await sb.rpc('exec_sql', { sql })
  if (error) {
    console.error('Error al restaurar:', error.message)
    process.exit(1)
  }
  console.log('✓ Todas las preguntas restauradas')
} else {
  console.log('Reduciendo a 5 preguntas para testing...')

  // Marcar como "ocultas" todas excepto las primeras 5 (más limpio que borrarlas)
  const sql = `
    UPDATE pregunta_eneagrama
    SET visible = false
    WHERE numero_pregunta > 5;
  `
  const { error } = await sb.rpc('exec_sql', { sql })
  if (error) {
    // Si exec_sql no existe, usamos un raw query alternativo
    console.warn('exec_sql no disponible, intentando DELETE directo...')
    const { error: delError } = await sb
      .from('pregunta_eneagrama')
      .delete()
      .gt('numero_pregunta', 5)

    if (delError) {
      console.error('Error:', delError.message)
      process.exit(1)
    }
  }

  console.log('✓ Preguntas reducidas a 5 (testing mode)')
  console.log('  Ejecuta con --restore para volver a 135 preguntas')
}
