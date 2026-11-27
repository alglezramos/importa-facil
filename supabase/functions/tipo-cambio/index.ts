// Tipo de cambio de referencia del BCCR (dólar), vía la API abierta del Ministerio de Hacienda.
// Se guarda una vez al día en la tabla tipo_cambio; si la API falla, se devuelve el último guardado.
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const hoy = new Date(Date.now() - 6 * 3600 * 1000).toISOString().slice(0, 10) // fecha de Costa Rica (UTC-6)

  const { data: guardado } = await admin.from('tipo_cambio').select('*').order('fecha', { ascending: false }).limit(1).maybeSingle()
  if (guardado && guardado.fecha === hoy) return json(guardado)

  try {
    const r = await fetch('https://api.hacienda.go.cr/indicadores/tc/dolar', { headers: { accept: 'application/json' } })
    if (!r.ok) throw new Error(`Hacienda ${r.status}`)
    const d = await r.json()
    const venta = Number(d?.venta?.valor), compra = Number(d?.compra?.valor)
    if (!(venta > 0) || !(compra > 0)) throw new Error('Respuesta sin valores')
    const fila = { fecha: hoy, venta, compra, fuente: 'BCCR (tipo de cambio de referencia) vía api.hacienda.go.cr', fecha_bccr: d?.venta?.fecha ?? null }
    await admin.from('tipo_cambio').upsert(fila)
    return json(fila)
  } catch (e) {
    console.error('tipo-cambio', String(e))
    if (guardado) return json({ ...guardado, desactualizado: true })
    return json({ error: 'No se pudo obtener el tipo de cambio.' }, 502)
  }
})
