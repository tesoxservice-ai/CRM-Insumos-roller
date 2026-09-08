// components/layout/Topbar.tsx
// Barra superior del dashboard. Muestra el título y subtítulo dinámico
// según la ruta activa, y el avatar del usuario a la derecha.

'use client'

import { usePathname } from 'next/navigation'

// ─── Tipos ────────────────────────────────────────────────────────────────

interface PageMeta {
  title: string
  subtitle: string
}

// ─── Mapa de rutas → metadata ─────────────────────────────────────────────

const PAGE_META: Record<string, PageMeta> = {
  '/dashboard': { title: 'Dashboard',  subtitle: 'Resumen del día' },
  '/whatsapp':  { title: 'WhatsApp',   subtitle: 'Mensajes centralizados' },
  '/pipeline':  { title: 'Pipeline',   subtitle: 'Oportunidades de venta' },
  '/clientes':  { title: 'Clientes',   subtitle: 'Gestión de clientes' },
  '/historial': { title: 'Historial',  subtitle: 'Registro de interacciones' },
  '/reportes':  { title: 'Reportes',   subtitle: 'Métricas del negocio' },
}

const DEFAULT_META: PageMeta = { title: 'CRM Roller', subtitle: '' }

// ─── Helper: resuelve el segmento raíz de la ruta ─────────────────────────

function resolvePageMeta(pathname: string): PageMeta {
  // Coincidencia exacta primero
  if (PAGE_META[pathname]) return PAGE_META[pathname]

  // Coincidencia por prefijo (ej: /clientes/123 → /clientes)
  const match = Object.keys(PAGE_META).find((key) =>
    pathname.startsWith(key + '/')
  )

  return match ? PAGE_META[match] : DEFAULT_META
}

// ─── Sub-componente: Avatar ───────────────────────────────────────────────

function Avatar() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="hidden text-sm text-gray-400 sm:block">
        Insumos Roller
      </span>
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100"
        aria-label="Insumos Roller"
      >
        <span className="text-xs font-semibold leading-none text-green-700">
          IR
        </span>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────

export default function Topbar() {
  const pathname = usePathname()
  const { title, subtitle } = resolvePageMeta(pathname)

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">

      {/* ── Título dinámico ── */}
      <div className="flex flex-col justify-center">
        <h1 className="text-sm font-semibold leading-tight text-gray-900">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[11px] leading-tight text-gray-400">
            {subtitle}
          </p>
        )}
      </div>

      {/* ── Avatar ── */}
      <Avatar />
    </header>
  )
}
