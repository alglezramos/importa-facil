import { formatoRegional } from '../lib/idioma'
import { tr } from '../lib/idioma'
import { Logotipo } from './Marca'
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
    <div className="doc-fondo" role="dialog" aria-modal="true" aria-label={tr("Cotización {0}", numero)}>
      <div className="doc-barra">
        <span>{tr("Vista del documento · ")}{numero}</span>
        <div>
          <button type="button" className="btn primario" onClick={() => window.print()}>{tr("Descargar PDF / Imprimir")}</button>
          <button type="button" className="btn" onClick={onCerrar}>{tr("Cerrar")}</button>
        </div>
      </div>
      <article className="documento">
        <div className="doc-cab">
          <div>
            <Logotipo alto={34} descriptor />
            <div className="doc-desc">{MARCA.firma}</div>
          </div>
          <div className="doc-num">
            <b className="doc-titulo">{formal ? tr("Cotización formal") : tr("Cotización estimada")}</b>
            <span className="doc-sub">{tr("Operación de importación")}</span>
            <span>{tr("N.º ")}{numero}</span>
            <span>{tr("Emitida: ")}{fecha.toLocaleDateString(formatoRegional())}</span>
            <span>{tr("Válida hasta: ")}{vence.toLocaleDateString(formatoRegional())}</span>
            <span className={`sello ${formal ? 'validada' : r.estado === 'incompleta' ? 'pend' : 'validada'}`}>{formal ? tr("Emitida por {0}", formal.por) : r.estado === 'incompleta' ? tr("Incompleta · {0} pendiente(s)", r.pendientes.length) : tr("Estimada")}</span>
          </div>
        </div>

        <section className="doc-grid">
          <div>
            <h4>{tr("Cliente")}</h4>
            <p>{cliente || tr("Por completar")}{perfil.empresa && perfil.nombre ? <><br />{perfil.nombre}</> : null}
              {perfil.identificacion && <><br />{tr("Identificación: ")}{perfil.identificacion}</>}
              {(perfil.email || perfil.telefono) && <><br />{[perfil.email, perfil.telefono].filter(Boolean).join(' · ')}</>}
              {perfil.direccionEntrega && <><br />{tr("Entrega: ")}{perfil.direccionEntrega}</>}</p>
          </div>
          <div>
            <h4>{tr("Proveedor")}</h4>
            <p>{e.proveedor?.empresa || tr("Por completar")}
              {e.proveedor?.direccion && <><br />{e.proveedor.direccion}</>}
              {(e.proveedor?.contacto || e.proveedor?.email || e.proveedor?.telefono) && <><br />{[e.proveedor?.contacto, e.proveedor?.email, e.proveedor?.telefono].filter(Boolean).join(' · ')}</>}</p>
          </div>
          <div>
            <h4>{tr("Embarque")}</h4>
            <p>{tr("Origen: ")}{tr(e.origen.nombre)}<br />{tr("Destino: ")}{tr(ZONAS[e.zona])}{tr(", Costa Rica")}<br />{tr("Incoterm: ")}{e.incoterm} ({tr(INCOTERMS[e.incoterm].nombre)}){e.lugarConvenido ? ` – ${e.lugarConvenido}` : ''}{e.incotermPorConfirmar ? tr(" · por confirmar") : ''}<br />{tr("Modalidad: ")}{tr(MODOS[e.modo])}<br />{tr("Carga: ")}{r.carga.volumenM3.toFixed(2)}{tr(" m³ · ")}{r.carga.pesoKg.toLocaleString(formatoRegional())}{tr(" kg")}{r.carga.contenedores ? tr(" · {0} unidad(es)", r.carga.contenedores) : ''}</p>
          </div>
        </section>

        <section className="doc-total">
          <div><span>{tr("Costo total puesto y descargado en bodega")}{r.pendientes.length ? tr(" (sin pendientes)") : ''}</span><b>{usd(r.totales.total)}</b><small>{crc(r.totales.total * e.tipoCambio)}{tr(" · tipo de cambio ")}{e.tipoCambio}</small></div>
          <div><span>{tr("Mercancía")}</span><b>{usd(r.totales.mercancia)}</b></div>
          <div><span>{tr("Servicios logísticos")}</span><b>{usd(r.totales.logistica)}</b></div>
          <div><span>{tr("Impuestos")}</span><b>{imp}</b><small>{tr("IVA recuperable ")}{usd(r.totales.ivaRecuperable)}</small></div>
          <div><span>{tr("Tiempo estimado")}</span><b>{r.tiempo.dias}{tr(" días")}</b></div>
        </section>
        {!formal && <p className="doc-nota">{tr("Confiabilidad: ")}{conf.pct}{tr("% de los costos de importación confirmados (")}{usd(conf.confirmado)}{tr(" confirmados y ")}{usd(conf.estimado)}{tr(" estimados")}{conf.pendientes ? tr(", {0} pendiente(s) sin monto", conf.pendientes) : ''}).</p>}
        {perfil.presupuestoUSD ? (
          <p className="doc-nota">{tr("Monto disponible indicado por el cliente: ")}{usd(perfil.presupuestoUSD)} · {r.totales.desembolso <= perfil.presupuestoUSD ? tr("el desembolso estimado cabe con {0} de margen", usd(perfil.presupuestoUSD - r.totales.desembolso)) : tr("el desembolso estimado lo supera en {0}", usd(r.totales.desembolso - perfil.presupuestoUSD))}.</p>
        ) : null}

        <h4>{tr("Productos")}</h4>
        <table className="tabla doc-tabla">
          <thead><tr><th>{tr("SKU")}</th><th>{tr("Producto")}</th><th>{tr("Origen")}</th><th>{tr("Partida")}</th><th className="num">{tr("Cant.")}</th><th className="num">{tr("Valor")}</th><th className="num">{tr("Logística")}</th><th className="num">{tr("Impuestos")}</th><th className="num">{tr("Landed unit.")}</th><th className="num">{tr("Landed total")}</th></tr></thead>
          <tbody>
            {r.productos.map((x) => {
              const p = productos.find((y) => y.id === x.id)!
              return (
                <tr key={x.id}>
                  <td>{x.sku}</td><td>{x.nombre}<small>{volumenProducto(p).toFixed(2)}{tr(" m³ · ")}{p.pesoBrutoKg.toLocaleString(formatoRegional())}{tr(" kg")}</small></td>
                  <td>{pais(p.paisFabricacion)}</td>
                  <td>{p.clasificacion ? <>{p.clasificacion.codigo}<small>{p.clasificacion.estado === 'validada' ? tr("Validada") : tr("Preliminar")}</small></> : tr("Por clasificar")}</td>
                  <td className="num">{x.cantidad.toLocaleString(formatoRegional())}</td><td className="num">{usd(x.valorMercancia)}</td>
                  <td className="num">{usd(x.logistica)}</td>
                  <td className="num">{x.impuestos.pendientes.length ? tr("Pendiente") : usd(x.impuestosTotal)}</td>
                  <td className="num">{usd(x.landedUnitario)}</td><td className="num">{usd(x.landedTotal)}</td>
                </tr>
              )
            })}
            <tr className="suma"><td colSpan={5}>{tr("Total")}</td><td className="num">{usd(r.totales.mercancia)}</td><td className="num">{usd(r.totales.logistica)}</td><td className="num">{imp}</td><td></td><td className="num">{usd(r.totales.total)}</td></tr>
          </tbody>
        </table>

        <h4>{tr("Desglose por etapa")}</h4>
        <table className="tabla doc-tabla">
          <thead><tr><th>{tr("Etapa")}</th><th>{tr("Concepto")}</th><th>{tr("Estado")}</th><th className="num">{tr("Monto")}</th></tr></thead>
          <tbody>
            {([1, 2, 3, 4, 5, 6, 7] as Etapa[]).flatMap((et) => [
              ...r.conceptos.filter((k) => k.etapa === et && k.estado !== 'no_aplica').map((k, i) => (
                <tr key={k.id}><td>{i === 0 ? `${et}. ${ETAPAS[et]}` : ''}</td><td>{tr(k.nombre)}</td><td>{tr(ESTADOS[k.estado])}</td>
                  <td className="num">{k.estado === 'pendiente' ? tr("Pendiente") : k.estado === 'estimado' || k.estado === 'confirmado' ? usd(k.monto ?? 0) : '—'}</td></tr>
              )),
              ...(et === 5 ? [<tr key="imp"><td></td><td>{tr("Impuestos de importación (DAI, Selectivo, Ley 6946, IVA)")}</td><td>{impPend ? tr("Pendiente de clasificación") : tr("Calculado por producto")}</td><td className="num">{imp}</td></tr>] : []),
            ])}
          </tbody>
        </table>

        <section className="doc-grid dos">
          <div>
            <h4>{tr("Servicios incluidos en esta cotización")}</h4>
            <ul>{incluidos.map((k) => <li key={k.id}>{tr(k.nombre)}</li>)}</ul>
            {enPrecio.length > 0 && <><h4>{tr("Incluidos en el precio del proveedor")}</h4><ul>{enPrecio.map((k) => <li key={k.id}>{tr(k.nombre)}</li>)}</ul></>}
          </div>
          <div>
            <h4>{tr("Exclusiones")}</h4>
            <ul>
              {noAplica.map((k) => <li key={k.id}>{tr(k.nombre)}</li>)}
              <li>{tr("Multas o sanciones derivadas de información incorrecta del proveedor o del importador")}</li>
            </ul>
            {pendientes.length > 0 && <><h4>{tr("Pendientes de cotizar (no incluidos en el total)")}</h4><ul>{pendientes.map((k) => <li key={k.id}>{tr(k.nombre)}</li>)}</ul></>}
          </div>
        </section>

        <section className="doc-grid dos">
          <div>
            <h4>{tr("Documentación requerida")}</h4>
            <ul>{documentos.map((d) => <li key={d.id}>{d.nombre} <small>({tr(RESPONSABLES[d.responsable].toLowerCase())}{d.obligatorio ? '' : tr(", recomendado")})</small></li>)}</ul>
          </div>
          <div>
            <h4>{tr("Línea de tiempo estimada")}</h4>
            <ul>{r.tiempo.etapas.filter((t) => !t.paralelo).map((t) => <li key={t.nombre}>{tr("Día ")}{t.inicio}: {t.nombre} ({t.dias}{tr(" d)")}</li>)}<li><b>{tr("Día ")}{r.tiempo.dias}{tr(": mercancía descargada en bodega")}</b></li></ul>
          </div>
        </section>

        {tarifas.length > 0 && (
          <>
            <h4>{tr("Proveedores y tarifas aplicadas")}</h4>
            <table className="tabla doc-tabla">
              <thead><tr><th>{tr("Proveedor")}</th><th>{tr("Servicio")}</th><th>{tr("Tránsito")}</th><th>{tr("Vigencia de la tarifa")}</th><th>{tr("Referencia")}</th></tr></thead>
              <tbody>{tarifas.map((t) => <tr key={t.id}><td>{t.proveedor}</td><td>{tr(CATEGORIAS_PROVEEDOR[t.categoria])}</td><td>{t.diasTransito != null ? tr("{0} días", t.diasTransito) : '—'}</td><td>{tr("hasta ")}{t.vigenteHasta}</td><td>{t.ejemplo ? tr("Ejemplo (no es oferta)") : t.fuente}</td></tr>)}</tbody>
            </table>
            {tarifas.some((t) => t.condiciones || t.excluye.length) && (
              <ul className="doc-cond">
                {tarifas.filter((t) => t.condiciones).map((t) => <li key={t.id}>{t.proveedor}: {t.condiciones}</li>)}
                {tarifas.flatMap((t) => t.excluye.map((x) => <li key={t.id + x}>{t.proveedor}{tr(" no incluye: ")}{x}</li>))}
              </ul>
            )}
          </>
        )}

        <h4>{tr("Costos extraordinarios no garantizados")}</h4>
        <ul className="doc-cond">
          <li>{tr("Almacenaje, demoras (demurrage) y detención del contenedor por encima de los días libres del proveedor.")}</li>
          <li>{tr("Revisión física, aforo, inspecciones fitosanitarias o de Salud ordenadas por las autoridades.")}</li>
          <li>{tr("Recargos de temporada, combustible o cambios de tarifa que el proveedor aplique después de la vigencia indicada.")}</li>
          <li>{tr("Cambios en la normativa, en las tasas de impuestos o en el tipo de cambio al momento de la nacionalización.")}</li>
        </ul>

        <h4>{tr("Condiciones")}</h4>
        <ul className="doc-cond">
          {formal ? (
            <>
              <li>{tr("Cotización formal con tarifas confirmadas por los proveedores indicados y clasificación arancelaria validada por ")}{formal.por}{tr(" el ")}{formal.emitida.slice(0, 10)}.</li>
              <li>{tr("Válida hasta el ")}{formal.vence}{tr(" o hasta el vencimiento de cualquiera de las tarifas aplicadas, lo que ocurra primero. Sujeta a disponibilidad de espacio del transportista.")}</li>
              <li>{tr("Los impuestos se liquidan según la normativa vigente el día de la nacionalización.")}</li>
            </>
          ) : (
            <>
              <li>{tr("Cotización estimada con tarifas referenciales (")}{VIGENCIA_TARIFAS.fuente}, {VIGENCIA_TARIFAS.actualizado}{tr("). No constituye una oferta de transporte.")}</li>
              <li>{tr("Clasificación arancelaria y tasas preliminares hasta su validación por el agente aduanero. Los impuestos se pagan según la normativa vigente el día de la nacionalización.")}</li>
            </>
          )}
          <li>{tr("Montos en dólares estadounidenses; el equivalente en colones usa el tipo de cambio indicado.")}</li>
          <li>{tr("El IVA de importación puede ser crédito fiscal si el importador está inscrito como contribuyente.")}</li>
          {!formal && <li>{tr("Vigencia de ")}{vigenciaDias}{tr(" días naturales. La cotización formal requiere tarifas confirmadas por los proveedores logísticos y la clasificación validada.")}</li>}
          {r.supuestos.map((s) => <li key={s}>{s}</li>)}
        </ul>

        <div className="doc-pie">{MARCA.nombre} · {MARCA.descriptor} · {MARCA.firma} · {AGENCIA.email}</div>
      </article>
    </div>
  )
}
