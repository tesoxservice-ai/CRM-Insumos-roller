-- Bandeja de WhatsApp: estado de cada conversación + actualización en vivo.
-- Correr en el SQL Editor de Supabase (una sola vez, después de 0006).

-- Una fila por número que alguna vez archivamos/descartamos desde la bandeja.
-- La conversación se oculta mientras no entre un mensaje posterior a archivada_at;
-- si el número vuelve a escribir, reaparece sola.
create table if not exists whatsapp_conversaciones (
  telefono_clave text primary key,
  archivada_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table whatsapp_conversaciones enable row level security;

create policy "whatsapp_conversaciones_all" on whatsapp_conversaciones
  for all to authenticated using (true) with check (true);

-- Para que la bandeja se actualice sin recargar cuando entra un mensaje
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'whatsapp_mensajes'
  ) then
    alter publication supabase_realtime add table whatsapp_mensajes;
  end if;
end $$;
