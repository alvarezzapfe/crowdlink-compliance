-- Módulo Contratos — Schema
-- Ejecutar en Supabase SQL Editor (proyecto crowdlink-compliance)

create table if not exists contratos_templates (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  file_url text not null,
  file_name text not null,
  variables jsonb not null default '[]',
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists contratos_instancias (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references contratos_templates(id) on delete restrict,
  nombre_cliente text not null,
  email_cliente text not null,
  razon_social text,
  rfc text,
  modo text not null check (modo in ('wizard_interno', 'link_cliente')),
  token text unique,
  token_expires_at timestamptz,
  datos jsonb not null default '{}',
  status text not null default 'borrador'
    check (status in ('borrador', 'enviado', 'completado', 'generado')),
  output_url text,
  output_pdf_url text,
  created_by text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contratos_instancias_token_idx on contratos_instancias(token);
create index if not exists contratos_instancias_template_idx on contratos_instancias(template_id);
create index if not exists contratos_instancias_status_idx on contratos_instancias(status);
create index if not exists contratos_instancias_email_idx on contratos_instancias(email_cliente);

alter table contratos_templates enable row level security;
alter table contratos_instancias enable row level security;

create policy "service_role only" on contratos_templates for all using (auth.role() = 'service_role');
create policy "service_role only" on contratos_instancias for all using (auth.role() = 'service_role');
