// app/api/webhooks/whatsapp/route.ts
// Webhook de la API de WhatsApp Business. Meta llama acá cuando entra un mensaje.
// Guarda cada mensaje y lo vincula al cliente si el número ya existe en el CRM;
// si no existe queda sin vincular, pendiente de que alguien decida crear la ficha.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { claveTelefono, firmaValida, parsearMensajes } from '@/lib/whatsapp/webhook'

// ── GET: handshake de verificación cuando se configura el webhook en Meta ────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const esperado = process.env.WHATSAPP_VERIFY_TOKEN
  if (mode === 'subscribe' && esperado && token === esperado && challenge) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Verificación inválida' }, { status: 403 })
}

// ── POST: mensajes entrantes ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const appSecret = process.env.WHATSAPP_APP_SECRET
  if (!appSecret) {
    console.error('[webhook/whatsapp] Falta WHATSAPP_APP_SECRET')
    return NextResponse.json({ error: 'Webhook no configurado' }, { status: 500 })
  }

  const rawBody = await req.text()
  if (!firmaValida(rawBody, req.headers.get('x-hub-signature-256'), appSecret)) {
    return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
  }

  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const mensajes = parsearMensajes(body)
  if (mensajes.length === 0) {
    return NextResponse.json({ ok: true, recibidos: 0 })
  }

  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { data: clientes, error: errClientes } = await supabase
      .from('clientes')
      .select('id, telefono')
      .is('deleted_at', null)
      .not('telefono', 'is', null)
    if (errClientes) throw errClientes

    const clientePorClave = new Map<string, string>()
    for (const c of clientes ?? []) {
      clientePorClave.set(claveTelefono(c.telefono as string), c.id as string)
    }

    const filas = mensajes.map((m) => {
      const clave = claveTelefono(m.waId)
      return {
        wa_message_id: m.waMessageId,
        telefono: m.waId,
        telefono_clave: clave,
        nombre_perfil: m.nombrePerfil,
        direccion: m.direccion,
        tipo: m.tipo,
        texto: m.texto,
        timestamp_wa: m.timestamp.toISOString(),
        cliente_id: clientePorClave.get(clave) ?? null,
        leido: m.direccion === 'saliente',
        payload: m.payload,
      }
    })

    const { error } = await supabase
      .from('whatsapp_mensajes')
      .upsert(filas, { onConflict: 'wa_message_id', ignoreDuplicates: true })
    if (error) throw error

    // Actualiza la fecha de último contacto de los clientes que ya existen
    const idsVinculados = [...new Set(filas.map((f) => f.cliente_id).filter((id): id is string => !!id))]
    if (idsVinculados.length > 0) {
      await supabase.from('clientes').update({ ultima_interaccion: new Date().toISOString() }).in('id', idsVinculados)
    }

    return NextResponse.json({ ok: true, recibidos: filas.length })
  } catch (err) {
    // 500 para que Meta reintente; el upsert por wa_message_id evita duplicados
    console.error('[webhook/whatsapp]', err)
    return NextResponse.json({ error: 'Error procesando mensajes' }, { status: 500 })
  }
}
