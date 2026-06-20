// Página pública de verificación de certificado — implementación completa en Fase 5
export default function VerificarPage({ params }: { params: { id: string } }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-page px-4">
      <div className="text-center">
        <h1 className="text-h1 font-extrabold text-ink">Verificando certificado...</h1>
        <p className="mt-2 text-muted">ID: {params.id}</p>
      </div>
    </div>
  )
}
