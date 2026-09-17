// components/layout/Sidebar.tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, KanbanSquare, Wallet, MoreHorizontal, Calculator,
  Users, Clock, BarChart3, Calendar, LogOut, X, Trash2, type LucideIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { User } from '@supabase/supabase-js'

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
      { label: 'Dashboard',  href: '/dashboard', icon: LayoutDashboard },
      { label: 'Caja',       href: '/caja',      icon: Wallet },
      { label: 'Pipeline',   href: '/pipeline',  icon: KanbanSquare },
      { label: 'Cotizador',  href: '/cotizador', icon: Calculator },
      { label: 'Calendario', href: '/calendar',  icon: Calendar },
    ],
  },
  {
    title: 'CLIENTES',
    items: [
      { label: 'Clientes',  href: '/clientes',  icon: Users },
      { label: 'Historial', href: '/historial', icon: Clock },
      { label: 'Papelera',  href: '/papelera',  icon: Trash2 },
    ],
  },
  {
    title: 'ANÁLISIS',
    items: [
      { label: 'Reportes', href: '/reportes', icon: BarChart3 },
    ],
  },
]

// Ítems fijos de la barra inferior en mobile — el resto vive en el drawer "Más"
const MOBILE_TABS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Clientes',  href: '/clientes',  icon: Users },
  { label: 'Pipeline',  href: '/pipeline',  icon: KanbanSquare },
  { label: 'Caja',      href: '/caja',      icon: Wallet },
]

const MOBILE_MAS_ITEMS: NavItem[] = [
  { label: 'Cotizador',  href: '/cotizador', icon: Calculator },
  { label: 'Historial',  href: '/historial', icon: Clock },
  { label: 'Reportes',   href: '/reportes',  icon: BarChart3 },
  { label: 'Calendario', href: '/calendar',  icon: Calendar },
  { label: 'Papelera',   href: '/papelera',  icon: Trash2 },
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

// Extrae el nombre del email: "tanya@insumos.com" → "Tanya"
function nombreDeEmail(email: string): string {
  const parte = email.split('@')[0]
  return parte.charAt(0).toUpperCase() + parte.slice(1)
}

// Iniciales para el avatar: "Tanya" → "T"
function iniciales(nombre: string): string {
  return nombre.charAt(0).toUpperCase()
}

function useUsuarioActual() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const nombre = user ? nombreDeEmail(user.email ?? '') : ''
  return { user, nombre, handleLogout }
}

function MobileTabLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className="flex flex-1 flex-col items-center justify-center gap-1 py-2"
      aria-label={item.label}
    >
      <Icon size={20} strokeWidth={active ? 2.5 : 2} color={active ? BRAND : '#9CA3AF'} />
    </Link>
  )
}

function MasDrawer({ onClose }: { onClose: () => void }) {
  const pathname = usePathname()
  const { user, nombre, handleLogout } = useUsuarioActual()

  return (
    <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full rounded-t-2xl bg-white shadow-2xl pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Más opciones</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        <nav className="px-3 py-3">
          <ul className="space-y-0.5">
            {MOBILE_MAS_ITEMS.map((item) => (
              <li key={item.href}>
                <NavLink
                  item={item}
                  active={pathname === item.href || pathname.startsWith(item.href + '/')}
                />
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-gray-100 px-3 py-3 space-y-1">
          {user && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: BRAND }}
              >
                {iniciales(nombre)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{nombre}</p>
                <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
              </div>
            </div>
          )}
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-50 hover:text-red-500"
            onClick={handleLogout}
          >
            <LogOut size={15} strokeWidth={2} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function BottomNav() {
  const pathname = usePathname()
  const [masAbierto, setMasAbierto] = useState(false)
  const masActivo = MOBILE_MAS_ITEMS.some((item) => pathname === item.href || pathname.startsWith(item.href + '/'))

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-gray-100 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_8px_rgba(0,0,0,0.04)]"
        aria-label="Navegación principal"
      >
        {MOBILE_TABS.map((item) => (
          <MobileTabLink
            key={item.href}
            item={item}
            active={pathname === item.href || pathname.startsWith(item.href + '/')}
          />
        ))}
        <button
          type="button"
          onClick={() => setMasAbierto(true)}
          className="flex flex-1 flex-col items-center justify-center gap-1 py-2"
          aria-label="Más opciones"
        >
          <MoreHorizontal size={20} strokeWidth={masActivo ? 2.5 : 2} color={masActivo ? BRAND : '#9CA3AF'} />
        </button>
      </nav>
      {masAbierto && <MasDrawer onClose={() => setMasAbierto(false)} />}
    </>
  )
}

function DesktopSidebar() {
  const pathname = usePathname()
  const { user, nombre, handleLogout } = useUsuarioActual()

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

      {/* Footer — usuario + cerrar sesión */}
      <div className="shrink-0 border-t border-gray-100 px-3 py-3 space-y-1">
        {/* Usuario logueado */}
        {user && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: BRAND }}
            >
              {iniciales(nombre)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{nombre}</p>
              <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
        )}

        {/* Botón cerrar sesión */}
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-50 hover:text-red-500"
          onClick={handleLogout}
        >
          <LogOut size={15} strokeWidth={2} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  )
}

export default function Sidebar() {
  const isMobile = useIsMobile()
  return isMobile ? <BottomNav /> : <DesktopSidebar />
}
