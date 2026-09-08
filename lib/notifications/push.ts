// lib/notifications/push.ts

// ── Permisos ──────────────────────────────────────────────────────────────────

export function estaPermitido(): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  return Notification.permission === 'granted'
}

export async function solicitarPermiso(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  return Notification.requestPermission()
}

// ── Mostrar notificación ──────────────────────────────────────────────────────

export function mostrarNotificacion(titulo: string, opciones?: NotificationOptions): void {
  if (!estaPermitido()) return
  new Notification(titulo, {
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    ...opciones,
  })
}

// ── Tipos de eventos predefinidos ─────────────────────────────────────────────

export function notificarNuevaCotizacion(nombreCliente: string, detalle: string): void {
  mostrarNotificacion('Nueva cotización recibida', {
    body: `${nombreCliente} generó una cotización: ${detalle}`,
    tag: 'cotizacion',
  })
}

export function notificarCompraMercadoPago(nombreCliente: string, monto: number): void {
  const montoFormateado = monto.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  })
  mostrarNotificacion('Compra completada en MercadoPago', {
    body: `${nombreCliente} realizó una compra por ${montoFormateado}`,
    tag: 'mercadopago',
  })
}

export function notificarClienteSinRespuesta(nombreCliente: string, horas: number): void {
  mostrarNotificacion('Cliente sin respuesta', {
    body: `${nombreCliente} lleva ${horas}hs sin respuesta. Revisá el seguimiento.`,
    tag: 'sin-respuesta',
  })
}
