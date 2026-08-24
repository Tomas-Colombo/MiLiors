import Link from 'next/link'
import { Alert } from '@/components/ui'

/**
 * Aviso de que hace falta un certificado vigente para poder postularse.
 *
 * Aparece igual en el listado de puestos y en el detalle de uno; estaba escrito
 * a mano y duplicado en las dos pantallas, con su propio borde, su ícono y su
 * enlace subrayado. Vive acá y usa el `Alert` del kit.
 */
export function AvisoCertificado({ sinCertificado }: { sinCertificado: boolean }) {
  return (
    <Alert
      tone="warning"
      title={
        sinCertificado
          ? 'Necesitás un certificado para postularte.'
          : 'Tu certificado está desactualizado.'
      }
    >
      <Link
        href="/postulante/certificado"
        className="font-semibold underline underline-offset-2 hover:text-warning-strong"
      >
        {sinCertificado ? 'Generá tu certificado' : 'Generá uno nuevo'}
      </Link>
    </Alert>
  )
}
