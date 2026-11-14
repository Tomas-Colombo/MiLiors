# Testing Setup

## Reducir test de eneagrama a 5 preguntas

Para testing rápido sin responder 135 preguntas:

> [!WARNING]
> **Solo contra el stack local** (`supabase start`, Studio en http://127.0.0.1:55323). El dashboard de Supabase y el CLI linkeado apuntan a **producción**: estos pasos borran preguntas reales del test. Ver `AGENTS.md`.

### Opción 1: SQL directo (más simple)

Pegá esto en el **SQL Editor** del Studio local:

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
