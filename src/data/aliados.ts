/**
 * SOCIOS COMERCIALES
 * ---------------------------------------------------------------
 * Logotipos del kit LANDEX_Logos_Final (27 PNG de 600 × 320 px) en
 * public/logos/<categoría>/. Se muestran sin enlaces externos: LANDEX es el
 * único punto de contacto comercial y la agencia aduanal.
 *
 * La publicación de estos logos fue decisión de Ale (24/11/2026). Los acuerdos
 * con cada empresa se siguen en la hoja "Socios comerciales".
 *
 * `publicado: false` oculta un logo sin borrarlo. Esencial Costa Rica queda
 * oculta hasta contar con la licencia de uso de la marca país.
 */

export type Grupo = 'operadores' | 'instituciones'

export interface Categoria {
  id: string
  nombre: string
  grupo: Grupo
}

export interface Aliado {
  nombre: string
  categoria: string
  logo: string
  publicado: boolean
}

export const CATEGORIAS: Categoria[] = [
  { id: 'navieras', nombre: 'Navieras', grupo: 'operadores' },
  { id: 'forwarders', nombre: 'Freight forwarders', grupo: 'operadores' },
  { id: 'transporte-aereo', nombre: 'Transporte aéreo', grupo: 'operadores' },
  { id: 'terminales', nombre: 'Terminales portuarias', grupo: 'operadores' },
  { id: 'seguros', nombre: 'Seguros', grupo: 'operadores' },
  { id: 'inspeccion', nombre: 'Inspección y certificación', grupo: 'operadores' },
  { id: 'instituciones', nombre: 'Instituciones y marca país', grupo: 'instituciones' },
]

const a = (categoria: string, archivo: string, nombre: string, publicado = true): Aliado =>
  ({ nombre, categoria, logo: `logos/${categoria}/${archivo}.png`, publicado })

export const ALIADOS: Aliado[] = [
  a('navieras', 'maersk', 'Maersk'),
  a('navieras', 'msc', 'MSC'),
  a('navieras', 'cma-cgm', 'CMA CGM'),
  a('navieras', 'hapag-lloyd', 'Hapag-Lloyd'),
  a('navieras', 'one-ocean-network-express', 'ONE (Ocean Network Express)'),
  a('navieras', 'evergreen', 'Evergreen'),
  a('navieras', 'cosco-shipping', 'COSCO Shipping'),
  a('navieras', 'hmm', 'HMM'),
  a('navieras', 'yang-ming', 'Yang Ming'),
  a('navieras', 'zim', 'ZIM'),
  a('navieras', 'pil', 'PIL'),
  a('navieras', 'crowley', 'Crowley'),
  a('navieras', 'seaboard-marine', 'Seaboard Marine'),
  a('forwarders', 'air-sea-worldwide', 'Air Sea Worldwide'),
  a('forwarders', 'dsv', 'DSV'),
  a('forwarders', 'kuehne-nagel', 'Kuehne+Nagel'),
  a('forwarders', 'grupo-servica', 'Grupo Servica'),
  a('transporte-aereo', 'avianca-cargo', 'Avianca Cargo'),
  a('transporte-aereo', 'dhl', 'DHL'),
  a('transporte-aereo', 'ups', 'UPS'),
  a('terminales', 'apm-terminals-moin', 'APM Terminals Moín'),
  a('seguros', 'ins', 'INS'),
  a('seguros', 'bac-credomatic', 'BAC Credomatic'),
  a('inspeccion', 'qima', 'QIMA'),
  a('instituciones', 'procomer', 'PROCOMER'),
  a('instituciones', 'crecex', 'CRECEX'),
  a('instituciones', 'esencial-costa-rica', 'Esencial Costa Rica', false),
]

export const visibles = (categoria: string) => ALIADOS.filter((x) => x.publicado && x.categoria === categoria)
