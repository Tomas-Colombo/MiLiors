import { Page } from '@playwright/test'

export const USERS = {
  postulante: {
    email: 'tomycolombo2009@hotmail.com',
    password: 'Colombocapo2000',
    dashboard: '/postulante',
  },
  reclutador: {
    email: 'reclutador@gmail.com',
    password: 'Admin1234!',
    dashboard: '/reclutador',
  },
  admin: {
    email: 'admin@admin.con',
    password: 'Admin1234!',
    dashboard: '/admin',
  },
} as const

export type Role = keyof typeof USERS

/** Logs in as the given role and waits for the dashboard to load. */
export async function loginAs(page: Page, role: Role): Promise<void> {
  const user = USERS[role]

  // Navigate to login; if an active session redirects us away, log out first
  await page.goto('/login')
  const current = page.url()
  if (!current.includes('/login')) {
    // We were redirected — an active session exists, log it out
    const logoutBtn = page.getByRole('button', { name: /cerrar sesi/i })
    if (await logoutBtn.count() > 0) {
      await logoutBtn.click()
      await page.waitForURL('**/login**')
    } else {
      // Fallback: clear cookies and navigate again
      await page.context().clearCookies()
      await page.goto('/login')
    }
  }

  await page.locator('[name="email"]').fill(user.email)
  await page.locator('[name="password"]').fill(user.password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await page.waitForURL(`**${user.dashboard}**`)
}

/** Logs out from any authenticated page. */
export async function logout(page: Page): Promise<void> {
  await page.getByRole('button', { name: /cerrar sesi/i }).click()
  await page.waitForURL('**/login**')
}
