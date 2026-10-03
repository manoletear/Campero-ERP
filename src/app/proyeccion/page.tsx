import { createAdminClient } from '@/lib/supabase/admin';
import { ProyeccionEntidad, type BaseF22 } from '@/components/proyeccion-entidad';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type F22Row = { anio_tributario: number; ingresos_giro: number; remuneraciones: number; costo_directo: number; rli: number; idpc: number; ppm_ejercicio: number };
type RegRow = { anio_tributario: number; sac_detalle: { monto: number }[] };
type RetiroRow = { monto: number };
type EntRow = {
  id: string; razon_social: string; tipo: string;
  f22_declaraciones: F22Row[]; registros_empresariales: RegRow[]; retiros: RetiroRow[];
};

export default async function ProyeccionPage() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('entidades')
    .select(
      'id, razon_social, tipo, f22_declaraciones(anio_tributario, ingresos_giro, remuneraciones, costo_directo, rli, idpc, ppm_ejercicio), registros_empresariales(anio_tributario, sac_detalle(monto)), retiros(monto)'
    )
    .order('razon_social');

  if (error) {
    return <Shell><p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">Error Supabase: {error.message}</p></Shell>;
  }

  const entidades = (data ?? []) as EntRow[];
  const bases: BaseF22[] = entidades
    .map((e): BaseF22 | null => {
      const f22 = [...(e.f22_declaraciones ?? [])].sort((a, b) => b.anio_tributario - a.anio_tributario)[0];
      if (!f22) return null;
      const reg = [...(e.registros_empresariales ?? [])].sort((a, b) => b.anio_tributario - a.anio_tributario)[0];
      const sac_total = (reg?.sac_detalle ?? []).reduce((t, s) => t + (s.monto ?? 0), 0);
      const retiros_total = (e.retiros ?? []).reduce((t, r) => t + (r.monto ?? 0), 0);
      return {
        entidad_id: e.id, razon_social: e.razon_social, tipo: e.tipo,
        anio_tributario: f22.anio_tributario,
        ingresos_giro: f22.ingresos_giro, remuneraciones: f22.remuneraciones,
        costo_directo: f22.costo_directo, rli: f22.rli, idpc: f22.idpc,
        ppm_ejercicio: f22.ppm_ejercicio, retiros_total, sac_total,
      };
    })
    .filter((x): x is BaseF22 => x !== null);

  return (
    <Shell>
      <div className="mb-6">
        <Link href="/entidades" className="text-sm text-zinc-500 hover:text-zinc-900">← Entidades</Link>
        <h1 className="mt-1 text-2xl font-semibold">Proyección de impuesto</h1>
        <p className="text-sm text-zinc-500">
          Estima el IDPC a pagar/devolver del próximo año tributario. Mueve las palancas; el cálculo parte del último F22 real.
        </p>
      </div>

      {bases.length === 0 ? (
        <p className="text-sm text-zinc-500">No hay F22 cargados para proyectar.</p>
      ) : (
        <div className="grid gap-4">
          {bases.map((b) => <ProyeccionEntidad key={b.entidad_id} base={b} />)}
        </div>
      )}

      <p className="mt-6 text-xs text-zinc-400">
        Modelo simplificado: costo escala con ventas, otros gastos fijos, remuneraciones = base + sueldo nuevo
        (×1,25 por gratificación/cargas). No reemplaza el cálculo definitivo del F22. Solo IDPC de la empresa;
        el Global Complementario de los socios va aparte.
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-4xl p-8">{children}</main>;
}
