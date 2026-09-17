// app/api/vendedores/route.ts
// Lista los usuarios registrados en Supabase Auth para poder asignarlos como
// vendedores de un cliente. Requiere sesión activa (no es un endpoint público).

import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function nombreDeEmail(email: string): string {
  const parte = email.split('@')[0]
  return parte.charAt(0).toUpperCase() + parte.slice(1)
}

export async function GET() {
  const supabaseAuth = await createServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabaseAdmin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabaseAdmin.auth.admin.listUsers()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const vendedores = data.users
    .filter((u) => !!u.email)
    .map((u) => ({ id: u.id, nombre: nombreDeEmail(u.email!) }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  return NextResponse.json({ vendedores })
}
