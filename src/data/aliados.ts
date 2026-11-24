/**
 * ALIADOS COMERCIALES
 * ---------------------------------------------------------------
 * Incluye solo empresas con las que exista una alianza real y que
 * hayan autorizado el uso de su nombre y logo.
 *
 * Para agregar un logo: guarda el archivo (PNG o SVG, fondo transparente)
 * en public/aliados/ y escribe su nombre en `logo`, por ejemplo
 * logo: 'aliados/transportes-x.png'. Sin logo se muestran las iniciales.
 */

export type Categoria = 'Navieras' | 'Consolidadores y forwarders' | 'Carga aérea' | 'Transporte terrestre' | 'Almacenes y bodegas' | 'Seguros y financiamiento'

export interface Aliado {
  nombre: string
  categoria: Categoria
  descripcion: string
  logo?: string
  web?: string
}

export const CATEGORIAS: Categoria[] = [
  'Navieras',
  'Consolidadores y forwarders',
  'Carga aérea',
  'Transporte terrestre',
  'Almacenes y bodegas',
  'Seguros y financiamiento',
]

// Ejemplos: reemplazar por aliados reales
export const ALIADOS: Aliado[] = [
  { nombre: 'Consolidador socio Asia', categoria: 'Consolidadores y forwarders', descripcion: 'Carga consolidada semanal desde Shenzhen, Ningbo y Shanghái.' },
  { nombre: 'Consolidador socio Miami', categoria: 'Consolidadores y forwarders', descripcion: 'Consolidación y recolección en el sur de Florida.' },
  { nombre: 'Agente de carga aérea socio', categoria: 'Carga aérea', descripcion: 'Envíos urgentes desde EE. UU., Asia y Europa.' },
  { nombre: 'Transportista socio 1', categoria: 'Transporte terrestre', descripcion: 'Contenedores y carga suelta en la GAM.' },
  { nombre: 'Transportista socio 2', categoria: 'Transporte terrestre', descripcion: 'Distribución de carga suelta en todo el país.' },
  { nombre: 'Almacén fiscal socio', categoria: 'Almacenes y bodegas', descripcion: 'Almacenaje fiscal y desconsolidación.' },
  { nombre: 'Aseguradora socia', categoria: 'Seguros y financiamiento', descripcion: 'Pólizas de seguro de carga por embarque.' },
]

export const ES_EJEMPLO = true
