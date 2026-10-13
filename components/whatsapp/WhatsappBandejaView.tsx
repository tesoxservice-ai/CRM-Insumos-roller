// components/whatsapp/WhatsappBandejaView.tsx
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Archive, ArchiveRestore, ArrowLeft, ExternalLink, MessageCircle, Plus, Search, UserPlus,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { EVENTO_WA_LEIDOS, useClientes } from '@/lib/supabase/hooks'
import {
  archivarConversacion, getConversacionesArchivadas, getMensajesWhatsapp,
  getOportunidadesByCliente, marcarConversacionLeida, vincularMensajesACliente,
} from '@/lib/supabase/queries'
import { claveTelefono } from '@/lib/whatsapp/telefono'
import NuevoClienteModal from '@/components/clientes/NuevoClienteModal'
import NuevaOportunidadModal from './NuevaOportunidadModal'
import type { Cliente, Oportunidad, WhatsappMensaje } from '@/lib/types'

const BRAND = '#1B3FA0'
const REFRESCO_MS = 20_000

interface Conversacion {
  clave: string
  telefono: string
  nombrePerfil: string | null
  cliente: Cliente | null
  mensajes: WhatsappMensaje[] // orden cronológico
  ultimo: WhatsappMensaje
  noLeidos: number
  archivada: boolean
}

type Filtro = 'todas' | 'sin_leer' | 'sin_cliente' | 'archivadas'

const FILTROS: { id: Filtro; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'sin_leer', label: 'Sin leer' },
  { id: 'sin_cliente', label: 'Sin cliente' },
  { id: 'archivadas', label: 'Archivadas' },
]

function formatTelefono(digitos: string): string {
  return `+${digitos}`
}

function tituloConversacion(c: Conversacion): string {
  return c.cliente?.nombre || c.nombrePerfil || formatTelefono(c.telefono)
}

function formatHoraLista(iso: string): string {
  const d = new Date(iso)
  const hoy = new Date()
  if (d.toDateString() === hoy.toDateString()) return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  const ayer = new Date(hoy.getTime() - 86_400_000)
  if (d.toDateString() === ayer.toDateString()) return 'Ayer'
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function formatDia(iso: string): string {
  const d = new Date(iso)
  const hoy = new Date()
  if (d.toDateString() === hoy.toDateString()) return 'Hoy'
  const ayer = new Date(hoy.getTime() - 86_400_000)
  if (d.toDateString() === ayer.toDateString()) return 'Ayer'
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function formatHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function textoMensaje(m: WhatsappMensaje): string {
  return m.texto ?? `[${m.tipo}]`
}

function Avatar({ nombre, size = 40 }: { nombre: string; size?: number }) {
  const inicial = /[a-z0-9]/i.test(nombre.charAt(0)) ? nombre.charAt(0).toUpperCase() : '#'
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-500"
      style={{ width: size, height: size }}
    >
      {inicial}
    </div>
  )
}

// ── Lista de conversaciones ─────────────────────────────────────────────────

function ListaConversaciones({
  conversaciones, seleccionada, onSeleccionar, filtro, onFiltro, busqueda, onBusqueda, contadores,
}: {
  conversaciones: Conversacion[]
  seleccionada: string | null
  onSeleccionar: (clave: string) => void
  filtro: Filtro
  onFiltro: (f: Filtro) => void
  busqueda: string
  onBusqueda: (v: string) => void
  contadores: Record<Filtro, number>
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-3 border-b border-gray-100 p-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => onBusqueda(e.target.value)}
            placeholder="Buscar nombre o teléfono…"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm outline-none placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onFiltro(f.id)}
              className={[
                'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                filtro === f.id ? 'text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100',
              ].join(' ')}
              style={filtro === f.id ? { backgroundColor: BRAND } : {}}
            >
              {f.label}{contadores[f.id] > 0 && f.id !== 'todas' ? ` (${contadores[f.id]})` : ''}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {conversaciones.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <MessageCircle size={28} className="text-gray-200" />
            <p className="text-sm text-gray-400">No hay conversaciones en esta vista.</p>
          </div>
        ) : (
          <ul>
            {conversaciones.map((c) => {
              const activa = c.clave === seleccionada
              return (
                <li key={c.clave}>
                  <button
                    type="button"
                    onClick={() => onSeleccionar(c.clave)}
                    className={[
                      'flex w-full items-center gap-3 border-b border-gray-50 px-3 py-3 text-left transition-colors',
                      activa ? 'bg-blue-50/60' : 'hover:bg-gray-50',
                    ].join(' ')}
                  >
                    <Avatar nombre={tituloConversacion(c)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`truncate text-sm ${c.noLeidos > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>
                          {tituloConversacion(c)}
                        </p>
                        <span className="shrink-0 text-[11px] text-gray-400">{formatHoraLista(c.ultimo.timestamp_wa)}</span>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <p className={`truncate text-xs ${c.noLeidos > 0 ? 'text-gray-700' : 'text-gray-400'}`}>
                          {c.ultimo.direccion === 'saliente' && <span className="text-gray-400">Vos: </span>}
                          {textoMensaje(c.ultimo)}
                        </p>
                        {c.noLeidos > 0 && (
                          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white">
                            {c.noLeidos}
                          </span>
                        )}
                      </div>
                      {!c.cliente && (
                        <span className="mt-1 inline-block rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                          Número nuevo
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

// ── Chat ────────────────────────────────────────────────────────────────────

function Chat({
  conversacion, oportunidades, onVolver, onVerFicha, onCrearCliente, onCrearOportunidad, onArchivar,
}: {
  conversacion: Conversacion
  oportunidades: Oportunidad[]
  onVolver: () => void
  onVerFicha: () => void
  onCrearCliente: () => void
  onCrearOportunidad: () => void
  onArchivar: () => void
}) {
  const finRef = useRef<HTMLDivElement>(null)
  const cantidad = conversacion.mensajes.length
  const clave = conversacion.clave

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: 'end' })
  }, [clave, cantidad])

  const opsAbiertas = oportunidades.filter((o) => o.estado_pipeline !== 'ganado' && o.estado_pipeline !== 'perdido')

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Encabezado */}
      <div className="shrink-0 border-b border-gray-100 px-3 py-3 md:px-5">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onVolver} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 md:hidden" aria-label="Volver">
            <ArrowLeft size={18} />
          </button>
          <Avatar nombre={tituloConversacion(conversacion)} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">{tituloConversacion(conversacion)}</p>
            <p className="truncate text-xs text-gray-400">
              {formatTelefono(conversacion.telefono)}
              {conversacion.cliente
                ? ' · Cliente del CRM'
                : conversacion.nombrePerfil ? ` · Perfil de WhatsApp: ${conversacion.nombrePerfil}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onArchivar}
            title={conversacion.archivada ? 'Desarchivar' : 'Archivar (no es un cliente)'}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            {conversacion.archivada ? <ArchiveRestore size={16} /> : <Archive size={16} />}
          </button>
        </div>

        {/* Acciones */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {conversacion.cliente ? (
            <>
              <button type="button" onClick={onVerFicha} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                <ExternalLink size={13} /> Ver ficha
              </button>
              <button type="button" onClick={onCrearOportunidad} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm" style={{ backgroundColor: BRAND }}>
                <Plus size={13} /> Crear oportunidad
              </button>
              {opsAbiertas.length > 0 && (
                <span className="text-xs text-gray-500">
                  {opsAbiertas.length === 1 ? '1 oportunidad abierta' : `${opsAbiertas.length} oportunidades abiertas`}
                </span>
              )}
            </>
          ) : (
            <>
              <button type="button" onClick={onCrearCliente} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm" style={{ backgroundColor: BRAND }}>
                <UserPlus size={13} /> Crear cliente
              </button>
              <span className="text-xs text-gray-400">Este número todavía no está en el CRM.</span>
            </>
          )}
        </div>
      </div>

      {/* Mensajes */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50/60 px-3 py-4 md:px-5">
        <div className="mx-auto flex max-w-2xl flex-col gap-1.5">
          {conversacion.mensajes.map((m, i) => {
            const previo = conversacion.mensajes[i - 1]
            const nuevoDia = !previo || new Date(previo.timestamp_wa).toDateString() !== new Date(m.timestamp_wa).toDateString()
            const saliente = m.direccion === 'saliente'
            return (
              <div key={m.id} className="contents">
                {nuevoDia && (
                  <div className="my-2 flex justify-center">
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium capitalize text-gray-400 shadow-sm">{formatDia(m.timestamp_wa)}</span>
                  </div>
                )}
                <div className={`flex ${saliente ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={[
                      'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-sm md:max-w-[75%]',
                      saliente ? 'rounded-br-md bg-emerald-100 text-gray-900' : 'rounded-bl-md bg-white text-gray-900',
                    ].join(' ')}
                  >
                    <p className={`whitespace-pre-wrap break-words ${m.texto ? '' : 'italic text-gray-500'}`}>{textoMensaje(m)}</p>
                    <p className="mt-1 text-right text-[10px] text-gray-400">{formatHora(m.timestamp_wa)}</p>
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={finRef} />
        </div>
      </div>

      <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-2.5 text-center text-xs text-gray-400">
        Para responder usá WhatsApp Business en el celular: lo que enviás desde ahí aparece en esta conversación.
      </div>
    </div>
  )
}

// ── Vista principal ─────────────────────────────────────────────────────────

export default function WhatsappBandejaView() {
  const router = useRouter()
  const { clientes, refetch: refetchClientes } = useClientes()
  const [mensajes, setMensajes] = useState<WhatsappMensaje[]>([])
  const [archivadas, setArchivadas] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [seleccionada, setSeleccionada] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [busqueda, setBusqueda] = useState('')
  const [oportunidades, setOportunidades] = useState<Oportunidad[]>([])
  const [modalCliente, setModalCliente] = useState(false)
  const [modalOportunidad, setModalOportunidad] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const [{ data, error: err }, arch] = await Promise.all([getMensajesWhatsapp(), getConversacionesArchivadas()])
    if (err) setError(err)
    else { setError(null); setMensajes(data); setArchivadas(arch) }
    setLoading(false)
  }, [])

  // Carga inicial + refresco en vivo (realtime) + respaldo por polling
  useEffect(() => {
    cargar()
    const supabase = createClient()
    const canal = supabase
      .channel('whatsapp-bandeja')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_mensajes' }, () => { cargar() })
      .subscribe()
    const timer = setInterval(cargar, REFRESCO_MS)
    return () => { clearInterval(timer); supabase.removeChannel(canal) }
  }, [cargar])

  const conversaciones = useMemo<Conversacion[]>(() => {
    const clientePorClave = new Map<string, Cliente>()
    for (const c of clientes) {
      if (c.telefono) {
        const clave = claveTelefono(c.telefono)
        if (clave && !clientePorClave.has(clave)) clientePorClave.set(clave, c)
      }
    }

    const porClave = new Map<string, WhatsappMensaje[]>()
    for (const m of mensajes) {
      const lista = porClave.get(m.telefono_clave)
      if (lista) lista.push(m)
      else porClave.set(m.telefono_clave, [m])
    }

    const resultado: Conversacion[] = []
    for (const [clave, lista] of porClave) {
      const cronologico = [...lista].sort((a, b) => a.timestamp_wa.localeCompare(b.timestamp_wa))
      const ultimo = cronologico[cronologico.length - 1]
      const archivadaAt = archivadas[clave]
      resultado.push({
        clave,
        telefono: ultimo.telefono,
        nombrePerfil: [...cronologico].reverse().find((m) => m.nombre_perfil)?.nombre_perfil ?? null,
        cliente: clientePorClave.get(clave) ?? null,
        mensajes: cronologico,
        ultimo,
        noLeidos: cronologico.filter((m) => !m.leido && m.direccion === 'entrante').length,
        archivada: !!archivadaAt && ultimo.timestamp_wa <= archivadaAt,
      })
    }
    return resultado.sort((a, b) => b.ultimo.timestamp_wa.localeCompare(a.ultimo.timestamp_wa))
  }, [mensajes, clientes, archivadas])

  const contadores = useMemo<Record<Filtro, number>>(() => {
    const activas = conversaciones.filter((c) => !c.archivada)
    return {
      todas: activas.length,
      sin_leer: activas.filter((c) => c.noLeidos > 0).length,
      sin_cliente: activas.filter((c) => !c.cliente).length,
      archivadas: conversaciones.length - activas.length,
    }
  }, [conversaciones])

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    const qDigitos = q.replace(/\D/g, '')
    return conversaciones.filter((c) => {
      if (filtro === 'archivadas' ? !c.archivada : c.archivada) return false
      if (filtro === 'sin_leer' && c.noLeidos === 0) return false
      if (filtro === 'sin_cliente' && c.cliente) return false
      if (!q) return true
      return (
        tituloConversacion(c).toLowerCase().includes(q) ||
        (c.nombrePerfil ?? '').toLowerCase().includes(q) ||
        (qDigitos.length > 0 && c.telefono.includes(qDigitos))
      )
    })
  }, [conversaciones, filtro, busqueda])

  const actual = useMemo(() => conversaciones.find((c) => c.clave === seleccionada) ?? null, [conversaciones, seleccionada])
  const actualClienteId = actual?.cliente?.id ?? null

  // Oportunidades del cliente de la conversación abierta
  const cargarOportunidades = useCallback(async () => {
    if (!actualClienteId) { setOportunidades([]); return }
    const { data } = await getOportunidadesByCliente(actualClienteId)
    setOportunidades(data ?? [])
  }, [actualClienteId])
  useEffect(() => { cargarOportunidades() }, [cargarOportunidades])

  // Al abrir (o recibir mensajes en) la conversación abierta, se marca como leída
  const noLeidosActual = actual?.noLeidos ?? 0
  useEffect(() => {
    if (!seleccionada || noLeidosActual === 0) return
    marcarConversacionLeida(seleccionada).then(({ error: err }) => {
      if (err) return
      setMensajes((prev) => prev.map((m) => (m.telefono_clave === seleccionada ? { ...m, leido: true } : m)))
      window.dispatchEvent(new Event(EVENTO_WA_LEIDOS))
    })
  }, [seleccionada, noLeidosActual])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 5000)
    return () => clearTimeout(t)
  }, [aviso])

  async function handleClienteCreado(cliente?: Cliente) {
    if (!cliente || !actual) { refetchClientes(); return }
    const { error: err } = await vincularMensajesACliente(actual.clave, cliente.id)
    refetchClientes()
    cargar()
    setAviso(err ? `Cliente creado, pero no se pudieron vincular los mensajes: ${err}` : 'Cliente creado. Ya podés crear una oportunidad.')
  }

  async function handleArchivar() {
    if (!actual) return
    const archivar = !actual.archivada
    const { error: err } = await archivarConversacion(actual.clave, archivar)
    if (err) { setAviso(`No se pudo ${archivar ? 'archivar' : 'desarchivar'}: ${err}`); return }
    await cargar()
    if (archivar) setSeleccionada(null)
    setAviso(archivar ? 'Conversación archivada. Vuelve a aparecer si ese número escribe de nuevo.' : 'Conversación desarchivada.')
  }

  return (
    <div className="flex h-[calc(100dvh-9.5rem)] flex-col md:h-[calc(100dvh-3rem)]">
      <div className="mb-3 shrink-0">
        <h1 className="text-xl font-bold text-gray-900">WhatsApp</h1>
        <p className="mt-0.5 text-sm text-gray-400">Conversaciones del WhatsApp Business de la empresa</p>
      </div>

      {aviso && <p className="mb-3 shrink-0 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{aviso}</p>}
      {error && (
        <p className="mb-3 shrink-0 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
          No se pudieron cargar los mensajes: {error}
        </p>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className={`${actual ? 'hidden md:block' : 'block'} w-full shrink-0 border-r border-gray-100 md:w-80`}>
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />)}
            </div>
          ) : (
            <ListaConversaciones
              conversaciones={visibles}
              seleccionada={seleccionada}
              onSeleccionar={setSeleccionada}
              filtro={filtro}
              onFiltro={setFiltro}
              busqueda={busqueda}
              onBusqueda={setBusqueda}
              contadores={contadores}
            />
          )}
        </div>

        <div className={`${actual ? 'block' : 'hidden md:block'} min-w-0 flex-1`}>
          {actual ? (
            <Chat
              conversacion={actual}
              oportunidades={oportunidades}
              onVolver={() => setSeleccionada(null)}
              onVerFicha={() => actual.cliente && router.push(`/clientes/${actual.cliente.id}`)}
              onCrearCliente={() => setModalCliente(true)}
              onCrearOportunidad={() => setModalOportunidad(true)}
              onArchivar={handleArchivar}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <MessageCircle size={36} className="text-gray-200" />
              <p className="text-sm text-gray-400">
                {!loading && conversaciones.length === 0 ? 'Todavía no llegaron mensajes.' : 'Elegí una conversación para verla.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {modalCliente && actual && (
        <NuevoClienteModal
          onClose={() => setModalCliente(false)}
          onSuccess={handleClienteCreado}
          initial={{ nombre: actual.nombrePerfil ?? '', telefono: formatTelefono(actual.telefono), canal_entrada: 'whatsapp' }}
        />
      )}
      {modalOportunidad && actual?.cliente && (
        <NuevaOportunidadModal
          cliente={actual.cliente}
          onClose={() => setModalOportunidad(false)}
          onSuccess={() => { cargarOportunidades(); setAviso('Oportunidad creada. La ves en el Pipeline.') }}
        />
      )}
    </div>
  )
}
