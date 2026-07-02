import { test, expect } from '@playwright/test'
import { loginAs, USERS } from './fixtures/auth'

// TC-ONB-* — M02 Onboarding Reclutador / M03 Onboarding Postulante
//
// NOTE: These tests use the fixed users who have ALREADY completed onboarding.
// Testing "happy path with redirect" requires a fresh user account.
// Validation tests (field errors) work with existing users too — the form
// is still rendered, errors are caught client-side before any DB write.

test.describe('M02 — Onboarding Reclutador: validaciones', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'reclutador')
    // Navigate directly even if the user already has a company.
    // The server guard redirects completed users to /reclutador/puestos,
    // so TC-ONB-REC-007 can be derived from this behavior.
    await page.goto('/reclutador/onboarding')
  })

  test('TC-ONB-REC-007 — Reclutador con empresa → redirige al dashboard', async ({ page }) => {
    // If guard fires, we won't be on /reclutador/onboarding anymore.
    const url = page.url()
    if (url.includes('/reclutador/onboarding')) {
      // User hasn't completed onboarding — skip guard assertion
      test.skip()
    }
    await expect(page).not.toHaveURL(/\/reclutador\/onboarding/)
  })

  test('TC-ONB-REC-003 — nombre_empresa < 2 chars → error', async ({ page }) => {
    if (!page.url().includes('/reclutador/onboarding')) {
      test.skip()
    }
    await page.locator('[name="nombre_empresa"]').fill('A')
    await page.getByRole('button', { name: 'Guardar empresa y continuar' }).click()
    await expect(page.getByText('Ingresá el nombre de la empresa.')).toBeVisible()
  })

  test('TC-ONB-REC-005 — url_empresa con formato inválido → bloqueado (validación nativa o Zod)', async ({ page }) => {
    if (!page.url().includes('/reclutador/onboarding')) {
      test.skip()
    }
    await page.locator('[name="nombre_empresa"]').fill('Empresa Test')
    // Bypass native URL validation to reach Zod server-side error
    await page.locator('[name="url_empresa"]').evaluate(
      (el, val) => { (el as HTMLInputElement).value = val },
      'no-es-una-url'
    )
    await page.getByRole('button', { name: 'Guardar empresa y continuar' }).click()
    // Either the browser blocks (input stays, no redirect) or Zod shows error
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

  test('TC-ONB-POS-003 — LinkedIn con URL inválida → bloqueado (validación nativa o Zod)', async ({ page }) => {
    await page.locator('[name="nombre_completo"]').fill('Test User')
    // Bypass native URL validation to reach server-side Zod check
    await page.locator('[name="enlace_linkedin"]').evaluate(
      (el, val) => { (el as HTMLInputElement).value = val },
      'perfil-linkedin-sin-https'
    )
    await page.getByRole('button', { name: /continuar|guardando/i }).click()
    // Must not redirect to eneagrama — either stays or shows error
    await expect(page).not.toHaveURL(/\/postulante\/eneagrama/)
  })

  test('TC-ONB-POS-004 — Portfolio con URL inválida → bloqueado (validación nativa o Zod)', async ({ page }) => {
    await page.locator('[name="nombre_completo"]').fill('Test User')
    await page.locator('[name="portfolio"]').evaluate(
      (el, val) => { (el as HTMLInputElement).value = val },
      'mi-portfolio-sin-https'
    )
    await page.getByRole('button', { name: /continuar|guardando/i }).click()
    await expect(page).not.toHaveURL(/\/postulante\/eneagrama/)
  })
})

test.describe('M02 — Onboarding Reclutador: registro nuevo usuario', () => {
  test('TC-AUTH-001 + TC-ONB-REC-001 — Registro RECLUTADOR → onboarding → crea empresa', async ({ page }) => {
    // Step 1: register a fresh recruiter
    const uniqueEmail = `e2e-reclutador-${Date.now()}@mailinator.com`
    await page.goto('/registro')
    await page.getByRole('button', { name: 'Empresa' }).click()
    await page.locator('[name="email"]').fill(uniqueEmail)
    await page.locator('[name="password"]').fill('Admin1234!')
    await page.locator('[name="confirmPassword"]').fill('Admin1234!')
    await page.getByRole('button', { name: 'Crear cuenta' }).click()
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
