import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export interface AuthenticatedRequest extends NextRequest {
  apiKeyRecord?: {
    id: string
    client_name: string
    scopes: string[]
  }
}

/**
 * Valida el API Key del header Authorization: Bearer <key>
 * Retorna el registro del key si es válido, o un error 401/403.
 */
export async function validateApiKey(
  req: NextRequest,
  requiredScope?: string
): Promise<{ error: NextResponse } | { keyRecord: { id: string; client_name: string; scopes: string[] } }> {
  const authHeader = req.headers.get('authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      error: NextResponse.json(
        { error: 'Missing or invalid Authorization header. Use: Bearer <api_key>' },
        { status: 401 }
      ),
    }
  }

  const rawKey = authHeader.replace('Bearer ', '').trim()

  // Buscamos el key en la DB (guardamos hash SHA-256)
  const { data, error } = await supabaseAdmin
    .from('api_keys')
    .select('id, client_name, scopes, is_active')
    .eq('key_hash', await hashKey(rawKey))
    .single()

  if (error || !data) {
    return {
      error: NextResponse.json({ error: 'Invalid API key' }, { status: 401 }),
    }
  }

  if (!data.is_active) {
    return {
      error: NextResponse.json({ error: 'API key is disabled' }, { status: 403 }),
    }
  }

  if (requiredScope && !data.scopes.includes(requiredScope) && !data.scopes.includes('*')) {
    return {
      error: NextResponse.json(
        { error: `Insufficient scope. Required: ${requiredScope}` },
        { status: 403 }
      ),
    }
  }

  // Actualizar last_used_at
  await supabaseAdmin
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)

  return { keyRecord: { id: data.id, client_name: data.client_name, scopes: data.scopes } }
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key + process.env.API_SECRET_SALT)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
