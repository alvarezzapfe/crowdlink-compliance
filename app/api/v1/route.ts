import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    service: 'crowdlink-compliance',
    version: '0.1.0',
    status: 'ok',
    endpoints: {
      kyc: {
        'GET /api/v1/kyc/empresas': 'Listar empresas KYC',
        'POST /api/v1/kyc/empresas': 'Registrar empresa para KYC',
        'GET /api/v1/kyc/empresas/:id': 'Detalle de empresa',
        'PATCH /api/v1/kyc/empresas/:id': 'Actualizar status/docs',
      },
      pld: {
        'POST /api/v1/pld/consulta': 'Consultar listas negras',
        'GET /api/v1/pld/consulta': 'Historial de consultas',
      },
      admin: {
        'POST /api/v1/admin/keys': 'Crear API key',
        'GET /api/v1/admin/keys': 'Listar API keys',
      },
    },
    auth: 'Bearer token — Authorization: Bearer cl_live_<key>',
    scopes: ['kyc:read', 'kyc:write', 'pld:read', 'pld:write', '*'],
  })
}
