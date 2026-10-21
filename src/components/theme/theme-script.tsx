import { InlineScript } from './inline-script'

// Se ejecuta antes del primer paint para evitar el flash de tema incorrecto
// (FOUC): lee la preferencia guardada y aplica la clase correspondiente al
// <html> antes de que el navegador pinte el body. (El estado de la barra
// lateral viaja en una cookie que leen los layouts: ver lib/sidebar-prefs.)
//
// Regla de tema: el modo claro es el predeterminado para todos los usuarios.
// El modo oscuro solo se activa si el usuario lo eligió explícitamente
// (localStorage === 'dark'). La preferencia del sistema operativo se ignora
// para garantizar consistencia entre sesiones.
const BOOT_HTML = `(function(){try{if(localStorage.getItem('miliors-theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}})();`

export function ThemeScript() {
  return <InlineScript html={BOOT_HTML} />
}
