import { tr } from '../lib/idioma'
import { useEffect, useState } from 'react'
import { nube, esStaff, type CotNube, type Solicitud, type Usuario } from '../lib/nube'
import { documentosRequeridos } from '../lib/expediente'
import { usd } from '../lib/formato'
import type { Tarifa } from '../lib/tarifas'

type Alerta = { id:string; grupo:string; texto:string; urgente:boolean; accion:()=>void }
type Hito = { cotizacion_id:string; etapa:string; estado:string; prevista:string|null }
type Doc = { cotizacion_id:string; tipo:string; estado:string }
type CRM = { solicitud_id:string; siguiente_accion:string; fecha_accion:string|null }
type Movimiento = { cotizacion_id:string; tipo:string; monto:number }
interface Props {
 usuario:Usuario; cotizaciones:CotNube[]; solicitudes:Solicitud[];
 onCot:(c:CotNube)=>void; onTrack:(id:string)=>void; onCRM:()=>void; onTarifas:()=>void
}
const diaCR=(d:Date)=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Costa_Rica',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)
export function Connect({usuario,cotizaciones,solicitudes,onCot,onTrack,onCRM,onTarifas}:Props) {
 const [datos,setDatos]=useState<{hitos:Hito[];docs:Doc[];crm:CRM[];tarifas:Tarifa[];movs:Movimiento[]}|null>(null)
 const [error,setError]=useState('')
 const [version,setVersion]=useState(0)
 const [grupo,setGrupo]=useState('Todas')
 const staff=esStaff(usuario), operador=usuario.rol==='operador'
 useEffect(()=>{
  let vigente=true
  setDatos(null);setError('')
  const db=nube()
  const cargar=async()=>{
   const [h,d,c,t,m]=await Promise.all([
    db.from('ldx_hitos').select('cotizacion_id,etapa,estado,prevista'),
    db.from('documentos').select('cotizacion_id,tipo,estado'),
    staff?db.from('ldx_crm').select('solicitud_id,siguiente_accion,fecha_accion'):Promise.resolve({data:[],error:null}),
    operador?db.from('tarifas').select('datos'):Promise.resolve({data:[],error:null}),
    operador?db.from('ldx_finanzas').select('cotizacion_id,tipo,monto'):Promise.resolve({data:[],error:null})
   ])
   if(!vigente)return
   if([h,d,c,t,m].some(r=>r.error)){setError('No fue posible consultar todas las alertas. Actualiza o contacta al administrador.');return}
   setDatos({hitos:(h.data??[]) as Hito[],docs:(d.data??[]) as Doc[],crm:(c.data??[]) as CRM[],tarifas:((t.data??[]) as {datos:Tarifa}[]).map(x=>x.datos),movs:(m.data??[]) as Movimiento[]})
  }
  void cargar().catch(()=>{if(vigente)setError('No se pudieron cargar las alertas.')})
  return()=>{vigente=false}
 },[usuario.id,staff,operador,version])
 const hoy=diaCR(new Date()), limite=diaCR(new Date(Date.now()+7*86400000))
 const alertas:Alerta[]=[]
 if(datos) {
  for(const c of cotizaciones){
   if(!staff&&c.cliente_id!==usuario.id)continue
   const vence=c.emision?.vence
   if(c.estado==='formal'&&vence&&vence<=limite)alertas.push({id:'vence-'+c.id,grupo:'Cotizaciones',texto:c.numero+' · '+(vence<hoy?'Vencida':'Vence el '+vence),urgente:vence<hoy,accion:()=>onCot(c)})
   if(c.estado!=='aceptada'&&c.estado!=='en_proceso')continue
   const requeridos=documentosRequeridos(c.datos.embarque,c.datos.productos).filter(d=>d.obligatorio&&(staff||d.responsable!=='landex'))
   const faltan=requeridos.filter(d=>!datos.docs.some(x=>x.cotizacion_id===c.id&&x.tipo===d.id&&x.estado!=='observado'))
   if(faltan.length)alertas.push({id:'docs-'+c.id,grupo:'Documentos',texto:c.numero+' · '+faltan.map(d=>d.nombre).join(', '),urgente:false,accion:()=>onCot(c)})
   for(const h of datos.hitos.filter(h=>h.cotizacion_id===c.id&&h.prevista&&h.prevista<hoy&&h.estado!=='completado'&&h.estado!=='no_aplica'))alertas.push({id:c.id+h.etapa,grupo:'Operaciones',texto:c.numero+' · '+h.etapa+' pendiente desde '+h.prevista,urgente:true,accion:()=>onTrack(c.id)})
  }
  if(staff)for(const s of solicitudes.filter(s=>s.estado!=='cerrado'&&s.estado!=='descartado')){
   const c=datos.crm.find(c=>c.solicitud_id===s.id)
   if(c?.fecha_accion&&c.fecha_accion<=hoy)alertas.push({id:'crm-'+s.id,grupo:'CRM',texto:s.nombre+' · '+(c.siguiente_accion||'Seguimiento pendiente')+' · '+c.fecha_accion,urgente:c.fecha_accion<hoy,accion:onCRM})
  }
  if(operador){
   for(const t of datos.tarifas.filter(t=>!t.ejemplo&&t.vigenteHasta&&t.vigenteHasta<=limite))alertas.push({id:'tarifa-'+t.id,grupo:'Tarifas',texto:t.proveedor+' · '+(t.vigenteHasta<hoy?'Tarifa vencida':'Vence el '+t.vigenteHasta),urgente:t.vigenteHasta<hoy,accion:onTarifas})
   for(const c of cotizaciones.filter(c=>['aceptada','en_proceso','cerrada'].includes(c.estado))){
    const f=datos.movs.filter(m=>m.cotizacion_id===c.id)
    const suma=(t:string)=>f.filter(m=>m.tipo===t).reduce((s,m)=>s+Number(m.monto),0)
    const cobro=suma('ingreso')-suma('anticipo')-suma('cobro'),pago=suma('costo')-suma('pago')
    if(cobro>0.005||pago>0.005)alertas.push({id:'fin-'+c.id,grupo:'Finanzas',texto:c.numero+' · '+(cobro>0.005?'Por cobrar '+usd(cobro)+' ':'')+(pago>0.005?'Por pagar '+usd(pago):''),urgente:false,accion:()=>onTrack(c.id)})
   }
  }
 }
 alertas.sort((a,b)=>Number(b.urgente)-Number(a.urgente))
 const grupos=['Todas',...new Set(alertas.map(a=>a.grupo))]
 return <section className="panel"><div className="fila-estado"><h3>{tr("LANDEX Connect · Alertas ")}{datos?'('+alertas.length+')':''}</h3><button type="button" className="btn" onClick={()=>setVersion(v=>v+1)}>{tr("Actualizar alertas")}</button></div><p className="nota">{tr("Alertas calculadas al abrir o actualizar. Horizonte de vencimiento: siete días. Los saldos financieros no indican mora si no hay fecha de vencimiento. No se envían correos ni mensajes externos.")}</p>{error?<p role="alert" className="error">{tr(error)}</p>:!datos?<p role="status">{tr("Consultando alertas…")}</p>:<><div className="filtros">{grupos.map(g=><button key={g} type="button" className={grupo===g?'activa':''} onClick={()=>setGrupo(g)}>{g}</button>)}</div>{!alertas.length?<p>{tr("Sin alertas en los registros consultados.")}</p>:<ul className="lista-sol">{alertas.filter(a=>grupo==='Todas'||!grupos.includes(grupo)||a.grupo===grupo).map(a=><li key={a.id} className="sol"><span className={'sello '+(a.urgente?'pend':'')}>{a.urgente?tr("Vencida · "):''}{a.grupo}</span><p>{a.texto}</p><button className="link" type="button" onClick={a.accion}>{tr("Revisar")}</button></li>)}</ul>}</>}</section>
}
