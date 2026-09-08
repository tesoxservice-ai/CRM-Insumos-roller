// components/notificaciones/NotificacionesPanel.tsx

'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, BellRing, ShoppingCart, Clock, FileText, AlertTriangle, CheckCircle2, Settings } from 'lucide-react'
import { useNotificaciones } from '@/hooks/useNotificaciones'
import {
  notificarNuevaCotizacion,
  notificarCompraMercadoPago,
  notificarClienteSinRespuesta,
} from '@/lib/notifications/push'

// ── Datos de ejemplo para los botones de prueba ───────────────────────────────

function probarCotizacion() {
  notificarNuevaCotizacion('María García', 'Roller 3x2m — Lona vinílica')
}

function probarMercadoPago() {
  notificarCompraMercadoPago('Carlos López', 48500)
}

function probarSinRespuesta() {
  notificarClienteSinRespuesta('Juliana Perez', 52)
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function EventoItem({
  icon: Icon,
  iconClass,
  label,
  descripcion,
}: {
  icon: React.ElementType
  iconClass: string
  label: string
  descripcion: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${iconClass}`}>
        <Icon size={13} strokeWidth={2.5} />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-400">{descripcion}</p>
      </div>
    </div>
  )
}

function TestButton({
  icon: Icon,
  iconClass,
  label,
  onClick,
}: {
  icon: React.ElementType
  iconClass: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors text-left group"
    >
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}>
        <Icon size={13} strokeWidth={2.5} />
      </div>
      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
        {label}
      </span>
      <BellRing size={13} className="ml-auto text-gray-300 group-hover:text-gray-400 transition-colors" />
    </button>
  )
}

// ── Panel principal ───────────────────────────────────────────────────────────

export function NotificacionesPanel() {
  const { permiso, solicitarPermiso, soportado } = useNotificaciones()
  const [montado, setMontado] = useState(false)

  useEffect(() => {
    setMontado(true)
  }, [])

  if (!montado) return null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <div className="w-8 h-8 rounded-xl bg-gray-900 flex items-center justify-center">
          <Bell size={15} className="text-white" strokeWidth={2} />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-gray-900">Notificaciones del navegador</h2>
          <p className="text-xs text-gray-400">Avisos en tiempo real sobre eventos del negocio</p>
        </div>
        {permiso === 'granted' && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
            <CheckCircle2 size={11} strokeWidth={2.5} />
            Activas
          </span>
        )}
        {permiso === 'denied' && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-red-500 bg-red-50 px-2.5 py-1 rounded-full">
            <BellOff size={11} strokeWidth={2.5} />
            Bloqueadas
          </span>
        )}
      </div>

      <div className="px-5 py-5 space-y-5">

        {/* A) Navegador no soportado */}
        {!soportado && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
            <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Navegador no compatible</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Tu navegador no soporta la API de notificaciones. Probá con Chrome, Edge o Firefox actualizados.
              </p>
            </div>
          </div>
        )}

        {/* B) Sin permiso (default o denied) */}
        {soportado && permiso !== 'granted' && (
          <>
            {/* Eventos que notifica */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Eventos que te avisamos
              </p>
              <div className="space-y-3">
                <EventoItem
                  icon={FileText}
                  iconClass="bg-blue-50 text-blue-500"
                  label="Nueva cotización"
                  descripcion="Un cliente generó una cotización en el configurador"
                />
                <EventoItem
                  icon={ShoppingCart}
                  iconClass="bg-emerald-50 text-emerald-500"
                  label="Compra en MercadoPago"
                  descripcion="Se completó una compra y entró al pipeline"
                />
                <EventoItem
                  icon={Clock}
                  iconClass="bg-orange-50 text-orange-500"
                  label="Cliente sin respuesta"
                  descripcion="Un cliente lleva más de 48hs esperando seguimiento"
                />
              </div>
            </div>

            {/* Aviso si fue denegado */}
            {permiso === 'denied' && (
              <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-100">
                <Settings size={14} className="text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-700">Notificaciones bloqueadas</p>
                  <p className="text-xs text-red-500 mt-0.5">
                    Las bloqueaste desde el navegador. Para habilitarlas, hacé clic en el ícono del candado en la barra de direcciones y cambiá el permiso de notificaciones.
                  </p>
                </div>
              </div>
            )}

            {/* Botón activar */}
            {permiso !== 'denied' && (
              <button
                onClick={solicitarPermiso}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors"
              >
                <Bell size={14} strokeWidth={2} />
                Activar notificaciones
              </button>
            )}
          </>
        )}

        {/* C) Permiso concedido */}
        {soportado && permiso === 'granted' && (
          <>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Probar notificaciones
              </p>
              <div className="space-y-2">
                <TestButton
                  icon={FileText}
                  iconClass="bg-blue-50 text-blue-500"
                  label="Nueva cotización"
                  onClick={probarCotizacion}
                />
                <TestButton
                  icon={ShoppingCart}
                  iconClass="bg-emerald-50 text-emerald-500"
                  label="Compra en MercadoPago"
                  onClick={probarMercadoPago}
                />
                <TestButton
                  icon={Clock}
                  iconClass="bg-orange-50 text-orange-500"
                  label="Cliente sin respuesta"
                  onClick={probarSinRespuesta}
                />
              </div>
            </div>

            <p className="text-xs text-gray-400">
              Las notificaciones reales se dispararán desde los webhooks del configurador y MercadoPago al integrarse.
            </p>
          </>
        )}

      </div>
    </div>
  )
}
