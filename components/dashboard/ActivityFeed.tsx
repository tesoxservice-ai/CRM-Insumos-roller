'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Phone, MessageCircle, Mail, Users, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { TipoInteraccion } from '@/lib/types'

interface ActividadItem {
  id: string
  tipo: TipoInteraccion
  descripcion: string
  created_at: string
  creado_por_nombre: string | null
  cliente: { id: string; nombre: string }
}

const ICON_MAP: Record<TipoInteraccion, React.ElementType> = {
  llamada: Phone, whatsapp: MessageCircle, email: Mail, reunion: Users, nota: FileText,
}

const COLOR_MAP: Record<TipoInteraccion, string> = {
  llamada:  'text-blue-500 bg-blue-50',
  whatsapp: 'text-emerald-500 bg-emerald-50',
  email:    'text-violet-500 bg-violet-50',
  reunion:  'text-orange-500 bg-orange-50',
  nota:     'text-gray-400 bg-gray-50',
}

const TIPO_LABEL: Record<TipoInteraccion, string> = {
  llamada: 'Llamada', whatsapp: 'WhatsApp', email: 'Email', reunion: 'Reunión', nota: 'Nota',
}

function tiempoRelativo(fecha: string): string {
  const diff = Math.floor((Date.now() - new Date(fecha).getTime()) / 1000)
  if (diff < 60) return 'hace un momento'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`
  if (diff < 172800) return 'ayer'
  return new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
}

export function ActivityFeed() {
  const [items, setItems] = useState<ActividadItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function cargar() {
      const supabase = createClient()
      const { data } = await supabase
        .from('interacciones')
        .select('id, tipo, descripcion, created_at, creado_por_nombre, cliente:clientes(id, nombre)')
        .order('created_at', { ascending: false })
        .limit(10)

      if (data) {
        const items: ActividadItem[] = data.map((row: Record<string, unknown>) => ({
          id: row.id as string,
          tipo: row.tipo as TipoInteraccion,
          descripcion: row.descripcion as string,
          created_at: row.created_at as string,
          creado_por_nombre: row.creado_por_nombre as string | null,
          cliente: Array.isArray(row.cliente) ? row.cliente[0] : row.cliente as { id: string; nombre: string },
        }))
        setItems(items)
      }
      setLoading(false)
    }
    cargar()
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3 p-4 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-gray-100 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-32 bg-gray-100 rounded-full" />
              <div className="h-3 w-3/4 bg-gray-100 rounded-full" />
              <div className="h-3 w-20 bg-gray-100 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-12 text-center">
        <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mb-2">
          <FileText size={16} className="text-gray-300" />
        </div>
        <p className="text-sm text-gray-400">Sin actividad reciente</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="divide-y divide-gray-50">
        {items.map((item) => {
          const Icon = ICON_MAP[item.tipo]
          return (
            <div key={item.id} className="flex gap-3 px-4 py-3.5 hover:bg-gray-50/50 transition-colors">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${COLOR_MAP[item.tipo]}`}>
                <Icon size={13} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Link href={`/clientes/${item.cliente.id}`} className="text-sm font-semibold text-gray-800 hover:text-blue-700 transition-colors">
                    {item.cliente.nombre}
                  </Link>
                  <span className="text-xs text-gray-400">{TIPO_LABEL[item.tipo]}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.descripcion}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[11px] text-gray-400">{tiempoRelativo(item.created_at)}</span>
                  {item.creado_por_nombre && (
                    <>
                      <span className="text-gray-200">·</span>
                      <span className="text-[11px] font-medium text-[#1B3FA0]">{item.creado_por_nombre}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="px-4 py-3 border-t border-gray-50">
        <Link href="/historial" className="text-xs font-semibold text-[#1B3FA0] hover:underline">
          Ver historial completo →
        </Link>
      </div>
    </div>
  )
}