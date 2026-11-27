import { formatoRegional } from '../lib/idioma'
import { tr } from '../lib/idioma'
import { useEffect, useRef, useState } from 'react'
import { documentosRequeridos, ESTADOS_DOC, RESPONSABLES, type EstadoDoc, type Responsable } from '../lib/expediente'
import type { Embarque, Producto } from '../lib/landed'
import {
  eliminarDocumento, enlaceDocumento, esStaff, listarDocumentos, revisarDocumento, subirDocumento, TIPOS_ARCHIVO,
  type DocNube, type EstadoArchivo, type Usuario,
} from '../lib/nube'

interface Props {
  e: Embarque
  productos: Producto[]
  estados: Record<string, EstadoDoc>
  agencia: boolean
  onEstado: (id: string, s: EstadoDoc) => void
  /** Cotización en la nube: habilita la carga de archivos. */
  cotId?: string
  usuario: Usuario | null
  onGuardarPrimero: () => void
  onIniciarSesion: () => void
}

const ORDEN: Responsable[] = ['proveedor', 'cliente', 'landex']
const TITULOS: Record<Responsable, string> = { proveedor: 'Documentos del proveedor', cliente: 'Documentos del importador', landex: 'Gestionados por LANDEX' }
function IconoDoc({ listo = false }: { listo?: boolean }) {
  return <svg className="dc-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 3h8l4 4v14H6z M14 3v5h4"/>{listo ? <path d="m9 14 2 2 4-4"/> : <path d="M9 12h6 M9 16h6"/>}</svg>
}
const ESTADOS_ARCHIVO: Record<EstadoArchivo, string> = { recibido: 'Recibido', revisado: 'Revisado por el agente', observado: 'Con observaciones' }

export function Expediente({ e, productos, estados, agencia, onEstado, cotId, usuario, onGuardarPrimero, onIniciarSesion }: Props) {
  const docs = documentosRequeridos(e, productos)
  const [archivos, setArchivos] = useState<DocNube[]>([])
  const [subiendo, setSubiendo] = useState<string | null>(null)
  const [error, setError] = useState('')
  const staff = esStaff(usuario)
  const enNube = !!(usuario && cotId)

  const cargar = async () => { if (cotId) setArchivos(await listarDocumentos(cotId)) }
  useEffect(() => { setArchivos([]); cargar() }, [cotId]) // eslint-disable-line

  const deTipo = (tipo: string) => archivos.filter((a) => a.tipo === tipo)
  const estadoDe = (id: string): EstadoDoc => {
    if (!enNube) return estados[id] ?? 'pendiente'
    const fs = deTipo(id)
    if (!fs.length) return 'pendiente'
    if (fs.some((f) => f.estado === 'observado')) return 'observado'
    if (fs.every((f) => f.estado === 'revisado')) return 'revisado'
    return 'recibido'
  }
  const tuyos = docs.filter((d) => d.responsable !== 'landex' && d.obligatorio)
  const listos = tuyos.filter((d) => estadoDe(d.id) !== 'pendiente').length
  const revisados = tuyos.filter(d => estadoDe(d.id) === 'revisado').length

  const subir = async (tipo: string, f: File) => {
    if (!cotId) return
    setSubiendo(tipo); setError('')
    const err = await subirDocumento(cotId, tipo, f)
    setSubiendo(null)
    if (err) setError(err)
    await cargar()
  }

  return (
    <div className="expediente document-center">
      <div className="dc-header">
        <span className="dc-kicker">{tr("LANDEX · DOCUMENT CENTER")}</span>
        <h3>{tr("Documentos de tu importación")}</h3>
        <div className="dc-progress-label"><span>{enNube ? tr("Documentos subidos") : tr("Documentos que ya tienes")}</span><strong>{listos}{tr(" de ")}{tuyos.length}</strong></div>
        <progress className="dc-progress" value={listos} max={tuyos.length || 1} aria-label={tr("Documentos obligatorios subidos")} />
        {enNube && <>
          <div className="dc-progress-label"><span>{tr("Revisados por el agente aduanero")}</span><strong>{revisados}{tr(" de ")}{tuyos.length}</strong></div>
          <progress className="dc-progress revisados" value={revisados} max={tuyos.length || 1} aria-label={tr("Documentos revisados por el agente")} />
        </>}
        <small>{enNube ? tr("Subido no significa aprobado: el agente revisa cada documento antes de nacionalizar.") : tr("Marca los que ya tienes; podrás subirlos cuando guardes la cotización en tu cuenta.")}</small>
      </div>
      <p className="nota">{tr("Sin factura, lista de empaque y documento de transporte no se puede nacionalizar.")}{' '}
        {!usuario && <>{tr("Para subirlos, ")}<button type="button" className="link" onClick={onIniciarSesion}>{tr("inicia sesión")}</button>.</>}
        {usuario && !cotId && <>{tr("Para subirlos, ")}<button type="button" className="link" onClick={onGuardarPrimero}>{tr("guarda la cotización")}</button>{tr(" en tu cuenta.")}</>}
        {enNube && tr("Formatos: PDF, imagen, Excel o Word, hasta 10 MB.")}
      </p>
      {error && <p className="nota error" role="alert">{tr(error)}</p>}
      {ORDEN.map((resp) => {
        const grupo = docs.filter((d) => d.responsable === resp)
        if (!grupo.length) return null
        return (
          <div key={resp} className="exp-grupo">
            <div className="dc-group-heading"><span className="dc-group-icon"><IconoDoc /></span><div><b>{tr(TITULOS[resp])}</b><small>{tr(RESPONSABLES[resp])}{resp !== 'landex' ? tr(" · {0}/{1} obligatorios", grupo.filter(d => d.obligatorio && estadoDe(d.id) !== 'pendiente').length, grupo.filter(d => d.obligatorio).length) : ''}</small></div></div>
            <ul>
              {grupo.map((d) => {
                const s = estadoDe(d.id)
                return (
                  <li key={d.id} className={`doc ${s}`}>
                    <div className="doc-fila">
                      <IconoDoc listo={s === 'recibido' || s === 'revisado'} />
                      <div className="dc-copy">
                        <span><b>{d.nombre}</b>{!d.obligatorio && <small className="opc">{tr(" · recomendado")}</small>}</span>
                        <small>{d.detalle}</small>
                        {enNube && <small className={`dc-status ${s}`}>{tr(ESTADOS_DOC[s])}</small>}
                      </div>
                      <div className="dc-action">{enNube ? (
                        resp === 'landex' && !staff ? <span className="sello">{tr("LANDEX")}</span> : (
                          <Subir tipo={d.id} ocupado={subiendo === d.id} onArchivo={(f) => subir(d.id, f)} />
                        )
                      ) : resp === 'landex' ? (
                        <span className="sello">{agencia ? tr(ESTADOS_DOC[s]) : tr("LANDEX")}</span>
                      ) : agencia ? (
                        <select value={s} onChange={(ev) => onEstado(d.id, ev.target.value as EstadoDoc)} aria-label={tr("Estado de {0}", d.nombre)}>
                          {Object.entries(ESTADOS_DOC).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      ) : (
                        <label className="check"><input type="checkbox" aria-label={tr("Ya tengo {0}", d.nombre)} checked={s !== 'pendiente'} onChange={(ev) => onEstado(d.id, ev.target.checked ? 'recibido' : 'pendiente')} />{tr("Ya lo tengo")}</label>
                      )}</div>
                    </div>
                    {enNube && deTipo(d.id).length > 0 && (
                      <ul className="archivos">
                        {deTipo(d.id).map((a) => <Archivo key={a.id} a={a} staff={staff} onCambio={cargar} onError={setError} />)}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
      {enNube && (
        <div className="exp-grupo">
          <span className="tipo">{tr("Otros documentos")}</span>
          <ul>
            <li className="doc">
              <div className="doc-fila">
                <IconoDoc /><div className="dc-copy"><b>{tr("Otro documento")}</b><small>{tr("Cualquier otro archivo que el agente aduanero te pida.")}</small></div>
                <div className="dc-action"><Subir tipo="otro" ocupado={subiendo === 'otro'} onArchivo={(f) => subir('otro', f)} /></div>
              </div>
              {deTipo('otro').length > 0 && (
                <ul className="archivos">{deTipo('otro').map((a) => <Archivo key={a.id} a={a} staff={staff} onCambio={cargar} onError={setError} />)}</ul>
              )}
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}

function Subir({ tipo, ocupado, onArchivo }: { tipo: string; ocupado: boolean; onArchivo: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <>
      <button type="button" className="btn" disabled={ocupado} onClick={() => ref.current?.click()}>{ocupado ? tr("Subiendo…") : tr("Subir archivo")}</button>
      <input ref={ref} type="file" hidden accept={TIPOS_ARCHIVO} aria-label={tr("Subir {0}", tipo)}
        onChange={(ev) => { const f = ev.target.files?.[0]; if (f) onArchivo(f); ev.target.value = '' }} />
    </>
  )
}

function Archivo({ a, staff, onCambio, onError }: { a: DocNube; staff: boolean; onCambio: () => void; onError: (e: string) => void }) {
  const [obs, setObs] = useState(a.observacion)
  const ver = async () => {
    const url = await enlaceDocumento(a.archivo)
    if (url) window.open(url, '_blank', 'noopener')
    else onError('No se pudo abrir el archivo.')
  }
  const revisar = async (estado: EstadoArchivo) => {
    const err = await revisarDocumento(a.id, estado, obs)
    if (err) onError(err); else onCambio()
  }
  return (
    <li className={`archivo ${a.estado}`}>
      <button type="button" className="link" onClick={ver}>{a.nombre_archivo || tr("archivo")}</button>
      <small>{new Date(a.subido).toLocaleDateString(formatoRegional())}</small>
      {staff ? (
        <span className="revision">
          <input value={obs} placeholder={tr("Observación para el cliente")} onChange={(ev) => setObs(ev.target.value)} />
          <button type="button" className="link" onClick={() => revisar('revisado')}>{tr("Revisado")}</button>
          <button type="button" className="link peligro" onClick={() => revisar('observado')}>{tr("Observar")}</button>
        </span>
      ) : (
        <>
          <span className={`sello ${a.estado === 'revisado' ? 'validada' : a.estado === 'observado' ? 'pend' : ''}`}>{tr(ESTADOS_ARCHIVO[a.estado])}</span>
          {a.observacion && <small className="obs">{tr("Observación: ")}{a.observacion}</small>}
          {a.estado === 'recibido' && (
            <button type="button" className="link peligro" onClick={async () => { const err = await eliminarDocumento(a); if (err) onError(err); else onCambio() }}>{tr("Quitar")}</button>
          )}
        </>
      )}
    </li>
  )
}
