// lib/supabase/server.ts
// Cliente de Supabase para uso en el servidor (Server Components, Route Handlers, Server Actions).
// Usa createServerClient de @supabase/ssr con acceso a cookies de Next.js.

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll puede fallar en Server Components (solo lectura).
            // Se puede ignorar si se tiene middleware refrescando la sesión.
          }
        },
      },
    }
  )
}
