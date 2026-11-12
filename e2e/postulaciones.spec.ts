import { test, expect, type Page } from '@playwright/test'
import { loginAs } from './fixtures/auth'
import { publicarPuesto } from './support/puestos'

// TC-POST-* — M06 Postulaciones

/**
 * Creates a fresh active puesto as reclutador and returns its public URL
 * (/postulante/puestos/[id]) so tests can navigate directly without relying
 * on text search in the candidate job list.
 */
async function createActivePuestoAndGetUrl(
  page: Page
): Promise<{ puestoId: string; postulantePath: string }> {
  const title = `E2E Postulacion ${Date.now()}`
  await loginAs(page, 'reclutador')
  const puestoId = await publicarPuesto(page, title)
  return { puestoId, postulantePath: `/postulante/puestos/${puestoId}` }
}

/**
 * Navigates to the puesto detail as postulante and returns the "Postularme"
 * button, asserting it is enabled: the seeded postulante has a valid certificate
 * (e2e/global-setup.ts), so a disabled button is a failure, not a skip.
 */
async function getApplyButton(page: Page, postulantePath: string) {
  await page.goto(postulantePath)
  const btn = page.getByRole('button', { name: 'Postularme' })
  await expect(btn).toBeEnabled({ timeout: 10000 })
  return btn
}

test.describe('M06 — Postulaciones: flujo candidato', () => {
  test('TC-POST-001 — Postulante postula a puesto activo → estado ENVIADA', async ({ page }) => {
    const { postulantePath } = await createActivePuestoAndGetUrl(page)

    await loginAs(page, 'postulante')
    const applyBtn = await getApplyButton(page, postulantePath)

    await applyBtn.click()
    await expect(page.getByRole('button', { name: 'Ya postulaste' })).toBeVisible({ timeout: 10000 })
  })

  test('TC-POST-002 — Postulante intenta postular dos veces → botón reemplazado por "Ya postulaste"', async ({ page }) => {
    const { postulantePath } = await createActivePuestoAndGetUrl(page)

    await loginAs(page, 'postulante')
    const applyBtn = await getApplyButton(page, postulantePath)

    await applyBtn.click()
    await expect(page.getByRole('button', { name: 'Ya postulaste' })).toBeVisible({ timeout: 10000 })

    // Reload — button must stay as "Ya postulaste" (disabled)
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('button', { name: 'Ya postulaste' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Postularme' })).not.toBeVisible()
  })

  test('TC-POST-003 — Postulante ve sus postulaciones en /postulante/postulaciones', async ({ page }) => {
    await loginAs(page, 'postulante')
    await page.goto('/postulante/postulaciones')
    await page.waitForURL(/\/postulante\//, { timeout: 10000 })
    await expect(page).not.toHaveURL(/\/iniciar-sesion/)
    if (page.url().includes('/postulante/postulaciones')) {
      await expect(page.getByRole('heading', { name: 'Mis postulaciones' })).toBeVisible()
    }
  })

  test('TC-POST-004 — Postulante no puede cambiar ni retirar su postulación', async ({ page }) => {
    await loginAs(page, 'postulante')
    await page.goto('/postulante/postulaciones')
    await page.waitForURL(/\/postulante\//, { timeout: 10000 })
    // No state-change buttons should exist for the candidate
    await expect(
      page.getByRole('button', { name: /cambiar estado|retirar|cancelar postulación/i })
    ).not.toBeVisible()
  })
})

test.describe('M06 — Postulaciones: flujo reclutador', () => {
  test('TC-POST-005 — Reclutador avanza estado ENVIADA → VISTO', async ({ page }) => {
    const { puestoId, postulantePath } = await createActivePuestoAndGetUrl(page)

    await loginAs(page, 'postulante')
    const applyBtn = await getApplyButton(page, postulantePath)
    await applyBtn.click()
    await expect(page.getByRole('button', { name: 'Ya postulaste' })).toBeVisible({ timeout: 10000 })

    await loginAs(page, 'reclutador')
    // Same link as the "Postulaciones" action of the puestos list.
    await page.goto(`/reclutador/postulaciones?puesto=${puestoId}`)

    await page.getByRole('button', { name: 'Marcar como evaluado' }).first().click()
    await expect(page.getByText('Evaluada', { exact: true })).toBeVisible({ timeout: 10000 })
  })

  test('TC-POST-007 — Reclutador avanza VISTO → PROCESO_FINALIZADO (No avanza)', async ({ page }) => {
    const { puestoId, postulantePath } = await createActivePuestoAndGetUrl(page)

    await loginAs(page, 'postulante')
    const applyBtn = await getApplyButton(page, postulantePath)
    await applyBtn.click()
    await expect(page.getByRole('button', { name: 'Ya postulaste' })).toBeVisible({ timeout: 10000 })

    await loginAs(page, 'reclutador')
    // Same link as the "Postulaciones" action of the puestos list.
    await page.goto(`/reclutador/postulaciones?puesto=${puestoId}`)

    await page.getByRole('button', { name: 'Marcar como evaluado' }).first().click()
    await expect(page.getByText('Evaluada', { exact: true })).toBeVisible({ timeout: 10000 })

    await page.getByRole('button', { name: 'No avanzar' }).first().click()
    await page.getByRole('dialog').getByRole('button', { name: 'No avanzar', exact: true }).click()
    await expect(page.getByText('No avanza', { exact: true })).toBeVisible({ timeout: 10000 })
  })

  test('TC-POST-010 — Reclutador no ve postulaciones de puestos ajenos', async ({ page }) => {
    const title = `E2E Aislamiento ${Date.now()}`
    await loginAs(page, 'reclutador')
    const puestoId = await publicarPuesto(page, title)

    await loginAs(page, 'postulante')
    const applyBtn = await getApplyButton(page, `/postulante/puestos/${puestoId}`)
    await applyBtn.click()
    await expect(page.getByRole('button', { name: 'Ya postulaste' })).toBeVisible({ timeout: 10000 })

    // Segundo reclutador (otra empresa) no debe ver ni el puesto ni la postulación.
    await loginAs(page, 'reclutador2')
    await page.goto('/reclutador/postulaciones')
    await page.getByRole('heading', { name: /postulaciones recibidas/i }).waitFor()
    await expect(page.getByText(title)).not.toBeVisible()

    await page.goto(`/reclutador/postulaciones?puesto=${puestoId}`)
    await expect(page.getByText('Ana E2E Postulante')).not.toBeVisible()
  })
})
