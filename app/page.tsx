// app/page.tsx
// Redirige automáticamente a /dashboard al acceder a la raíz del sitio.

import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/dashboard')
}
