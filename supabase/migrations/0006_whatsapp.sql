-- WhatsApp: registro de mensajes entrantes/salientes recibidos por el webhook
-- de la API de WhatsApp Business (Cloud API / Coexistence).
-- Correr en el SQL Editor de Supabase (una sola vez).

create table if not exists whatsapp_mensajes (
  id uuid primary key default gen_random_uuid(),
  wa_message_id text unique not null,
  telefono text not null,
  telefono_clave text not null,
  nombre_perfil text,
  direccion text not null default 'entrante' check (direccion in ('entrante', 'saliente')),
  tipo text not null default 'text',
  texto text,
  timestamp_wa timestamptz not null,
  cliente_id uuid references clientes(id) on delete set null,
  leido boolean not null default false,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_mensajes_clave_idx on whatsapp_mensajes (telefono_clave, timestamp_wa desc);
create index if not exists whatsapp_mensajes_cliente_idx on whatsapp_mensajes (cliente_id);
create index if not exists whatsapp_mensajes_no_leidos_idx on whatsapp_mensajes (leido) where leido = false;

alter table whatsapp_mensajes enable row level security;

-- El webhook escribe con la service role (no pasa por RLS). El equipo logueado
-- puede leer y marcar como leído.
create policy "whatsapp_mensajes_select" on whatsapp_mensajes
  for select to authenticated using (true);

create policy "whatsapp_mensajes_update" on whatsapp_mensajes
  for update to authenticated using (true) with check (true);
