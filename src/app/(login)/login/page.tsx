import { LoginChrome } from './login-chrome'

export const metadata = {
  title: 'Iniciar sesión — TalentID',
}

// Motivos por los que la política de sesión pudo haber cerrado la sesión.
const MOTIVO_MENSAJE: Record<string, string> = {
  inactividad: 'Cerramos tu sesión por inactividad. Volvé a ingresar.',
  revocada: 'Un administrador finalizó tu sesión. Volvé a ingresar.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ motivo?: string }>
}) {
  const { motivo } = await searchParams
  const aviso = motivo ? MOTIVO_MENSAJE[motivo] : undefined

  return <LoginChrome aviso={aviso} />
}
