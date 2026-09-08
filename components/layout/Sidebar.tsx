// components/layout/Sidebar.tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, MessageCircle, KanbanSquare,
  Users, Clock, BarChart3, LogOut, type LucideIcon,
} from 'lucide-react'

const BRAND = '#1B3FA0'

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  badge?: number
}

interface NavSection {
  title: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'PRINCIPAL',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'WhatsApp',  href: '/whatsapp',  icon: MessageCircle, badge: 3 },
      { label: 'Pipeline',  href: '/pipeline',  icon: KanbanSquare },
    ],
  },
  {
    title: 'CLIENTES',
    items: [
      { label: 'Clientes',  href: '/clientes',  icon: Users },
      { label: 'Historial', href: '/historial', icon: Clock },
    ],
  },
  {
    title: 'ANÁLISIS',
    items: [
      { label: 'Reportes', href: '/reportes', icon: BarChart3 },
    ],
  },
]

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className={[
        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
        active
          ? 'text-white shadow-sm'
          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
      ].join(' ')}
      style={active ? { backgroundColor: BRAND } : {}}
    >
      <Icon
        size={16}
        strokeWidth={active ? 2.5 : 2}
        className={active ? 'text-white' : 'text-gray-400'}
      />
      <span className="flex-1">{item.label}</span>
      {item.badge !== undefined && (
        <span className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none ${active ? 'bg-white text-blue-700' : 'bg-red-500 text-white'}`}>
          {item.badge}
        </span>
      )}
    </Link>
  )
}

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-gray-100 bg-white">

      {/* Logo */}
      <div className="flex items-center justify-center px-5 py-5 border-b border-gray-100">
        <Image
          src="/LOGO.png"
          alt="Insumos Roller"
          width={160}
          height={48}
          className="object-contain"
          priority
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <div className="space-y-6">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="mb-2 px-3 text-[10px] font-bold tracking-widest text-gray-300 uppercase">
                {section.title}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <NavLink
                      item={item}
                      active={pathname === item.href || pathname.startsWith(item.href + '/')}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-gray-100 px-3 py-3">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-700"
          onClick={() => {}}
        >
          <LogOut size={15} strokeWidth={2} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  )
}