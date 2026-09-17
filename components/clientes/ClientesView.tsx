// components/clientes/ClientesView.tsx
'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Download, Plus, ChevronRight, RefreshCw, Users, Trash2 } from 'lucide-react'
import { useClientes } from '@/lib/supabase/hooks'
import { useIsMobile } from '@/hooks/useIsMobile'
import { eliminarCliente } from '@/lib/supabase/queries'
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
  potencial:            { label: 'Potencial',            classes: 'bg-blue-50 text-blue-700 border border-blue-100' },
  visita_agendada:      { label: 'Visita agendada',      classes: 'bg-violet-50 text-violet-700 border border-violet-100' },
  seguimiento:          { label: 'Seguimiento',          classes: 'bg-amber-50 text-amber-700 border border-amber-100' },
  no_enviaron_medidas:  { label: 'No enviaron medidas',  classes: 'bg-red-50 text-red-600 border border-red-100' },
  cliente:              { label: 'Cliente',              classes: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
  inactivo:             { label: 'Inactivo',             classes: 'bg-gray-50 text-gray-500 border border-gray-200' },
}

const CANAL_BADGE: Record<CanalEntrada, { label: string; classes: string }> = {
  whatsapp:     { label: '💬 WhatsApp',     classes: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
  configurador: { label: '📋 Configurador', classes: 'bg-orange-50 text-orange-700 border border-orange-100' },
  mercadopago:  { label: '💳 MercadoPago',  classes: 'bg-blue-50 text-blue-700 border border-blue-100' },
  manual:       { label: 'Manual',          classes: 'bg-gray-50 text-gray-500 border border-gray-200' },
  pauta:        { label: '📣 Pauta',        classes: 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-100' },
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

function ClienteRow({ cliente, onClick, onDelete }: { cliente: Cliente; onClick: () => void; onDelete: () => void }) {
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
        {cliente.vendedor_nombre ?? <span className="text-gray-300">Sin asignar</span>}
      </td>
      <td className="px-4 py-4 text-sm text-gray-500">
        {formatUltimoContacto(cliente.ultima_interaccion)}
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center justify-end gap-3">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 group-hover:text-blue-600 transition-colors">
            Ver ficha
            <ChevronRight size={12} />
          </span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-1.5 rounded-lg hover:bg-red-50"
            aria-label="Eliminar cliente"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  )
}

function ClienteCardMobile({ cliente, onClick, onDelete }: { cliente: Cliente; onClick: () => void; onDelete: () => void }) {
  const displayName = cliente.nombre ?? cliente.telefono ?? 'Sin nombre'
  const estadoBadge = ESTADO_BADGE[cliente.estado]
  const canalBadge = CANAL_BADGE[cliente.canal_entrada]

  return (
    <div className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-4 active:bg-gray-50 transition-colors">
      <button type="button" onClick={onClick} className="w-full text-left">
        <div className="flex items-center gap-3">
          <ClienteAvatar nombre={displayName} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">{displayName}</p>
            {cliente.telefono && <p className="text-xs text-gray-400 mt-0.5">{cliente.telefono}</p>}
          </div>
          <ChevronRight size={16} className="text-gray-300 shrink-0" />
        </div>
      </button>
      <div className="flex items-center flex-wrap gap-2 mt-3">
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoBadge.classes}`}>
          {estadoBadge.label}
        </span>
        <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-medium ${canalBadge.classes}`}>
          {canalBadge.label}
        </span>
        {cliente.vendedor_nombre && (
          <span className="text-xs text-gray-400">· {cliente.vendedor_nombre}</span>
        )}
        <span className="text-xs text-gray-400 ml-auto">{formatUltimoContacto(cliente.ultima_interaccion)}</span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="text-gray-300 hover:text-red-500 transition-colors p-1 -m-1 rounded-lg"
          aria-label="Eliminar cliente"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

export default function ClientesView() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const { clientes, loading, error, refetch } = useClientes()
  const [busqueda, setBusqueda] = useState('')
  const [vendedorFiltro, setVendedorFiltro] = useState('todos')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  async function handleDelete(cliente: Cliente) {
    const nombre = cliente.nombre ?? cliente.telefono ?? 'este cliente'
    if (!window.confirm(`¿Eliminar a ${nombre}? Se puede restaurar desde la Papelera. Sus oportunidades activas también se enviarán a la papelera.`)) return
    const { error: err } = await eliminarCliente(cliente.id)
    if (err) { setToastMsg(`Error al eliminar: ${err}`); return }
    refetch()
  }

  const vendedoresConClientes = useMemo(() => {
    const nombres = clientes.map((c) => c.vendedor_nombre).filter((n): n is string => !!n)
    return [...new Set(nombres)].sort()
  }, [clientes])

  const clientesFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim()
    return clientes.filter((c) => {
      const pasaBusqueda = !q || c.nombre.toLowerCase().includes(q) || (c.telefono ?? '').includes(q)
      const pasaVendedor = vendedorFiltro === 'todos' || c.vendedor_nombre === vendedorFiltro
      return pasaBusqueda && pasaVendedor
    })
  }, [clientes, busqueda, vendedorFiltro])

  // Métricas
  const metricas = useMemo(() => ({
    total: clientes.length,
    clientes: clientes.filter(c => c.estado === 'cliente').length,
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
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
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
            <span className="hidden sm:inline">Exportar CSV</span>
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total clientes', value: metricas.total, sub: 'en el sistema', iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
          { label: 'Clientes', value: metricas.clientes, sub: 'convirtieron la venta', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
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
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o teléfono…"
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-colors shadow-sm"
          />
        </div>
        {vendedoresConClientes.length > 0 && (
          <select
            value={vendedorFiltro}
            onChange={(e) => setVendedorFiltro(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-colors shadow-sm"
          >
            <option value="todos">Todos los vendedores</option>
            {vendedoresConClientes.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        )}
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
        ) : isMobile ? (
          <div className="flex flex-col gap-2 p-3">
            {clientesFiltrados.map((cliente) => (
              <ClienteCardMobile key={cliente.id} cliente={cliente} onClick={() => router.push(`/clientes/${cliente.id}`)} onDelete={() => handleDelete(cliente)} />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Canal</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Vendedor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Último contacto</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {clientesFiltrados.map((cliente) => (
                  <ClienteRow key={cliente.id} cliente={cliente} onClick={() => router.push(`/clientes/${cliente.id}`)} onDelete={() => handleDelete(cliente)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalAbierto && (
        <NuevoClienteModal onClose={() => setModalAbierto(false)} onSuccess={() => { refetch(); setModalAbierto(false) }} />
      )}

      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 flex items-start gap-2.5 rounded-xl border border-red-200 bg-white px-4 py-3 shadow-xl max-w-xs">
          <p className="text-sm text-gray-700 leading-snug flex-1">{toastMsg}</p>
          <button type="button" onClick={() => setToastMsg(null)} className="shrink-0 text-gray-300 hover:text-gray-500 transition-colors text-xs">✕</button>
        </div>
      )}
    </>
  )
}