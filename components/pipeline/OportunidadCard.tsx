// components/pipeline/OportunidadCard.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, MoveRight, User, Trash2 } from 'lucide-react'
import type { CanalEntrada, EstadoPipeline, Oportunidad, Cliente } from '@/lib/types'

export interface OportunidadConCliente extends Oportunidad {
  cliente: Cliente
}

interface OportunidadCardProps {
  oportunidad: OportunidadConCliente
  onMover: (id: string, nuevoEstado: EstadoPipeline) => void
  onEliminar: (id: string) => void
}

const COLUMNAS: { id: EstadoPipeline; label: string }[] = [
  { id: 'consulta',           label: 'Consulta' },
  { id: 'cotizacion_enviada', label: 'Cotización enviada' },
  { id: 'negociacion',        label: 'Negociación' },
  { id: 'ganado',             label: 'Ganado' },
  { id: 'perdido',            label: 'Perdido' },
]

const CANAL_BADGE: Record<CanalEntrada, { label: string; classes: string }> = {
  whatsapp:     { label: '💬 WA',      classes: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
  configurador: { label: '📋 Config.', classes: 'bg-orange-50 text-orange-700 border border-orange-100' },
  mercadopago:  { label: '💳 MP',      classes: 'bg-blue-50 text-blue-700 border border-blue-100' },
  manual:       { label: 'Manual',     classes: 'bg-gray-50 text-gray-500 border border-gray-200' },
  pauta:        { label: '📣 Pauta',   classes: 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-100' },
}

function formatMonto(monto: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(monto)
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function OportunidadCard({ oportunidad, onMover, onEliminar }: OportunidadCardProps) {
  const [dropdownAbierto, setDropdownAbierto] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const displayName = oportunidad.cliente?.nombre || oportunidad.cliente?.telefono || 'Sin nombre'
  const canal = oportunidad.cliente?.canal_entrada

  function handleToggle() {
    if (!dropdownAbierto && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + window.scrollY + 4, right: window.innerWidth - rect.right })
    }
    setDropdownAbierto((v) => !v)
  }

  useEffect(() => {
    if (!dropdownAbierto) return
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setDropdownAbierto(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownAbierto])

  const columnasDest = COLUMNAS.filter((c) => c.id !== oportunidad.estado_pipeline)

  function handleMover(nuevoEstado: EstadoPipeline) {
    setDropdownAbierto(false)
    onMover(oportunidad.id, nuevoEstado)
  }

  function handleEliminar() {
    setDropdownAbierto(false)
    const nombre = oportunidad.cliente?.nombre || 'esta oportunidad'
    if (!window.confirm(`¿Eliminar la oportunidad de ${nombre}? Se puede restaurar desde la Papelera.`)) return
    onEliminar(oportunidad.id)
  }

  return (
    <div className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-gray-300">

      {/* Nombre + canal */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <p className="text-base font-semibold leading-snug text-gray-900 line-clamp-1">
          {displayName}
        </p>
        {canal && (
          <span className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-medium ${CANAL_BADGE[canal].classes}`}>
            {CANAL_BADGE[canal].label}
          </span>
        )}
      </div>

      {/* Detalle */}
      {oportunidad.detalle_cotizacion && (
        <p className="mb-3 line-clamp-2 text-xs text-gray-500 leading-relaxed">
          {oportunidad.detalle_cotizacion}
        </p>
      )}

      {/* Monto */}
      {oportunidad.monto !== null && (
        <p className="mb-3 text-lg font-bold text-gray-900 tracking-tight">
          {formatMonto(oportunidad.monto)}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] text-gray-400 font-medium shrink-0">
            {formatFecha(oportunidad.created_at)}
          </span>
          {/* Autor */}
          {oportunidad.creado_por_nombre && (
            <>
              <span className="text-gray-200 shrink-0">·</span>
              <div className="flex items-center gap-1 min-w-0">
                <User size={10} className="text-[#1B3FA0] shrink-0" />
                <span className="text-[11px] font-medium text-[#1B3FA0] truncate">
                  {oportunidad.creado_por_nombre}
                </span>
              </div>
            </>
          )}
        </div>

        <button
          ref={btnRef}
          type="button"
          onClick={handleToggle}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 transition-all shrink-0"
        >
          Mover a
          <ChevronDown size={11} className={`transition-transform ${dropdownAbierto ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {dropdownAbierto && (
        <div
          ref={dropdownRef}
          style={{ top: dropdownPos.top, right: dropdownPos.right }}
          className="fixed z-[999] min-w-[170px] overflow-hidden rounded-xl border border-gray-200 bg-white py-1.5 shadow-xl"
        >
          {columnasDest.map((col) => (
            <button
              key={col.id}
              type="button"
              onClick={() => handleMover(col.id)}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              <MoveRight size={11} className="text-gray-400" />
              {col.label}
            </button>
          ))}
          <div className="my-1 border-t border-gray-100" />
          <button
            type="button"
            onClick={handleEliminar}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs text-red-500 hover:bg-red-50 transition-colors font-medium"
          >
            <Trash2 size={11} />
            Eliminar
          </button>
        </div>
      )}
    </div>
  )
}