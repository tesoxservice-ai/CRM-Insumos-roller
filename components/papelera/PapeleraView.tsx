// components/papelera/PapeleraView.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Trash2, RotateCcw, AlertCircle, Users, KanbanSquare, RefreshCw } from 'lucide-react'
import {
  getPapelera,
  restaurarCliente,
  eliminarClientePermanente,
  restaurarOportunidad,
  eliminarOportunidadPermanente,
  type OportunidadConCliente,
} from '@/lib/supabase/queries'
import type { Cliente } from '@/lib/types'

function formatFecha(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatMonto(n: number): string {
  return `$${Math.round(n).toLocaleString('es-AR')}`
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
      </div>
      <div className="divide-y divide-gray-50">{children}</div>
    </div>
  )
}

function EmptyRow({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mb-2">
        <Trash2 size={16} className="text-gray-300" />
      </div>
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  )
}

function AccionesFila({ onRestaurar, onEliminar, procesando }: { onRestaurar: () => void; onEliminar: () => void; procesando: boolean }) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        type="button"
        onClick={onRestaurar}
        disabled={procesando}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        <RotateCcw size={12} />
        Restaurar
      </button>
      <button
        type="button"
        onClick={onEliminar}
        disabled={procesando}
        className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 bg-white px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
      >
        <Trash2 size={12} />
        Eliminar definitivo
      </button>
    </div>
  )
}

export function PapeleraView() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [oportunidades, setOportunidades] = useState<OportunidadConCliente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [procesandoId, setProcesandoId] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    const data = await getPapelera()
    if (data.error) { setError(data.error); setLoading(false); return }
    setClientes(data.clientes)
    setOportunidades(data.oportunidades)
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function handleRestaurarCliente(id: string) {
    setProcesandoId(id)
    const { error: err } = await restaurarCliente(id)
    setProcesandoId(null)
    if (err) { setToastMsg(`Error al restaurar: ${err}`); return }
    setClientes((prev) => prev.filter((c) => c.id !== id))
  }

  async function handleEliminarClientePermanente(cliente: Cliente) {
    const nombre = cliente.nombre ?? cliente.telefono ?? 'este cliente'
    if (!window.confirm(`Esto borra a ${nombre} para siempre, junto con sus oportunidades e interacciones. No se puede deshacer. ¿Continuar?`)) return
    setProcesandoId(cliente.id)
    const { error: err } = await eliminarClientePermanente(cliente.id)
    setProcesandoId(null)
    if (err) { setToastMsg(`Error al eliminar: ${err}`); return }
    setClientes((prev) => prev.filter((c) => c.id !== cliente.id))
  }

  async function handleRestaurarOportunidad(id: string) {
    setProcesandoId(id)
    const { error: err } = await restaurarOportunidad(id)
    setProcesandoId(null)
    if (err) { setToastMsg(`Error al restaurar: ${err}`); return }
    setOportunidades((prev) => prev.filter((o) => o.id !== id))
  }

  async function handleEliminarOportunidadPermanente(oportunidad: OportunidadConCliente) {
    if (!window.confirm('Esto borra la oportunidad para siempre. No se puede deshacer. ¿Continuar?')) return
    setProcesandoId(oportunidad.id)
    const { error: err } = await eliminarOportunidadPermanente(oportunidad.id)
    setProcesandoId(null)
    if (err) { setToastMsg(`Error al eliminar: ${err}`); return }
    setOportunidades((prev) => prev.filter((o) => o.id !== oportunidad.id))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Papelera</h1>
        <p className="text-sm text-gray-400 mt-0.5">Clientes y oportunidades eliminados — restaurá o borrá para siempre</p>
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-40 bg-gray-100 rounded-2xl" />
          <div className="h-40 bg-gray-100 rounded-2xl" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
            <AlertCircle size={18} className="text-red-400" />
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">No se pudo cargar la papelera</p>
          <p className="text-xs text-gray-400 mb-4">{error}</p>
          <button onClick={cargar} className="text-xs font-semibold px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors" style={{ backgroundColor: '#1B3FA0' }}>
            Reintentar
          </button>
        </div>
      ) : (
        <div className="space-y-5">

          <SectionCard title="Clientes eliminados" subtitle={`${clientes.length} en la papelera`}>
            {clientes.length === 0 ? (
              <EmptyRow label="No hay clientes eliminados" />
            ) : (
              clientes.map((cliente) => (
                <div key={cliente.id} className="flex items-center justify-between gap-3 px-6 py-4 flex-wrap">
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                      <Users size={14} className="text-gray-300" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{cliente.nombre ?? cliente.telefono ?? 'Sin nombre'}</p>
                      <p className="text-xs text-gray-400">Eliminado el {formatFecha(cliente.deleted_at)}</p>
                    </div>
                  </div>
                  <AccionesFila
                    procesando={procesandoId === cliente.id}
                    onRestaurar={() => handleRestaurarCliente(cliente.id)}
                    onEliminar={() => handleEliminarClientePermanente(cliente)}
                  />
                </div>
              ))
            )}
          </SectionCard>

          <SectionCard title="Oportunidades eliminadas" subtitle={`${oportunidades.length} en la papelera`}>
            {oportunidades.length === 0 ? (
              <EmptyRow label="No hay oportunidades eliminadas" />
            ) : (
              oportunidades.map((op) => (
                <div key={op.id} className="flex items-center justify-between gap-3 px-6 py-4 flex-wrap">
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                      <KanbanSquare size={14} className="text-gray-300" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {op.cliente ? (
                          <Link href={`/clientes/${op.cliente.id}`} className="hover:text-blue-700 transition-colors">
                            {op.cliente.nombre ?? op.cliente.telefono ?? 'Sin nombre'}
                          </Link>
                        ) : 'Cliente eliminado'}
                        {op.monto != null && <span className="text-gray-400 font-normal"> · {formatMonto(op.monto)}</span>}
                      </p>
                      <p className="text-xs text-gray-400">Eliminada el {formatFecha(op.deleted_at)}</p>
                    </div>
                  </div>
                  <AccionesFila
                    procesando={procesandoId === op.id}
                    onRestaurar={() => handleRestaurarOportunidad(op.id)}
                    onEliminar={() => handleEliminarOportunidadPermanente(op)}
                  />
                </div>
              ))
            )}
          </SectionCard>

        </div>
      )}

      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 flex items-start gap-2.5 rounded-xl border border-red-200 bg-white px-4 py-3 shadow-xl max-w-xs">
          <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-500" />
          <p className="text-sm text-gray-700 leading-snug flex-1">{toastMsg}</p>
          <button type="button" onClick={() => setToastMsg(null)} className="shrink-0 text-gray-300 hover:text-gray-500 transition-colors text-xs">
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
