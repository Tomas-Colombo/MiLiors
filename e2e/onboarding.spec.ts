import { test, expect } from '@playwright/test'
import { loginAs } from './fixtures/auth'
import { confirmarEmail } from './support/datos-e2e'

// TC-ONB-* — M02 Onboarding Reclutador / M03 Onboarding Postulante
//
// The fixed accounts are seeded by e2e/global-setup.ts: `reclutador` already has
// a company, `reclutadorSinEmpresa` is freshly registered and must see the form.

test.describe('M02 — Onboarding Reclutador: guard', () => {
  test('TC-ONB-REC-007 — Reclutador con empresa → redirige al dashboard', async ({ page }) => {
    await loginAs(page, 'reclutador')
    await page.goto('/reclutador/onboarding')
    await expect(page).toHaveURL(/\/reclutador\/puestos/)
  })
})

test.describe('M02 — Onboarding Reclutador: validaciones', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'reclutadorSinEmpresa')
    await page.goto('/reclutador/onboarding')
  })

  test('TC-ONB-REC-003 — nombre_empresa < 2 chars → error', async ({ page }) => {
    await page.locator('[name="nombre_empresa"]').fill('A')
    await page.getByRole('button', { name: 'Guardar empresa y continuar' }).click()
    await expect(page.getByText('Ingresá el nombre de la empresa.')).toBeVisible()
  })

  test('TC-ONB-REC-005 — url_empresa con formato inválido → error de validación', async ({ page }) => {
    await page.locator('form').evaluate((form: HTMLFormElement) => {
      form.noValidate = true
    })
    await page.locator('[name="nombre_empresa"]').fill('Empresa Test')
    await page.locator('[name="link_url"]').fill('no-es-una-url')
    await page.getByRole('button', { name: 'Guardar empresa y continuar' }).click()
    await expect(page.getByText('Ingresá una URL válida.')).toBeVisible({ timeout: 8000 })
    await expect(page).not.toHaveURL(/\/reclutador\/puestos/)
  })
})

test.describe('M03 — Onboarding Postulante: validaciones', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'postulante')
    await page.goto('/postulante/onboarding')
  })

  test('TC-ONB-POS-002 — nombre_completo vacío → error', async ({ page }) => {
    await page.locator('[name="nombre_completo"]').fill('')
    await page.getByRole('button', { name: /continuar|guardando/i }).click()
    await expect(page.locator('text=/nombre|requerido|obligatorio/i').first()).toBeVisible({ timeout: 8000 })
  })

  test('TC-ONB-POS-003 — LinkedIn con URL inválida → error de validación', async ({ page }) => {
    await page.locator('form').evaluate((form: HTMLFormElement) => {
      form.noValidate = true
    })
    await page.locator('[name="nombre_completo"]').fill('Test User')
    await page.locator('[name="enlace_linkedin"]').fill('perfil-linkedin-sin-https')
    await page.getByRole('button', { name: /continuar|guardando/i }).click()
    await expect(page.getByText('Ingresá una URL válida.')).toBeVisible({ timeout: 8000 })
    await expect(page).not.toHaveURL(/\/postulante\/eneagrama/)
  })

  test('TC-ONB-POS-004 — Portfolio con URL inválida → error de validación', async ({ page }) => {
    await page.locator('form').evaluate((form: HTMLFormElement) => {
      form.noValidate = true
    })
    await page.locator('[name="nombre_completo"]').fill('Test User')
    await page.locator('[name="portfolio"]').fill('mi-portfolio-sin-https')
    await page.getByRole('button', { name: /continuar|guardando/i }).click()
    await expect(page.getByText('Ingresá una URL válida.')).toBeVisible({ timeout: 8000 })
    await expect(page).not.toHaveURL(/\/postulante\/eneagrama/)
  })
})

test.describe('M02 — Onboarding Reclutador: registro nuevo usuario', () => {
  test('TC-AUTH-001 + TC-ONB-REC-001 — Registro RECLUTADOR → onboarding → crea empresa', async ({ page }) => {
    // Step 1: register a fresh recruiter. Email confirmation is on (as in
    // production): signup shows the "check your inbox" notice and creates no
    // session, so the test confirms the address and logs in.
    const uniqueEmail = `e2e-reclutador-${Date.now()}@mailinator.com`
    const password = 'Admin1234!'
    await page.goto('/registro')
    await page.getByRole('button', { name: 'Empresa' }).click()
    await page.locator('[name="email"]').fill(uniqueEmail)
    await page.locator('[name="password"]').fill(password)
    await page.locator('[name="confirmPassword"]').fill(password)
    await page.getByRole('button', { name: 'Crear cuenta' }).click()
    await expect(page.getByText(/te enviamos un mail de verificación/)).toBeVisible({ timeout: 15000 })

    await confirmarEmail(uniqueEmail)
    await page.goto('/iniciar-sesion')
    await page.locator('[name="email"]').fill(uniqueEmail)
    await page.locator('[name="password"]').fill(password)
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await page.waitForURL('**/reclutador/onboarding**', { timeout: 15000 })

    // A fresh user must accept the blocking Terms & Conditions modal first —
    // it overlays the onboarding form and intercepts clicks until accepted.
    const tycAccept = page.getByRole('button', { name: 'Acepto los Términos y Condiciones' })
    await tycAccept.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
    if (await tycAccept.count()) {
      await tycAccept.click()
      await tycAccept.waitFor({ state: 'hidden', timeout: 10000 })
    }

    // Accepting the ToS triggers a layout revalidation whose router refresh can
    // wipe the uncontrolled input if we fill it during that window. Reload into a
    // clean, ToS-accepted onboarding form (still no empresa, so no redirect) so
    // the fill is stable.
    await page.goto('/reclutador/onboarding')

    // Step 2: complete onboarding with minimum required field. On success
    // crearEmpresaYAsociar redirects to /reclutador/puestos, so wait for that
    // specific target rather than the loose **/reclutador** glob (which also
    // matches the onboarding URL we're leaving).
    await page.locator('[name="nombre_empresa"]').fill(`E2E Corp ${Date.now()}`)
    await page.getByRole('button', { name: 'Guardar empresa y continuar' }).click()
    await page.waitForURL('**/reclutador/puestos**', { timeout: 15000 })
    await expect(page).not.toHaveURL(/\/reclutador\/onboarding/)
  })
})
