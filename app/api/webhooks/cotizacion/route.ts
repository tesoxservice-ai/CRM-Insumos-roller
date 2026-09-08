// app/api/webhooks/cotizacion/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// ── Tipos del body entrante ───────────────────────────────────────────────────

interface CotizacionWebhookBody {
  telefono: string | null
  nombre: string | null
  detalle: string
  monto: number
  secret: string
}

// ── Helpers internos ──────────────────────────────────────────────────────────

function respError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

function esBodyValido(body: unknown): body is CotizacionWebhookBody {
  if (typeof body !== 'object' || body === null) return false
  const b = body as Record<string, unknown>
  return (
    typeof b.detalle === 'string' &&
    typeof b.monto === 'number' &&
    typeof b.secret === 'string'
  )
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: unknown

  try {
    body = await req.json()
  } catch {
    return respError('Body inválido', 400)
  }

  if (!esBodyValido(body)) return respError('Body mal formado', 400)

  // 1. Validar secret
  if (body.secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const supabase = createServerClient()

  try {
    // 2 & 3. Buscar o crear cliente
    let clienteId: string

    if (body.telefono) {
      const { data: existente } = await supabase
        .from('clientes')
        .select('id')
        .eq('telefono', body.telefono)
        .maybeSingle()

      if (existente) {
        clienteId = existente.id as string
      } else {
        const { data: nuevo, error: errCliente } = await supabase
          .from('clientes')
          .insert({
            nombre: body.nombre?.trim() || 'Sin identificar',
            telefono: body.telefono,
            canal_entrada: 'configurador',
            estado: 'potencial',
          })
          .select('id')
          .single()

        if (errCliente || !nuevo) {
          return respError('Error al crear cliente', 500)
        }
        clienteId = nuevo.id as string
      }
    } else {
      const { data: nuevo, error: errCliente } = await supabase
        .from('clientes')
        .insert({
          nombre: body.nombre?.trim() || 'Sin identificar',
          telefono: null,
          canal_entrada: 'configurador',
          estado: 'potencial',
        })
        .select('id')
        .single()

      if (errCliente || !nuevo) {
        return respError('Error al crear cliente', 500)
      }
      clienteId = nuevo.id as string
    }

    // 4. Crear oportunidad
    const { data: oportunidad, error: errOp } = await supabase
      .from('oportunidades')
      .insert({
        cliente_id: clienteId,
        estado_pipeline: 'consulta',
        detalle_cotizacion: body.detalle,
        monto: body.monto,
      })
      .select('id')
      .single()

    if (errOp || !oportunidad) {
      return respError('Error al crear oportunidad', 500)
    }

    // 5. Registrar interacción (fire-and-forget — no bloquea la respuesta)
    void supabase.from('interacciones').insert({
      cliente_id: clienteId,
      tipo: 'nota',
      descripcion: 'Cotización generada desde el configurador online',
    })

    // 6. Respuesta
    return NextResponse.json(
      { ok: true, clienteId, oportunidadId: oportunidad.id },
      { status: 200 }
    )
  } catch (err) {
    console.error('[webhook/cotizacion]', err)
    return respError('Error interno del servidor', 500)
  }
}
