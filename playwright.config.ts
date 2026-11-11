import { defineConfig, devices } from '@playwright/test'
import { assertUrlLocal, leerEntornoLocal } from './e2e/support/entorno-local'

// Guard contra producción (H-002): sin stack local de Supabase, la config no carga.
const supabase = leerEntornoLocal()

// Playwright levanta su propio servidor, en un puerto que no usa el `npm run dev`
// habitual, para que la app bajo prueba nunca sea una instancia ya corriendo con
// otra configuración. No se admite PLAYWRIGHT_BASE_URL: apuntar la suite a un
// servidor externo saltearía el guard.
const PUERTO = 3100
const baseURL = `http://localhost:${PUERTO}`
assertUrlLocal('baseURL', baseURL)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // single Supabase instance — run sequentially to avoid data races
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  webServer: {
    command: `npx next dev --port ${PUERTO}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
    // Las variables de proceso pisan a los archivos .env: aunque `.env.local`
    // apunte a producción, la app bajo prueba solo ve el Supabase local. Gemini y
    // el mail transaccional quedan apagados para que la suite no salga de la máquina.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: supabase.apiUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: supabase.anonKey,
      SUPABASE_SERVICE_ROLE_KEY: supabase.serviceRoleKey,
      NEXT_PUBLIC_APP_URL: baseURL,
      GEMINI_API_KEY: 'e2e-sin-gemini',
      RESEND_API_KEY: '',
      EMAIL_POSTULACIONES_HABILITADO: 'false',
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
