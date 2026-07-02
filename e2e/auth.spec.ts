import { test, expect } from '@playwright/test'
import { loginAs, logout, USERS } from './fixtures/auth'

// TC-AUTH-* — M01 Authentication

test.describe('M01 — Auth: Login', () => {
  test('TC-AUTH-009 — Login RECLUTADOR → redirige a /reclutador', async ({ page }) => {
    await loginAs(page, 'reclutador')
    await expect(page).toHaveURL(/\/reclutador/)
  })

  test('TC-AUTH-010 — Login POSTULANTE → redirige a /postulante', async ({ page }) => {
    await loginAs(page, 'postulante')
    await expect(page).toHaveURL(/\/postulante/)
  })

  test('TC-AUTH-011 — Login ADMIN → redirige a /admin', async ({ page }) => {
    await loginAs(page, 'admin')
    await expect(page).toHaveURL(/\/admin/)
  })

  test('TC-AUTH-012 — Password incorrecta → error genérico', async ({ page }) => {
    await page.goto('/login')
    await page.locator('[name="email"]').fill(USERS.reclutador.email)
    await page.locator('[name="password"]').fill('WrongPass999!')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page.getByText('Email o contraseña incorrectos.')).toBeVisible()
  })

  test('TC-AUTH-013 — Email no registrado → mismo mensaje que contraseña incorrecta', async ({ page }) => {
    await page.goto('/login')
    await page.locator('[name="email"]').fill('noexiste@example.com')
    await page.locator('[name="password"]').fill('SomePass123!')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page.getByText('Email o contraseña incorrectos.')).toBeVisible()
  })
})

test.describe('M01 — Auth: Validaciones formulario login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('TC-AUTH-008 — Email inválido → error de validación', async ({ page }) => {
    await page.locator('[name="email"]').fill('no-es-un-email')
    await page.locator('[name="password"]').fill('Admin1234!')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    // The email field is <input type="email">: the browser's native HTML5
    // validation blocks submission before the server action runs, so we assert
    // the field is invalid and that we never left the login page.
    const emailValid = await page
      .locator('[name="email"]')
      .evaluate((el: HTMLInputElement) => el.validity.valid)
    expect(emailValid).toBe(false)
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('M01 — Auth: Registro', () => {
  test('TC-AUTH-004 — Password sin mayúscula → error de validación', async ({ page }) => {
    await page.goto('/registro')
    await page.getByRole('button', { name: 'Postulante' }).click()
    await page.locator('[name="email"]').fill('test@example.com')
    await page.locator('[name="password"]').fill('sinmayuscula1')
    await page.locator('[name="confirmPassword"]').fill('sinmayuscula1')
    await page.getByRole('button', { name: 'Crear cuenta' }).click()
    await expect(page.getByText('Debe contener al menos una mayúscula.')).toBeVisible()
  })

  test('TC-AUTH-005 — Password sin número → error de validación', async ({ page }) => {
    await page.goto('/registro')
    await page.getByRole('button', { name: 'Empresa' }).click()
    await page.locator('[name="email"]').fill('test@example.com')
    await page.locator('[name="password"]').fill('SinNumeroAbc')
    await page.locator('[name="confirmPassword"]').fill('SinNumeroAbc')
    await page.getByRole('button', { name: 'Crear cuenta' }).click()
    await expect(page.getByText('Debe contener al menos un número.')).toBeVisible()
  })

  test('TC-AUTH-006 — Password < 8 chars → error', async ({ page }) => {
    await page.goto('/registro')
    await page.getByRole('button', { name: 'Postulante' }).click()
    await page.locator('[name="email"]').fill('test@example.com')
    await page.locator('[name="password"]').fill('Abc1')
    await page.locator('[name="confirmPassword"]').fill('Abc1')
    await page.getByRole('button', { name: 'Crear cuenta' }).click()
    await expect(page.getByText('La contraseña debe tener al menos 8 caracteres.')).toBeVisible()
  })

  test('TC-AUTH-007 — Passwords no coinciden → error', async ({ page }) => {
    await page.goto('/registro')
    await page.getByRole('button', { name: 'Postulante' }).click()
    await page.locator('[name="email"]').fill('test@example.com')
    await page.locator('[name="password"]').fill('Admin1234!')
    await page.locator('[name="confirmPassword"]').fill('Admin9999!')
    await page.getByRole('button', { name: 'Crear cuenta' }).click()
    await expect(page.getByText('Las contraseñas no coinciden.')).toBeVisible()
  })

  test('TC-AUTH-008 — Email inválido en registro → error', async ({ page }) => {
    await page.goto('/registro')
    await page.getByRole('button', { name: 'Postulante' }).click()
    await page.locator('[name="email"]').fill('no-es-email')
    await page.locator('[name="password"]').fill('Admin1234!')
    await page.locator('[name="confirmPassword"]').fill('Admin1234!')
    await page.getByRole('button', { name: 'Crear cuenta' }).click()
    // <input type="email"> — native validation blocks the submit before the
    // server-side Zod check, so assert the field is invalid and we stay put.
    const emailValid = await page
      .locator('[name="email"]')
      .evaluate((el: HTMLInputElement) => el.validity.valid)
    expect(emailValid).toBe(false)
    await expect(page).toHaveURL(/\/registro/)
  })

  test('TC-AUTH-003 — Email ya existente → error', async ({ page }) => {
    await page.goto('/registro')
    await page.getByRole('button', { name: 'Postulante' }).click()
    await page.locator('[name="email"]').fill(USERS.postulante.email)
    await page.locator('[name="password"]').fill('Admin1234!')
    await page.locator('[name="confirmPassword"]').fill('Admin1234!')
    await page.getByRole('button', { name: 'Crear cuenta' }).click()
    await expect(page.getByText('Ya existe una cuenta con ese email.')).toBeVisible()
  })

  test('TC-AUTH-002 — Registro POSTULANTE exitoso → redirige a /postulante/onboarding', async ({ page }) => {
    const uniqueEmail = `e2e-postulante-${Date.now()}@mailinator.com`
    await page.goto('/registro')
    await page.getByRole('button', { name: 'Postulante' }).click()
    await page.locator('[name="email"]').fill(uniqueEmail)
    await page.locator('[name="password"]').fill('Admin1234!')
    await page.locator('[name="confirmPassword"]').fill('Admin1234!')
    await page.getByRole('button', { name: 'Crear cuenta' }).click()
    await page.waitForURL('**/postulante/onboarding**', { timeout: 15000 })
    await expect(page).toHaveURL(/\/postulante\/onboarding/)
  })
})

test.describe('M01 — Auth: Logout y protección de rutas', () => {
  test('TC-AUTH-014 — Logout → sesión destruida, redirige a /login', async ({ page }) => {
    await loginAs(page, 'postulante')
    await logout(page)
    await expect(page).toHaveURL(/\/login/)
  })

  test('TC-AUTH-015 — Post-logout: ruta protegida → redirige a /login', async ({ page }) => {
    await loginAs(page, 'postulante')
    await logout(page)
    await page.goto('/postulante')
    await expect(page).toHaveURL(/\/login/)
  })

  test('TC-AUTH-018 — Sin sesión: acceso directo a /reclutador → redirige a /login', async ({ page }) => {
    await page.goto('/reclutador')
    await expect(page).toHaveURL(/\/login/)
  })

  test('TC-AUTH-019 — POSTULANTE intenta acceder a /reclutador → prohibido', async ({ page }) => {
    await loginAs(page, 'postulante')
    await page.goto('/reclutador')
    // Should redirect to their own dashboard or login, never show reclutador content
    await expect(page).not.toHaveURL(/^.*\/reclutador$/)
  })

  test('TC-AUTH-020 — RECLUTADOR intenta acceder a /admin → prohibido', async ({ page }) => {
    await loginAs(page, 'reclutador')
    await page.goto('/admin')
    await expect(page).not.toHaveURL(/^.*\/admin$/)
  })

  test('TC-ADM-009 — No-ADMIN intenta acceder a /admin → prohibido', async ({ page }) => {
    await loginAs(page, 'postulante')
    await page.goto('/admin')
    await expect(page).not.toHaveURL(/^.*\/admin$/)
  })
})

test.describe('M01 — Auth: Recuperar password', () => {
  test('TC-AUTH-016 — Recuperar password con email registrado → mensaje de éxito', async ({ page }) => {
    await page.goto('/recuperar-password')
    await page.locator('[name="email"]').fill(USERS.postulante.email)
    await page.getByRole('button', { name: 'Enviar instrucciones' }).click()
    await expect(
      page.getByText('Si existe una cuenta con ese email, recibirás las instrucciones para restablecer tu contraseña.')
    ).toBeVisible({ timeout: 10000 })
  })

  test('TC-AUTH-017 — Recuperar password con email no registrado → mismo mensaje (no revela existencia)', async ({ page }) => {
    await page.goto('/recuperar-password')
    await page.locator('[name="email"]').fill('noexiste@mailinator.com')
    await page.getByRole('button', { name: 'Enviar instrucciones' }).click()
    await expect(
      page.getByText('Si existe una cuenta con ese email, recibirás las instrucciones para restablecer tu contraseña.')
    ).toBeVisible({ timeout: 10000 })
  })
})
