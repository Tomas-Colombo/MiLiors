# Runbook: Configuración de Protección contra Contraseñas Filtradas (Supabase Auth)

> **Estado:** Pendiente de configuración manual por Tomás. **NO activar automáticamente desde el agente.**
> **Hallazgo asociado:** [H-007](../estudio/hallazgos.md) (Advisor de seguridad de Supabase Auth).

## 1. Motivo

El Security Advisor de Supabase señala que la protección contra contraseñas vulneradas o filtradas (HaveIBeenPwned) se encuentra desactivada por defecto en el proyecto productivo. Activar esta protección bloquea en el momento del registro o cambio de contraseña cualquier password que figure en bases de datos públicas de credenciales comprometidas.

---

## 2. Pasos manuales en Supabase Dashboard

> [!IMPORTANT]
> Esta configuración requiere privilegios de propietario / administrador en el Dashboard de Supabase.

1. Iniciar sesión en [Supabase Dashboard](https://supabase.com/dashboard).
2. Seleccionar el proyecto correspondiente a **MiLiors**.
3. En la barra lateral izquierda, ir a **Authentication** (ícono de candado o usuario).
4. Navegar a la sección **Security and Protection** (o **Providers / Email Settings** según la versión de la UI).
5. Localizar el apartado **Password Security** / **Leaked Password Protection**.
6. Activar la opción **Prevent use of compromised passwords** (o **Enforce leaked password detection** vía HaveIBeenPwned integration).
7. Guardar los cambios haciendo clic en **Save changes**.

---

## 3. Validación

Una vez activado:
1. Intentar registrar una cuenta de prueba o cambiar contraseña con un password notoriamente filtrado (ej: `Password123!`).
2. Confirmar que Supabase Auth rechaza la solicitud indicando que la contraseña elegida no es segura.
3. Volver a ingresar una contraseña fuerte y confirmar que el registro o cambio procede con normalidad.
