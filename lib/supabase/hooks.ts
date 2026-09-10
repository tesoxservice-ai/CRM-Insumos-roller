// lib/supabase/hooks.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getTodasInteracciones, type InteraccionConCliente } from '@/lib/supabase/queries'
import type {
  CanalEntrada,
  Cliente,
  ClienteConRelaciones,
  EstadoCliente,
  EstadoPipeline,
  Interaccion,
  Oportunidad,
  TipoInteraccion,
} from '@/lib/types'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

interface OportunidadConCliente extends Oportunidad {
  cliente: Cliente
}

function extractMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message: unknown }).message)
  }
  return 'Error desconocido'
}

// ============================================================
// useClientes
// ============================================================

interface UseClientesReturn {
  clientes: Cliente[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useClientes(): UseClientesReturn {
  const [state, setState] = useState<AsyncState<Cliente[]>>({ data: null, loading: true, error: null })

  const fetch = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    const supabase = createClient()
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('ultima_interaccion', { ascending: false, nullsFirst: false })

    if (error) {
      setState({ data: null, loading: false, error: error.message })
    } else {
      setState({ data: data ?? [], loading: false, error: null })
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { clientes: state.data ?? [], loading: state.loading, error: state.error, refetch: fetch }
}

// ============================================================
// useCliente
// ============================================================

interface UseClienteReturn {
  cliente: ClienteConRelaciones | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useCliente(id: string): UseClienteReturn {
  const [state, setState] = useState<AsyncState<ClienteConRelaciones>>({ data: null, loading: true, error: null })

  const fetch = useCallback(async () => {
    if (!id) return
    setState((prev) => ({ ...prev, loading: true, error: null }))

    const supabase = createClient()
    const { data, error } = await supabase
      .from('clientes')
      .select(`*, oportunidades ( * ), interacciones ( * )`)
      .eq('id', id)
      .single()

    if (error) {
      setState({ data: null, loading: false, error: error.message })
      return
    }

    const cliente: ClienteConRelaciones = {
      id: data.id,
      nombre: data.nombre,
      telefono: data.telefono,
      estado: data.estado as EstadoCliente,
      canal_entrada: data.canal_entrada as CanalEntrada,
      created_at: data.created_at,
      ultima_interaccion: data.ultima_interaccion,
      creado_por: data.creado_por ?? null,
      oportunidades: (data.oportunidades ?? []).map(
        (o: Record<string, unknown>) => ({
          id: o.id as string,
          cliente_id: o.cliente_id as string,
          estado_pipeline: o.estado_pipeline as EstadoPipeline,
          monto: o.monto as number | null,
          detalle_cotizacion: o.detalle_cotizacion as string | null,
          created_at: o.created_at as string,
          creado_por: o.creado_por as string | null,
          creado_por_nombre: o.creado_por_nombre as string | null,
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

    setState({ data: cliente, loading: false, error: null })
  }, [id])

  useEffect(() => { fetch() }, [fetch])

  return { cliente: state.data, loading: state.loading, error: state.error, refetch: fetch }
}

// ============================================================
// useOportunidades
// ============================================================

interface UseOportunidadesReturn {
  oportunidades: OportunidadConCliente[]
  loading: boolean
  error: string | null
}

export function useOportunidades(): UseOportunidadesReturn {
  const [state, setState] = useState<AsyncState<OportunidadConCliente[]>>({ data: null, loading: true, error: null })

  useEffect(() => {
    let cancelled = false

    async function fetch() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('oportunidades')
        .select(`*, cliente:clientes ( * )`)
        .order('created_at', { ascending: false })

      if (cancelled) return

      if (error) {
        setState({ data: null, loading: false, error: error.message })
        return
      }

      const oportunidades: OportunidadConCliente[] = (data ?? []).map((row) => ({
        id: row.id,
        cliente_id: row.cliente_id,
        estado_pipeline: row.estado_pipeline as EstadoPipeline,
        monto: row.monto as number | null,
        detalle_cotizacion: row.detalle_cotizacion as string | null,
        created_at: row.created_at,
        creado_por: row.creado_por ?? null,
        creado_por_nombre: row.creado_por_nombre ?? null,
        cliente: row.cliente as Cliente,
      }))

      setState({ data: oportunidades, loading: false, error: null })
    }

    fetch().catch((err: unknown) => {
      if (!cancelled) setState({ data: null, loading: false, error: extractMessage(err) })
    })

    return () => { cancelled = true }
  }, [])

  return { oportunidades: state.data ?? [], loading: state.loading, error: state.error }
}

// ============================================================
// useOportunidadesPorEstado
// ============================================================

type OportunidadesPorEstado = { [key in EstadoPipeline]: OportunidadConCliente[] }

interface UseOportunidadesPorEstadoReturn {
  oportunidades: OportunidadesPorEstado
  loading: boolean
  error: string | null
}

const ESTADO_PIPELINE_VACIO: OportunidadesPorEstado = {
  consulta: [],
  cotizacion_enviada: [],
  negociacion: [],
  ganado: [],
  perdido: [],
}

export function useOportunidadesPorEstado(): UseOportunidadesPorEstadoReturn {
  const { oportunidades, loading, error } = useOportunidades()

  if (loading || error) return { oportunidades: ESTADO_PIPELINE_VACIO, loading, error }

  const agrupadas: OportunidadesPorEstado = {
    consulta: [],
    cotizacion_enviada: [],
    negociacion: [],
    ganado: [],
    perdido: [],
  }

  for (const op of oportunidades) {
    agrupadas[op.estado_pipeline].push(op)
  }

  return { oportunidades: agrupadas, loading: false, error: null }
}

// ============================================================
// useHistorial
// ============================================================

interface UseHistorialReturn {
  interacciones: InteraccionConCliente[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useHistorial(): UseHistorialReturn {
  const [interacciones, setInteracciones] = useState<InteraccionConCliente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await getTodasInteracciones()
    if (fetchError || !data) {
      setError(fetchError ?? 'Error al cargar el historial')
      setInteracciones([])
    } else {
      setInteracciones(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { interacciones, loading, error, refetch: fetch }
}