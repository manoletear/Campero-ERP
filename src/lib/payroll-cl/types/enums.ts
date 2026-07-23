// ============================================================
// Poppins Payroll Chile — Enums del módulo nativo de remuneraciones
// (Spec §7, §8.6, §9, §14.2, §15.7, §19) — valores legales, no hardcodear cálculos.
// ============================================================

/** Perfil legal del trabajador del hogar (§7). */
export const LegalProfileType = {
  TCP_PUERTAS_AFUERA: 'TCP_PUERTAS_AFUERA',
  TCP_PUERTAS_ADENTRO: 'TCP_PUERTAS_ADENTRO',
  CHOFER_CASA_PARTICULAR: 'CHOFER_CASA_PARTICULAR',
  CUIDADOR_HOGAR: 'CUIDADOR_HOGAR',
  JARDINERO_DEPENDIENTE_HOGAR: 'JARDINERO_DEPENDIENTE_HOGAR',
  PISCINERO_DEPENDIENTE_HOGAR: 'PISCINERO_DEPENDIENTE_HOGAR',
  OTRO_DEPENDIENTE_HOGAR: 'OTRO_DEPENDIENTE_HOGAR',
  PRESTADOR_EXTERNO_NO_NOMINA: 'PRESTADOR_EXTERNO_NO_NOMINA',
  REVISION_LEGAL_REQUERIDA: 'REVISION_LEGAL_REQUERIDA',
} as const;
export type LegalProfileType = (typeof LegalProfileType)[keyof typeof LegalProfileType];

/** Tipo de vínculo laboral (§7). Solo dependientes ingresan al motor. */
export const EmploymentRelationshipType = {
  DEPENDIENTE_CON_CONTRATO: 'DEPENDIENTE_CON_CONTRATO',
  DEPENDIENTE_EN_REGULARIZACION: 'DEPENDIENTE_EN_REGULARIZACION',
  PRESTADOR_EXTERNO_BOLETA: 'PRESTADOR_EXTERNO_BOLETA',
  PRESTADOR_EXTERNO_FACTURA: 'PRESTADOR_EXTERNO_FACTURA',
  INFORMAL_PENDIENTE_REGULARIZACION: 'INFORMAL_PENDIENTE_REGULARIZACION',
  NO_CLASIFICADO: 'NO_CLASIFICADO',
} as const;
export type EmploymentRelationshipType =
  (typeof EmploymentRelationshipType)[keyof typeof EmploymentRelationshipType];

/** Vínculos habilitados para el motor de remuneraciones (§7 regla). */
export const PAYROLL_ELIGIBLE_RELATIONSHIPS: readonly EmploymentRelationshipType[] = [
  EmploymentRelationshipType.DEPENDIENTE_CON_CONTRATO,
  EmploymentRelationshipType.DEPENDIENTE_EN_REGULARIZACION,
];

/** Modalidad de jornada del hogar. */
export const WorkScheduleType = {
  PUERTAS_AFUERA: 'PUERTAS_AFUERA',
  PUERTAS_ADENTRO: 'PUERTAS_ADENTRO',
} as const;
export type WorkScheduleType = (typeof WorkScheduleType)[keyof typeof WorkScheduleType];

/** Estados del contrato (§8.6). */
export const ContractStatus = {
  DRAFT: 'DRAFT',
  PENDING_DOCUMENTS: 'PENDING_DOCUMENTS',
  PENDING_LEGAL_CLASSIFICATION: 'PENDING_LEGAL_CLASSIFICATION',
  PENDING_DT_REGISTRATION: 'PENDING_DT_REGISTRATION',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  TERMINATED: 'TERMINATED',
  CANCELLED: 'CANCELLED',
} as const;
export type ContractStatus = (typeof ContractStatus)[keyof typeof ContractStatus];

/** Salud previsional. */
export const HealthType = { FONASA: 'FONASA', ISAPRE: 'ISAPRE' } as const;
export type HealthType = (typeof HealthType)[keyof typeof HealthType];

/** Tipo de concepto en la liquidación. */
export const ConceptType = {
  HABER: 'HABER',
  DESCUENTO: 'DESCUENTO',
  APORTE_EMPLEADOR: 'APORTE_EMPLEADOR',
} as const;
export type ConceptType = (typeof ConceptType)[keyof typeof ConceptType];

/** Haberes (§9.1). */
export const HaberCode = {
  SUELDO_BASE: 'SUELDO_BASE',
  HORAS_EXTRA: 'HORAS_EXTRA',
  BONO_IMPONIBLE: 'BONO_IMPONIBLE',
  BONO_NO_IMPONIBLE: 'BONO_NO_IMPONIBLE',
  AGUINALDO: 'AGUINALDO',
  GRATIFICACION_CONTRACTUAL: 'GRATIFICACION_CONTRACTUAL',
  ASIGNACION_MOVILIZACION: 'ASIGNACION_MOVILIZACION',
  ASIGNACION_COLACION: 'ASIGNACION_COLACION',
  ASIGNACION_PERDIDA_CAJA: 'ASIGNACION_PERDIDA_CAJA',
  VIATICO: 'VIATICO',
  REEMBOLSO_GASTOS: 'REEMBOLSO_GASTOS',
  VACACIONES: 'VACACIONES',
  LICENCIA_MEDICA: 'LICENCIA_MEDICA',
  SUBSIDIO: 'SUBSIDIO',
  DIFERENCIA_RETROACTIVA: 'DIFERENCIA_RETROACTIVA',
  PAGO_FERIADO: 'PAGO_FERIADO',
  PAGO_DIA_LIBRE_PUERTAS_ADENTRO: 'PAGO_DIA_LIBRE_PUERTAS_ADENTRO',
} as const;
export type HaberCode = (typeof HaberCode)[keyof typeof HaberCode];

/** Descuentos (§9.2). */
export const DescuentoCode = {
  AFP_10: 'AFP_10',
  AFP_COMISION: 'AFP_COMISION',
  SALUD_7: 'SALUD_7',
  ISAPRE_DIFERENCIA_PLAN: 'ISAPRE_DIFERENCIA_PLAN',
  IMPUESTO_UNICO_SEGUNDA_CATEGORIA: 'IMPUESTO_UNICO_SEGUNDA_CATEGORIA',
  ANTICIPO_SUELDO: 'ANTICIPO_SUELDO',
  PRESTAMO_EMPLEADOR: 'PRESTAMO_EMPLEADOR',
  DESCUENTO_CONVENIDO: 'DESCUENTO_CONVENIDO',
  AUSENCIA_INJUSTIFICADA: 'AUSENCIA_INJUSTIFICADA',
  PERMISO_SIN_GOCE: 'PERMISO_SIN_GOCE',
  OTRO_DESCUENTO_LEGAL: 'OTRO_DESCUENTO_LEGAL',
  OTRO_DESCUENTO_AUTORIZADO: 'OTRO_DESCUENTO_AUTORIZADO',
} as const;
export type DescuentoCode = (typeof DescuentoCode)[keyof typeof DescuentoCode];

/** Aportes del empleador (§9.3). TCP: AFC 3% empleador + CAI 1,11%. */
export const AporteEmpleadorCode = {
  SIS: 'SIS',
  AFC_EMPLEADOR_TCP_3: 'AFC_EMPLEADOR_TCP_3',
  CAI_INDEMNIZACION_TODO_EVENTO_1_11: 'CAI_INDEMNIZACION_TODO_EVENTO_1_11',
  MUTUAL_ACCIDENTES_TRABAJO: 'MUTUAL_ACCIDENTES_TRABAJO',
  SEGURO_SOCIAL_EXPECTATIVA_VIDA: 'SEGURO_SOCIAL_EXPECTATIVA_VIDA',
  SEGURO_SOCIAL_RENTABILIDAD_PROTEGIDA: 'SEGURO_SOCIAL_RENTABILIDAD_PROTEGIDA',
} as const;
export type AporteEmpleadorCode = (typeof AporteEmpleadorCode)[keyof typeof AporteEmpleadorCode];

/** Eventos de licencia/permiso/ausencia (§12.1). */
export const LeaveEventType = {
  MEDICAL_LEAVE_FULL: 'MEDICAL_LEAVE_FULL',
  MEDICAL_LEAVE_PARTIAL: 'MEDICAL_LEAVE_PARTIAL',
  UNPAID_LEAVE: 'UNPAID_LEAVE',
  PAID_PERMISSION: 'PAID_PERMISSION',
  VACATION: 'VACATION',
  WORK_ACCIDENT: 'WORK_ACCIDENT',
  MATERNITY_LEAVE: 'MATERNITY_LEAVE',
  PATERNITY_LEAVE: 'PATERNITY_LEAVE',
  UNJUSTIFIED_ABSENCE: 'UNJUSTIFIED_ABSENCE',
  TERMINATION: 'TERMINATION',
  HIRING: 'HIRING',
  SALARY_CHANGE: 'SALARY_CHANGE',
} as const;
export type LeaveEventType = (typeof LeaveEventType)[keyof typeof LeaveEventType];

/** Causales de finiquito (§14.2). */
export const TerminationCause = {
  RENUNCIA_VOLUNTARIA: 'RENUNCIA_VOLUNTARIA',
  MUTUO_ACUERDO: 'MUTUO_ACUERDO',
  VENCIMIENTO_PLAZO: 'VENCIMIENTO_PLAZO',
  CONCLUSION_TRABAJO: 'CONCLUSION_TRABAJO',
  DESAHUCIO_EMPLEADOR_CASA_PARTICULAR: 'DESAHUCIO_EMPLEADOR_CASA_PARTICULAR',
  INCUMPLIMIENTO_GRAVE: 'INCUMPLIMIENTO_GRAVE',
  CASO_FORTUITO: 'CASO_FORTUITO',
  FALLECIMIENTO_TRABAJADOR: 'FALLECIMIENTO_TRABAJADOR',
  FALLECIMIENTO_EMPLEADOR: 'FALLECIMIENTO_EMPLEADOR',
  REVISION_LEGAL_REQUERIDA: 'REVISION_LEGAL_REQUERIDA',
} as const;
export type TerminationCause = (typeof TerminationCause)[keyof typeof TerminationCause];

/** Estados del snapshot de indicadores (§3.7). */
export const SnapshotStatus = {
  DRAFT: 'DRAFT',
  FETCHING: 'FETCHING',
  FETCHED: 'FETCHED',
  FETCHED_WITH_WARNINGS: 'FETCHED_WITH_WARNINGS',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  VALIDATED: 'VALIDATED',
  APPROVED: 'APPROVED',
  LOCKED: 'LOCKED',
  REPLACED: 'REPLACED',
  VOIDED: 'VOIDED',
} as const;
export type SnapshotStatus = (typeof SnapshotStatus)[keyof typeof SnapshotStatus];

/** Snapshots utilizables para cerrar nómina (§3.7). */
export const SNAPSHOT_USABLE_FOR_CLOSE: readonly SnapshotStatus[] = [
  SnapshotStatus.APPROVED,
  SnapshotStatus.LOCKED,
];

/** Política de UF aplicable (§3.5). */
export const UfPolicy = {
  PERIOD_END_DATE: 'PERIOD_END_DATE',
  PAYMENT_DATE: 'PAYMENT_DATE',
  MONTHLY_REFERENCE_DATE: 'MONTHLY_REFERENCE_DATE',
  MANUAL_OVERRIDE_WITH_APPROVAL: 'MANUAL_OVERRIDE_WITH_APPROVAL',
} as const;
export type UfPolicy = (typeof UfPolicy)[keyof typeof UfPolicy];

/** Estados de exportación Previred (§15.7). */
export const PreviredExportStatus = {
  DRAFT: 'DRAFT',
  VALIDATING: 'VALIDATING',
  VALIDATED_WITHOUT_ERRORS: 'VALIDATED_WITHOUT_ERRORS',
  VALIDATED_WITH_WARNINGS: 'VALIDATED_WITH_WARNINGS',
  FAILED_VALIDATION: 'FAILED_VALIDATION',
  GENERATED: 'GENERATED',
  DOWNLOADED: 'DOWNLOADED',
  SUBMITTED_MANUALLY_BY_USER: 'SUBMITTED_MANUALLY_BY_USER',
  REJECTED_BY_PREVIRED: 'REJECTED_BY_PREVIRED',
  ACCEPTED_BY_PREVIRED: 'ACCEPTED_BY_PREVIRED',
  REPLACED: 'REPLACED',
  VOIDED: 'VOIDED',
} as const;
export type PreviredExportStatus = (typeof PreviredExportStatus)[keyof typeof PreviredExportStatus];

/** Estados de transición BUK → Poppins por tenant (§2.5). */
export const PayrollSourceState = {
  BUK_ACTIVE: 'BUK_ACTIVE',
  POPPINS_PAYROLL_SANDBOX: 'POPPINS_PAYROLL_SANDBOX',
  POPPINS_PAYROLL_PARALLEL_RUN: 'POPPINS_PAYROLL_PARALLEL_RUN',
  POPPINS_PAYROLL_VALIDATED: 'POPPINS_PAYROLL_VALIDATED',
  POPPINS_PAYROLL_PRIMARY: 'POPPINS_PAYROLL_PRIMARY',
  BUK_DISABLED: 'BUK_DISABLED',
} as const;
export type PayrollSourceState = (typeof PayrollSourceState)[keyof typeof PayrollSourceState];

/** Clasificación de diferencias en corrida paralela (§2.6). */
export const ParallelDiffClass = {
  MATCH: 'MATCH',
  MINOR_ROUNDING_DIFFERENCE: 'MINOR_ROUNDING_DIFFERENCE',
  EXPECTED_DIFFERENCE: 'EXPECTED_DIFFERENCE',
  REQUIRES_REVIEW: 'REQUIRES_REVIEW',
  BLOCKING_DIFFERENCE: 'BLOCKING_DIFFERENCE',
} as const;
export type ParallelDiffClass = (typeof ParallelDiffClass)[keyof typeof ParallelDiffClass];
