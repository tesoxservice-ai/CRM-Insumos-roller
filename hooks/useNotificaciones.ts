// hooks/useNotificaciones.ts

'use client'

import { useState, useEffect, useCallback } from 'react'
import { solicitarPermiso as pedirPermiso, estaPermitido } from '@/lib/notifications/push'

interface UseNotificacionesReturn {
  permiso: NotificationPermission
  solicitarPermiso: () => Promise<void>
  estaPermitido: boolean
  soportado: boolean
}

export function useNotificaciones(): UseNotificacionesReturn {
  const soportado =
    typeof window !== 'undefined' && 'Notification' in window

  const [permiso, setPermiso] = useState<NotificationPermission>(
    soportado ? Notification.permission : 'denied'
  )

  // Sincroniza si el usuario cambia el permiso desde ajustes del navegador
  useEffect(() => {
    if (!soportado) return
    setPermiso(Notification.permission)
  }, [soportado])

  const solicitarPermiso = useCallback(async () => {
    const resultado = await pedirPermiso()
    setPermiso(resultado)
  }, [])

  return {
    permiso,
    solicitarPermiso,
    estaPermitido: estaPermitido(),
    soportado,
  }
}
