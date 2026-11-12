import { test, expect } from '@playwright/test'
import { loginAs, POSTULANTE_IDS } from './fixtures/auth'
import { CUENTAS } from './support/datos-e2e'

// TC-VIS-001/002, TC-CAND-001/004/005/006 — Visibilidad de postulantes (regla H-230)

test.describe('M14 / M07 — Visibilidad de postulantes (H-230)', () => {
  test('TC-CAND-001 — Buscador muestra solo postulantes listos, visibles y no bloqueados', async ({ page }) => {
    await loginAs(page, 'reclutador')
    await page.goto('/reclutador/postulantes')
    await page.getByRole('heading', { name: 'Buscar postulantes' }).waitFor()

    // Visible: cumple las 4 condiciones
    await expect(page.getByText('Ana E2E Postulante')).toBeVisible()
    // No visibles: falta informe LISTO, bloqueado por admin, o toggle apagado
    await expect(page.getByText('Bruno Sin Informe E2E')).not.toBeVisible()
    await expect(page.getByText('Carla Bloqueada E2E')).not.toBeVisible()
    await expect(page.getByText('Diego Oculto E2E')).not.toBeVisible()
  })

  test('TC-VIS-001 + TC-VIS-002 — Toggle OFF oculta del buscador y Toggle ON vuelve a mostrar', async ({ page }) => {
    // 1. Verificar que Elena Toggle E2E aparece inicialmente (toggle ON)
    await loginAs(page, 'reclutador')
    await page.goto('/reclutador/postulantes')
    await expect(page.getByText('Elena Toggle E2E')).toBeVisible({ timeout: 10000 })

    // 2. El postulante apaga su visibilidad
    await loginAs(page, 'postulanteToggle')
    const toggle = page.getByRole('switch')
    const switchLabel = page.locator('label').filter({ has: toggle })
    await expect(toggle).toBeChecked()
    await switchLabel.click()
    await expect(page.getByText('Perfil oculto en búsquedas')).toBeVisible({ timeout: 10000 })

    // 3. Reclutador ya no la ve en el buscador (TC-VIS-002)
    await loginAs(page, 'reclutador')
    await page.goto('/reclutador/postulantes')
    await page.getByRole('heading', { name: 'Buscar postulantes' }).waitFor()
    await expect(page.getByText('Elena Toggle E2E')).not.toBeVisible()

    // 4. El postulante vuelve a encender su visibilidad (TC-VIS-001)
    await loginAs(page, 'postulanteToggle')
    const toggleOff = page.getByRole('switch')
    const switchLabelOff = page.locator('label').filter({ has: toggleOff })
    await expect(toggleOff).not.toBeChecked()
    await switchLabelOff.click()
    await expect(page.getByText('Perfil visible para reclutadores')).toBeVisible({ timeout: 10000 })

    // 5. Reclutador vuelve a verla en el buscador
    await loginAs(page, 'reclutador')
    await page.goto('/reclutador/postulantes')
    await expect(page.getByText('Elena Toggle E2E')).toBeVisible({ timeout: 10000 })
  })

  test('TC-CAND-004 — Contacto visible en detalle si el postulante está en búsqueda activa', async ({ page }) => {
    await loginAs(page, 'reclutador')
    await page.goto(`/reclutador/postulantes/${POSTULANTE_IDS.postulante}`)

    await expect(page.getByRole('heading', { name: 'Ana E2E Postulante' })).toBeVisible()
    await expect(page.getByText(CUENTAS.postulante)).toBeVisible()
  })

  test('TC-CAND-005 — Contacto visible si el postulante aplicó al puesto aunque tenga toggle OFF', async ({ page }) => {
    await loginAs(page, 'reclutador')
    await page.goto(`/reclutador/postulantes/${POSTULANTE_IDS.postulanteOculto}`)

    await expect(page.getByRole('heading', { name: 'Diego Oculto E2E' })).toBeVisible()
    await expect(page.getByText('No está en búsqueda')).toBeVisible()
    await expect(page.getByText(CUENTAS.postulanteOculto)).toBeVisible()
  })

  test('TC-CAND-006 — Acceso directo por URL oculta perfil y contacto si toggle OFF, sin informe LISTO o bloqueado sin postulación', async ({
    page,
  }) => {
    // reclutador2 no tiene postulaciones de ninguno de estos postulantes
    await loginAs(page, 'reclutador2')

    for (const id of [
      POSTULANTE_IDS.postulanteOculto,
      POSTULANTE_IDS.postulanteSinInforme,
      POSTULANTE_IDS.postulanteBloqueado,
    ]) {
      await page.goto(`/reclutador/postulantes/${id}`)
      await expect(page.getByRole('heading', { name: 'No encontramos esto' })).toBeVisible({ timeout: 10000 })
    }

    await expect(page.getByText(CUENTAS.postulanteOculto)).not.toBeVisible()
    await expect(page.getByText(CUENTAS.postulanteSinInforme)).not.toBeVisible()
    await expect(page.getByText(CUENTAS.postulanteBloqueado)).not.toBeVisible()
  })
})
