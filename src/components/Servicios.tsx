import { tr } from '../lib/idioma'
import type { Seccion } from './AgenciaAduanal'

export function Servicios({ onAgencia, onCotizar }: { onAgencia: (s: Seccion) => void; onCotizar: () => void }) {
  return <section className="panel"><h2>{tr("Servicios de importación")}</h2>
    <p>{tr("Elegí el apoyo que necesitás desde la fábrica hasta la descarga en tu bodega.")}</p>
        <ul className="servicios-inicio">
          <li className="principal"><b>{tr("Agenciamiento aduanero")}</b><span>{tr("Clasificación arancelaria, declaración y trámite ante Aduanas hasta el levante de tu mercancía.")}</span></li>
          <li><b>{tr("Transporte internacional")}</b><span>{tr("Marítimo, aéreo y terrestre, desde la fábrica de tu proveedor.")}</span></li>
          <li><b>{tr("Transporte nacional y descarga")}</b><span>{tr("Hasta tu bodega, con personal y equipo de descarga.")}</span></li>
          <li><b>{tr("Seguro e inspección")}</b><span>{tr("Póliza de carga e inspección de calidad en origen.")}</span></li>
          <li><b>{tr("Permisos y documentos")}</b><span>{tr("Notas técnicas, permisos y revisión de tu expediente.")}</span></li>
          <li><b>{tr("Almacenamiento y custodia")}</b><span>{tr("Coordinados con nuestros socios cuando los necesites.")}</span></li>
        </ul>
    <div className="acciones"><button className="btn primario" onClick={onCotizar}>{tr("Cotizar mi importación")}</button>
    <button className="btn" onClick={() => onAgencia('desalmacenaje')}>{tr("Desalmacenar una carga")}</button>
    <button className="btn" onClick={() => onAgencia('empresarial')}>{tr("Coordinar importaciones recurrentes")}</button></div>
  </section>
}
