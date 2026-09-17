// components/calendar/EventoModal.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X, Trash2, ExternalLink } from 'lucide-react'
import { getClientes } from '@/lib/supabase/queries'
import type { Cliente } from '@/lib/types'

const BRAND = '#1B3FA0'

export interface EventoParaEditar {
  eventId: string
  titulo: string
  descripcion: string
  fecha: string // YYYY-MM-DD
  clienteId: string | null
}

interface EventoModalProps {
  evento?: EventoParaEditar
  onClose: () => void
  onSuccess: () => void
}

const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-colors bg-white'

function hoyISO(): string {
  return new Date().toLocaleDateString('sv-SE')
}

export function EventoModal({ evento, onClose, onSuccess }: EventoModalProps) {
  const esEdicion = !!evento
  const [titulo, setTitulo] = useState(evento?.titulo ?? '')
  const [descripcion, setDescripcion] = useState(evento?.descripcion ?? '')
  const [fecha, setFecha] = useState(evento?.fecha ?? hoyISO())
  const [clienteId, setClienteId] = useState(evento?.clienteId ?? '')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [saving, setSaving] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { getClientes().then(({ data }) => setClientes(data ?? [])) }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim() || !fecha) return
    setSaving(true)
    setError(null)

    const clienteSeleccionado = clientes.find((c) => c.id === clienteId) ?? null
    const payload = {
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      fecha,
      clienteId: clienteSeleccionado?.id ?? null,
      clienteNombre: clienteSeleccionado?.nombre ?? null,
    }

    try {
      const res = await fetch('/api/calendar', {
        method: esEdicion ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(esEdicion ? { ...payload, eventId: evento!.eventId } : payload),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Error al guardar el evento')
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el evento')
    } finally {
      setSaving(false)
    }
  }

  async function handleEliminar() {
    if (!evento) return
    if (!window.confirm('¿Eliminar este evento del calendario? No se puede deshacer.')) return
    setEliminando(true)
    setError(null)
    try {
      const res = await fetch(`/api/calendar?eventId=${encodeURIComponent(evento.eventId)}`, { method: 'DELETE' })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Error al eliminar el evento')
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar el evento')
      setEliminando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-100">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{esEdicion ? 'Editar evento' : 'Nuevo evento'}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Se sincroniza con Google Calendar</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4 px-6 py-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Título <span className="text-red-400">*</span></label>
              <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Llamar para coordinar visita" required className={inputClass} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Fecha <span className="text-red-400">*</span></label>
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Cliente</label>
                <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className={inputClass}>
                  <option value="">Sin vincular</option>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre ?? c.telefono ?? 'Sin nombre'}</option>)}
                </select>
              </div>
            </div>

            {esEdicion && evento?.clienteId && (
              <Link
                href={`/clientes/${evento.clienteId}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium w-fit"
                style={{ color: BRAND }}
              >
                Ver ficha del cliente
                <ExternalLink size={11} />
              </Link>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Nota (opcional)</label>
              <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Detalle del seguimiento…" rows={3} className={`${inputClass} resize-none`} />
            </div>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 border border-red-100">{error}</p>}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-6 py-4">
            {esEdicion ? (
              <button type="button" onClick={handleEliminar} disabled={eliminando || saving} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50">
                <Trash2 size={14} />
                Eliminar
              </button>
            ) : <span />}
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors">Cancelar</button>
              <button type="submit" disabled={saving || eliminando || !titulo.trim()} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm" style={{ backgroundColor: BRAND }}>
                {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                {saving ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear evento'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
