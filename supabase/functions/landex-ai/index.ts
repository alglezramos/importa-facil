// LANDEX AI · clasificación arancelaria preliminar asistida por IA.
// La clave de Anthropic vive solo como secreto del servidor (ANTHROPIC_API_KEY).
// La IA nunca da tasas: el sitio muestra el DAI desde el arancel oficial cargado en el navegador.
import { createClient } from 'npm:@supabase/supabase-js@2'

// Mixto: Haiku identifica partidas (barato); Sonnet elige el inciso (más preciso).
const MODELOS: Record<string, string> = { partidas: 'claude-haiku-5-5', incisos: 'claude-sonnet-5-5' }
const LIMITE_DIARIO = 30
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const SISTEMA = `Eres LANDEX AI, asistente de clasificación arancelaria preliminar para importaciones a Costa Rica (Sistema Arancelario Centroamericano, SAC, basado en el Sistema Armonizado).
Reglas:
- Aplica las Reglas Generales Interpretativas (RGI) del Sistema Armonizado en orden y menciona cuál usas.
- Nunca inventes códigos: en la fase "incisos" elige SOLO códigos de la lista oficial que recibes, copiándolos exactamente.
- Nunca des tasas de impuestos, montos ni requisitos legales: el sistema los toma del arancel oficial.
- Si falta información decisiva (material, función, composición, presentación), dilo y formula preguntas concretas.
- Es una clasificación preliminar; el agente aduanero la valida con la ficha técnica.
- Responde en español, breve y claro para una pyme. Entrega tu respuesta llamando a la herramienta "responder".`

const ESQUEMAS: Record<string, unknown> = {
  partidas: {
    type: 'object',
    properties: {
      resumen: { type: 'string', description: 'Qué entendiste del producto, 1 frase' },
      partidas: { type: 'array', maxItems: 4, items: { type: 'object', properties: { codigo: { type: 'string', description: 'Partida SA de 4 dígitos, ej. 9403' }, razon: { type: 'string' } }, required: ['codigo', 'razon'] } },
      preguntas: { type: 'array', items: { type: 'string' } },
    },
    required: ['resumen', 'partidas'],
  },
  incisos: {
    type: 'object',
    properties: {
      candidatos: { type: 'array', maxItems: 3, items: { type: 'object', properties: { codigo: { type: 'string', description: 'Código exacto de la lista oficial' }, confianza: { type: 'string', enum: ['alta', 'media', 'baja'] }, razon: { type: 'string', description: 'Máximo 2 frases' } }, required: ['codigo', 'confianza', 'razon'] } },
      preguntas: { type: 'array', items: { type: 'string' } },
      advertencia: { type: 'string' },
    },
    required: ['candidatos'],
  },
}

function instrucciones(fase: string, descripcion: string, opciones?: { codigo: string; texto: string }[]) {
  if (fase === 'partidas') {
    return `Producto descrito por el cliente:\n"""${descripcion}"""\n\nPropón hasta 4 partidas del Sistema Armonizado (4 dígitos) donde podría clasificarse, de la más probable a la menos, con la RGI aplicada. Agrega preguntas solo si falta un dato decisivo.`
  }
  const lista = (opciones ?? []).map((o) => `${o.codigo} | ${o.texto}`).join('\n')
  return `Producto descrito por el cliente:\n"""${descripcion}"""\n\nIncisos oficiales del arancel de Costa Rica (código | descripción):\n${lista}\n\nElige hasta 3 incisos de ESTA lista, del más probable al menos. Aplica la RGI 6 para las subpartidas: prefiere siempre la subpartida más específica que describa el producto (por ejemplo, giratorio de altura ajustable, con relleno, tipo de material) antes que una de "los demás". En cada razón explica por qué encaja y qué lo distingue de los otros.`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)

  const clave = Deno.env.get('ANTHROPIC_API_KEY')
  if (!clave) return json({ error: 'LANDEX AI todavía no está activado.' }, 503)

  const url = Deno.env.get('SUPABASE_URL')!
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: u } = await admin.auth.getUser(token)
  if (!u?.user) return json({ error: 'Ingresa a tu cuenta para usar LANDEX AI.' }, 401)

  let cuerpo: { fase?: string; descripcion?: string; opciones?: { codigo: string; texto: string }[]; imagen?: { tipo: string; datos: string } }
  try { cuerpo = await req.json() } catch { return json({ error: 'Solicitud inválida.' }, 400) }
  const fase = cuerpo.fase === 'incisos' ? 'incisos' : 'partidas'
  const descripcion = String(cuerpo.descripcion ?? '').trim().slice(0, 2000)
  if (descripcion.length < 4) return json({ error: 'Describe el producto con un poco más de detalle.' }, 400)
  const opciones = (cuerpo.opciones ?? []).slice(0, 150).map((o) => ({ codigo: String(o.codigo).slice(0, 20), texto: String(o.texto).slice(0, 300) }))
  if (fase === 'incisos' && opciones.length === 0) return json({ error: 'No hay incisos para comparar.' }, 400)

  const desde = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  const { count } = await admin.from('ai_consultas').select('id', { count: 'exact', head: true }).eq('usuario', u.user.id).gte('creada', desde)
  if ((count ?? 0) >= LIMITE_DIARIO) return json({ error: `Alcanzaste el límite de ${LIMITE_DIARIO} consultas en 24 horas. Escríbenos a cotizaciones@landex.cr.` }, 429)

  const contenido: unknown[] = []
  const img = cuerpo.imagen
  if (img && fase === 'partidas' && /^image\/(jpeg|png|webp|gif)$/.test(img.tipo) && img.datos.length < 5_000_000) {
    contenido.push({ type: 'image', source: { type: 'base64', media_type: img.tipo, data: img.datos } })
  }
  contenido.push({ type: 'text', text: instrucciones(fase, descripcion, opciones) })

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': clave, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODELOS[fase], max_tokens: 2000, system: SISTEMA, messages: [{ role: 'user', content: contenido }],
      tools: [{ name: 'responder', description: 'Entrega la clasificación', input_schema: ESQUEMAS[fase] }], tool_choice: { type: 'auto' } }),
  })
  if (!r.ok) {
    console.error('anthropic', r.status, await r.text())
    return json({ error: 'LANDEX AI no respondió. Intenta de nuevo en un momento.' }, 502)
  }
  const out = await r.json()
  const uso = (out.content ?? []).find((c: { type: string }) => c.type === 'tool_use')
  await admin.from('ai_consultas').insert({ usuario: u.user.id, fase, tokens_entrada: out.usage?.input_tokens ?? 0, tokens_salida: out.usage?.output_tokens ?? 0 })

  if (uso?.input) return json({ fase, resultado: uso.input })
  // Respaldo: JSON dentro del texto
  const texto: string = (out.content ?? []).filter((c: { type: string }) => c.type === 'text').map((c: { text: string }) => c.text).join('')
  const m = texto.match(/\{[\s\S]*\}/)
  try { return json({ fase, resultado: JSON.parse(m ? m[0] : texto) }) } catch {
    console.error('sin tool_use', out.stop_reason, texto.slice(0, 300))
    return json({ error: 'La respuesta no se pudo leer. Intenta de nuevo.' }, 502)
  }
})
