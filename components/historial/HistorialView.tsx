// components/historial/HistorialView.tsx
'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Phone, MessageCircle, Mail, Users, FileText, Search, RefreshCw, History } from 'lucide-react'
import { useHistorial } from '@/lib/supabase/hooks'
import type { InteraccionConCliente } from '@/lib/supabase/queries'
import type { TipoInteraccion } from '@/lib/types'

const TIPOS: { value: TipoInteraccion | 'todos'; label: string }[] = [
  { value: 'todos',    label: 'Todos' },
  { value: 'llamada',  label: 'Llamada' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email',    label: 'Email' },
  { value: 'reunion',  label: 'Reunión' },
  { value: 'nota',     label: 'Nota' },
]

const ICON_MAP: Record<TipoInteraccion, React.ElementType> = {
  llamada: Phone, whatsapp: MessageCircle, email: Mail, reunion: Users, nota: FileText,
}

const COLOR_MAP: Record<TipoInteraccion, string> = {
  llamada:  'text-blue-500 bg-blue-50 border border-blue-100',
  whatsapp: 'text-emerald-500 bg-emerald-50 border border-emerald-100',
  email:    'text-violet-500 bg-violet-50 border border-violet-100',
  reunion:  'text-orange-500 bg-orange-50 border border-orange-100',
  nota:     'text-gray-400 bg-gray-50 border border-gray-200',
}

const BADGE_MAP: Record<TipoInteraccion, string> = {
  llamada:  'bg-blue-50 text-blue-700 border border-blue-100',
  whatsapp: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  email:    'bg-violet-50 text-violet-700 border border-violet-100',
  reunion:  'bg-orange-50 text-orange-700 border border-orange-100',
  nota:     'bg-gray-50 text-gray-600 border border-gray-200',
}

type GrupoKey = 'Hoy' | 'Ayer' | 'Esta semana' | 'Más antiguo'

function getGrupo(fecha: string): GrupoKey {
  const now = new Date()
  const d = new Date(fecha)
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const hoy = startOfDay(now)
  const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1)
  const hace7 = new Date(hoy); hace7.setDate(hace7.getDate() - 7)
  const dStart = startOfDay(d)
  if (dStart.getTime() === hoy.getTime()) return 'Hoy'
  if (dStart.getTime() === ayer.getTime()) return 'Ayer'
  if (dStart >= hace7) return 'Esta semana'
  return 'Más antiguo'
}

const GRUPO_ORDER: GrupoKey[] = ['Hoy', 'Ayer', 'Esta semana', 'Más antiguo']

function formatFecha(fecha: string, grupo: GrupoKey): string {
  const d = new Date(fecha)
  if (grupo === 'Hoy') return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short',
    year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  })
}

function LoadingSkeleton() {
  return (
    <div className="divide-y divide-gray-50">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-4 py-5 px-6 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-gray-100 shrink-0" />
          <div className="flex-1 space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="h-3.5 w-32 bg-gray-100 rounded-full" />
              <div className="h-3.5 w-16 bg-gray-100 rounded-full" />
            </div>
            <div className="h-3 w-3/4 bg-gray-100 rounded-full" />
            <div className="h-3 w-1/4 bg-gray-100 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

function FeedItem({ interaccion, grupo }: { interaccion: InteraccionConCliente; grupo: GrupoKey }) {
  const tipo = interaccion.tipo as TipoInteraccion
  const Icon = ICON_MAP[tipo]
  const tipoLabel = TIPOS.find((t) => t.value === tipo)?.label ?? tipo

  return (
    <div className="flex gap-4 py-5 px-6 hover:bg-blue-50/20 transition-colors group">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${COLOR_MAP[tipo]}`}>
        <Icon size={15} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <Link
            href={`/clientes/${interaccion.cliente.id}`}
            className="text-sm font-semibold text-gray-900 hover:text-blue-700 transition-colors"
          >
            {interaccion.cliente.nombre}
          </Link>
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${BADGE_MAP[tipo]}`}>
            {tipoLabel}
          </span>
        </div>
        <p className="text-sm text-gray-600 leading-snug line-clamp-2">{interaccion.descripcion}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <p className="text-xs text-gray-400">{formatFecha(interaccion.created_at, grupo)}</p>
          {interaccion.creado_por_nombre && (
            <>
              <span className="text-gray-200">·</span>
              <span className="text-xs font-medium text-[#1B3FA0]">
                {interaccion.creado_por_nombre}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function HistorialView() {
  const { interacciones, loading, error, refetch } = useHistorial()
  const [tipoFiltro, setTipoFiltro] = useState<TipoInteraccion | 'todos'>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [vendedorFiltro, setVendedorFiltro] = useState<string>('todos')

  const vendedores = useMemo(() => {
    const nombres = interacciones
      .map((i) => i.creado_por_nombre)
      .filter((n): n is string => !!n)
    return [...new Set(nombres)]
  }, [interacciones])

  const filtradas = useMemo(() => {
    return interacciones.filter((i) => {
      const pasaTipo = tipoFiltro === 'todos' || i.tipo === tipoFiltro
      const pasaVendedor = vendedorFiltro === 'todos' || i.creado_por_nombre === vendedorFiltro
      const q = busqueda.toLowerCase()
      const pasaBusqueda = !q || i.cliente.nombre.toLowerCase().includes(q) || i.descripcion?.toLowerCase().includes(q)
      return pasaTipo && pasaVendedor && pasaBusqueda
    })
  }, [interacciones, tipoFiltro, busqueda, vendedorFiltro])

  const grupos = useMemo(() => {
    const map = new Map<GrupoKey, InteraccionConCliente[]>()
    for (const item of filtradas) {
      const g = getGrupo(item.created_at)
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(item)
    }
    return map
  }, [filtradas])

  const hayFiltros = tipoFiltro !== 'todos' || busqueda !== '' || vendedorFiltro !== 'todos'

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Historial</h1>
          <p className="text-sm text-gray-400 mt-0.5">Todas las interacciones en orden cronológico</p>
        </div>
        {!loading && !error && (
          <p className="text-sm text-gray-400 mt-1">
            {filtradas.length} interacción{filtradas.length !== 1 ? 'es' : ''}
            {hayFiltros ? ' encontradas' : ' en total'}
          </p>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por cliente o descripción…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-50 focus:border-blue-400 placeholder:text-gray-400 transition"
            />
          </div>
          {vendedores.length > 1 && (
            <select
              value={vendedorFiltro}
              onChange={(e) => setVendedorFiltro(e.target.value)}
              className="px-3 py-2.5 text-sm rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-50 focus:border-blue-400 text-gray-700 transition"
            >
              <option value="todos">Todos</option>
              {vendedores.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {TIPOS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTipoFiltro(t.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                tipoFiltro === t.value
                  ? 'text-white shadow-sm'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200'
              }`}
              style={tipoFiltro === t.value ? { backgroundColor: '#1B3FA0' } : {}}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
              <RefreshCw size={16} className="text-red-400" />
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">No se pudo cargar el historial</p>
            <p className="text-xs text-gray-400 mb-4">{error}</p>
            <button onClick={refetch} className="text-xs font-semibold px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors" style={{ backgroundColor: '#1B3FA0' }}>
              Reintentar
            </button>
          </div>
        ) : filtradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mb-3">
              <History size={18} className="text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">
              {hayFiltros ? 'Sin resultados' : 'Sin interacciones'}
            </p>
            <p className="text-xs text-gray-400">
              {hayFiltros ? 'No hay resultados para esta búsqueda' : 'No hay interacciones registradas aún'}
            </p>
          </div>
        ) : (
          <div>
            {GRUPO_ORDER.filter((g) => grupos.has(g)).map((grupo, gi) => (
              <div key={grupo}>
                <div className={`flex items-center gap-3 px-6 py-3 bg-gray-50/80 ${gi > 0 ? 'border-t border-gray-100' : ''}`}>
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{grupo}</span>
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-[11px] font-semibold text-gray-400">{grupos.get(grupo)!.length}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {grupos.get(grupo)!.map((interaccion) => (
                    <FeedItem key={interaccion.id} interaccion={interaccion} grupo={grupo} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}