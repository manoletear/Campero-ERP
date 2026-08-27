import { createClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase con service_role — SOLO servidor. Bypassa RLS.
 * Uso interno (4-5 personas) mientras no esté el login con Supabase Auth.
 * NUNCA importar esto en un componente cliente: la service_role key da
 * acceso total a la base. Vive solo en Server Components / route handlers.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local'
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
