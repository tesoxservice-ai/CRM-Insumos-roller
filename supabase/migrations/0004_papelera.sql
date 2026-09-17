-- Papelera: borrado suave para clientes y oportunidades.
-- Correr en el SQL Editor de Supabase (una sola vez).

alter table clientes add column if not exists deleted_at timestamptz;
alter table oportunidades add column if not exists deleted_at timestamptz;

create index if not exists clientes_deleted_at_idx on clientes (deleted_at);
create index if not exists oportunidades_deleted_at_idx on oportunidades (deleted_at);
