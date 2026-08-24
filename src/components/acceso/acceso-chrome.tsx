import type { ReactNode } from 'react'
import Link from 'next/link'
import { BrandLogo } from '@/components/shared/brand-logo'
import { FloatingPaths } from './floating-paths'

/**
 * Pantalla de entrada a MiLiors: panel izquierdo con la marca, el manifiesto y
 * las pestañas, y panel derecho con los trazos animados.
 *
 * La comparten /login y /verificar: verificar un certificado es una puerta de
 * entrada más, no una pantalla aparte. Lo que cambia entre una y otra es sólo
 * el contenido bajo las pestañas.
 *
 * Va siempre en claro, sin selector de tema: es la cara pública de MiLiors y no
 * sigue el `.dark` que el usuario haya dejado elegido en el panel autenticado
 * (ver el tema fijo de acceso.css).
 */

const TABS = [
  { id: 'ingresar', label: 'Ingresar', href: '/login' },
  { id: 'crear', label: 'Crear cuenta', href: '/registro' },
  { id: 'verificar', label: 'Verificar certificado', href: '/verificar' },
] as const

export type AccesoTab = (typeof TABS)[number]['id']

export function AccesoChrome({
  tab,
  children,
}: {
  /** Pestaña activa. Se omite en /recuperar-password, que no es ninguna. */
  tab?: AccesoTab
  children: ReactNode
}) {
  return (
    <div className="tid-login">
      {/* Columna izquierda · panel activo */}
      <div className="tid-form">
        <div className="tid-brand">
          <BrandLogo size={56} className="tid-brand-mark" />
          <div>
            <div className="tid-logo">MiLiors</div>
            <div className="tid-logo-tagline">Talentos al servicio del mundo</div>
          </div>
        </div>

        <div className="tid-form-body">
          <h1 className="tid-h1">
            Conoce tus <em>talentos</em> y compártelos.
          </h1>
          <p className="tid-subhead">
            Un solo acceso para revelar tu personalidad, conocer tu potencial laboral, cargar tu
            perfil técnico y compartir todo con certificados verificados.
          </p>

          {/* Son enlaces a tres rutas, no pestañas: cada una es una navegación
              completa, no un panel que se muestra y se oculta. Con `role="tab"`
              el lector de pantalla prometía un tabpanel que no existe y un
              manejo de flechas que tampoco. `aria-current="page"` es lo que
              corresponde a una navegación; el resaltado lo sigue dando
              `data-active`, así que el aspecto no cambia. */}
          <nav aria-label="Acceso a MiLiors" className="tid-tabs">
            {TABS.map(t => (
              <Link
                key={t.id}
                href={t.href}
                aria-current={t.id === tab ? 'page' : undefined}
                data-active={t.id === tab}
                className="tid-tab"
              >
                {t.label}
              </Link>
            ))}
          </nav>

          {children}
        </div>

        <div className="tid-copyright">© 2026 MiLiors · Firma criptográfica de cada certificado</div>
      </div>

      {/* Columna derecha · manifiesto de marca sobre los trazos animados */}
      <div className="tid-doc">
        <FloatingPaths />

        <div className="tid-doc-hero">
          <h2 className="tid-doc-h2">
            El mundo no necesita más CV. Necesita personas <em>conscientes de su verdadero
            potencial</em>.
          </h2>
          <p className="tid-doc-p">
            Cada certificado que emite MiLiors lleva una firma única e irrepetible. Cualquiera
            puede comprobar que es real: sin llamados de referencia, sin PDF editables, sin dudas.
          </p>
        </div>
      </div>
    </div>
  )
}
