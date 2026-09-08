// app/api/webhooks/mercadopago/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getOportunidadAbiertaByCliente } from '@/lib/supabase/queries'

// ── Tipos de MercadoPago ──────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function esWebhookBody(body: unknown): body is MercadoPagoWebhookBody {
  if (typeof body !== 'object' || body === null) return false
  const b = body as Record<string, unknown>
  return (
    typeof b.type === 'string' &&
    typeof b.data === 'object' &&
    b.data !== null &&
    typeof (b.data as Record<string, unknown>).id === 'string'
  )
}

async function obtenerPago(pagoId: string): Promise<MercadoPagoPago | null> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!token) return null

  const res = await fetch(`https://api.mercadopago.com/v1/payments/${pagoId}`, {
    headers: { Authorization: `Bearer ${token}` },
    // No cachear — siempre queremos el estado real del pago
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
  return monto.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  })
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: unknown

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Body inválido' }, { status: 400 })
  }

  if (!esWebhookBody(body)) {
    return NextResponse.json({ ok: false, error: 'Body mal formado' }, { status: 400 })
  }

  // 1. Ignorar eventos que no sean pagos
  if (body.type !== 'payment') {
    return NextResponse.json({ ok: true, ignorado: true }, { status: 200 })
  }

  try {
    // 2. Obtener detalles del pago desde la API de MercadoPago
    const pago = await obtenerPago(body.data.id)

    if (!pago) {
      console.error('[webhook/mercadopago] No se pudo obtener el pago', body.data.id)
      // Retornamos 200 para que MP no reintente — el error es de nuestra configuración
      return NextResponse.json({ ok: true, ignorado: true }, { status: 200 })
    }

    // 3. Solo procesar pagos aprobados
    if (pago.status !== 'approved') {
      return NextResponse.json({ ok: true, ignorado: true }, { status: 200 })
    }

    // 4. Extraer datos del pagador
    const telefono = pago.payer.phone?.number ?? null
    const nombre = nombreCompleto(pago)
    const monto = pago.transaction_amount
    const descripcionPago = pago.description ?? 'Compra en Insumos Roller'

    const supabase = createServerClient()

    // 5. Buscar o crear cliente
    let clienteId: string

    if (telefono) {
      const { data: existente } = await supabase
        .from('clientes')
        .select('id')
        .eq('telefono', telefono)
        .maybeSingle()

      if (existente) {
        clienteId = existente.id as string

        // Actualizar estado a 'activo' si era potencial
        void supabase
          .from('clientes')
          .update({ estado: 'activo' })
          .eq('id', clienteId)
          .neq('estado', 'activo')
      } else {
        const { data: nuevo, error: errCliente } = await supabase
          .from('clientes')
          .insert({
            nombre,
            telefono,
            canal_entrada: 'mercadopago',
            estado: 'activo',
          })
          .select('id')
          .single()

        if (errCliente || !nuevo) {
          console.error('[webhook/mercadopago] Error al crear cliente', errCliente)
          return NextResponse.json({ ok: false, error: 'Error al crear cliente' }, { status: 500 })
        }
        clienteId = nuevo.id as string
      }
    } else {
      const { data: nuevo, error: errCliente } = await supabase
        .from('clientes')
        .insert({
          nombre,
          telefono: null,
          canal_entrada: 'mercadopago',
          estado: 'activo',
        })
        .select('id')
        .single()

      if (errCliente || !nuevo) {
        console.error('[webhook/mercadopago] Error al crear cliente sin tel', errCliente)
        return NextResponse.json({ ok: false, error: 'Error al crear cliente' }, { status: 500 })
      }
      clienteId = nuevo.id as string
    }

    // 6. Mover oportunidad existente a 'ganado' o crear una nueva
    const { data: oportunidadExistente } = await getOportunidadAbiertaByCliente(clienteId)

    if (oportunidadExistente) {
      void supabase
        .from('oportunidades')
        .update({ estado_pipeline: 'ganado', monto, updated_at: new Date().toISOString() })
        .eq('id', oportunidadExistente.id)
    } else {
      void supabase.from('oportunidades').insert({
        cliente_id: clienteId,
        estado_pipeline: 'ganado',
        monto,
        detalle_cotizacion: descripcionPago,
      })
    }

    // 7. Registrar interacción (fire-and-forget)
    void supabase.from('interacciones').insert({
      cliente_id: clienteId,
      tipo: 'nota',
      descripcion: `Compra completada por MercadoPago — ${formatMonto(monto)}`,
    })

    // 8. Respuesta
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    console.error('[webhook/mercadopago]', err)
    // Retornamos 500 para que MercadoPago reintente el webhook
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 })
  }
}
