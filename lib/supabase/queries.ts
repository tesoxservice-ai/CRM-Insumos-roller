// lib/supabase/queries.ts
import { createClient } from '@/lib/supabase/client'
import type {
  Cliente,
  ClienteConRelaciones,
  CanalEntrada,
  EstadoCliente,
  EstadoPipeline,
  Interaccion,
  MovimientoCaja,
  Oportunidad,
  TipoInteraccion,
  Vendedor,
} from '@/lib/types'

type QueryResult<T> = Promise<{ data: T | null; error: Error | null }>

interface OportunidadConCliente extends Oportunidad {
  cliente: Cliente
}

function toError(raw: { message: string } | null): Error | null {
  return raw ? new Error(raw.message) : null
}

// ── Helper: obtiene el ID del usuario logueado ────────────────────────────
async function getUserId(): Promise<string | null> {
  const supabase = createClient()
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

// ============================================================
// CLIENTES
// ============================================================

export async function getClientes(): QueryResult<Cliente[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('ultima_interaccion', { ascending: false, nullsFirst: false })
  return { data: data ?? null, error: toError(error) }
}

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
    creado_por: data.creado_por ?? null,
    vendedor_id: data.vendedor_id ?? null,
    vendedor_nombre: data.vendedor_nombre ?? null,
    oportunidades: (data.oportunidades ?? []).map(
      (o: Record<string, unknown>) => ({
        id: o.id as string,
        cliente_id: o.cliente_id as string,
        estado_pipeline: o.estado_pipeline as EstadoPipeline,
        monto: o.monto as number | null,
        detalle_cotizacion: o.detalle_cotizacion as string | null,
        created_at: o.created_at as string,
        creado_por: o.creado_por as string | null,
      })
    ),
    interacciones: (data.interacciones ?? []).map(
      (i: Record<string, unknown>) => ({
        id: i.id as string,
        cliente_id: i.cliente_id as string,
        tipo: i.tipo as TipoInteraccion,
        descripcion: i.descripcion as string,
        created_at: i.created_at as string,
        creado_por: i.creado_por as string | null,
        creado_por_nombre: i.creado_por_nombre as string | null,
      })
    ),
  }

  return { data: cliente, error: null }
}

export async function createCliente(
  data: Partial<Omit<Cliente, 'id' | 'created_at'>>
): QueryResult<Cliente> {
  const supabase = createClient()
  const userId = await getUserId()

  const { data: row, error } = await supabase
    .from('clientes')
    .insert({ ...data, creado_por: userId })
    .select()
    .single()

  return { data: row ?? null, error: toError(error) }
}

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

export async function getClienteByTelefono(telefono: string): QueryResult<Cliente> {
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

export async function getOportunidades(): QueryResult<OportunidadConCliente[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('oportunidades')
    .select(`*, cliente:clientes ( * )`)
    .order('created_at', { ascending: false })

  if (error) return { data: null, error: toError(error) }

  const oportunidades: OportunidadConCliente[] = (data ?? []).map((row) => ({
    id: row.id,
    cliente_id: row.cliente_id,
    estado_pipeline: row.estado_pipeline as EstadoPipeline,
    monto: row.monto,
    detalle_cotizacion: row.detalle_cotizacion,
    created_at: row.created_at,
    creado_por: row.creado_por ?? null,
    creado_por_nombre: row.creado_por_nombre ?? null,
    cliente: row.cliente as Cliente,
  }))

  return { data: oportunidades, error: null }
}

export async function getOportunidadesByCliente(clienteId: string): QueryResult<Oportunidad[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('oportunidades')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false })
  return { data: data ?? null, error: toError(error) }
}

export async function createOportunidad(
  data: Partial<Omit<Oportunidad, 'id' | 'created_at'>>
): QueryResult<Oportunidad> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const userId = user?.id ?? null
  const nombre = user?.email
    ? user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1)
    : null

  const { data: row, error } = await supabase
    .from('oportunidades')
    .insert({ ...data, creado_por: userId, creado_por_nombre: nombre })
    .select()
    .single()

  return { data: row ?? null, error: toError(error) }
}

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

export async function updateEstadoPipeline(
  id: string,
  estado: EstadoPipeline
): QueryResult<Oportunidad> {
  return updateOportunidad(id, { estado_pipeline: estado })
}

// ============================================================
// INTERACCIONES
// ============================================================

export async function getInteraccionesByCliente(clienteId: string): QueryResult<Interaccion[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('interacciones')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false })
  return { data: data ?? null, error: toError(error) }
}

export async function createInteraccion(
  data: Omit<Interaccion, 'id' | 'created_at' | 'creado_por' | 'creado_por_nombre'>
): QueryResult<Interaccion> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const userId = user?.id ?? null
  // Extraer nombre del email: "tanya@insumos.com" → "Tanya"
  const nombre = user?.email
    ? user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1)
    : null

  const { data: row, error } = await supabase
    .from('interacciones')
    .insert({ ...data, creado_por: userId, creado_por_nombre: nombre })
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
    .select(`*, cliente:clientes (*)`)
    .order('created_at', { ascending: false })

  if (error) return { data: null, error: error.message }
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

  if (clientesRes.error) return { clientes: [], oportunidades: [], interacciones: [], error: clientesRes.error.message }
  if (oportunidadesRes.error) return { clientes: [], oportunidades: [], interacciones: [], error: oportunidadesRes.error.message }
  if (interaccionesRes.error) return { clientes: [], oportunidades: [], interacciones: [], error: interaccionesRes.error.message }

  return {
    clientes: clientesRes.data as Cliente[],
    oportunidades: oportunidadesRes.data as Oportunidad[],
    interacciones: interaccionesRes.data as Interaccion[],
    error: null,
  }
}

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

// ============================================================
// CAJA
// ============================================================

export type MovimientoCajaConRelaciones = MovimientoCaja & {
  cliente: Cliente | null
  oportunidad: Oportunidad | null
}

export async function getMovimientosCaja(): Promise<{
  data: MovimientoCajaConRelaciones[] | null
  error: string | null
}> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('movimientos_caja')
    .select(`*, cliente:clientes ( * ), oportunidad:oportunidades ( * )`)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return { data: null, error: error.message }
  return { data: data as MovimientoCajaConRelaciones[], error: null }
}

export async function createMovimientoCaja(
  data: Partial<Omit<MovimientoCaja, 'id' | 'created_at' | 'creado_por' | 'creado_por_nombre'>>
): QueryResult<MovimientoCaja> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const userId = user?.id ?? null
  const nombre = user?.email
    ? user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1)
    : null

  const { data: row, error } = await supabase
    .from('movimientos_caja')
    .insert({ ...data, creado_por: userId, creado_por_nombre: nombre })
    .select()
    .single()

  return { data: row ?? null, error: toError(error) }
}

export async function deleteMovimientoCaja(id: string): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.from('movimientos_caja').delete().eq('id', id)
  return { error: error?.message ?? null }
}

// ============================================================
// VENDEDORES
// ============================================================

export async function getVendedores(): Promise<{ data: Vendedor[]; error: string | null }> {
  try {
    const res = await fetch('/api/vendedores')
    const body = await res.json()
    if (!res.ok) return { data: [], error: body.error ?? 'Error al cargar los vendedores' }
    return { data: body.vendedores as Vendedor[], error: null }
  } catch {
    return { data: [], error: 'Error al cargar los vendedores' }
  }
}