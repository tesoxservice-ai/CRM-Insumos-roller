// components/reportes/ReportesView.tsx
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  Users, TrendingUp, Target, DollarSign, RefreshCw,
  PhoneCall, AlertCircle, ExternalLink, ArrowUpRight,
  CheckCircle2, XCircle, Clock, MessageCircle,
} from 'lucide-react'
import { getReportesData } from '@/lib/supabase/queries'
import type { Cliente, Oportunidad, Interaccion } from '@/lib/types'
import type { EstadoCliente, EstadoPipeline, CanalEntrada, TipoInteraccion } from '@/lib/types'

const BRAND = '#1B3FA0'

const ESTADO_PIPELINE_LABELS: Record<EstadoPipeline, string> = {
  consulta: 'Consulta', cotizacion_enviada: 'Cotización enviada',
  negociacion: 'Negociación', ganado: 'Ganado', perdido: 'Perdido',
}
const ESTADO_PIPELINE_COLORS: Record<EstadoPipeline, string> = {
  consulta: 'bg-slate-400', cotizacion_enviada: 'bg-blue-500',
  negociacion: 'bg-amber-400', ganado: 'bg-emerald-500', perdido: 'bg-red-400',
}
const CANAL_LABELS: Record<CanalEntrada, string> = {
  whatsapp: 'WhatsApp', configurador: 'Configurador', mercadopago: 'MercadoPago', manual: 'Manual',
}
const CANAL_COLORS: Record<CanalEntrada, string> = {
  whatsapp: 'bg-emerald-500', configurador: 'bg-blue-500', mercadopago: 'bg-sky-400', manual: 'bg-gray-300',
}
const TIPO_LABELS: Record<TipoInteraccion, string> = {
  llamada: 'Llamada', whatsapp: 'WhatsApp', email: 'Email', reunion: 'Reunión', nota: 'Nota',
}
const TIPO_COLORS: Record<TipoInteraccion, string> = {
  llamada: 'bg-blue-500', whatsapp: 'bg-emerald-500', email: 'bg-violet-500', reunion: 'bg-orange-400', nota: 'bg-gray-300',
}

const ESTADOS_PIPELINE_ALL: EstadoPipeline[] = ['consulta', 'cotizacion_enviada', 'negociacion', 'ganado', 'perdido']
const CANALES_ALL: CanalEntrada[] = ['whatsapp', 'configurador', 'mercadopago', 'manual']
const TIPOS_ALL: TipoInteraccion[] = ['llamada', 'whatsapp', 'email', 'reunion', 'nota']

function formatMonto(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`
  return `$${n.toLocaleString('es-AR')}`
}
function diasDesde(fecha: string): number {
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000)
}
function formatUltimoContacto(fecha: string | null): string {
  if (!fecha) return 'Nunca'
  const dias = diasDesde(fecha)
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Ayer'
  return `hace ${dias} días`
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, iconBg, iconColor, trend }: {
  icon: React.ElementType; label: string; value: string; sub: string
  iconBg: string; iconColor: string; trend?: { value: string; positive: boolean }
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon size={18} strokeWidth={2} className={iconColor} />
        </div>
        {trend && (
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
            trend.positive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
          }`}>
            <ArrowUpRight size={11} className={trend.positive ? '' : 'rotate-90'} />
            {trend.value}
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-gray-900 leading-none mb-1">{value}</p>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  )
}

// ── Bar Chart Row ─────────────────────────────────────────────────────────────

function BarRow({ label, count, total, barClass }: { label: string; count: number; total: number; barClass: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 w-40 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs text-gray-400 w-20 text-right shrink-0 tabular-nums">
        {count} <span className="text-gray-200 mx-0.5">·</span> {pct}%
      </div>
    </div>
  )
}

// ── Section Card ──────────────────────────────────────────────────────────────

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="w-10 h-10 bg-gray-100 rounded-xl mb-4" />
            <div className="h-8 w-20 bg-gray-100 rounded mb-2" />
            <div className="h-3 w-28 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="h-4 w-40 bg-gray-100 rounded mb-5" />
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="flex items-center gap-3 mb-3">
                <div className="h-3 w-28 bg-gray-100 rounded" />
                <div className="flex-1 h-2 bg-gray-100 rounded-full" />
                <div className="h-3 w-12 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

function useReportesData() {
  const [state, setState] = useState({ clientes: [] as Cliente[], oportunidades: [] as Oportunidad[], interacciones: [] as Interaccion[], loading: true, error: null as string | null })
  const fetch = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    const result = await getReportesData()
    setState({ clientes: result.clientes, oportunidades: result.oportunidades, interacciones: result.interacciones, loading: false, error: result.error })
  }, [])
  useEffect(() => { fetch() }, [fetch])
  return { ...state, refetch: fetch }
}

// ── Componente principal ──────────────────────────────────────────────────────

export function ReportesView() {
  const { clientes, oportunidades, interacciones, loading, error, refetch } = useReportesData()

  const m = useMemo(() => {
    const activos = clientes.filter((c) => c.estado === 'activo').length
    const abiertas = oportunidades.filter((o) => o.estado_pipeline !== 'ganado' && o.estado_pipeline !== 'perdido')
    const ganadas = oportunidades.filter((o) => o.estado_pipeline === 'ganado').length
    const perdidas = oportunidades.filter((o) => o.estado_pipeline === 'perdido').length
    const tasaCierre = ganadas + perdidas > 0 ? ((ganadas / (ganadas + perdidas)) * 100).toFixed(1) : null
    const valorPipeline = abiertas.reduce((sum, o) => sum + (o.monto ?? 0), 0)

    const pipelineByEstado = Object.fromEntries(ESTADOS_PIPELINE_ALL.map(e => [e, 0])) as Record<EstadoPipeline, number>
    for (const o of oportunidades) pipelineByEstado[o.estado_pipeline]++

    const clientesByCanal = Object.fromEntries(CANALES_ALL.map(c => [c, 0])) as Record<CanalEntrada, number>
    for (const c of clientes) clientesByCanal[c.canal_entrada]++

    const interaccionesByTipo = Object.fromEntries(TIPOS_ALL.map(t => [t, 0])) as Record<TipoInteraccion, number>
    for (const i of interacciones) interaccionesByTipo[i.tipo]++

    const sinContacto = clientes
      .filter((c) => !c.ultima_interaccion || diasDesde(c.ultima_interaccion) > 30)
      .sort((a, b) => {
        if (!a.ultima_interaccion) return -1
        if (!b.ultima_interaccion) return 1
        return new Date(a.ultima_interaccion).getTime() - new Date(b.ultima_interaccion).getTime()
      })
      .slice(0, 5)

    return {
      activos, abiertasCount: abiertas.length, ganadas, perdidas,
      tasaCierre, valorPipeline, pipelineByEstado, clientesByCanal,
      interaccionesByTipo, sinContacto,
      totalOportunidades: oportunidades.length,
      totalClientes: clientes.length,
      totalInteracciones: interacciones.length,
    }
  }, [clientes, oportunidades, interacciones])

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reportes</h1>
          <p className="text-sm text-gray-400 mt-0.5">Métricas y estadísticas del negocio</p>
        </div>
        {!loading && !error && (
          <button onClick={refetch} className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100 border border-gray-200 bg-white shadow-sm">
            <RefreshCw size={12} /> Actualizar
          </button>
        )}
      </div>

      {loading ? <LoadingSkeleton /> : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
            <AlertCircle size={18} className="text-red-400" />
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">No se pudieron cargar los reportes</p>
          <p className="text-xs text-gray-400 mb-4">{error}</p>
          <button onClick={refetch} className="text-xs font-semibold px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors" style={{ backgroundColor: BRAND }}>
            Reintentar
          </button>
        </div>
      ) : (
        <div className="space-y-5">

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon={Users} label="Clientes activos"
              value={String(m.activos)} sub={`de ${m.totalClientes} en total`}
              iconBg="bg-blue-50" iconColor="text-blue-600"
            />
            <KpiCard
              icon={DollarSign} label="Valor pipeline"
              value={formatMonto(m.valorPipeline)} sub={`${m.abiertasCount} oportunidades abiertas`}
              iconBg="bg-emerald-50" iconColor="text-emerald-600"
            />
            <KpiCard
              icon={Target} label="Tasa de cierre"
              value={m.tasaCierre ? `${m.tasaCierre}%` : '—'}
              sub={`${m.ganadas} ganadas · ${m.perdidas} perdidas`}
              iconBg="bg-violet-50" iconColor="text-violet-600"
            />
            <KpiCard
              icon={TrendingUp} label="Total oportunidades"
              value={String(m.totalOportunidades)} sub={`${m.totalInteracciones} interacciones registradas`}
              iconBg="bg-amber-50" iconColor="text-amber-600"
            />
          </div>

          {/* Resumen rápido */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <CheckCircle2 size={18} className="text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{m.ganadas}</p>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Ganadas</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <XCircle size={18} className="text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{m.perdidas}</p>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Perdidas</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Clock size={18} className="text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{m.abiertasCount}</p>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">En curso</p>
              </div>
            </div>
          </div>

          {/* Gráficas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SectionCard title="Pipeline por estado" subtitle="Distribución de oportunidades">
              <div className="space-y-4">
                {ESTADOS_PIPELINE_ALL.map((estado) => (
                  <BarRow key={estado} label={ESTADO_PIPELINE_LABELS[estado]} count={m.pipelineByEstado[estado]} total={m.totalOportunidades} barClass={ESTADO_PIPELINE_COLORS[estado]} />
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Clientes por canal" subtitle="Origen de cada cliente">
              <div className="space-y-4">
                {CANALES_ALL.map((canal) => (
                  <BarRow key={canal} label={CANAL_LABELS[canal]} count={m.clientesByCanal[canal]} total={m.totalClientes} barClass={CANAL_COLORS[canal]} />
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Interacciones por tipo" subtitle={`${m.totalInteracciones} registradas en total`}>
              <div className="space-y-4">
                {TIPOS_ALL.map((tipo) => (
                  <BarRow key={tipo} label={TIPO_LABELS[tipo]} count={m.interaccionesByTipo[tipo]} total={m.totalInteracciones} barClass={TIPO_COLORS[tipo]} />
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Clientes sin contacto reciente" subtitle="Sin interacción en los últimos 30 días">
              {m.sinContacto.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                    <PhoneCall size={18} className="text-emerald-500" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Todo al día</p>
                  <p className="text-xs text-gray-400">Todos los clientes tienen contacto reciente</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {m.sinContacto.map((cliente) => (
                    <Link
                      key={cliente.id}
                      href={`/clientes/${cliente.id}`}
                      className="flex items-center justify-between py-3 px-3 rounded-xl hover:bg-blue-50/30 group transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-blue-700 transition-colors">
                          {cliente.nombre}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{cliente.telefono ?? 'Sin teléfono'}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                          !cliente.ultima_interaccion
                            ? 'bg-red-50 text-red-500 border-red-100'
                            : 'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                          {formatUltimoContacto(cliente.ultima_interaccion ?? null)}
                        </span>
                        <ExternalLink size={12} className="text-gray-300 group-hover:text-blue-400 transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

        </div>
      )}
    </div>
  )
}