import { useState } from 'react'
import { puedeEmitir, type Emision, type Requisito } from '../lib/formal'
import type { Producto } from '../lib/landed'

interface Props {
  productos: Producto[]
  requisitos: Requisito[]
  emision?: Emision
  vigente: boolean
  onValidar: (ids: string[], agente: string) => void
  onEmitir: (agente: string) => void
  onAnular: () => void
}

const CLAVE = 'landex:agente'
const leerAgente = () => { try { return localStorage.getItem(CLAVE) ?? '' } catch { return '' } }

export function PanelAgencia({ productos, requisitos, emision, vigente, onValidar, onEmitir, onAnular }: Props) {
  const [agente, setAgente] = useState(leerAgente)
  const guardarAgente = (v: string) => { setAgente(v); try { localStorage.setItem(CLAVE, v) } catch { /* sin almacenamiento */ } }
  const sinValidar = productos.filter((p) => p.clasificacion && p.clasificacion.estado !== 'validada')
  const ok = puedeEmitir(requisitos)

  return (
    <div className="panel-agencia">
      <div className="pa-cab"><b>Panel de la agencia</b><small>Solo visible en modo agencia</small></div>

      <label>Agente aduanero que valida<input value={agente} placeholder="Nombre y código del agente" onChange={(e) => guardarAgente(e.target.value)} /></label>

      {sinValidar.length > 0 && (
        <div className="pa-bloque">
          <span>Clasificaciones por validar</span>
          <ul>{sinValidar.map((p) => <li key={p.id}>{p.sku || p.nombre}: <span className="codigo">{p.clasificacion!.codigo}</span> {p.clasificacion!.dai == null ? '· sin tasa DAI cargada' : ''}</li>)}</ul>
          <small>Antes de validar, revisa la ficha técnica y confirma en TICA el DAI, el Selectivo y el IVA de cada inciso (en el editor del producto).</small>
          <button type="button" className="btn" disabled={!agente.trim()} onClick={() => onValidar(sinValidar.map((p) => p.id), agente.trim())}>Marcar como validadas</button>
        </div>
      )}

      <div className="pa-bloque">
        <span>Requisitos de la cotización formal</span>
        <ul className="requisitos">
          {requisitos.map((q) => (
            <li key={q.texto} className={q.ok ? 'ok' : 'falta'}>
              {q.ok ? '✓' : '✗'} {q.texto}
              {!q.ok && q.detalle && q.detalle.length > 0 && <ul>{q.detalle.slice(0, 6).map((d) => <li key={d}>{d}</li>)}{q.detalle.length > 6 && <li>y {q.detalle.length - 6} más</li>}</ul>}
            </li>
          ))}
        </ul>
      </div>

      {emision && vigente ? (
        <div className="pa-bloque emitida">
          <span>Cotización formal emitida el {emision.emitida.slice(0, 10)} por {emision.por}. Vence el {emision.vence}.</span>
          <button type="button" className="link peligro" onClick={onAnular}>Anular emisión</button>
        </div>
      ) : (
        <>
          {emision && !vigente && <p className="nota">Los datos cambiaron después de emitir la cotización formal, así que volvió a ser estimada.</p>}
          <button type="button" className="btn primario" disabled={!ok || !agente.trim()} onClick={() => onEmitir(agente.trim())}>Emitir cotización formal</button>
          {!ok && <small className="nota">Cumple todos los requisitos para emitirla.</small>}
        </>
      )}
    </div>
  )
}
