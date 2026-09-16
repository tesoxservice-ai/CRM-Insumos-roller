// app/(dashboard)/layout.tsx
import Sidebar from '@/components/layout/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden p-3 pb-24 md:p-6">
        {children}
      </main>
    </div>
  )
}