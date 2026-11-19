import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { USERS, ENV_VARS, type Role } from '../fixtures/auth'
import { completarPuestoMinimo } from './puestos'

/**
 * Publishes a minimal PRIVADA puesto as the logged-in recruiter and returns its id.
 * Same flow as publicarPuesto, plus picking "Privado" in "¿Quién puede ver este puesto?".
 */
export async function publicarPuestoPrivado(page: Page, titulo: string): Promise<string> {
  await completarPuestoMinimo(page, titulo)
  await page.locator('label', { hasText: 'Privado' }).click()
  await page.getByRole('button', { name: 'Publicar puesto' }).click()

  const aviso = page.getByRole('dialog', { name: 'Tu puesto fue publicado' })
  await aviso.getByRole('button', { name: 'Entendido, ir al puesto' }).click({ timeout: 15000 })
  await page.waitForURL(/\/reclutador\/puestos\/[0-9a-f-]{36}$/, { timeout: 15000 })
  return page.url().split('/').pop()!
}

/** The share link shown in the "Compartir" card of the recruiter's puesto detail. */
export async function leerLinkCompartir(page: Page): Promise<string> {
  const campo = page.getByLabel('Link para compartir el puesto')
  await expect(campo).toBeVisible()
  const link = await campo.inputValue()
  expect(link).toMatch(/\/empleos\/[A-Za-z0-9_-]{32}$/)
  return link
}

/** Token part of `/empleos/{token}`. */
export function tokenDeLink(link: string): string {
  return link.split('/empleos/')[1]
}

/** Fresh browser context with no session: what an anonymous visitor of a shared link sees. */
export async function contextoAnonimo(
  browser: Browser,
  baseURL: string | undefined,
): Promise<BrowserContext> {
  return browser.newContext({ baseURL })
}

/**
 * Fills the login form currently on screen (it keeps `next` from the URL) and submits.
 * Unlike loginAs it does not wait for the role dashboard: callers assert the landing URL.
 */
export async function ingresarEnPantalla(page: Page, role: Role): Promise<void> {
  const email = process.env[ENV_VARS[role].emailKey]
  const password = process.env[ENV_VARS[role].passwordKey]
  if (!email || !password) {
    throw new Error(`Faltan las variables E2E de ${role} (${USERS[role].dashboard})`)
  }
  await page.locator('[name="email"]').fill(email)
  await page.locator('[name="password"]').fill(password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
}
