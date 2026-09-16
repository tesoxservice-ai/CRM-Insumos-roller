// components/dashboard/CajaResumenWidget.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TrendingUp, TrendingDown, PiggyBank, ChevronRight } from 'lucide-react'
import { getMovimientosCaja } from '@/lib/supabase/queries'

const BRAND = '#1B3FA0'

function formatMonto(n: number): string {
  return `$${Math.round(n).toLocaleString('es-AR')}`
}

function inicioSemana(): Date {
  const ahora = new Date()
  const dia = ahora.getDay()
  const diff = dia === 0 ? 6 : dia - 1
  const lunes = new Date(ahora)
  lunes.setDate(ahora.getDate() - diff)
  lunes.setHours(0, 0, 0, 0)
  return lunes
}

export function CajaResumenWidget() {
  const [loading, setLoading] = useState(true)
  const [metricas, setMetricas] = useState({ cobrado: 0, gastos: 0, neto: 0 })

  useEffect(() => {
    let activo = true
    getMovimientosCaja().then(({ data }) => {
      if (!activo || !data) return
      const desde = inicioSemana()
      const delPeriodo = data.filter((m) => new Date(`${m.fecha}T00:00:00`) >= desde)
      const cobrado = delPeriodo.filter((m) => m.tipo === 'ingreso').reduce((sum, m) => sum + m.monto, 0)
      const gastos = delPeriodo.filter((m) => m.tipo === 'egreso' && m.categoria !== 'retiro_personal').reduce((sum, m) => sum + m.monto, 0)
      setMetricas({ cobrado, gastos, neto: cobrado - gastos })
      setLoading(false)
    })
    return () => { activo = false }
  }, [])

  return (
    <Link
      href="/caja"
      className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-blue-200 transition-colors"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Caja · esta semana</p>
        <ChevronRight size={14} className="text-gray-300" />
      </div>
      {loading ? (
        <div className="flex gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 flex-1 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-0.5">
          <div className="flex items-center gap-2 shrink-0 rounded-xl bg-emerald-50 px-3 py-2 min-w-[110px]">
            <TrendingUp size={14} className="text-emerald-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-emerald-600 font-medium">Cobrado</p>
              <p className="text-sm font-bold text-emerald-700 truncate">{formatMonto(metricas.cobrado)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 rounded-xl bg-red-50 px-3 py-2 min-w-[110px]">
            <TrendingDown size={14} className="text-red-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-red-500 font-medium">Gastos</p>
              <p className="text-sm font-bold text-red-600 truncate">{formatMonto(metricas.gastos)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 rounded-xl bg-blue-50 px-3 py-2 min-w-[110px]">
            <PiggyBank size={14} className="shrink-0" style={{ color: BRAND }} />
            <div className="min-w-0">
              <p className="text-[10px] font-medium" style={{ color: BRAND }}>Neto</p>
              <p className="text-sm font-bold truncate" style={{ color: BRAND }}>{formatMonto(metricas.neto)}</p>
            </div>
          </div>
        </div>
      )}
    </Link>
  )
}
