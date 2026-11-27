import { tr } from '../lib/idioma'
import { useState } from 'react'
import { CATEGORIAS, visibles, type Aliado, type Categoria } from '../data/aliados'
import { AGENCIA } from '../data/config'

function Tarjeta({ a }: { a: Aliado }) {
  const [falla, setFalla] = useState(false)
  return (
    <li className="tarjeta-logo">
      <div className="logo-caja">
        {falla
          ? <span className="logo-texto">{a.nombre}</span>
          : <img src={a.logo} alt={a.nombre} loading="lazy" width={600} height={320} onError={() => setFalla(true)} />}
      </div>
      <span className="logo-nombre">{a.nombre}</span>
    </li>
  )
}

function Bloque({ c }: { c: Categoria }) {
  const lista = visibles(c.id)
  if (!lista.length) return null
  return (
    <div className="categoria">
      <h3>{tr(c.nombre)} <small>{lista.length}</small></h3>
      <ul className="rejilla-logos">{lista.map((x) => <Tarjeta key={x.logo} a={x} />)}</ul>
    </div>
  )
}

export function Aliados() {
  const operadores = CATEGORIAS.filter((c) => c.grupo === 'operadores' && visibles(c.id).length)
  const instituciones = CATEGORIAS.filter((c) => c.grupo === 'instituciones' && visibles(c.id).length)
  const [filtro, setFiltro] = useState<string>('todos')
  const mostrados = operadores.filter((c) => filtro === 'todos' || filtro === c.id)

  return (
    <section className="panel aliados">
      <h2>{tr("Nuestros socios comerciales")}</h2>
      <p className="intro">{tr("Navieras, forwarders, líneas aéreas, terminales y aseguradoras para mover tu carga desde el proveedor hasta tu bodega. ")}{AGENCIA.nombre}{tr(" es tu único punto de contacto: coordinamos con todos y nos encargamos del trámite aduanal.")}</p>

      <div className="filtros" role="group" aria-label={tr("Filtrar por categoría")}>
        {[{ id: 'todos', nombre: 'Todos' }, ...operadores].map((c) => (
          <button key={c.id} type="button" className={filtro === c.id ? 'activa' : ''} aria-pressed={filtro === c.id} onClick={() => setFiltro(c.id)}>
            {tr(c.nombre)}
          </button>
        ))}
      </div>

      {mostrados.map((c) => <Bloque key={c.id} c={c} />)}

      {instituciones.length > 0 && (
        <div className="instituciones">
          <h3 className="titulo-instituciones">{tr("Instituciones del comercio exterior")}</h3>
          <p className="nota-inst">{tr("Organismos y gremios de referencia para el comercio exterior de Costa Rica.")}</p>
          {instituciones.map((c) => (
            <ul key={c.id} className="rejilla-logos">{visibles(c.id).map((x) => <Tarjeta key={x.logo} a={x} />)}</ul>
          ))}
        </div>
      )}

      <div className="cta-aliado">
        <div>
          <strong>{tr("¿Quieres ser socio comercial de ")}{AGENCIA.nombre}?</strong>
          <span>{tr("Si eres naviera, forwarder, transportista o almacén, conversemos.")}</span>
        </div>
        <a className="btn primario" href={AGENCIA.whatsapp
          ? `https://wa.me/${AGENCIA.whatsapp}?text=${encodeURIComponent('Hola, me interesa ser socio comercial de ' + AGENCIA.nombre)}`
          : `mailto:${AGENCIA.emailInfo}?subject=${encodeURIComponent('Quiero ser socio comercial de ' + AGENCIA.nombre)}`} target="_blank" rel="noreferrer">{tr("Escríbenos")}</a>
      </div>
    </section>
  )
}
