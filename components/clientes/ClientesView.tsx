// components/clientes/ClientesView.tsx
'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Download, Plus, ChevronRight, RefreshCw, Users } from 'lucide-react'
import { useClientes } from '@/lib/supabase/hooks'
import ClienteAvatar from './ClienteAvatar'
import NuevoClienteModal from './NuevoClienteModal'
import type { Cliente, CanalEntrada, EstadoCliente } from '@/lib/types'

const BRAND = '#1B3FA0'

function formatUltimoContacto(fecha: string | null): string {
  if (!fecha) return '—'
  const d = new Date(fecha)
  const diffDias = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (diffDias === 0) return 'Hoy'
  if (diffDias === 1) return 'Ayer'
  if (diffDias < 30) return `Hace ${diffDias} días`
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

const ESTADO_BADGE: Record<EstadoCliente, { label: string; classes: string }> = {
  potencial:      { label: 'Potencial',      classes: 'bg-blue-50 text-blue-700 border border-blue-100' },
  en_seguimiento: { label: 'En seguimiento', classes: 'bg-amber-50 text-amber-700 border border-amber-100' },
  activo:         { label: 'Activo',         classes: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
  inactivo:       { label: 'Inactivo',       classes: 'bg-gray-50 text-gray-500 border border-gray-200' },
  sin_ficha:      { label: 'Sin ficha',      classes: 'bg-white text-gray-400 border border-dashed border-gray-300' },
}

const CANAL_BADGE: Record<CanalEntrada, { label: string; classes: string }> = {
  whatsapp:     { label: '💬 WhatsApp',     classes: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
  configurador: { label: '📋 Configurador', classes: 'bg-orange-50 text-orange-700 border border-orange-100' },
  mercadopago:  { label: '💳 MercadoPago',  classes: 'bg-blue-50 text-blue-700 border border-blue-100' },
  manual:       { label: 'Manual',          classes: 'bg-gray-50 text-gray-500 border border-gray-200' },
}

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-gray-50 px-6 py-4 last:border-0">
          <div className="h-10 w-10 animate-pulse rounded-full bg-gray-100" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-3.5 w-40 animate-pulse rounded bg-gray-100" />
            <div className="h-3 w-28 animate-pulse rounded bg-gray-50" />
          </div>
          <div className="h-6 w-24 animate-pulse rounded-full bg-gray-100" />
          <div className="h-6 w-28 animate-pulse rounded-md bg-gray-100" />
          <div className="h-4 w-16 animate-pulse rounded bg-gray-50" />
        </div>
      ))}
    </div>
  )
}

function ClienteRow({ cliente, onClick }: { cliente: Cliente; onClick: () => void }) {
  const displayName = cliente.nombre ?? cliente.telefono ?? 'Sin nombre'
  const estadoBadge = ESTADO_BADGE[cliente.estado]
  const canalBadge = CANAL_BADGE[cliente.canal_entrada]

  return (
    <tr
      onClick={onClick}
      className="cursor-pointer border-b border-gray-50 transition-colors hover:bg-blue-50/30 last:border-0 group"
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-3.5">
          <ClienteAvatar nombre={displayName} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{displayName}</p>
            {cliente.telefono && (
              <p className="text-xs text-gray-400 mt-0.5">{cliente.telefono}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoBadge.classes}`}>
          {estadoBadge.label}
        </span>
      </td>
      <td className="px-4 py-4">
        <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-medium ${canalBadge.classes}`}>
          {canalBadge.label}
        </span>
      </td>
      <td className="px-4 py-4 text-sm text-gray-500">
        {formatUltimoContacto(cliente.ultima_interaccion)}
      </td>
      <td className="px-4 py-4">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 group-hover:text-blue-600 transition-colors">
          Ver ficha
          <ChevronRight size={12} />
        </span>
      </td>
    </tr>
  )
}

export default function ClientesView() {
  const router = useRouter()
  const { clientes, loading, error, refetch } = useClientes()
  const [busqueda, setBusqueda] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)

  const clientesFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim()
    if (!q) return clientes
    return clientes.filter(
      (c) => c.nombre.toLowerCase().includes(q) || (c.telefono ?? '').includes(q)
    )
  }, [clientes, busqueda])

  // Métricas
  const metricas = useMemo(() => ({
    total: clientes.length,
    activos: clientes.filter(c => c.estado === 'activo').length,
    potenciales: clientes.filter(c => c.estado === 'potencial').length,
    inactivos: clientes.filter(c => c.estado === 'inactivo').length,
  }), [clientes])

  if (loading) return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div><div className="h-7 w-32 animate-pulse rounded bg-gray-100" /><div className="h-4 w-48 animate-pulse rounded bg-gray-50 mt-2" /></div>
      </div>
      <TableSkeleton />
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-red-100 bg-red-50 py-16 text-center">
      <p className="text-sm font-medium text-red-700">Error al cargar los clientes</p>
      <p className="text-xs text-red-500">{error}</p>
      <button onClick={() => refetch()} className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors">
        <RefreshCw size={12} /> Reintentar
      </button>
    </div>
  )

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-400 mt-0.5">Gestión y seguimiento de toda la cartera</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => alert('Funcionalidad próximamente')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Download size={14} />
            Exportar CSV
          </button>
          <button
            type="button"
            onClick={() => setModalAbierto(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
            style={{ backgroundColor: BRAND }}
          >
            <Plus size={14} strokeWidth={2.5} />
            Nuevo cliente
          </button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total clientes', value: metricas.total, sub: 'en el sistema', iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
          { label: 'Activos', value: metricas.activos, sub: 'compraron al menos una vez', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
          { label: 'Potenciales', value: metricas.potenciales, sub: 'en seguimiento comercial', iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
          { label: 'Inactivos', value: metricas.inactivos, sub: 'sin contacto reciente', iconBg: 'bg-gray-50', iconColor: 'text-gray-400' },
        ].map((m) => (
          <div key={m.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${m.iconBg}`}>
                <Users size={16} strokeWidth={2} className={m.iconColor} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 font-medium truncate">{m.label}</p>
                <p className="text-xl font-bold text-gray-900 leading-tight">{m.value}</p>
                <p className="text-[11px] text-gray-400 truncate">{m.sub}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Buscador */}
      <div className="relative mb-4 max-w-sm">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o teléfono…"
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-colors shadow-sm"
        />
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3">
          <p className="text-xs text-gray-400">
            {clientesFiltrados.length} {clientesFiltrados.length === 1 ? 'cliente' : 'clientes'}
            {busqueda && ` · búsqueda "${busqueda}"`}
          </p>
        </div>

        {clientesFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mb-1">
              <Users size={20} className="text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-700">
              {busqueda ? 'Sin resultados' : 'No hay clientes aún'}
            </p>
            <p className="text-xs text-gray-400">
              {busqueda ? `No se encontró ningún cliente con "${busqueda}"` : 'Creá el primero con el botón + Nuevo cliente'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Canal</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Último contacto</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {clientesFiltrados.map((cliente) => (
                  <ClienteRow key={cliente.id} cliente={cliente} onClick={() => router.push(`/clientes/${cliente.id}`)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalAbierto && (
        <NuevoClienteModal onClose={() => setModalAbierto(false)} onSuccess={() => { refetch(); setModalAbierto(false) }} />
      )}
    </>
  )
}