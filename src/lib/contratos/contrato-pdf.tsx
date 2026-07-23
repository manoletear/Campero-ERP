// Template react-pdf para contrato individual TCP (Art. 9-11 + 146-152 CT).
// Fuente Poppins, logo Poppins, todas las cláusulas obligatorias.
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { FONT_REGULAR, FONT_MEDIUM, FONT_BOLD, LOGO_URL } from '@/lib/pdf-fonts';

Font.register({
  family: 'Poppins',
  fonts: [
    { src: FONT_REGULAR, fontWeight: 'normal' },
    { src: FONT_MEDIUM,  fontWeight: 'medium' },
    { src: FONT_BOLD,    fontWeight: 'bold' },
  ],
});

const styles = StyleSheet.create({
  page: { fontFamily: 'Poppins', fontSize: 9.5, padding: 40, color: '#000', lineHeight: 1.55 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  title: { fontSize: 15, fontWeight: 'bold' },
  subtitle: { fontSize: 9, color: '#555', marginTop: 2 },
  logo: { width: 65, height: 65, objectFit: 'contain' },
  bold: { fontWeight: 'bold' },
  paragraph: { marginVertical: 6, textAlign: 'justify' },
  clauseTitle: { fontWeight: 'bold', marginTop: 10, marginBottom: 3 },
  firmaRow: { flexDirection: 'row', gap: 30, marginTop: 60 },
  firmaCol: { flex: 1, borderTopWidth: 0.5, borderTopColor: '#000', paddingTop: 4, alignItems: 'center' },
  firmaText: { fontSize: 8, color: '#000' },
  small: { fontSize: 8, color: '#666' },
});

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

export interface ContratoPdfData {
  // Empleador
  empleadorNombre: string;
  empleadorRut: string;
  empleadorDireccion?: string;
  empleadorComuna?: string;
  empleadorCiudad?: string;

  // Trabajador
  trabajadorNombre: string;
  trabajadorRut: string;
  trabajadorNacionalidad?: string;
  trabajadorEstadoCivil?: string;
  trabajadorFechaNacimiento?: string;
  trabajadorDireccion?: string;

  // Cláusulas
  cargo: string;
  lugarServicios: string;       // Dirección específica del hogar donde se prestan servicios
  puertasAdentro: boolean;
  distribucionHoraria?: Record<string, { inicio: string; fin: string; colacion_min?: number } | null>;
  horasSemanales: number;
  descansoSemanal: string;      // 'domingo' | 'sabado_domingo' | 'rotativo'
  viajesFamilia: boolean;

  // Económicas
  sueldoBase: number;
  beneficios?: {
    colacion_monto?: number;
    movilizacion_monto?: number;
    otros?: Array<{ nombre: string; monto: number; imponible: boolean }>;
  };
  tipoGratificacion?: 'art_47' | 'art_50';

  // Duración
  tipoContrato: 'indefinido' | 'plazo_fijo' | 'obra_faena';
  fechaInicio: string;          // ISO
  fechaTermino?: string | null;

  // Firma
  fechaFirmaEmpleador?: string | null;
  fechaFirmaTrabajador?: string | null;
}

const CLP = (v: number) => `$ ${Math.round(v).toLocaleString('es-CL')}`;
const DIAS_LABEL = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];

function fmtFecha(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

function descansoLabel(v: string): string {
  if (v === 'sabado_domingo') return 'sábado y domingo';
  if (v === 'rotativo') return 'rotativo conforme a turnos';
  return 'domingo y festivos';
}

export function ContratoDocument({ data }: { data: ContratoPdfData }) {
  const fechaHoy = fmtFecha(new Date().toISOString().slice(0, 10));
  const empleadorDir = [data.empleadorDireccion, data.empleadorComuna, data.empleadorCiudad].filter(Boolean).join(', ');

  // Distribución horaria texto
  const distLines: string[] = [];
  if (data.distribucionHoraria) {
    for (const d of DIAS_LABEL) {
      const horario = data.distribucionHoraria[d];
      if (horario) {
        const col = horario.colacion_min ? ` (con ${horario.colacion_min} min de colación)` : '';
        distLines.push(`${d.charAt(0).toUpperCase() + d.slice(1)} de ${horario.inicio} a ${horario.fin}${col}`);
      }
    }
  }
  const distText = distLines.length > 0 ? distLines.join('; ') : `${data.horasSemanales} horas semanales`;

  // Beneficios
  const benLines: string[] = [];
  if (data.beneficios?.colacion_monto && data.beneficios.colacion_monto > 0)
    benLines.push(`asignación de colación de ${CLP(data.beneficios.colacion_monto)}`);
  if (data.beneficios?.movilizacion_monto && data.beneficios.movilizacion_monto > 0)
    benLines.push(`asignación de movilización de ${CLP(data.beneficios.movilizacion_monto)}`);
  if (data.beneficios?.otros && data.beneficios.otros.length > 0)
    benLines.push(...data.beneficios.otros.map(o => `${o.nombre} de ${CLP(o.monto)}${o.imponible ? '' : ' (no imponible)'}`));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Contrato Individual de Trabajo</Text>
            <Text style={styles.subtitle}>Trabajador de Casa Particular (Art. 146-152 Código del Trabajo)</Text>
          </View>
          <Image src={LOGO_URL} style={styles.logo} />
        </View>

        <Text style={styles.paragraph}>
          En {data.empleadorCiudad ?? 'Santiago de Chile'}, a {fechaHoy}, entre <Text style={styles.bold}>{data.empleadorNombre}</Text>, RUT <Text style={styles.bold}>{data.empleadorRut}</Text>, con domicilio en {empleadorDir || '—'}, en adelante &quot;el empleador&quot;; y <Text style={styles.bold}>{data.trabajadorNombre}</Text>, RUT <Text style={styles.bold}>{data.trabajadorRut}</Text>{data.trabajadorNacionalidad ? `, ${data.trabajadorNacionalidad}` : ''}{data.trabajadorEstadoCivil ? `, ${data.trabajadorEstadoCivil}` : ''}{data.trabajadorFechaNacimiento ? `, nacido(a) el ${fmtFecha(data.trabajadorFechaNacimiento)}` : ''}, con domicilio en {data.trabajadorDireccion ?? '—'}, en adelante &quot;el trabajador(a)&quot;, se ha convenido el siguiente contrato:
        </Text>

        <Text style={styles.clauseTitle}>PRIMERO — Naturaleza de los servicios</Text>
        <Text style={styles.paragraph}>
          El(la) trabajador(a) se obliga a prestar servicios de <Text style={styles.bold}>{data.cargo}</Text> conforme al Art. 146 del Código del Trabajo (trabajadores de casa particular), bajo modalidad <Text style={styles.bold}>{data.puertasAdentro ? 'puertas adentro' : 'puertas afuera'}</Text>.
        </Text>

        <Text style={styles.clauseTitle}>SEGUNDO — Lugar de prestación de servicios</Text>
        <Text style={styles.paragraph}>
          Los servicios se prestarán en el hogar del empleador ubicado en <Text style={styles.bold}>{data.lugarServicios || empleadorDir || '—'}</Text>.
        </Text>

        <Text style={styles.clauseTitle}>TERCERO — Jornada y distribución horaria</Text>
        <Text style={styles.paragraph}>
          La jornada de trabajo será de {data.horasSemanales} horas semanales, distribuidas de la siguiente manera: {distText}.
          {data.puertasAdentro
            ? ' Por tratarse de modalidad puertas adentro, el(la) trabajador(a) reside en el hogar empleador, sin sujeción a horario, pero con derecho a descanso absoluto mínimo de 12 horas diarias (Art. 149 CT).'
            : ''}
        </Text>

        <Text style={styles.clauseTitle}>CUARTO — Descanso semanal y feriados</Text>
        <Text style={styles.paragraph}>
          El(la) trabajador(a) tendrá descanso semanal los días <Text style={styles.bold}>{descansoLabel(data.descansoSemanal)}</Text>, además de los feriados legales (Art. 151 CT).
        </Text>

        <Text style={styles.clauseTitle}>QUINTO — Remuneración</Text>
        <Text style={styles.paragraph}>
          Por sus servicios, el(la) trabajador(a) recibirá una remuneración mensual de <Text style={styles.bold}>{CLP(data.sueldoBase)}</Text> (sueldo base imponible).{' '}
          {data.tipoGratificacion === 'art_50'
            ? 'Adicionalmente percibirá gratificación legal del Art. 50 CT (25% del sueldo con tope 4,75 IMM).'
            : data.tipoGratificacion === 'art_47'
              ? 'Adicionalmente percibirá gratificación legal del Art. 47 CT.'
              : ''}
          {benLines.length > 0 ? ` Recibirá además: ${benLines.join(', ')}.` : ''}
          {' '}La remuneración se pagará mensualmente, mediante transferencia bancaria, dentro de los primeros 5 días del mes siguiente al trabajado.
        </Text>

        <Text style={styles.clauseTitle}>SEXTO — Cotizaciones previsionales y de salud</Text>
        <Text style={styles.paragraph}>
          El empleador efectuará las cotizaciones previsionales y de salud conforme a la ley: AFP, Salud (FONASA o ISAPRE), Seguro de Cesantía (AFC), Mutual de Accidentes del Trabajo y aporte 1,11% indemnización a todo evento del Art. 163 CT.
        </Text>

        <Text style={styles.clauseTitle}>SÉPTIMO — Feriado anual (vacaciones)</Text>
        <Text style={styles.paragraph}>
          El(la) trabajador(a) tendrá derecho a un feriado anual de 15 días hábiles, cumplido un año de servicio (Art. 67 CT). Después de 10 años de servicio, se sumará un día adicional por cada 3 años trabajados (Art. 68 CT).
        </Text>

        <Text style={styles.clauseTitle}>OCTAVO — Duración del contrato</Text>
        <Text style={styles.paragraph}>
          El contrato es de carácter <Text style={styles.bold}>{data.tipoContrato === 'plazo_fijo' ? 'plazo fijo' : data.tipoContrato === 'obra_faena' ? 'por obra o faena' : 'indefinido'}</Text>, con fecha de inicio el <Text style={styles.bold}>{fmtFecha(data.fechaInicio)}</Text>{data.fechaTermino ? ` y término el ${fmtFecha(data.fechaTermino)}` : ''}.
        </Text>

        {data.viajesFamilia && (
          <>
            <Text style={styles.clauseTitle}>NOVENO — Viajes y prestación fuera del lugar habitual</Text>
            <Text style={styles.paragraph}>
              Por la naturaleza de los servicios, el(la) trabajador(a) podrá acompañar al grupo familiar empleador en viajes o estadías fuera del lugar habitual de trabajo (Art. 152 CT). El tiempo de viaje constituye jornada efectiva. Los gastos de traslado, alojamiento y alimentación durante estos viajes serán de cargo del empleador.
            </Text>
          </>
        )}

        <Text style={styles.clauseTitle}>{data.viajesFamilia ? 'DÉCIMO' : 'NOVENO'} — Obligaciones legales especiales</Text>
        <Text style={styles.paragraph}>
          El empleador se obliga a respetar el régimen legal de la Ley 21.561 (40 horas), Ley 21.643 (Karin: prevención y sanción del acoso laboral y sexual), Ley 20.786 (igualdad de derechos TCP) y demás normas aplicables a la relación de trabajo en hogar particular.
        </Text>

        <Text style={styles.clauseTitle}>{data.viajesFamilia ? 'DÉCIMO PRIMERO' : 'DÉCIMO'} — Ejemplares</Text>
        <Text style={styles.paragraph}>
          El presente contrato se firma en dos ejemplares originales de igual contenido y fecha, quedando uno en poder de cada parte.
        </Text>

        <View style={styles.firmaRow}>
          <View style={styles.firmaCol}>
            <Text style={styles.firmaText}>EMPLEADOR</Text>
            <Text style={styles.firmaText}>{data.empleadorNombre}</Text>
            <Text style={styles.firmaText}>{data.empleadorRut}</Text>
            {data.fechaFirmaEmpleador && (
              <Text style={[styles.firmaText, { color: '#16a34a', marginTop: 2 }]}>
                ✓ Firmado el {fmtFecha(data.fechaFirmaEmpleador)}
              </Text>
            )}
          </View>
          <View style={styles.firmaCol}>
            <Text style={styles.firmaText}>TRABAJADOR(A)</Text>
            <Text style={styles.firmaText}>{data.trabajadorNombre}</Text>
            <Text style={styles.firmaText}>{data.trabajadorRut}</Text>
            {data.fechaFirmaTrabajador && (
              <Text style={[styles.firmaText, { color: '#16a34a', marginTop: 2 }]}>
                ✓ Firmado el {fmtFecha(data.fechaFirmaTrabajador)}
              </Text>
            )}
          </View>
        </View>

        <Text style={[styles.small, { marginTop: 18, textAlign: 'center' }]}>
          Contrato generado por Poppins · Conforme Art. 9-11 y 146-152 del Código del Trabajo de Chile
        </Text>
      </Page>
    </Document>
  );
}
