// lib/supabase/client.ts
// Cliente de Supabase para uso en el navegador (Client Components).
// Usa createBrowserClient de @supabase/ssr para manejar cookies automáticamente.

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
