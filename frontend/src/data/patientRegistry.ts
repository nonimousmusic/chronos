import realVitalsRaw from './realPatientVitals.json';
import { Patient, Vitals } from '@/types';

const realVitals = realVitalsRaw as Record<string, any[]>;

// Clinical data repository for the Chronos Telemetry Bridge.
// Vitals are sourced directly from the MIMIC III dataset.

function extractHistoryFromReal(patientId: string, count = 24): Vitals[] {
  const series = realVitals[patientId] || [];
  // Grab the first 24 readings for the historical sparkline charts
  const historyPoints: Vitals[] = [];
  
  for (let i = 0; i < Math.min(count, series.length); i++) {
    const pt = series[i];
    historyPoints.push({
      heart_rate: pt.heart_rate || 80,
      spo2: pt.spo2 || 95,
      map: pt.map || 65,
      lactate: pt.lactate || 1.5,
      respiratory_rate: pt.respiratory_rate || 16,
    });
  }
  
  // Pad if insufficient data points
  while (historyPoints.length < count) {
    if (historyPoints.length > 0) {
      historyPoints.push({ ...historyPoints[historyPoints.length - 1] });
    } else {
        // Absolute fallback if no data at all
        historyPoints.push({
            heart_rate: 80,
            spo2: 95,
            map: 65,
            lactate: 1.5,
            respiratory_rate: 16
        });
    }
  }
  return historyPoints;
}

function extractCurrentFromReal(patientId: string): Vitals {
  const series = realVitals[patientId] || [];
  // Start with the 25th row if we pulled 24 for history
  const pt = series.length > 24 ? series[24] : series[0] || {};
  return {
    heart_rate: pt.heart_rate || 80,
    spo2: pt.spo2 || 95,
    map: pt.map || 65,
    lactate: pt.lactate || 1.5,
    respiratory_rate: pt.respiratory_rate || 16,
  };
}

export const patients: Patient[] = [
  {
    id: 'P-1042',
    bed: 4,
    name: 'R. Sharma',
    age: 67,
    admitReason: 'Post-CABG Recovery',
    riskScores: { shock: 0.89, sepsis: 0.72, deterioration: 0.81, arrest: 0.62 },
    aggregateRisk: 0.89,
    status: 'critical',
    currentVitals: extractCurrentFromReal('P-1042'),
    vitalHistory: extractHistoryFromReal('P-1042'),
    realTimeSeries: realVitals['P-1042'] || [],
    shapFeatures: [
      { feature: 'Lactate (t-1)', value: 0.28, direction: 'risk' },
      { feature: 'MAP (t-2)', value: -0.22, direction: 'risk' },
      { feature: 'SpO2 (t-3)', value: 0.16, direction: 'protective' },
      { feature: 'Heart Rate (t-1)', value: 0.14, direction: 'risk' },
      { feature: 'Resp. Rate (t-1)', value: 0.12, direction: 'risk' },
      { feature: 'MAP NIBP (t-4)', value: -0.08, direction: 'protective' },
    ],
    highlightOrgan: 'heart',
  },
  {
    id: 'P-2718',
    bed: 7,
    name: 'S. Patel',
    age: 54,
    admitReason: 'Pneumonia / ARDS',
    riskScores: { shock: 0.34, sepsis: 0.85, deterioration: 0.58, arrest: 0.22 },
    aggregateRisk: 0.85,
    status: 'critical',
    currentVitals: extractCurrentFromReal('P-2718'),
    vitalHistory: extractHistoryFromReal('P-2718'),
    realTimeSeries: realVitals['P-2718'] || [],
    shapFeatures: [
      { feature: 'Lactate (t-1)', value: 0.32, direction: 'risk' },
      { feature: 'Resp. Rate (t-2)', value: 0.24, direction: 'risk' },
      { feature: 'SpO2 (t-1)', value: -0.20, direction: 'risk' },
      { feature: 'Heart Rate (t-3)', value: 0.14, direction: 'risk' },
      { feature: 'MAP (t-1)', value: -0.09, direction: 'risk' },
      { feature: 'MAP NIBP (t-2)', value: 0.05, direction: 'protective' },
    ],
    highlightOrgan: 'lungs',
  },
  {
    id: 'P-3141',
    bed: 2,
    name: 'A. Gupta',
    age: 73,
    admitReason: 'Acute Kidney Injury',
    riskScores: { shock: 0.76, sepsis: 0.68, deterioration: 0.55, arrest: 0.41 },
    aggregateRisk: 0.76,
    status: 'critical',
    currentVitals: extractCurrentFromReal('P-3141'),
    vitalHistory: extractHistoryFromReal('P-3141'),
    realTimeSeries: realVitals['P-3141'] || [],
    shapFeatures: [
      { feature: 'MAP (t-1)', value: -0.30, direction: 'risk' },
      { feature: 'Lactate (t-2)', value: 0.22, direction: 'risk' },
      { feature: 'Heart Rate (t-1)', value: 0.15, direction: 'risk' },
      { feature: 'SpO2 (t-4)', value: -0.10, direction: 'risk' },
      { feature: 'Resp. Rate (t-2)', value: 0.07, direction: 'protective' },
      { feature: 'MAP NIBP (t-1)', value: -0.05, direction: 'protective' },
    ],
    highlightOrgan: 'kidneys',
  },
  {
    id: 'P-1618',
    bed: 11,
    name: 'M. Reddy',
    age: 45,
    admitReason: 'Septic Shock',
    riskScores: { shock: 0.92, sepsis: 0.88, deterioration: 0.71, arrest: 0.55 },
    aggregateRisk: 0.92,
    status: 'critical',
    currentVitals: extractCurrentFromReal('P-1618'),
    vitalHistory: extractHistoryFromReal('P-1618'),
    realTimeSeries: realVitals['P-1618'] || [],
    shapFeatures: [
      { feature: 'Lactate (t-1)', value: 0.38, direction: 'risk' },
      { feature: 'MAP (t-1)', value: -0.28, direction: 'risk' },
      { feature: 'Heart Rate (t-2)', value: 0.22, direction: 'risk' },
      { feature: 'SpO2 (t-1)', value: -0.18, direction: 'risk' },
      { feature: 'Resp. Rate (t-3)', value: 0.14, direction: 'risk' },
      { feature: 'MAP NIBP (t-2)', value: -0.06, direction: 'risk' },
    ],
    highlightOrgan: 'heart',
  },
  {
    id: 'P-2236',
    bed: 9,
    name: 'R. Iyer',
    age: 61,
    admitReason: 'Post-Valve Replacement',
    riskScores: { shock: 0.42, sepsis: 0.28, deterioration: 0.65, arrest: 0.38 },
    aggregateRisk: 0.65,
    status: 'observing',
    currentVitals: extractCurrentFromReal('P-2236'),
    vitalHistory: extractHistoryFromReal('P-2236'),
    realTimeSeries: realVitals['P-2236'] || [],
    shapFeatures: [
      { feature: 'Heart Rate (t-1)', value: 0.16, direction: 'risk' },
      { feature: 'MAP (t-3)', value: -0.12, direction: 'risk' },
      { feature: 'Lactate (t-2)', value: 0.09, direction: 'risk' },
      { feature: 'SpO2 (t-1)', value: 0.06, direction: 'protective' },
      { feature: 'Resp. Rate (t-4)', value: -0.04, direction: 'protective' },
      { feature: 'MAP NIBP (t-1)', value: 0.03, direction: 'protective' },
    ],
    highlightOrgan: 'heart',
  },
  {
    id: 'P-5050',
    bed: 3,
    name: 'L. Nair',
    age: 58,
    admitReason: 'GI Bleed',
    riskScores: { shock: 0.55, sepsis: 0.32, deterioration: 0.48, arrest: 0.18 },
    aggregateRisk: 0.55,
    status: 'observing',
    currentVitals: extractCurrentFromReal('P-5050'),
    vitalHistory: extractHistoryFromReal('P-5050'),
    realTimeSeries: realVitals['P-5050'] || [],
    shapFeatures: [
      { feature: 'Heart Rate (t-2)', value: 0.12, direction: 'risk' },
      { feature: 'MAP (t-1)', value: -0.09, direction: 'risk' },
      { feature: 'Lactate (t-1)', value: 0.07, direction: 'risk' },
      { feature: 'SpO2 (t-2)', value: 0.05, direction: 'protective' },
      { feature: 'Resp. Rate (t-1)', value: -0.03, direction: 'protective' },
      { feature: 'MAP NIBP (t-3)', value: 0.02, direction: 'protective' },
    ],
    highlightOrgan: 'stomach',
  },
  {
    id: 'P-7777',
    bed: 1,
    name: 'D. Verma',
    age: 82,
    admitReason: 'CHF Exacerbation',
    riskScores: { shock: 0.38, sepsis: 0.22, deterioration: 0.45, arrest: 0.52 },
    aggregateRisk: 0.52,
    status: 'observing',
    currentVitals: extractCurrentFromReal('P-7777'),
    vitalHistory: extractHistoryFromReal('P-7777'),
    realTimeSeries: realVitals['P-7777'] || [],
    shapFeatures: [
      { feature: 'Heart Rate (t-1)', value: 0.10, direction: 'risk' },
      { feature: 'MAP (t-2)', value: -0.08, direction: 'risk' },
      { feature: 'Lactate (t-3)', value: 0.06, direction: 'risk' },
      { feature: 'SpO2 (t-1)', value: 0.08, direction: 'protective' },
      { feature: 'Resp. Rate (t-2)', value: -0.04, direction: 'protective' },
      { feature: 'MAP NIBP (t-1)', value: 0.02, direction: 'protective' },
    ],
    highlightOrgan: 'heart',
  },
  {
    id: 'P-4242',
    bed: 6,
    name: 'T. Singh',
    age: 39,
    admitReason: 'Trauma - MVC',
    riskScores: { shock: 0.18, sepsis: 0.12, deterioration: 0.22, arrest: 0.08 },
    aggregateRisk: 0.22,
    status: 'stable',
    currentVitals: extractCurrentFromReal('P-4242'),
    vitalHistory: extractHistoryFromReal('P-4242'),
    realTimeSeries: realVitals['P-4242'] || [],
    shapFeatures: [
      { feature: 'Heart Rate (t-1)', value: 0.03, direction: 'protective' },
      { feature: 'MAP (t-1)', value: 0.05, direction: 'protective' },
      { feature: 'Lactate (t-2)', value: -0.02, direction: 'protective' },
      { feature: 'SpO2 (t-1)', value: 0.04, direction: 'protective' },
      { feature: 'Resp. Rate (t-1)', value: -0.01, direction: 'protective' },
      { feature: 'MAP NIBP (t-3)', value: 0.02, direction: 'protective' },
    ],
    highlightOrgan: null,
  },
  {
    id: 'P-9090',
    bed: 8,
    name: 'E. Joshi',
    age: 71,
    admitReason: 'Elective Hip Replacement',
    riskScores: { shock: 0.08, sepsis: 0.06, deterioration: 0.12, arrest: 0.04 },
    aggregateRisk: 0.12,
    status: 'stable',
    currentVitals: extractCurrentFromReal('P-9090'),
    vitalHistory: extractHistoryFromReal('P-9090'),
    realTimeSeries: realVitals['P-9090'] || [],
    shapFeatures: [
      { feature: 'SpO2 (t-1)', value: 0.06, direction: 'protective' },
      { feature: 'MAP (t-1)', value: 0.05, direction: 'protective' },
      { feature: 'Lactate (t-1)', value: -0.01, direction: 'protective' },
      { feature: 'Heart Rate (t-2)', value: 0.03, direction: 'protective' },
      { feature: 'Resp. Rate (t-1)', value: -0.02, direction: 'protective' },
      { feature: 'MAP NIBP (t-1)', value: 0.01, direction: 'protective' },
    ],
    highlightOrgan: null,
  },
  {
    id: 'P-6180',
    bed: 10,
    name: 'C. Deshmukh',
    age: 50,
    admitReason: 'Diabetic Ketoacidosis',
    riskScores: { shock: 0.15, sepsis: 0.20, deterioration: 0.18, arrest: 0.06 },
    aggregateRisk: 0.20,
    status: 'stable',
    currentVitals: extractCurrentFromReal('P-6180'),
    vitalHistory: extractHistoryFromReal('P-6180'),
    realTimeSeries: realVitals['P-6180'] || [],
    shapFeatures: [
      { feature: 'Lactate (t-1)', value: 0.05, direction: 'risk' },
      { feature: 'MAP (t-2)', value: 0.04, direction: 'protective' },
      { feature: 'Heart Rate (t-1)', value: -0.03, direction: 'protective' },
      { feature: 'SpO2 (t-1)', value: 0.04, direction: 'protective' },
      { feature: 'Resp. Rate (t-3)', value: -0.02, direction: 'protective' },
      { feature: 'MAP NIBP (t-1)', value: 0.01, direction: 'protective' },
    ],
    highlightOrgan: null,
  },
];

export default patients;
