import type { Producto } from './landed'
import type { ResultadoLanded } from './landed'

export const COLUMNAS = [
  'sku', 'nombre', 'descripcion', 'material', 'pais', 'cantidad', 'valor_unitario_usd', 'peso_bruto_kg', 'peso_neto_kg',
  'bultos', 'largo_cm', 'ancho_cm', 'alto_cm', 'apilable', 'volumen_m3', 'partida', 'dai_pct', 'sc_pct', 'iva_pct',
  'otros_pct', 'certificado_origen', 'requiere_permiso',
] as const

const EJEMPLO = [
  'SOFA-01', 'Sofá de 3 plazas', 'Sofá tapizado en tela', 'Madera y tela', 'CN', '50', '300', '2500', '2300',
  '50', '200', '90', '80', 'si', '', '9401.61.00.00', '', '', '13', '0', 'no', 'no',
]

export const plantillaCSV = () => [COLUMNAS.join(','), EJEMPLO.join(',')].join('\n')

/** Separa una línea CSV respetando comillas. Acepta coma o punto y coma. */
function partir(linea: string, sep: string): string[] {
  const out: string[] = []
  let cur = ''
  let q = false
  for (let i = 0; i < linea.length; i++) {
    const ch = linea[i]
    if (q) {
      if (ch === '"' && linea[i + 1] === '"') { cur += '"'; i++ }
      else if (ch === '"') q = false
      else cur += ch
    } else if (ch === '"') q = true
    else if (ch === sep) { out.push(cur); cur = '' }
    else cur += ch
  }
  out.push(cur)
  return out.map((x) => x.trim())
}

const num = (v: string | undefined) => {
  if (v === undefined || v.trim() === '') return undefined
  const n = Number(v.replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}
const bool = (v: string | undefined) => /^(si|sí|s|yes|y|true|1|x)$/i.test((v ?? '').trim())
const tasa = (v: string | undefined) => { const n = num(v); return n === undefined ? null : n / 100 }

export interface FilaImportada { producto: Producto; partida: string; errores: string[] }

export function importarCSV(texto: string): FilaImportada[] {
  const lineas = texto.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim())
  if (lineas.length < 2) return []
  const sep = (lineas[0].match(/;/g)?.length ?? 0) > (lineas[0].match(/,/g)?.length ?? 0) ? ';' : ','
  const cab = partir(lineas[0], sep).map((h) => h.toLowerCase())
  const idx = (k: string) => cab.indexOf(k)
  return lineas.slice(1).map((l, n) => {
    const f = partir(l, sep)
    const g = (k: string) => (idx(k) >= 0 ? f[idx(k)] : undefined)
    const errores: string[] = []
    const cantidad = num(g('cantidad')) ?? 0
    const valorUnitario = num(g('valor_unitario_usd')) ?? 0
    const pesoBrutoKg = num(g('peso_bruto_kg')) ?? 0
    if (!g('nombre')) errores.push('falta el nombre')
    if (cantidad <= 0) errores.push('cantidad inválida')
    if (valorUnitario <= 0) errores.push('valor unitario inválido')
    const largo = num(g('largo_cm'))
    const partida = (g('partida') ?? '').trim()
    const dai = tasa(g('dai_pct'))
    const producto: Producto = {
      id: `csv-${Date.now()}-${n}`,
      sku: g('sku') || `SKU-${n + 1}`,
      nombre: g('nombre') || '',
      descripcion: g('descripcion') || undefined,
      material: g('material') || undefined,
      paisFabricacion: (g('pais') || 'CN').toUpperCase(),
      cantidad, valorUnitario, pesoBrutoKg,
      pesoNetoKg: num(g('peso_neto_kg')),
      bultos: largo ? { cantidad: num(g('bultos')) ?? 1, largoCm: largo, anchoCm: num(g('ancho_cm')) ?? 0, altoCm: num(g('alto_cm')) ?? 0, apilable: g('apilable') === undefined || g('apilable') === '' ? true : bool(g('apilable')) } : undefined,
      volumenM3: num(g('volumen_m3')),
      clasificacion: partida ? { codigo: partida, descripcion: partida, dai, sc: tasa(g('sc_pct')), iva: tasa(g('iva_pct')) ?? 0.13, otros: tasa(g('otros_pct')) ?? 0, estado: 'preliminar' } : null,
      certificadoOrigen: bool(g('certificado_origen')),
      requierePermiso: bool(g('requiere_permiso')),
    }
    if (!producto.bultos && !producto.volumenM3) errores.push('sin medidas ni volumen')
    return { producto, partida, errores }
  })
}

const esc = (v: string | number) => {
  const s = String(v)
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function exportarSKU(r: ResultadoLanded): string {
  const cab = ['SKU', 'Producto', 'Cantidad', 'Valor mercancía USD', 'Costos logísticos USD', 'Valor aduanero USD', 'DAI USD', 'Selectivo USD', 'Ley 6946 USD', 'IVA USD', 'Otros USD', 'Impuestos USD', 'Landed Cost total USD', 'Landed Cost unitario USD', 'Landed Cost sin IVA USD', 'Unitario sin IVA USD', 'Pendientes']
  const filas = r.productos.map((p) => [
    p.sku, p.nombre, p.cantidad, p.valorMercancia, p.logistica, p.valorAduanero,
    p.impuestos.dai ?? 'pendiente', p.impuestos.sc ?? 'pendiente', p.impuestos.ley6946 ?? 'pendiente', p.impuestos.iva ?? 'pendiente', p.impuestos.otros ?? 'pendiente',
    p.impuestosTotal, p.landedTotal, p.landedUnitario, p.landedTotalSinIVA, p.landedUnitarioSinIVA, p.impuestos.pendientes.join(' / '),
  ])
  filas.push(['TOTAL', '', r.productos.reduce((s, p) => s + p.cantidad, 0), r.totales.mercancia, r.totales.logistica, '', '', '', '', '', '', r.totales.impuestos, r.totales.total, '', r.totales.totalSinIVA, '', r.pendientes.length ? `${r.pendientes.length} pendientes en el embarque` : ''])
  return '﻿' + [cab, ...filas].map((f) => f.map(esc).join(',')).join('\n')
}

export function descargar(nombre: string, contenido: string, tipo = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
