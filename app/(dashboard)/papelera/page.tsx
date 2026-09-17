// app/(dashboard)/papelera/page.tsx

import { Metadata } from 'next'
import { PapeleraView } from '@/components/papelera/PapeleraView'

export const metadata: Metadata = {
  title: 'Papelera',
}

export default function PapeleraPage() {
  return <PapeleraView />
}
