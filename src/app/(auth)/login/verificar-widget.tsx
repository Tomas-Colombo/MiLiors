'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, Input, Field } from '@/components/ui'
import { ShieldIcon } from '@/components/icons'

export function VerificarWidget() {
  const router = useRouter()
  const [id, setId] = useState('')
  const [error, setError] = useState('')

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  function handleVerificar() {
    const trimmed = id.trim()
    if (!trimmed) {
      setError('Ingresá el ID del certificado.')
      return
    }
    if (!UUID_RE.test(trimmed)) {
      setError('El ID debe tener el formato correcto (ej: ef24e3b5-040d-43c9-99c8-57f2cb0649de).')
      return
    }
    setError('')
    router.push(`/verificar/${trimmed}`)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleVerificar()
  }

  return (
    <div className="mt-8">
      <div className="relative flex items-center gap-3 text-muted text-xs mb-5">
        <div className="flex-1 h-px bg-neutral-200" />
        <span className="font-medium uppercase tracking-wider">Verificar certificado</span>
        <div className="flex-1 h-px bg-neutral-200" />
      </div>

      <Card padding="lg">
        <div className="flex items-center gap-2 mb-3">
          <ShieldIcon size={16} className="text-primary-600 flex-none" />
          <p className="text-[13px] font-semibold text-ink">
            Verificar un certificado TalentID
          </p>
        </div>
        <p className="text-xs text-muted mb-4">
          Pegá el ID de verificación del certificado para comprobar su autenticidad.
        </p>

        <Field error={error}>
          <Input
            placeholder="ej: ef24e3b5-040d-43c9-99c8-57f2cb0649de"
            value={id}
            onChange={e => { setId(e.target.value); setError('') }}
            onKeyDown={handleKeyDown}
            status={error ? 'error' : undefined}
            className="font-mono text-[12px]"
          />
        </Field>

        <Button
          variant="secondary"
          size="sm"
          className="mt-3 w-full"
          onClick={handleVerificar}
          disabled={!id.trim()}
        >
          Verificar
        </Button>
      </Card>
    </div>
  )
}
