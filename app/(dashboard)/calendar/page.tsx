'use client'

import { useEffect, useState, useCallback } from 'react'
import { Calendar, ChevronLeft, ChevronRight, RefreshCw, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface EventoCalendar {
  id: string
  summary: string
  description?: string
  start: { date?: string; dateTime?: string }
  end: { date?: string; dateTime?: string }
  htmlLink?: string
}

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function getFechaEvento(evento: EventoCalendar): Date {
  const str = evento.start.date || evento.start.dateTime || ''
  return new Date(str.includes('T') ? str : str + 'T12:00:00')
}

function getClienteIdDeDescripcion(descripcion: string): string | null {
  const match = descripcion?.match(/\/clientes\/([a-zA-Z0-9\-]+)/)
  return match ? match[1] : null
}

export default function CalendarPage() {
  const [eventos, setEventos] = useState<EventoCalendar[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mesActual, setMesActual] = useState(() => {
    const hoy = new Date()
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  })

  const cargarEventos = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const desde = new Date(mesActual.getFullYear(), mesActual.getMonth(), 1)
      const hasta = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 0, 23, 59, 59)
      const res = await fetch(`/api/calendar?desde=${desde.toISOString()}&hasta=${hasta.toISOString()}`)
      if (!res.ok) throw new Error('Error cargando eventos')
      const data = await res.json()
      setEventos(data.eventos || [])
    } catch {
      setError('No se pudieron cargar los eventos. Revisá la configuración de Google Calendar.')
    } finally {
      setCargando(false)
    }
  }, [mesActual])

  useEffect(() => { cargarEventos() }, [cargarEventos])

  const primerDia = new Date(mesActual.getFullYear(), mesActual.getMonth(), 1).getDay()
  const diasEnMes = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 0).getDate()
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const celdas: (number | null)[] = [
    ...Array(primerDia).fill(null),
    ...Array.from({ length: diasEnMes }, (_, i) => i + 1),
  ]

  function eventosDelDia(dia: number): EventoCalendar[] {
    return eventos.filter((e) => {
      const fecha = getFechaEvento(e)
      return (
        fecha.getFullYear() === mesActual.getFullYear() &&
        fecha.getMonth() === mesActual.getMonth() &&
        fecha.getDate() === dia
      )
    })
  }

  function esFechaHoy(dia: number): boolean {
    return (
      dia === hoy.getDate() &&
      mesActual.getMonth() === hoy.getMonth() &&
      mesActual.getFullYear() === hoy.getFullYear()
    )
  }

  const proximosEventos = eventos
    .filter((e) => getFechaEvento(e) >= hoy)
    .sort((a, b) => getFechaEvento(a).getTime() - getFechaEvento(b).getTime())
    .slice(0, 10)

  return (
    <div className="h-full flex flex-col p-6 gap-4">

      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Calendar className="text-[#1B3FA0]" size={22} />
          <h1 className="text-xl font-bold text-gray-900">Calendario</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-1 py-1">
            <button
              onClick={() => setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() - 1, 1))}
              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-semibold text-gray-900 text-sm px-3 min-w-[160px] text-center">
              {MESES[mesActual.getMonth()]} {mesActual.getFullYear()}
            </span>
            <button
              onClick={() => setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 1))}
              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <button
            onClick={() => setMesActual(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
            className="px-3 py-2 text-sm text-gray-600 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 transition-colors"
          >
            Hoy
          </button>
          <button
            onClick={cargarEventos}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="shrink-0 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Layout principal */}
      <div className="flex-1 flex gap-4 min-h-0">

        {/* Grilla del mes */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col min-h-0">

          <div className="grid grid-cols-7 border-b border-gray-100 shrink-0">
            {DIAS.map((dia) => (
              <div key={dia} className="py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {dia}
              </div>
            ))}
          </div>

          <div className="flex-1 grid grid-cols-7 grid-rows-6 min-h-0">
            {celdas.map((dia, idx) => {
              const evDia = dia ? eventosDelDia(dia) : []
              const esHoy = dia ? esFechaHoy(dia) : false

              return (
                <div
                  key={idx}
                  className={`border-b border-r border-gray-100 p-2 flex flex-col gap-1 overflow-hidden ${
                    !dia ? 'bg-gray-50/40' : 'hover:bg-gray-50/60 transition-colors'
                  }`}
                >
                  {dia && (
                    <>
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 text-sm rounded-full font-medium shrink-0 ${
                          esHoy
                            ? 'bg-[#1B3FA0] text-white font-bold'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {dia}
                      </span>
                      <div className="flex flex-col gap-0.5 overflow-hidden">
                        {evDia.slice(0, 3).map((ev) => {
                          const clienteId = getClienteIdDeDescripcion(ev.description || '')
                          const pill = (
                            <div
                              key={ev.id}
                              className="text-[11px] px-2 py-0.5 bg-[#1B3FA0] text-white rounded-md truncate cursor-pointer hover:bg-blue-800 transition-colors leading-5"
                              title={ev.summary}
                            >
                              {ev.summary.replace('📞 ', '')}
                            </div>
                          )
                          return clienteId ? (
                            <Link key={ev.id} href={`/clientes/${clienteId}`}>{pill}</Link>
                          ) : pill
                        })}
                        {evDia.length > 3 && (
                          <span className="text-[10px] text-gray-400 px-1">
                            +{evDia.length - 3} más
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Panel lateral */}
        <div className="w-72 shrink-0 flex flex-col gap-4 overflow-y-auto">

          <div className="bg-white rounded-xl border border-gray-200 p-4 shrink-0">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Este mes</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-center">
                <p className="text-2xl font-bold text-[#1B3FA0]">{eventos.length}</p>
                <p className="text-xs text-blue-600 mt-0.5">Seguimientos</p>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{proximosEventos.length}</p>
                <p className="text-xs text-amber-600 mt-0.5">Pendientes</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 flex-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Próximos seguimientos</p>

            {cargando ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : proximosEventos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mb-2">
                  <Calendar size={16} className="text-gray-300" />
                </div>
                <p className="text-sm text-gray-400">Sin seguimientos próximos</p>
              </div>
            ) : (
              <div className="space-y-2">
                {proximosEventos.map((ev) => {
                  const fecha = getFechaEvento(ev)
                  const clienteId = getClienteIdDeDescripcion(ev.description || '')
                  const diffDias = Math.round((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
                  const etiqueta = diffDias === 0 ? 'Hoy' : diffDias === 1 ? 'Mañana' : `En ${diffDias} días`
                  const esUrgente = diffDias === 0

                  const card = (
                    <div
                      key={ev.id}
                      className={`p-3 rounded-lg border transition-shadow hover:shadow-sm ${
                        esUrgente
                          ? 'border-orange-200 bg-orange-50'
                          : 'border-gray-100 bg-gray-50 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className="text-sm font-medium text-gray-800 leading-tight line-clamp-1">
                          {ev.summary.replace('📞 ', '')}
                        </span>
                        {ev.htmlLink && (
                          <a
                            href={ev.htmlLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-gray-300 hover:text-gray-500 shrink-0 mt-0.5"
                          >
                            <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold ${esUrgente ? 'text-orange-600' : 'text-[#1B3FA0]'}`}>
                          {etiqueta}
                        </span>
                        <span className="text-xs text-gray-400">
                          {fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                  )

                  return clienteId ? (
                    <Link key={ev.id} href={`/clientes/${clienteId}`}>{card}</Link>
                  ) : card
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}