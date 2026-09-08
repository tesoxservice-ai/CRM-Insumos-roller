// app/(auth)/login/page.tsx
// Página de inicio de sesión. La lógica de autenticación se implementará en etapas posteriores.

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Iniciar sesión',
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-gray-900">
          CRM Insumos Roller
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          Ingresá con tu cuenta para continuar.
        </p>

        {/* Formulario de login — implementar en próxima etapa */}
        <p className="text-center text-sm text-gray-400">
          Formulario de login pendiente de implementación.
        </p>
      </div>
    </main>
  )
}
