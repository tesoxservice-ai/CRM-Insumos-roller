// components/clientes/NuevoClienteModal.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { createCliente } from '@/lib/supabase/queries'
import type { CanalEntrada, EstadoCliente } from '@/lib/types'

interface NuevoClienteModalProps {
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

const FORM_INICIAL: FormState = {
  nombre: '',
  telefono: '',
  estado: 'sin_ficha',
  canal_entrada: 'manual',
  notas: '',
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

function validarTelefono(tel: string): string | null {
  if (!tel) return null
  const limpio = tel.trim()
  if (!/^\+54\d{8,12}$/.test(limpio)) {
    return 'El teléfono debe tener formato +54 seguido de 8 a 12 dígitos'
  }
  return null
}

function Field({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

const inputClass = 'w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-colors'

export default function NuevoClienteModal({ onClose, onSuccess }: NuevoClienteModalProps) {
  const [form, setForm] = useState<FormState>(FORM_INICIAL)
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [telefonoError, setTelefonoError] = useState<string | null>(null)
  const firstInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { firstInputRef.current?.focus() }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (key === 'telefono') setTelefonoError(null)
    setSubmitError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.telefono.trim()) {
      const err = validarTelefono(form.telefono)
      if (err) { setTelefonoError(err); return }
    }
    setLoading(true)
    setSubmitError(null)

    const { error } = await createCliente({
      nombre: form.nombre.trim() || 'Sin nombre',
      telefono: form.telefono.trim() || null,
      estado: form.estado,
      canal_entrada: form.canal_entrada,
      // notas se guarda como primera interacción si existe
    })

    // Si hay notas, registrarlas como interacción
    if (!error && form.notas.trim()) {
      // Se podría registrar como nota en interacciones — por ahora se ignora
      // hasta que se agregue el campo notas al tipo Cliente
    }

    setLoading(false)
    if (error) { setSubmitError(error.message); return }
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Nuevo cliente</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4 px-6 py-5">
            <Field label="Nombre" required>
              <input ref={firstInputRef} type="text" value={form.nombre} onChange={(e) => setField('nombre', e.target.value)} placeholder="Ej: María González" required className={inputClass} />
            </Field>
            <Field label="Teléfono" hint="Formato: +5491112345678">
              <input type="tel" value={form.telefono} onChange={(e) => setField('telefono', e.target.value)} placeholder="+54911..." className={[inputClass, telefonoError ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''].join(' ')} />
              {telefonoError && <p className="text-xs text-red-500">{telefonoError}</p>}
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
            <Field label="Notas">
              <textarea value={form.notas} onChange={(e) => setField('notas', e.target.value)} placeholder="Observaciones internas..." rows={3} className={[inputClass, 'resize-none'].join(' ')} />
            </Field>
            {submitError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{submitError}</p>}
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
            <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading || !form.nombre.trim()} className="flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors">
              {loading ? (<><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />Guardando…</>) : 'Crear cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}