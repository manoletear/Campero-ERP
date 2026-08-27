import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

const clp = (n: number | null | undefined) =>
  n == null ? '—' : new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

type Sac = { monto: number };
type Registro = { anio_tributario: number; rai: number; rex: number; cpt: number; ddan: number; sac_detalle: Sac[] };
type F22 = { anio_tributario: number; ingresos_giro: number; rli: number; resultado_tipo: string | null; resultado_monto: number };
type Regimen = { regimen: string; vigente_hasta: string | null };
type Entidad = {
  id: string;
  tipo: string;
  rut: string;
  razon_social: string;
  giro_principal: string | null;
  registros_empresariales: Registro[];
  f22_declaraciones: F22[];
  entidad_regimen_historial: Regimen[];
};

export default async function EntidadesPage() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('entidades')
    .select(
      '*, registros_empresariales(anio_tributario, rai, rex, cpt, ddan, sac_detalle(monto)), f22_declaraciones(anio_tributario, ingresos_giro, rli, resultado_tipo, resultado_monto), entidad_regimen_historial(regimen, vigente_hasta)'
    )
    .order('razon_social');

  if (error) {
    return (
      <main className="mx-auto max-w-4xl p-8">
        <h1 className="text-2xl font-semibold">Entidades</h1>
        <p className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          Error consultando Supabase: {error.message}
        </p>
      </main>
    );
  }

  const entidades = (data ?? []) as Entidad[];
  const at = <T extends { anio_tributario: number }>(arr: T[]): T[] =>
    [...arr].sort((a, b) => b.anio_tributario - a.anio_tributario);

  return (
    <main className="mx-auto max-w-4xl p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Entidades</h1>
        <p className="text-sm text-zinc-500">
          {entidades.length} entidad(es) administradas · saldos del último año tributario
        </p>
      </header>

      <div className="grid gap-4">
        {entidades.map((e) => {
          const reg = at(e.registros_empresariales)[0];
          const f22 = at(e.f22_declaraciones)[0];
          const regimen = e.entidad_regimen_historial.find((r) => r.vigente_hasta == null);
          const sac = reg?.sac_detalle?.reduce((s, x) => s + (x.monto ?? 0), 0) ?? null;

          return (
            <Card key={e.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{e.razon_social}</CardTitle>
                    <p className="mt-1 text-sm text-zinc-500">
                      RUT {e.rut} · {e.tipo === 'sociedad' ? 'Sociedad' : 'Persona natural'}
                      {regimen ? ` · ${regimen.regimen}` : ''}
                    </p>
                    {e.giro_principal && (
                      <p className="text-xs text-zinc-400">{e.giro_principal}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                  <Stat label={`RAI ${reg ? 'AT' + reg.anio_tributario : ''}`} value={clp(reg?.rai)} />
                  <Stat label="SAC (suma)" value={clp(sac)} />
                  <Stat label="CPT" value={clp(reg?.cpt)} />
                  <Stat label="DDAN" value={clp(reg?.ddan)} />
                  <Stat label={`RLI ${f22 ? 'AT' + f22.anio_tributario : ''}`} value={clp(f22?.rli)} />
                  <Stat label="Ingresos giro" value={clp(f22?.ingresos_giro)} />
                  <Stat
                    label="Resultado F22"
                    value={
                      f22
                        ? `${f22.resultado_tipo === 'a_pagar' ? 'A pagar ' : f22.resultado_tipo === 'devolucion' ? 'Devolución ' : ''}${clp(f22.resultado_monto)}`
                        : '—'
                    }
                  />
                  <Stat label="Líneas SAC" value={String(reg?.sac_detalle?.length ?? 0)} />
                </dl>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-zinc-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium tabular-nums text-zinc-900">{value}</dd>
    </div>
  );
}
