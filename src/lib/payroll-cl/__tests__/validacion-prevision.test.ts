import { describe, it, expect } from 'vitest';
import { validarPrevision, VIGENCIA_MAX_DIAS } from '../validacion-prevision';

const catalogo = {
  afps: [
    { id: 1, codigo: 'capital', activa: true },
    { id: 2, codigo: 'cuprum',  activa: true },
    { id: 99, codigo: 'extinta', activa: false },
  ],
  isapres: [
    { id: 8,  codigo: 'banmedica', tipo: 'isapre' as const, activa: true },
    { id: 13, codigo: 'fonasa',    tipo: 'fonasa' as const, activa: true },
    { id: 88, codigo: 'cerrada',   tipo: 'isapre' as const, activa: false },
  ],
};

const base = {
  id: 't1', rut: '11111111-1', nombre: 'Test',
  afp_id: 1, salud_id: 13, salud_tipo: 'fonasa',
  prevision_verificada_at: new Date().toISOString(),
};

describe('validarPrevision', () => {
  it('OK con Fonasa y AFP vigente', () => {
    const r = validarPrevision(base, catalogo);
    expect(r.ok).toBe(true);
    expect(r.estado).toBe('vigente');
  });

  it('OK con Isapre + plan UF', () => {
    const r = validarPrevision(
      { ...base, salud_id: 8, salud_tipo: 'isapre', salud_plan_uf: 2.5 },
      catalogo,
    );
    expect(r.ok).toBe(true);
  });

  it('bloquea Isapre sin plan UF', () => {
    const r = validarPrevision(
      { ...base, salud_id: 8, salud_tipo: 'isapre' },
      catalogo,
    );
    expect(r.ok).toBe(false);
    expect(r.errores[0]).toMatch(/plan UF/i);
  });

  it('bloquea AFP no vigente', () => {
    const r = validarPrevision({ ...base, afp_id: 99 }, catalogo);
    expect(r.ok).toBe(false);
    expect(r.errores[0]).toMatch(/no está vigente/);
  });

  it('bloquea Isapre cerrada', () => {
    const r = validarPrevision(
      { ...base, salud_id: 88, salud_tipo: 'isapre', salud_plan_uf: 2 },
      catalogo,
    );
    expect(r.ok).toBe(false);
  });

  it('bloquea sin AFP', () => {
    const r = validarPrevision({ ...base, afp_id: null }, catalogo);
    expect(r.ok).toBe(false);
  });

  it('warning si verificación es antigua', () => {
    const viejo = new Date(Date.now() - (VIGENCIA_MAX_DIAS + 30) * 86400000).toISOString();
    const r = validarPrevision({ ...base, prevision_verificada_at: viejo }, catalogo);
    expect(r.ok).toBe(true);
    expect(r.estado).toBe('pendiente');
    expect(r.warnings[0]).toMatch(/antigüedad/i);
  });

  it('bloquea contrato terminado antes del período', () => {
    const r = validarPrevision(base, catalogo, {
      periodoFin: new Date('2026-06-30'),
      contratoFechaTermino: '2026-05-15',
    });
    expect(r.ok).toBe(false);
    expect(r.errores.some(e => /Contrato terminado/.test(e))).toBe(true);
  });
});
