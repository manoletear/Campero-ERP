'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const IDPC_14A = 0.27;

export type BaseF22 = {
  entidad_id: string;
  razon_social: string;
  tipo: string;
  anio_tributario: number;
  ingresos_giro: number;
  remuneraciones: number;
  costo_directo: number;
  rli: number;
  idpc: number;
  ppm_ejercicio: number;
  retiros_total: number;
  sac_total: number;
};

const clp = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(n));
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

export function ProyeccionEntidad({ base }: { base: BaseF22 }) {
  // Palancas
  const [crecimiento, setCrecimiento] = useState(9); // % ingresos YoY
  const [sueldoMensual, setSueldoMensual] = useState(0); // sueldo empresarial nuevo $/mes
  const ppmBase = base.ingresos_giro > 0 ? base.ppm_ejercicio / base.ingresos_giro : 0.042;
  const [ppmTasa, setPpmTasa] = useState(Number((ppmBase * 100).toFixed(2))); // %

  // Gastos "otros" (lo que no es costo ni remuneraciones), derivado del F22 base.
  const otrosBase = base.ingresos_giro - base.costo_directo - base.remuneraciones - base.rli;

  // Proyección
  const g = crecimiento / 100;
  const ingresosP = base.ingresos_giro * (1 + g);
  const costoP = base.costo_directo * (1 + g); // escala con ventas
  const sueldoNuevoAnual = sueldoMensual * 12 * 1.25; // + gratificación/cargas aprox 25%
  const remuneracionesP = base.remuneraciones + sueldoNuevoAnual;
  const otrosP = otrosBase; // fijos
  const rliP = ingresosP - costoP - remuneracionesP - otrosP;
  const idpcP = Math.max(0, rliP) * IDPC_14A;
  const ppmP = ingresosP * (ppmTasa / 100);
  const resultado = idpcP - ppmP; // >0 a pagar, <0 devolución
  const ratioRem = remuneracionesP / ingresosP;

  const ratioAlerta = ratioRem > 0.7 ? 'alto' : ratioRem > 0.55 ? 'medio' : 'ok';
  const atProy = base.anio_tributario + 1;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{base.razon_social}</CardTitle>
        <p className="text-xs text-zinc-500">
          Base AT{base.anio_tributario} · proyección AT{atProy} · {base.tipo === 'sociedad' ? 'Sociedad 14A' : 'Persona natural 14A'}
        </p>
      </CardHeader>
      <CardContent className="grid gap-5 sm:grid-cols-2">
        {/* Palancas */}
        <div className="space-y-4">
          <Lever label="Crecimiento ingresos" value={`${crecimiento}%`}>
            <input type="range" min={-20} max={40} step={1} value={crecimiento}
              onChange={(e) => setCrecimiento(Number(e.target.value))} className="w-full" />
          </Lever>
          <Lever label="Sueldo empresarial nuevo" value={`${clp(sueldoMensual)}/mes`}>
            <input type="range" min={0} max={3000000} step={100000} value={sueldoMensual}
              onChange={(e) => setSueldoMensual(Number(e.target.value))} className="w-full" />
            <p className="mt-1 text-xs text-zinc-400">≈ {clp(sueldoNuevoAnual)}/año con gratificación y cargas</p>
          </Lever>
          <Lever label="Tasa PPM" value={`${ppmTasa}%`}>
            <input type="range" min={0} max={8} step={0.1} value={ppmTasa}
              onChange={(e) => setPpmTasa(Number(e.target.value))} className="w-full" />
            <p className="mt-1 text-xs text-zinc-400">base implícita {pct(ppmBase)}</p>
          </Lever>
        </div>

        {/* Resultado */}
        <div className="space-y-2 text-sm">
          <Row label="Ingresos del giro" value={clp(ingresosP)} />
          <Row label="− Costo directo" value={clp(costoP)} muted />
          <Row label="− Remuneraciones" value={clp(remuneracionesP)} muted />
          <Row label="− Otros gastos" value={clp(otrosP)} muted />
          <div className="border-t border-zinc-200 pt-2">
            <Row label="RLI proyectada" value={clp(rliP)} bold />
          </div>
          <Row label={`IDPC (27%)`} value={clp(idpcP)} />
          <Row label={`PPM enterado (${ppmTasa}%)`} value={clp(ppmP)} muted />
          <div className="mt-1 rounded-lg bg-zinc-50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-zinc-500">
                {resultado >= 0 ? 'A pagar en abril ' + atProy : 'Devolución ' + atProy}
              </span>
              <span className={`text-lg font-semibold tabular-nums ${resultado >= 0 ? 'text-zinc-900' : 'text-emerald-600'}`}>
                {clp(Math.abs(resultado))}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">Ratio remuneraciones/ingresos</span>
            <span className={
              ratioAlerta === 'alto' ? 'font-medium text-red-600'
                : ratioAlerta === 'medio' ? 'font-medium text-amber-600' : 'text-zinc-600'
            }>
              {pct(ratioRem)} {ratioAlerta === 'alto' ? '· riesgo Art 31 N°6' : ratioAlerta === 'medio' ? '· vigilar' : ''}
            </span>
          </div>
          {base.retiros_total > 0 && (
            <p className="pt-1 text-xs text-zinc-400">
              Retiros base {clp(base.retiros_total)} · crédito SAC disponible {clp(base.sac_total)}.
              El Global Complementario de los socios sobre retiros se calcula aparte (tabla GC personal, crédito 65%).
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Lever({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</label>
        <span className="text-sm font-medium tabular-nums">{value}</span>
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Row({ label, value, muted, bold }: { label: string; value: string; muted?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? 'text-zinc-500' : 'text-zinc-700'}>{label}</span>
      <span className={`tabular-nums ${bold ? 'font-semibold text-zinc-900' : 'text-zinc-800'}`}>{value}</span>
    </div>
  );
}
