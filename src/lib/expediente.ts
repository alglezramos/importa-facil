/**
 * EXPEDIENTE DE DOCUMENTOS
 * ---------------------------------------------------------------
 * Documentos de una importación definitiva a Costa Rica, según el caso:
 * modalidad, Incoterm, seguro, preferencia por TLC y permisos.
 * La lista es una guía operativa: el agente aduanero confirma qué aplica.
 */
import type { Embarque, Incoterm, Producto } from './landed'

export type Responsable = 'cliente' | 'proveedor' | 'landex'
export const RESPONSABLES: Record<Responsable, string> = {
  cliente: 'Lo aportas tú',
  proveedor: 'Te lo da tu proveedor',
  landex: 'Lo gestiona LANDEX',
}

export type EstadoDoc = 'pendiente' | 'recibido' | 'revisado' | 'observado'
export const ESTADOS_DOC: Record<EstadoDoc, string> = {
  pendiente: 'Pendiente',
  recibido: 'Recibido',
  revisado: 'Revisado por el agente',
  observado: 'Con observaciones',
}

export interface DocRequerido {
  id: string
  nombre: string
  detalle: string
  responsable: Responsable
  obligatorio: boolean
}

/** Incoterms en que el comprador contrata el transporte principal. */
const COMPRADOR_CONTRATA: Incoterm[] = ['EXW', 'FCA', 'FAS', 'FOB']
const VENDEDOR_ASEGURA: Incoterm[] = ['CIF', 'CIP', 'DAP', 'DPU', 'DDP']

export function documentosRequeridos(e: Pick<Embarque, 'modo' | 'incoterm' | 'seguro'>, productos: Producto[]): DocRequerido[] {
  const lista: DocRequerido[] = []
  const transporte = e.modo === 'AEREO'
    ? { nombre: 'Guía aérea (AWB)', detalle: 'Documento de transporte aéreo emitido por la aerolínea o el agente de carga.' }
    : e.modo === 'TERRESTRE'
      ? { nombre: 'Carta de porte', detalle: 'Documento de transporte terrestre emitido por el transportista.' }
      : { nombre: 'Conocimiento de embarque (BL)', detalle: 'Documento de transporte marítimo emitido por la naviera o el consolidador.' }

  lista.push(
    { id: 'factura', nombre: 'Factura comercial', detalle: 'Emitida por el proveedor a nombre del importador, con descripción detallada, cantidades, precio unitario, total e Incoterm. Es la base del valor aduanero.', responsable: 'proveedor', obligatorio: true },
    { id: 'packing', nombre: 'Lista de empaque (packing list)', detalle: 'Cantidad de bultos, contenido, medidas y peso bruto y neto de cada bulto.', responsable: 'proveedor', obligatorio: true },
    { id: 'transporte', ...transporte, responsable: COMPRADOR_CONTRATA.includes(e.incoterm) ? 'landex' : 'proveedor', obligatorio: true },
    { id: 'ficha', nombre: 'Ficha técnica o catálogo del producto', detalle: 'Material, composición, uso y fotos. El agente aduanero la necesita para validar la clasificación.', responsable: 'cliente', obligatorio: true },
    { id: 'importador', nombre: 'Identificación del importador', detalle: 'Cédula física o jurídica e inscripción como contribuyente en Hacienda.', responsable: 'cliente', obligatorio: true },
  )
  if (productos.some((p) => p.certificadoOrigen)) {
    lista.push({ id: 'origen', nombre: 'Certificado o declaración de origen', detalle: 'Necesario para aplicar la preferencia arancelaria de un tratado de libre comercio. Debe cumplir el formato del tratado.', responsable: 'proveedor', obligatorio: true })
  }
  if (e.seguro) {
    lista.push({ id: 'seguro', nombre: 'Póliza o certificado de seguro', detalle: 'Respalda el monto del seguro dentro del valor aduanero.', responsable: VENDEDOR_ASEGURA.includes(e.incoterm) ? 'proveedor' : 'landex', obligatorio: true })
  }
  if (productos.some((p) => p.requierePermiso)) {
    lista.push({ id: 'permisos', nombre: 'Permisos y notas técnicas', detalle: 'Registros o permisos de Salud, MAG, SFE u otras instituciones, según el producto. Se tramitan en la VUCE de PROCOMER.', responsable: 'cliente', obligatorio: true })
  }
  lista.push(
    { id: 'pago', nombre: 'Comprobante de pago al proveedor', detalle: 'Transferencia o carta de crédito. Respalda el valor declarado si Aduanas tiene dudas.', responsable: 'cliente', obligatorio: false },
    { id: 'dua', nombre: 'Declaración aduanera (DUA) y declaración de valor', detalle: 'Las prepara y transmite el agente aduanero con los documentos anteriores.', responsable: 'landex', obligatorio: true },
  )
  return lista
}
