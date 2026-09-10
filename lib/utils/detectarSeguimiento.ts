export interface SeguimientoDetectado {
  fecha: Date
  descripcion: string
  textoOriginal: string
}

/**
 * Detecta fechas y compromisos de seguimiento en texto libre.
 * Ejemplos que detecta:
 * - "llamame el 3/10"
 * - "hablame el 3 de octubre"
 * - "contactame la semana que viene"
 * - "en 15 días"
 * - "el lunes"
 * - "mañana"
 */
export function detectarSeguimiento(texto: string): SeguimientoDetectado | null {
  if (!texto || texto.trim().length < 5) return null

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const textoLower = texto.toLowerCase()

  // ── 1. FECHA EXACTA: "3/10", "03/10/2026", "3-10" ──────────────────────────
  const regexFechaExacta = /\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/g
  let match = regexFechaExacta.exec(textoLower)
  if (match) {
    const dia = parseInt(match[1])
    const mes = parseInt(match[2]) - 1 // 0-indexed
    const anio = match[3]
      ? match[3].length === 2
        ? 2000 + parseInt(match[3])
        : parseInt(match[3])
      : hoy.getFullYear()

    const fecha = new Date(anio, mes, dia)
    // Si la fecha ya pasó este año, la ponemos el año que viene
    if (fecha < hoy) fecha.setFullYear(fecha.getFullYear() + 1)

    if (fecha > hoy && mes >= 0 && mes <= 11 && dia >= 1 && dia <= 31) {
      return {
        fecha,
        descripcion: extraerDescripcion(texto),
        textoOriginal: match[0],
      }
    }
  }

  // ── 2. FECHA CON NOMBRE DE MES: "3 de octubre", "el 15 de marzo" ────────────
  const meses: Record<string, number> = {
    enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
    julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
  }
  const regexNombreMes = /(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/
  const matchNombreMes = textoLower.match(regexNombreMes)
  if (matchNombreMes) {
    const dia = parseInt(matchNombreMes[1])
    const mes = meses[matchNombreMes[2]]
    const fecha = new Date(hoy.getFullYear(), mes, dia)
    if (fecha < hoy) fecha.setFullYear(fecha.getFullYear() + 1)

    return {
      fecha,
      descripcion: extraerDescripcion(texto),
      textoOriginal: matchNombreMes[0],
    }
  }

  // ── 3. DÍAS DE LA SEMANA: "el lunes", "el viernes" ──────────────────────────
  const diasSemana: Record<string, number> = {
    lunes: 1, martes: 2, miércoles: 3, miercoles: 3,
    jueves: 4, viernes: 5, sábado: 6, sabado: 6, domingo: 0,
  }
  for (const [nombre, numDia] of Object.entries(diasSemana)) {
    if (textoLower.includes(nombre)) {
      const fecha = new Date(hoy)
      const diff = (numDia - hoy.getDay() + 7) % 7 || 7 // próximo, no hoy
      fecha.setDate(hoy.getDate() + diff)
      return {
        fecha,
        descripcion: extraerDescripcion(texto),
        textoOriginal: nombre,
      }
    }
  }

  // ── 4. RELATIVOS: "mañana", "pasado mañana", "en X días/semanas" ────────────
  if (textoLower.includes('mañana') || textoLower.includes('manana')) {
    const fecha = new Date(hoy)
    fecha.setDate(hoy.getDate() + (textoLower.includes('pasado') ? 2 : 1))
    return { fecha, descripcion: extraerDescripcion(texto), textoOriginal: 'mañana' }
  }

  const regexEnDias = /en\s+(\d+)\s+(día|dias|días|semana|semanas)/
  const matchEnDias = textoLower.match(regexEnDias)
  if (matchEnDias) {
    const cantidad = parseInt(matchEnDias[1])
    const esSemana = matchEnDias[2].startsWith('semana')
    const fecha = new Date(hoy)
    fecha.setDate(hoy.getDate() + (esSemana ? cantidad * 7 : cantidad))
    return {
      fecha,
      descripcion: extraerDescripcion(texto),
      textoOriginal: matchEnDias[0],
    }
  }

  // ── 5. "la semana que viene", "el mes que viene" ─────────────────────────────
  if (textoLower.includes('semana que viene') || textoLower.includes('semana próxima') || textoLower.includes('semana proxima')) {
    const fecha = new Date(hoy)
    fecha.setDate(hoy.getDate() + 7)
    return { fecha, descripcion: extraerDescripcion(texto), textoOriginal: 'semana que viene' }
  }

  if (textoLower.includes('mes que viene') || textoLower.includes('mes próximo') || textoLower.includes('mes proximo')) {
    const fecha = new Date(hoy)
    fecha.setMonth(hoy.getMonth() + 1)
    return { fecha, descripcion: extraerDescripcion(texto), textoOriginal: 'mes que viene' }
  }

  return null
}

/**
 * Extrae un título corto del seguimiento a partir del texto.
 * Busca frases de acción típicas del vendedor.
 */
function extraerDescripcion(texto: string): string {
  const textoLower = texto.toLowerCase()

  if (textoLower.includes('llam')) return 'Llamar al cliente'
  if (textoLower.includes('visit')) return 'Visitar al cliente'
  if (textoLower.includes('reun')) return 'Reunión con el cliente'
  if (textoLower.includes('cobr')) return 'Seguimiento — cobró y quiere avanzar'
  if (textoLower.includes('presupu') || textoLower.includes('cotiz')) return 'Enviar presupuesto'
  if (textoLower.includes('whatsapp') || textoLower.includes('mensaje')) return 'Escribir por WhatsApp'

  return 'Seguimiento con el cliente'
}

/**
 * Formatea una fecha para mostrar al vendedor.
 * Ej: "Vie 3 de octubre"
 */
export function formatearFechaSeguimiento(fecha: Date): string {
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ]
  return `${dias[fecha.getDay()]} ${fecha.getDate()} de ${meses[fecha.getMonth()]}`
}