import { test, expect, type Page } from '@playwright/test'
import { loginAs } from './fixtures/auth'

// Memoria de filtros por pestaña — src/lib/filter-memory.ts
//
// Los filtros viven en la query string, y antes se perdían porque el sidebar y los enlaces
// "Volver" apuntaban a hrefs sin query. Estos tests entran al listado con la query ya puesta
// (equivale a haber filtrado a mano, pero sin depender del markup de cada filtro) y verifican
// que al volver siga ahí.

const LISTADO = '/reclutador/postulantes'
const FILTRO = 'busqueda=ana'

function irAlListadoFiltrado(page: Page) {
  return page.goto(`${LISTADO}?${FILTRO}`)
}

/** Busca un candidato en el listado sin filtrar, para no depender de que el filtro dé resultados. */
async function getPrimerCandidatoUrl(page: Page): Promise<string | null> {
  await page.goto(LISTADO)
  const link = page.locator(`a[href^="${LISTADO}/"]`).first()
  if ((await link.count()) === 0) return null
  return link.getAttribute('href')
}

test.describe('Memoria de filtros', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'reclutador')
  })

  test('Volver por el sidebar restaura los filtros', async ({ page }) => {
    await irAlListadoFiltrado(page)

    await page.getByRole('link', { name: 'Mis notas' }).click()
    await page.waitForURL('**/reclutador/notas**')

    await page.getByRole('link', { name: 'Buscar candidatos' }).click()
    await page.waitForURL(`**${LISTADO}?**`)
    expect(page.url()).toContain(FILTRO)
  })

  test('Volver desde el detalle de un candidato restaura los filtros', async ({ page }) => {
    const candidatoUrl = await getPrimerCandidatoUrl(page)
    if (!candidatoUrl) {
      test.skip(true, 'No hay candidatos en el listado')
      return
    }

    await irAlListadoFiltrado(page)
    await page.goto(candidatoUrl)

    await page.getByRole('link', { name: /volver a la búsqueda/i }).click()
    await page.waitForURL(`**${LISTADO}?**`)
    expect(page.url()).toContain(FILTRO)
  })

  test('Clickear en el sidebar la vista donde ya estamos limpia los filtros', async ({ page }) => {
    await irAlListadoFiltrado(page)

    await page.getByRole('link', { name: 'Buscar candidatos' }).click()
    await page.waitForURL(`**${LISTADO}`)
    expect(page.url()).not.toContain(FILTRO)

    // Y la memoria quedó borrada: dar una vuelta y volver sigue sin filtrar.
    await page.getByRole('link', { name: 'Mis notas' }).click()
    await page.waitForURL('**/reclutador/notas**')
    await page.getByRole('link', { name: 'Buscar candidatos' }).click()
    await page.waitForURL(`**${LISTADO}`)
    expect(page.url()).not.toContain(FILTRO)
  })

  // Regresión: isActive() matchea por prefijo para el resaltado, así que en el detalle el ítem
  // del listado figura activo. Si esa función decidiera "reset vs restaurar", este caso —volver
  // del detalle por el sidebar— borraría los filtros justo cuando hay que restaurarlos.
  test('Desde el detalle, el sidebar restaura en vez de limpiar', async ({ page }) => {
    const candidatoUrl = await getPrimerCandidatoUrl(page)
    if (!candidatoUrl) {
      test.skip(true, 'No hay candidatos en el listado')
      return
    }

    await irAlListadoFiltrado(page)
    await page.goto(candidatoUrl)

    await page.getByRole('link', { name: 'Buscar candidatos' }).click()
    await page.waitForURL(`**${LISTADO}?**`)
    expect(page.url()).toContain(FILTRO)
  })

  test('Limpiar los filtros no deja memoria atrás', async ({ page }) => {
    await irAlListadoFiltrado(page)

    // Equivale a "Limpiar filtros": el listado queda sin query.
    await page.goto(LISTADO)

    await page.getByRole('link', { name: 'Mis notas' }).click()
    await page.waitForURL('**/reclutador/notas**')
    await page.getByRole('link', { name: 'Buscar candidatos' }).click()
    await page.waitForURL(`**${LISTADO}`)
    expect(page.url()).not.toContain(FILTRO)
  })

  test('Una pestaña nueva abre el listado sin filtrar', async ({ page }) => {
    await irAlListadoFiltrado(page)

    const otraPestana = await page.context().newPage()
    await otraPestana.goto(LISTADO)
    expect(otraPestana.url()).not.toContain(FILTRO)

    await otraPestana.getByRole('link', { name: 'Mis notas' }).click()
    await otraPestana.waitForURL('**/reclutador/notas**')
    await otraPestana.getByRole('link', { name: 'Buscar candidatos' }).click()
    await otraPestana.waitForURL(`**${LISTADO}`)
    expect(otraPestana.url()).not.toContain(FILTRO)

    await otraPestana.close()
  })
})
