import { type NextRequest } from 'next/server'
import { getSessionUser } from '@/lib/dal'
import {
  getCarrerasAdmin,
  getCarrerasOtrasAdmin,
  getCompetenciasAdmin,
  getCompetenciasUsoAdmin,
  getEmpresasAdmin,
  getIdiomasAdmin,
  getSectoresAdmin,
} from '@/modules/admin/queries'
import {
  describirFiltrosCatalogo,
  filtrarCatalogo,
  finDelDia,
  ordenarCatalogo,
  type FiltrosCatalogo,
} from '@/modules/admin/catalogo-filtros'
import {
  construirCarrerasWorkbook,
  construirCatalogoSimpleWorkbook,
  construirCompetenciasWorkbook,
  construirEmpresasWorkbook,
} from '@/modules/admin/catalogo-workbook'

/**
 * Export .xlsx de los catálogos de admin, con el mismo formato que el reporte
 * de feedback.
 *
 * Una sola ruta para los cinco catálogos: lo que cambia entre ellos son las
 * columnas, no el flujo (autorizar → leer → filtrar → dibujar). Un archivo por
 * catálogo terminaría siendo el mismo copiado cinco veces.
 *
 * Los filtros se aplican con las MISMAS funciones puras que usa la pantalla
 * (catalogo-filtros.ts): lo que se descarga es exactamente lo que se ve.
 */

const RECURSOS = ['carreras', 'idiomas', 'competencias', 'sectores', 'empresas'] as const
type Recurso = (typeof RECURSOS)[number]

function esRecurso(v: string | null): v is Recurso {
  return !!v && (RECURSOS as readonly string[]).includes(v)
}

export async function GET(req: NextRequest) {
  const session = await getSessionUser()
  if (!session) return new Response('No autorizado', { status: 401 })
  if (session.rol !== 'ADMIN') return new Response('Prohibido', { status: 403 })

  const sp = req.nextUrl.searchParams
  const recurso = sp.get('recurso')
  if (!esRecurso(recurso)) {
    return new Response('Recurso desconocido', { status: 400 })
  }

  const filtros: FiltrosCatalogo = {
    q: sp.get('q') ?? undefined,
    estado: sp.get('estado') ?? undefined,
    desde: sp.get('desde') ?? undefined,
    hasta: sp.get('hasta') ?? undefined,
    orden: sp.get('orden') ?? undefined,
  }
  const descripcion = describirFiltrosCatalogo(filtros)
  const hoy = new Date().toISOString().slice(0, 10)

  let xlsx: Buffer
  let nombre: string

  try {
    switch (recurso) {
      case 'carreras': {
        // La sección de oficiales y la de "otras" tienen filtros propios en la
        // pantalla (qA/estadoA vs qB/desde/hasta), así que viajan por separado.
        const filtrosA: FiltrosCatalogo = {
          q: sp.get('qA') ?? undefined,
          estado: sp.get('estadoA') ?? undefined,
        }
        const qB = (sp.get('qB') ?? '').trim()
        const desde = sp.get('desde') ?? undefined
        const hasta = sp.get('hasta') ?? undefined

        const [todas, otras] = await Promise.all([
          getCarrerasAdmin(),
          getCarrerasOtrasAdmin({
            q: qB || undefined,
            desde: desde || undefined,
            hasta: finDelDia(hasta) || undefined,
          }),
        ])

        xlsx = await construirCarrerasWorkbook({
          oficiales: filtrarCatalogo(todas, filtrosA, {
            nombre: c => c.nombre,
            activo: c => !c.fecha_baja,
            createdAt: c => c.created_at,
          }),
          otras,
          filtrosOficiales: describirFiltrosCatalogo(filtrosA),
          filtrosOtras: describirFiltrosCatalogo({ q: qB, desde, hasta }),
        })
        nombre = `carreras-${hoy}.xlsx`
        break
      }

      case 'competencias': {
        const [catalogo, uso] = await Promise.all([
          getCompetenciasAdmin(),
          getCompetenciasUsoAdmin(),
        ])
        const acc = {
          nombre: (c: { nombre: string }) => c.nombre,
          activo: (c: { fecha_baja: string | null }) => !c.fecha_baja,
          createdAt: (c: { created_at: string }) => c.created_at,
        }
        const visibles = ordenarCatalogo(filtrarCatalogo(catalogo, filtros, acc), filtros.orden, acc)

        xlsx = await construirCompetenciasWorkbook({
          catalogo: visibles.map(c => ({
            nombre: c.nombre,
            activo: !c.fecha_baja,
            createdAt: c.created_at,
          })),
          // El uso se filtra por nombre y estado, pero NO por fecha de alta del
          // catálogo: recortar por ahí escondería habilidades viejas que se
          // siguen cargando, que es lo contrario de lo que esta hoja muestra.
          uso: filtrarCatalogo(
            uso,
            { q: filtros.q, estado: filtros.estado },
            { nombre: u => u.nombre, activo: u => u.activa, createdAt: u => u.createdAt },
          ),
          filtrosDescripcion: descripcion,
        })
        nombre = `habilidades-tecnologias-${hoy}.xlsx`
        break
      }

      case 'empresas': {
        const empresas = await getEmpresasAdmin()
        const acc = {
          nombre: (e: { nombre_empresa: string }) => e.nombre_empresa,
          activo: (e: { activa: boolean }) => e.activa,
          createdAt: (e: { created_at: string }) => e.created_at,
          buscarTambienEn: (e: { reclutadores: { nombre: string; email: string | null }[] }) =>
            e.reclutadores.flatMap(r => [r.nombre, r.email ?? '']),
        }
        let visibles = filtrarCatalogo(empresas, filtros, acc)

        const reclutadores = sp.get('reclutadores') ?? ''
        if (reclutadores === 'con') visibles = visibles.filter(e => e.reclutadores.length > 0)
        if (reclutadores === 'sin') visibles = visibles.filter(e => e.reclutadores.length === 0)

        xlsx = await construirEmpresasWorkbook({
          empresas: ordenarCatalogo(visibles, filtros.orden, acc),
          filtrosDescripcion: describirFiltrosCatalogo(filtros, [
            ...(reclutadores === 'con' ? ['sólo con reclutadores'] : []),
            ...(reclutadores === 'sin' ? ['sólo sin reclutadores'] : []),
          ]),
        })
        nombre = `empresas-${hoy}.xlsx`
        break
      }

      case 'idiomas': {
        const acc = {
          nombre: (i: { nombre: string }) => i.nombre,
          activo: (i: { fecha_baja: string | null }) => !i.fecha_baja,
          createdAt: (i: { created_at: string }) => i.created_at,
        }
        const idiomas = ordenarCatalogo(
          filtrarCatalogo(await getIdiomasAdmin(), filtros, acc),
          filtros.orden,
          acc,
        )
        xlsx = await construirCatalogoSimpleWorkbook({
          hoja: 'Idiomas',
          titulo: 'Idiomas',
          descripcion: 'Catálogo de idiomas. Los inactivos son bajas lógicas: siguen existiendo en los perfiles que ya los tenían.',
          etiquetaAlta: 'Creado',
          etiquetaActivo: 'Activo',
          etiquetaInactivo: 'Inactivo',
          filas: idiomas.map(i => ({
            nombre: i.nombre,
            activo: !i.fecha_baja,
            createdAt: i.created_at,
          })),
          filtrosDescripcion: descripcion,
        })
        nombre = `idiomas-${hoy}.xlsx`
        break
      }

      case 'sectores': {
        const acc = {
          nombre: (s: { nombre_sector: string }) => s.nombre_sector,
          activo: (s: { fecha_baja_s: string | null }) => !s.fecha_baja_s,
          createdAt: (s: { created_at: string }) => s.created_at,
        }
        const sectores = ordenarCatalogo(
          filtrarCatalogo(await getSectoresAdmin(), filtros, acc),
          filtros.orden,
          acc,
        )
        xlsx = await construirCatalogoSimpleWorkbook({
          hoja: 'Sectores',
          titulo: 'Sectores industriales',
          descripcion: 'Catálogo de sectores. Los inactivos son bajas lógicas: siguen existiendo en los puestos que ya los usaban.',
          etiquetaAlta: 'Creado',
          etiquetaActivo: 'Activo',
          etiquetaInactivo: 'Inactivo',
          filas: sectores.map(s => ({
            nombre: s.nombre_sector,
            activo: !s.fecha_baja_s,
            createdAt: s.created_at,
          })),
          filtrosDescripcion: descripcion,
        })
        nombre = `sectores-${hoy}.xlsx`
        break
      }
    }
  } catch (err) {
    console.error(`[admin/catalogos/export] No se pudo generar el .xlsx de ${recurso}:`, err)
    return new Response('No se pudo generar el archivo.', { status: 500 })
  }

  return new Response(new Uint8Array(xlsx), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nombre}"`,
      'Cache-Control': 'no-store',
    },
  })
}
