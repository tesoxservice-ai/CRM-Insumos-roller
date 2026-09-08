// app/(dashboard)/historial/page.tsx

import { Metadata } from 'next'
import { HistorialView } from '@/components/historial/HistorialView'

export const metadata: Metadata = {
  title: 'Historial',
}

export default function HistorialPage() {
  return <HistorialView />
}
