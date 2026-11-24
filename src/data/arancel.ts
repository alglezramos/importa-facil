/**
 * ARANCEL DE EJEMPLO
 * ---------------------------------------------------------------
 * ATENCIÓN: estas partidas y tasas son ILUSTRATIVAS para probar la
 * plataforma. NO son datos oficiales. Antes de usarlo con clientes, el
 * agente aduanero debe cargar y verificar las tasas vigentes del Arancel
 * de Aduanas de Costa Rica (TICA / ATENA) y los tratados aplicables.
 *
 * - dai: Derechos Arancelarios a la Importación (tasa general).
 * - sc:  Impuesto Selectivo de Consumo.
 * - iva: Impuesto al Valor Agregado aplicado a la importación.
 * - tlc: tasa DAI preferencial por país de origen con certificado de origen.
 *        Si un país no aparece, se usa la tasa general.
 */

export interface Partida {
  codigo: string
  descripcion: string
  palabrasClave: string[]
  dai: number
  sc: number
  iva: number
  tlc: Partial<Record<string, number>>
  permisos: string[]
  verificado: boolean
}

export const ARANCEL: Partida[] = [
  {
    codigo: '8471.30.00',
    descripcion: 'Computadoras portátiles (laptops)',
    palabrasClave: ['laptop', 'portatil', 'computadora', 'notebook'],
    dai: 0, sc: 0, iva: 0.13, tlc: {}, permisos: [], verificado: false,
  },
  {
    codigo: '8517.13.00',
    descripcion: 'Teléfonos inteligentes',
    palabrasClave: ['celular', 'telefono', 'smartphone', 'movil'],
    dai: 0, sc: 0, iva: 0.13, tlc: {},
    permisos: ['Homologación de equipos de telecomunicaciones (SUTEL)'], verificado: false,
  },
  {
    codigo: '6109.10.00',
    descripcion: 'Camisetas de punto de algodón',
    palabrasClave: ['camiseta', 'camisa', 'tshirt', 'ropa', 'algodon', 'textil'],
    dai: 0.14, sc: 0, iva: 0.13, tlc: { CN: 0, US: 0, MX: 0, EU: 0, CA: 0 },
    permisos: ['Etiquetado según reglamento técnico de textiles'], verificado: false,
  },
  {
    codigo: '6404.19.00',
    descripcion: 'Calzado con suela de caucho o plástico y parte superior textil',
    palabrasClave: ['zapato', 'calzado', 'tenis', 'sandalia'],
    dai: 0.14, sc: 0, iva: 0.13, tlc: { CN: 0, US: 0, MX: 0, EU: 0, CA: 0 },
    permisos: [], verificado: false,
  },
  {
    codigo: '9403.60.00',
    descripcion: 'Muebles de madera',
    palabrasClave: ['mueble', 'mesa', 'silla', 'escritorio', 'madera', 'estante'],
    dai: 0.14, sc: 0, iva: 0.13, tlc: { CN: 0, US: 0, MX: 0, EU: 0, CA: 0 },
    permisos: ['Certificado fitosanitario si incluye madera sin tratar (SFE)'], verificado: false,
  },
  {
    codigo: '3923.30.00',
    descripcion: 'Botellas y envases de plástico',
    palabrasClave: ['botella', 'envase', 'plastico', 'empaque', 'frasco'],
    dai: 0.09, sc: 0, iva: 0.13, tlc: { CN: 0, US: 0, MX: 0, EU: 0, CA: 0 },
    permisos: [], verificado: false,
  },
  {
    codigo: '3304.99.00',
    descripcion: 'Preparaciones de belleza y cuidado de la piel',
    palabrasClave: ['cosmetico', 'crema', 'maquillaje', 'belleza', 'skincare'],
    dai: 0.14, sc: 0.1, iva: 0.13, tlc: { US: 0, MX: 0, EU: 0, CA: 0 },
    permisos: ['Registro o notificación sanitaria del Ministerio de Salud'], verificado: false,
  },
  {
    codigo: '9503.00.00',
    descripcion: 'Juguetes',
    palabrasClave: ['juguete', 'muñeca', 'peluche', 'didactico'],
    dai: 0.14, sc: 0, iva: 0.13, tlc: { CN: 0, US: 0, MX: 0, EU: 0, CA: 0 },
    permisos: ['Revisión de requisitos de seguridad y etiquetado de juguetes'], verificado: false,
  },
  {
    codigo: '8414.51.00',
    descripcion: 'Ventiladores de mesa, pie, pared o techo',
    palabrasClave: ['ventilador', 'abanico'],
    dai: 0.14, sc: 0, iva: 0.13, tlc: { CN: 0, US: 0, MX: 0, EU: 0, CA: 0 },
    permisos: ['Reglamento de eficiencia energética (si aplica)'], verificado: false,
  },
  {
    codigo: '9405.42.00',
    descripcion: 'Luminarias LED',
    palabrasClave: ['lampara', 'led', 'luminaria', 'luz', 'bombillo'],
    dai: 0.14, sc: 0, iva: 0.13, tlc: { CN: 0, US: 0, MX: 0, EU: 0, CA: 0 },
    permisos: [], verificado: false,
  },
  {
    codigo: '8708.99.00',
    descripcion: 'Partes y accesorios para vehículos',
    palabrasClave: ['repuesto', 'autoparte', 'vehiculo', 'carro', 'accesorio'],
    dai: 0.05, sc: 0, iva: 0.13, tlc: { CN: 0, US: 0, MX: 0, EU: 0, CA: 0 },
    permisos: [], verificado: false,
  },
  {
    codigo: '7318.15.00',
    descripcion: 'Tornillos y pernos de hierro o acero',
    palabrasClave: ['tornillo', 'perno', 'ferreteria', 'acero'],
    dai: 0.01, sc: 0, iva: 0.13, tlc: { CN: 0, US: 0, MX: 0, EU: 0, CA: 0 },
    permisos: [], verificado: false,
  },
]

const normalizar = (t: string) =>
  t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export function buscarPartidas(consulta: string, arancel: Partida[] = ARANCEL): Partida[] {
  const q = normalizar(consulta.trim())
  if (!q) return arancel
  const terminos = q.split(/\s+/)
  return arancel.filter((p) => {
    const texto = normalizar([p.codigo, p.descripcion, ...p.palabrasClave].join(' '))
    return terminos.every((t) => texto.includes(t))
  })
}
