// components/whatsapp/NuevaOportunidadModal.tsx
'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { createOportunidad } from '@/lib/supabase/queries'
import type { Cliente, EstadoPipeline } from '@/lib/types'

const BRAND = '#1B3FA0'

const ESTADOS: { id: EstadoPipeline; label: string }[] = [
  { id: 'consulta', label: 'Consulta' },
  { id: 'cotizacion_enviada', label: 'Cotización enviada' },
  { id: 'negociacion', label: 'Negociación' },
]

const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-colors bg-white'

interface Props {
  cliente: Cliente
  onClose: () => void
  onSuccess: () => void
}

// Crea una oportunidad para un cliente ya elegido (el de la conversación abierta)
export default function NuevaOportunidadModal({ cliente, onClose, onSuccess }: Props) {
  const [detalle, setDetalle] = useState('')
  const [monto, setMonto] = useState('')
  const [estado, setEstado] = useState<EstadoPipeline>('consulta')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const { error: err } = await createOportunidad({
      cliente_id: cliente.id,
      estado_pipeline: estado,
      detalle_cotizacion: detalle.trim() || null,
      monto: monto ? parseFloat(monto) : null,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-100">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900">Nueva oportunidad</h2>
            <p className="text-xs text-gray-400 mt-0.5 truncate">Para {cliente.nombre || cliente.telefono}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4 px-6 py-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Detalle de cotización</label>
              <textarea value={detalle} onChange={(e) => setDetalle(e.target.value)} placeholder="Descripción del producto o servicio cotizado…" rows={3} className={`${inputClass} resize-none`} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Monto estimado</label>
                <input type="number" min="0" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="$0" className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Estado inicial</label>
                <select value={estado} onChange={(e) => setEstado(e.target.value as EstadoPipeline)} className={inputClass}>
                  {ESTADOS.map((col) => <option key={col.id} value={col.id}>{col.label}</option>)}
                </select>
              </div>
            </div>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 border border-red-100">{error}</p>}
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm" style={{ backgroundColor: BRAND }}>
              {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
              {saving ? 'Guardando…' : 'Crear oportunidad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
