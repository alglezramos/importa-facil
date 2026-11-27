import { tr as traducir } from '../lib/idioma'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MODOS, ORIGENES, ZONAS, type Modo, type Zona } from '../data/config'
import { descargar } from '../lib/csv'
import { usd } from '../lib/formato'
import { eliminarTarifaNube, guardarTarifaNube, listarTarifasNube } from '../lib/nube'
import {
  CATEGORIAS_PROVEEDOR, CONCEPTOS_TARIFA, cargarTarifasPublicadas, exportarTarifas, guardarTarifasLocales, leerTarifasLocales,
  TRAMOS, tramoTarifa, UNIDAD_CORTA, UNIDADES, validarTarifa, vigencia, VIGENCIAS, type Cargo, type CategoriaProveedor, type Tarifa, type Unidad,
} from '../lib/tarifas'

const hoy = () => new Date().toISOString().slice(0, 10)
const en = (d: number) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10) }

const nueva = (): Tarifa => ({
  id: `t-${Date.now()}`, proveedor: '', categoria: 'forwarder', origenId: '', modos: [], zona: '',
  cargos: [{ concepto: 'flete', monto: 0, unidad: 'contenedor' }], diasTransito: null,
  vigenteDesde: hoy(), vigenteHasta: en(30), incluye: [], excluye: [], condiciones: '', fuente: '',
})

const lineas = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean)

interface Props { onCambio?: () => void }

export function Tarifas({ onCambio }: Props) {
  const [publicadas, setPublicadas] = useState<Tarifa[]>([])
  const [nubeTs, setNubeTs] = useState<Tarifa[]>([])
  const [locales, setLocales] = useState<Tarifa[]>(leerTarifasLocales)
  const [editando, setEditando] = useState<Tarifa | null>(null)
  const [errores, setErrores] = useState<string[]>([])
  const [filtro, setFiltro] = useState<string>('todas')
  const [verEjemplos, setVerEjemplos] = useState(true)
  const [msg, setMsg] = useState('')
  const archivo = useRef<HTMLInputElement>(null)

  const cargar = async () => { setNubeTs(await listarTarifasNube()); onCambio?.() }
  useEffect(() => { cargarTarifasPublicadas().then(setPublicadas); cargar() }, []) // eslint-disable-line
  const enNube = (t: Tarifa) => t.publicada !== undefined

  const subirVarias = async (ts: Tarifa[]) => {
    let ok = 0
    for (const t of ts) { const { local: _l, ...x } = t; if (!(await guardarTarifaNube({ ...x, publicada: false }))) ok++ }
    await cargar()
    return ok
  }
  const subirLocales = async () => {
    const ok = await subirVarias(locales)
    guardarTarifasLocales([]); setLocales([])
    setMsg(`${ok} tarifa(s) de este navegador subidas como internas. Márcalas como publicadas cuando quieras que las vean los clientes.`)
  }

  const todas = useMemo(() => [...nubeTs, ...publicadas.filter((p) => !nubeTs.some((l) => l.id === p.id))], [nubeTs, publicadas])
  const visibles = todas.filter((t) => (verEjemplos || !t.ejemplo) && (filtro === 'todas' || t.categoria === filtro || vigencia(t) === filtro))
  const porVencer = todas.filter((t) => !t.ejemplo && vigencia(t) === 'por_vencer').length
  const vencidas = todas.filter((t) => !t.ejemplo && vigencia(t) === 'vencida').length

  const guardar = async () => {
    if (!editando) return
    const e = validarTarifa(editando)
    setErrores(e)
    if (e.length) return
    const { local: _l, ...t } = editando
    const err = await guardarTarifaNube({ ...t, publicada: !!t.publicada })
    if (err) { setErrores([err]); return }
    setEditando(null)
    await cargar()
    setMsg(`Tarifa de ${t.proveedor} guardada${t.publicada ? ' y publicada para los clientes' : ' como interna (solo la agencia la ve)'}.`)
  }

  const importar = async (f: File) => {
    try {
      const x = JSON.parse(await f.text())
      const ts: Tarifa[] = Array.isArray(x) ? x : x.tarifas
      if (!Array.isArray(ts)) throw new Error('formato')
      const validas = ts.filter((t) => t?.id && Array.isArray(t.cargos))
      const ok = await subirVarias(validas)
      setMsg(`${ok} tarifa(s) importada(s) como internas.`)
    } catch { setMsg('El archivo no tiene el formato de tarifas de LANDEX.') }
  }

  const set = (c: Partial<Tarifa>) => setEditando((x) => (x ? { ...x, ...c } : x))
  const setCargo = (i: number, c: Partial<Cargo>) => editando && set({ cargos: editando.cargos.map((x, j) => (j === i ? { ...x, ...c } : x)) })

  return (
    <section className="panel tarifas">
      <h2>{traducir("Tarifas de proveedores")}</h2>
      <p className="intro">{traducir("Registra aquí las ofertas que recibes de forwarders, navieras, transportistas y demás proveedores. Las tarifas vigentes aparecen en el cotizador para comparar y aplicar; con todos los costos confirmados puedes emitir una")}<b>{traducir(" cotización formal")}</b>{traducir(". Registra el precio que le cobrarás al cliente.")}</p>
      <div className="aviso-agencia">
        <b>{traducir("Dónde se guardan:")}</b>{traducir(" en la base de datos de LANDEX. Solo el operador puede crearlas o cambiarlas. Las ")}<b>{traducir("internas")}</b>{traducir(" solo las ve la agencia; las ")}<b>{traducir("publicadas")}</b>{traducir(" (reales y vigentes) las ven tus clientes en el cotizador. Las del archivo ")}<code>{traducir("public/tarifas.json")}</code>{traducir(" son de ejemplo o de respaldo.")}{locales.length > 0 && <>{traducir(" Tienes ")}{locales.length}{traducir(" tarifa(s) guardada(s) solo en este navegador: ")}<button type="button" className="link" onClick={subirLocales}>{traducir("subirlas a la base de datos")}</button>.</>}
      </div>

      <div className="tarifas-barra">
        <div className="filtros">
          {[['todas', 'Todas'], ['vigente', 'Vigentes'], ['por_vencer', `Vencen pronto${porVencer ? ` (${porVencer})` : ''}`], ['vencida', `Vencidas${vencidas ? ` (${vencidas})` : ''}`]].map(([k, v]) => (
            <button key={k} type="button" className={filtro === k ? 'activa' : ''} onClick={() => setFiltro(k)}>{v}</button>
          ))}
          <select value={Object.keys(CATEGORIAS_PROVEEDOR).includes(filtro) ? filtro : ''} onChange={(e) => setFiltro(e.target.value || 'todas')}>
            <option value="">{traducir("Todas las categorías")}</option>
            {Object.entries(CATEGORIAS_PROVEEDOR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <label className="check"><input type="checkbox" checked={verEjemplos} onChange={(e) => setVerEjemplos(e.target.checked)} />{traducir("Mostrar ejemplos")}</label>
        </div>
        <div className="acciones">
          <button type="button" className="btn primario" onClick={() => { setEditando(nueva()); setErrores([]) }}>{traducir("Registrar tarifa")}</button>
          <button type="button" className="btn" onClick={() => descargar('tarifas.json', exportarTarifas(nubeTs))}>{traducir("Descargar respaldo")}</button>
          <button type="button" className="btn" onClick={() => archivo.current?.click()}>{traducir("Importar")}</button>
          <input ref={archivo} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importar(f); e.target.value = '' }} />
        </div>
      </div>
      {msg && <p className="nota" role="status">{traducir(msg)}</p>}

      {editando && (
        <form className="tarifa-form" onSubmit={(e) => { e.preventDefault(); guardar() }}>
          <h3>{nubeTs.some((x) => x.id === editando.id) ? traducir("Editar tarifa") : traducir("Nueva tarifa")}</h3>
          <label className="check"><input type="checkbox" checked={!!editando.publicada} disabled={!!editando.ejemplo} onChange={(e) => set({ publicada: e.target.checked })} />{traducir("Publicada: la ven los clientes (si es real y está vigente)")}</label>
          <div className="fila3">
            <label>{traducir("Proveedor *")}<input value={editando.proveedor} onChange={(e) => set({ proveedor: e.target.value })} /></label>
            <label>{traducir("Categoría")}<select value={editando.categoria} onChange={(e) => set({ categoria: e.target.value as CategoriaProveedor })}>
                {Object.entries(CATEGORIAS_PROVEEDOR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label>{traducir("Fuente de la oferta *")}<input value={editando.fuente} placeholder={traducir("N.º de cotización, correo y fecha")} onChange={(e) => set({ fuente: e.target.value })} /></label>
            <label>{traducir("Origen")}<select value={editando.origenId} onChange={(e) => set({ origenId: e.target.value })}>
                <option value="">{traducir("Cualquier origen")}</option>
                {ORIGENES.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
              </select>
            </label>
            <label>{traducir("Zona de entrega")}<select value={editando.zona ?? ''} onChange={(e) => set({ zona: e.target.value as Zona | '' })}>
                <option value="">{traducir("Todas")}</option>
                {Object.entries(ZONAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label>{traducir("Días de tránsito")}<input type="number" min={0} value={editando.diasTransito ?? ''} onChange={(e) => set({ diasTransito: e.target.value === '' ? null : Number(e.target.value) })} /></label>
            <label>{traducir("Vigente desde")}<input type="date" value={editando.vigenteDesde} onChange={(e) => set({ vigenteDesde: e.target.value })} /></label>
            <label>{traducir("Vigente hasta *")}<input type="date" value={editando.vigenteHasta} onChange={(e) => set({ vigenteHasta: e.target.value })} /></label>
          </div>
          <span className="sub">{traducir("Modalidades ")}<small>{traducir("(ninguna marcada = todas)")}</small></span>
          <div className="chips">
            {(Object.keys(MODOS) as Modo[]).map((m) => (
              <label key={m} className={`chip ${editando.modos.includes(m) ? 'on' : ''}`}>
                <input type="checkbox" checked={editando.modos.includes(m)} onChange={(e) => set({ modos: e.target.checked ? [...editando.modos, m] : editando.modos.filter((x) => x !== m) })} />{traducir(MODOS[m])}
              </label>
            ))}
          </div>

          <span className="sub">{traducir("Cargos")}</span>
          <table className="tabla cargos">
            <thead><tr><th>{traducir("Concepto")}</th><th>{traducir("Cómo se cobra")}</th><th className="num">{traducir("Monto (USD)")}</th><th className="num">{traducir("Mínimo")}</th><th></th></tr></thead>
            <tbody>
              {editando.cargos.map((c, i) => (
                <tr key={i}>
                  <td><select value={c.concepto} onChange={(e) => setCargo(i, { concepto: e.target.value })}>
                    {(Object.keys(TRAMOS) as (keyof typeof TRAMOS)[]).map((tr) => (
                      <optgroup key={tr} label={TRAMOS[tr]}>
                        {CONCEPTOS_TARIFA.filter((k) => k.tramo === tr).map((k) => <option key={k.id} value={k.id}>{traducir(k.nombre)}</option>)}
                      </optgroup>
                    ))}
                  </select></td>
                  <td><select value={c.unidad} onChange={(e) => setCargo(i, { unidad: e.target.value as Unidad })}>
                    {Object.entries(UNIDADES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select></td>
                  <td><input type="number" min={0} step="0.01" disabled={c.unidad === 'incluido'} value={c.unidad === 'incluido' ? '' : c.monto || ''} onChange={(e) => setCargo(i, { monto: Number(e.target.value) })} /></td>
                  <td><input type="number" min={0} step="0.01" disabled={c.unidad === 'incluido'} value={c.minimo ?? ''} onChange={(e) => setCargo(i, { minimo: e.target.value === '' ? undefined : Number(e.target.value) })} /></td>
                  <td><button type="button" className="link peligro" onClick={() => set({ cargos: editando.cargos.filter((_, j) => j !== i) })}>{traducir("Quitar")}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="link" onClick={() => set({ cargos: [...editando.cargos, { concepto: 'recargos', monto: 0, unidad: 'fijo' }] })}>{traducir("+ Agregar cargo")}</button>

          <div className="fila2">
            <label>{traducir("Servicios incluidos ")}<small>{traducir("(uno por línea)")}</small><textarea rows={3} value={editando.incluye.join('\n')} onChange={(e) => set({ incluye: lineas(e.target.value) })} /></label>
            <label>{traducir("Servicios excluidos ")}<small>{traducir("(uno por línea)")}</small><textarea rows={3} value={editando.excluye.join('\n')} onChange={(e) => set({ excluye: lineas(e.target.value) })} /></label>
          </div>
          <label>{traducir("Condiciones del servicio")}<textarea rows={2} value={editando.condiciones} placeholder={traducir("Días libres, forma de pago, sujeto a espacio, etc.")} onChange={(e) => set({ condiciones: e.target.value })} /></label>
          {errores.length > 0 && <ul className="errores">{errores.map((x) => <li key={x}>{x}</li>)}</ul>}
          <div className="acciones">
            <button type="submit" className="btn primario">{traducir("Guardar tarifa")}</button>
            <button type="button" className="btn" onClick={() => setEditando(null)}>{traducir("Cancelar")}</button>
          </div>
        </form>
      )}

      {visibles.length === 0 ? (
        <p className="vacio">{traducir("Todavía no hay tarifas")}{filtro !== 'todas' ? traducir(" con este filtro") : ''}{traducir(". Registra la primera oferta que recibas de un proveedor.")}</p>
      ) : (
        <div className="tabla-scroll">
          <table className="tabla">
            <thead><tr><th>{traducir("Proveedor")}</th><th>{traducir("Ruta")}</th><th>{traducir("Tramo")}</th><th>{traducir("Cargos")}</th><th>{traducir("Tránsito")}</th><th>{traducir("Vigencia")}</th><th></th></tr></thead>
            <tbody>
              {visibles.map((t) => {
                const v = vigencia(t)
                return (
                  <tr key={t.id}>
                    <td><b>{t.proveedor}</b><small>{traducir(CATEGORIAS_PROVEEDOR[t.categoria])}</small>
                      {t.ejemplo && <span className="sello pend">{traducir("Ejemplo")}</span>}{enNube(t) ? (t.publicada ? <span className="sello validada">{traducir("Publicada")}</span> : <span className="sello">{traducir("Interna")}</span>) : <span className="sello">{traducir("Archivo")}</span>}</td>
                    <td>{t.origenId ? ORIGENES.find((o) => o.id === t.origenId)?.nombre : traducir("Cualquier origen")}<small>{t.modos.length ? t.modos.map((m) => MODOS[m]).join(', ') : traducir("Todas las modalidades")}{t.zona ? ` · ${ZONAS[t.zona]}` : ''}</small></td>
                    <td>{traducir(TRAMOS[tramoTarifa(t)])}</td>
                    <td>{t.cargos.map((c, i) => <small key={i}>{CONCEPTOS_TARIFA.find((k) => k.id === c.concepto)?.nombre}: {c.unidad === 'incluido' ? traducir("incluido") : c.unidad === 'pct_valor' ? traducir("{0}% del valor", c.monto) : `${usd(c.monto)} ${UNIDAD_CORTA[c.unidad]}`}{c.minimo ? traducir(" (mín. {0})", usd(c.minimo)) : ''}</small>)}</td>
                    <td>{t.diasTransito != null ? traducir("{0} d", t.diasTransito) : '—'}</td>
                    <td><span className={`sello ${v === 'vencida' ? 'no' : v === 'por_vencer' ? 'pend' : 'validada'}`}>{traducir(VIGENCIAS[v])}</span><small>{t.vigenteDesde} → {t.vigenteHasta}</small></td>
                    <td className="acciones-fila">
                      <button type="button" className="link" onClick={() => { setEditando({ ...t }); setErrores([]) }}>{enNube(t) ? traducir("Editar") : traducir("Copiar a la base de datos")}</button>
                      <button type="button" className="link" onClick={() => { setEditando({ ...t, id: `t-${Date.now()}`, vigenteDesde: hoy(), vigenteHasta: en(30), fuente: '', ejemplo: false, publicada: false }); setErrores([]) }}>{traducir("Renovar")}</button>
                      {enNube(t) && <button type="button" className="link peligro" onClick={async () => { if (!window.confirm(`¿Eliminar la tarifa de ${t.proveedor}?`)) return; const err = await eliminarTarifaNube(t.id); if (err) setMsg(err); else cargar() }}>{traducir("Eliminar")}</button>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
