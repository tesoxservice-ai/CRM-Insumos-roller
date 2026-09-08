// components/clientes/EditarClienteModal.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { updateCliente } from '@/lib/supabase/queries'
import type { CanalEntrada, EstadoCliente, Cliente } from '@/lib/types'

interface EditarClienteModalProps {
  cliente: Cliente
  onClose: () => void
  onSuccess: () => void
}

interface FormState {
  nombre: string
  telefono: string
  estado: EstadoCliente
  canal_entrada: CanalEntrada
  notas: string
}

const ESTADO_OPTIONS: { value: EstadoCliente; label: string }[] = [
  { value: 'sin_ficha',      label: 'Sin ficha' },
  { value: 'potencial',      label: 'Potencial' },
  { value: 'en_seguimiento', label: 'En seguimiento' },
  { value: 'activo',         label: 'Activo' },
  { value: 'inactivo',       label: 'Inactivo' },
]

const CANAL_OPTIONS: { value: CanalEntrada; label: string }[] = [
  { value: 'manual',       label: 'Manual' },
  { value: 'whatsapp',     label: 'WhatsApp' },
  { value: 'configurador', label: 'Configurador' },
  { value: 'mercadopago',  label: 'MercadoPago' },
]

const BRAND = '#1B3FA0'

const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-colors bg-white'

function Field({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

export default function EditarClienteModal({ cliente, onClose, onSuccess }: EditarClienteModalProps) {
  const [form, setForm] = useState<FormState>({
    nombre: cliente.nombre ?? '',
    telefono: cliente.telefono ?? '',
    estado: cliente.estado,
    canal_entrada: cliente.canal_entrada,
    notas: '',
  })
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const firstInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { firstInputRef.current?.focus() }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSubmitError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setSubmitError(null)

    const { error } = await updateCliente(cliente.id, {
      nombre: form.nombre.trim() || 'Sin nombre',
      telefono: form.telefono.trim() || null,
      estado: form.estado,
      canal_entrada: form.canal_entrada,
    })

    setLoading(false)
    if (error) { setSubmitError(error.message); return }
    onSuccess()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-100">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Editar cliente</h2>
            <p className="text-xs text-gray-400 mt-0.5">Modificá los datos de {cliente.nombre}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4 px-6 py-5">

            <Field label="Nombre" required>
              <input
                ref={firstInputRef}
                type="text"
                value={form.nombre}
                onChange={(e) => setField('nombre', e.target.value)}
                placeholder="Ej: María González"
                required
                className={inputClass}
              />
            </Field>

            <Field label="Teléfono" hint="Formato: +5491112345678">
              <input
                type="tel"
                value={form.telefono}
                onChange={(e) => setField('telefono', e.target.value)}
                placeholder="+54911..."
                className={inputClass}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Estado">
                <select value={form.estado} onChange={(e) => setField('estado', e.target.value as EstadoCliente)} className={inputClass}>
                  {ESTADO_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </Field>
              <Field label="Canal de entrada">
                <select value={form.canal_entrada} onChange={(e) => setField('canal_entrada', e.target.value as CanalEntrada)} className={inputClass}>
                  {CANAL_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </Field>
            </div>

            {submitError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 border border-red-100">{submitError}</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !form.nombre.trim()}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              style={{ backgroundColor: BRAND }}
            >
              {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
              {loading ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}