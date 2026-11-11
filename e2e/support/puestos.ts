import { expect, type Page } from '@playwright/test'

/**
 * The puesto form uses custom selects (FancySelect): a trigger button plus a
 * hidden input, not a native <select>. Opens the one wrapped in `#campoId` and
 * picks the option by its visible label.
 */
export async function elegirOpcion(page: Page, campoId: string, opcion: string): Promise<void> {
  const campo = page.locator(`#${campoId}`)
  await campo.getByRole('button').first().click()
  await campo.getByRole('button', { name: opcion, exact: true }).click()
}

/** Fills the minimum required fields of /reclutador/puestos/nuevo without submitting. */
export async function completarPuestoMinimo(
  page: Page,
  titulo: string,
  opciones: { notasPrivadas?: string } = {}
): Promise<void> {
  await page.goto('/reclutador/puestos/nuevo')
  await page.getByRole('heading', { name: 'Publicar nuevo puesto' }).waitFor()
  // The seeded recruiter has a single company, which the form preselects.
  await page.getByLabel('Título del puesto').fill(titulo)
  await elegirOpcion(page, 'carga_horaria', 'Tiempo completo')
  await elegirOpcion(page, 'ubicacion', 'Remoto')
  if (opciones.notasPrivadas) {
    await page.locator('#perfil_psicologico_deseado').fill(opciones.notasPrivadas)
  }
}

/** Row of the recruiter's puestos list holding `titulo` (re-fetches until it shows up). */
export async function filaDePuesto(page: Page, titulo: string) {
  await expect(async () => {
    await page.goto('/reclutador/puestos')
    await expect(page.getByText(titulo)).toBeVisible({ timeout: 2000 })
  }).toPass({ timeout: 20000 })
  return page.locator('div.grid').filter({ hasText: titulo })
}

/** Publishes a minimal active puesto as the logged-in recruiter and returns its id. */
export async function publicarPuesto(
  page: Page,
  titulo: string,
  opciones: { notasPrivadas?: string } = {}
): Promise<string> {
  await completarPuestoMinimo(page, titulo, opciones)
  await page.getByRole('button', { name: 'Publicar puesto' }).click()

  // Publishing opens a confirmation modal (auto-pause notice) whose button goes
  // to the new puesto's detail page: its id comes from that URL.
  const aviso = page.getByRole('dialog', { name: 'Tu puesto fue publicado' })
  await aviso.getByRole('button', { name: 'Entendido, ir al puesto' }).click({ timeout: 15000 })
  await page.waitForURL(/\/reclutador\/puestos\/[0-9a-f-]{36}$/, { timeout: 15000 })
  return page.url().split('/').pop()!
}

/** Pausa o reactiva desde la fila del listado, confirmando el modal. */
export async function cambiarEstadoPuesto(
  page: Page,
  titulo: string,
  accion: 'Pausar' | 'Reactivar'
): Promise<void> {
  const fila = await filaDePuesto(page, titulo)
  await fila.getByRole('button', { name: accion, exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: accion, exact: true }).click()
  await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10000 })
}
