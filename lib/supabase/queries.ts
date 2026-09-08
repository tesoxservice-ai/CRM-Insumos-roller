// lib/supabase/queries.ts
// Funciones de acceso a datos para el CRM Insumos Roller.
// Todas usan el cliente servidor (cookies/SSR) y retornan { data, error }
// sin hacer throw — el llamador decide cómo manejar el error.

import { createClient } from '@/lib/supabase/client'
import type {
  Cliente,
  ClienteConRelaciones,
  CanalEntrada,
  EstadoCliente,
  EstadoPipeline,
  Interaccion,
  Oportunidad,
  TipoInteraccion,
} from '@/lib/types'

// ─── Tipos internos de retorno ─────────────────────────────────────────────

type QueryResult<T> = Promise<{ data: T | null; error: Error | null }>

// Fila raw del JOIN oportunidades → clientes
interface OportunidadConCliente extends Oportunidad {
  cliente: Cliente
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Convierte el error de Supabase a Error estándar */
function toError(raw: { message: string } | null): Error | null {
  return raw ? new Error(raw.message) : null
}

// ============================================================
// CLIENTES
// ============================================================

/**
 * Obtiene todos los clientes ordenados por ultima_interaccion DESC.
 * Los clientes sin interacciones aparecen al final.
 */
export async function getClientes(): QueryResult<Cliente[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('ultima_interaccion', { ascending: false, nullsFirst: false })

  return { data: data ?? null, error: toError(error) }
}

/**
 * Obtiene un cliente por ID junto con sus oportunidades e interacciones.
 */
export async function getClienteById(id: string): QueryResult<ClienteConRelaciones> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('clientes')
    .select(`
      *,
      oportunidades ( * ),
      interacciones ( * )
    `)
    .eq('id', id)
    .single()

  if (error) return { data: null, error: toError(error) }

  const cliente: ClienteConRelaciones = {
    id: data.id,
    nombre: data.nombre,
    telefono: data.telefono,
    estado: data.estado as EstadoCliente,
    canal_entrada: data.canal_entrada as CanalEntrada,
    created_at: data.created_at,
    ultima_interaccion: data.ultima_interaccion,
    oportunidades: (data.oportunidades ?? []).map(
      (o: Record<string, unknown>) => ({
        id: o.id as string,
        cliente_id: o.cliente_id as string,
        estado_pipeline: o.estado_pipeline as EstadoPipeline,
        monto: o.monto as number | null,
        detalle_cotizacion: o.detalle_cotizacion as string | null,
        created_at: o.created_at as string,
      })
    ),
    interacciones: (data.interacciones ?? []).map(
      (i: Record<string, unknown>) => ({
        id: i.id as string,
        cliente_id: i.cliente_id as string,
        tipo: i.tipo as TipoInteraccion,
        descripcion: i.descripcion as string,
        created_at: i.created_at as string,
      })
    ),
  }

  return { data: cliente, error: null }
}

/**
 * Crea un nuevo cliente.
 */
export async function createCliente(
  data: Partial<Omit<Cliente, 'id' | 'created_at'>>
): QueryResult<Cliente> {
  const supabase = createClient()

  const { data: row, error } = await supabase
    .from('clientes')
    .insert(data)
    .select()
    .single()

  return { data: row ?? null, error: toError(error) }
}

/**
 * Actualiza campos de un cliente existente.
 */
export async function updateCliente(
  id: string,
  payload: Partial<Omit<Cliente, 'id' | 'created_at'>>
): QueryResult<Cliente> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('clientes')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  return { data: data ?? null, error: toError(error) }
}

/**
 * Busca un cliente por número de teléfono exacto.
 * Útil para detectar duplicados o al recibir mensajes de WhatsApp.
 */
export async function getClienteByTelefono(
  telefono: string
): QueryResult<Cliente> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('telefono', telefono)
    .maybeSingle()

  return { data: data ?? null, error: toError(error) }
}

// ============================================================
// OPORTUNIDADES
// ============================================================

/**
 * Obtiene todas las oportunidades con el cliente relacionado.
 * Útil para el tablero Kanban del pipeline.
 */
export async function getOportunidades(): QueryResult<OportunidadConCliente[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('oportunidades')
    .select(`
      *,
      cliente:clientes ( * )
    `)
    .order('created_at', { ascending: false })

  if (error) return { data: null, error: toError(error) }

  const oportunidades: OportunidadConCliente[] = (data ?? []).map((row) => ({
    id: row.id,
    cliente_id: row.cliente_id,
    estado_pipeline: row.estado_pipeline as EstadoPipeline,
    monto: row.monto,
    detalle_cotizacion: row.detalle_cotizacion,
    created_at: row.created_at,
    cliente: row.cliente as Cliente,
  }))

  return { data: oportunidades, error: null }
}

/**
 * Obtiene las oportunidades de un cliente específico.
 */
export async function getOportunidadesByCliente(
  clienteId: string
): QueryResult<Oportunidad[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('oportunidades')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false })

  return { data: data ?? null, error: toError(error) }
}

/**
 * Crea una nueva oportunidad.
 */
export async function createOportunidad(
  data: Partial<Omit<Oportunidad, 'id' | 'created_at'>>
): QueryResult<Oportunidad> {
  const supabase = createClient()

  const { data: row, error } = await supabase
    .from('oportunidades')
    .insert(data)
    .select()
    .single()

  return { data: row ?? null, error: toError(error) }
}

/**
 * Actualiza campos de una oportunidad existente.
 */
export async function updateOportunidad(
  id: string,
  payload: Partial<Omit<Oportunidad, 'id' | 'created_at'>>
): QueryResult<Oportunidad> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('oportunidades')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  return { data: data ?? null, error: toError(error) }
}

/**
 * Actualiza únicamente el estado del pipeline de una oportunidad.
 * El trigger `trg_cliente_activo_en_ganado` en la DB maneja el side-effect
 * de marcar al cliente como activo cuando el estado es 'ganado'.
 */
export async function updateEstadoPipeline(
  id: string,
  estado: EstadoPipeline
): QueryResult<Oportunidad> {
  return updateOportunidad(id, { estado_pipeline: estado })
}

// ============================================================
// INTERACCIONES
// ============================================================

/**
 * Obtiene todas las interacciones de un cliente, ordenadas por fecha DESC.
 */
export async function getInteraccionesByCliente(
  clienteId: string
): QueryResult<Interaccion[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('interacciones')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false })

  return { data: data ?? null, error: toError(error) }
}

/**
 * Registra una nueva interacción con un cliente.
 * El trigger `trg_actualizar_ultima_interaccion` en la DB actualiza
 * automáticamente `clientes.ultima_interaccion`.
 */
export async function createInteraccion(
  data: Omit<Interaccion, 'id' | 'created_at'>
): QueryResult<Interaccion> {
  const supabase = createClient()

  const { data: row, error } = await supabase
    .from('interacciones')
    .insert(data)
    .select()
    .single()

  return { data: row ?? null, error: toError(error) }
}
export type InteraccionConCliente = Interaccion & { cliente: Cliente }

export async function getTodasInteracciones(): Promise<{
  data: InteraccionConCliente[] | null
  error: string | null
}> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('interacciones')
    .select(`
      *,
      cliente:clientes (*)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as InteraccionConCliente[], error: null }
}
export interface ReportesData {
  clientes: Cliente[]
  oportunidades: Oportunidad[]
  interacciones: Interaccion[]
  error: string | null
}

export async function getReportesData(): Promise<ReportesData> {
  const supabase = createClient()

  const [clientesRes, oportunidadesRes, interaccionesRes] = await Promise.all([
    supabase.from('clientes').select('*'),
    supabase.from('oportunidades').select('*'),
    supabase.from('interacciones').select('*'),
  ])

  if (clientesRes.error) {
    return { clientes: [], oportunidades: [], interacciones: [], error: clientesRes.error.message }
  }
  if (oportunidadesRes.error) {
    return { clientes: [], oportunidades: [], interacciones: [], error: oportunidadesRes.error.message }
  }
  if (interaccionesRes.error) {
    return { clientes: [], oportunidades: [], interacciones: [], error: interaccionesRes.error.message }
  }

  return {
    clientes: clientesRes.data as Cliente[],
    oportunidades: oportunidadesRes.data as Oportunidad[],
    interacciones: interaccionesRes.data as Interaccion[],
    error: null,
  }
}
// ── getOportunidadAbiertaByCliente ────────────────────────────────────────────

export async function getOportunidadAbiertaByCliente(clienteId: string): Promise<{
  data: Oportunidad | null
  error: string | null
}> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('oportunidades')
    .select('*')
    .eq('cliente_id', clienteId)
    .not('estado_pipeline', 'in', '("ganado","perdido")')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return { data: null, error: error.message }
  return { data: data as Oportunidad | null, error: null }
}