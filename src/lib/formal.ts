/**
 * COTIZACIÓN FORMAL (Fase 3)
 * ---------------------------------------------------------------
 * Una cotización solo puede emitirse como formal cuando:
 *  - no quedan pendientes (impuestos, datos por confirmar, costos sin tarifa),
 *  - todas las clasificaciones están validadas por el agente aduanero,
 *  - ningún costo esencial sigue siendo "estimado" (referencial),
 *  - las tarifas aplicadas son reales y están vigentes,
 *  - el cliente está identificado.
 * Cualquier cambio posterior en los datos anula la emisión (huella).
 */
import type { Producto, ResultadoLanded } from './landed'
import { usable, vigencia, type Tarifa } from './tarifas'

export interface Emision { emitida: string; por: string; huella: string; vence: string }

export interface Requisito { ok: boolean; texto: string; detalle?: string[] }

export function requisitosFormal(
  r: ResultadoLanded, productos: Producto[], aplicadas: Tarifa[], clienteOk: boolean,
): Requisito[] {
  const sinValidar = productos.filter((p) => p.clasificacion?.estado !== 'validada')
  const estimados = r.conceptos.filter((k) => k.estado === 'estimado')
  const ejemplos = aplicadas.filter((t) => t.ejemplo)
  const vencidas = aplicadas.filter((t) => !usable(t))
  return [
    { ok: clienteOk, texto: 'Cliente identificado (nombre, identificación y un contacto en "Mi perfil")' },
    { ok: sinValidar.length === 0, texto: 'Clasificación arancelaria validada por el agente aduanero', detalle: sinValidar.map((p) => `${p.sku || p.nombre}: ${p.clasificacion ? 'preliminar' : 'sin clasificar'}`) },
    { ok: r.pendientes.length === 0, texto: 'Sin pendientes de confirmar', detalle: r.pendientes },
    { ok: estimados.length === 0, texto: 'Todos los costos confirmados con tarifa del proveedor (ninguno referencial)', detalle: estimados.map((k) => k.nombre) },
    { ok: ejemplos.length === 0, texto: 'Sin tarifas de ejemplo aplicadas', detalle: ejemplos.map((t) => t.proveedor) },
    { ok: vencidas.length === 0, texto: 'Tarifas aplicadas vigentes', detalle: vencidas.map((t) => `${t.proveedor}: ${vigencia(t) === 'futura' ? 'aún no vigente' : `venció el ${t.vigenteHasta}`}`) },
  ]
}

export const puedeEmitir = (rs: Requisito[]) => rs.every((x) => x.ok)

/** Huella de los datos que sustentan la cotización. */
export function huella(datos: unknown): string {
  const s = JSON.stringify(datos)
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

/** Vigencia de la formal: la menor entre los días estándar y el vencimiento de las tarifas. */
export function venceFormal(desde: Date, dias: number, aplicadas: Tarifa[]): string {
  const d = new Date(desde)
  d.setDate(d.getDate() + dias)
  let fin = d.toISOString().slice(0, 10)
  for (const t of aplicadas) if (t.vigenteHasta && t.vigenteHasta < fin) fin = t.vigenteHasta
  return fin
}

// ---------------------------------------------------------------- Modo agencia
// Muestra herramientas del operador (tarifas, validación, emisión formal).
// NO es un control de seguridad: cualquiera que conozca el enlace puede activarlo.
// La seguridad real (usuarios y permisos) llega con la Fase 4.

const CLAVE = 'landex:agencia'

export function modoAgencia(): boolean {
  try {
    if (location.hash === '#agencia') localStorage.setItem(CLAVE, '1')
    if (location.hash === '#cliente') localStorage.removeItem(CLAVE)
    return localStorage.getItem(CLAVE) === '1'
  } catch { return false }
}

export function salirModoAgencia() {
  try { localStorage.removeItem(CLAVE) } catch { /* sin almacenamiento */ }
}
