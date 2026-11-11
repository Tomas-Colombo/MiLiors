import { test, expect, type Page } from '@playwright/test'
import { loginAs } from './fixtures/auth'

// Memoria de filtros por pestaña — src/lib/filter-memory.ts
//
// Los filtros viven en la query string y <FilterMemory> recuerda la de cada listado en
// sessionStorage. La restaura un solo consumidor: <VolverLink>, el "Volver" del detalle.
// El sidebar, a propósito, NO la restaura: entrar a una sección desde el menú es "lleváme
// al listado", no "devolveme lo que había filtrado".
//
// Estos tests entran al listado con la query ya puesta (equivale a haber filtrado a mano,
// sin depender del markup de cada filtro) y verifican adónde lleva cada forma de volver.

const LISTADO = '/reclutador/postulantes'
const FILTRO = 'busqueda=ana'
const CLAVE_MEMORIA = `miliors-filters:${LISTADO}`

/** Entra al listado filtrado y espera a que <FilterMemory> haya guardado la query. */
async function irAlListadoFiltrado(page: Page) {
  await page.goto(`${LISTADO}?${FILTRO}`)
  await page.waitForFunction((clave) => sessionStorage.getItem(clave) !== null, CLAVE_MEMORIA)
}

/**
 * Busca un candidato en el listado sin filtrar, para no depender de que el filtro dé
 * resultados. El postulante sembrado por e2e/global-setup.ts es visible: si no hay
 * ninguno, el test falla.
 */
async function getPrimerCandidatoUrl(page: Page): Promise<string> {
  await page.goto(LISTADO)
  const link = page.locator(`a[href^="${LISTADO}/"]`).first()
  await expect(link).toBeVisible({ timeout: 10000 })
  return (await link.getAttribute('href'))!
}

function linkSidebar(page: Page) {
  // exact: el dashboard tiene una tarjeta "Buscar candidatos — Explorá el…" con el mismo destino.
  return page.getByRole('link', { name: 'Buscar candidatos', exact: true })
}

function linkVolver(page: Page) {
  return page.getByRole('link', { name: /volver a la búsqueda/i })
}

test.describe('Memoria de filtros', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'reclutador')
  })

  test('Volver desde el detalle de un candidato restaura los filtros', async ({ page }) => {
    const candidatoUrl = await getPrimerCandidatoUrl(page)

    await irAlListadoFiltrado(page)
    await page.goto(candidatoUrl)

    await linkVolver(page).click()
    await page.waitForURL(`**${LISTADO}?**`)
    expect(page.url()).toContain(FILTRO)
  })

  test('Desde el detalle, el sidebar lleva al listado sin filtrar', async ({ page }) => {
    const candidatoUrl = await getPrimerCandidatoUrl(page)

    await irAlListadoFiltrado(page)
    await page.goto(candidatoUrl)

    await linkSidebar(page).click()
    await page.waitForURL(`**${LISTADO}`)
    expect(page.url()).not.toContain(FILTRO)
  })

  test('Desde otra sección, el sidebar lleva al listado sin filtrar', async ({ page }) => {
    await irAlListadoFiltrado(page)

    await page.getByRole('link', { name: 'Mis notas', exact: true }).click()
    await page.waitForURL('**/reclutador/notas**')

    await linkSidebar(page).click()
    await page.waitForURL(`**${LISTADO}`)
    expect(page.url()).not.toContain(FILTRO)
  })

  test('Limpiar los filtros no deja memoria atrás', async ({ page }) => {
    const candidatoUrl = await getPrimerCandidatoUrl(page)
    await irAlListadoFiltrado(page)

    // Equivale a "Limpiar filtros": el listado queda sin query y la entrada se borra.
    await page.goto(LISTADO)
    await page.waitForFunction((clave) => sessionStorage.getItem(clave) === null, CLAVE_MEMORIA)

    await page.goto(candidatoUrl)
    await linkVolver(page).click()
    await page.waitForURL(`**${LISTADO}`)
    expect(page.url()).not.toContain(FILTRO)
  })

  test('Una pestaña nueva no hereda la memoria de otra', async ({ page }) => {
    const candidatoUrl = await getPrimerCandidatoUrl(page)
    await irAlListadoFiltrado(page)

    const otraPestana = await page.context().newPage()
    await otraPestana.goto(candidatoUrl)
    await linkVolver(otraPestana).click()
    await otraPestana.waitForURL(`**${LISTADO}`)
    expect(otraPestana.url()).not.toContain(FILTRO)

    await otraPestana.close()
  })
})
