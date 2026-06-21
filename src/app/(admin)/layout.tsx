import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { ShieldIcon } from '@/components/icons'
import { AdminNav } from './admin-nav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession()

  if (session.rol !== 'ADMIN') {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen bg-surface-page">
      {/* Sidebar */}
      <aside className="flex w-56 flex-none flex-col border-r border-neutral-200 bg-surface px-3 py-5">
        {/* Logo / brand */}
        <div className="mb-6 flex items-center gap-2.5 px-3">
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] bg-primary-tint text-primary-600">
            <ShieldIcon size={16} />
          </span>
          <span className="text-[13.5px] font-bold text-ink">TalentID Admin</span>
        </div>

        <AdminNav />

        {/* Bottom: admin info */}
        <div className="mt-auto border-t border-neutral-100 pt-4 px-3">
          <p className="text-[11.5px] font-semibold text-muted truncate">{session.email}</p>
          <p className="text-[11px] text-neutral-400">Administrador</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
