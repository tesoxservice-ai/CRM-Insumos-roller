// components/clientes/FichaClienteView.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Phone, Edit, RefreshCw,
  Phone as PhoneIcon, MessageCircle, Mail, Users, FileText, Plus,
  Calendar, Tag, type LucideIcon,
} from 'lucide-react'
import { useCliente } from '@/lib/supabase/hooks'
import { createInteraccion } from '@/lib/supabase/queries'
import EditarClienteModal from './EditarClienteModal'
import ClienteAvatar from './ClienteAvatar'
import type { CanalEntrada, EstadoCliente, EstadoPipeline, Interaccion, Oportunidad, TipoInteraccion } from '@/lib/types'

const BRAND = '#1B3FA0'

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function formatFechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
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

const PIPELINE_BADGE: Record<EstadoPipeline, { label: string; classes: string }> = {
  consulta:           { label: 'Consulta',           classes: 'bg-gray-50 text-gray-600 border border-gray-200' },
  cotizacion_enviada: { label: 'Cotización enviada', classes: 'bg-blue-50 text-blue-700 border border-blue-100' },
  negociacion:        { label: 'Negociación',        classes: 'bg-amber-50 text-amber-700 border border-amber-100' },
  ganado:             { label: 'Ganado',             classes: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
  perdido:            { label: 'Perdido',            classes: 'bg-red-50 text-red-600 border border-red-100' },
}

const INTERACCION_CONFIG: Record<TipoInteraccion, { icon: LucideIcon; bg: string; color: string }> = {
  llamada:  { icon: PhoneIcon,      bg: 'bg-blue-50',    color: 'text-blue-500' },
  whatsapp: { icon: MessageCircle,  bg: 'bg-emerald-50', color: 'text-emerald-500' },
  email:    { icon: Mail,           bg: 'bg-violet-50',  color: 'text-violet-500' },
  reunion:  { icon: Users,          bg: 'bg-orange-50',  color: 'text-orange-500' },
  nota:     { icon: FileText,       bg: 'bg-gray-50',    color: 'text-gray-400' },
}

const TIPO_OPTIONS: { value: TipoInteraccion; label: string }[] = [
  { value: 'llamada',  label: 'Llamada' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email',    label: 'Email' },
  { value: 'reunion',  label: 'Reunión' },
  { value: 'nota',     label: 'Nota' },
]

const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-colors bg-white'

function CardOportunidades({ oportunidades }: { oportunidades: Oportunidad[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Oportunidades</h3>
        <span className="text-xs text-gray-400">{oportunidades.length} en total</span>
      </div>
      <div className="px-6 py-4">
        {oportunidades.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mb-2">
              <Tag size={16} className="text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">Sin oportunidades registradas</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {oportunidades.map((op) => {
              const { label, classes } = PIPELINE_BADGE[op.estado_pipeline]
              return (
                <li key={op.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-700">{op.detalle_cotizacion ?? 'Sin detalle'}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{formatFechaCorta(op.created_at)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${classes}`}>{label}</span>
                    {op.monto !== null && (
                      <span className="text-sm font-bold text-gray-900">${op.monto.toLocaleString('es-AR')}</span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

function CardHistorial({ interacciones, clienteId, onNuevaInteraccion }: { interacciones: Interaccion[]; clienteId: string; onNuevaInteraccion: () => void }) {
  const [modalEdicion, setModalEdicion] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [tipo, setTipo] = useState<TipoInteraccion>('nota')
  const [descripcion, setDescripcion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault()
    if (!descripcion.trim()) return
    setLoading(true)
    setError(null)
    const { error: err } = await createInteraccion({ cliente_id: clienteId, tipo, descripcion: descripcion.trim() })
    setLoading(false)
    if (err) { setError(err.message); return }
    setDescripcion('')
    setTipo('nota')
    setMostrarForm(false)
    onNuevaInteraccion()
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Historial de interacciones</h3>
        {!mostrarForm && (
          <button
            type="button"
            onClick={() => setMostrarForm(true)}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-all hover:opacity-90"
            style={{ backgroundColor: BRAND }}
          >
            <Plus size={12} strokeWidth={2.5} />
            Registrar
          </button>
        )}
      </div>

      <div className="px-6 py-4 space-y-4">
        {mostrarForm && (
          <form onSubmit={handleGuardar} className="rounded-xl border border-blue-100 bg-blue-50/30 p-4 space-y-3">
            <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoInteraccion)} className={inputClass}>
              {TIPO_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Descripción de la interacción…" rows={2} required className={`${inputClass} resize-none`} />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setMostrarForm(false); setError(null); setDescripcion('') }} className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={loading || !descripcion.trim()} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all" style={{ backgroundColor: BRAND }}>
                {loading && <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                Guardar
              </button>
            </div>
          </form>
        )}

        {interacciones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mb-2">
              <FileText size={16} className="text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">Sin interacciones registradas</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {interacciones.map((inter) => {
              const cfg = INTERACCION_CONFIG[inter.tipo]
              const Icon = cfg.icon
              return (
                <li key={inter.id} className="flex gap-3.5">
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cfg.bg}`}>
                    <Icon size={14} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                    <p className="text-sm text-gray-700 leading-snug">{inter.descripcion}</p>
                    <p className="mt-1 text-[11px] text-gray-400">{formatFecha(inter.created_at)}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

export default function FichaClienteView({ id }: { id: string }) {
  const router = useRouter()
  const { cliente, loading, error, refetch } = useCliente(id)
  const [modalEdicion, setModalEdicion] = useState(false)

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-5 w-32 bg-gray-100 rounded" />
      <div className="h-36 bg-gray-100 rounded-2xl" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-64 bg-gray-100 rounded-2xl" />
        <div className="h-64 bg-gray-100 rounded-2xl" />
      </div>
    </div>
  )

  if (error || !cliente) return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-red-100 bg-red-50 py-16 text-center">
      <p className="text-sm font-medium text-red-700">{error ?? 'Cliente no encontrado'}</p>
      <button onClick={() => refetch()} className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors">
        <RefreshCw size={12} /> Reintentar
      </button>
    </div>
  )

  const estadoBadge = ESTADO_BADGE[cliente.estado]
  const canalBadge = CANAL_BADGE[cliente.canal_entrada]

  return (
    <div className="space-y-5">

      {/* Nav */}
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => router.push('/clientes')} className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors font-medium">
          <ArrowLeft size={15} />
          Volver a clientes
        </button>
        <button type="button" onClick={() => setModalEdicion(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm">
          <Edit size={14} />
          Editar ficha
        </button>
      </div>

      {/* Header cliente */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-6">
        <div className="flex flex-wrap items-start gap-5">
          <ClienteAvatar nombre={cliente.nombre} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{cliente.nombre}</h1>
              <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold ${estadoBadge.classes}`}>
                {estadoBadge.label}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {cliente.telefono && (
                <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                  <Phone size={13} className="text-gray-400" />
                  {cliente.telefono}
                </span>
              )}
              <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-medium ${canalBadge.classes}`}>
                {canalBadge.label}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                <Calendar size={12} />
                Alta: {formatFechaCorta(cliente.created_at)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          {/* Datos */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">Datos del cliente</h3>
            </div>
            <div className="px-6 py-4 space-y-0">
              {[
                { label: 'Nombre', value: cliente.nombre },
                { label: 'Teléfono', value: cliente.telefono ?? '—' },
                { label: 'Estado', value: <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoBadge.classes}`}>{estadoBadge.label}</span> },
                { label: 'Canal de entrada', value: <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-medium ${canalBadge.classes}`}>{canalBadge.label}</span> },
                { label: 'Fecha de alta', value: formatFechaCorta(cliente.created_at) },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
                  <span className="text-sm text-gray-700 font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <CardOportunidades oportunidades={cliente.oportunidades} />
        </div>

        <CardHistorial interacciones={cliente.interacciones} clienteId={cliente.id} onNuevaInteraccion={refetch} />
      </div>

      {modalEdicion && (
        <EditarClienteModal
          cliente={cliente}
          onClose={() => setModalEdicion(false)}
          onSuccess={() => { refetch(); setModalEdicion(false) }}
        />
      )}
    </div>
  )
}