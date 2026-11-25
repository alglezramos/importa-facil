import { documentosRequeridos, ESTADOS_DOC, RESPONSABLES, type EstadoDoc, type Responsable } from '../lib/expediente'
import type { Embarque, Producto } from '../lib/landed'

interface Props {
  e: Embarque
  productos: Producto[]
  estados: Record<string, EstadoDoc>
  agencia: boolean
  onEstado: (id: string, s: EstadoDoc) => void
}

const ORDEN: Responsable[] = ['proveedor', 'cliente', 'landex']

export function Expediente({ e, productos, estados, agencia, onEstado }: Props) {
  const docs = documentosRequeridos(e, productos)
  const tuyos = docs.filter((d) => d.responsable !== 'landex' && d.obligatorio)
  const listos = tuyos.filter((d) => (estados[d.id] ?? 'pendiente') !== 'pendiente').length

  return (
    <div className="expediente">
      <h3>Documentos de tu importación</h3>
      <p className="nota">
        Llevas {listos} de {tuyos.length} documentos obligatorios. Pídele los de tu proveedor desde ahora: sin factura, lista de empaque y
        documento de transporte no se puede nacionalizar. Muy pronto podrás subirlos aquí con tu cuenta LANDEX.
      </p>
      {ORDEN.map((resp) => {
        const grupo = docs.filter((d) => d.responsable === resp)
        if (!grupo.length) return null
        return (
          <div key={resp} className="exp-grupo">
            <span className="tipo">{RESPONSABLES[resp]}</span>
            <ul>
              {grupo.map((d) => {
                const s = estados[d.id] ?? 'pendiente'
                return (
                  <li key={d.id} className={`doc ${s}`}>
                    <div>
                      <span><b>{d.nombre}</b>{!d.obligatorio && <small className="opc"> · recomendado</small>}</span>
                      <small>{d.detalle}</small>
                    </div>
                    {resp === 'landex' ? (
                      <span className="sello">{agencia ? ESTADOS_DOC[s] : 'LANDEX'}</span>
                    ) : agencia ? (
                      <select value={s} onChange={(ev) => onEstado(d.id, ev.target.value as EstadoDoc)} aria-label={`Estado de ${d.nombre}`}>
                        {Object.entries(ESTADOS_DOC).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    ) : s === 'revisado' || s === 'observado' ? (
                      <span className={`sello ${s === 'revisado' ? 'validada' : 'pend'}`}>{ESTADOS_DOC[s]}</span>
                    ) : (
                      <label className="check"><input type="checkbox" checked={s === 'recibido'} onChange={(ev) => onEstado(d.id, ev.target.checked ? 'recibido' : 'pendiente')} />Ya lo tengo</label>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
