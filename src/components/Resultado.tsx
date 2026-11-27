import { confiabilidad } from '../lib/confianza'
import { Confiabilidad } from './Confiabilidad'
import type { ReactNode } from 'react'
import type { Emision } from '../lib/formal'
import { useState } from 'react'
import { MODOS, type Modo } from '../data/config'
import { VIGENCIA_TARIFAS } from '../data/logistica'
import { descargar, exportarSKU } from '../lib/csv'
import { crc, usd } from '../lib/formato'
import {
  BASES, compararModalidades, ESTADOS, ETAPAS, type Ajuste, type Base, type Embarque, type Etapa, type EstadoConcepto,
  type Producto, type ResultadoLanded,
} from '../lib/landed'
import { Solicitud } from './Solicitud'
import { desglosar } from '../lib/servicios'
import { Termino } from './Termino'

interface Props {
  e: Embarque
  productos: Producto[]
  r: ResultadoLanded
  onAjuste: (id: string, a: Ajuste | null) => void
  onModo: (m: Modo) => void
  /** Emisión formal vigente (Fase 3). */
  formal?: Emision
  /** Ofertas de proveedores, antes del desglose. */
  ofertas?: ReactNode
  /** Expediente de documentos, antes de la solicitud. */
  expediente?: ReactNode
  /** Alcance del servicio (LANDEX / cliente), después de la confiabilidad. */
  alcance?: ReactNode
  /** Servicios que el cliente ya contrató por su cuenta (para separar a quién le paga). */
  externos?: string[]
}

// Paleta LANDEX: azul marino para la mercancía, azul eléctrico para impuestos y grises azulados para la logística
const COLORES: Record<Etapa | 0, string> = { 0: '#101E30', 1: '#B8C9DE', 2: '#91A4BD', 3: '#3a5577', 4: '#6f86a3', 5: '#48A9FF', 6: '#24405f', 7: '#d5e0ee' }

export function Resultado({ e, productos, r, onAjuste, onModo, formal, ofertas, expediente, alcance, externos = [] }: Props) {
  const d = desglosar(r, externos)
  const impPend = r.productos.some((x) => x.impuestos.pendientes.length > 0)
  const [abierta, setAbierta] = useState<Etapa | null>(null)
  const comp = compararModalidades(e, productos)
  const compatibles = comp.filter((m) => m.compatible && !m.fletePendiente && !m.incompleta)
  const recomendada = compatibles.length ? compatibles.reduce((a, b) => (b.total < a.total ? b : a)) : null
  const unidades = r.productos.reduce((s, p) => s + p.cantidad, 0)
  const propios = r.conceptos.filter((k) => ['honorarios', 'coordinacion'].includes(k.id))
  const honorarios = propios.filter((k) => k.estado === 'estimado' || k.estado === 'confirmado').reduce((s, k) => s + (k.monto ?? 0), 0)
  const otrosServicios = Math.round((r.totales.logistica - honorarios) * 100) / 100
  const adicional = r.totales.total - r.totales.mercancia

  const segmentos: { k: Etapa | 0; nombre: string; v: number }[] = [
    { k: 0, nombre: 'Mercancía', v: r.totales.mercancia },
    ...([1, 2, 3, 4, 6, 7] as Etapa[]).map((k) => ({ k, nombre: ETAPAS[k], v: r.porEtapa[k].total })),
    { k: 5, nombre: 'Impuestos y nacionalización', v: r.totales.impuestos + r.porEtapa[5].total },
  ]

  return (
    <section className="resultado">
      <div className="total">
        <div className="fila-estado">
          <span className="etiqueta">{r.estado === 'incompleta' ? 'Subtotal estimado (faltan costos)' : e.requiereDescarga ? 'Costo estimado puesto y descargado en tu bodega' : 'Costo estimado puesto en tu bodega'}</span>
          <span className={`estado-cot ${formal ? 'formal' : r.estado}`}>{formal ? `Cotización formal · vence el ${formal.vence}` : r.estado === 'incompleta' ? `Estimada incompleta · ${r.pendientes.length} pendiente(s)` : 'Cotización estimada'}</span>
        </div>
        <strong>{usd(r.totales.total)}</strong>
        <span className="crc">{crc(r.totales.total * e.tipoCambio)} · rango referencial {usd(r.totales.rango.min)} – {usd(r.totales.rango.max)}{r.pendientes.length ? ' + pendientes' : ''}</span>
        <div className="kpis resumen">
          <div><span>Sobre el valor de tu mercancía</span><b>{r.totales.mercancia ? `+${((adicional / r.totales.mercancia) * 100).toFixed(1)} %` : '—'}{r.estado === 'incompleta' ? ' + pend.' : ''}</b></div>
          <div><span>Costo por unidad {r.estado === 'incompleta' ? '(parcial)' : ''}</span><b>{unidades ? usd(r.totales.total / unidades) : '—'}</b></div>
          <div><span>Tiempo estimado</span><b>{r.tiempo.dias} días</b></div>
        </div>
        <div className="a-quien">
          <b>¿A quién le pagas?</b>
          <ul>
            <li><span>Tu proveedor <small>valor de la mercancía</small></span><b>{usd(d.mercancia)}</b></li>
            <li className="landex"><span>LANDEX <small>honorarios, coordinación y servicios que coordinamos</small></span><b>{usd(d.honorariosLandex + d.serviciosLandex)}{d.honorariosPendiente || d.lineas.some((l) => l.proveedor === 'landex' && l.pendiente) ? ' + pend.' : ''}</b></li>
            <li><span>El Estado <small>impuestos de importación</small></span><b>{impPend ? (d.impuestos ? `${usd(d.impuestos)} + pend.` : 'Pendiente') : usd(d.impuestos)}</b></li>
            <li><span>Puerto y almacén fiscal <small>gastos de terceros en destino</small></span><b>{usd(d.gastosTerceros)}</b></li>
            {d.serviciosCliente > 0 && <li><span>Tus propios proveedores <small>servicios que ya contrataste</small></span><b>{usd(d.serviciosCliente)}</b></li>}
          </ul>
          <small>Solo la fila de LANDEX la factura LANDEX. La mercancía, los impuestos y los gastos de puerto no son ingresos de LANDEX.</small>
        </div>
        <details className="mas-indicadores">
          <summary>Más indicadores</summary>
          <div className="kpis">
            <div><span>Desembolso {r.estado === "incompleta" ? "parcial" : "estimado"}</span><b>{usd(r.totales.desembolso)}</b></div>
            <div><span>IVA recuperable*</span><b>{usd(r.totales.ivaRecuperable)}</b></div>
            <div><span>Costo sin IVA recuperable</span><b>{usd(r.totales.totalSinIVA)}</b></div>
            <div><span>Logística y otros gastos</span><b>{usd(otrosServicios)}</b></div>
          </div>
        </details>
      </div>

      {!formal && <Confiabilidad c={confiabilidad(e, productos, r)} />}
      {alcance}

      {r.pendientes.length > 0 && (
        <div className="pendientes">
          <b>Pendiente de confirmar (no está sumado al total):</b>
          <ul>{r.pendientes.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
      )}
      {r.carga.alertas.length > 0 && <ul className="avisos">{r.carga.alertas.map((a) => <li key={a}>{a}</li>)}</ul>}

      <h3>Distribución del costo</h3>
      <div className="barra">
        {segmentos.filter((s) => s.v > 0).map((s) => <div key={s.k} style={{ flexGrow: s.v, background: COLORES[s.k] }} title={`${s.nombre}: ${usd(s.v)}`} />)}
      </div>
      <div className="leyenda">
        {segmentos.filter((s) => s.v > 0).map((s) => <span key={s.k}><i style={{ background: COLORES[s.k] }} />{s.nombre} {((s.v / r.totales.total) * 100).toFixed(1)}%</span>)}
      </div>

      <h3>Carga y modalidades</h3>
      <p className="nota">Comparación con tarifas de referencia, sin ajustes particulares de proveedores. Los subtotales incompletos no permiten identificar la opción más barata.</p>
      <p className="nota">
        {r.carga.volumenM3.toFixed(2)} m³ · {r.carga.pesoKg.toLocaleString('es-CR')} kg · {r.carga.bultos} bultos
        {r.carga.contenedores ? ` · ${r.carga.contenedores} unidad(es) · ocupación ${Math.round((r.carga.ocupacionVolumen ?? 0) * 100)}% del volumen y ${Math.round((r.carga.ocupacionPeso ?? 0) * 100)}% del peso` : ''}
        {e.modo === 'AEREO' ? ` · peso cobrable ${Math.round(r.carga.pesoCobrableAereo)} kg` : ''}
      </p>
      <div className="scroll">
        <table className="tabla comp">
          <thead><tr><th>Modalidad</th><th>Unidades</th><th className="num">Logística</th><th className="num">Total</th><th className="num">Días</th><th></th></tr></thead>
          <tbody>
            {comp.map((m) => (
              <tr key={m.modo} className={m.modo === e.modo ? 'actual' : ''}>
                <td>{MODOS[m.modo]}{recomendada?.modo === m.modo && <span className="sello validada">Menor costo de referencia</span>}</td>
                <td>{m.contenedores || '—'}</td>
                <td className="num">{m.fletePendiente ? 'Pendiente' : usd(m.logistica)}</td>
                <td className="num">{m.fletePendiente ? 'Pendiente' : m.incompleta ? `${usd(m.total)} + pendientes` : usd(m.total)}</td>
                <td className="num">{m.dias}</td>
                <td>{!m.compatible ? <span className="sello no">No compatible</span> : m.modo === e.modo ? <span className="nota">Actual</span> : <button type="button" className="link" onClick={() => onModo(m.modo)}>Usar</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {ofertas}

      <h3>Desglose por etapa</h3>
      <p className="nota">Toca una etapa para ver cada concepto. <span className="sello-est confirmado">Confirmado</span> = tarifa real del proveedor · <span className="sello-est estimado">Estimado</span> = valor de referencia · <span className="sello-est pendiente">Pendiente</span> = aún sin monto, no se suma al total.</p>
      <div className="etapas">
        {([1, 2, 3, 4, 5, 6, 7] as Etapa[]).map((et) => {
          const conceptos = r.conceptos.filter((k) => k.etapa === et)
          const total = r.porEtapa[et].total + (et === 5 ? r.totales.impuestos : 0)
          return (
            <div key={et} className="etapa">
              <button type="button" className="etapa-cab" onClick={() => setAbierta(abierta === et ? null : et)} aria-expanded={abierta === et}>
                <span className="num-etapa">{et}</span>
                <span className="nombre">{ETAPAS[et]}</span>
                {r.porEtapa[et].pendientes > 0 && <span className="sello pend">{r.porEtapa[et].pendientes} pendiente(s)</span>}
                <span className="monto">{usd(total)}</span>
              </button>
              {abierta === et && (
                <div className="etapa-cuerpo">
                  {et === 5 && (
                    <table className="tabla mini">
                      <tbody>
                        {r.productos.map((p) => (
                          <tr key={p.id}>
                            <td>Impuestos {p.sku} <Termino id="dai" /> <small>Valor aduanero {usd(p.valorAduanero)} · DAI {p.impuestos.tasaDAIAplicada == null ? 'pendiente' : `${(p.impuestos.tasaDAIAplicada * 100).toFixed(1)}%`}{p.impuestos.ahorroTLC ? ` · ahorro potencial TLC ${usd(p.impuestos.ahorroTLC)}` : ''}</small></td>
                            <td className="num">{p.impuestos.pendientes.length ? <span className="sello pend">Pendiente: {p.impuestos.pendientes.join(', ')}</span> : usd(p.impuestosTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {conceptos.map((k) => {
                    const aj = e.ajustes?.[k.id]
                    return (
                      <div key={k.id} className={`concepto est-${k.estado}`}>
                        <div className="c-nombre">{k.nombre}{(k.estado === 'confirmado' || k.estado === 'estimado' || k.estado === 'pendiente') && <span className={`sello-est ${k.estado}`}>{k.estado === 'confirmado' ? 'Confirmado' : k.estado === 'estimado' ? 'Estimado' : 'Pendiente'}</span>}{k.nota && <small>{k.nota}</small>}</div>
                        <select value={k.estado} onChange={(ev) => onAjuste(k.id, { ...aj, estado: ev.target.value as EstadoConcepto, monto: ev.target.value === 'confirmado' || ev.target.value === 'estimado' ? (k.monto ?? 0) : aj?.monto })}>
                          {(Object.keys(ESTADOS) as EstadoConcepto[]).map((s) => <option key={s} value={s}>{ESTADOS[s]}</option>)}
                        </select>
                        {(k.estado === 'estimado' || k.estado === 'confirmado') ? (
                          <input type="number" min={0} step="0.01" className="c-monto" value={k.monto ?? 0}
                            onChange={(ev) => onAjuste(k.id, { ...aj, estado: 'confirmado', monto: Number(ev.target.value) })} aria-label={`Monto de ${k.nombre}`} />
                        ) : <span className="c-monto texto">{k.estado === 'pendiente' ? 'Pendiente' : '—'}</span>}
                        <select className="c-base" value={k.base} onChange={(ev) => onAjuste(k.id, { ...aj, base: ev.target.value as Base })} title="Cómo se reparte entre productos">
                          {(Object.keys(BASES) as Base[]).map((b) => <option key={b} value={b}>{BASES[b]}</option>)}
                        </select>
                        {k.base === 'directo' && (
                          <select className="c-base" value={k.productoDirecto ?? ''} onChange={(ev) => onAjuste(k.id, { ...aj, base: 'directo', productoDirecto: ev.target.value })}>
                            <option value="">Productos con permiso</option>
                            {productos.map((p) => <option key={p.id} value={p.id}>{p.sku}</option>)}
                          </select>
                        )}
                        {aj && <button type="button" className="link" onClick={() => onAjuste(k.id, null)}>Restablecer</button>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <p className="nota">Tarifas: {VIGENCIA_TARIFAS.fuente}, actualizadas al {VIGENCIA_TARIFAS.actualizado}. *El IVA de importación es crédito fiscal si tu empresa está inscrita en IVA.</p>

      <h3>Landed Cost por producto <Termino id="landed" /></h3>
      <div className="scroll">
        <table className="tabla sku">
          <thead><tr><th>SKU</th><th>Producto</th><th className="num">Cant.</th><th className="num">Precio unit.</th><th className="num">Logística asignada</th><th className="num">Impuestos</th><th className="num">Landed unit.</th><th className="num">Landed total</th></tr></thead>
          <tbody>
            {r.productos.map((p) => (
              <tr key={p.id}>
                <td>{p.sku}</td><td>{p.nombre}</td><td className="num">{p.cantidad.toLocaleString('es-CR')}</td>
                <td className="num">{usd(p.valorMercancia / p.cantidad)}</td><td className="num">{usd(p.logistica)}</td>
                <td className="num">{p.impuestos.pendientes.length ? <span className="sello pend">Pendiente</span> : usd(p.impuestosTotal)}</td>
                <td className="num"><b>{usd(p.landedUnitario)}</b><small>{usd(p.landedUnitarioSinIVA)} sin IVA</small></td>
                <td className="num">{usd(p.landedTotal)}</td>
              </tr>
            ))}
            <tr className="suma"><td colSpan={2}>Total</td><td className="num">{unidades.toLocaleString('es-CR')}</td><td className="num">{usd(r.totales.mercancia)}</td><td className="num">{usd(r.totales.logistica)}</td><td className="num">{impPend && !r.totales.impuestos ? 'Pendiente' : usd(r.totales.impuestos)}</td><td></td><td className="num">{usd(r.totales.total)}</td></tr>
          </tbody>
        </table>
      </div>

      <h3>De la bodega del proveedor a la tuya</h3>
      <ol className="linea-tiempo">
        {r.tiempo.etapas.map((t) => (
          <li key={t.nombre} className={t.paralelo ? 'paralelo' : ''}>
            <span className="dia">Día {t.inicio}</span>
            <span className="nombre">{t.nombre}</span>
            <span className="dur">{t.dias} {t.dias === 1 ? 'día' : 'días'}</span>
          </li>
        ))}
        <li className="fin"><span className="dia">Día {r.tiempo.dias}</span><span className="nombre">Mercancía descargada en tu bodega</span></li>
      </ol>

      {r.supuestos.length > 0 && (
        <details className="notas"><summary>Supuestos de esta cotización</summary><ul>{r.supuestos.map((s) => <li key={s}>{s}</li>)}</ul></details>
      )}

      <div className="acciones">
        <button type="button" className="btn" onClick={() => descargar(`landed-cost-${new Date().toISOString().slice(0, 10)}.csv`, exportarSKU(r))}>Exportar por SKU (Excel/CSV)</button>
      </div>

      {expediente}

      <Solicitud entrada={e} r={r} productos={productos} />
    </section>
  )
}
