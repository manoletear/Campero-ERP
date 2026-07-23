// Helper para escribir entradas en audit_log.
//
// Uso típico:
//   await auditLog(supabase, {
//     userId, empleadorId, action: 'payroll.close',
//     entity: 'payroll_period', entityId: period,
//     payload: { processed: 4, totalNetPay: 2249873 },
//     request,  // opcional: extrae ip y user-agent
//   });
//
// Diseño: el helper NUNCA lanza. Falla silenciosa (warn en consola) para que
// un problema con el log nunca rompa la acción principal del usuario.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface AuditLogInput {
  userId: string;
  empleadorId: string | null;
  action: string;             // 'payroll.close' | 'payroll.reopen' | 'novedades.create' | ...
  entity?: string | null;     // 'payroll_results' | 'payroll_novedades' | ...
  entityId?: string | null;
  payload?: Record<string, unknown>;
  request?: Request;
}

export async function auditLog(
  supabase: SupabaseClient,
  input: AuditLogInput,
): Promise<void> {
  try {
    let ip: string | null = null;
    let userAgent: string | null = null;
    if (input.request) {
      const h = input.request.headers;
      ip = h.get('x-forwarded-for')?.split(',')[0]?.trim()
        || h.get('cf-connecting-ip')
        || h.get('x-real-ip')
        || null;
      userAgent = h.get('user-agent');
    }
    const { error } = await supabase.from('audit_log').insert({
      user_id:      input.userId,
      empleador_id: input.empleadorId,
      action:       input.action,
      entity:       input.entity ?? null,
      entity_id:    input.entityId ?? null,
      payload:      input.payload ?? {},
      ip,
      user_agent:   userAgent,
    });
    if (error) console.warn('[audit_log] insert failed:', error.message);
  } catch (e: any) {
    console.warn('[audit_log] exception:', e?.message);
  }
}
