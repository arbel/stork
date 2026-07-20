import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from './cors.ts'

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

function clients(authHeader: string) {
  const url = Deno.env.get('SUPABASE_URL')!
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } })
  const adminClient = createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return { userClient, adminClient }
}

/** Verify the caller is an authenticated user. Returns the verified user + a service-role client. */
export async function requireUser(
  req: Request,
): Promise<{ errorResponse: Response } | { user: { id: string }; admin: SupabaseClient; userClient: SupabaseClient }> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return { errorResponse: json({ error: 'No authorization header' }, 401) }
  const { userClient, adminClient } = clients(authHeader)
  const { data: { user }, error } = await userClient.auth.getUser()
  if (error || !user) return { errorResponse: json({ error: 'Invalid user token' }, 401) }
  return { user, admin: adminClient, userClient }
}

/** Verify the caller is an authenticated ACTIVE admin. Returns a service-role client. */
export async function requireAdmin(
  req: Request,
): Promise<{ errorResponse: Response } | { user: { id: string }; admin: SupabaseClient }> {
  const gate = await requireUser(req)
  if ('errorResponse' in gate) return gate
  const { data: isAdmin } = await gate.userClient.rpc('is_current_user_admin')
  if (!isAdmin) return { errorResponse: json({ error: 'Admin privileges required' }, 403) }
  return { user: gate.user, admin: gate.admin }
}
