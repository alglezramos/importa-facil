import { useState } from 'react'
import { Aliados } from './components/Aliados'
import { Clasificacion } from './components/Clasificacion'
import { Cotizador } from './components/Cotizador'
import { Guia } from './components/Guia'
import { AGENCIA } from './data/config'

type Vista = 'cotizar' | 'clasificar' | 'guia' | 'aliados'

const VISTAS: Record<Vista, string> = {
  cotizar: 'Cotizar importación',
  clasificar: 'Clasificación e impuestos',
  guia: 'Cómo funciona',
  aliados: 'Socios Comerciales',
}

export default function App() {
  const [vista, setVista] = useState<Vista>('cotizar')

  return (
    <div className="app">
      <header>
        <div className="marca">
          <div className="logo" aria-hidden>R</div>
          <div>
            <h1>{AGENCIA.nombre}</h1>
            <p>{AGENCIA.eslogan}</p>
          </div>
        </div>
        <nav>
          {(Object.keys(VISTAS) as Vista[]).map((v) => (
            <button key={v} className={vista === v ? 'activa' : ''} onClick={() => setVista(v)}>
              {VISTAS[v]}
            </button>
          ))}
        </nav>
      </header>

      <main>
        {vista === 'cotizar' && <Cotizador />}
        {vista === 'clasificar' && <Clasificacion />}
        {vista === 'guia' && <Guia />}
        {vista === 'aliados' && <Aliados />}
      </main>

      <footer>
        Cotización referencial. La clasificación, los impuestos y las tarifas se confirman en la cotización formal del
        agente aduanero. Tarifas y tasas de esta versión son de ejemplo.
      </footer>
    </div>
  )
}
