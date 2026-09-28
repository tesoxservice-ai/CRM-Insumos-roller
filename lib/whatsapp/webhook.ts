// lib/whatsapp/webhook.ts
// Lógica pura del webhook de WhatsApp Business (sin acceso a base de datos):
// verificación de firma, parseo del payload y normalización de teléfonos.

import { createHmac, timingSafeEqual } from 'node:crypto'

export interface MensajeWhatsApp {
  waMessageId: string
  waId: string
  nombrePerfil: string | null
  direccion: 'entrante' | 'saliente'
  tipo: string
  texto: string | null
  timestamp: Date
  payload: unknown
}

export function soloDigitos(telefono: string): string {
  return telefono.replace(/\D/g, '')
}

// WhatsApp entrega "5491155960412" y en el CRM hay "+5411..." o "5411...":
// comparar los últimos 10 dígitos (código de área + número) evita los
// problemas del 9 y del prefijo de país.
export function claveTelefono(telefono: string): string {
  return soloDigitos(telefono).slice(-10)
}

export function firmaValida(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header || !header.startsWith('sha256=')) return false
  const esperada = createHmac('sha256', appSecret).update(rawBody).digest('hex')
  const recibida = header.slice('sha256='.length)
  const a = Buffer.from(esperada, 'hex')
  const b = Buffer.from(recibida, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

const ETIQUETAS_MEDIA: Record<string, string> = {
  image: 'Imagen',
  video: 'Video',
  audio: 'Audio',
  document: 'Documento',
  sticker: 'Sticker',
}

type Obj = Record<string, unknown>
const obj = (v: unknown): Obj => (v && typeof v === 'object' ? (v as Obj) : {})
const str = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null)

function extraerTexto(m: Obj): string | null {
  const tipo = str(m.type) ?? 'unknown'
  if (tipo === 'text') return str(obj(m.text).body)
  if (tipo in ETIQUETAS_MEDIA) {
    const caption = str(obj(m[tipo]).caption)
    const etiqueta = `[${ETIQUETAS_MEDIA[tipo]}]`
    return caption ? `${etiqueta} ${caption}` : etiqueta
  }
  if (tipo === 'location') return '[Ubicación]'
  if (tipo === 'button') return str(obj(m.button).text)
  if (tipo === 'interactive') {
    const i = obj(m.interactive)
    return str(obj(i.button_reply).title) ?? str(obj(i.list_reply).title)
  }
  return `[${tipo}]`
}

export function parsearMensajes(body: unknown): MensajeWhatsApp[] {
  const resultado: MensajeWhatsApp[] = []
  const entries = obj(body).entry
  if (!Array.isArray(entries)) return resultado

  for (const entry of entries) {
    const changes = obj(entry).changes
    if (!Array.isArray(changes)) continue

    for (const change of changes) {
      const campo = str(obj(change).field)
      const value = obj(obj(change).value)

      if (campo === 'messages') {
        const nombres = new Map<string, string>()
        if (Array.isArray(value.contacts)) {
          for (const c of value.contacts) {
            const waId = str(obj(c).wa_id)
            const nombre = str(obj(obj(c).profile).name)
            if (waId && nombre) nombres.set(waId, nombre)
          }
        }
        if (!Array.isArray(value.messages)) continue
        for (const raw of value.messages) {
          const m = obj(raw)
          const tipo = str(m.type) ?? 'unknown'
          const waMessageId = str(m.id)
          const waId = str(m.from)
          if (!waMessageId || !waId || tipo === 'reaction') continue
          resultado.push({
            waMessageId,
            waId: soloDigitos(waId),
            nombrePerfil: nombres.get(waId) ?? null,
            direccion: 'entrante',
            tipo,
            texto: extraerTexto(m),
            timestamp: new Date(Number(m.timestamp) * 1000),
            payload: raw,
          })
        }
      }

      // Coexistence: mensajes que el negocio manda desde la app del celular
      if (campo === 'smb_message_echoes' && Array.isArray(value.message_echoes)) {
        for (const raw of value.message_echoes) {
          const m = obj(raw)
          const tipo = str(m.type) ?? 'unknown'
          const waMessageId = str(m.id)
          const waId = str(m.to)
          if (!waMessageId || !waId || tipo === 'reaction') continue
          resultado.push({
            waMessageId,
            waId: soloDigitos(waId),
            nombrePerfil: null,
            direccion: 'saliente',
            tipo,
            texto: extraerTexto(m),
            timestamp: new Date(Number(m.timestamp) * 1000),
            payload: raw,
          })
        }
      }
    }
  }

  return resultado
}
