import type { Seccion } from './AgenciaAduanal'

export function Servicios({ onAgencia, onCotizar }: { onAgencia: (s: Seccion) => void; onCotizar: () => void }) {
  return <section className="panel"><h2>Servicios de importación</h2>
    <p>Elegí el apoyo que necesitás desde la fábrica hasta la descarga en tu bodega.</p>
        <ul className="servicios-inicio">
          <li className="principal"><b>Agenciamiento aduanero</b><span>Clasificación arancelaria, declaración y trámite ante Aduanas hasta el levante de tu mercancía.</span></li>
          <li><b>Transporte internacional</b><span>Marítimo, aéreo y terrestre, desde la fábrica de tu proveedor.</span></li>
          <li><b>Transporte nacional y descarga</b><span>Hasta tu bodega, con personal y equipo de descarga.</span></li>
          <li><b>Seguro e inspección</b><span>Póliza de carga e inspección de calidad en origen.</span></li>
          <li><b>Permisos y documentos</b><span>Notas técnicas, permisos y revisión de tu expediente.</span></li>
          <li><b>Almacenamiento y custodia</b><span>Coordinados con nuestros socios cuando los necesites.</span></li>
        </ul>
    <div className="acciones"><button className="btn primario" onClick={onCotizar}>Cotizar mi importación</button>
    <button className="btn" onClick={() => onAgencia('desalmacenaje')}>Desalmacenar una carga</button>
    <button className="btn" onClick={() => onAgencia('empresarial')}>Coordinar importaciones recurrentes</button></div>
  </section>
}
