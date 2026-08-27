import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

const clp = (n: number | null | undefined) =>
  n == null ? '—' : new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

type Sac = { codigo_f22: string; tasa_idpc: number; anio_origen: number | null; monto: number; verificado_vs_f22: boolean };
type Registro = { anio_tributario: number; rai: number; rex: number; cpt: number; capital_pagado: number; ddan: number; notas: string | null; sac_detalle: Sac[] };
type F22 = { anio_tributario: number; fecha_presentacion: string | null; ingresos_giro: number; remuneraciones: number; costo_directo: number; rli: number; idpc: number; ppm_ejercicio: number; activo_inmovilizado: number; resultado_tipo: string | null; resultado_monto: number };
type Regimen = { regimen: string; vigente_desde: string; vigente_hasta: string | null; motivo: string | null };
type ActivoFijo = { descripcion: string; categoria: string | null; valor_adquisicion: number; metodo_depreciacion: string; vida_util_meses: number | null };
type Contrato = { cargo: string; jornada_horas_semana: number; sueldo_base: number; fecha_inicio: string; fecha_termino: string | null };
type Colaborador = { nombres: string; apellidos: string; rut: string; es_socio: boolean; contratos: Contrato[] };
type EntD = {
  id: string; tipo: string; rut: string; razon_social: string; giro_principal: string | null;
  entidad_regimen_historial: Regimen[]; registros_empresariales: Registro[]; f22_declaraciones: F22[];
  activos_fijos: ActivoFijo[]; colaboradores: Colaborador[];
};

export default async function EntidadDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: entidad, error } = await supabase
    .from('entidades')
    .select(
      `*,
       entidad_regimen_historial(regimen, vigente_desde, vigente_hasta, motivo),
       registros_empresariales(anio_tributario, rai, rex, cpt, capital_pagado, ddan, notas, sac_detalle(codigo_f22, tasa_idpc, anio_origen, monto, verificado_vs_f22)),
       f22_declaraciones(anio_tributario, fecha_presentacion, ingresos_giro, remuneraciones, costo_directo, rli, idpc, ppm_ejercicio, activo_inmovilizado, resultado_tipo, resultado_monto),
       retiros(fecha, monto, imputa_rai, imputa_rex, imputa_capital, credito_sac),
       activos_fijos(descripcion, categoria, valor_adquisicion, metodo_depreciacion, vida_util_meses),
       colaboradores(nombres, apellidos, rut, es_socio, contratos(cargo, jornada_horas_semana, sueldo_base, fecha_inicio, fecha_termino))`
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return <Shell><p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">Error Supabase: {error.message}</p></Shell>;
  }
  if (!entidad) notFound();
  const ent = entidad as unknown as EntD;

  const byAt = <T extends { anio_tributario: number }>(a: T[]): T[] =>
    [...(a ?? [])].sort((x, y) => y.anio_tributario - x.anio_tributario);
  const regimen = (ent.entidad_regimen_historial ?? []).find((r) => r.vigente_hasta == null);
  const registros = byAt(ent.registros_empresariales ?? []);
  const f22s = byAt(ent.f22_declaraciones ?? []);
  const regActual = registros[0];

  return (
    <Shell>
      <div className="mb-6">
        <Link href="/entidades" className="text-sm text-zinc-500 hover:text-zinc-900">← Entidades</Link>
        <h1 className="mt-1 text-2xl font-semibold">{ent.razon_social}</h1>
        <p className="text-sm text-zinc-500">
          RUT {ent.rut} · {ent.tipo === 'sociedad' ? 'Sociedad' : 'Persona natural'}
          {regimen ? ` · régimen ${regimen.regimen} desde ${regimen.vigente_desde}` : ''}
        </p>
        {ent.giro_principal && <p className="text-xs text-zinc-400">{ent.giro_principal}</p>}
      </div>

      {/* Registros empresariales + SAC */}
      <Card className="mb-4">
        <CardHeader className="pb-2"><CardTitle className="text-base">Registros empresariales (Art. 14 LIR)</CardTitle></CardHeader>
        <CardContent>
          {regActual ? (
            <>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                <Stat label={`RAI AT${regActual.anio_tributario}`} value={clp(regActual.rai)} />
                <Stat label="REX" value={clp(regActual.rex)} />
                <Stat label="CPT (1145)" value={clp(regActual.cpt)} />
                <Stat label="DDAN" value={clp(regActual.ddan)} />
              </dl>
              <div className="mt-4 overflow-x-auto">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">SAC desglosado por código</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                      <th className="py-1 pr-4 font-medium">Código F22</th>
                      <th className="py-1 pr-4 font-medium">Tasa IDPC</th>
                      <th className="py-1 pr-4 font-medium">Año origen</th>
                      <th className="py-1 pr-4 text-right font-medium">Monto</th>
                      <th className="py-1 font-medium">Verif. F22</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...(regActual.sac_detalle ?? [])].sort((a, b) => a.codigo_f22.localeCompare(b.codigo_f22)).map((s) => (
                      <tr key={s.codigo_f22} className="border-b border-zinc-100">
                        <td className="py-1 pr-4 font-mono">{s.codigo_f22}</td>
                        <td className="py-1 pr-4 tabular-nums">{s.tasa_idpc}%</td>
                        <td className="py-1 pr-4 tabular-nums">{s.anio_origen ?? '—'}</td>
                        <td className="py-1 pr-4 text-right tabular-nums">{clp(s.monto)}</td>
                        <td className="py-1">{s.verificado_vs_f22 ? '✓' : <span className="text-amber-600">pendiente</span>}</td>
                      </tr>
                    ))}
                    <tr className="font-medium">
                      <td className="py-1 pr-4" colSpan={3}>Total SAC</td>
                      <td className="py-1 pr-4 text-right tabular-nums">
                        {clp((regActual.sac_detalle ?? []).reduce((t: number, s: { monto: number }) => t + (s.monto ?? 0), 0))}
                      </td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
              {regActual.notas && <p className="mt-3 text-xs text-zinc-400">{regActual.notas}</p>}
            </>
          ) : (
            <p className="text-sm text-zinc-500">Sin registros empresariales cargados.</p>
          )}
        </CardContent>
      </Card>

      {/* F22 por año */}
      <Card className="mb-4">
        <CardHeader className="pb-2"><CardTitle className="text-base">Declaraciones F22</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {f22s.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                  <th className="py-1 pr-4 font-medium">AT</th>
                  <th className="py-1 pr-4 text-right font-medium">Ingresos giro</th>
                  <th className="py-1 pr-4 text-right font-medium">RLI</th>
                  <th className="py-1 pr-4 text-right font-medium">IDPC</th>
                  <th className="py-1 pr-4 text-right font-medium">PPM</th>
                  <th className="py-1 pr-4 text-right font-medium">Activo inmov.</th>
                  <th className="py-1 font-medium">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {f22s.map((f) => (
                  <tr key={f.anio_tributario} className="border-b border-zinc-100">
                    <td className="py-1 pr-4 tabular-nums">{f.anio_tributario}</td>
                    <td className="py-1 pr-4 text-right tabular-nums">{clp(f.ingresos_giro)}</td>
                    <td className="py-1 pr-4 text-right tabular-nums">{clp(f.rli)}</td>
                    <td className="py-1 pr-4 text-right tabular-nums">{clp(f.idpc)}</td>
                    <td className="py-1 pr-4 text-right tabular-nums">{clp(f.ppm_ejercicio)}</td>
                    <td className="py-1 pr-4 text-right tabular-nums">{clp(f.activo_inmovilizado)}</td>
                    <td className="py-1">
                      {f.resultado_tipo === 'a_pagar' ? 'A pagar ' : f.resultado_tipo === 'devolucion' ? 'Devolución ' : ''}
                      {clp(f.resultado_monto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-sm text-zinc-500">Sin F22 cargados.</p>}
        </CardContent>
      </Card>

      {/* Activo fijo */}
      {(ent.activos_fijos ?? []).length > 0 && (
        <Card className="mb-4">
          <CardHeader className="pb-2"><CardTitle className="text-base">Activo fijo</CardTitle></CardHeader>
          <CardContent className="grid gap-2">
            {ent.activos_fijos.map((a: { descripcion: string; categoria: string | null; valor_adquisicion: number; metodo_depreciacion: string }, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span>{a.descripcion} <span className="text-xs text-zinc-400">· {a.categoria} · {a.metodo_depreciacion}</span></span>
                <span className="tabular-nums">{clp(a.valor_adquisicion)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Remuneraciones */}
      {(ent.colaboradores ?? []).length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Colaboradores</CardTitle></CardHeader>
          <CardContent className="grid gap-2">
            {ent.colaboradores.map((c: { nombres: string; apellidos: string; rut: string; es_socio: boolean; contratos: { cargo: string; jornada_horas_semana: number; sueldo_base: number; fecha_termino: string | null }[] }, i: number) => {
              const ctr = (c.contratos ?? []).find((x) => x.fecha_termino == null) ?? c.contratos?.[0];
              return (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span>
                    {c.nombres} {c.apellidos} <span className="text-xs text-zinc-400">· {c.rut}{c.es_socio ? ' · socio' : ''}</span>
                    {ctr && <span className="block text-xs text-zinc-400">{ctr.cargo} · {ctr.jornada_horas_semana} hrs</span>}
                  </span>
                  {ctr && <span className="tabular-nums">{clp(ctr.sueldo_base)}</span>}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-4xl p-8">{children}</main>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-zinc-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium tabular-nums text-zinc-900">{value}</dd>
    </div>
  );
}
