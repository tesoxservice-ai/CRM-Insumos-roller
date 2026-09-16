// lib/types.ts
// Interfaces y tipos base del CRM Insumos Roller.

// ─── Enums / Union Types ───────────────────────────────────────────────────

export type EstadoCliente =
  | 'potencial'
  | 'en_seguimiento'
  | 'activo'
  | 'inactivo'
  | 'sin_ficha'

export type EstadoPipeline =
  | 'consulta'
  | 'cotizacion_enviada'
  | 'negociacion'
  | 'ganado'
  | 'perdido'

export type CanalEntrada =
  | 'whatsapp'
  | 'configurador'
  | 'mercadopago'
  | 'manual'

export type TipoInteraccion =
  | 'llamada'
  | 'whatsapp'
  | 'email'
  | 'reunion'
  | 'nota'

export type TipoMovimientoCaja = 'ingreso' | 'egreso'

export type CategoriaMovimientoCaja =
  | 'seña'
  | 'pago_final'
  | 'pago_total'
  | 'otro_ingreso'
  | 'proveedor'
  | 'retiro_personal'
  | 'gasto_operativo'
  | 'otro_egreso'

// ─── Entidades principales ─────────────────────────────────────────────────

export interface Cliente {
  id: string
  nombre: string
  telefono: string | null
  estado: EstadoCliente
  canal_entrada: CanalEntrada
  created_at: string
  ultima_interaccion: string | null
  creado_por: string | null
}

export interface Oportunidad {
  id: string
  cliente_id: string
  estado_pipeline: EstadoPipeline
  monto: number | null
  detalle_cotizacion: string | null
  created_at: string
  creado_por: string | null
  creado_por_nombre: string | null
}

export interface Interaccion {
  id: string
  cliente_id: string
  tipo: TipoInteraccion
  descripcion: string
  created_at: string
  creado_por: string | null
  creado_por_nombre: string | null
}

export interface MovimientoCaja {
  id: string
  tipo: TipoMovimientoCaja
  categoria: CategoriaMovimientoCaja
  monto: number
  descripcion: string | null
  proveedor: string | null
  cliente_id: string | null
  oportunidad_id: string | null
  fecha: string
  creado_por: string | null
  creado_por_nombre: string | null
  created_at: string
}

// ─── Tipos de UI / helpers ─────────────────────────────────────────────────

/** Cliente con sus oportunidades e interacciones precargadas */
export interface ClienteConRelaciones extends Cliente {
  oportunidades: Oportunidad[]
  interacciones: Interaccion[]
}

/** Columna del tablero Kanban del pipeline */
export interface ColumnaKanban {
  id: EstadoPipeline
  label: string
  oportunidades: (Oportunidad & { cliente: Cliente })[]
}