// Helper para resolver el empleador activo de la sesión.
//
// Modelo N:M: un user puede tener múltiples empleadores en user_empleadores.
// El "activo" se guarda en user_profiles.active_empleador_id (cambia con el
// workspace switcher). Para retrocompat con users legacy (1:1), si active no
// está set se cae a user_profiles.empleador_id, y luego a empleadores.auth_user_id.
//
// IMPORTANTE: este NO es un middleware. Cada endpoint lo invoca explícitamente
// (decisión arquitectónica, ver memoria feedback-no-withtenant-middleware).

import type { SupabaseClient, User } from '@supabase/supabase-js';

export interface ActiveEmpleadorResult {
  empleadorId: string | null;
  source: 'active' | 'profile_legacy' | 'empleadores_direct' | null;
}

export async function getActiveEmpleadorId(
  supabase: SupabaseClient,
  user: User,
): Promise<ActiveEmpleadorResult> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('active_empleador_id, empleador_id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (profile?.active_empleador_id) {
    // Validar que sigue teniendo acceso (defensivo: alguien podría haber sido removido)
    const { data: link } = await supabase
      .from('user_empleadores')
      .select('empleador_id')
      .eq('auth_user_id', user.id)
      .eq('empleador_id', profile.active_empleador_id)
      .maybeSingle();
    if (link) return { empleadorId: profile.active_empleador_id, source: 'active' };
  }

  if (profile?.empleador_id) {
    const { data: legacyLink } = await supabase
      .from('user_empleadores')
      .select('empleador_id')
      .eq('auth_user_id', user.id)
      .eq('empleador_id', profile.empleador_id)
      .maybeSingle();
    if (legacyLink) return { empleadorId: profile.empleador_id, source: 'profile_legacy' };
    // No membership row → fall through to empleadores_direct
  }

  const { data: emp } = await supabase
    .from('empleadores')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  if (emp?.id) return { empleadorId: emp.id, source: 'empleadores_direct' };

  return { empleadorId: null, source: null };
}
