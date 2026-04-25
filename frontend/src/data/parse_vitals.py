import csv
import json
from collections import defaultdict

# Target vital item IDs based on D_ITEMS.csv lookup
VITAL_MAPPING = {
    '220045': 'heart_rate',
    '220277': 'spo2',
    '220052': 'map',
    '220181': 'map',         # Non invasive MAP
    '220210': 'respiratory_rate',
    '225668': 'lactate'
}

patient_vitals = defaultdict(lambda: defaultdict(dict))

try:
    with open('dataset preparation/chartevents.csv', 'r') as f:
        reader = csv.reader(f)
        header = next(reader)
        idx_subj = header.index('subject_id')
        idx_time = header.index('charttime')
        idx_item = header.index('itemid')
        idx_val = header.index('valuenum')
        
        for row in reader:
            if len(row) > idx_val:
                subj = row[idx_subj]
                item = row[idx_item]
                val = row[idx_val]
                time = row[idx_time]
                
                if item in VITAL_MAPPING and val:
                    try:
                        patient_vitals[subj][time][VITAL_MAPPING[item]] = float(val)
                    except ValueError:
                        pass
                        
except Exception as e:
    print(f"Error reading CSV: {e}")

# We need full records (ideally a timepoint that has HR, MAP, SpO2, RR, to provide a consistent stream to the UI)
assigned_vitals = {}
real_subjects_with_data = list(patient_vitals.keys())

mock_ids = ['P-1042', 'P-2718', 'P-3141', 'P-1618', 'P-2236', 'P-5050', 'P-7777', 'P-4242', 'P-9090', 'P-6180']

for i, mock_id in enumerate(mock_ids):
    if i < len(real_subjects_with_data):
        real_subj = real_subjects_with_data[i]
        timeseries_dict = patient_vitals[real_subj]
        
        timeseries_array = []
        # Sort chronologically
        for ts, vitals in sorted(timeseries_dict.items()):
            # Only include if there is at least a heart rate or map
            if 'heart_rate' in vitals or 'map' in vitals or 'spo2' in vitals:
                vitals['timestamp'] = ts
                timeseries_array.append(vitals)
            
        assigned_vitals[mock_id] = timeseries_array

with open('frontend/src/data/realPatientVitals.json', 'w') as f:
    json.dump(assigned_vitals, f)
