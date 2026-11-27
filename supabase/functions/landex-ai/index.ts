// LANDEX AI · clasificación arancelaria preliminar asistida por IA.
// La clave de Anthropic vive solo como secreto del servidor (ANTHROPIC_API_KEY).
// La IA nunca da tasas: el sitio muestra el DAI desde el arancel oficial cargado en el navegador.
import { createClient } from 'npm:@supabase/supabase-js@2'

// Mixto: Haiku identifica partidas (barato); Sonnet elige el inciso (más preciso).
const MODELOS: Record<string, string> = { partidas: 'claude-haiku-5-5', incisos: 'claude-sonnet-5-5' }
// Precio USD por millón de tokens [entrada, salida] (platform.claude.com, nov-2026).
const PRECIOS: Record<string, [number, number]> = { 'claude-haiku-5-5': [0.10, 0.50], 'claude-sonnet-5-5': [2, 10] }
// Clasificaciones (fase "partidas") por mes calendario, según nivel.
const LIMITES = { gratis: 3, cliente: 100, equipo: 1000 }
// Tope global de gasto mensual: al llegar, la IA se apaga para cuentas gratis.
const TOPE_MENSUAL_USD = 4
type Nivel = keyof typeof LIMITES
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

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return json({ error: 'LANDEX AI todavía no está activado.' }, 503)

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

  // Nivel del usuario
  const { data: perfil } = await admin.from('perfiles').select('rol').eq('id', u.user.id).maybeSingle()
  let nivel: Nivel = 'gratis'
  if (perfil?.rol === 'agente' || perfil?.rol === 'operador') nivel = 'equipo'
  else {
    const { count: ops } = await admin.from('cotizaciones').select('id', { count: 'exact', head: true }).eq('cliente_id', u.user.id).in('estado', ['aceptada', 'en_proceso', 'cerrada'])
    const { data: acceso } = await admin.from('ai_accesos').select('nivel').eq('usuario', u.user.id).maybeSingle()
    // "prueba": cuentas de prueba del equipo, mismo cupo que el equipo.
    if (acceso?.nivel === 'prueba') nivel = 'equipo'
    else if ((ops ?? 0) > 0 || acceso) nivel = 'cliente'
  }
  if (fase === 'incisos' && nivel === 'gratis') return json({ error: 'El inciso exacto está disponible para clientes LANDEX.', nivel }, 403)

  const ahora = new Date()
  const mes = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1)).toISOString()
  const { count: usadas } = await admin.from('ai_consultas').select('id', { count: 'exact', head: true }).eq('usuario', u.user.id).eq('fase', 'partidas').gte('creada', mes)
  const limite = LIMITES[nivel]
  if (fase === 'partidas' && (usadas ?? 0) >= limite) {
    return json({ error: nivel === 'gratis'
      ? `Usaste tus ${limite} clasificaciones gratis de este mes. Cotiza con LANDEX para usar LANDEX AI sin límite práctico.`
      : `Alcanzaste el límite de ${limite} clasificaciones de este mes. Escríbenos a cotizaciones@landex.cr.`, nivel, restantes: 0 }, 429)
  }
  if (nivel === 'gratis') {
    const { data: gasto } = await admin.from('ai_consultas').select('costo_usd').gte('creada', mes)
    const total = (gasto ?? []).reduce((a: number, g: { costo_usd: number }) => a + Number(g.costo_usd), 0)
    if (total >= TOPE_MENSUAL_USD) return json({ error: 'El cupo gratuito de LANDEX AI de este mes se agotó. Usa el buscador del arancel o cotiza con LANDEX.', nivel }, 503)
  }
  const restantes = fase === 'partidas' ? Math.max(0, limite - (usadas ?? 0) - 1) : Math.max(0, limite - (usadas ?? 0))

  // Caché (sin foto): misma descripción y mismas opciones → misma respuesta, sin costo.
  const norm = descripcion.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim()
  const huella = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fase + '|' + norm + '|' + opciones.map((o) => o.codigo).join(',')))
  const clave = Array.from(new Uint8Array(huella)).map((b) => b.toString(16).padStart(2, '0')).join('')
  const conFoto = !!cuerpo.imagen && fase === 'partidas'
  if (!conFoto) {
    const { data: hit } = await admin.from('ai_cache').select('resultado').eq('clave', clave).maybeSingle()
    if (hit) {
      await admin.from('ai_consultas').insert({ usuario: u.user.id, fase, cache: true })
      return json({ fase, resultado: hit.resultado, nivel, restantes, cache: true })
    }
  }

  const contenido: unknown[] = []
  const img = cuerpo.imagen
  if (img && fase === 'partidas' && /^image\/(jpeg|png|webp|gif)$/.test(img.tipo) && img.datos.length < 5_000_000) {
    contenido.push({ type: 'image', source: { type: 'base64', media_type: img.tipo, data: img.datos } })
  }
  contenido.push({ type: 'text', text: instrucciones(fase, descripcion, opciones) })

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODELOS[fase], max_tokens: 2000, system: SISTEMA, messages: [{ role: 'user', content: contenido }],
      tools: [{ name: 'responder', description: 'Entrega la clasificación', input_schema: ESQUEMAS[fase] }], tool_choice: { type: 'auto' } }),
  })
  if (!r.ok) {
    console.error('anthropic', r.status, await r.text())
    return json({ error: 'LANDEX AI no respondió. Intenta de nuevo en un momento.' }, 502)
  }
  const out = await r.json()
  const uso = (out.content ?? []).find((c: { type: string }) => c.type === 'tool_use')
  const te = out.usage?.input_tokens ?? 0, ts = out.usage?.output_tokens ?? 0
  const [pe, ps] = PRECIOS[MODELOS[fase]] ?? [0, 0]
  await admin.from('ai_consultas').insert({ usuario: u.user.id, fase, tokens_entrada: te, tokens_salida: ts, costo_usd: (te * pe + ts * ps) / 1e6 })
  const responder = async (resultado: unknown) => {
    if (!conFoto) await admin.from('ai_cache').upsert({ clave, resultado })
    return json({ fase, resultado, nivel, restantes })
  }

  if (uso?.input) return responder(uso.input)
  // Respaldo: JSON dentro del texto
  const texto: string = (out.content ?? []).filter((c: { type: string }) => c.type === 'text').map((c: { text: string }) => c.text).join('')
  const m = texto.match(/\{[\s\S]*\}/)
  try { return await responder(JSON.parse(m ? m[0] : texto)) } catch {
    console.error('sin tool_use', out.stop_reason, texto.slice(0, 300))
    return json({ error: 'La respuesta no se pudo leer. Intenta de nuevo.' }, 502)
  }
})
