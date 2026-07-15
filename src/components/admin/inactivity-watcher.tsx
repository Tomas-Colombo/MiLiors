'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Modal, Button } from '@/components/ui'
import { AlertTriangleIcon } from '@/components/icons'
import { cerrarSesionPorInactividad } from '@/modules/auth/actions'
import { SESSION_POLICY } from '@/lib/session/policy'

// Eventos que cuentan como actividad real del usuario.
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const

/**
 * Cierra la sesión del administrador tras 1 hora de inactividad, con un aviso
 * previo (modal + cuenta regresiva). Sólo debe montarse en el layout de admin.
 *
 * El proxy es la red de seguridad server-side; esto es la capa de UX/tiempo real.
 * No toca Supabase Auth: al vencer, invoca el signOut() nativo vía server action.
 */
export function InactivityWatcher() {
  const [showWarning, setShowWarning] = useState(false)
  const [remainingMs, setRemainingMs] = useState(SESSION_POLICY.ADMIN.warningBeforeMs)
  const lastActivityRef = useRef(0)
  const lastHeartbeatRef = useRef(0)
  const loggingOutRef = useRef(false)
  const showWarningRef = useRef(false)

  const sendHeartbeat = useCallback(() => {
    const now = Date.now()
    if (now - lastHeartbeatRef.current < SESSION_POLICY.heartbeatIntervalMs) return
    lastHeartbeatRef.current = now
    void fetch('/api/session/heartbeat', { method: 'POST', keepalive: true }).catch(() => {})
  }, [])

  const registerActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
    sendHeartbeat()
  }, [sendHeartbeat])

  const logout = useCallback(async () => {
    if (loggingOutRef.current) return
    loggingOutRef.current = true
    await cerrarSesionPorInactividad()
  }, [])

  const seguirConectado = useCallback(() => {
    setShowWarning(false)
    showWarningRef.current = false
    registerActivity()
  }, [registerActivity])

  // Escucha de actividad. Mientras el modal está abierto NO cuenta como
  // actividad: el usuario debe elegir explícitamente "Seguir conectado".
  useEffect(() => {
    const onActivity = () => {
      if (!showWarningRef.current) registerActivity()
    }
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }))
    return () => ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity))
  }, [registerActivity])

  // Reloj: evalúa inactividad y maneja el aviso previo + cierre.
  useEffect(() => {
    // Sembrar la actividad al montar (no en render: Date.now() es impuro).
    lastActivityRef.current = Date.now()
    const { inactivityLimitMs, warningBeforeMs } = SESSION_POLICY.ADMIN
    const id = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current

      if (elapsed >= inactivityLimitMs) {
        void logout()
        return
      }

      if (elapsed >= inactivityLimitMs - warningBeforeMs) {
        if (!showWarningRef.current) {
          showWarningRef.current = true
          setShowWarning(true)
        }
        setRemainingMs(inactivityLimitMs - elapsed)
      } else if (showWarningRef.current) {
        showWarningRef.current = false
        setShowWarning(false)
      }
    }, SESSION_POLICY.checkIntervalMs)
    return () => clearInterval(id)
  }, [logout])

  const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000))
  const mm = Math.floor(remainingSec / 60)
  const ss = remainingSec % 60

  return (
    <Modal
      open={showWarning}
      onClose={seguirConectado}
      icon={
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-warning-bg text-warning">
          <AlertTriangleIcon size={22} strokeWidth={2.5} />
        </span>
      }
      title="¿Seguís ahí?"
      footer={
        <>
          <Button variant="secondary" className="flex-1" onClick={() => void logout()}>
            Cerrar sesión
          </Button>
          <Button className="flex-1" onClick={seguirConectado}>
            Seguir conectado
          </Button>
        </>
      }
    >
      Por seguridad, tu sesión se cerrará por inactividad en{' '}
      <span className="font-semibold text-ink">
        {mm}:{ss.toString().padStart(2, '0')}
      </span>
      . Movete o hacé clic para seguir conectado.
    </Modal>
  )
}
