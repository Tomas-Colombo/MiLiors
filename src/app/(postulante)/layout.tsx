// Layout del postulante — sidebar y navegación se agregarán en Fase 1
export default function PostulanteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="min-h-screen bg-surface-page">{children}</div>
}
