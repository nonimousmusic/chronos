/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  MEDICAL FEATURE INFORMATION DATABASE
 *  Sources: NIH, WHO, KDIGO, Sepsis-3, Berlin Definition, MDCalc, ClinCalc
 *  WARNING: For clinical decision support reference only.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export interface FeatureRecord {
  label: string;
  technical: string;
  clinical: string;
  safeRange: string;
  critical: string;
  why: string;
  source: string;
}

export const FEATURE_INFO: Record<string, FeatureRecord> = {
  // ─── VITALS ───
  hr: {
    label: 'Heart Rate',
    technical: 'Electrical impulses/min from SA node. Measured via ECG or pulse oximetry waveform.',
    clinical: 'How fast the heart beats each minute. Reflects cardiac workload and stress response.',
    safeRange: '60–100 bpm',
    critical: '<50 or >120 bpm in ICU warrants intervention',
    why: 'Tachycardia (>100) may signal pain, sepsis, hemorrhage, or cardiac failure. Bradycardia (<50) can indicate heart block or medication effects.',
    source: 'AHA / Cleveland Clinic'
  },
  map_mean: {
    label: 'Mean Arterial Pressure',
    technical: 'MAP = DBP + ⅓(SBP − DBP). Gold-standard for organ perfusion pressure.',
    clinical: 'Average blood pressure during one cardiac cycle. Ensures organs get enough blood flow.',
    safeRange: '70–100 mmHg',
    critical: '<65 mmHg = organ hypoperfusion risk (Surviving Sepsis Campaign target)',
    why: 'MAP <60 mmHg leads to inadequate perfusion of brain, kidneys, and heart. Target ≥65 mmHg in septic shock per SSC guidelines.',
    source: 'Surviving Sepsis Campaign 2021 / NIH'
  },
  sbp: {
    label: 'Systolic Blood Pressure',
    technical: 'Peak arterial pressure during ventricular systole (contraction). Measured in mmHg.',
    clinical: 'The "top number" in a blood pressure reading — pressure when the heart pumps.',
    safeRange: '90–140 mmHg',
    critical: '<90 mmHg = hypotension; >180 mmHg = hypertensive urgency',
    why: 'Low SBP indicates shock or dehydration. Very high SBP risks stroke and organ damage.',
    source: 'AHA / JNC-8 Guidelines'
  },
  dbp: {
    label: 'Diastolic Blood Pressure',
    technical: 'Minimum arterial pressure during ventricular diastole (relaxation). Measured in mmHg.',
    clinical: 'The "bottom number" — pressure when the heart rests between beats.',
    safeRange: '60–90 mmHg',
    critical: '<50 mmHg or >120 mmHg requires evaluation',
    why: 'Reflects peripheral resistance. Low DBP reduces coronary perfusion (heart feeds itself during diastole).',
    source: 'AHA Guidelines'
  },
  rr: {
    label: 'Respiratory Rate',
    technical: 'Breaths per minute. Counted by chest wall movement or capnography waveform.',
    clinical: 'How many breaths taken per minute. One of the earliest signs of patient deterioration.',
    safeRange: '12–20 breaths/min',
    critical: '>25 = early warning sign; >30 = urgent review needed',
    why: 'Elevated RR is the single best predictor of cardiac arrest on general wards. Reflects respiratory distress, metabolic acidosis, or pain.',
    source: 'British Thoracic Society / MJA'
  },
  spo2: {
    label: 'SpO₂ (Oxygen Saturation)',
    technical: 'Percentage of hemoglobin saturated with O₂. Measured by pulse oximetry (red/infrared light absorption).',
    clinical: 'How much oxygen the blood is carrying. Displayed as a percentage.',
    safeRange: '94–98% (92–96% for acutely ill)',
    critical: '<90% = hypoxemia requiring urgent O₂ therapy',
    why: 'Low SpO₂ means tissues aren\'t getting enough oxygen, leading to organ damage. Target 88–92% in COPD patients to avoid CO₂ retention.',
    source: 'BTS Oxygen Guidelines / WHO'
  },
  temp_c: {
    label: 'Temperature',
    technical: 'Core body temperature in Celsius. Measured via esophageal, bladder, or rectal probe in ICU.',
    clinical: 'Body temperature — indicates fever or hypothermia.',
    safeRange: '36.1–37.2 °C (97–99 °F)',
    critical: '<35.5 °C = hypothermia; >38.5 °C = fever/infection likely',
    why: 'Fever suggests infection or inflammation. Hypothermia in sepsis carries worse prognosis than fever.',
    source: 'NICE Guidelines / WHO'
  },
  pulse_pressure: {
    label: 'Pulse Pressure',
    technical: 'PP = SBP − DBP. Reflects stroke volume and arterial compliance.',
    clinical: 'Difference between top and bottom blood pressure numbers.',
    safeRange: '30–50 mmHg',
    critical: '<25 mmHg (narrow) or >60 mmHg (wide) is concerning',
    why: 'Narrow PP suggests low cardiac output or tamponade. Wide PP seen in aortic regurgitation, sepsis, or high output states.',
    source: 'ACC / AHA'
  },
  gcs_total: {
    label: 'Glasgow Coma Scale',
    technical: 'Sum of Eye (1–4) + Verbal (1–5) + Motor (1–6) responses. Range: 3–15.',
    clinical: 'Measures consciousness level — how awake and responsive a patient is.',
    safeRange: '15 (fully alert)',
    critical: '≤8 = severe brain injury, intubation usually required; 9–12 = moderate',
    why: 'GCS <8 indicates coma. Serial GCS monitoring detects neurological deterioration. Used for TBI triage and prognosis.',
    source: 'Teasdale & Jennett (Lancet) / NICE Head Injury Guidelines'
  },
  // ─── OXYGENATION ───
  fio2_frac: {
    label: 'FiO₂ (Fraction of Inspired O₂)',
    technical: 'Fraction of O₂ in inspired gas, 0.21 (room air) to 1.0 (100%). Set on ventilator or O₂ device.',
    clinical: 'How much extra oxygen is being given to the patient (room air = 21%).',
    safeRange: '0.21 (room air)',
    critical: '>0.6 for prolonged periods → risk of O₂ toxicity (ARDS worsening)',
    why: 'High FiO₂ requirements indicate severe lung disease. Prolonged high FiO₂ causes absorption atelectasis and oxidative lung injury.',
    source: 'ARDSNet Protocol / BTS'
  },
  pao2: {
    label: 'PaO₂ (Arterial O₂ Pressure)',
    technical: 'Partial pressure of dissolved O₂ in arterial blood. Measured from ABG sample in mmHg.',
    clinical: 'How much oxygen is dissolved in the blood — directly from an arterial blood sample.',
    safeRange: '80–100 mmHg on room air',
    critical: '<60 mmHg = respiratory failure (Type 1)',
    why: 'PaO₂ <60 mmHg on the oxyhemoglobin dissociation curve corresponds to SpO₂ ~90%, below which saturation drops rapidly.',
    source: 'Harrison\'s Principles of Internal Medicine'
  },
  paco2_abg: {
    label: 'PaCO₂ (Arterial CO₂)',
    technical: 'Partial pressure of CO₂ in arterial blood. Reflects ventilation adequacy.',
    clinical: 'How well the lungs are removing carbon dioxide — a waste gas.',
    safeRange: '35–45 mmHg',
    critical: '>50 mmHg = respiratory failure (Type 2); <20 mmHg = severe hyperventilation',
    why: 'Elevated PaCO₂ (hypercapnia) causes acidosis and respiratory failure. Low PaCO₂ indicates compensatory hyperventilation (e.g., metabolic acidosis).',
    source: 'Guyton Physiology / ABG Interpretation Guidelines'
  },
  ph_abg: {
    label: 'Arterial pH',
    technical: 'Negative log of H⁺ concentration in arterial blood. Normal: 7.35–7.45.',
    clinical: 'Acidity or alkalinity of the blood — must stay in a very tight range for survival.',
    safeRange: '7.35–7.45',
    critical: '<7.20 or >7.55 = life-threatening',
    why: 'Severe acidosis (pH <7.2) impairs cardiac contractility and vasopressor response. Severe alkalosis causes arrhythmias and seizures.',
    source: 'NIH / Clinical Biochemistry Textbooks'
  },
  pf_ratio: {
    label: 'P/F Ratio (PaO₂/FiO₂)',
    technical: 'PaO₂ ÷ FiO₂. Key metric for ARDS classification per Berlin Definition (2012).',
    clinical: 'A ratio showing how well the lungs transfer oxygen — lower = worse lung function.',
    safeRange: '>400 (normal lungs)',
    critical: '≤300 = Mild ARDS; ≤200 = Moderate ARDS; ≤100 = Severe ARDS',
    why: 'The Berlin Definition uses P/F ratio to classify ARDS severity. Each 50-point decrease correlates with 8–12% increase in mortality.',
    source: 'Berlin Definition (JAMA 2012) / ARDSNet'
  },
  sf_ratio: {
    label: 'S/F Ratio (SpO₂/FiO₂)',
    technical: 'SpO₂ ÷ FiO₂. Non-invasive surrogate for P/F ratio when ABG unavailable.',
    clinical: 'Non-invasive estimate of lung function using pulse oximetry instead of blood draw.',
    safeRange: '>315 (correlates with P/F >200)',
    critical: '<235 with ventilation suggests moderate-severe ARDS',
    why: 'Useful when arterial blood gas is unavailable. S/F <235 on mechanical ventilation correlates with P/F <200 (moderate ARDS).',
    source: 'Rice et al. (Chest 2007) / Critical Care Medicine'
  },
  // ─── ORGAN SUPPORT ───
  vent_active: {
    label: 'Mechanical Ventilation',
    technical: 'Binary (0/1). Indicates positive-pressure ventilatory support via endotracheal tube or tracheostomy.',
    clinical: 'Whether the patient is on a breathing machine (ventilator) to help them breathe.',
    safeRange: '0 (off ventilator)',
    critical: '1 = patient requires machine-assisted breathing',
    why: 'Ventilator dependence indicates severe respiratory failure. Prolonged ventilation increases VAP (ventilator-associated pneumonia) risk.',
    source: 'ARDSNet / SCCM Guidelines'
  },
  vasopressor_active: {
    label: 'Vasopressor Active',
    technical: 'Binary (0/1). Any vasoactive medication infusing (norepinephrine, vasopressin, epinephrine, etc.).',
    clinical: 'Whether drugs are being given to raise dangerously low blood pressure.',
    safeRange: '0 (no vasopressors needed)',
    critical: '1 = hemodynamic instability requiring pharmacological support',
    why: 'Need for vasopressors indicates cardiovascular failure. SOFA cardiovascular score increases with vasopressor dose.',
    source: 'Surviving Sepsis Campaign / SCCM'
  },
  ne_equivalent_dose: {
    label: 'Norepinephrine Equivalent Dose',
    technical: 'Standardized vasopressor dose in mcg/kg/min, normalized to norepinephrine equivalents.',
    clinical: 'How much blood pressure medication (converted to one standard) is being given.',
    safeRange: '0 mcg/kg/min',
    critical: '>0.1 mcg/kg/min = SOFA Cardio 3; >0.3 = high-dose, poor prognosis',
    why: 'Higher vasopressor doses correlate with worse outcomes. Escalating doses suggest refractory shock and need for adjunct therapies.',
    source: 'SCCM / Surviving Sepsis Campaign 2021'
  },
  crrt_active: {
    label: 'CRRT (Continuous Renal Replacement)',
    technical: 'Binary (0/1). Continuous renal replacement therapy for acute kidney injury.',
    clinical: 'Whether continuous kidney dialysis is being used to filter the patient\'s blood.',
    safeRange: '0 (not on dialysis)',
    critical: '1 = severe AKI requiring renal replacement, SOFA Renal = 4',
    why: 'CRRT indicates Stage 3 AKI (KDIGO). Automatically scores SOFA Renal = 4 (maximum). Associated with 40–60% ICU mortality.',
    source: 'KDIGO AKI Guidelines 2012 / SCCM'
  },
  // ─── LABORATORY ───
  lactate: {
    label: 'Lactate',
    technical: 'Serum lactate in mmol/L. Byproduct of anaerobic metabolism; marker of tissue hypoperfusion.',
    clinical: 'A blood marker showing if the body\'s tissues are getting enough oxygen.',
    safeRange: '<2.0 mmol/L',
    critical: '>2 mmol/L = review needed; >4 mmol/L = medical emergency (severe sepsis criteria)',
    why: 'Elevated lactate indicates tissue hypoxia and is a key Sepsis-3 criterion. Lactate clearance (>10% in 6h) predicts survival.',
    source: 'Surviving Sepsis Campaign / NICE Sepsis Guidelines'
  },
  creatinine: {
    label: 'Creatinine',
    technical: 'Serum creatinine in mg/dL. Byproduct of muscle metabolism; marker of kidney filtration (GFR).',
    clinical: 'A blood test measuring kidney function — high levels mean kidneys aren\'t filtering well.',
    safeRange: '0.6–1.2 mg/dL (males); 0.5–1.1 mg/dL (females)',
    critical: '≥1.5× baseline = AKI Stage 1; ≥2.0 = Stage 2; ≥3.0 = Stage 3 (KDIGO)',
    why: 'Rising creatinine signals acute kidney injury. Each KDIGO stage increase worsens mortality. Used in both SOFA Renal and AKI staging.',
    source: 'KDIGO AKI Guidelines 2012'
  },
  platelets: {
    label: 'Platelets',
    technical: 'Platelet count ×10³/µL. Essential for hemostasis. Produced by megakaryocytes in bone marrow.',
    clinical: 'Blood cells that help form clots to stop bleeding. Low counts increase bleeding risk.',
    safeRange: '150–400 ×10³/µL',
    critical: '<100 = SOFA Coag 2; <50 = SOFA 3; <20 = SOFA 4 (spontaneous bleeding risk)',
    why: 'Thrombocytopenia in ICU suggests DIC, sepsis, or drug-induced causes. <20k risks fatal spontaneous hemorrhage.',
    source: 'SOFA Score / ASH Guidelines'
  },
  bilirubin_total: {
    label: 'Bilirubin (Total)',
    technical: 'Total serum bilirubin in mg/dL. Product of heme catabolism; reflects liver function.',
    clinical: 'A liver function marker — high levels cause jaundice (yellowing of skin/eyes).',
    safeRange: '0.1–1.2 mg/dL',
    critical: '≥2.0 = SOFA Liver 2; ≥6.0 = SOFA 3; ≥12.0 = SOFA 4',
    why: 'Elevated bilirubin indicates hepatic dysfunction, biliary obstruction, or hemolysis. Part of SOFA liver component.',
    source: 'SOFA Score / AASLD Guidelines'
  },
  wbc: {
    label: 'White Blood Cells',
    technical: 'WBC count ×10³/µL. Leukocytes responsible for immune defense.',
    clinical: 'Immune cells that fight infection. High or low counts can signal serious problems.',
    safeRange: '4.5–11.0 ×10³/µL',
    critical: '>12 or <4 = SIRS criteria; >20 = severe infection likely',
    why: 'Leukocytosis (>12k) suggests infection/inflammation. Leukopenia (<4k) in sepsis indicates bone marrow suppression and worse prognosis.',
    source: 'SIRS/Sepsis Criteria / Harrison\'s'
  },
  sodium: {
    label: 'Sodium',
    technical: 'Serum Na⁺ in mEq/L. Key electrolyte for fluid balance and neuromuscular function.',
    clinical: 'An essential electrolyte that controls fluid balance and nerve/muscle function.',
    safeRange: '136–145 mEq/L',
    critical: '<120 or >160 = life-threatening (seizures, cardiac arrhythmias)',
    why: 'Severe hyponatremia causes cerebral edema and seizures. Rapid correction risks osmotic demyelination syndrome.',
    source: 'Endocrine Society / NICE Guidelines'
  },
  potassium: {
    label: 'Potassium',
    technical: 'Serum K⁺ in mEq/L. Critical for cardiac myocyte repolarization and muscle contraction.',
    clinical: 'An electrolyte vital for heart rhythm. Too high or too low can cause fatal heart rhythms.',
    safeRange: '3.5–5.0 mEq/L',
    critical: '<3.0 or >5.5 = cardiac arrhythmia risk; >6.5 = emergency',
    why: 'Hyperkalemia (>6.0) causes peaked T-waves, widened QRS, and cardiac arrest. Hypokalemia causes U-waves and torsades de pointes.',
    source: 'AHA ACLS / NICE Acute Kidney Injury'
  },
  bicarbonate: {
    label: 'Bicarbonate',
    technical: 'Serum HCO₃⁻ in mEq/L. Primary buffer in acid-base homeostasis.',
    clinical: 'A buffer in the blood that maintains proper acid-base balance.',
    safeRange: '22–26 mEq/L',
    critical: '<18 = metabolic acidosis; <10 = severe, life-threatening',
    why: 'Low bicarbonate indicates metabolic acidosis (DKA, lactic acidosis, renal failure). Used to calculate anion gap for differential diagnosis.',
    source: 'NIH / Clinical Chemistry'
  },
  hemoglobin: {
    label: 'Hemoglobin',
    technical: 'Hb in g/dL. Oxygen-carrying protein in red blood cells.',
    clinical: 'Protein in red blood cells that carries oxygen. Low levels = anemia.',
    safeRange: '12–17 g/dL (varies by sex)',
    critical: '<7 g/dL = transfusion threshold in most ICU patients (TRICC trial)',
    why: 'ICU patients with Hb <7 g/dL benefit from restrictive transfusion strategy. Lower thresholds (8–9) for cardiac patients.',
    source: 'TRICC Trial (NEJM) / NICE Blood Transfusion'
  },
  glucose: {
    label: 'Glucose',
    technical: 'Blood glucose in mg/dL. Primary energy substrate; regulated by insulin/glucagon.',
    clinical: 'Blood sugar level. Both very high and very low levels are dangerous.',
    safeRange: '70–180 mg/dL (ICU target per NICE-SUGAR)',
    critical: '<70 = hypoglycemia (neuroglycopenia risk); >250 = hyperglycemic crisis',
    why: 'Tight glucose control (80–110) increased mortality (NICE-SUGAR trial). ICU target 140–180 mg/dL. Hypoglycemia causes seizures and brain damage.',
    source: 'NICE-SUGAR Trial (NEJM 2009)'
  },
  // ─── RENAL ───
  urine_ml: {
    label: 'Urine Output',
    technical: 'Hourly urine output in mL. Measured via indwelling urinary catheter.',
    clinical: 'How much urine the kidneys produce per hour — reflects kidney blood flow.',
    safeRange: '>0.5 mL/kg/hr',
    critical: '<0.5 mL/kg/hr for 6h = AKI Stage 1; <0.3 for 24h = Stage 3',
    why: 'Oliguria is often the earliest sign of AKI. KDIGO uses urine output criteria alongside creatinine for AKI staging.',
    source: 'KDIGO AKI Guidelines 2012'
  },
  urine_ml_per_kg: {
    label: 'Urine Output per kg',
    technical: 'Urine output normalized to body weight (mL/kg/hr). Accounts for patient size.',
    clinical: 'Urine output adjusted for body weight — more accurate measure of kidney function.',
    safeRange: '>0.5 mL/kg/hr',
    critical: '<0.5 = oliguria (AKI Stage 1); <0.3 = AKI Stage 3',
    why: 'Weight-normalized urine output is the KDIGO standard for AKI staging. More meaningful than absolute volume.',
    source: 'KDIGO AKI Guidelines 2012'
  },
  body_weight_kg: {
    label: 'Body Weight',
    technical: 'Patient weight in kilograms. Used for drug dosing, urine output normalization, and tidal volume calculation.',
    clinical: 'Patient\'s weight — used to calculate proper drug doses and ventilator settings.',
    safeRange: 'Patient-specific (BMI 18.5–24.9)',
    critical: 'Ideal body weight used for ventilator tidal volume (6–8 mL/kg IBW for lung-protective ventilation)',
    why: 'Critical for dosing vasopressors (mcg/kg/min), calculating lung-protective tidal volumes, and normalizing urine output.',
    source: 'ARDSNet Protocol / SCCM'
  },
  // ─── SOFA SCORES ───
  sofa_resp: {
    label: 'SOFA Respiratory',
    technical: 'Score 0–4 based on P/F ratio: 0(≥400), 1(300–399), 2(200–299), 3(<200+vent), 4(<100+vent).',
    clinical: 'Lung function score (0=normal, 4=severe failure). Based on how well lungs transfer oxygen.',
    safeRange: '0',
    critical: '≥3 = severe respiratory dysfunction requiring mechanical ventilation',
    why: 'Tracks respiratory organ failure severity. Score of 3–4 indicates ARDS requiring invasive ventilation.',
    source: 'Vincent et al. (Intensive Care Med 1996) / Sepsis-3'
  },
  sofa_coag: {
    label: 'SOFA Coagulation',
    technical: 'Score 0–4 based on platelet count: 0(≥150k), 1(100–149k), 2(50–99k), 3(20–49k), 4(<20k).',
    clinical: 'Blood clotting score (0=normal, 4=critical). Based on platelet count.',
    safeRange: '0',
    critical: '≥3 = severe clotting dysfunction, high bleeding risk',
    why: 'Low platelets suggest DIC, sepsis-induced coagulopathy, or HIT. Score ≥3 means spontaneous bleeding risk.',
    source: 'SOFA Score / Vincent et al.'
  },
  sofa_liver: {
    label: 'SOFA Liver',
    technical: 'Score 0–4 based on bilirubin: 0(<1.2), 1(1.2–1.9), 2(2.0–5.9), 3(6.0–11.9), 4(≥12).',
    clinical: 'Liver function score (0=normal, 4=liver failure). Based on bilirubin blood levels.',
    safeRange: '0',
    critical: '≥3 = severe hepatic dysfunction (bilirubin ≥6 mg/dL)',
    why: 'Indicates degree of hepatic failure. Rising scores suggest worsening liver injury or cholestasis.',
    source: 'SOFA Score / Vincent et al.'
  },
  sofa_renal: {
    label: 'SOFA Renal',
    technical: 'Score 0–4 based on creatinine/UO: 0(<1.2), 1(1.2–1.9), 2(2.0–3.4), 3(3.5–4.9), 4(≥5.0 or CRRT).',
    clinical: 'Kidney function score (0=normal, 4=kidney failure/dialysis). Based on creatinine and urine output.',
    safeRange: '0',
    critical: '4 = on dialysis (CRRT) or creatinine ≥5.0 mg/dL',
    why: 'Tracks renal organ failure. Score 4 automatically assigned if on CRRT. Correlates with AKI Stage 3.',
    source: 'SOFA Score / KDIGO'
  },
  sofa_cardio: {
    label: 'SOFA Cardiovascular',
    technical: 'Score 0–4: 0(MAP≥70), 1(MAP<70), 2(low-dose vasopressor), 3(NE≤0.1), 4(NE>0.1).',
    clinical: 'Heart/circulation score (0=normal, 4=on high-dose blood pressure drugs).',
    safeRange: '0',
    critical: '≥3 = requiring significant vasopressor support for hemodynamic stability',
    why: 'Reflects cardiovascular failure severity. Higher scores = higher vasopressor doses = worse prognosis.',
    source: 'SOFA Score / Surviving Sepsis Campaign'
  },
  sofa_cns: {
    label: 'SOFA CNS',
    technical: 'Score 0–4 based on GCS: 0(15), 1(13–14), 2(10–12), 3(6–9), 4(≤5).',
    clinical: 'Brain function score (0=fully awake, 4=deep coma). Based on Glasgow Coma Scale.',
    safeRange: '0',
    critical: '≥3 = GCS 6–9, severe neurological impairment',
    why: 'Tracks neurological organ failure. GCS ≤8 (SOFA 3–4) typically requires intubation for airway protection.',
    source: 'SOFA Score / GCS (Teasdale & Jennett)'
  },
  sofa_approx: {
    label: 'SOFA Total Score',
    technical: 'Sum of 6 organ subscores (Resp+Coag+Liver+Renal+Cardio+CNS). Range: 0–24.',
    clinical: 'Overall organ failure score. Higher = more organs failing = higher mortality risk.',
    safeRange: '0–2',
    critical: '≥2 increase from baseline defines sepsis (Sepsis-3); >11 = >90% mortality',
    why: 'SOFA increase ≥2 points with infection defines organ dysfunction (Sepsis-3). Serial monitoring: increasing SOFA predicts >50% mortality. Maximum SOFA is strongest mortality predictor.',
    source: 'Sepsis-3 (JAMA 2016) / Vincent et al.'
  },
  // ─── RISK INDICES ───
  shock_index: {
    label: 'Shock Index',
    technical: 'SI = HR ÷ SBP. Dimensionless ratio. More sensitive than HR or SBP alone for detecting shock.',
    clinical: 'A simple ratio of heart rate to blood pressure — detects hidden shock before BP drops.',
    safeRange: '0.5–0.7',
    critical: '>0.9 = significant risk; >1.0 = shock likely (hemorrhage, sepsis, cardiogenic)',
    why: 'SI detects "compensated shock" when SBP remains normal. SI >1.0: high sensitivity for predicting death in severe sepsis. SI ≥1.4: 20× likelihood of massive transfusion.',
    source: 'Allgöwer & Burri (1967) / NIH meta-analyses'
  },
  delta_sofa_6h: {
    label: 'ΔSOFA (6-hour)',
    technical: 'Change in SOFA score over the preceding 6 hours. Positive = worsening organ dysfunction.',
    clinical: 'How much the organ failure score has changed in the last 6 hours — shows if patient is getting worse.',
    safeRange: '≤0 (stable or improving)',
    critical: '≥2 = rapid deterioration, >50% mortality if trend continues',
    why: 'Rising SOFA is the strongest predictor of poor outcome, regardless of absolute score. An increase ≥2 mandates urgent clinical review.',
    source: 'Sepsis-3 / Ferreira et al. (JAMA 2001)'
  },
  ards_flag: {
    label: 'ARDS Flag',
    technical: 'Binary (0/1). Set when P/F <200 (or S/F <235) AND patient is on mechanical ventilation.',
    clinical: 'Warning flag: indicates the patient has Acute Respiratory Distress Syndrome.',
    safeRange: '0 (no ARDS)',
    critical: '1 = moderate-to-severe ARDS present',
    why: 'ARDS carries 30–40% mortality. Triggers lung-protective ventilation protocol (low tidal volume 6 mL/kg IBW, PEEP titration, prone positioning).',
    source: 'Berlin Definition (JAMA 2012) / ARDSNet'
  },
  aki_stage: {
    label: 'AKI Stage',
    technical: 'KDIGO AKI classification (0–3). Maximum of creatinine-based and urine-output-based staging.',
    clinical: 'Kidney injury severity (0=normal, 3=severe/dialysis needed). Based on international KDIGO criteria.',
    safeRange: '0 (no AKI)',
    critical: 'Stage 2 = serious; Stage 3 = severe, may need dialysis (CRRT)',
    why: 'Each AKI stage increase worsens mortality significantly. Stage 3 has ~40–60% ICU mortality. Early detection enables fluid optimization and nephrotoxin avoidance.',
    source: 'KDIGO AKI Guidelines 2012'
  },
  aki_stage_creat: {
    label: 'AKI Stage (Creatinine)',
    technical: 'KDIGO staging based on serum creatinine rise: 1(1.5–1.9× or +0.3), 2(2.0–2.9×), 3(≥3.0× or ≥4.0).',
    clinical: 'Kidney injury stage based on blood creatinine elevation from baseline.',
    safeRange: '0',
    critical: '≥2 = significant kidney function decline',
    why: 'Creatinine-based AKI staging detects injury later than urine output but is more specific. Rising creatinine confirms renal tubular damage.',
    source: 'KDIGO AKI Guidelines 2012'
  },
  aki_stage_uo: {
    label: 'AKI Stage (Urine Output)',
    technical: 'KDIGO staging by UO: 1(<0.5 mL/kg/h ×6h), 2(<0.5 ×12h), 3(<0.3 ×24h or anuria ×12h).',
    clinical: 'Kidney injury stage based on how much urine the kidneys produce.',
    safeRange: '0',
    critical: '≥2 = prolonged low urine output, kidneys failing',
    why: 'Urine output criteria detect AKI earlier than creatinine. Oliguria often precedes creatinine rise by 12–24 hours.',
    source: 'KDIGO AKI Guidelines 2012'
  },
  // ─── TEMPORAL ───
  hours_since_admission: {
    label: 'Hours Since ICU Admission',
    technical: 'Elapsed hours since ICU admission timestamp. Temporal feature for time-series modeling.',
    clinical: 'How long the patient has been in the ICU.',
    safeRange: 'N/A (contextual)',
    critical: 'First 24–48h are highest risk period; >168h (7 days) = prolonged ICU stay concerns',
    why: 'Early ICU hours carry highest deterioration risk. Used by ML models for time-aware predictions. Prolonged stays increase nosocomial infection risk.',
    source: 'MIMIC-IV / Clinical Practice'
  },
  hours_since_infection: {
    label: 'Hours Since Infection Onset',
    technical: 'Time elapsed since first suspected/confirmed infection. Used for sepsis timeline analysis.',
    clinical: 'How long since an infection was first suspected — critical for antibiotic timing.',
    safeRange: 'N/A (contextual)',
    critical: 'Each hour delay in antibiotics increases mortality by ~7.6% in septic shock',
    why: 'Time to antibiotics is the single strongest modifiable predictor of sepsis survival. "Hour-1 bundle" targets start within 1 hour.',
    source: 'Kumar et al. (Crit Care Med 2006) / SSC Hour-1 Bundle'
  },
  // ─── SEVERITY SCORES (STATIC) ───
  charlson_comorbidity_index: {
    label: 'Charlson Comorbidity Index',
    technical: 'Weighted score of 19 comorbid conditions. Predicts 10-year mortality. Range: 0–33.',
    clinical: 'A score summarizing all the patient\'s pre-existing health conditions and their severity.',
    safeRange: '0 (no comorbidities)',
    critical: '≥3 = significant comorbidity burden; ≥5 = high 1-year mortality risk',
    why: 'Higher CCI predicts worse outcomes regardless of acute illness. CCI ≥3.5 is a critical cutoff for ICU inpatient mortality prediction.',
    source: 'Charlson et al. (J Chronic Dis 1987)'
  },
  oasis: {
    label: 'OASIS Score',
    technical: 'Oxford Acute Severity of Illness Score. 10 variables from first 24h. Range: 0–75.',
    clinical: 'A severity score based on first-day ICU data that predicts mortality risk.',
    safeRange: '<10 (low mortality)',
    critical: '>25 = high mortality risk; >40 = very severe illness',
    why: 'OASIS uses readily available variables (unlike APACHE) making it practical for real-time scoring. Higher scores correlate strongly with ICU and hospital mortality.',
    source: 'Johnson et al. (J Med Internet Res 2013)'
  },
  oasis_prob: {
    label: 'OASIS Mortality Probability',
    technical: 'Predicted in-hospital mortality probability derived from OASIS score via logistic regression.',
    clinical: 'The estimated chance of the patient dying in hospital based on their OASIS score.',
    safeRange: '<0.05 (5%)',
    critical: '>0.20 (20%) = significant mortality risk',
    why: 'Converts the raw OASIS score into an interpretable probability. Helps communicate risk to families and guide goals-of-care discussions.',
    source: 'Johnson et al. / MIMIC-IV'
  },
  sapsii: {
    label: 'SAPS II Score',
    technical: 'Simplified Acute Physiology Score II. 12 physiology variables + age + admission type + 3 diseases. Range: 0–163.',
    clinical: 'A comprehensive illness severity score calculated from worst values in first 24 hours.',
    safeRange: '<25 (low risk)',
    critical: '>50 = predicted mortality >40%; >70 = predicted mortality >80%',
    why: 'SAPS II predicts hospital mortality using physiological derangement. Score >50.5 is a strong predictor of medical ICU mortality.',
    source: 'Le Gall et al. (JAMA 1993)'
  },
  sapsii_prob: {
    label: 'SAPS II Mortality Probability',
    technical: 'Predicted hospital mortality from SAPS II via logistic regression. Sigmoidal relationship.',
    clinical: 'The estimated chance of dying in hospital based on the SAPS II severity score.',
    safeRange: '<0.10 (10%)',
    critical: '>0.30 = high risk; >0.50 = majority of patients with this score do not survive',
    why: 'Transforms the SAPS II score into an actionable probability for clinical decision-making and benchmarking ICU performance.',
    source: 'Le Gall et al. (JAMA 1993)'
  },
  hospital_expire_flag: {
    label: 'Hospital Expiry Flag',
    technical: 'Binary (0/1). Outcome label: 1 = patient died during hospitalization.',
    clinical: 'Whether the patient survived their hospital stay (0 = survived, 1 = died).',
    safeRange: '0 (survived)',
    critical: '1 = in-hospital death',
    why: 'Primary outcome variable for mortality prediction models. Used as the target label in XGBoost training.',
    source: 'MIMIC-IV Database'
  },
  // ─── DEMOGRAPHICS (STATIC) ───
  race: {
    label: 'Race/Ethnicity',
    technical: 'Self-reported race category. Used as demographic covariate — NOT a biological variable.',
    clinical: 'Patient\'s self-reported racial/ethnic background.',
    safeRange: 'N/A',
    critical: 'N/A (demographic variable)',
    why: 'Included as a covariate to account for healthcare disparities and social determinants of health that affect outcomes. Not a biological predictor.',
    source: 'MIMIC-IV / Health Equity Literature'
  },
  gender: {
    label: 'Gender',
    technical: 'Biological sex (M/F). Affects drug metabolism, baseline creatinine, and hemoglobin normals.',
    clinical: 'Patient\'s biological sex — affects normal ranges for several lab values.',
    safeRange: 'N/A',
    critical: 'N/A (demographic variable)',
    why: 'Sex influences baseline creatinine (higher in males), hemoglobin norms, and certain drug pharmacokinetics.',
    source: 'Clinical Practice Standards'
  },
  anchor_age: {
    label: 'Age',
    technical: 'Patient age in years at ICU admission. Strong independent predictor of ICU mortality.',
    clinical: 'Patient\'s age at time of ICU admission.',
    safeRange: 'N/A',
    critical: '>65 years = increased perioperative and ICU mortality risk',
    why: 'Age is an independent predictor of ICU mortality. Physiological reserve decreases with age, affecting recovery from critical illness.',
    source: 'APACHE / SAPS II Scoring Systems'
  },
  first_careunit: {
    label: 'First Care Unit',
    technical: 'Initial ICU type: MICU, SICU, CCU, CVICU, TSICU, or Neuro ICU.',
    clinical: 'Which specialized ICU the patient was first admitted to.',
    safeRange: 'N/A',
    critical: 'N/A (contextual)',
    why: 'ICU type reflects case-mix and baseline acuity. MICU patients tend to have higher mortality than elective SICU admissions.',
    source: 'MIMIC-IV / ICU Organization Literature'
  },
  admission_type: {
    label: 'Admission Type',
    technical: 'How the patient entered: emergency, urgent, elective, or surgical same-day.',
    clinical: 'Whether the patient was admitted as an emergency, planned surgery, or urgent case.',
    safeRange: 'N/A',
    critical: 'Emergency admissions carry higher mortality than elective',
    why: 'Emergency admits have higher acuity and less physiological optimization. SAPS II weights emergency admission type in its scoring.',
    source: 'SAPS II / MIMIC-IV'
  },
  // ─── 12H ROLLING WINDOW ───
  hr_mean_12h: { label: 'HR Mean (12h)', technical: 'Rolling 12-hour mean of heart rate.', clinical: 'Average heart rate over the last 12 hours — shows sustained trends.', safeRange: '60–100 bpm', critical: 'Persistent >100 = sustained tachycardia', why: 'Smooths out transient spikes. Sustained tachycardia is more clinically significant than isolated readings.', source: 'Time-series ICU Analysis' },
  hr_std_12h: { label: 'HR Variability (12h)', technical: 'Standard deviation of HR over 12h window. Reflects heart rate variability.', clinical: 'How much the heart rate fluctuates — low variability can signal failing regulatory systems.', safeRange: '5–15 bpm', critical: '<3 = loss of variability (poor prognosis); >25 = instability', why: 'Reduced heart rate variability independently predicts mortality in sepsis and critical illness.', source: 'Moorman et al. / HRV Literature' },
  map_min_12h: { label: 'MAP Minimum (12h)', technical: 'Lowest MAP recorded in 12h window.', clinical: 'The lowest blood pressure recorded in the last 12 hours.', safeRange: '>65 mmHg', critical: '<55 = organ damage likely even if brief', why: 'Even transient hypotension episodes (MAP <55) are associated with AKI and myocardial injury.', source: 'Walsh et al. (Anesthesiology 2013)' },
  map_mean_12h: { label: 'MAP Average (12h)', technical: 'Rolling 12h mean arterial pressure.', clinical: 'Average blood pressure over 12 hours.', safeRange: '70–100 mmHg', critical: '<65 = sustained hypoperfusion', why: 'Better reflects overall perfusion than single readings.', source: 'ICU Best Practices' },
  lactate_max_12h: { label: 'Lactate Peak (12h)', technical: 'Maximum lactate in 12h window.', clinical: 'Highest lactate recorded in 12 hours — indicates worst tissue oxygenation.', safeRange: '<2.0 mmol/L', critical: '>4.0 = severe tissue hypoxia occurred', why: 'Peak lactate is a stronger mortality predictor than initial lactate.', source: 'Nguyen et al. (Crit Care Med)' },
  creatinine_max_12h: { label: 'Creatinine Peak (12h)', technical: 'Maximum creatinine in 12h window.', clinical: 'Highest creatinine in 12 hours — shows worst kidney function.', safeRange: '<1.2 mg/dL', critical: '>2.0 = significant renal impairment', why: 'Peak creatinine better captures AKI severity than single measurements.', source: 'KDIGO' },
  platelets_min_12h: { label: 'Platelets Nadir (12h)', technical: 'Lowest platelet count in 12h window.', clinical: 'Lowest platelet count in 12 hours — shows worst bleeding risk.', safeRange: '>150 ×10³/µL', critical: '<50 = high bleeding risk', why: 'Platelet nadir reflects peak coagulopathy severity.', source: 'SOFA / DIC Guidelines' },
  bilirubin_max_12h: { label: 'Bilirubin Peak (12h)', technical: 'Maximum total bilirubin in 12h window.', clinical: 'Highest bilirubin in 12 hours — shows worst liver function.', safeRange: '<1.2 mg/dL', critical: '>2.0 = liver dysfunction', why: 'Peak bilirubin better captures hepatic dysfunction trajectory.', source: 'SOFA Score' },
  urine_sum_12h: { label: 'Total Urine (12h)', technical: 'Cumulative urine output over 12h window in mL.', clinical: 'Total urine produced in 12 hours — overall kidney output.', safeRange: '>500 mL/12h', critical: '<200 mL/12h = severe oliguria', why: 'Cumulative urine output is used for KDIGO AKI staging time-criteria.', source: 'KDIGO AKI Guidelines' },
  urine_per_kg_sum_12h: { label: 'Urine/kg Total (12h)', technical: 'Cumulative weight-normalized urine output over 12h.', clinical: 'Weight-adjusted total urine in 12 hours.', safeRange: '>6 mL/kg/12h', critical: '<3.6 mL/kg/12h = AKI criteria', why: 'Weight-normalized cumulative output is the KDIGO standard.', source: 'KDIGO AKI Guidelines' },
  vasopressor_any_12h: { label: 'Any Vasopressor (12h)', technical: 'Binary: was any vasopressor used in the 12h window?', clinical: 'Whether blood pressure drugs were needed at any point in the last 12 hours.', safeRange: '0', critical: '1 = hemodynamic instability present in window', why: 'Any vasopressor use in 12h indicates cardiovascular instability even if currently off.', source: 'ICU Best Practices' },
  ne_dose_mean_12h: { label: 'Mean NE Dose (12h)', technical: 'Average norepinephrine equivalent dose over 12h.', clinical: 'Average blood pressure drug dose over 12 hours.', safeRange: '0 mcg/kg/min', critical: '>0.1 = significant sustained vasopressor requirement', why: 'Sustained vasopressor requirements predict worse outcomes than brief use.', source: 'Surviving Sepsis Campaign' },
  vent_any_12h: { label: 'Any Ventilation (12h)', technical: 'Binary: was mechanical ventilation used in the 12h window?', clinical: 'Whether the breathing machine was used at any point in 12 hours.', safeRange: '0', critical: '1 = respiratory support needed', why: 'Captures ventilator dependence even if briefly liberated.', source: 'ARDSNet' },
  sofa_max_12h: { label: 'Peak SOFA (12h)', technical: 'Maximum total SOFA score in 12h window.', clinical: 'Worst organ failure score in the last 12 hours.', safeRange: '<4', critical: '>8 = severe multi-organ dysfunction occurred', why: 'Maximum SOFA is the strongest predictor of ICU mortality (Vincent et al.).', source: 'SOFA Score' },
  delta_sofa_mean_12h: { label: 'Mean ΔSOFA (12h)', technical: 'Average of 6-hourly SOFA changes over 12h.', clinical: 'Average rate of organ deterioration over 12 hours.', safeRange: '≤0 (stable/improving)', critical: '>1 = sustained worsening trajectory', why: 'Sustained positive ΔSOFA is more ominous than a single spike.', source: 'Ferreira et al. (JAMA)' },
  aki_stage_max_12h: { label: 'Worst AKI (12h)', technical: 'Maximum AKI stage reached in 12h window.', clinical: 'Worst kidney injury stage in the last 12 hours.', safeRange: '0', critical: '≥2 = significant renal injury occurred', why: 'Peak AKI stage captures transient episodes that may resolve but indicate ongoing risk.', source: 'KDIGO' },
  pf_ratio_min_12h: { label: 'Worst P/F Ratio (12h)', technical: 'Minimum P/F ratio in 12h window.', clinical: 'Worst lung function ratio in 12 hours.', safeRange: '>300', critical: '<200 = moderate ARDS threshold met', why: 'Nadir P/F captures worst oxygenation episode, even if it subsequently improved.', source: 'Berlin Definition' },
  sf_ratio_min_12h: { label: 'Worst S/F Ratio (12h)', technical: 'Minimum S/F ratio in 12h window.', clinical: 'Worst non-invasive lung function estimate in 12 hours.', safeRange: '>315', critical: '<235 = concerning for ARDS', why: 'Non-invasive surrogate for P/F ratio nadir.', source: 'Rice et al. (Chest)' },
  shock_index_max_12h: { label: 'Peak Shock Index (12h)', technical: 'Maximum shock index recorded in 12h window.', clinical: 'Worst hemodynamic instability ratio in 12 hours.', safeRange: '<0.7', critical: '>1.0 = shock episode occurred', why: 'Peak SI captures worst hemodynamic state even if currently stable.', source: 'Shock Index Literature' },
  observed_hours_in_window: { label: 'Observed Hours in Window', technical: 'Number of hours with data points in the 12h rolling window. Data completeness metric.', clinical: 'How many hours of data are available in the 12-hour window.', safeRange: '12 (full window)', critical: '<6 = partial data, features may be unreliable', why: 'Data completeness affects rolling feature reliability. Models trained on MIMIC-IV expect ~12h of continuous data.', source: 'MIMIC-IV Documentation' },
};
