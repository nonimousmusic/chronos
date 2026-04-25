/**
 * Chronos ML prediction client.
 * Calls the backend /api/predict endpoint with a 77-feature vector
 * and returns risk scores + SHAP explanations.
 */

import { API_BASE } from './config'

// Cache to avoid hammering the endpoint (min 500ms between calls)
let _lastCall: number = 0
let _lastResult: PredictionData | null = null
const MIN_INTERVAL_MS: number = 500

import { RiskScores, ShapValue } from '@/types'

export interface PredictionData {
  risk_scores: RiskScores;
  aggregate_risk: number;
  shap_values: ShapValue[];
  raw_probability: number;
}

/**
 * Send a feature snapshot to the Chronos ML model for risk prediction.
 *
 * @param features - 77-feature dict from simulationEngine snapshot
 * @returns {Promise<PredictionData | null>} risk scores + SHAP explanations
 *                   or null if the endpoint is unavailable
 */
export async function predictRisk(features: Record<string, any>): Promise<PredictionData | null> {
  const now = Date.now()
  if (now - _lastCall < MIN_INTERVAL_MS && _lastResult) {
    return _lastResult
  }

  try {
    const res = await fetch(`${API_BASE}/api/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(features),
    })

    if (!res.ok) {
      console.warn(`[Chronos ML] Predict failed: HTTP ${res.status}`)
      return null
    }

    const data: PredictionData = await res.json()
    _lastCall = now
    _lastResult = data
    return data
  } catch (err) {
    // Backend ML not available — silent fallback to frontend simulation
    console.debug('[Chronos ML] Endpoint not available, using frontend simulation')
    return null
  }
}

export interface MLStatus {
  loaded: boolean;
  feature_count?: number;
}

/**
 * Check if the ML model is loaded and ready on the backend.
 *
 * @returns {Promise<MLStatus>} { loaded: bool, feature_count: number }
 */
export async function checkMLStatus(): Promise<MLStatus> {
  try {
    const res = await fetch(`${API_BASE}/api/ml/status`)
    if (!res.ok) return { loaded: false }
    return await res.json()
  } catch {
    return { loaded: false }
  }
}
