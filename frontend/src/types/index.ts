import { Session } from '@supabase/supabase-js'

export type UserRole = 'doctor' | 'nurse' | 'patient' | 'admin'

export interface UserProfile {
  id: string
  name: string
  role: UserRole
  email?: string
  assigned_doctor_name?: string
  assigned_icu_ward?: string
  duty_start?: string
  duty_end?: string
  created_at?: string
}

export interface AuthContextType {
  session: Session | null
  user: Session['user'] | null
  doctor: UserProfile | null
  loading: boolean
  login: (email: string, password: string) => Promise<any>
  signup: (email: string, password: string, name: string, metadata?: any) => Promise<any>
  logout: () => Promise<void>
  isAuthenticated: boolean
}

export interface RiskScores {
  shock: number
  sepsis: number
  deterioration: number
  arrest: number
}

export interface ShapValue {
  feature: string
  value: number
  direction: 'risk' | 'protective'
}

export interface Vitals {
  heart_rate: number
  spo2: number
  bp_sys?: number
  bp_dia?: number
  map?: number
  lactate?: number
  respiratory_rate?: number
  resp_rate?: number // Legacy support
  motion_score?: number
  temp?: number
}

export interface Patient {
  id: string
  name: string
  bed: number
  age: number
  admitReason: string
  unit_id?: string
  admission_time?: string
  diagnosis?: string
  status?: 'stable' | 'observing' | 'critical'
  risk_score?: number // Legacy support
  aggregateRisk: number
  riskScores: RiskScores
  currentVitals: Vitals
  vitalHistory: Vitals[]
  realTimeSeries?: any[]
  highlightOrgan: string | null
  shapFeatures: ShapValue[]
  last_vitals?: Vitals // Legacy support
}

export interface Instruction {
  id: string
  patient_id: string
  doctor_id: string
  nurse_id?: string | null
  text: string
  status: 'pending' | 'completed' | 'active'
  created_at: string
  patients?: { name: string }
  users?: { name: string }
}

export interface AdministeredMedication {
  id: string
  patient_id: string
  nurse_id: string
  medicine: string
  dosage: string
  route: string
  administered_at: string
  is_administered: boolean
  patients?: { name: string }
  users?: { name: string }
}

export interface Complaint {
  id: string
  patient_id: string
  lodged_by: 'patient' | 'nurse' | 'auto'
  nature: string
  status: 'active' | 'resolved' | 'pending'
  created_at: string
  patients?: { name: string }
}

export interface RiskPrediction {
  id: string
  patient_id: string
  risk_score?: number
  risk_percentage?: number // Support both naming variants found in DB
  risk_level: 'stable' | 'observing' | 'critical'
  event?: string
  contributing_factors?: string[]
  shap_1?: string
  shap_2?: string
  shap_3?: string
  created_at: string
  patients?: { name: string }
}

export interface MedicalReport {
  report_id: string
  patient_id: string
  report_type: string
  content?: string
  summary?: string
  created_at: string
  patients?: { name: string }
}

export interface MedicalUnit {
  unit_id: string
  unit_type: string
  floor?: string
  total_beds?: number
}

export interface NurseActivity {
  id: string
  name: string
  duty_start: string
  duty_end: string
  role: 'nurse'
  type: 'nurse'
  isOnDuty: boolean
}

export type ClinicalOrderItem = 
  | (Instruction & { type: 'instruction' })
  | (AdministeredMedication & { type: 'medication' })
  | (Complaint & { type: 'complaint' })
  | (RiskPrediction & { type: 'prediction' })
  | (MedicalReport & { type: 'report' })
  | (NurseActivity)

export interface AnomalyTag {
  type: string
  message: string
  reason: string
}

export interface Anomaly {
  timestamp: number
  tags: AnomalyTag[]
}

export interface TelemetryFrame {
  timestamp: number
  heart_rate: number
  spo2?: number
  frame_idx?: number
  session_id?: string
  tags?: AnomalyTag[]
}

export interface AuditEntry {
  seq: number
  chain_hash: string
  prev_hash?: string
  timestamp: number
  vitals?: any
}

export interface OTBlock {
  id: string
  patient_id: string
  curr_hash: string
  prev_hash?: string
  heart_rate?: number
  spo2?: number
  bp?: number
  recorded_at: string
  created_at: string
}
