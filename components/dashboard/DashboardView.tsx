// components/dashboard/DashboardView.tsx
'use client'

import { LayoutDashboard, Users, KanbanSquare, Clock, Calendar } from 'lucide-react'
import Link from 'next/link'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { CajaResumenWidget } from '@/components/dashboard/CajaResumenWidget'
import { NotificacionesPanel } from '@/components/notificaciones/NotificacionesPanel'
import { useIsMobile } from '@/hooks/useIsMobile'

const ACCESOS_RAPIDOS = [
  { label: 'Clientes',   href: '/clientes',  icon: Users,           desc: 'Ver y gestionar clientes',  iconBg: 'bg-blue-50',    iconColor: 'text-blue-600' },
  { label: 'Pipeline',   href: '/pipeline',  icon: KanbanSquare,    desc: 'Tablero de oportunidades',  iconBg: 'bg-violet-50',  iconColor: 'text-violet-600' },
  { label: 'Historial',  href: '/historial', icon: Clock,           desc: 'Registro de interacciones', iconBg: 'bg-amber-50',   iconColor: 'text-amber-600' },
  { label: 'Reportes',   href: '/reportes',  icon: LayoutDashboard, desc: 'Métricas y estadísticas',   iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
  { label: 'Calendario', href: '/calendar',  icon: Calendar,        desc: 'Seguimientos programados',  iconBg: 'bg-pink-50',    iconColor: 'text-pink-600' },
]

export function DashboardView() {
  const isMobile = useIsMobile()

  return (
    <div className="space-y-6 md:space-y-8">

      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Bienvenido al CRM de Insumos Roller</p>
      </div>

      {isMobile && <CajaResumenWidget />}

      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Accesos rápidos</p>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {ACCESOS_RAPIDOS.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-5 hover:border-blue-200 hover:shadow-md transition-all group"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${item.iconBg}`}>
                  <Icon size={18} strokeWidth={2} className={item.iconColor} />
                </div>
                <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{item.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
              </Link>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Actividad reciente</p>
          <ActivityFeed />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Notificaciones del navegador</p>
          <NotificacionesPanel />
        </div>
      </div>

    </div>
  )
}
