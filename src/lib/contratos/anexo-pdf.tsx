// Template react-pdf para anexo de contrato (modificaciones Art. 11 CT).
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
  page: { fontFamily: 'Poppins', fontSize: 10, padding: 40, color: '#000', lineHeight: 1.55 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  title: { fontSize: 15, fontWeight: 'bold' },
  subtitle: { fontSize: 9, color: '#555', marginTop: 2 },
  logo: { width: 60, height: 60, objectFit: 'contain' },
  bold: { fontWeight: 'bold' },
  paragraph: { marginVertical: 6, textAlign: 'justify' },
  clauseTitle: { fontWeight: 'bold', marginTop: 14, marginBottom: 4 },
  table: { marginTop: 8 },
  tableRow: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: '#d4d4d8' },
  tableHeader: { backgroundColor: '#e5e7eb', fontWeight: 'bold' },
  cellLabel: { flex: 1.5 },
  cellAntes: { flex: 1.5, color: '#888' },
  cellDespues: { flex: 1.5, fontWeight: 'medium' },
  firmaRow: { flexDirection: 'row', gap: 30, marginTop: 60 },
  firmaCol: { flex: 1, borderTopWidth: 0.5, borderTopColor: '#000', paddingTop: 4, alignItems: 'center' },
  firmaText: { fontSize: 8, color: '#000' },
});

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function fmtFecha(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

const DIAS_ORDEN = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'] as const;
const DIA_ABREV: Record<string,string> = {
  lunes:'Lun', martes:'Mar', miercoles:'Mié', jueves:'Jue',
  viernes:'Vie', sabado:'Sáb', domingo:'Dom',
};

function fmtDistribucionHoraria(v: any): string {
  if (!v || typeof v !== 'object') return '—';
  // Agrupar días con mismo horario
  const groups: { dias: string[]; texto: string }[] = [];
  for (const dia of DIAS_ORDEN) {
    const slot = (v as any)[dia];
    const texto = slot
      ? `${slot.inicio ?? '?'} a ${slot.fin ?? '?'}${slot.colacion_min ? ` (col. ${slot.colacion_min} min)` : ''}`
      : 'libre';
    const last = groups[groups.length - 1];
    if (last && last.texto === texto) last.dias.push(DIA_ABREV[dia]);
    else groups.push({ dias: [DIA_ABREV[dia]], texto });
  }
  return groups.map(g => `${g.dias.join(', ')}: ${g.texto}`).join('\n');
}

function fmtBeneficios(v: any): string {
  if (!v || typeof v !== 'object') return '—';
  const items: string[] = [];
  if (v.colacion_clp)     items.push(`Colación: $ ${Number(v.colacion_clp).toLocaleString('es-CL')}`);
  if (v.movilizacion_clp) items.push(`Movilización: $ ${Number(v.movilizacion_clp).toLocaleString('es-CL')}`);
  if (v.bono_responsabilidad_clp) items.push(`Bono responsabilidad: $ ${Number(v.bono_responsabilidad_clp).toLocaleString('es-CL')}`);
  if (v.alimentacion_provista)    items.push('Alimentación provista por empleador');
  if (v.habitacion_provista)      items.push('Habitación provista por empleador');
  return items.length ? items.join('\n') : '—';
}

function fmtViajesFamilia(v: any): string {
  if (!v || typeof v !== 'object') return '—';
  if (v.acompana === false) return 'No acompaña a la familia en viajes';
  const partes: string[] = ['Acompaña a la familia en viajes'];
  if (v.destinos_habituales) partes.push(`Destinos: ${v.destinos_habituales}`);
  if (v.dias_estimados_anio) partes.push(`Días estimados/año: ${v.dias_estimados_anio}`);
  return partes.join('\n');
}

function fmtValor(field: string, v: any): string {
  if (v === null || v === undefined || v === '') return '—';
  // Formateadores específicos por campo
  if (field === 'distribucion_horaria') return fmtDistribucionHoraria(v);
  if (field === 'beneficios')           return fmtBeneficios(v);
  if (field === 'viajes_familia')       return fmtViajesFamilia(v);
  if (field === 'puertas_adentro')      return v ? 'Sí (puertas adentro)' : 'No (puertas afuera)';
  if (field === 'descanso_semanal')     return String(v).replace(/_/g, ' ');
  if (typeof v === 'number')  return v >= 1000 ? `$ ${v.toLocaleString('es-CL')}` : String(v);
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (typeof v === 'object')  return JSON.stringify(v);
  return String(v);
}

const LABEL_MAP: Record<string, string> = {
  sueldo_base: 'Sueldo base',
  horas_semanales: 'Horas semanales',
  cargo: 'Cargo',
  tipo_contrato: 'Tipo de contrato',
  puertas_adentro: 'Modalidad',
  beneficios: 'Beneficios',
  viajes_familia: 'Viajes con familia',
  descanso_semanal: 'Descanso semanal',
  lugar_servicios: 'Lugar de servicios',
  fecha_termino: 'Fecha de término',
  distribucion_horaria: 'Distribución horaria',
};

export interface AnexoPdfData {
  numero: number;
  fechaAnexo: string;
  motivo: string;
  empleadorNombre: string;
  empleadorRut: string;
  trabajadorNombre: string;
  trabajadorRut: string;
  contratoFechaInicio: string;
  cambios: Record<string, { antes: any; despues: any }>;
  fechaFirmaEmpleador?: string | null;
  fechaFirmaTrabajador?: string | null;
}

export function AnexoDocument({ data }: { data: AnexoPdfData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Anexo N° {data.numero} de Contrato</Text>
            <Text style={styles.subtitle}>Modificación contractual (Art. 11 Código del Trabajo)</Text>
          </View>
          <Image src={LOGO_URL} style={styles.logo} />
        </View>

        <Text style={styles.paragraph}>
          En la fecha <Text style={styles.bold}>{fmtFecha(data.fechaAnexo)}</Text>, comparecen las partes que suscribieron el contrato individual de trabajo con fecha de inicio <Text style={styles.bold}>{fmtFecha(data.contratoFechaInicio)}</Text>:
        </Text>

        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Empleador: </Text>{data.empleadorNombre}, RUT {data.empleadorRut}.{'\n'}
          <Text style={styles.bold}>Trabajador(a): </Text>{data.trabajadorNombre}, RUT {data.trabajadorRut}.
        </Text>

        <Text style={styles.clauseTitle}>Modificación acordada</Text>
        <Text style={styles.paragraph}>
          Por mutuo acuerdo, las partes modifican el contrato individual de trabajo en los siguientes términos:
        </Text>

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.cellLabel}>Cláusula</Text>
            <Text style={styles.cellAntes}>Texto anterior</Text>
            <Text style={styles.cellDespues}>Texto nuevo</Text>
          </View>
          {Object.entries(data.cambios).map(([field, val]) => (
            <View key={field} style={styles.tableRow}>
              <Text style={styles.cellLabel}>{LABEL_MAP[field] ?? field}</Text>
              <Text style={styles.cellAntes}>{fmtValor(field, val.antes)}</Text>
              <Text style={styles.cellDespues}>{fmtValor(field, val.despues)}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.paragraph, { marginTop: 16 }]}>
          Las demás cláusulas del contrato original se mantienen vigentes y sin modificación. El presente anexo forma parte integral del contrato individual de trabajo y entra en vigencia a partir de la fecha indicada.
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
      </Page>
    </Document>
  );
}
