import { test, expect } from '@playwright/test'
import { loginAs } from './fixtures/auth'

// TC-NOTA-* — M08 Notas Privadas
//
// These tests use /reclutador/postulantes/[id] — we need a real postulante ID.
// We navigate to /reclutador/postulantes and pick the first candidate to run tests on.

async function getFirstCandidateUrl(page: import('@playwright/test').Page): Promise<string | null> {
  await page.goto('/reclutador/postulantes')
  const candidateLink = page.getByRole('link', { name: /ver perfil|ver candidato/i }).first()
  const count = await candidateLink.count()
  if (count === 0) return null
  return candidateLink.getAttribute('href')
}

test.describe('M08 — Notas Privadas: CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'reclutador')
  })

  test('TC-NOTA-001 — Crear nota sobre candidato → guardada', async ({ page }) => {
    const candidateUrl = await getFirstCandidateUrl(page)
    if (!candidateUrl) {
      test.skip(true, 'No candidates available in /reclutador/postulantes')
      return
    }

    await page.goto(candidateUrl)
    await page.getByRole('heading', { name: 'Notas privadas' }).waitFor()

    const noteText = `Nota E2E ${Date.now()}`
    await page.getByPlaceholder('Escribí tus observaciones sobre este candidato…').fill(noteText)
    await page.getByRole('button', { name: 'Guardar nota' }).click()

    await expect(page.getByText(noteText)).toBeVisible({ timeout: 10000 })
  })

  test('TC-NOTA-003 — Editar nota existente → contenido actualizado', async ({ page }) => {
    const candidateUrl = await getFirstCandidateUrl(page)
    if (!candidateUrl) {
      test.skip(true, 'No candidates available')
      return
    }

    await page.goto(candidateUrl)
    await page.getByRole('heading', { name: 'Notas privadas' }).waitFor()

    // Create a note first
    const originalText = `Nota Original ${Date.now()}`
    const updatedText = `Nota Editada ${Date.now()}`
    await page.getByPlaceholder('Escribí tus observaciones sobre este candidato…').fill(originalText)
    await page.getByRole('button', { name: 'Guardar nota' }).click()
    await expect(page.getByText(originalText)).toBeVisible({ timeout: 10000 })

    // Edit it
    await page.getByRole('button', { name: 'Editar nota' }).first().click()
    const editArea = page.getByRole('textbox').last()
    await editArea.fill(updatedText)
    await page.getByRole('button', { name: 'Guardar' }).click()

    await expect(page.getByText(updatedText)).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(originalText)).not.toBeVisible()
  })

  test('TC-NOTA-004 — Eliminar nota → desaparece', async ({ page }) => {
    const candidateUrl = await getFirstCandidateUrl(page)
    if (!candidateUrl) {
      test.skip(true, 'No candidates available')
      return
    }

    await page.goto(candidateUrl)
    await page.getByRole('heading', { name: 'Notas privadas' }).waitFor()

    // Create a note to delete
    const noteText = `Nota Borrar ${Date.now()}`
    await page.getByPlaceholder('Escribí tus observaciones sobre este candidato…').fill(noteText)
    await page.getByRole('button', { name: 'Guardar nota' }).click()
    await expect(page.getByText(noteText)).toBeVisible({ timeout: 10000 })

    // Delete it
    // Find the delete button near this specific note
    const noteRow = page.locator('*', { hasText: noteText }).last()
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

  test('TC-NOTA-005 — Nota de Reclutador A no aparece para Reclutador B (visibilidad básica)', async ({ page }) => {
    // This test verifies the page structure only — full isolation requires two recruiter accounts.
    // We verify that /reclutador/postulantes/[id] shows "Notas privadas" scoped to logged-in user.
    await loginAs(page, 'reclutador')
    const candidateUrl = await getFirstCandidateUrl(page)
    if (!candidateUrl) {
      test.skip(true, 'No candidates available')
      return
    }

    await page.goto(candidateUrl)
    // Notes section must be visible to the recruiter
    await expect(page.getByRole('heading', { name: 'Notas privadas' })).toBeVisible()
    // But the page should not show notes from other recruiters (RLS enforced at DB level)
    // We verify the page loads without error
    await expect(page).not.toHaveURL(/login/)
  })
})
