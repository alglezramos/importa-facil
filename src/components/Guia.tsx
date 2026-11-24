const PASOS = [
  {
    t: 'Antes de comprar: clasifica y cotiza el costo total',
    d: 'Con la ficha técnica del producto confirmamos la partida arancelaria, los impuestos y los permisos. Así sabes cuánto te cuesta puesto en tu bodega antes de pagar al proveedor.',
  },
  {
    t: 'Negocia con el proveedor (Alibaba u otro)',
    d: 'Pide precio FOB, peso y volumen por caja, lista de empaque y certificado de origen. Con FOB controlas el flete y evitas cargos sorpresa en destino.',
  },
  {
    t: 'Paga de forma segura',
    d: 'Usa los mecanismos de protección de la plataforma o cartas de crédito. Nunca pagues el 100% antes de ver fotos de producción o una inspección.',
  },
  {
    t: 'Reservamos el flete y el seguro',
    d: 'Coordinamos con el forwarder la recolección en origen, el espacio en barco o avión y la póliza de seguro de la carga.',
  },
  {
    t: 'Seguimiento del embarque',
    d: 'Te avisamos la salida, el transbordo y la llegada estimada. Mientras tanto preparamos la declaración aduanera con tus documentos.',
  },
  {
    t: 'Despacho aduanero',
    d: 'El agente aduanero revisa y transmite la DUA, se pagan los impuestos y se obtiene el levante de la mercadería.',
  },
  {
    t: 'Entrega en tu bodega',
    d: 'Retiramos la carga del almacén fiscal y la llevamos a tu bodega. Te enviamos el costo final real para tu costeo de inventario.',
  },
]

export function Guia() {
  return (
    <section className="panel">
      <h2>De Alibaba a tu bodega, paso a paso</h2>
      <ol className="guia">
        {PASOS.map((p) => (
          <li key={p.t}>
            <h4>{p.t}</h4>
            <p>{p.d}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
