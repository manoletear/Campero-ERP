import { createClient } from '@/lib/supabase/client';

export function getRedirectForRole(rol: string): string {
  switch (rol) {
    case 'admin': return '/admin';
    case 'empleador': return '/hogar';
    case 'empleado': return '/portal';
    default: return '/';
  }
}

export function getRolLabel(rol: string): string {
  switch (rol) {
    case 'admin': return 'Administrador';
    case 'empleador': return 'Empleador';
    case 'empleado': return 'Empleado';
    default: return rol;
  }
}

export function getInitials(nombre: string, apellido?: string | null): string {
  const first = nombre?.charAt(0) || '';
  const last = apellido?.charAt(0) || '';
  return (first + last).toUpperCase() || '??';
}
