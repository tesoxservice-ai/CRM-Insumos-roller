// app/api/webhooks/cotizacion/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface CotizacionWebhookBody {
  email_cliente: string
  precio_estimado: number
  detalle: string
  sistema?: string
  con_instalacion?: boolean
  items?: unknown[]
  created_at?: string
  nombre?: string | null
  telefono?: string | null
}

function respError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

function esBodyValido(body: unknown): body is CotizacionWebhookBody {
  if (typeof body !== 'object' || body === null) return false
  const b = body as Record<string, unknown>
  return typeof b.detalle === 'string' && typeof b.precio_estimado === 'number'
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-webhook-secret')
  if (!secret || secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return respError('Body inválido', 400)
  }

  if (!esBodyValido(body)) return respError('Body mal formado', 400)

  // Usar service role key para bypassear RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    let clienteId: string

    const nombreCliente = body.nombre?.trim() || body.email_cliente || 'Sin identificar'

    const { data: existentePorEmail } = await supabase
      .from('clientes')
      .select('id')
      .ilike('nombre', `%${body.email_cliente}%`)
      .maybeSingle()

    if (existentePorEmail) {
      clienteId = existentePorEmail.id as string
    } else {
      const { data: nuevo, error: errCliente } = await supabase
        .from('clientes')
        .insert({
          nombre: nombreCliente,
          telefono: body.telefono ?? null,
          canal_entrada: 'configurador',
          estado: 'potencial',
        })
        .select('id')
        .single()

      if (errCliente || !nuevo) {
        console.error('[webhook/cotizacion] Error creando cliente:', errCliente)
        return respError('Error al crear cliente', 500)
      }
      clienteId = nuevo.id as string
    }

    const detalleCompleto = [
      body.detalle,
      body.sistema ? `Sistema: ${body.sistema}` : null,
      body.con_instalacion ? 'Con instalación' : 'Sin instalación',
    ].filter(Boolean).join(' · ')

    const { data: oportunidad, error: errOp } = await supabase
      .from('oportunidades')
      .insert({
        cliente_id: clienteId,
        estado_pipeline: 'consulta',
        detalle_cotizacion: detalleCompleto,
        monto: body.precio_estimado,
      })
      .select('id')
      .single()

    if (errOp || !oportunidad) {
      console.error('[webhook/cotizacion] Error creando oportunidad:', errOp)
      return respError('Error al crear oportunidad', 500)
    }

    void supabase.from('interacciones').insert({
      cliente_id: clienteId,
      tipo: 'nota',
      descripcion: `Cotización generada desde el configurador online — ${body.detalle} — $${body.precio_estimado?.toLocaleString('es-AR')}`,
    })

    return NextResponse.json({ ok: true, clienteId, oportunidadId: oportunidad.id }, { status: 200 })
  } catch (err) {
    console.error('[webhook/cotizacion]', err)
    return respError('Error interno del servidor', 500)
  }
}