# Testing Setup

## Reducir test de eneagrama a 5 preguntas

Para testing rápido sin responder 135 preguntas:

### Opción 1: SQL directo (más simple)

Pegá esto en el **SQL Editor** de tu dashboard Supabase:

```sql
DELETE FROM pregunta_eneagrama WHERE numero_pregunta > 5;
```

✅ Después: responde 5 preguntas y el test se completa.

### Opción 2: Con script Node.js

```bash
node scripts/trim-eneagrama-for-testing.mjs
```

Para revertir (restaurar todas las 135):
```bash
node scripts/trim-eneagrama-for-testing.mjs --restore
```

### Opción 3: Con Supabase CLI

```bash
supabase db push --remote
```

(Solo funciona si tenés `supabase` CLI instalado)

## Cómo funciona

- El código (`src/modules/eneagrama/actions.ts`) valida `MIN_RESPUESTAS = 5` en dev y `135` en prod
- Las preguntas 6-135 se borran de la BD
- El wizard respeta cualquier cantidad de preguntas que existan

## Revertir cambios

```sql
-- Restaurar todas las preguntas originales
-- (si usaste DELETE, es irreversible sin backup)
-- La mejor forma es hacer un nuevo seed de la DB original
```

**Pro tip:** Usa `supabase db reset` si necesitás empezar del cero con seed completo.
