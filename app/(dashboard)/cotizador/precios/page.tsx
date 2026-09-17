// app/(dashboard)/cotizador/precios/page.tsx

import { Metadata } from 'next'
import { PreciosView } from '@/components/cotizador/PreciosView'

export const metadata: Metadata = {
  title: 'Precios del cotizador',
}

export default function PreciosCotizadorPage() {
  return <PreciosView />
}
