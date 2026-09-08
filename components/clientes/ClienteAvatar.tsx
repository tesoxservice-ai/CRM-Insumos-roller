// components/clientes/ClienteAvatar.tsx
// Avatar circular con iniciales generadas a partir del nombre.
// El color de fondo es determinístico: mismo nombre → mismo color siempre.

interface ClienteAvatarProps {
  nombre: string
  size?: 'sm' | 'md' | 'lg'
}

// ─── Paleta de colores ────────────────────────────────────────────────────
// 6 pares bg/text en Tailwind, suficientemente distintos entre sí.

const COLOR_CLASSES: ReadonlyArray<{ bg: string; text: string }> = [
  { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  { bg: 'bg-emerald-100',text: 'text-emerald-700' },
  { bg: 'bg-violet-100', text: 'text-violet-700'  },
  { bg: 'bg-amber-100',  text: 'text-amber-700'   },
  { bg: 'bg-rose-100',   text: 'text-rose-700'    },
  { bg: 'bg-cyan-100',   text: 'text-cyan-700'    },
]

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Hash simple pero estable: suma de char codes del string */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash + str.charCodeAt(i)) % COLOR_CLASSES.length
  }
  return hash
}

/** Extrae hasta 2 iniciales de un nombre */
function getInitials(nombre: string): string {
  const words = nombre.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].charAt(0).toUpperCase()
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase()
}

// ─── Tamaños ──────────────────────────────────────────────────────────────

const SIZE_CLASSES = {
  sm: { container: 'h-7 w-7',  text: 'text-[10px] font-semibold' },
  md: { container: 'h-9 w-9',  text: 'text-xs font-semibold'     },
  lg: { container: 'h-14 w-14',text: 'text-lg font-bold'         },
} as const

// ─── Componente ───────────────────────────────────────────────────────────

export default function ClienteAvatar({
  nombre,
  size = 'md',
}: ClienteAvatarProps) {
  const initials = getInitials(nombre)
  const colorIndex = hashString(nombre)
  const { bg, text } = COLOR_CLASSES[colorIndex]
  const { container, text: textSize } = SIZE_CLASSES[size]

  return (
    <div
      className={[
        'flex shrink-0 items-center justify-center rounded-full',
        container,
        bg,
      ].join(' ')}
      aria-hidden="true"
    >
      <span className={[textSize, text, 'leading-none select-none'].join(' ')}>
        {initials}
      </span>
    </div>
  )
}
