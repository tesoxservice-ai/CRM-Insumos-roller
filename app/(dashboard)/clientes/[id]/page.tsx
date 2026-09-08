// app/(dashboard)/clientes/[id]/page.tsx
import FichaClienteView from '@/components/clientes/FichaClienteView'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ClientePage({ params }: PageProps) {
  const { id } = await params
  return <FichaClienteView id={id} />
}