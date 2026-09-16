// app/(dashboard)/caja/page.tsx

import { Metadata } from 'next'
import { CajaView } from '@/components/caja/CajaView'

export const metadata: Metadata = {
  title: 'Caja',
}

export default function CajaPage() {
  return <CajaView />
}
