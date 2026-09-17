import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary'

async function requireAuth(): Promise<NextResponse | null> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  return null
}

// ── Obtener access token con OAuth2 refresh token ────────────────────────────
async function getAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Error obteniendo token de Google: ${error}`)
  }

  const data = await res.json()
  return data.access_token
}

function construirEvento(body: { titulo: string; descripcion?: string; fecha: string; clienteId?: string; clienteNombre?: string }) {
  const urlCRM = body.clienteId
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://crm-insumos-roller.vercel.app'}/clientes/${body.clienteId}`
    : ''

  const fechaStr = new Date(body.fecha).toISOString().split('T')[0] // YYYY-MM-DD

  return {
    summary: `📞 ${body.titulo}`,
    description: [
      body.descripcion || '',
      body.clienteNombre ? `Cliente: ${body.clienteNombre}` : '',
      urlCRM ? `Ver ficha: ${urlCRM}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    start: { date: fechaStr }, // evento de todo el día
    end: { date: fechaStr },
    colorId: '1', // azul, igual al color de marca
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 60 * 9 }, // notificación a las 9am
      ],
    },
  }
}

// ── POST /api/calendar — Crear evento ────────────────────────────────────────
export async function POST(req: NextRequest) {
  const authError = await requireAuth()
  if (authError) return authError

  try {
    const body = await req.json()
    const { titulo, fecha } = body

    if (!titulo || !fecha) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const accessToken = await getAccessToken()
    const evento = construirEvento(body)

    const res = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(CALENDAR_ID)}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(evento),
      }
    )

    if (!res.ok) {
      const error = await res.text()
      throw new Error(`Error creando evento: ${error}`)
    }

    const eventoCreado = await res.json()
    return NextResponse.json({ ok: true, eventoId: eventoCreado.id })
  } catch (error) {
    console.error('[calendar/POST]', error)
    return NextResponse.json({ error: 'Error creando evento en Calendar' }, { status: 500 })
  }
}

// ── PATCH /api/calendar — Editar evento ──────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const authError = await requireAuth()
  if (authError) return authError

  try {
    const body = await req.json()
    const { eventId, titulo, fecha } = body

    if (!eventId || !titulo || !fecha) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const accessToken = await getAccessToken()
    const evento = construirEvento(body)

    const res = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(evento),
      }
    )

    if (!res.ok) {
      const error = await res.text()
      throw new Error(`Error editando evento: ${error}`)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[calendar/PATCH]', error)
    return NextResponse.json({ error: 'Error editando el evento en Calendar' }, { status: 500 })
  }
}

// ── DELETE /api/calendar — Borrar evento ─────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const authError = await requireAuth()
  if (authError) return authError

  try {
    const { searchParams } = new URL(req.url)
    const eventId = searchParams.get('eventId')

    if (!eventId) {
      return NextResponse.json({ error: 'Falta el eventId' }, { status: 400 })
    }

    const accessToken = await getAccessToken()

    const res = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )

    if (!res.ok && res.status !== 410) {
      const error = await res.text()
      throw new Error(`Error borrando evento: ${error}`)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[calendar/DELETE]', error)
    return NextResponse.json({ error: 'Error borrando el evento en Calendar' }, { status: 500 })
  }
}

// ── GET /api/calendar — Listar eventos ───────────────────────────────────────
export async function GET(req: NextRequest) {
  const authError = await requireAuth()
  if (authError) return authError

  try {
    const { searchParams } = new URL(req.url)
    const desde = searchParams.get('desde') || new Date().toISOString()
    const hasta =
      searchParams.get('hasta') ||
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // +30 días

    const accessToken = await getAccessToken()

    const params = new URLSearchParams({
      timeMin: desde,
      timeMax: hasta,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '100',
    })

    const res = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(CALENDAR_ID)}/events?${params}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )

    if (!res.ok) {
      const error = await res.text()
      throw new Error(`Error listando eventos: ${error}`)
    }

    const data = await res.json()
    return NextResponse.json({ eventos: data.items || [] })
  } catch (error) {
    console.error('[calendar/GET]', error)
    return NextResponse.json({ error: 'Error obteniendo eventos de Calendar' }, { status: 500 })
  }
}
