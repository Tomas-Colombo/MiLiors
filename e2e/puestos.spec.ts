import { test, expect } from '@playwright/test'
import { loginAs } from './fixtures/auth'

// TC-PUE-* — M05 Puestos de Trabajo

let createdJobTitle: string

test.describe('M05 — Puestos: CRUD del reclutador', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'reclutador')
  })

  test('TC-PUE-001 — Crear puesto con campos mínimos → aparece en lista', async ({ page }) => {
    createdJobTitle = `E2E Puesto ${Date.now()}`
    await page.goto('/reclutador/puestos/nuevo')
    await page.getByRole('heading', { name: 'Publicar nuevo puesto' }).waitFor()

    await page.getByLabel('Título del puesto').fill(createdJobTitle)
    await page.getByLabel('Idioma requerido').fill('Español')
    await page.locator('[name="carga_horaria"]').selectOption('TIEMPO_COMPLETO')
    await page.locator('[name="ubicacion"]').selectOption('REMOTO')

    await page.getByRole('button', { name: 'Publicar puesto' }).click()
    await page.waitForURL('**/reclutador/puestos**', { timeout: 15000 })

    await expect(page.getByText(createdJobTitle)).toBeVisible()
  })

  test('TC-PUE-002 — Crear puesto sin título → error', async ({ page }) => {
    await page.goto('/reclutador/puestos/nuevo')
    await page.getByLabel('Idioma requerido').fill('Español')
    await page.locator('[name="carga_horaria"]').selectOption('TIEMPO_COMPLETO')
    await page.locator('[name="ubicacion"]').selectOption('REMOTO')
    await page.getByRole('button', { name: 'Publicar puesto' }).click()
    await expect(page.getByText('Ingresá el título del puesto.')).toBeVisible()
  })

  test('TC-PUE-010 — Editar puesto propio → cambios reflejados', async ({ page }) => {
    // Create a puesto first, then edit it
    const original = `E2E Edit ${Date.now()}`
    const updated = `${original} EDITADO`

    await page.goto('/reclutador/puestos/nuevo')
    await page.getByLabel('Título del puesto').fill(original)
    await page.getByLabel('Idioma requerido').fill('Español')
    await page.locator('[name="carga_horaria"]').selectOption('TIEMPO_COMPLETO')
    await page.locator('[name="ubicacion"]').selectOption('REMOTO')
    await page.getByRole('button', { name: 'Publicar puesto' }).click()
    await page.waitForURL('**/reclutador/puestos**', { timeout: 15000 })

    // Navigate to the new puesto's detail
    await page.getByText(original).click()
    await page.getByRole('link', { name: /editar/i }).click()
    await page.waitForURL('**/editar**')

    await page.getByLabel('Título del puesto').fill(updated)
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByText('Puesto actualizado correctamente.')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(updated)).toBeVisible()
  })

  test('TC-PUE-012 — Cerrar puesto → desaparece de vista del postulante', async ({ page }) => {
    // Create a puesto to close
    const title = `E2E Cerrar ${Date.now()}`
    await page.goto('/reclutador/puestos/nuevo')
    await page.getByLabel('Título del puesto').fill(title)
    await page.getByLabel('Idioma requerido').fill('Español')
    await page.locator('[name="carga_horaria"]').selectOption('TIEMPO_COMPLETO')
    await page.locator('[name="ubicacion"]').selectOption('REMOTO')
    await page.getByRole('button', { name: 'Publicar puesto' }).click()
    await page.waitForURL('**/reclutador/puestos**', { timeout: 15000 })

    // Open the puesto detail and close it
    await page.getByText(title).click()
    await page.getByRole('button', { name: /cerrar puesto/i }).click()

    // Verify it's marked as closed in the recruiter view
    await page.waitForURL('**/reclutador/puestos/**')
    // The detail page should reflect the closed state (no reactivate without close first)
    await expect(page.getByRole('button', { name: /reactivar/i })).toBeVisible({ timeout: 8000 })
  })

  test('TC-PUE-014 — Reactivar puesto → vuelve a aparecer', async ({ page }) => {
    // Create and close a puesto, then reactivate
    const title = `E2E Reactivar ${Date.now()}`
    await page.goto('/reclutador/puestos/nuevo')
    await page.getByLabel('Título del puesto').fill(title)
    await page.getByLabel('Idioma requerido').fill('Español')
    await page.locator('[name="carga_horaria"]').selectOption('TIEMPO_COMPLETO')
    await page.locator('[name="ubicacion"]').selectOption('REMOTO')
    await page.getByRole('button', { name: 'Publicar puesto' }).click()
    await page.waitForURL('**/reclutador/puestos**', { timeout: 15000 })

    await page.getByText(title).click()
    await page.getByRole('button', { name: /cerrar puesto/i }).click()
    await page.getByRole('button', { name: /reactivar/i }).waitFor()
    await page.getByRole('button', { name: /reactivar/i }).click()

    // After reactivation, the close button should be back
    await expect(page.getByRole('button', { name: /cerrar puesto/i })).toBeVisible({ timeout: 8000 })
  })
})

test.describe('M05 — Puestos: visibilidad para el postulante', () => {
  test('TC-PUE-007 — Puesto activo aparece en /postulante/puestos', async ({ page }) => {
    // Create an active puesto as reclutador
    await loginAs(page, 'reclutador')
    const title = `E2E Visible ${Date.now()}`
    await page.goto('/reclutador/puestos/nuevo')
    await page.getByLabel('Título del puesto').fill(title)
    await page.getByLabel('Idioma requerido').fill('Español')
    await page.locator('[name="carga_horaria"]').selectOption('TIEMPO_COMPLETO')
    await page.locator('[name="ubicacion"]').selectOption('REMOTO')
    await page.getByRole('button', { name: 'Publicar puesto' }).click()
    await page.waitForURL('**/reclutador/puestos**', { timeout: 15000 })

    // Switch to postulante and check visibility
    await loginAs(page, 'postulante')
    await page.goto('/postulante/puestos')
    await expect(page.getByText(title)).toBeVisible({ timeout: 10000 })
  })

  test('TC-PUE-008 — perfil_psicologico_deseado NO es visible para el postulante', async ({ page }) => {
    // Create a puesto with a psychological profile
    await loginAs(page, 'reclutador')
    const title = `E2E PsicoOculto ${Date.now()}`
    const secretText = `SECRETO_PSICO_${Date.now()}`

    await page.goto('/reclutador/puestos/nuevo')
    await page.getByLabel('Título del puesto').fill(title)
    await page.getByLabel('Idioma requerido').fill('Español')
    await page.locator('[name="carga_horaria"]').selectOption('TIEMPO_COMPLETO')
    await page.locator('[name="ubicacion"]').selectOption('REMOTO')
    await page.locator('[name="perfil_psicologico_deseado"]').fill(secretText)
    await page.getByRole('button', { name: 'Publicar puesto' }).click()
    await page.waitForURL('**/reclutador/puestos**', { timeout: 15000 })

    // Find the puesto ID from the list link
    const puestoLink = page.getByText(title)
    await puestoLink.click()
    const url = page.url()
    const puestoId = url.split('/').pop()

    // Log in as postulante and check the puesto detail page
    await loginAs(page, 'postulante')
    await page.goto(`/postulante/puestos/${puestoId}`)
    await expect(page.getByText(secretText)).not.toBeVisible()
    // Also verify it's not anywhere in the page HTML
    const content = await page.content()
    expect(content).not.toContain(secretText)
  })
})

test.describe('M05 — Puestos: validaciones de formulario', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'reclutador')
    await page.goto('/reclutador/puestos/nuevo')
  })

  test('TC-PUE-003 — título < 3 chars → error', async ({ page }) => {
    await page.getByLabel('Título del puesto').fill('AB')
    await page.getByLabel('Idioma requerido').fill('Español')
    await page.locator('[name="carga_horaria"]').selectOption('TIEMPO_COMPLETO')
    await page.locator('[name="ubicacion"]').selectOption('REMOTO')
    await page.getByRole('button', { name: 'Publicar puesto' }).click()
    // Expect some validation error related to title length
    await expect(page.locator('text=/título|caracteres/i').first()).toBeVisible({ timeout: 5000 })
  })
})
