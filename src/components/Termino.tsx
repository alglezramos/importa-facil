/** Ayuda breve para términos técnicos: un "?" que muestra la explicación al pasar o tocar. */
const GLOSARIO: Record<string, string> = {
  incoterm: 'Regla internacional que dice qué costos paga tu proveedor y desde dónde pagas tú. Ej.: EXW = lo recoges en su bodega; FOB = lo deja en el barco; CIF = paga flete y seguro hasta Costa Rica.',
  modalidad: 'Cómo viaja la carga. LCL = compartes contenedor y pagas por volumen; FCL = contenedor completo (20 o 40 pies); aéreo = más rápido y caro; terrestre = camión desde Centroamérica o México.',
  embarque: 'Puerto, aeropuerto o ciudad desde donde sale tu carga. El país donde se fabricó cada producto se indica aparte, en el producto (define el origen para tratados y la Ley 6946).',
  landed: 'Landed Cost: lo que realmente te cuesta cada producto puesto en tu bodega, sumando mercancía, logística, impuestos y honorarios.',
  dai: 'DAI: Derecho Arancelario a la Importación. Porcentaje sobre el valor aduanero que depende del inciso arancelario.',
  aduanero: 'Valor aduanero (CIF): mercancía + flete + seguro hasta Costa Rica. Sobre él se calculan los impuestos.',
  cambio: 'Tipo de cambio de referencia del Banco Central (venta). Se actualiza solo cada día.',
}

export function Termino({ id }: { id: keyof typeof GLOSARIO | string }) {
  const texto = GLOSARIO[id]
  if (!texto) return null
  return (
    <span className="termino" tabIndex={0} role="note" aria-label={texto}>
      ?<span className="termino-pop" aria-hidden>{texto}</span>
    </span>
  )
}
