// hooks/useIsMobile.ts
// Detecta si el ancho de la ventana es menor a 768px (breakpoint "md" de Tailwind).
// Escucha el evento resize para actualizarse en tiempo real.

'use client'

import { useState, useEffect } from 'react'

const MOBILE_BREAKPOINT = 768

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    // Evaluación inicial
    checkMobile()

    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}
