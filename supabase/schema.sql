-- ============================================================
-- crowdlink-compliance — Schema inicial
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- API Keys
create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  key_hash text not null unique,
  scopes text[] not null default '{}',
  is_active boolean not null default true,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

-- KYC Empresas
create table if not exists kyc_empresas (
  id uuid primary key default gen_random_uuid(),
  razon_social text not null,
  rfc text not null unique,
  tipo_persona text not null check (tipo_persona in ('moral', 'fisica')),
  giro text,
  pais text not null default 'MX',

  -- Representante legal
  rep_legal_nombre text,
  rep_legal_curp text,

  -- Documentos (URLs a Supabase Storage o S3)
  acta_constitutiva_url text,
  comprobante_domicilio_url text,
  identificacion_rep_url text,

  -- Status de revisión
  status text not null default 'pending'
    check (status in ('pending', 'in_review', 'approved', 'rejected')),
  notas text,

  -- Metadata libre para extensión
  metadata jsonb,

  -- Auditoría
  submitted_by_key uuid references api_keys(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- PLD: tabla de listas locales (OFAC, SAT 69-B, ONU, etc.)
create table if not exists pld_listas (
  id uuid primary key default gen_random_uuid(),
  fuente text not null, -- 'ofac', 'sat_69b', 'onu', 'dof', etc.
  nombre_completo text,
  rfc text,
  curp text,
  tipo text check (tipo in ('persona_fisica', 'persona_moral')),
  motivo text,
  fecha_inclusion date,
  activo boolean not null default true,
  raw_data jsonb,
  created_at timestamptz not null default now()
);

-- PLD: log de consultas (auditoría regulatoria)
create table if not exists pld_consultas (
  id uuid primary key default gen_random_uuid(),
  query_nombre text,
  query_rfc text,
  query_curp text,
  resultados_count int not null default 0,
  consultado_por_key uuid references api_keys(id),
  created_at timestamptz not null default now()
);

-- Índices útiles
create index if not exists kyc_empresas_rfc_idx on kyc_empresas(rfc);
create index if not exists kyc_empresas_status_idx on kyc_empresas(status);
create index if not exists pld_listas_rfc_idx on pld_listas(rfc);
create index if not exists pld_listas_nombre_idx on pld_listas using gin(to_tsvector('spanish', coalesce(nombre_completo, '')));
create index if not exists pld_consultas_key_idx on pld_consultas(consultado_por_key);

-- RLS: habilitar en todas las tablas
-- (el acceso se controla desde la API con service_role, no desde el cliente)
alter table api_keys enable row level security;
alter table kyc_empresas enable row level security;
alter table pld_listas enable row level security;
alter table pld_consultas enable row level security;

-- Políticas: solo service_role tiene acceso (las API routes usan supabaseAdmin)
-- No se expone nada directamente al browser
create policy "service_role only" on api_keys for all using (auth.role() = 'service_role');
create policy "service_role only" on kyc_empresas for all using (auth.role() = 'service_role');
create policy "service_role only" on pld_listas for all using (auth.role() = 'service_role');
create policy "service_role only" on pld_consultas for all using (auth.role() = 'service_role');
