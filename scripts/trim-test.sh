#!/bin/bash
# Reduce eneagrama a 5 preguntas para testing
# Uso: ./scripts/trim-test.sh

set -e

echo "🧪 Trimming eneagrama to 5 questions for testing..."

# Opción 1: Usar supabase CLI si está instalado
if command -v supabase &> /dev/null; then
  supabase db push --remote --skip-seed 2>/dev/null && {
    echo "✓ Migration applied via supabase CLI"
    exit 0
  }
fi

# Opción 2: SQL directo con curl (necesita SUPABASE_SERVICE_ROLE_KEY en env)
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ SUPABASE_SERVICE_ROLE_KEY not set"
  echo ""
  echo "Opciones:"
  echo "1. Instala supabase CLI: npm install -g supabase"
  echo "2. O pega esto en el SQL Editor de Supabase dashboard:"
  echo "   DELETE FROM pregunta_eneagrama WHERE numero_pregunta > 5;"
  exit 1
fi

curl -s -X POST \
  "$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d= -f2)/rest/v1/rpc/exec" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sql":"DELETE FROM pregunta_eneagrama WHERE numero_pregunta > 5;"}' | grep -q error && {
  echo "✗ SQL execution failed"
  exit 1
} || echo "✓ Trimmed to 5 questions"
