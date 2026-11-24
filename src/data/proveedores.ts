/**
 * NAVIERAS, CONSOLIDADORES Y TRANSPORTISTAS
 * ---------------------------------------------------------------
 * Lista inicial para que el cliente elija con quién quiere cotizar.
 * La solicitud siempre llega a la agencia, que es quien pide y compara
 * las tarifas. Verifica los servicios vigentes de cada naviera y
 * reemplaza los consolidadores y transportistas por tus socios reales.
 */

import type { Modo } from './config'

export interface Proveedor {
  id: string
  nombre: string
  tipo: 'naviera' | 'consolidador' | 'aereo' | 'terrestre'
  /** Ids de origen (config.ts) que atiende. Vacío = todos. */
  origenes: string[]
  modos: Modo[]
  nota?: string
  /** Correo de contacto comercial. Lo usa la agencia, no se muestra al cliente. */
  contacto?: string
}

const MAR: Modo[] = ['LCL', 'FCL20', 'FCL40']
const FCL: Modo[] = ['FCL20', 'FCL40']

export const PROVEEDORES: Proveedor[] = [
  // Navieras (contenedor completo)
  { id: 'crowley', nombre: 'Crowley', tipo: 'naviera', origenes: ['us-mia'], modos: MAR, nota: 'Florida – Moín, semanal' },
  { id: 'seaboard', nombre: 'Seaboard Marine', tipo: 'naviera', origenes: ['us-mia'], modos: MAR, nota: 'Miami – Moín' },
  { id: 'king-ocean', nombre: 'King Ocean', tipo: 'naviera', origenes: ['us-mia'], modos: FCL, nota: 'Port Everglades – Moín' },
  { id: 'evergreen', nombre: 'Evergreen', tipo: 'naviera', origenes: ['us-mia', 'cn-sur', 'cn-este'], modos: FCL },
  { id: 'one', nombre: 'ONE (Ocean Network Express)', tipo: 'naviera', origenes: ['cn-sur', 'cn-este'], modos: FCL, nota: 'Asia – Caldera / Moín' },
  { id: 'cosco', nombre: 'COSCO Shipping', tipo: 'naviera', origenes: ['cn-sur', 'cn-este'], modos: FCL },
  { id: 'maersk', nombre: 'Maersk', tipo: 'naviera', origenes: ['cn-sur', 'cn-este', 'us-mia', 'mx', 'eu'], modos: FCL },
  { id: 'msc', nombre: 'MSC', tipo: 'naviera', origenes: ['cn-sur', 'cn-este', 'mx', 'eu'], modos: FCL, nota: 'Europa – Moín directo' },
  { id: 'cma', nombre: 'CMA CGM', tipo: 'naviera', origenes: ['cn-sur', 'cn-este', 'mx', 'eu'], modos: FCL },
  { id: 'hapag', nombre: 'Hapag-Lloyd', tipo: 'naviera', origenes: ['cn-sur', 'cn-este', 'mx', 'eu'], modos: FCL },

  // Consolidadores para carga suelta (LCL): reemplazar por socios reales
  { id: 'consol-1', nombre: 'Consolidador socio Asia', tipo: 'consolidador', origenes: ['cn-sur', 'cn-este'], modos: ['LCL'] },
  { id: 'consol-2', nombre: 'Consolidador socio Miami', tipo: 'consolidador', origenes: ['us-mia'], modos: ['LCL'] },
  { id: 'consol-3', nombre: 'Consolidador socio Europa / México', tipo: 'consolidador', origenes: ['eu', 'mx'], modos: ['LCL'] },
  { id: 'consol-4', nombre: 'Consolidador socio Centroamérica', tipo: 'consolidador', origenes: ['ca'], modos: ['LCL', 'FCL20', 'FCL40'] },

  // Carga aérea: reemplazar por socios reales
  { id: 'aereo-1', nombre: 'Agente de carga aérea socio', tipo: 'aereo', origenes: [], modos: ['AEREO'] },
  { id: 'aereo-2', nombre: 'Courier de carga comercial socio', tipo: 'aereo', origenes: [], modos: ['AEREO'] },

  // Transporte terrestre en Costa Rica: reemplazar por socios reales
  { id: 'terr-1', nombre: 'Transportista socio 1', tipo: 'terrestre', origenes: [], modos: [], nota: 'Contenedores y carga suelta, GAM' },
  { id: 'terr-2', nombre: 'Transportista socio 2', tipo: 'terrestre', origenes: [], modos: [], nota: 'Carga suelta, todo el país' },
  { id: 'terr-3', nombre: 'Transportista socio 3', tipo: 'terrestre', origenes: [], modos: [], nota: 'Camiones con plataforma o refrigerados' },
]

export function proveedoresInternacionales(origenId: string, modo: Modo): Proveedor[] {
  return PROVEEDORES.filter(
    (p) => p.tipo !== 'terrestre' && p.modos.includes(modo) && (p.origenes.length === 0 || p.origenes.includes(origenId)),
  )
}

export const TRANSPORTISTAS = PROVEEDORES.filter((p) => p.tipo === 'terrestre')

export const TIPO_ETIQUETA: Record<Proveedor['tipo'], string> = {
  naviera: 'Naviera',
  consolidador: 'Consolidador',
  aereo: 'Carga aérea',
  terrestre: 'Transporte terrestre',
}
