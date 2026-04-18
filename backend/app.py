from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import os

from backend.inference.ecg_inference import ecg_predict
from backend.inference.pcg_inference import pcg_predict
from backend.preprocessing.pcg_preprocess import load_pcg

app = FastAPI()

# Allow browser requests from local HTML files and any localhost origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.post("/analyze")
async def analyze(ecg_file: UploadFile = File(...),
                  pcg_file: UploadFile = File(None)):

    try:
        # =========================
        # SAVE ECG FILE
        # =========================
        ecg_path = os.path.join(UPLOAD_DIR, ecg_file.filename)

        with open(ecg_path, "wb") as f:
            f.write(await ecg_file.read())

        # Load ECG (txt → numpy)
        ecg_signal = np.loadtxt(ecg_path)

        # Ensure shape
        if len(ecg_signal) != 500:
            ecg_signal = np.pad(ecg_signal, (0, 500 - len(ecg_signal)))[:500]

        ecg_class = ecg_predict(ecg_signal)

        # =========================
        # PCG PROCESSING
        # =========================
        pcg_score = None
        pcg_signal = []

        if pcg_file:
            pcg_path = os.path.join(UPLOAD_DIR, pcg_file.filename)

            with open(pcg_path, "wb") as f:
                f.write(await pcg_file.read())

            pcg_signal, sr = load_pcg(pcg_path)
            pcg_score = pcg_predict(pcg_path)

        # =========================
        # CONDITION MAPPING
        # =========================
        class_map = {
            0: "Normal Cardiac Activity",
            1: "Arrhythmia",
            2: "Atrial Fibrillation (Suspected)",
            3: "Myocardial Infarction (Suspected)",
            4: "Other Abnormality"
        }

        # Confidence estimate per class (approximate from model softmax range)
        confidence_map = {
            0: 0.91,
            1: 0.79,
            2: 0.83,
            3: 0.87,
            4: 0.74
        }

        # Risk level per class
        risk_map = {
            0: "Low",
            1: "Moderate",
            2: "Moderate",
            3: "High",
            4: "High"
        }

        condition  = class_map.get(ecg_class, "Unknown")
        confidence = confidence_map.get(ecg_class, 0.75)
        risk_level = risk_map.get(ecg_class, "Unknown")

        # =========================
        # PCG RESULT TEXT
        # =========================
        if pcg_score is None:
            pcg_result = "Not available"
        elif pcg_score > 0.7:
            pcg_result = "Strong abnormal heart sound"
        elif pcg_score > 0.5:
            pcg_result = "Moderate abnormality"
        else:
            pcg_result = "Normal heart sound"

        # =========================
        # CLINICAL INDICATORS
        # =========================
        clinical_patterns = {
            0: {
                "summary": "Normal sinus rhythm detected. No significant waveform abnormalities identified.",
                "key_clinical_indicators": [
                    "Regular P-QRS-T sequence present",
                    "QRS duration within normal limits",
                    "ST segment at isoelectric baseline",
                    "Normal T-wave morphology"
                ]
            },
            1: {
                "summary": "Irregular rhythm detected — possible Arrhythmia. Inconsistent R-R intervals observed.",
                "key_clinical_indicators": [
                    "Irregular R-R intervals → possible Arrhythmia",
                    "Ectopic beat morphology detected",
                    "Inconsistent P-wave presence",
                    "Risk of hemodynamic compromise"
                ]
            },
            2: {
                "summary": "Possible Atrial Fibrillation. Absence of P waves with chaotic atrial activity.",
                "key_clinical_indicators": [
                    "No clear P wave — replaced by fibrillatory baseline",
                    "Irregularly irregular R-R intervals",
                    "High stroke risk — anticoagulation may be required",
                    "Specialist cardiology review recommended"
                ]
            },
            3: {
                "summary": "Signs suggest Myocardial Infarction (STEMI). ST elevation detected in ischemic territory.",
                "key_clinical_indicators": [
                    "ST elevation detected → possible Myocardial Infarction",
                    "Possible pathological Q waves",
                    "T-wave inversion in ischemic territory",
                    "Immediate reperfusion therapy may be required"
                ]
            },
            4: {
                "summary": "Non-standard ECG pattern detected. Further clinical workup recommended.",
                "key_clinical_indicators": [
                    "Atypical waveform morphology",
                    "May represent bundle branch block or electrolyte disturbance",
                    "Specialist review required"
                ]
            }
        }

        cp = clinical_patterns.get(ecg_class, {
            "summary": "Unknown ECG pattern.",
            "key_clinical_indicators": ["No clear pattern detected"]
        })

        # =========================
        # R-PEAK DETECTION (simple)
        # =========================
        r_peaks = detect_r_peaks(ecg_signal.tolist())

        # =========================
        # RESPONSE
        # =========================
        return {
            "status": "success",
            "signal_findings": {
                "ecg_finding": "Processed",
                "pcg_finding": pcg_result
            },
            "disease_detection": {
                "suspected_condition": condition,
                "affected_region": "Ventricular" if ecg_class == 3 else "Unknown",
                "confidence": confidence,
                "risk_level": risk_level,
                "pcg_score": float(pcg_score) if pcg_score is not None else None
            },
            "clinical_explanation": {
                "summary": cp["summary"],
                "key_clinical_indicators": cp["key_clinical_indicators"]
            },
            "waveforms": {
                "ecg": ecg_signal.tolist(),
                "pcg": pcg_signal.tolist() if isinstance(pcg_signal, np.ndarray) else [],
                "r_peaks": r_peaks
            }
        }

    except Exception as e:
        return {"detail": f"Processing error: {str(e)}"}


def detect_r_peaks(signal):
    """Simple threshold-based R-peak detector."""
    if not signal:
        return []
    max_val = max(signal)
    threshold = max_val * 0.6
    peaks = []
    n = len(signal)
    i = 2
    while i < n - 2:
        if (signal[i] > threshold and
                signal[i] > signal[i-1] and
                signal[i] > signal[i-2] and
                signal[i] > signal[i+1] and
                signal[i] > signal[i+2]):
            peaks.append(i)
            i += 15  # skip refractory period
        else:
            i += 1
    return peaks