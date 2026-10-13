// app/(dashboard)/whatsapp/page.tsx
// Bandeja de WhatsApp Business. Server Component — renderiza WhatsappBandejaView.

import type { Metadata } from 'next'
import WhatsappBandejaView from '@/components/whatsapp/WhatsappBandejaView'

export const metadata: Metadata = {
  title: 'WhatsApp',
}

export default function WhatsappPage() {
  return <WhatsappBandejaView />
}
