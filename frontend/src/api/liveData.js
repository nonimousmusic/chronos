// This file is currently unused — kept for reference.
// If re-enabling, ensure `papaparse` is added to package.json dependencies first.

let masterDataCache = null;

// The structure of chronos_sentinel_timeseries_master.csv:
// 1 subject_id, 2 hadm_id, 3 stay_id, 4 time_hour
// 48 Dextrose 5%, 52 Digoxin, 55 Dobutamine, 131 NaCl, etc.
// See dataset preparation folder for column details.
