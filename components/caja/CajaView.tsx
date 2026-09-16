// components/caja/CajaView.tsx
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Plus, RefreshCw, X, AlertCircle, Wallet, TrendingUp, TrendingDown,
  Landmark, PiggyBank, Trash2, Package,
} from 'lucide-react'
import {
  getMovimientosCaja,
  createMovimientoCaja,
  deleteMovimientoCaja,
  getOportunidades,
  type MovimientoCajaConRelaciones,
} from '@/lib/supabase/queries'
import type {
  Cliente,
  CategoriaMovimientoCaja,
  MovimientoCaja,
  Oportunidad,
  TipoMovimientoCaja,
} from '@/lib/types'

const BRAND = '#1B3FA0'

type OportunidadConCliente = Oportunidad & { cliente: Cliente }

const CATEGORIAS_INGRESO: { value: CategoriaMovimientoCaja; label: string }[] = [
  { value: 'seña',         label: 'Seña' },
  { value: 'pago_final',   label: 'Pago final' },
  { value: 'pago_total',   label: 'Pago total' },
  { value: 'otro_ingreso', label: 'Otro ingreso' },
]
const CATEGORIAS_EGRESO: { value: CategoriaMovimientoCaja; label: string }[] = [
  { value: 'proveedor',        label: 'Pago a proveedor' },
  { value: 'retiro_personal',  label: 'Retiro personal' },
  { value: 'gasto_operativo',  label: 'Gasto operativo' },
  { value: 'otro_egreso',      label: 'Otro gasto' },
]
const CATEGORIA_LABELS: Record<CategoriaMovimientoCaja, string> = Object.fromEntries(
  [...CATEGORIAS_INGRESO, ...CATEGORIAS_EGRESO].map((c) => [c.value, c.label])
) as Record<CategoriaMovimientoCaja, string>

type Periodo = 'semana' | 'mes' | 'todo'

function formatMonto(n: number): string {
  return `$${Math.round(n).toLocaleString('es-AR')}`
}
function formatFechaCorta(fecha: string): string {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
function hoyISO(): string {
  return new Date().toLocaleDateString('sv-SE') // YYYY-MM-DD en horario local
}
function inicioPeriodo(periodo: Periodo): Date | null {
  const ahora = new Date()
  if (periodo === 'todo') return null
  if (periodo === 'mes') return new Date(ahora.getFullYear(), ahora.getMonth(), 1)
  const dia = ahora.getDay() // 0 = domingo
  const diff = dia === 0 ? 6 : dia - 1 // días desde el lunes
  const lunes = new Date(ahora)
  lunes.setDate(ahora.getDate() - diff)
  lunes.setHours(0, 0, 0, 0)
  return lunes
}

const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-colors bg-white'

function KpiCard({ icon: Icon, label, value, sub, iconBg, iconColor }: {
  icon: React.ElementType; label: string; value: string; sub: string; iconBg: string; iconColor: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${iconBg}`}>
        <Icon size={18} strokeWidth={2} className={iconColor} />
      </div>
      <p className="text-2xl font-bold text-gray-900 leading-none mb-1">{value}</p>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  )
}

function Toast({ mensaje, onDismiss }: { mensaje: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000)
    return () => clearTimeout(t)
  }, [onDismiss])
  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-start gap-2.5 rounded-xl border border-red-200 bg-white px-4 py-3 shadow-xl max-w-xs">
      <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-500" />
      <p className="text-sm text-gray-700 leading-snug flex-1">{mensaje}</p>
      <button type="button" onClick={onDismiss} className="shrink-0 text-gray-300 hover:text-gray-500 transition-colors"><X size={14} /></button>
    </div>
  )
}

function NuevoMovimientoModal({
  oportunidades,
  onClose,
  onSuccess,
}: {
  oportunidades: OportunidadConCliente[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [tipo, setTipo] = useState<TipoMovimientoCaja>('ingreso')
  const [categoria, setCategoria] = useState<CategoriaMovimientoCaja>('seña')
  const [monto, setMonto] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [proveedor, setProveedor] = useState('')
  const [oportunidadId, setOportunidadId] = useState('')
  const [fecha, setFecha] = useState(hoyISO())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const categorias = tipo === 'ingreso' ? CATEGORIAS_INGRESO : CATEGORIAS_EGRESO
  const mostrarVinculo = tipo === 'ingreso'
  const mostrarProveedor = categoria === 'proveedor'

  function handleTipo(nuevo: TipoMovimientoCaja) {
    setTipo(nuevo)
    setCategoria(nuevo === 'ingreso' ? 'seña' : 'proveedor')
    setOportunidadId('')
  }

  const oportunidadSeleccionada = oportunidades.find((o) => o.id === oportunidadId) ?? null

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const montoNum = parseFloat(monto)
    if (!montoNum || montoNum <= 0) return
    setSaving(true)
    setError(null)

    const payload: Partial<Omit<MovimientoCaja, 'id' | 'created_at' | 'creado_por' | 'creado_por_nombre'>> = {
      tipo,
      categoria,
      monto: montoNum,
      descripcion: descripcion.trim() || null,
      proveedor: mostrarProveedor ? (proveedor.trim() || null) : null,
      cliente_id: oportunidadSeleccionada?.cliente_id ?? null,
      oportunidad_id: oportunidadSeleccionada?.id ?? null,
      fecha,
    }

    const { error: err } = await createMovimientoCaja(payload)
    setSaving(false)
    if (err) { setError(err.message); return }
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Nuevo movimiento</h2>
            <p className="text-xs text-gray-400 mt-0.5">Registrá un ingreso o un gasto</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4 px-6 py-5">

            {/* Tipo */}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => handleTipo('ingreso')}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold border transition-colors ${
                  tipo === 'ingreso' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'border-gray-200 text-gray-400 hover:bg-gray-50'
                }`}>
                <TrendingUp size={15} /> Ingreso
              </button>
              <button type="button" onClick={() => handleTipo('egreso')}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold border transition-colors ${
                  tipo === 'egreso' ? 'bg-red-50 border-red-200 text-red-600' : 'border-gray-200 text-gray-400 hover:bg-gray-50'
                }`}>
                <TrendingDown size={15} /> Gasto
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Categoría</label>
                <select value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaMovimientoCaja)} className={inputClass}>
                  {categorias.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Monto <span className="text-red-400">*</span></label>
                <input type="number" min="0.01" step="0.01" required value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="$0" className={inputClass} />
              </div>
            </div>

            {mostrarProveedor && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Proveedor</label>
                <input type="text" value={proveedor} onChange={(e) => setProveedor(e.target.value)} placeholder="Ej: Telas del Sur" className={inputClass} />
              </div>
            )}

            {mostrarVinculo && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Vincular a un cliente (opcional)</label>
                <select value={oportunidadId} onChange={(e) => setOportunidadId(e.target.value)} className={inputClass}>
                  <option value="">Sin vincular</option>
                  {oportunidades.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.cliente?.nombre ?? 'Sin nombre'}{o.monto ? ` — total ${formatMonto(o.monto)}` : ''}{o.detalle_cotizacion ? ` (${o.detalle_cotizacion.slice(0, 30)})` : ''}
                    </option>
                  ))}
                </select>
                {oportunidadSeleccionada?.monto != null && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Total del pedido: <span className="font-semibold text-gray-600">{formatMonto(oportunidadSeleccionada.monto)}</span>
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Fecha</label>
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputClass} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Nota (opcional)</label>
              <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Detalle del movimiento…" rows={2} className={`${inputClass} resize-none`} />
            </div>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 border border-red-100">{error}</p>}
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors">Cancelar</button>
            <button type="submit" disabled={saving || !monto} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm" style={{ backgroundColor: BRAND }}>
              {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
              {saving ? 'Guardando…' : 'Guardar movimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function FilaMovimiento({ mov, onDelete }: { mov: MovimientoCajaConRelaciones; onDelete: (id: string) => void }) {
  const esIngreso = mov.tipo === 'ingreso'
  return (
    <div className="flex items-center gap-3 py-3 px-4 rounded-xl bg-gray-50/60 border border-gray-100 group">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${esIngreso ? 'bg-emerald-50' : 'bg-red-50'}`}>
        {esIngreso ? <TrendingUp size={15} className="text-emerald-500" /> : <TrendingDown size={15} className="text-red-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-800">{CATEGORIA_LABELS[mov.categoria]}</p>
          {mov.cliente && <span className="text-xs text-gray-400">· {mov.cliente.nombre}</span>}
          {mov.proveedor && <span className="text-xs text-gray-400">· {mov.proveedor}</span>}
        </div>
        {mov.descripcion && <p className="text-xs text-gray-400 mt-0.5 truncate">{mov.descripcion}</p>}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <p className={`text-sm font-bold ${esIngreso ? 'text-emerald-600' : 'text-red-500'}`}>
            {esIngreso ? '+' : '−'}{formatMonto(mov.monto)}
          </p>
          <p className="text-[11px] text-gray-400">{formatFechaCorta(mov.fecha)}</p>
        </div>
        <button type="button" onClick={() => onDelete(mov.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-1.5 rounded-lg hover:bg-red-50">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

export function CajaView() {
  const [movimientos, setMovimientos] = useState<MovimientoCajaConRelaciones[]>([])
  const [oportunidades, setOportunidades] = useState<OportunidadConCliente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [periodo, setPeriodo] = useState<Periodo>('semana')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [movsRes, opsRes] = await Promise.all([getMovimientosCaja(), getOportunidades()])
    if (movsRes.error) { setError(movsRes.error); setLoading(false); return }
    setMovimientos(movsRes.data ?? [])
    setOportunidades((opsRes.data ?? []).filter((o) => o.estado_pipeline !== 'perdido') as OportunidadConCliente[])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function handleDelete(id: string) {
    const anteriores = movimientos
    setMovimientos((prev) => prev.filter((m) => m.id !== id))
    const { error: err } = await deleteMovimientoCaja(id)
    if (err) {
      setMovimientos(anteriores)
      setToastMsg(`Error al eliminar el movimiento: ${err}`)
    }
  }

  const movimientosPeriodo = useMemo(() => {
    const desde = inicioPeriodo(periodo)
    if (!desde) return movimientos
    return movimientos.filter((m) => new Date(`${m.fecha}T00:00:00`) >= desde)
  }, [movimientos, periodo])

  const metricas = useMemo(() => {
    const ingresos = movimientosPeriodo.filter((m) => m.tipo === 'ingreso')
    const egresos = movimientosPeriodo.filter((m) => m.tipo === 'egreso')
    const bruto = ingresos.reduce((sum, m) => sum + m.monto, 0)
    const retiros = egresos.filter((m) => m.categoria === 'retiro_personal').reduce((sum, m) => sum + m.monto, 0)
    const gastosNegocio = egresos.filter((m) => m.categoria !== 'retiro_personal').reduce((sum, m) => sum + m.monto, 0)
    const neto = bruto - gastosNegocio

    const gastosPorProveedor = new Map<string, number>()
    for (const m of egresos) {
      if (m.categoria !== 'proveedor') continue
      const clave = m.proveedor?.trim() || 'Sin nombre'
      gastosPorProveedor.set(clave, (gastosPorProveedor.get(clave) ?? 0) + m.monto)
    }
    const proveedores = [...gastosPorProveedor.entries()].map(([nombre, monto]) => ({ nombre, monto })).sort((a, b) => b.monto - a.monto)

    // Pendiente de cobro: por oportunidad, total - ingresos ya vinculados (a la fecha, sin filtrar por período)
    const pendientes = oportunidades
      .filter((o) => o.monto != null && o.monto > 0)
      .map((o) => {
        const cobrado = movimientos
          .filter((m) => m.tipo === 'ingreso' && m.oportunidad_id === o.id)
          .reduce((sum, m) => sum + m.monto, 0)
        return { oportunidad: o, cobrado, pendiente: (o.monto ?? 0) - cobrado }
      })
      .filter((p) => p.cobrado > 0 && p.pendiente > 0)
      .sort((a, b) => b.pendiente - a.pendiente)

    const totalPendiente = pendientes.reduce((sum, p) => sum + p.pendiente, 0)

    return { bruto, retiros, gastosNegocio, neto, proveedores, pendientes, totalPendiente }
  }, [movimientosPeriodo, movimientos, oportunidades])

  const PERIODOS: { value: Periodo; label: string }[] = [
    { value: 'semana', label: 'Esta semana' },
    { value: 'mes', label: 'Este mes' },
    { value: 'todo', label: 'Todo' },
  ]

  return (
    <div className="space-y-6">

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Caja</h1>
          <p className="text-sm text-gray-400 mt-0.5">Ingresos, gastos y balance del negocio</p>
        </div>
        <button type="button" onClick={() => setModalAbierto(true)}
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
          style={{ backgroundColor: BRAND }}>
          <Plus size={15} strokeWidth={2.5} />
          Nuevo movimiento
        </button>
      </div>

      {loading ? (
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
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
            <AlertCircle size={18} className="text-red-400" />
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">No se pudo cargar la caja</p>
          <p className="text-xs text-gray-400 mb-4">{error}</p>
          <button onClick={cargar} className="text-xs font-semibold px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors" style={{ backgroundColor: BRAND }}>
            Reintentar
          </button>
        </div>
      ) : (
        <div className="space-y-5">

          {/* Filtro de período */}
          <div className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
            {PERIODOS.map((p) => (
              <button key={p.value} type="button" onClick={() => setPeriodo(p.value)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  periodo === p.value ? 'text-white' : 'text-gray-400 hover:text-gray-600'
                }`}
                style={periodo === p.value ? { backgroundColor: BRAND } : {}}>
                {p.label}
              </button>
            ))}
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={TrendingUp} label="Cobrado" value={formatMonto(metricas.bruto)} sub="ingresos del período" iconBg="bg-emerald-50" iconColor="text-emerald-600" />
            <KpiCard icon={Wallet} label="Por cobrar" value={formatMonto(metricas.totalPendiente)} sub={`${metricas.pendientes.length} pedidos con saldo`} iconBg="bg-amber-50" iconColor="text-amber-600" />
            <KpiCard icon={TrendingDown} label="Gastos" value={formatMonto(metricas.gastosNegocio)} sub="proveedores y operativos" iconBg="bg-red-50" iconColor="text-red-500" />
            <KpiCard icon={PiggyBank} label="Ganancia neta" value={formatMonto(metricas.neto)} sub={`retirado para vos: ${formatMonto(metricas.retiros)}`} iconBg="bg-blue-50" iconColor="text-blue-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Movimientos */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-800">Movimientos</h2>
                <span className="text-xs text-gray-400">{movimientosPeriodo.length} en el período</span>
              </div>
              <div className="px-4 py-4">
                {movimientosPeriodo.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mb-2">
                      <Wallet size={16} className="text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-400">Sin movimientos en este período</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {movimientosPeriodo.map((m) => <FilaMovimiento key={m.id} mov={m} onDelete={handleDelete} />)}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">

              {/* Pendiente de cobro */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-800">Pendiente de cobro</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Pedidos con seña pero sin saldar</p>
                </div>
                <div className="px-6 py-4">
                  {metricas.pendientes.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">Nadie te debe plata ahora</p>
                  ) : (
                    <ul className="space-y-3">
                      {metricas.pendientes.map(({ oportunidad, pendiente }) => (
                        <li key={oportunidad.id} className="flex items-center justify-between gap-2">
                          <span className="text-sm text-gray-600 truncate">{oportunidad.cliente?.nombre ?? 'Cliente'}</span>
                          <span className="text-sm font-bold text-amber-600 shrink-0">{formatMonto(pendiente)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Gastos por proveedor */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                  <Package size={14} className="text-gray-400" />
                  <h2 className="text-sm font-semibold text-gray-800">Gastos por proveedor</h2>
                </div>
                <div className="px-6 py-4">
                  {metricas.proveedores.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">Sin gastos de proveedores en el período</p>
                  ) : (
                    <ul className="space-y-3">
                      {metricas.proveedores.map((p) => (
                        <li key={p.nombre} className="flex items-center justify-between gap-2">
                          <span className="text-sm text-gray-600 truncate">{p.nombre}</span>
                          <span className="text-sm font-bold text-gray-800 shrink-0">{formatMonto(p.monto)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                  <Landmark size={15} className="text-gray-400" />
                </div>
                <p className="text-xs text-gray-400 leading-snug">
                  La ganancia neta descuenta gastos del negocio, no lo que retiraste para uso personal.
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

      {modalAbierto && (
        <NuevoMovimientoModal
          oportunidades={oportunidades}
          onClose={() => setModalAbierto(false)}
          onSuccess={cargar}
        />
      )}
      {toastMsg && <Toast mensaje={toastMsg} onDismiss={() => setToastMsg(null)} />}
    </div>
  )
}
