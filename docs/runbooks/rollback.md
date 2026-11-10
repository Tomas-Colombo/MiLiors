# Runbook: Rollback en Vercel (Instant Rollback)

> **Estado:** Borrador — revisar con Tomás.
> **Última actualización:** Noviembre 2026.

## 1. Contexto y advertencia crítica de base de datos

> [!WARNING]
> **Base de datos compartida:** Actualmente el entorno de desarrollo y producción comparten la misma instancia de base de datos en Supabase. Un rollback en Vercel revierte **únicamente el código del frontend y las server actions**, pero **NO revierte datos, filas insertadas ni el esquema DDL** de PostgreSQL.

### Regla de compatibilidad hacia atrás (Expand and Contract)
Cualquier migración en la base de datos debe diseñarse para ser tolerante a versiones anteriores del código:
- **Agregar antes de borrar:** Nuevas columnas o tablas se agregan como opcionales (`NULL`) o con valores por defecto.
- **Transición en dos pasos:** El código nuevo se despliega primero. El borrado de columnas viejas solo se ejecuta cuando ya no haya versiones activas que las consulten.
- Si un deploy fallido introdujo una migración DDL incompatible, **un rollback de código en Vercel por sí solo puede causar errores 500** si el código viejo no tolera el esquema modificado.

---

## 2. Procedimiento de Instant Rollback en Vercel

1. **Ingresar a Vercel:** Acceder al dashboard del proyecto MiLiors.
2. **Sección Deployments:** Ir a la pestaña **Deployments**.
3. **Identificar el deployment estable:** Localizar el último deployment en producción previo al incidente (verificar hash de commit git y timestamp).
4. **Ejecutar Rollback:**
   - Hacer clic en el menú contextual (`...`) del deployment anterior.
   - Seleccionar **Instant Rollback** (o **Promote to Production**).
   - Confirmar la acción en el diálogo emergente.
5. **Propagación:** Vercel redirigirá el tráfico del dominio principal a la versión seleccionada de inmediato (habitualmente < 30 segundos).

---

## 3. Checklist de verificación post-rollback

Completar inmediatamente después de ejecutar el rollback:

- [ ] **Estado general de la plataforma:**
  - [ ] El dominio principal responde con HTTP 200.
  - [ ] La pantalla de acceso (`/iniciar-sesion`, `/registro`) renderiza correctamente sin errores 500.
- [ ] **Autenticación y sesiones:**
  - [ ] Inicio de sesión exitoso con una cuenta de prueba.
  - [ ] El proxy / middleware refresca la sesión sin bucles de redirección.
- [ ] **Lectura y escritura en PostgreSQL:**
  - [ ] Postulante: lectura de perfil y navegación por `/postulante`.
  - [ ] Reclutador: visualización de puestos en `/reclutador/puestos`.
- [ ] **Logs y observabilidad:**
  - [ ] Monitorear la pestaña **Runtime Logs** en Vercel: confirmar ausencia de errores `500` no controlados o errores de variables faltantes (`env.ts`).
  - [ ] Revisar Supabase Logs Explorer para descartar fallos masivos de RLS o de RPC (`check_session`).
- [ ] **Comunicación:** Notificar al equipo el estado del rollback y el commit activo en producción.
