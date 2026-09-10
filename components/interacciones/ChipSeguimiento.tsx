'use client'

import { useState } from 'react'
import { Calendar, X, Check, ChevronDown } from 'lucide-react'
import { formatearFechaSeguimiento } from '@/lib/utils/detectarSeguimiento'

interface ChipSeguimientoProps {
  fecha: Date
  descripcion: string
  onConfirmar: (fecha: Date, descripcion: string) => void
  onIgnorar: () => void
}

export function ChipSeguimiento({
  fecha,
  descripcion,
  onConfirmar,
  onIgnorar,
}: ChipSeguimientoProps) {
  const [editandoFecha, setEditandoFecha] = useState(false)
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date>(fecha)
  const [confirmado, setConfirmado] = useState(false)

  const fechaInputValue = fechaSeleccionada.toISOString().split('T')[0]

  function handleConfirmar() {
    setConfirmado(true)
    onConfirmar(fechaSeleccionada, descripcion)
  }

  if (confirmado) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
        <Check size={14} className="shrink-0" />
        <span>
          Evento creado para el{' '}
          <strong>{formatearFechaSeguimiento(fechaSeleccionada)}</strong>
        </span>
      </div>
    )
  }

  return (
    <div className="border border-blue-200 bg-blue-50 rounded-lg px-3 py-2.5 flex flex-col gap-2">
      {/* Header del chip */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-blue-800 font-medium">
          <Calendar size={14} className="shrink-0 text-blue-600" />
          <span>Seguimiento detectado</span>
        </div>
        <button
          type="button"
          onClick={onIgnorar}
          className="text-blue-400 hover:text-blue-600 transition-colors"
          title="Ignorar"
        >
          <X size={14} />
        </button>
      </div>

      {/* Fecha y descripción */}
      <div className="text-sm text-blue-700">
        {editandoFecha ? (
          <input
            type="date"
            value={fechaInputValue}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => {
              const nueva = new Date(e.target.value + 'T12:00:00')
              setFechaSeleccionada(nueva)
              setEditandoFecha(false)
            }}
            className="border border-blue-300 rounded px-2 py-0.5 text-sm bg-white text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-400"
            autoFocus
          />
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="font-semibold">
              {formatearFechaSeguimiento(fechaSeleccionada)}
            </span>
            <span className="text-blue-500">—</span>
            <span className="text-blue-600 truncate">{descripcion}</span>
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleConfirmar}
          className="flex items-center gap-1.5 px-3 py-1 bg-[#1B3FA0] text-white text-xs font-medium rounded-md hover:bg-blue-800 transition-colors"
        >
          <Check size={12} />
          Crear evento en Calendar
        </button>
        <button
          type="button"
          onClick={() => setEditandoFecha(true)}
          className="flex items-center gap-1 px-2.5 py-1 border border-blue-300 text-blue-700 text-xs rounded-md hover:bg-blue-100 transition-colors"
        >
          <ChevronDown size={12} />
          Cambiar fecha
        </button>
      </div>
    </div>
  )
}