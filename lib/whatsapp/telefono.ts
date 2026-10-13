// lib/whatsapp/telefono.ts
// Normalización de teléfonos. Sin dependencias de Node: se usa tanto en el
// webhook (servidor) como en la bandeja (navegador).

export function soloDigitos(telefono: string): string {
  return telefono.replace(/\D/g, '')
}

// WhatsApp entrega "5491155960412" y en el CRM hay "+5411..." o "5411...":
// comparar los últimos 10 dígitos (código de área + número) evita los
// problemas del 9 y del prefijo de país.
export function claveTelefono(telefono: string): string {
  return soloDigitos(telefono).slice(-10)
}
