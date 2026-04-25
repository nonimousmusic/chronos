# Chronos Risk Predictor: Feature Dictionary

The optimized Chronos XGBoost risk prediction model uses a total of **119 features**: a mix of raw vitals, organ dysfunction scores, recent history, engineered interactions, and missingness indicators.

## 1. Base Vitals & Physiology (31 features)
*(Note: `spo2`, `sf_ratio`, and `sf_ratio_min_12h` were removed from the original dataset because they were 100% missing.)*

* **Demographics:** `anchor_age`, `body_weight_kg`
* **Hemodynamics:** `hr` (Heart Rate), `sbp` (Systolic BP), `dbp` (Diastolic BP), `map_mean` (Mean Arterial Pressure), `pulse_pressure`
* **Respiratory:** `rr` (Respiratory Rate), `fio2_frac`, `pao2`, `paco2_abg`, `ph_abg`, `pf_ratio`
* **Vitals Basics:** `temp_c`, `gcs_total` (Glasgow Coma Scale)
* **Interventions:** `vent_active`, `vasopressor_active`, `ne_equivalent_dose` (Norepinephrine dosage), `crrt_active`
* **Labs:** `lactate`, `creatinine`, `platelets`, `bilirubin_total`, `wbc` (White Blood Cells), `sodium`, `potassium`, `bicarbonate`, `hemoglobin`, `glucose`
* **Outputs:** `urine_ml`, `urine_ml_per_kg`

## 2. Organ Dysfunction Scores (13 features)
* **Sub-SOFA Scores:** `sofa_resp`, `sofa_coag`, `sofa_liver`, `sofa_renal`, `sofa_cardio`, `sofa_cns`
* **Aggregates:** `sofa_approx`, `delta_sofa_6h`
* **Clinical Flags:** `shock_index`, `ards_flag`, `aki_stage`, `aki_stage_creat`, `aki_stage_uo`

## 3. Admission Severity Index (5 features)
* `charlson_comorbidity_index`
* `oasis`, `oasis_prob` 
* `sapsii`, `sapsii_prob`

## 4. Rolling 12-Hour History Summaries (21 features)
These capture the patient's status over the last half-day.
* **Hemodynamics (12h):** `hr_mean_12h`, `hr_std_12h`, `map_min_12h`, `map_mean_12h`
* **Labs (12h):** `lactate_max_12h`, `creatinine_max_12h`, `platelets_min_12h`, `bilirubin_max_12h`, `urine_sum_12h`, `urine_per_kg_sum_12h`
* **Acuity flags (12h):** `vasopressor_any_12h`, `ne_dose_mean_12h`, `vent_any_12h`
* **Scores (12h):** `sofa_max_12h`, `delta_sofa_mean_12h`, `aki_stage_max_12h`, `pf_ratio_min_12h`, `shock_index_max_12h`
* **Timing Context:** `observed_hours_in_window`, `hours_since_admission`, `hours_since_infection`

## 5. Newly Engineered Temporal & Interaction Features (11 features)
These were introduced during our recent pipeline optimization to help the model gauge patient trajectory rather than just static values:
* **Rate-of-change (1h Delta):** `delta_hr_1h`, `delta_map_mean_1h`, `delta_lactate_1h`, `delta_creatinine_1h`, `delta_sofa_approx_1h`
* **Compound Interactions:** `shock_x_vaso` (Shock Index × Vasopressor), `lactate_x_sofa` (Lactate × SOFA), `map_x_ne` (MAP × Norepi dose), `hr_x_shock` (Heart Rate × Shock Index)
* **Clinical Ratios:** `hr_rr_ratio` (Heart Rate to Respiratory Rate), `urine_creat_ratio` 

## 6. Missingness Indicators (~38 features)
In the ICU, *not* ordering a lab test is clinically significant (it often implies the patient isn't sick enough to warrant it). The model automatically tags columns with >20% missingness and feeds those binary flags directly into XGBoost (e.g., `miss_lactate`, `miss_paco2_abg`). We filtered out the constant ones, leaving roughly 38 variables solely tracking whether specific labs/vitals check were performed recently.
