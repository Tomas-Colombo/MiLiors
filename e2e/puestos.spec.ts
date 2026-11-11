import { test, expect } from '@playwright/test'
import { loginAs } from './fixtures/auth'
import {
  cambiarEstadoPuesto,
  completarPuestoMinimo,
  filaDePuesto,
  publicarPuesto,
} from './support/puestos'

// TC-PUE-* — M05 Puestos de Trabajo

test.describe('M05 — Puestos: CRUD del reclutador', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'reclutador')
  })

  test('TC-PUE-001 — Crear puesto con campos mínimos → aparece en lista', async ({ page }) => {
    const title = `E2E Puesto ${Date.now()}`
    await publicarPuesto(page, title)
    const row = await filaDePuesto(page, title)
    await expect(row).toBeVisible()
  })

  test('TC-PUE-002 — Crear puesto sin título → error', async ({ page }) => {
    await completarPuestoMinimo(page, '')
    await page.getByRole('button', { name: 'Publicar puesto' }).click()
    await expect(page.getByText('Ingresá el título del puesto.')).toBeVisible()
  })

  test('TC-PUE-010 — Editar puesto propio → cambios reflejados', async ({ page }) => {
    const original = `E2E Edit ${Date.now()}`
    const updated = `${original} EDITADO`
    await publicarPuesto(page, original)

    const row = await filaDePuesto(page, original)
    await row.getByRole('link', { name: 'Editar', exact: true }).click()
    await page.waitForURL('**/editar**')

    await page.getByLabel('Título del puesto').fill(updated)
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByText('Puesto actualizado correctamente.')).toBeVisible({ timeout: 10000 })
    // On the editar page the new title lives in the input's value, not as page
    // text, so assert the field value rather than getByText.
    await expect(page.getByLabel('Título del puesto')).toHaveValue(updated)
  })

  test('TC-PUE-012 — Pausar puesto → desaparece de vista del postulante', async ({ page }) => {
    const title = `E2E Cerrar ${Date.now()}`
    await publicarPuesto(page, title)

    await cambiarEstadoPuesto(page, title, 'Pausar')
    const row = await filaDePuesto(page, title)
    await expect(row.getByRole('button', { name: 'Reactivar', exact: true })).toBeVisible({ timeout: 8000 })

    await loginAs(page, 'postulante')
    await page.goto('/postulante/puestos')
    await expect(page.getByText(title)).not.toBeVisible()
  })

  test('TC-PUE-014 — Reactivar puesto → vuelve a aparecer', async ({ page }) => {
    const title = `E2E Reactivar ${Date.now()}`
    await publicarPuesto(page, title)

    await cambiarEstadoPuesto(page, title, 'Pausar')
    await cambiarEstadoPuesto(page, title, 'Reactivar')
    const row = await filaDePuesto(page, title)
    await expect(row.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible({ timeout: 8000 })
  })
})

test.describe('M05 — Puestos: visibilidad para el postulante', () => {
  test('TC-PUE-007 — Puesto activo aparece en /postulante/puestos', async ({ page }) => {
    await loginAs(page, 'reclutador')
    const title = `E2E Visible ${Date.now()}`
    await publicarPuesto(page, title)

    await loginAs(page, 'postulante')
    await page.goto('/postulante/puestos')
    await expect(page.getByText(title)).toBeVisible({ timeout: 10000 })
  })

  test('TC-PUE-008 — perfil_psicologico_deseado NO es visible para el postulante', async ({ page }) => {
    await loginAs(page, 'reclutador')
    const title = `E2E PsicoOculto ${Date.now()}`
    const secretText = `SECRETO_PSICO_${Date.now()}`
    const puestoId = await publicarPuesto(page, title, { notasPrivadas: secretText })

    await loginAs(page, 'postulante')
    await page.goto(`/postulante/puestos/${puestoId}`)
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
    await expect(page.getByText(secretText)).not.toBeVisible()
    // Also verify it's not anywhere in the page HTML (RSC payload included)
    const content = await page.content()
    expect(content).not.toContain(secretText)
  })
})

test.describe('M05 — Puestos: validaciones de formulario', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'reclutador')
  })

  test('TC-PUE-003 — título < 3 chars → error', async ({ page }) => {
    await completarPuestoMinimo(page, 'AB')
    await page.getByRole('button', { name: 'Publicar puesto' }).click()
    // Same message as the empty title: the schema requires at least 3 characters.
    await expect(page.getByText('Ingresá el título del puesto.')).toBeVisible({ timeout: 5000 })
  })
})
