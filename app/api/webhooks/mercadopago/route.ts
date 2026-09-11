// app/api/webhooks/mercadopago/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getOportunidadAbiertaByCliente } from '@/lib/supabase/queries'

interface MercadoPagoWebhookBody {
  type: string
  data: { id: string }
}

interface MercadoPagoPago {
  status: string
  transaction_amount: number
  description: string | null
  payer: {
    first_name: string | null
    last_name: string | null
    phone: { number: string | null } | null
  }
}

function esWebhookBody(body: unknown): body is MercadoPagoWebhookBody {
  if (typeof body !== 'object' || body === null) return false
  const b = body as Record<string, unknown>
  return typeof b.type === 'string' && typeof b.data === 'object' && b.data !== null && typeof (b.data as Record<string, unknown>).id === 'string'
}

async function obtenerPago(pagoId: string): Promise<MercadoPagoPago | null> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!token) return null
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${pagoId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json() as Promise<MercadoPagoPago>
}

function nombreCompleto(pago: MercadoPagoPago): string {
  const partes = [pago.payer.first_name, pago.payer.last_name].filter(Boolean)
  return partes.join(' ').trim() || 'Sin identificar'
}

function formatMonto(monto: number): string {
  return monto.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Body inválido' }, { status: 400 })
  }

  if (!esWebhookBody(body)) return NextResponse.json({ ok: false, error: 'Body mal formado' }, { status: 400 })
  if (body.type !== 'payment') return NextResponse.json({ ok: true, ignorado: true }, { status: 200 })

  try {
    const pago = await obtenerPago(body.data.id)
    if (!pago) return NextResponse.json({ ok: true, ignorado: true }, { status: 200 })
    if (pago.status !== 'approved') return NextResponse.json({ ok: true, ignorado: true }, { status: 200 })

    const telefono = pago.payer.phone?.number ?? null
    const nombre = nombreCompleto(pago)
    const monto = pago.transaction_amount
    const descripcionPago = pago.description ?? 'Compra en Insumos Roller'

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    let clienteId: string

    if (telefono) {
      const { data: existente } = await supabase.from('clientes').select('id').eq('telefono', telefono).maybeSingle()
      if (existente) {
        clienteId = existente.id as string
        void supabase.from('clientes').update({ estado: 'activo' }).eq('id', clienteId).neq('estado', 'activo')
      } else {
        const { data: nuevo, error: errCliente } = await supabase.from('clientes').insert({ nombre, telefono, canal_entrada: 'mercadopago', estado: 'activo' }).select('id').single()
        if (errCliente || !nuevo) return NextResponse.json({ ok: false, error: 'Error al crear cliente' }, { status: 500 })
        clienteId = nuevo.id as string
      }
    } else {
      const { data: nuevo, error: errCliente } = await supabase.from('clientes').insert({ nombre, telefono: null, canal_entrada: 'mercadopago', estado: 'activo' }).select('id').single()
      if (errCliente || !nuevo) return NextResponse.json({ ok: false, error: 'Error al crear cliente' }, { status: 500 })
      clienteId = nuevo.id as string
    }

    const { data: oportunidadExistente } = await getOportunidadAbiertaByCliente(clienteId)
    if (oportunidadExistente) {
      void supabase.from('oportunidades').update({ estado_pipeline: 'ganado', monto }).eq('id', oportunidadExistente.id)
    } else {
      void supabase.from('oportunidades').insert({ cliente_id: clienteId, estado_pipeline: 'ganado', monto, detalle_cotizacion: descripcionPago })
    }

    void supabase.from('interacciones').insert({
      cliente_id: clienteId,
      tipo: 'nota',
      descripcion: `Compra completada por MercadoPago — ${formatMonto(monto)}`,
    })

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    console.error('[webhook/mercadopago]', err)
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 })
  }
}