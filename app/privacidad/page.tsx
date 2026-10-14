// app/privacidad/page.tsx
// Política de privacidad pública (la pide Google para publicar la conexión con Calendar).
// El middleware deja pasar esta ruta sin login.

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de privacidad',
}

export default function PrivacidadPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-gray-800">
      <h1 className="text-2xl font-bold text-gray-900">Política de privacidad</h1>
      <p className="mt-1 text-sm text-gray-400">CRM Insumos Roller · Última actualización: octubre de 2026</p>

      <section className="mt-8 space-y-3 text-sm leading-relaxed">
        <h2 className="text-base font-semibold text-gray-900">Qué es este sistema</h2>
        <p>
          CRM Insumos Roller es una herramienta de uso interno de Insumos Roller para gestionar clientes,
          oportunidades de venta y seguimientos. Solo accede el personal autorizado de la empresa.
        </p>
      </section>

      <section className="mt-6 space-y-3 text-sm leading-relaxed">
        <h2 className="text-base font-semibold text-gray-900">Uso de Google Calendar</h2>
        <p>
          El sistema se conecta a una cuenta de Google Calendar de la empresa únicamente para crear, mostrar,
          editar y eliminar los eventos de seguimiento de clientes que cargamos desde el CRM. No lee ni usa
          ninguna otra información de la cuenta de Google.
        </p>
      </section>

      <section className="mt-6 space-y-3 text-sm leading-relaxed">
        <h2 className="text-base font-semibold text-gray-900">Qué datos guardamos</h2>
        <p>
          Guardamos los datos de contacto de nuestros clientes (nombre, teléfono) y el historial comercial
          necesario para atenderlos. Esos datos son de uso exclusivo de Insumos Roller.
        </p>
      </section>

      <section className="mt-6 space-y-3 text-sm leading-relaxed">
        <h2 className="text-base font-semibold text-gray-900">Con quién compartimos la información</h2>
        <p>
          No vendemos ni compartimos datos con terceros, salvo los proveedores de infraestructura necesarios
          para que el sistema funcione (alojamiento y base de datos), que los tratan solo para ese fin.
        </p>
      </section>

      <section className="mt-6 space-y-3 text-sm leading-relaxed">
        <h2 className="text-base font-semibold text-gray-900">Cómo revocar el acceso</h2>
        <p>
          El acceso a Google Calendar se puede revocar en cualquier momento desde la cuenta de Google, en
          «Seguridad → Apps de terceros con acceso a la cuenta».
        </p>
      </section>

      <section className="mt-6 space-y-3 text-sm leading-relaxed">
        <h2 className="text-base font-semibold text-gray-900">Contacto</h2>
        <p>
          Por consultas sobre esta política: <a className="text-blue-700 underline" href="mailto:insumosroller00@gmail.com">insumosroller00@gmail.com</a>
        </p>
      </section>
    </main>
  )
}
