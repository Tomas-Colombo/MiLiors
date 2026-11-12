import { test, expect } from '@playwright/test'
import { loginAs } from './fixtures/auth'

// TC-NOTA-* — M08 Notas Privadas
//
// These tests use /reclutador/postulantes/[id] — we need a real postulante ID.
// We navigate to /reclutador/postulantes and pick the first candidate to run tests on
// (the postulante seeded by e2e/global-setup.ts).

async function getFirstCandidateUrl(page: import('@playwright/test').Page): Promise<string> {
  await page.goto('/reclutador/postulantes')
  // Each candidate card is a Link wrapping the card body — there is no "Ver perfil"
  // label to match on, so target the detail route directly. The seeded postulante
  // is searchable (e2e/global-setup.ts), so an empty list is a failure.
  const candidateLink = page.locator('a[href^="/reclutador/postulantes/"]').first()
  await expect(candidateLink).toBeVisible({ timeout: 10000 })
  return (await candidateLink.getAttribute('href'))!
}

test.describe('M08 — Notas Privadas: CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'reclutador')
  })

  test('TC-NOTA-001 — Crear nota sobre candidato → guardada', async ({ page }) => {
    const candidateUrl = await getFirstCandidateUrl(page)

    await page.goto(candidateUrl)
    await page.getByRole('heading', { name: 'Notas privadas' }).waitFor()

    const noteText = `Nota E2E ${Date.now()}`
    await page.getByPlaceholder('Escribí tus observaciones sobre este candidato…').fill(noteText)
    await page.getByRole('button', { name: 'Guardar nota' }).click()

    await expect(page.getByText(noteText)).toBeVisible({ timeout: 10000 })
  })

  test('TC-NOTA-003 — Editar nota existente → contenido actualizado', async ({ page }) => {
    const candidateUrl = await getFirstCandidateUrl(page)

    await page.goto(candidateUrl)
    await page.getByRole('heading', { name: 'Notas privadas' }).waitFor()

    // Create a note first
    const originalText = `Nota Original ${Date.now()}`
    const updatedText = `Nota Editada ${Date.now()}`
    await page.getByPlaceholder('Escribí tus observaciones sobre este candidato…').fill(originalText)
    await page.getByRole('button', { name: 'Guardar nota' }).click()
    await expect(page.getByText(originalText)).toBeVisible({ timeout: 10000 })

    // Edit it
    await page.locator('li', { hasText: originalText }).getByRole('button', { name: 'Editar nota' }).click()
    const editArea = page.locator('li textarea')
    await editArea.fill(updatedText)
    await page.getByRole('button', { name: 'Guardar', exact: true }).click()

    await expect(page.getByText(updatedText)).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(originalText)).not.toBeVisible()
  })

  test('TC-NOTA-004 — Eliminar nota → desaparece', async ({ page }) => {
    const candidateUrl = await getFirstCandidateUrl(page)

    await page.goto(candidateUrl)
    await page.getByRole('heading', { name: 'Notas privadas' }).waitFor()

    // Create a note to delete
    const noteText = `Nota Borrar ${Date.now()}`
    await page.getByPlaceholder('Escribí tus observaciones sobre este candidato…').fill(noteText)
    await page.getByRole('button', { name: 'Guardar nota' }).click()
    await expect(page.getByText(noteText)).toBeVisible({ timeout: 10000 })

    // Delete it
    // Each note is an <li>: delete the one holding this text.
    const noteRow = page.locator('li', { hasText: noteText })
    await noteRow.getByRole('button', { name: 'Eliminar nota' }).click()

    await expect(page.getByText(noteText)).not.toBeVisible({ timeout: 8000 })
  })
})

test.describe('M08 — Notas Privadas: seguridad 🔒', () => {
  test('TC-NOTA-006 — Postulante NO puede ver sus propias notas privadas', async ({ page }) => {
    // The postulante dashboard and profile pages must never expose nota_privada content.
    // We verify the page /postulante never renders text from the notes panel.
    await loginAs(page, 'postulante')
    await page.goto('/postulante')

    // The notes panel section heading should NOT appear in postulante views
    await expect(page.getByRole('heading', { name: 'Notas privadas' })).not.toBeVisible()

    // Also check the technical profile page
    await page.goto('/postulante/perfil')
    await expect(page.getByRole('heading', { name: 'Notas privadas' })).not.toBeVisible()
  })

  test('TC-NOTA-005 — Nota de Reclutador A no aparece para Reclutador B', async ({ page }) => {
    await loginAs(page, 'reclutador')
    const candidateUrl = await getFirstCandidateUrl(page)

    await page.goto(candidateUrl)
    await page.getByRole('heading', { name: 'Notas privadas' }).waitFor()

    const noteText = `Nota privada R1 ${Date.now()}`
    await page.getByPlaceholder('Escribí tus observaciones sobre este candidato…').fill(noteText)
    await page.getByRole('button', { name: 'Guardar nota' }).click()
    await expect(page.getByText(noteText)).toBeVisible({ timeout: 10000 })

    await loginAs(page, 'reclutador2')
    await page.goto(candidateUrl)
    await expect(page.getByRole('heading', { name: 'Notas privadas' })).toBeVisible()
    await expect(page.getByText(noteText)).not.toBeVisible()
  })
})
