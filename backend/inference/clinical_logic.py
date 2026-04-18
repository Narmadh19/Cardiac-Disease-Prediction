def generate_report(ecg_class, pcg_score=None):

    class_map = {
        0: "Normal Cardiac Activity",
        1: "Arrhythmia",
        2: "Atrial Fibrillation (Suspected)",
        3: "Myocardial Infarction (Suspected)",
        4: "Other Abnormality"
    }

    # Condition
    condition = class_map.get(ecg_class, "Unknown")

    # 🔥 Clinical reasoning (IMPORTANT)
    clinical_patterns = {
        0: {
            "summary": "Normal sinus rhythm detected",
            "indicators": [
                "Regular heartbeat pattern",
                "Stable waveform morphology",
                "No abnormal spikes or irregularities"
            ],
            "risk": "Low"
        },
        1: {
            "summary": "Irregular rhythm detected (Arrhythmia)",
            "indicators": [
                "Irregular R-R intervals",
                "Inconsistent waveform spacing",
                "Possible abnormal electrical conduction"
            ],
            "risk": "Medium"
        },
        2: {
            "summary": "Possible Atrial Fibrillation",
            "indicators": [
                "Absence of clear P waves",
                "Irregular baseline fluctuations",
                "Highly variable heart rhythm"
            ],
            "risk": "Medium"
        },
        3: {
            "summary": "Signs suggest Myocardial Infarction",
            "indicators": [
                "Abnormal ST segment changes",
                "Distorted QRS complex",
                "Possible ischemic patterns detected"
            ],
            "risk": "High"
        },
        4: {
            "summary": "Other abnormal ECG pattern detected",
            "indicators": [
                "Unusual waveform morphology",
                "Non-standard cardiac signal pattern"
            ],
            "risk": "High"
        }
    }

    info = clinical_patterns.get(ecg_class, {
        "summary": "Unknown ECG pattern",
        "indicators": ["No clear pattern detected"],
        "risk": "Unknown"
    })

    # PCG handling
    pcg_finding = "Not available" if pcg_score is None else "PCG analyzed"

    return {
        "signal_findings": {
            "ecg_finding": "Processed",
            "pcg_finding": pcg_finding
        },
        "disease_detection": {
            "suspected_condition": condition,
            "risk_level": info["risk"],
            "affected_region": "Unknown",
            "pattern_match_percentage": "Based on trained CNN model"
        },
        "clinical_explanation": {
            "summary": info["summary"],
            "key_clinical_indicators": info["indicators"]
        }
    }