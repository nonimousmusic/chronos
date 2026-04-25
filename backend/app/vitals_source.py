"""MIMIC-IV vitals replay source.

Reads extracted_vitals.json and replays patient timeseries at 1 FPS.
"""

import json
import os

from .config import VITALS_FILE


class VitalsSource:
    """Replays real MIMIC-IV vitals data in a loop."""

    def __init__(self, file_path: str | None = None, patient_id: str | None = None):
        path = file_path or VITALS_FILE
        path = os.path.abspath(path)

        if not os.path.exists(path):
            print(f"[VITALS] File not found: {path}, using synthetic vitals")
            self.data = []
        else:
            with open(path, "r") as f:
                raw = json.load(f)

            # Pick a patient: use specified ID, or first available
            if patient_id and patient_id in raw:
                self.data = raw[patient_id]
            else:
                # Pick first patient with substantial data
                for pid, readings in raw.items():
                    if len(readings) > 20:
                        self.data = readings
                        patient_id = pid
                        break
                else:
                    self.data = list(raw.values())[0] if raw else []

            print(f"[VITALS] Loaded {len(self.data)} readings for patient {patient_id}")

        self.idx = 0

    def next(self, seq: int | None = None) -> dict:
        """Return next vitals reading.
        
        If seq is provided, returns that specific index (modulo length).
        Otherwise, returns next in internal sequence.
        """
        if not self.data:
            # Synthetic fallback
            import random
            return {
                "bp_dia": random.randint(70, 90),
                "bp_sys": random.randint(110, 130),
                "hr": random.randint(60, 110),
                "spo2": random.randint(95, 100),
            }

        idx = seq if seq is not None else self.idx
        reading = self.data[idx % len(self.data)]
        
        if seq is None:
            self.idx += 1

        # Map MIMIC-IV extracted_vitals fields → canonical names
        return {
            "bp_dia": int(reading.get("map", 80) * 0.67),  # approximate diastolic from MAP
            "bp_sys": int(reading.get("map", 120) * 1.33) if "map" in reading else 120,
            "hr": int(reading.get("heart_rate", 80)),
            "spo2": int(reading.get("spo2", 98)),
        }
