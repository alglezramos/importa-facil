import { confiabilidad } from '../lib/confianza'
import { documentosRequeridos, RESPONSABLES } from '../lib/expediente'
import { useEffect } from 'react'
import { AGENCIA, MARCA, MODOS, ZONAS } from '../data/config'
import { VIGENCIA_TARIFAS } from '../data/logistica'
import type { Perfil } from '../lib/almacen'
import type { Emision } from '../lib/formal'
import { CATEGORIAS_PROVEEDOR, type Tarifa } from '../lib/tarifas'
import { crc, usd } from '../lib/formato'
import { ESTADOS, ETAPAS, INCOTERMS, volumenProducto, type Embarque, type Etapa, type Producto, type ResultadoLanded } from '../lib/landed'
import { PAISES } from './ProductoEditor'

interface Props {
  numero: string
  fecha: Date
  vigenciaDias: number
  perfil: Perfil
  e: Embarque
  productos: Producto[]
  r: ResultadoLanded
  formal?: Emision
  tarifas?: Tarifa[]
  onCerrar: () => void
}

const pais = (c: string) => PAISES.find(([k]) => k === c)?.[1] ?? c

export function Documento({ numero, fecha, vigenciaDias, perfil, e, productos, r, formal, tarifas = [], onCerrar }: Props) {
  useEffect(() => {
    document.body.classList.add('doc-abierto')
    const esc = (ev: KeyboardEvent) => { if (ev.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', esc)
    return () => { document.body.classList.remove('doc-abierto'); window.removeEventListener('keydown', esc) }
  }, [onCerrar])

  const vence = formal ? new Date(`${formal.vence}T12:00:00`) : new Date(fecha)
  if (!formal) vence.setDate(vence.getDate() + vigenciaDias)
  const incluidos = r.conceptos.filter((k) => k.estado === 'estimado' || k.estado === 'confirmado')
  const enPrecio = r.conceptos.filter((k) => k.estado === 'incluido')
  const pendientes = r.conceptos.filter((k) => k.estado === 'pendiente')
  const noAplica = r.conceptos.filter((k) => k.estado === 'no_aplica')
  const documentos = documentosRequeridos(e, productos)
  const conf = confiabilidad(e, productos, r)
  const cliente = perfil.empresa || perfil.nombre
  const impPend = r.productos.some((x) => x.impuestos.pendientes.length > 0)
  const imp = impPend ? (r.totales.impuestos ? `${usd(r.totales.impuestos)} + pendientes` : 'Pendiente') : usd(r.totales.impuestos)

  return (
    <div className="doc-fondo" role="dialog" aria-modal="true" aria-label={`Cotización ${numero}`}>
      <div className="doc-barra">
        <span>Vista del documento · {numero}</span>
        <div>
          <button type="button" className="btn primario" onClick={() => window.print()}>Descargar PDF / Imprimir</button>
          <button type="button" className="btn" onClick={onCerrar}>Cerrar</button>
        </div>
      </div>
      <article className="documento">
        <div className="doc-cab">
          <div>
            <div className="wordmark doc-marca"><span className="land">LAND</span><span className="ex">EX</span></div>
            <div className="doc-desc">{MARCA.descriptor} · {MARCA.firma}</div>
          </div>
          <div className="doc-num">
            <b>{formal ? 'COTIZACIÓN FORMAL' : 'COTIZACIÓN ESTIMADA'}</b>
            <span>N.º {numero}</span>
            <span>Emitida: {fecha.toLocaleDateString('es-CR')}</span>
            <span>Válida hasta: {vence.toLocaleDateString('es-CR')}</span>
            <span className={`sello ${formal ? 'validada' : r.estado === 'incompleta' ? 'pend' : 'validada'}`}>{formal ? `Emitida por ${formal.por}` : r.estado === 'incompleta' ? `Incompleta · ${r.pendientes.length} pendiente(s)` : 'Estimada'}</span>
          </div>
        </div>

        <section className="doc-grid">
          <div>
            <h4>Cliente</h4>
            <p>{cliente || 'Por completar'}{perfil.empresa && perfil.nombre ? <><br />{perfil.nombre}</> : null}
              {perfil.identificacion && <><br />Identificación: {perfil.identificacion}</>}
              {(perfil.email || perfil.telefono) && <><br />{[perfil.email, perfil.telefono].filter(Boolean).join(' · ')}</>}
              {perfil.direccionEntrega && <><br />Entrega: {perfil.direccionEntrega}</>}</p>
          </div>
          <div>
            <h4>Proveedor</h4>
            <p>{e.proveedor?.empresa || 'Por completar'}
              {e.proveedor?.direccion && <><br />{e.proveedor.direccion}</>}
              {(e.proveedor?.contacto || e.proveedor?.email || e.proveedor?.telefono) && <><br />{[e.proveedor?.contacto, e.proveedor?.email, e.proveedor?.telefono].filter(Boolean).join(' · ')}</>}</p>
          </div>
          <div>
            <h4>Embarque</h4>
            <p>Origen: {e.origen.nombre}<br />Destino: {ZONAS[e.zona]}, Costa Rica<br />
              Incoterm: {e.incoterm} ({INCOTERMS[e.incoterm].nombre}){e.lugarConvenido ? ` – ${e.lugarConvenido}` : ''}{e.incotermPorConfirmar ? ' · por confirmar' : ''}<br />
              Modalidad: {MODOS[e.modo]}<br />
              Carga: {r.carga.volumenM3.toFixed(2)} m³ · {r.carga.pesoKg.toLocaleString('es-CR')} kg{r.carga.contenedores ? ` · ${r.carga.contenedores} unidad(es)` : ''}</p>
          </div>
        </section>

        <section className="doc-total">
          <div><span>Costo total puesto y descargado en bodega{r.pendientes.length ? ' (sin pendientes)' : ''}</span><b>{usd(r.totales.total)}</b><small>{crc(r.totales.total * e.tipoCambio)} · tipo de cambio {e.tipoCambio}</small></div>
          <div><span>Mercancía</span><b>{usd(r.totales.mercancia)}</b></div>
          <div><span>Servicios logísticos</span><b>{usd(r.totales.logistica)}</b></div>
          <div><span>Impuestos</span><b>{imp}</b><small>IVA recuperable {usd(r.totales.ivaRecuperable)}</small></div>
          <div><span>Tiempo estimado</span><b>{r.tiempo.dias} días</b></div>
        </section>
        {!formal && <p className="doc-nota">Confiabilidad: {conf.pct}% de los costos de importación confirmados ({usd(conf.confirmado)} confirmados y {usd(conf.estimado)} estimados{conf.pendientes ? `, ${conf.pendientes} pendiente(s) sin monto` : ''}).</p>}
        {perfil.presupuestoUSD ? (
          <p className="doc-nota">Monto disponible indicado por el cliente: {usd(perfil.presupuestoUSD)} · {r.totales.desembolso <= perfil.presupuestoUSD ? `el desembolso estimado cabe con ${usd(perfil.presupuestoUSD - r.totales.desembolso)} de margen` : `el desembolso estimado lo supera en ${usd(r.totales.desembolso - perfil.presupuestoUSD)}`}.</p>
        ) : null}

        <h4>Productos</h4>
        <table className="tabla doc-tabla">
          <thead><tr><th>SKU</th><th>Producto</th><th>Origen</th><th>Partida</th><th className="num">Cant.</th><th className="num">Valor</th><th className="num">Logística</th><th className="num">Impuestos</th><th className="num">Landed unit.</th><th className="num">Landed total</th></tr></thead>
          <tbody>
            {r.productos.map((x) => {
              const p = productos.find((y) => y.id === x.id)!
              return (
                <tr key={x.id}>
                  <td>{x.sku}</td><td>{x.nombre}<small>{volumenProducto(p).toFixed(2)} m³ · {p.pesoBrutoKg.toLocaleString('es-CR')} kg</small></td>
                  <td>{pais(p.paisFabricacion)}</td>
                  <td>{p.clasificacion ? <>{p.clasificacion.codigo}<small>{p.clasificacion.estado === 'validada' ? 'Validada' : 'Preliminar'}</small></> : 'Por clasificar'}</td>
                  <td className="num">{x.cantidad.toLocaleString('es-CR')}</td><td className="num">{usd(x.valorMercancia)}</td>
                  <td className="num">{usd(x.logistica)}</td>
                  <td className="num">{x.impuestos.pendientes.length ? 'Pendiente' : usd(x.impuestosTotal)}</td>
                  <td className="num">{usd(x.landedUnitario)}</td><td className="num">{usd(x.landedTotal)}</td>
                </tr>
              )
            })}
            <tr className="suma"><td colSpan={5}>Total</td><td className="num">{usd(r.totales.mercancia)}</td><td className="num">{usd(r.totales.logistica)}</td><td className="num">{imp}</td><td></td><td className="num">{usd(r.totales.total)}</td></tr>
          </tbody>
        </table>

        <h4>Desglose por etapa</h4>
        <table className="tabla doc-tabla">
          <thead><tr><th>Etapa</th><th>Concepto</th><th>Estado</th><th className="num">Monto</th></tr></thead>
          <tbody>
            {([1, 2, 3, 4, 5, 6, 7] as Etapa[]).flatMap((et) => [
              ...r.conceptos.filter((k) => k.etapa === et && k.estado !== 'no_aplica').map((k, i) => (
                <tr key={k.id}><td>{i === 0 ? `${et}. ${ETAPAS[et]}` : ''}</td><td>{k.nombre}</td><td>{ESTADOS[k.estado]}</td>
                  <td className="num">{k.estado === 'pendiente' ? 'Pendiente' : k.estado === 'estimado' || k.estado === 'confirmado' ? usd(k.monto ?? 0) : '—'}</td></tr>
              )),
              ...(et === 5 ? [<tr key="imp"><td></td><td>Impuestos de importación (DAI, Selectivo, Ley 6946, IVA)</td><td>{impPend ? 'Pendiente de clasificación' : 'Calculado por producto'}</td><td className="num">{imp}</td></tr>] : []),
            ])}
          </tbody>
        </table>

        <section className="doc-grid dos">
          <div>
            <h4>Servicios incluidos en esta cotización</h4>
            <ul>{incluidos.map((k) => <li key={k.id}>{k.nombre}</li>)}</ul>
            {enPrecio.length > 0 && <><h4>Incluidos en el precio del proveedor</h4><ul>{enPrecio.map((k) => <li key={k.id}>{k.nombre}</li>)}</ul></>}
          </div>
          <div>
            <h4>Exclusiones</h4>
            <ul>
              {noAplica.map((k) => <li key={k.id}>{k.nombre}</li>)}
              <li>Multas o sanciones derivadas de información incorrecta del proveedor o del importador</li>
            </ul>
            {pendientes.length > 0 && <><h4>Pendientes de cotizar (no incluidos en el total)</h4><ul>{pendientes.map((k) => <li key={k.id}>{k.nombre}</li>)}</ul></>}
          </div>
        </section>

        <section className="doc-grid dos">
          <div>
            <h4>Documentación requerida</h4>
            <ul>{documentos.map((d) => <li key={d.id}>{d.nombre} <small>({RESPONSABLES[d.responsable].toLowerCase()}{d.obligatorio ? '' : ', recomendado'})</small></li>)}</ul>
          </div>
          <div>
            <h4>Línea de tiempo estimada</h4>
            <ul>{r.tiempo.etapas.filter((t) => !t.paralelo).map((t) => <li key={t.nombre}>Día {t.inicio}: {t.nombre} ({t.dias} d)</li>)}<li><b>Día {r.tiempo.dias}: mercancía descargada en bodega</b></li></ul>
          </div>
        </section>

        {tarifas.length > 0 && (
          <>
            <h4>Proveedores y tarifas aplicadas</h4>
            <table className="tabla doc-tabla">
              <thead><tr><th>Proveedor</th><th>Servicio</th><th>Tránsito</th><th>Vigencia de la tarifa</th><th>Referencia</th></tr></thead>
              <tbody>{tarifas.map((t) => <tr key={t.id}><td>{t.proveedor}</td><td>{CATEGORIAS_PROVEEDOR[t.categoria]}</td><td>{t.diasTransito != null ? `${t.diasTransito} días` : '—'}</td><td>hasta {t.vigenteHasta}</td><td>{t.ejemplo ? 'Ejemplo (no es oferta)' : t.fuente}</td></tr>)}</tbody>
            </table>
            {tarifas.some((t) => t.condiciones || t.excluye.length) && (
              <ul className="doc-cond">
                {tarifas.filter((t) => t.condiciones).map((t) => <li key={t.id}>{t.proveedor}: {t.condiciones}</li>)}
                {tarifas.flatMap((t) => t.excluye.map((x) => <li key={t.id + x}>{t.proveedor} no incluye: {x}</li>))}
              </ul>
            )}
          </>
        )}

        <h4>Costos extraordinarios no garantizados</h4>
        <ul className="doc-cond">
          <li>Almacenaje, demoras (demurrage) y detención del contenedor por encima de los días libres del proveedor.</li>
          <li>Revisión física, aforo, inspecciones fitosanitarias o de Salud ordenadas por las autoridades.</li>
          <li>Recargos de temporada, combustible o cambios de tarifa que el proveedor aplique después de la vigencia indicada.</li>
          <li>Cambios en la normativa, en las tasas de impuestos o en el tipo de cambio al momento de la nacionalización.</li>
        </ul>

        <h4>Condiciones</h4>
        <ul className="doc-cond">
          {formal ? (
            <>
              <li>Cotización formal con tarifas confirmadas por los proveedores indicados y clasificación arancelaria validada por {formal.por} el {formal.emitida.slice(0, 10)}.</li>
              <li>Válida hasta el {formal.vence} o hasta el vencimiento de cualquiera de las tarifas aplicadas, lo que ocurra primero. Sujeta a disponibilidad de espacio del transportista.</li>
              <li>Los impuestos se liquidan según la normativa vigente el día de la nacionalización.</li>
            </>
          ) : (
            <>
              <li>Cotización estimada con tarifas referenciales ({VIGENCIA_TARIFAS.fuente}, {VIGENCIA_TARIFAS.actualizado}). No constituye una oferta de transporte.</li>
              <li>Clasificación arancelaria y tasas preliminares hasta su validación por el agente aduanero. Los impuestos se pagan según la normativa vigente el día de la nacionalización.</li>
            </>
          )}
          <li>Montos en dólares estadounidenses; el equivalente en colones usa el tipo de cambio indicado.</li>
          <li>El IVA de importación puede ser crédito fiscal si el importador está inscrito como contribuyente.</li>
          {!formal && <li>Vigencia de {vigenciaDias} días naturales. La cotización formal requiere tarifas confirmadas por los proveedores logísticos y la clasificación validada.</li>}
          {r.supuestos.map((s) => <li key={s}>{s}</li>)}
        </ul>

        <div className="doc-pie">{MARCA.nombre} · {MARCA.descriptor} · {MARCA.firma} · {AGENCIA.email}</div>
      </article>
    </div>
  )
}
