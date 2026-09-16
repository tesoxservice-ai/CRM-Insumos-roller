-- Módulo Caja: registro de movimientos de dinero del negocio (ingresos y egresos).
-- Correr este script en el SQL Editor de Supabase del proyecto (una sola vez).

create table if not exists movimientos_caja (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('ingreso', 'egreso')),
  categoria text not null check (categoria in (
    'seña', 'pago_final', 'pago_total', 'otro_ingreso',
    'proveedor', 'retiro_personal', 'gasto_operativo', 'otro_egreso'
  )),
  monto numeric(12, 2) not null check (monto > 0),
  descripcion text,
  proveedor text,
  cliente_id uuid references clientes(id) on delete set null,
  oportunidad_id uuid references oportunidades(id) on delete set null,
  fecha date not null default current_date,
  creado_por uuid references auth.users(id),
  creado_por_nombre text,
  created_at timestamptz not null default now()
);

create index if not exists movimientos_caja_fecha_idx on movimientos_caja (fecha desc);
create index if not exists movimientos_caja_cliente_idx on movimientos_caja (cliente_id);
create index if not exists movimientos_caja_oportunidad_idx on movimientos_caja (oportunidad_id);

alter table movimientos_caja enable row level security;

-- Mismo criterio permisivo que el resto de las tablas del CRM: cualquier usuario
-- autenticado (el equipo interno) puede leer y escribir movimientos de caja.
create policy "movimientos_caja_select" on movimientos_caja
  for select to authenticated using (true);

create policy "movimientos_caja_insert" on movimientos_caja
  for insert to authenticated with check (true);

create policy "movimientos_caja_update" on movimientos_caja
  for update to authenticated using (true) with check (true);

create policy "movimientos_caja_delete" on movimientos_caja
  for delete to authenticated using (true);
