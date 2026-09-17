// components/pipeline/PipelineView.tsx
'use client'

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react'
import { Plus, RefreshCw, X, AlertCircle, TrendingUp, DollarSign, Users, Inbox } from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useOportunidadesPorEstado } from '@/lib/supabase/hooks'
import { updateEstadoPipeline, createOportunidad, getClientes } from '@/lib/supabase/queries'
import OportunidadCard, { type OportunidadConCliente } from './OportunidadCard'
import type { Cliente, EstadoPipeline, Oportunidad } from '@/lib/types'

const BRAND = '#1B3FA0'

interface ColConfig {
  id: EstadoPipeline
  label: string
  accent: string
  headerText: string
  bg: string
  emptyIcon: React.ElementType
}

const COLUMNAS: ColConfig[] = [
  { id: 'consulta',           label: 'Consulta',           accent: '#94A3B8', headerText: 'text-slate-600',   bg: 'bg-slate-50/80',    emptyIcon: Inbox },
  { id: 'cotizacion_enviada', label: 'Cotización enviada', accent: '#1B3FA0', headerText: 'text-blue-700',    bg: 'bg-blue-50/50',     emptyIcon: Inbox },
  { id: 'negociacion',        label: 'Negociación',        accent: '#F59E0B', headerText: 'text-amber-700',   bg: 'bg-amber-50/50',    emptyIcon: Inbox },
  { id: 'ganado',             label: 'Ganado',             accent: '#10B981', headerText: 'text-emerald-700', bg: 'bg-emerald-50/50',  emptyIcon: Inbox },
  { id: 'perdido',            label: 'Perdido',            accent: '#EF4444', headerText: 'text-red-600',     bg: 'bg-red-50/40',      emptyIcon: X     },
]

function MetricCard({ icon: Icon, label, value, sub, iconBg, iconColor }: { icon: React.ElementType; label: string; value: string; sub: string; iconBg: string; iconColor: string }) {
  return (
    <div className="flex-1 min-w-0 bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon size={16} strokeWidth={2} className={iconColor} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-400 font-medium truncate">{label}</p>
          <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
          <p className="text-[11px] text-gray-400 truncate">{sub}</p>
        </div>
      </div>
    </div>
  )
}

function Toast({ mensaje, onDismiss }: { mensaje: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000)
    return () => clearTimeout(t)
  }, [onDismiss])
  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-start gap-2.5 rounded-xl border border-red-200 bg-white px-4 py-3 shadow-xl max-w-xs">
      <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-500" />
      <p className="text-sm text-gray-700 leading-snug flex-1">{mensaje}</p>
      <button type="button" onClick={onDismiss} className="shrink-0 text-gray-300 hover:text-gray-500 transition-colors"><X size={14} /></button>
    </div>
  )
}

function KanbanSkeleton() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {COLUMNAS.map((col) => (
        <div key={col.id} className="flex w-64 shrink-0 flex-col rounded-xl border border-gray-100 bg-gray-50/80">
          <div className="px-4 py-3 border-b border-gray-100"><div className="h-3.5 w-28 animate-pulse rounded-full bg-gray-200" /></div>
          <div className="flex flex-col gap-2 p-3">{[1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-200/70" />)}</div>
        </div>
      ))}
    </div>
  )
}

const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-colors bg-white'

function NuevaOportunidadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loadingClientes, setLoadingClientes] = useState(true)
  const [clienteId, setClienteId] = useState('')
  const [detalle, setDetalle] = useState('')
  const [monto, setMonto] = useState('')
  const [estadoInicial, setEstadoInicial] = useState<EstadoPipeline>('consulta')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getClientes().then(({ data }) => {
      setClientes(data ?? [])
      if (data && data.length > 0) setClienteId(data[0].id)
      setLoadingClientes(false)
    })
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clienteId) return
    setSaving(true)
    setError(null)
    const payload: Partial<Oportunidad> = {
      cliente_id: clienteId,
      estado_pipeline: estadoInicial,
      detalle_cotizacion: detalle.trim() || null,
      monto: monto ? parseFloat(monto) : null,
    }
    const { error: err } = await createOportunidad(payload)
    setSaving(false)
    if (err) { setError(err.message); return }
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-100">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Nueva oportunidad</h2>
            <p className="text-xs text-gray-400 mt-0.5">Agregá una oportunidad al pipeline</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4 px-6 py-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Cliente <span className="text-red-400">*</span></label>
              {loadingClientes ? <div className="h-10 animate-pulse rounded-lg bg-gray-100" /> : clientes.length === 0 ? (
                <p className="text-sm text-gray-400">No hay clientes. Creá uno primero en la sección Clientes.</p>
              ) : (
                <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} required className={inputClass}>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre || c.telefono || 'Sin nombre'}</option>)}
                </select>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Detalle de cotización</label>
              <textarea value={detalle} onChange={(e) => setDetalle(e.target.value)} placeholder="Descripción del producto o servicio cotizado…" rows={3} className={`${inputClass} resize-none`} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Monto estimado</label>
                <input type="number" min="0" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="$0" className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Estado inicial</label>
                <select value={estadoInicial} onChange={(e) => setEstadoInicial(e.target.value as EstadoPipeline)} className={inputClass}>
                  {COLUMNAS.map((col) => <option key={col.id} value={col.id}>{col.label}</option>)}
                </select>
              </div>
            </div>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 border border-red-100">{error}</p>}
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors">Cancelar</button>
            <button type="submit" disabled={saving || !clienteId || loadingClientes} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm" style={{ backgroundColor: BRAND }}>
              {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
              {saving ? 'Guardando…' : 'Crear oportunidad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function KanbanColumn({ config, tarjetas, onMover }: { config: ColConfig; tarjetas: OportunidadConCliente[]; onMover: (id: string, nuevoEstado: EstadoPipeline) => void }) {
  const EmptyIcon = config.emptyIcon
  return (
    <div className={`flex flex-col rounded-xl border border-gray-200/80 overflow-visible ${config.bg}`} style={{ borderTop: `3px solid ${config.accent}` }}>
      <div className="flex items-center justify-between px-4 py-3">
        <span className={`text-xs font-semibold uppercase tracking-wider ${config.headerText}`}>{config.label}</span>
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums text-white" style={{ backgroundColor: config.accent }}>
          {tarjetas.length}
        </span>
      </div>
      <div className="flex flex-col gap-3 px-3 pb-3 min-h-[200px] overflow-visible">
        {tarjetas.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <div className="w-10 h-10 rounded-full bg-white/80 border border-gray-200 flex items-center justify-center">
              <EmptyIcon size={16} className="text-gray-300" />
            </div>
            <p className="text-xs text-gray-400 leading-tight max-w-[140px]">Las oportunidades en esta etapa se mostrarán aquí.</p>
          </div>
        ) : (
          tarjetas.map((op) => <OportunidadCard key={op.id} oportunidad={op} onMover={onMover} />)
        )}
      </div>
    </div>
  )
}

type OportunidadesPorEstado = Record<EstadoPipeline, OportunidadConCliente[]>

export default function PipelineView() {
  const isMobile = useIsMobile()
  const { oportunidades: oportunidadesRemoto, loading, error: fetchError } = useOportunidadesPorEstado()
  const [localOps, setLocalOps] = useState<OportunidadesPorEstado | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [columnaActiva, setColumnaActiva] = useState<EstadoPipeline>('consulta')
  const sincronizado = useRef(false)

  useEffect(() => {
    if (!loading && !fetchError && !sincronizado.current) {
      sincronizado.current = true
      setLocalOps(oportunidadesRemoto as OportunidadesPorEstado)
    }
  }, [loading, fetchError, oportunidadesRemoto])

  const tablero: OportunidadesPorEstado = useMemo(
    () => localOps ?? { consulta: [], cotizacion_enviada: [], negociacion: [], ganado: [], perdido: [] },
    [localOps]
  )

  const metricas = useMemo(() => {
    const todas = Object.values(tablero).flat()
    const ganadas = tablero.ganado.length
    const perdidas = tablero.perdido.length
    const valorPipeline = todas.filter(o => o.estado_pipeline !== 'perdido').reduce((sum, o) => sum + (o.monto ?? 0), 0)
    const clientesUnicos = new Set(todas.map(o => o.cliente_id)).size
    return { total: todas.length, ganadas, perdidas, valorPipeline, clientesUnicos }
  }, [tablero])

  const formatMonto = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`
    return `$${n.toLocaleString('es-AR')}`
  }

  const handleMover = useCallback(async (id: string, nuevoEstado: EstadoPipeline) => {
    let tarjetaMovida: OportunidadConCliente | null = null
    let estadoAnterior: EstadoPipeline | null = null
    for (const estado of Object.keys(tablero) as EstadoPipeline[]) {
      const found = tablero[estado].find((op) => op.id === id)
      if (found) { tarjetaMovida = found; estadoAnterior = estado; break }
    }
    if (!tarjetaMovida || !estadoAnterior || estadoAnterior === nuevoEstado) return
    setLocalOps((prev) => {
      if (!prev || !tarjetaMovida || !estadoAnterior) return prev
      const siguiente = { ...prev }
      siguiente[estadoAnterior] = siguiente[estadoAnterior].filter((op) => op.id !== id)
      siguiente[nuevoEstado] = [{ ...tarjetaMovida, estado_pipeline: nuevoEstado }, ...siguiente[nuevoEstado]]
      return siguiente
    })
    const { error } = await updateEstadoPipeline(id, nuevoEstado)
    if (error) {
      setLocalOps((prev) => {
        if (!prev || !tarjetaMovida || !estadoAnterior) return prev
        const revertido = { ...prev }
        revertido[nuevoEstado] = revertido[nuevoEstado].filter((op) => op.id !== id)
        revertido[estadoAnterior] = [tarjetaMovida, ...revertido[estadoAnterior]]
        return revertido
      })
      setToastMsg(`Error al mover la oportunidad: ${error.message}`)
    }
  }, [tablero])

  function handleCrearExito() {
    setLocalOps(null)
    window.location.reload()
  }

  return (
    <>
      {/* Header con título + botón */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pipeline</h1>
          <p className="text-sm text-gray-400 mt-0.5">Oportunidades de venta</p>
        </div>
        <button
          type="button"
          onClick={() => setModalAbierto(true)}
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
          style={{ backgroundColor: BRAND }}
        >
          <Plus size={15} strokeWidth={2.5} />
          Nueva oportunidad
        </button>
      </div>

      {/* Métricas */}
      {!loading && !fetchError && (
        <div className="flex gap-3 mb-6 overflow-x-auto pb-1">
          <MetricCard icon={TrendingUp} label="Total de oportunidades" value={String(metricas.total)} sub={`${metricas.ganadas} ganadas · ${metricas.perdidas} perdidas`} iconBg="bg-blue-50" iconColor="text-blue-600" />
          <MetricCard icon={DollarSign} label="Ventas estimadas" value={formatMonto(metricas.valorPipeline)} sub="oportunidades activas" iconBg="bg-emerald-50" iconColor="text-emerald-600" />
          <MetricCard icon={Users} label="Clientes activos" value={String(metricas.clientesUnicos)} sub="en el pipeline" iconBg="bg-violet-50" iconColor="text-violet-600" />
          <MetricCard icon={Inbox} label="Pedidos en proceso" value={String(tablero.negociacion.length + tablero.cotizacion_enviada.length)} sub="cotización + negociación" iconBg="bg-amber-50" iconColor="text-amber-600" />
        </div>
      )}

      {/* Subtítulo kanban */}
      {!loading && !fetchError && (
        <p className="text-xs text-gray-400 mb-3">{metricas.total} oportunidades en total</p>
      )}

      {loading && <KanbanSkeleton />}

      {!loading && fetchError && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-100 bg-red-50 py-16 text-center">
          <p className="text-sm font-medium text-red-700">Error al cargar el pipeline</p>
          <p className="text-xs text-red-400">{fetchError}</p>
          <button onClick={() => window.location.reload()} className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors">
            <RefreshCw size={12} /> Reintentar
          </button>
        </div>
      )}

      {!loading && !fetchError && isMobile && (
        <>
          <div className="flex gap-1.5 overflow-x-auto pb-3 -mx-3 px-3">
            {COLUMNAS.map((col) => {
              const activa = columnaActiva === col.id
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setColumnaActiva(col.id)}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                    activa ? 'text-white shadow-sm' : 'bg-gray-50 text-gray-500 border border-gray-200'
                  }`}
                  style={activa ? { backgroundColor: col.accent } : {}}
                >
                  {col.label}
                  <span className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${activa ? 'bg-white/25' : 'bg-gray-200'}`}>
                    {tablero[col.id].length}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="pb-4">
            {(() => {
              const config = COLUMNAS.find((c) => c.id === columnaActiva)!
              return <KanbanColumn config={config} tarjetas={tablero[columnaActiva]} onMover={handleMover} />
            })()}
          </div>
        </>
      )}

      {!loading && !fetchError && !isMobile && (
        <div className="grid grid-cols-5 gap-3 pb-4">
          {COLUMNAS.map((col) => (
            <KanbanColumn key={col.id} config={col} tarjetas={tablero[col.id]} onMover={handleMover} />
          ))}
        </div>
      )}

      {modalAbierto && <NuevaOportunidadModal onClose={() => setModalAbierto(false)} onSuccess={handleCrearExito} />}
      {toastMsg && <Toast mensaje={toastMsg} onDismiss={() => setToastMsg(null)} />}
    </>
  )
}