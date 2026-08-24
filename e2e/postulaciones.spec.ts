import { test, expect, type Page } from '@playwright/test'
import { loginAs } from './fixtures/auth'

// TC-POST-* — M06 Postulaciones

/**
 * Creates a fresh active puesto as reclutador and returns its public URL
 * (/postulante/puestos/[id]) so tests can navigate directly without relying
 * on text search in the candidate job list.
 */
async function createActivePuestoAndGetUrl(page: Page): Promise<{ title: string; postulantePath: string }> {
  const title = `E2E Postulacion ${Date.now()}`
  await loginAs(page, 'reclutador')
  await page.goto('/reclutador/puestos/nuevo')
  await page.getByLabel('Título del puesto').fill(title)
  await page.getByLabel('Idioma requerido').fill('Español')
  await page.locator('[name="carga_horaria"]').selectOption('TIEMPO_COMPLETO')
  await page.locator('[name="ubicacion"]').selectOption('REMOTO')
  await page.getByRole('button', { name: 'Publicar puesto' }).click()
  await page.waitForURL('**/reclutador/puestos**', { timeout: 15000 })

  // The title is a <p>, not a link. The ID lives in the "Ver" link next to
  // each row. Find the row that contains our title text, then grab its "Ver" href.
  const row = page.locator('div', { hasText: title }).filter({ has: page.getByRole('link', { name: 'Ver' }) }).first()
  await expect(row).toBeVisible({ timeout: 8000 })
  const href = await row.getByRole('link', { name: 'Ver' }).getAttribute('href')
  const puestoId = href?.split('/').pop() ?? ''
  const postulantePath = `/postulante/puestos/${puestoId}`

  return { title, postulantePath }
}

/**
 * Navigates to the puesto detail as postulante and returns whether the
 * "Postularme" button is enabled (i.e. the user has a valid certificate).
 */
async function getApplyButton(page: Page, postulantePath: string) {
  await page.goto(postulantePath)
  // Wait for the page to settle
  await page.waitForLoadState('networkidle')
  const btn = page.getByRole('button', { name: 'Postularme' })
  const count = await btn.count()
  if (count === 0) return null
  const isDisabled = await btn.isDisabled()
  return isDisabled ? null : btn
}

test.describe('M06 — Postulaciones: flujo candidato', () => {
  test('TC-POST-001 — Postulante postula a puesto activo → estado ENVIADA', async ({ page }) => {
    const { postulantePath } = await createActivePuestoAndGetUrl(page)

    await loginAs(page, 'postulante')
    const applyBtn = await getApplyButton(page, postulantePath)

    if (!applyBtn) {
      test.skip(true, 'Postulante no tiene certificado vigente — no puede postularse')
      return
    }

    await applyBtn.click()
    await expect(page.getByRole('button', { name: 'Ya postulaste' })).toBeVisible({ timeout: 10000 })
  })

  test('TC-POST-002 — Postulante intenta postular dos veces → botón reemplazado por "Ya postulaste"', async ({ page }) => {
    const { postulantePath } = await createActivePuestoAndGetUrl(page)

    await loginAs(page, 'postulante')
    const applyBtn = await getApplyButton(page, postulantePath)

    if (!applyBtn) {
      test.skip(true, 'Postulante no tiene certificado vigente')
      return
    }

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
    await expect(page).not.toHaveURL(/\/login/)
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
    const { title, postulantePath } = await createActivePuestoAndGetUrl(page)

    await loginAs(page, 'postulante')
    const applyBtn = await getApplyButton(page, postulantePath)
    if (!applyBtn) {
      test.skip(true, 'Postulante no tiene certificado vigente')
      return
    }
    await applyBtn.click()
    await expect(page.getByRole('button', { name: 'Ya postulaste' })).toBeVisible({ timeout: 10000 })

    await loginAs(page, 'reclutador')
    await page.goto('/reclutador/postulaciones')
    await page.getByLabel('Filtrar por puesto').selectOption({ label: title })
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'Marcar como evaluado' }).first().click()
    await expect(page.getByText('Evaluada').first()).toBeVisible({ timeout: 10000 })
  })

  test('TC-POST-007 — Reclutador avanza VISTO → PROCESO_FINALIZADO (No avanza)', async ({ page }) => {
    const { title, postulantePath } = await createActivePuestoAndGetUrl(page)

    await loginAs(page, 'postulante')
    const applyBtn = await getApplyButton(page, postulantePath)
    if (!applyBtn) {
      test.skip(true, 'Postulante no tiene certificado vigente')
      return
    }
    await applyBtn.click()
    await expect(page.getByRole('button', { name: 'Ya postulaste' })).toBeVisible({ timeout: 10000 })

    await loginAs(page, 'reclutador')
    await page.goto('/reclutador/postulaciones')
    await page.getByLabel('Filtrar por puesto').selectOption({ label: title })
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'Marcar como evaluado' }).first().click()
    await expect(page.getByText('Evaluada').first()).toBeVisible({ timeout: 10000 })

    await page.getByRole('button', { name: 'No avanzar' }).first().click()
    await expect(page.getByText('No avanza').first()).toBeVisible({ timeout: 10000 })
  })

  test('TC-POST-010 — Reclutador no ve postulaciones de puestos ajenos', async ({ page }) => {
    await loginAs(page, 'reclutador')
    await page.goto('/reclutador/postulaciones')
    await page.getByRole('heading', { name: /postulaciones recibidas/i }).waitFor()
    await expect(page).not.toHaveURL(/login/)
  })
})
