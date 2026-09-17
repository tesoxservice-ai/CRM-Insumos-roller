// app/(dashboard)/cotizador/page.tsx

import { Metadata } from 'next'
import { CotizadorView } from '@/components/cotizador/CotizadorView'

export const metadata: Metadata = {
  title: 'Cotizador',
}

export default function CotizadorPage() {
  return <CotizadorView />
}
