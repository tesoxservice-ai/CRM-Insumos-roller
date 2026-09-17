-- Estados de cliente nuevos, canal "pauta" y asignación de vendedor.
-- Correr en el SQL Editor de Supabase (una sola vez).

-- ── Vendedor asignado ────────────────────────────────────────────────────
alter table clientes add column if not exists vendedor_id uuid references auth.users(id);
alter table clientes add column if not exists vendedor_nombre text;

-- ── Estados de cliente ───────────────────────────────────────────────────
-- Se sacan: en_seguimiento, sin_ficha, activo. Se agregan: cliente,
-- visita_agendada, seguimiento, no_enviaron_medidas. Se mantienen: potencial, inactivo.
alter table clientes drop constraint if exists clientes_estado_check;

-- Remapeo de clientes existentes a los nuevos valores (ajustar a mano si algún
-- caso puntual no corresponde con este criterio):
--   activo         -> cliente
--   en_seguimiento -> seguimiento
--   sin_ficha      -> potencial
update clientes set estado = 'cliente'     where estado = 'activo';
update clientes set estado = 'seguimiento' where estado = 'en_seguimiento';
update clientes set estado = 'potencial'   where estado = 'sin_ficha';

alter table clientes add constraint clientes_estado_check
  check (estado in ('potencial', 'inactivo', 'cliente', 'visita_agendada', 'seguimiento', 'no_enviaron_medidas'));

-- ── Canal de entrada: se agrega "pauta" ──────────────────────────────────
alter table clientes drop constraint if exists clientes_canal_entrada_check;
alter table clientes add constraint clientes_canal_entrada_check
  check (canal_entrada in ('whatsapp', 'configurador', 'mercadopago', 'manual', 'pauta'));
