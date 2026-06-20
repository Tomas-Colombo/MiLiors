import { getTyCStatus } from '@/lib/dal'
import { TyCModal } from './tyc-modal'

export async function TyCGate({ children }: { children: React.ReactNode }) {
  const status = await getTyCStatus()

  if (!status || status.aceptada) {
    return <>{children}</>
  }

  return (
    <>
      {children}
      <TyCModal tyc={status.tyc as { id: string; version: string; descripcion: string; fecha_publicacion: string }} />
    </>
  )
}
