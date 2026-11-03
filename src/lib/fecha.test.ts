import { describe, it, expect } from 'vitest'
import { formatFecha } from './fecha'

describe('formatFecha', () => {
  it('formatea string de solo fecha (YYYY-MM-DD) preservando el día civil (1 de marzo)', () => {
    // Al ser solo fecha DATE de PostgreSQL, debe interpretarse con UTC y no retroceder a febrero
    expect(formatFecha('2026-03-01')).toBe('1 de marzo de 2026')
    expect(formatFecha('2026-03-01', 'corta')).toBe('01/03/2026')
  })

  it('formatea un timestamp con hora (TIMESTAMPTZ) proyectado a hora argentina (28 de febrero)', () => {
    // 2026-03-01T02:00:00Z corresponde a las 23:00 del 28 de febrero de 2026 en UTC-3
    expect(formatFecha('2026-03-01T02:00:00Z')).toBe('28 de febrero de 2026')
    expect(formatFecha('2026-03-01T02:00:00Z', 'corta')).toBe('28/02/2026')
  })

  it('devuelve em-dash para valores nulos, indefinidos o vacíos', () => {
    expect(formatFecha(null)).toBe('—')
    expect(formatFecha(undefined)).toBe('—')
    expect(formatFecha('')).toBe('—')
  })

  it('devuelve em-dash para fechas inválidas', () => {
    expect(formatFecha('fecha-invalida')).toBe('—')
  })

  it('soporta las variantes de formato especificadas', () => {
    const fecha = '2026-03-01'
    expect(formatFecha(fecha, 'larga')).toBe('1 de marzo de 2026')
    expect(formatFecha(fecha, 'corta')).toBe('01/03/2026')
    expect(formatFecha(fecha, 'mes-anio')).toBe('marzo de 2026')
    expect(formatFecha(fecha, 'mes-anio-corto')).toBe('mar 2026')
    expect(formatFecha(fecha, 'larga-dos-digitos')).toBe('01 de marzo de 2026')
    expect(formatFecha(fecha, 'numerica')).toBe('1/3/2026')
    expect(formatFecha(fecha, 'abreviada')).toBe('1 de mar de 2026')
  })

  it('la variante con hora usa la hora argentina', () => {
    // 15:05Z son las 12:05 en UTC-3. Intl separa "p. m." con espacios no
    // separables, así que se normalizan antes de comparar.
    const texto = formatFecha('2026-03-01T15:05:00Z', 'con-hora').replace(/\s/g, ' ')
    expect(texto).toBe('01/03/2026, 12:05 p. m.')
  })

  it('permite sobreescribir la zona horaria explícitamente', () => {
    const ts = '2026-03-01T02:00:00Z'
    // Con UTC explícito, las 02:00Z caen en el 1 de marzo
    expect(formatFecha(ts, { formato: 'larga', timeZone: 'UTC' })).toBe('1 de marzo de 2026')
    // Con Argentina explícito, cae en el 28 de febrero
    expect(formatFecha(ts, { formato: 'larga', timeZone: 'America/Argentina/Buenos_Aires' })).toBe('28 de febrero de 2026')
  })
})
