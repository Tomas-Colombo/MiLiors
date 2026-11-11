import { Page } from '@playwright/test'

export const ENV_VARS = {
  postulante: {
    emailKey: 'E2E_POSTULANTE_EMAIL',
    passwordKey: 'E2E_POSTULANTE_PASSWORD',
  },
  reclutador: {
    emailKey: 'E2E_RECLUTADOR_EMAIL',
    passwordKey: 'E2E_RECLUTADOR_PASSWORD',
  },
  // Recién registrado: sin perfil ni empresa, todo el área lo manda al onboarding.
  reclutadorSinEmpresa: {
    emailKey: 'E2E_RECLUTADOR_SIN_EMPRESA_EMAIL',
    passwordKey: 'E2E_RECLUTADOR_SIN_EMPRESA_PASSWORD',
  },
  admin: {
    emailKey: 'E2E_ADMIN_EMAIL',
    passwordKey: 'E2E_ADMIN_PASSWORD',
  },
} as const

export const USERS = {
  postulante: {
    get email() {
      return process.env.E2E_POSTULANTE_EMAIL ?? ''
    },
    get password() {
      return process.env.E2E_POSTULANTE_PASSWORD ?? ''
    },
    dashboard: '/postulante',
  },
  reclutador: {
    get email() {
      return process.env.E2E_RECLUTADOR_EMAIL ?? ''
    },
    get password() {
      return process.env.E2E_RECLUTADOR_PASSWORD ?? ''
    },
    dashboard: '/reclutador',
  },
  reclutadorSinEmpresa: {
    get email() {
      return process.env.E2E_RECLUTADOR_SIN_EMPRESA_EMAIL ?? ''
    },
    get password() {
      return process.env.E2E_RECLUTADOR_SIN_EMPRESA_PASSWORD ?? ''
    },
    dashboard: '/reclutador/onboarding',
  },
  admin: {
    get email() {
      return process.env.E2E_ADMIN_EMAIL ?? ''
    },
    get password() {
      return process.env.E2E_ADMIN_PASSWORD ?? ''
    },
    dashboard: '/admin',
  },
} as const

export type Role = keyof typeof USERS

/** Logs in as the given role and waits for the dashboard to load. */
export async function loginAs(page: Page, role: Role): Promise<void> {
  const envConfig = ENV_VARS[role]
  const email = process.env[envConfig.emailKey]
  if (!email) {
    throw new Error(`Falta la variable de entorno obligatoria para E2E: ${envConfig.emailKey}`)
  }

  const password = process.env[envConfig.passwordKey]
  if (!password) {
    throw new Error(`Falta la variable de entorno obligatoria para E2E: ${envConfig.passwordKey}`)
  }

  const user = USERS[role]

  // Navigate to login; if an active session redirects us away, log out first
  await page.goto('/iniciar-sesion')
  const current = page.url()
  if (!current.includes('/iniciar-sesion')) {
    // We were redirected — an active session exists, log it out
    const logoutBtn = page.getByRole('button', { name: /cerrar sesi/i })
    if (await logoutBtn.count() > 0) {
      await logoutBtn.click()
      await page.waitForURL('**/iniciar-sesion**')
    } else {
      // Fallback: clear cookies and navigate again
      await page.context().clearCookies()
      await page.goto('/iniciar-sesion')
    }
  }

  await page.locator('[name="email"]').fill(email)
  await page.locator('[name="password"]').fill(password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await page.waitForURL(`**${user.dashboard}**`)
}

/** Logs out from any authenticated page. */
export async function logout(page: Page): Promise<void> {
  await page.getByRole('button', { name: /cerrar sesi/i }).click()
  await page.waitForURL('**/iniciar-sesion**')
}
