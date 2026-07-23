// Template React-PDF para liquidación de sueldo (TCP Chile)
// Layout estilo Buk/DT: tablas paralelas haberes/descuentos + líquido destacado.
// Fuente: Poppins (registrada desde public/fonts). Colores: negro + grises.
import React from 'react';
import {
  Document, Page, Text, View, StyleSheet, Image, Font,
} from '@react-pdf/renderer';
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
  page: { fontFamily: 'Poppins', fontSize: 9, padding: 32, color: '#000' },

  // Header
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { flex: 1 },
  title: { fontSize: 16, fontWeight: 'bold', color: '#000', marginBottom: 2 },
  headerEmp: { fontSize: 10, marginBottom: 1, color: '#000' },
  headerEmpLabel: { fontWeight: 'bold', color: '#000' },
  headerMes: { fontSize: 10, color: '#000' },
  logo: { width: 75, height: 75, objectFit: 'contain' },

  // Info grid (3 cols)
  infoGrid: { flexDirection: 'row', marginTop: 18, marginBottom: 6 },
  infoCol: { flex: 1, paddingRight: 8 },
  infoRow: { flexDirection: 'row', marginBottom: 2 },
  infoLabel: { fontWeight: 'bold', color: '#000' },
  infoValue: { color: '#000' },
  sueldoBase: { marginTop: 2, marginBottom: 14 },

  // Tablas haberes/descuentos
  tableSection: { flexDirection: 'row', gap: 12 },
  tableCol: { flex: 1 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: '#e5e7eb', paddingVertical: 5, paddingHorizontal: 8,
  },
  sectionHeaderText: { fontWeight: 'bold', fontSize: 9, color: '#000' },
  sectionHeaderAmount: { fontWeight: 'bold', fontSize: 9, color: '#000' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingHorizontal: 8 },
  itemLabel: { color: '#000', flex: 1 },
  itemAmount: { color: '#000', width: 90, textAlign: 'right' },

  // Totales (fondo gris claro, texto negro)
  totalsBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: '#e5e7eb', paddingVertical: 6, paddingHorizontal: 8, marginTop: 4,
  },
  totalsText: { fontWeight: 'bold', fontSize: 10, color: '#000' },

  // Sub-bar de imp/base
  subBar: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, paddingHorizontal: 8, marginTop: 1 },
  subBarItem: { fontSize: 8, color: '#000', fontWeight: 'bold' },

  // Líquido (gris medio, texto negro)
  netBox: {
    backgroundColor: '#d1d5db', paddingVertical: 8, paddingHorizontal: 8, marginTop: 1,
    flexDirection: 'row', justifyContent: 'center',
  },
  netText: { fontWeight: 'bold', fontSize: 12, color: '#000' },

  // Certificación
  certificacion: { marginTop: 20, fontSize: 8.5, color: '#000', lineHeight: 1.5 },

  // Firmas
  firmaRow: { flexDirection: 'row', gap: 30, marginTop: 36 },
  firmaCol: { flex: 1, borderTopWidth: 0.5, borderTopColor: '#000', paddingTop: 4, alignItems: 'center' },
  firmaText: { fontSize: 8, color: '#000' },
});

const CLP = (v: number) => `$ ${Math.round(v).toLocaleString('es-CL')}`;
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export interface LiquidacionLineItem {
  label: string;
  amount: number;
}

export interface LiquidacionData {
  period: string;
  // Empleador
  empleadorNombre: string;
  empleadorRut: string;
  // Trabajador
  trabajadorNombre: string;
  trabajadorRut: string;
  cargo?: string;
  // Contrato
  tipoContrato?: string;       // 'Indefinido', 'Plazo fijo'
  fechaIngreso: string;        // formato display
  diasTrabajados: number;
  horasExtras?: number;        // cantidad de horas (no monto)
  sueldoBase: number;
  // Previsión
  afpNombre: string;           // 'AFP Modelo'
  afpTasa?: string;            // '10.58%'
  saludNombre: string;         // 'Fonasa', 'Consalud'
  saludDetalle?: string;       // 'Consalud 2.341 UF (100%)'
  ufValor?: number;
  // Tablas
  haberesImponibles: LiquidacionLineItem[];
  haberesNoImponibles: LiquidacionLineItem[];
  descuentosLegales: LiquidacionLineItem[];
  otrosDescuentos: LiquidacionLineItem[];
  // Subtotales (se calculan en el endpoint)
  totalHaberesImponibles: number;
  totalHaberesNoImponibles: number;
  totalDescuentosLegales: number;
  totalOtrosDescuentos: number;
  totalHaberes: number;
  totalDescuentos: number;
  // Bases (mostradas en sub-bar)
  impPrevSalud: number;
  impCesantia: number;
  baseTributable: number;
  // Resultado
  netPay: number;
  // Recibo de pago (Art. 54 CT) — opcional
  pagadoAt?: string | null;
  medioPago?: string | null;
  referenciaPago?: string | null;
  reciboFirmadoAt?: string | null;
}

function Section({
  title, total, items,
}: { title: string; total: number; items: LiquidacionLineItem[] }) {
  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{title}</Text>
        <Text style={styles.sectionHeaderAmount}>{CLP(total)}</Text>
      </View>
      {items.map((it, i) => (
        <View key={i} style={styles.itemRow}>
          <Text style={styles.itemLabel}>{it.label}</Text>
          <Text style={styles.itemAmount}>{CLP(it.amount)}</Text>
        </View>
      ))}
    </View>
  );
}

export function LiquidacionDocument({ data }: { data: LiquidacionData }) {
  const [y, m] = data.period.split('-').map(Number);
  const periodoLabel = `${MESES[m - 1]} ${y}`;
  const empHeader = `${data.empleadorNombre}${data.empleadorRut ? ` (${data.empleadorRut})` : ''}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header — título + empleador + logo */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Liquidación de Sueldo</Text>
            <Text style={styles.headerEmp}>
              <Text style={styles.headerEmpLabel}>Empleador: </Text>
              {empHeader}
            </Text>
            <Text style={styles.headerMes}>
              <Text style={styles.headerEmpLabel}>Mes: </Text>
              {periodoLabel}
            </Text>
          </View>
          <Image src={LOGO_URL} style={styles.logo} />
        </View>

        {/* Info grid: trabajador / contrato / previsión */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCol}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Sr(a): </Text>
              <Text style={styles.infoValue}>{data.trabajadorNombre}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>RUT: </Text>
              <Text style={styles.infoValue}>{data.trabajadorRut}</Text>
            </View>
            {data.cargo && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Cargo: </Text>
                <Text style={styles.infoValue}>{data.cargo}</Text>
              </View>
            )}
          </View>
          <View style={styles.infoCol}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tipo Contrato: </Text>
              <Text style={styles.infoValue}>{data.tipoContrato ?? 'Indefinido'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Inicio Contrato: </Text>
              <Text style={styles.infoValue}>{data.fechaIngreso}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Días Trabajados: </Text>
              <Text style={styles.infoValue}>{data.diasTrabajados} días</Text>
            </View>
            {!!data.horasExtras && data.horasExtras > 0 && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Horas Extras: </Text>
                <Text style={styles.infoValue}>{data.horasExtras} horas</Text>
              </View>
            )}
          </View>
          <View style={styles.infoCol}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Previsión: </Text>
              <Text style={styles.infoValue}>
                {data.afpNombre}{data.afpTasa ? ` (${data.afpTasa})` : ''}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Salud: </Text>
              <Text style={styles.infoValue}>{data.saludDetalle ?? data.saludNombre}</Text>
            </View>
            {!!data.ufValor && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>UF: </Text>
                <Text style={styles.infoValue}>$ {data.ufValor.toLocaleString('es-CL', { minimumFractionDigits: 2 })}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.sueldoBase}>
          <Text>
            <Text style={styles.infoLabel}>Sueldo Base: </Text>
            <Text>{CLP(data.sueldoBase)}</Text>
          </Text>
        </View>

        {/* Tablas paralelas haberes / descuentos */}
        <View style={styles.tableSection}>
          <View style={styles.tableCol}>
            <Section title="HABERES IMPONIBLES" total={data.totalHaberesImponibles} items={data.haberesImponibles} />
            <View style={{ height: 6 }} />
            <Section title="HABERES NO IMPONIBLES" total={data.totalHaberesNoImponibles} items={data.haberesNoImponibles} />
          </View>
          <View style={styles.tableCol}>
            <Section title="DESCUENTOS LEGALES" total={data.totalDescuentosLegales} items={data.descuentosLegales} />
            <View style={{ height: 6 }} />
            <Section title="OTROS DESCUENTOS" total={data.totalOtrosDescuentos} items={data.otrosDescuentos} />
          </View>
        </View>

        {/* Totales */}
        <View style={styles.totalsBar}>
          <Text style={styles.totalsText}>TOTAL HABERES {CLP(data.totalHaberes)}</Text>
          <Text style={styles.totalsText}>TOTAL DESCUENTOS {CLP(data.totalDescuentos)}</Text>
        </View>

        {/* Sub-bar bases */}
        <View style={styles.subBar}>
          <Text style={styles.subBarItem}>IMP. PREV./SALUD: {CLP(data.impPrevSalud)}</Text>
          <Text style={styles.subBarItem}>IMP. CESANTÍA: {CLP(data.impCesantia)}</Text>
          <Text style={styles.subBarItem}>BASE TRIBUTABLE: {CLP(data.baseTributable)}</Text>
        </View>

        {/* Líquido */}
        <View style={styles.netBox}>
          <Text style={styles.netText}>LÍQUIDO A RECIBIR: {CLP(data.netPay)}</Text>
        </View>

        {/* Datos del pago (Art. 54 CT) — si fue marcado pagado */}
        {data.pagadoAt && (
          <View style={{ marginTop: 12, padding: 8, backgroundColor: '#e5e7eb' }}>
            <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 2 }}>RECIBO DE PAGO</Text>
            <Text style={{ fontSize: 8.5 }}>
              Fecha de pago: {new Date(data.pagadoAt).toLocaleDateString('es-CL')}
              {data.medioPago ? `  ·  Medio: ${data.medioPago}` : ''}
              {data.referenciaPago ? `  ·  Ref: ${data.referenciaPago}` : ''}
            </Text>
          </View>
        )}

        {/* Certificación */}
        <Text style={styles.certificacion}>
          Certifico que he recibido de {empHeader} a mi entera satisfacción el saldo indicado en la presente Liquidación
          y no tengo cargo ni cobro posterior que hacer.
        </Text>

        {/* Firmas */}
        <View style={styles.firmaRow}>
          <View style={styles.firmaCol}>
            <Text style={styles.firmaText}>FIRMA EMPLEADOR</Text>
          </View>
          <View style={styles.firmaCol}>
            <Text style={styles.firmaText}>FIRMA TRABAJADOR</Text>
            {data.reciboFirmadoAt && (
              <Text style={[styles.firmaText, { color: '#16a34a', marginTop: 2 }]}>
                ✓ Firmado el {new Date(data.reciboFirmadoAt).toLocaleDateString('es-CL')}
              </Text>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}
