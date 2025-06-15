export interface User {
  id: string;
  email: string;
}

export interface Assessment {
  id: string;
  advisor_id: string;
  client_cuit: string;
  client_name?: string;
  assessment_result: 'eligible' | 'not_eligible' | 'pending';
  bcra_debt_data?: BCRADebtData;
  bcra_historical_data?: BCRAHistoricalData;
  bcra_eligibility_status?: 'BCRA_APTO' | 'BCRA_NO_APTO' | 'BCRA_PENDING';
  created_at: string;
  updated_at: string;
}

export interface LoanOperation {
  id: string;
  operation_number: string;
  assessment_id: string;
  advisor_id: string;
  client_cuit: string;
  client_name?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  current_stage: 'contact_info' | 'documents' | 'veraz_data' | 'verification';
  contact_info: ContactInfo;
  documents: DocumentsInfo;
  veraz_data: VerazData;
  verification_data: VerificationData;
  created_at: string;
  updated_at: string;
}

export interface ContactInfo {
  date_of_birth?: string;
  phone_number?: string;
  email_address?: string;
}

export interface DocumentsInfo {
  id_card_front?: string;
  id_card_back?: string;
  salary_receipt?: string;
  net_income?: number;
}

export interface VerazData {
  credit_score?: number;
  current_status?: string;
  maximum_delay_24m?: number;
  financial_system_debt_balance?: number;
  veraz_report_income?: number;
  financial_inquiries_6m?: number;
  payment_amount?: number;
  requested_amount?: number;
  payment_to_income_ratio?: number;
}

export interface VerificationData {
  employment_status_verified?: boolean;
  identity_verified?: boolean;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

// BCRA API Types
export interface BCRADebtData {
  identificacion: number;
  denominacion: string;
  periodos: BCRAPeriod[];
}

export interface BCRAHistoricalData {
  identificacion: number;
  denominacion: string;
  periodos: BCRAHistoricalPeriod[];
}

export interface BCRAPeriod {
  periodo: string;
  entidades: BCRAEntity[];
}

export interface BCRAHistoricalPeriod {
  periodo: string;
  entidades: BCRAHistoricalEntity[];
}

export interface BCRAEntity {
  entidad: string;
  situacion: number;
  fechaSit1?: string;
  monto: number;
  diasAtrasoPago: number;
  refinanciaciones: boolean;
  recategorizacionOblig: boolean;
  situacionJuridica: boolean;
  irrecDisposicionTecnica: boolean;
  enRevision: boolean;
  procesoJud: boolean;
}

export interface BCRAHistoricalEntity {
  entidad: string;
  situacion: number;
  monto: number;
  enRevision: boolean;
  procesoJud: boolean;
}

export interface BCRAApiResponse {
  status: number;
  results?: BCRADebtData;
  errorMessages?: string[];
}

export interface BCRAHistoricalApiResponse {
  status: number;
  results?: BCRAHistoricalData;
  errorMessages?: string[];
}

export interface BCRAError {
  status: number;
  errorMessages: string[];
}

export interface BCRAEligibilityAnalysis {
  isEligible: boolean;
  status: 'BCRA_APTO' | 'BCRA_NO_APTO' | 'BCRA_PENDING';
  currentSituation: number | null;
  last6MonthsWorstSituation: number | null;
  last12MonthsWorstSituation: number | null;
  failureReasons: string[];
  analysisDate: string;
}