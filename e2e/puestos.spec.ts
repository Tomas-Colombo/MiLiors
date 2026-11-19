import { test, expect } from '@playwright/test'
import { loginAs } from './fixtures/auth'
import {
  cambiarEstadoPuesto,
  completarPuestoMinimo,
  filaDePuesto,
  publicarPuesto,
} from './support/puestos'
import {
  contextoAnonimo,
  ingresarEnPantalla,
  leerLinkCompartir,
  publicarPuestoPrivado,
  tokenDeLink,
} from './support/enlace'

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

// TC-PUE-02x — Visibilidad del puesto y link para compartir (SPEC_VISIBILIDAD_PUESTO.md, J)

test.describe('M05 — Puestos: visibilidad privada y link para compartir', () => {
  test('TC-PUE-020 — Puesto privado: no está en el buscador y el link abre una vista previa pública', async ({
    page,
    browser,
    baseURL,
  }) => {
    await loginAs(page, 'reclutador')
    const title = `E2E Privado ${Date.now()}`
    await publicarPuestoPrivado(page, title)
    const link = await leerLinkCompartir(page)

    // Sin sesión: vista previa con el puesto y Postularme, indexación apagada.
    const anonimo = await contextoAnonimo(browser, baseURL)
    const anon = await anonimo.newPage()
    const respuesta = await anon.goto(link)
    expect(respuesta?.status()).toBe(200)
    await expect(anon.getByRole('heading', { name: title })).toBeVisible()
    await expect(anon.getByRole('link', { name: 'Postularme' })).toBeVisible()
    await expect(anon.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
    expect(respuesta?.headers()['referrer-policy']).toBe('no-referrer')
    await anonimo.close()

    // Con sesión de postulante: no figura en el buscador.
    await loginAs(page, 'postulante')
    await page.goto('/postulante/puestos')
    await expect(page.getByText(title)).not.toBeVisible()
  })

  test('TC-PUE-021 — Login con next vuelve al puesto y permite postularse con el link', async ({
    page,
    browser,
    baseURL,
  }) => {
    await loginAs(page, 'reclutador')
    const title = `E2E Link ${Date.now()}`
    const puestoId = await publicarPuestoPrivado(page, title)
    const link = await leerLinkCompartir(page)
    const token = tokenDeLink(link)

    const contexto = await contextoAnonimo(browser, baseURL)
    const candidato = await contexto.newPage()

    // Sin el link, el detalle del puesto privado da 404 para el postulante.
    await candidato.goto('/iniciar-sesion')
    await ingresarEnPantalla(candidato, 'postulante')
    await candidato.waitForURL('**/postulante**')
    const sinLink = await candidato.goto(`/postulante/puestos/${puestoId}`)
    expect(sinLink?.status()).toBe(404)
    await candidato.context().clearCookies()

    // Anónimo: Postularme lleva al login con next y, al ingresar, vuelve a la vista previa.
    await candidato.goto(link)
    await candidato.getByRole('link', { name: 'Postularme' }).click()
    await candidato.waitForURL(/\/iniciar-sesion\?next=/)
    await ingresarEnPantalla(candidato, 'postulante')
    await candidato.waitForURL(`**/empleos/${token}`)

    // Ya con sesión: va al detalle con ?enlace= y se postula.
    await candidato.getByRole('link', { name: 'Postularme' }).click()
    await candidato.waitForURL(`**/postulante/puestos/${puestoId}?enlace=${token}`)
    const aplicar = candidato.getByRole('button', { name: 'Postularme' })
    await expect(aplicar).toBeEnabled({ timeout: 10000 })
    await aplicar.click()
    await expect(candidato.getByRole('button', { name: 'Ya postulaste' })).toBeVisible({ timeout: 10000 })

    // La vista previa ahora lo muestra como postulado.
    await candidato.goto(link)
    await expect(candidato.getByText('Ya te postulaste')).toBeVisible()
    await contexto.close()
  })

  test('TC-PUE-022 — Regenerar el link: el viejo da 404 y el nuevo funciona', async ({
    page,
    browser,
    baseURL,
  }) => {
    await loginAs(page, 'reclutador')
    const title = `E2E Regenerar ${Date.now()}`
    await publicarPuestoPrivado(page, title)
    const linkViejo = await leerLinkCompartir(page)

    await page.getByRole('button', { name: 'Regenerar link', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Regenerar link', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10000 })

    let linkNuevo = linkViejo
    await expect(async () => {
      linkNuevo = await leerLinkCompartir(page)
      expect(linkNuevo).not.toBe(linkViejo)
    }).toPass({ timeout: 10000 })

    const anonimo = await contextoAnonimo(browser, baseURL)
    const anon = await anonimo.newPage()
    expect((await anon.goto(linkViejo))?.status()).toBe(404)
    expect((await anon.goto(linkNuevo))?.status()).toBe(200)
    await expect(anon.getByRole('heading', { name: title })).toBeVisible()
    await anonimo.close()
  })

  test('TC-PUE-023 — Un next externo se ignora: el login va al panel del rol', async ({ page }) => {
    for (const next of ['https://evil.com', '//evil.com']) {
      await page.context().clearCookies()
      await page.goto(`/iniciar-sesion?next=${encodeURIComponent(next)}`)
      await ingresarEnPantalla(page, 'postulante')
      await page.waitForURL('**/postulante**')
      expect(page.url()).not.toContain('evil.com')
    }
  })

  test('TC-PUE-024 — Un token inexistente da 404', async ({ page }) => {
    const respuesta = await page.goto(`/empleos/${'x'.repeat(32)}`)
    expect(respuesta?.status()).toBe(404)
  })
})
