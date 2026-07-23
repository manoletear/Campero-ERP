// Template react-pdf para finiquito de contrato (Chile, Código del Trabajo).
// Fuente Poppins, layout legal con cláusulas, conceptos y firma.
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
  page: { fontFamily: 'Poppins', fontSize: 9.5, padding: 36, color: '#000', lineHeight: 1.5 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 10 },
  logo: { width: 75, height: 75, objectFit: 'contain' },
  section: { marginTop: 12 },
  sectionTitle: { fontWeight: 'bold', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 },
  bold: { fontWeight: 'bold' },
  table: { marginTop: 6 },
  tableHeader: {
    flexDirection: 'row', backgroundColor: '#e5e7eb',
    paddingVertical: 5, paddingHorizontal: 8,
  },
  tableRow: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: '#d4d4d8' },
  cellLabel: { flex: 3 },
  cellDetail: { flex: 2, textAlign: 'right', color: '#444', fontSize: 8.5 },
  cellAmount: { flex: 1.2, textAlign: 'right', fontVariant: ['tabular-nums'] },
  totalRow: {
    flexDirection: 'row', backgroundColor: '#d1d5db',
    paddingVertical: 7, paddingHorizontal: 8, marginTop: 4,
  },
  totalLabel: { flex: 1, fontWeight: 'bold', fontSize: 11 },
  totalAmount: { fontWeight: 'bold', fontSize: 12, textAlign: 'right' },
  paragraph: { marginVertical: 6, textAlign: 'justify' },
  firmaRow: { flexDirection: 'row', gap: 30, marginTop: 50 },
  firmaCol: { flex: 1, borderTopWidth: 0.5, borderTopColor: '#000', paddingTop: 4, alignItems: 'center' },
  firmaText: { fontSize: 8, color: '#000' },
});

const CLP = (v: number) => `$ ${Math.round(v).toLocaleString('es-CL')}`;
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const CAUSAL_DESC: Record<string, string> = {
  '159-1': 'Art. 159 N°1 — Mutuo acuerdo de las partes',
  '159-2': 'Art. 159 N°2 — Renuncia del trabajador',
  '159-3': 'Art. 159 N°3 — Muerte del trabajador',
  '159-4': 'Art. 159 N°4 — Vencimiento del plazo convenido',
  '159-5': 'Art. 159 N°5 — Conclusión del trabajo o servicio',
  '159-6': 'Art. 159 N°6 — Caso fortuito o fuerza mayor',
  '160-1': 'Art. 160 N°1 — Conductas indebidas de carácter grave',
  '160-2': 'Art. 160 N°2 — Negociaciones incompatibles',
  '160-3': 'Art. 160 N°3 — Inasistencia injustificada',
  '160-4': 'Art. 160 N°4 — Abandono del trabajo',
  '160-5': 'Art. 160 N°5 — Actos que afecten seguridad',
  '160-6': 'Art. 160 N°6 — Perjuicio material intencional',
  '160-7': 'Art. 160 N°7 — Incumplimiento grave de obligaciones',
  '161-1': 'Art. 161 inc. 1 — Necesidades de la empresa',
  '161-2': 'Art. 161 inc. 2 — Desahucio',
};

export interface FiniquitoPdfData {
  empleadorNombre: string;
  empleadorRut: string;
  trabajadorNombre: string;
  trabajadorRut: string;
  cargo?: string;
  fechaInicio: string;        // display dd mes yyyy
  fechaTermino: string;       // display
  causal: string;             // código
  anosServicio: number;
  sueldoBase: number;
  ultimaRemuneracion: number;
  diasTrabajadosMes: number;
  diasVacacionesPendientes: number;
  diasVacacionesProporcionales: number;
  mesesTrabajadosAno: number;
  mesesIndemnizacion: number;
  tope11AnosAplicado: boolean;
  avisoPrevioDado: boolean;
  // conceptos
  remuneracionDiasTrabajados: number;
  vacacionesPendientesMonto: number;
  vacacionesProporcionalesMonto: number;
  gratificacionProporcional: number;
  indemnizacionAvisoPrevio: number;
  indemnizacionAnosServicio: number;
  totalFiniquito: number;
  observaciones?: string;
}

function Row({ label, detail, amount }: { label: string; detail?: string; amount: number }) {
  return (
    <View style={styles.tableRow}>
      <Text style={styles.cellLabel}>{label}</Text>
      <Text style={styles.cellDetail}>{detail ?? ''}</Text>
      <Text style={styles.cellAmount}>{CLP(amount)}</Text>
    </View>
  );
}

export function FiniquitoDocument({ data }: { data: FiniquitoPdfData }) {
  const causalDesc = CAUSAL_DESC[data.causal] ?? data.causal;
  const fechaHoy = (() => {
    const d = new Date();
    return `${d.getDate()} de ${MESES[d.getMonth()].toLowerCase()} de ${d.getFullYear()}`;
  })();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Finiquito de Contrato de Trabajo</Text>
            <Text style={styles.subtitle}>
              <Text style={styles.bold}>Empleador: </Text>
              {data.empleadorNombre} ({data.empleadorRut})
            </Text>
            <Text style={styles.subtitle}>
              <Text style={styles.bold}>Trabajador(a): </Text>
              {data.trabajadorNombre} ({data.trabajadorRut})
            </Text>
            {data.cargo && (
              <Text style={styles.subtitle}><Text style={styles.bold}>Cargo: </Text>{data.cargo}</Text>
            )}
          </View>
          <Image src={LOGO_URL} style={styles.logo} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>I — Datos de la terminación</Text>
          <Text>Fecha de inicio del contrato: <Text style={styles.bold}>{data.fechaInicio}</Text></Text>
          <Text>Fecha de término: <Text style={styles.bold}>{data.fechaTermino}</Text></Text>
          <Text>Años de servicio: <Text style={styles.bold}>{data.anosServicio}</Text></Text>
          <Text>Causal: <Text style={styles.bold}>{causalDesc}</Text></Text>
          {(data.causal === '161-1' || data.causal === '161-2') && (
            <Text>Aviso previo: <Text style={styles.bold}>{data.avisoPrevioDado ? 'Dado con 30 días' : 'NO dado — se paga indemnización sustitutiva'}</Text></Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>II — Conceptos del finiquito</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.cellLabel, styles.bold]}>Concepto</Text>
              <Text style={[styles.cellDetail, styles.bold]}>Detalle</Text>
              <Text style={[styles.cellAmount, styles.bold]}>Monto</Text>
            </View>
            <Row
              label="Remuneración días trabajados"
              detail={`${data.diasTrabajadosMes} / 30 días`}
              amount={data.remuneracionDiasTrabajados}
            />
            {data.vacacionesPendientesMonto > 0 && (
              <Row
                label="Feriado pendiente"
                detail={`${data.diasVacacionesPendientes} días`}
                amount={data.vacacionesPendientesMonto}
              />
            )}
            {data.vacacionesProporcionalesMonto > 0 && (
              <Row
                label="Feriado proporcional"
                detail={`${data.diasVacacionesProporcionales} días`}
                amount={data.vacacionesProporcionalesMonto}
              />
            )}
            {data.gratificacionProporcional > 0 && (
              <Row
                label="Gratificación proporcional"
                detail={`${data.mesesTrabajadosAno} meses`}
                amount={data.gratificacionProporcional}
              />
            )}
            {data.indemnizacionAvisoPrevio > 0 && (
              <Row
                label="Indemnización sustitutiva aviso previo"
                detail="1 mes última remuneración"
                amount={data.indemnizacionAvisoPrevio}
              />
            )}
            {data.indemnizacionAnosServicio > 0 && (
              <Row
                label="Indemnización años de servicio"
                detail={`${data.mesesIndemnizacion} mes(es)${data.tope11AnosAplicado ? ' · tope 11 años' : ''}`}
                amount={data.indemnizacionAnosServicio}
              />
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL FINIQUITO</Text>
              <Text style={styles.totalAmount}>{CLP(data.totalFiniquito)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>III — Declaración</Text>
          <Text style={styles.paragraph}>
            En {fechaHoy}, el(la) trabajador(a) {data.trabajadorNombre}, RUT {data.trabajadorRut},
            declara recibir de {data.empleadorNombre}, RUT {data.empleadorRut}, la suma de
            <Text style={styles.bold}> {CLP(data.totalFiniquito)} </Text>
            por concepto de finiquito de la relación laboral terminada con fecha {data.fechaTermino},
            por la causal indicada en el numeral I.
          </Text>
          <Text style={styles.paragraph}>
            El(la) trabajador(a) declara que dicha suma corresponde íntegramente a las obligaciones
            pendientes del empleador, y otorga al mismo el más amplio y total finiquito, dejando
            constancia de que no tiene cargo ni cobro alguno pendiente derivado del contrato de
            trabajo individualizado ni de cualquier otra relación laboral con el empleador.
          </Text>
          {data.observaciones && (
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>Observaciones: </Text>{data.observaciones}
            </Text>
          )}
        </View>

        <View style={styles.firmaRow}>
          <View style={styles.firmaCol}>
            <Text style={styles.firmaText}>EMPLEADOR</Text>
            <Text style={styles.firmaText}>{data.empleadorNombre}</Text>
            <Text style={styles.firmaText}>{data.empleadorRut}</Text>
          </View>
          <View style={styles.firmaCol}>
            <Text style={styles.firmaText}>TRABAJADOR(A)</Text>
            <Text style={styles.firmaText}>{data.trabajadorNombre}</Text>
            <Text style={styles.firmaText}>{data.trabajadorRut}</Text>
          </View>
        </View>

        <Text style={{ marginTop: 18, fontSize: 8, color: '#666', textAlign: 'center' }}>
          Este finiquito debe ratificarse ante Notario Público, Inspector del Trabajo o equivalente
          (Art. 177 del Código del Trabajo) para tener mérito ejecutivo.
        </Text>
      </Page>
    </Document>
  );
}
