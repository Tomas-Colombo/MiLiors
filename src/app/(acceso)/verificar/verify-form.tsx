'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DOC } from '@/lib/constants/documento'
import { Papel, PapelHeader } from '@/components/shared/documento-papel'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Buscador de certificados, con el mismo skin que el certificado emitido: quien
 * llega con el PDF (o con el QR) reconoce el documento antes de leer nada.
 *
 * Valida el formato del ID en el cliente para no navegar a `/verificar/[id]`
 * con una cadena que la consulta nunca podría encontrar; el resultado real lo
 * resuelve esa ruta contra la base.
 */
export function VerifyForm() {
  const router = useRouter()
  const [id, setId] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
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
    setChecking(true)
    router.push(`/verificar/${trimmed}`)
  }

  return (
    <Papel>
      {/* El mismo token de navy que pinta el panel derecho de la pantalla de
          acceso (`--doc-bg`), para que los dos azules no compitan. */}
      <PapelHeader titulo="Verificación criptográfica" bg="var(--doc-bg)" />

      <form className="px-5 pb-6 pt-5" onSubmit={handleSubmit}>
        <h2 className="text-[21px] font-extrabold leading-tight" style={{ color: DOC.navy }}>
          Comprueba un certificado ahora.
        </h2>
        <p className="mt-1.5 text-[12.5px] leading-relaxed" style={{ color: DOC.soft }}>
          Cada certificado que emite MiLiors lleva una firma única e irrepetible. Ingresá su ID y
          confirmá que es real: sin llamados de referencia, sin PDF editables, sin dudas.
        </p>

        <label
          className="mt-5 block text-[10.5px] font-bold uppercase tracking-[0.09em]"
          style={{ color: DOC.muted }}
          htmlFor="verificar-id"
        >
          ID de verificación
        </label>
        <input
          id="verificar-id"
          className="mt-1.5 h-10 w-full rounded-md px-3 text-[13px] outline-none transition-[border,box-shadow]"
          style={{
            border: `1px solid ${error ? '#e8756e' : DOC.line}`,
            backgroundColor: DOC.white,
            color: DOC.ink,
          }}
          placeholder="Pegá el ID de verificación…"
          value={id}
          onChange={e => {
            setId(e.target.value)
            setError('')
          }}
          autoComplete="off"
          spellCheck={false}
        />
        {error && (
          <div className="mt-1.5 text-[11.5px]" style={{ color: '#c2453d' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={checking}
          className="mt-3 h-10 w-full cursor-pointer rounded-md text-[13px] font-bold tracking-wide transition-opacity disabled:opacity-60"
          style={{ backgroundColor: DOC.navy, color: DOC.goldLight, borderBottom: `2px solid ${DOC.gold}` }}
        >
          {checking ? 'Abriendo…' : 'Verificar certificado'}
        </button>

        <p className="mt-3 text-[11px] leading-relaxed" style={{ color: DOC.faint }}>
          El ID figura al pie de cada certificado emitido por MiLiors, con el formato{' '}
          <code style={{ fontFamily: 'var(--mono, ui-monospace, monospace)' }}>
            ef24e3b5-040d-43c9-99c8-57f2cb0649de
          </code>
          .
        </p>
      </form>
    </Papel>
  )
}
