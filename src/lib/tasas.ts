import { nube } from './nube'
import { fijarTasasValidadas, type TasaValidada } from './arancel'

/** Carga las tasas de Selectivo validadas por el equipo (lectura pública). */
export async function cargarTasasValidadas(): Promise<void> {
  try {
    const { data } = await nube().from('tasas_validadas').select('inciso, sc, otros, validado_en')
    const m = new Map<string, TasaValidada>()
    for (const f of (data ?? []) as { inciso: string; sc: number; otros: number; validado_en: string }[]) {
      m.set(f.inciso, { sc: Number(f.sc), otros: Number(f.otros), fecha: f.validado_en })
    }
    fijarTasasValidadas(m)
  } catch { /* sin conexión: las tasas quedan pendientes */ }
}

/** El equipo guarda el Selectivo confirmado en TICA para que se reutilice en próximas cotizaciones. */
export async function guardarTasaValidada(inciso: string, sc: number, otros: number): Promise<string | null> {
  const { data: u } = await nube().auth.getUser()
  const { error } = await nube().from('tasas_validadas').upsert({ inciso, sc, otros, fuente: 'TICA', validado_por: u.user?.id ?? null, validado_en: new Date().toISOString() })
  if (!error) await cargarTasasValidadas()
  return error ? error.message : null
}
