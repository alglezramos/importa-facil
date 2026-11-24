import { useState } from 'react'
import { ALIADOS, CATEGORIAS, ES_EJEMPLO, type Aliado } from '../data/aliados'
import { AGENCIA } from '../data/config'

const iniciales = (n: string) =>
  n.split(/\s+/).filter((w) => /^[A-Za-zÁÉÍÓÚÑ0-9]/.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join('')

function Logo({ a }: { a: Aliado }) {
  const [falla, setFalla] = useState(false)
  if (a.logo && !falla) {
    return <img src={a.logo} alt={`Logo de ${a.nombre}`} onError={() => setFalla(true)} />
  }
  return <span className="monograma" aria-hidden>{iniciales(a.nombre)}</span>
}

export function Aliados() {
  const [filtro, setFiltro] = useState<string>('Todos')
  const categorias = CATEGORIAS.filter((c) => ALIADOS.some((a) => a.categoria === c))
  const visibles = categorias.filter((c) => filtro === 'Todos' || filtro === c)

  return (
    <section className="panel aliados">
      <h2>Nuestros aliados comerciales</h2>
      <p className="intro">
        Trabajamos con navieras, consolidadores, transportistas y almacenes de confianza para mover tu carga desde el
        proveedor hasta tu bodega. {AGENCIA.nombre} coordina a todos por ti.
      </p>
      {ES_EJEMPLO && <p className="nota">Aliados de ejemplo: esta lista se actualizará con nuestros socios reales.</p>}

      <div className="filtros">
        {['Todos', ...categorias].map((c) => (
          <button key={c} type="button" className={filtro === c ? 'activa' : ''} onClick={() => setFiltro(c)}>{c}</button>
        ))}
      </div>

      {visibles.map((c) => (
        <div key={c} className="categoria">
          <h3>{c}</h3>
          <div className="tarjetas">
            {ALIADOS.filter((a) => a.categoria === c).map((a) => {
              const contenido = (
                <>
                  <div className="logo-aliado"><Logo a={a} /></div>
                  <strong>{a.nombre}</strong>
                  <span>{a.descripcion}</span>
                </>
              )
              return a.web ? (
                <a key={a.nombre} className="tarjeta" href={a.web} target="_blank" rel="noreferrer">{contenido}</a>
              ) : (
                <div key={a.nombre} className="tarjeta">{contenido}</div>
              )
            })}
          </div>
        </div>
      ))}

      <div className="cta-aliado">
        <div>
          <strong>¿Quieres ser aliado de {AGENCIA.nombre}?</strong>
          <span>Si eres naviera, forwarder, transportista o almacén, conversemos.</span>
        </div>
        <a className="btn primario" href={`https://wa.me/${AGENCIA.whatsapp}?text=${encodeURIComponent('Hola, me interesa ser aliado comercial de ' + AGENCIA.nombre)}`} target="_blank" rel="noreferrer">
          Escríbenos
        </a>
      </div>
    </section>
  )
}
