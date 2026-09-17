// app/(dashboard)/layout.tsx
import Sidebar from '@/components/layout/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-[100dvh] overflow-hidden bg-white">
      <Sidebar />
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 pb-28 md:p-6">
        {children}
      </main>
    </div>
  )
}