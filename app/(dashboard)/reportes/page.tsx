// app/(dashboard)/reportes/page.tsx

import { Metadata } from 'next'
import { ReportesView } from '@/components/reportes/ReportesView'

export const metadata: Metadata = {
  title: 'Reportes',
}

export default function ReportesPage() {
  return <ReportesView />
}
