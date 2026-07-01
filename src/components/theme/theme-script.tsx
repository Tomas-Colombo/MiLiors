import { InlineScript } from './inline-script'

// Se ejecuta antes del primer paint para evitar el flash de tema/sidebar
// incorrecto (FOUC): lee las preferencias guardadas y aplica las clases
// correspondientes al <html> antes de que el navegador pinte el body.
//
// Regla de tema: el modo claro es el predeterminado para todos los usuarios.
// El modo oscuro solo se activa si el usuario lo eligió explícitamente
// (localStorage === 'dark'). La preferencia del sistema operativo se ignora
// para garantizar consistencia entre sesiones.
const BOOT_HTML = `(function(){try{if(localStorage.getItem('talentid-theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}try{if(localStorage.getItem('talentid-sidebar-collapsed')==='true')document.documentElement.classList.add('sidebar-collapsed')}catch(e){}})();`

export function ThemeScript() {
  return <InlineScript html={BOOT_HTML} />
}
