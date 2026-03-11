# crowdlink-compliance

Hub regulatorio privado — PLD, KYC de Empresas, Reportes.  
API-first, construido sobre Next.js + Supabase.

---

## Setup local

```bash
# 1. Instalar dependencias
npm install

# 2. Variables de entorno
cp .env.local.example .env.local
# Editar .env.local con tus credenciales de Supabase

# 3. Correr el schema en Supabase
# Ir a Supabase > SQL Editor > pegar contenido de supabase/schema.sql

# 4. Levantar en local
npm run dev
# → http://localhost:3000
```

---

## Estructura

```
app/
  api/
    v1/
      route.ts              ← health check + listado de endpoints
      admin/
        keys/route.ts       ← crear y listar API keys
      kyc/
        empresas/
          route.ts          ← GET list, POST create
          [id]/route.ts     ← GET detail, PATCH update
      pld/
        consulta/route.ts   ← POST consulta, GET historial
lib/
  supabase.ts               ← clientes de Supabase
  auth.ts                   ← middleware de validación de API key
supabase/
  schema.sql                ← tablas, índices, RLS
```

---

## Autenticación

Todas las rutas requieren:
```
Authorization: Bearer cl_live_<tu_api_key>
```

Las API Keys se crean vía el endpoint admin (protegido con `x-admin-secret`).

### Scopes disponibles
| Scope | Acceso |
|-------|--------|
| `kyc:read` | Consultar empresas KYC |
| `kyc:write` | Crear/actualizar empresas KYC |
| `pld:read` | Consultar listas negras |
| `pld:write` | Modificar listas locales |
| `*` | Acceso total |

---

## Ejemplos de uso

### Crear API key (admin)
```bash
curl -X POST http://localhost:3000/api/v1/admin/keys \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: TU_API_SECRET_SALT" \
  -d '{"client_name": "crowdlink-empresas", "scopes": ["kyc:read", "kyc:write", "pld:read"]}'
```

### Registrar empresa para KYC
```bash
curl -X POST http://localhost:3000/api/v1/kyc/empresas \
  -H "Authorization: Bearer cl_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "razon_social": "Empresa SA de CV",
    "rfc": "EMP920101ABC",
    "tipo_persona": "moral",
    "giro": "Fintech"
  }'
```

### Consultar listas negras PLD
```bash
curl -X POST http://localhost:3000/api/v1/pld/consulta \
  -H "Authorization: Bearer cl_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{"rfc": "EMP920101ABC"}'
```

---

## Deploy en Vercel

```bash
vercel --prod
```

Agregar variables de entorno en el dashboard de Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `API_SECRET_SALT`

---

## Roadmap

- [ ] Integración OFAC SDN API (listas internacionales)
- [ ] Integración SAT Lista 69-B
- [ ] Módulo de reportes regulatorios (R01, R10, R27 CNBV)
- [ ] Panel admin web para revisar KYC
- [ ] Webhooks para notificar cambios de status a Crowdlink
- [ ] Rate limiting por API key
