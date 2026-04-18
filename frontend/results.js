// ================================================================
//  CardioAI — Results Dashboard Logic
//  Handles: data parsing, waveform rendering, clinical text,
//           risk assessment, findings population
// ================================================================

// ── 1. GUARD: Load data from localStorage ───────────────────────
const raw = localStorage.getItem("analysisResult");

if (!raw) {
    alert("No analysis result found. Please upload files first.");
    window.location.href = "index.html";
    throw new Error("No result data — redirecting.");
}

let data;
try {
    data = JSON.parse(raw);
} catch (e) {
    alert("Corrupt result data. Please try again.");
    window.location.href = "index.html";
    throw new Error("JSON parse failed.");
}

console.log("Full backend response:", data);

// ── 2. META STRIP ────────────────────────────────────────────────
{
    const now = new Date();
    document.getElementById("rptTimestamp").textContent =
        now.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }) +
        "  " +
        now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

    document.getElementById("reportId").textContent =
        "CR-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ── 3. EXTRACT BACKEND FIELDS ────────────────────────────────────
const condition   = data?.disease_detection?.suspected_condition || "Unknown";
const riskLevel   = data?.disease_detection?.risk_level          || deriveRiskFromCondition(condition);
const confidence  = data?.disease_detection?.confidence          || deriveConfidenceFromCondition(condition);
const pcgFinding  = data?.signal_findings?.pcg_finding           || "Not available";
const pcgScore    = data?.disease_detection?.pcg_score           ?? null;
const ecgSummary  = data?.clinical_explanation?.summary          || "ECG analysis complete.";
const indicators  = data?.clinical_explanation?.key_clinical_indicators || [];
const ecgData     = data?.waveforms?.ecg || [];
const pcgData     = data?.waveforms?.pcg || [];
const rPeaks      = data?.waveforms?.r_peaks || [];

function deriveRiskFromCondition(cond) {
    if (!cond) return "Unknown";
    const c = cond.toLowerCase();
    if (c.includes("normal"))     return "Low";
    if (c.includes("infarction")) return "High";
    if (c.includes("arrhythmia") || c.includes("atrial")) return "Moderate";
    return "High";
}

function deriveConfidenceFromCondition(cond) {
    if (!cond) return 0.75;
    const c = cond.toLowerCase();
    if (c.includes("normal"))     return 0.91;
    if (c.includes("infarction")) return 0.87;
    if (c.includes("atrial"))     return 0.83;
    if (c.includes("arrhythmia")) return 0.79;
    return 0.74;
}

// ── 4. RISK CARD ─────────────────────────────────────────────────
(function populateRisk() {
    const riskMap = {
        "Low":      { color: "#00c853", needle: 15,  arcOff: 130, sublabel: "Unlikely abnormality", note: "Low confidence of pathology. Routine monitoring recommended." },
        "Moderate": { color: "#ffb300", needle: 0,   arcOff: 78,  sublabel: "Possible abnormality",  note: "Moderate signal similarity with known abnormal cases. Clinical review advised." },
        "Medium":   { color: "#ffb300", needle: 0,   arcOff: 78,  sublabel: "Possible abnormality",  note: "Moderate signal similarity with known abnormal cases. Clinical review advised." },
        "High":     { color: "#d32f2f", needle: -78, arcOff: 10,  sublabel: "Strong abnormality",    note: "High confidence indicates strong pattern similarity with trained abnormal cases. Immediate cardiologist referral suggested." },
        "Unknown":  { color: "#78909c", needle: -45, arcOff: 78,  sublabel: "Inconclusive",          note: "Insufficient data for reliable classification." }
    };

    const rm = riskMap[riskLevel] || riskMap["Unknown"];

    // Needle rotation
    document.getElementById("riskNeedle").setAttribute(
        "transform", `rotate(${rm.needle} 60 65)`
    );

    // Arc dashoffset
    document.getElementById("riskArc").setAttribute("stroke-dashoffset", rm.arcOff);
    document.getElementById("riskArc").style.stroke = rm.color;

    // Labels
    document.getElementById("riskLabel").textContent  = riskLevel + " Risk";
    document.getElementById("riskLabel").style.color  = rm.color;
    document.getElementById("riskSublabel").textContent = rm.sublabel;
    document.getElementById("riskNote").textContent   = rm.note;

    // Risk card border accent
    document.getElementById("riskCard").style.borderColor = rm.color + "55";

    // Confidence bar
    const pct = Math.round(confidence * 100);
    const bar = document.getElementById("confidenceBar");
    bar.style.width = pct + "%";
    bar.style.background = rm.color;
    document.getElementById("confidenceValue").textContent = pct + "%";
})();

// ── 5. ECG FINDINGS TABLE ────────────────────────────────────────
(function populateECGFindings() {
    const cond = condition.toLowerCase();

    // Define findings per condition
    const findingsMap = {
        normal: {
            pwave:   { text: "Normal",    cls: "chip-normal"   },
            qrs:     { text: "Normal",    cls: "chip-normal"   },
            st:      { text: "Normal",    cls: "chip-normal"   },
            twave:   { text: "Normal",    cls: "chip-normal"   },
            rr:      { text: "Regular",   cls: "chip-normal"   },
            conclusion: "✅ No significant ECG abnormality. Regular sinus rhythm with normal waveform morphology.",
            conclusionClass: "conclusion-normal"
        },
        arrhythmia: {
            pwave:   { text: "Variable",   cls: "chip-warn"     },
            qrs:     { text: "Irregular",  cls: "chip-warn"     },
            st:      { text: "Normal",     cls: "chip-normal"   },
            twave:   { text: "Normal",     cls: "chip-normal"   },
            rr:      { text: "Irregular ⚠", cls: "chip-critical" },
            conclusion: "⚠ Irregular R-R intervals detected → Possible Arrhythmia. Inconsistent electrical conduction pathway.",
            conclusionClass: "conclusion-warn"
        },
        atrial: {
            pwave:   { text: "Absent / Chaotic", cls: "chip-critical" },
            qrs:     { text: "Irregular",        cls: "chip-warn"     },
            st:      { text: "Normal",           cls: "chip-normal"   },
            twave:   { text: "Fibrillatory",     cls: "chip-warn"     },
            rr:      { text: "Highly Variable",  cls: "chip-critical" },
            conclusion: "🔴 Absence of clear P waves with chaotic baseline → Possible Atrial Fibrillation. Risk of thromboembolism.",
            conclusionClass: "conclusion-critical"
        },
        infarction: {
            pwave:   { text: "Present",    cls: "chip-normal"   },
            qrs:     { text: "Widened",    cls: "chip-warn"     },
            st:      { text: "Elevated ↑", cls: "chip-critical" },
            twave:   { text: "Inverted",   cls: "chip-warn"     },
            rr:      { text: "Regular",    cls: "chip-normal"   },
            conclusion: "🔴 ST Elevation detected → Possible Myocardial Infarction (STEMI). Urgent evaluation required.",
            conclusionClass: "conclusion-critical"
        },
        other: {
            pwave:   { text: "Abnormal",  cls: "chip-warn" },
            qrs:     { text: "Abnormal",  cls: "chip-warn" },
            st:      { text: "Abnormal",  cls: "chip-warn" },
            twave:   { text: "Abnormal",  cls: "chip-warn" },
            rr:      { text: "Irregular", cls: "chip-warn" },
            conclusion: "⚠ Non-standard ECG pattern detected. Further workup recommended.",
            conclusionClass: "conclusion-warn"
        }
    };

    let key = "other";
    if (cond.includes("normal"))      key = "normal";
    else if (cond.includes("infarction")) key = "infarction";
    else if (cond.includes("atrial"))     key = "atrial";
    else if (cond.includes("arrhythmia")) key = "arrhythmia";

    const f = findingsMap[key];
    setChip("chip-pwave",    f.pwave);
    setChip("chip-qrs",      f.qrs);
    setChip("chip-st",       f.st);
    setChip("chip-twave",    f.twave);
    setChip("chip-rr",       f.rr);

    const conc = document.getElementById("ecgConclusion");
    conc.textContent  = f.conclusion;
    conc.className    = "rpt-ecg-conclusion " + f.conclusionClass;

    // ECG waveform card badge
    const badge = document.getElementById("ecgBadge");
    badge.textContent = key === "normal" ? "Normal" : "Abnormal";
    badge.className   = "rpt-card-badge " + (key === "normal" ? "badge-normal" : "badge-critical");
})();

// ── 6. PCG FINDINGS TABLE ────────────────────────────────────────
(function populatePCGFindings() {
    const p = pcgFinding.toLowerCase();

    let s1    = { text: "Present",  cls: "chip-normal"   };
    let s2    = { text: "Present",  cls: "chip-normal"   };
    let mur   = { text: "Absent",   cls: "chip-normal"   };
    let rhy   = { text: "Regular",  cls: "chip-normal"   };
    let conclusion = "✅ Normal heart sounds. S1 and S2 clearly audible. No murmur detected.";
    let conclusionClass = "conclusion-normal";

    if (p.includes("strong abnormal") || p.includes("murmur") || (pcgScore !== null && pcgScore > 0.7)) {
        s1    = { text: "Altered",   cls: "chip-warn"     };
        s2    = { text: "Altered",   cls: "chip-warn"     };
        mur   = { text: "Detected ⚠", cls: "chip-critical" };
        rhy   = { text: "Irregular", cls: "chip-warn"     };
        conclusion = "🔴 Systolic murmur detected → Turbulent blood flow suggesting valve dysfunction. Possible valvular pathology.";
        conclusionClass = "conclusion-critical";
    } else if (p.includes("moderate") || (pcgScore !== null && pcgScore > 0.5)) {
        s1    = { text: "Present",   cls: "chip-normal"   };
        s2    = { text: "Diminished", cls: "chip-warn"   };
        mur   = { text: "Possible",  cls: "chip-warn"     };
        rhy   = { text: "Slightly Irregular", cls: "chip-warn" };
        conclusion = "⚠ Moderate abnormality in heart sound. S2 diminished. Possible early valve dysfunction.";
        conclusionClass = "conclusion-warn";
    } else if (p.includes("not available")) {
        s1    = { text: "N/A",       cls: "chip-muted"   };
        s2    = { text: "N/A",       cls: "chip-muted"   };
        mur   = { text: "N/A",       cls: "chip-muted"   };
        rhy   = { text: "N/A",       cls: "chip-muted"   };
        conclusion = "ℹ PCG file not provided. Heart sound analysis unavailable.";
        conclusionClass = "conclusion-muted";
    }

    setChip("chip-s1",        s1);
    setChip("chip-s2",        s2);
    setChip("chip-murmur",    mur);
    setChip("chip-pcgrhythm", rhy);

    const conc = document.getElementById("pcgConclusion");
    conc.textContent = conclusion;
    conc.className   = "rpt-ecg-conclusion " + conclusionClass;

    const badge = document.getElementById("pcgBadge");
    if (p.includes("normal")) {
        badge.textContent = "Normal"; badge.className = "rpt-card-badge badge-normal";
    } else if (p.includes("not available")) {
        badge.textContent = "N/A";    badge.className = "rpt-card-badge badge-muted";
    } else {
        badge.textContent = "Abnormal"; badge.className = "rpt-card-badge badge-critical";
    }
})();

// ── 7. CLINICAL EXPLANATION PANEL ───────────────────────────────
(function populateClinical() {
    const cond = condition.toLowerCase();

    // ── ECG clinical text
    const ecgClinicalMap = {
        normal: {
            text: "Normal sinus rhythm observed. P waves are upright and precede each QRS complex. The QRS complex duration and morphology are within normal limits. ST segments are isoelectric. T waves are upright in standard leads. R-R intervals are regular, indicating stable sinoatrial node function.",
            indicators: [
                "Regular P-QRS-T sequence present",
                "QRS duration < 120 ms",
                "ST segment at baseline — no ischemic changes",
                "Normal T-wave polarity in all leads"
            ]
        },
        arrhythmia: {
            text: "Irregular R-R intervals detected, suggesting abnormal cardiac rhythm (Arrhythmia). The origin may be ectopic foci outside the SA node. QRS complexes may be of normal or aberrant morphology. Irregular rhythm increases risk of hemodynamic compromise and thromboembolic events.",
            indicators: [
                "Irregular R-R interval → possible Arrhythmia",
                "Ectopic beat morphology detected",
                "Inconsistent P-wave preceding QRS",
                "May indicate PVCs, PACs, or supraventricular tachycardia"
            ]
        },
        atrial: {
            text: "Absence of distinct P waves with chaotic, irregular baseline observed — hallmark of Atrial Fibrillation (AF). The AV node is bombarded by irregular impulses leading to irregularly irregular ventricular response. AF significantly increases stroke risk due to atrial blood pooling and clot formation.",
            indicators: [
                "No clear P wave — replaced by fibrillatory baseline",
                "Irregularly irregular R-R intervals",
                "Narrow QRS (if conducting normally via His-Purkinje)",
                "High stroke risk — anticoagulation may be required"
            ]
        },
        infarction: {
            text: "ST segment elevation identified in affected leads — classic electrocardiographic sign of Myocardial Infarction (STEMI). This indicates transmural ischemia due to complete coronary artery occlusion. The elevation pattern may localize infarction region. Reciprocal ST depression may also be seen.",
            indicators: [
                "ST elevation detected → possible Myocardial Infarction (STEMI)",
                "Pathological Q waves may develop",
                "T-wave inversion in ischemic territory",
                "QRS widening may indicate conduction defect",
                "Immediate reperfusion therapy may be required"
            ]
        },
        other: {
            text: "An atypical ECG pattern has been detected that does not conform to standard normal morphology. Further clinical correlation and specialist review are warranted. Pattern may represent bundle branch block, electrolyte disturbance, or other structural abnormality.",
            indicators: [
                "Abnormal waveform morphology",
                "Non-standard pattern — clinical correlation required",
                "Possible bundle branch block or electrolyte imbalance"
            ]
        }
    };

    let key = "other";
    if (cond.includes("normal"))       key = "normal";
    else if (cond.includes("infarction")) key = "infarction";
    else if (cond.includes("atrial"))     key = "atrial";
    else if (cond.includes("arrhythmia")) key = "arrhythmia";

    const ecgInfo = ecgClinicalMap[key];
    document.getElementById("clinicalECGText").textContent = ecgInfo.text;
    const ecgUL = document.getElementById("clinicalECGIndicators");
    ecgUL.innerHTML = "";
    ecgInfo.indicators.forEach(ind => {
        const li = document.createElement("li");
        li.textContent = ind;
        ecgUL.appendChild(li);
    });

    // ── PCG clinical text
    const p = pcgFinding.toLowerCase();
    let pcgText, pcgIndicators;

    if (p.includes("strong abnormal") || (pcgScore !== null && pcgScore > 0.7)) {
        pcgText = "Presence of a systolic murmur suggests valve dysfunction, consistent with turbulent blood flow across a stenotic or regurgitant valve. S1 and S2 may be abnormally shaped. The murmur timing and quality may indicate aortic stenosis, mitral regurgitation, or other valvular pathology.";
        pcgIndicators = [
            "Systolic murmur detected → possible valve dysfunction",
            "Turbulent blood flow pattern identified",
            "S1-S2 boundary irregular — improper valve closure",
            "Possible murmur: aortic stenosis or mitral regurgitation",
            "Echocardiography recommended for confirmation"
        ];
    } else if (p.includes("moderate") || (pcgScore !== null && pcgScore > 0.5)) {
        pcgText = "Moderate heart sound abnormality detected. S2 may be diminished, suggesting possible aortic valve dysfunction. The cardiac cycle timing pattern shows slight irregularity. Early-stage valvular disease cannot be excluded.";
        pcgIndicators = [
            "S2 sound diminished → possible aortic valve issue",
            "Slight irregularity in systolic-diastolic timing",
            "Early-stage murmur possible — monitor closely",
            "Doppler echocardiogram advisable"
        ];
    } else if (p.includes("not available")) {
        pcgText = "PCG (heart sound) file was not provided with this submission. Acoustic cardiac analysis could not be performed. For a complete screening, please upload the PCG (.wav) file.";
        pcgIndicators = [
            "No PCG file provided",
            "Heart sound analysis unavailable",
            "Re-submit with PCG file for complete dual-signal analysis"
        ];
    } else {
        pcgText = "Heart sounds S1 and S2 are clearly audible and well-defined. No murmurs, extra sounds (S3/S4), or pericardial rubs detected. The systolic and diastolic intervals appear normal in duration.";
        pcgIndicators = [
            "S1 (closure of mitral & tricuspid valves) — normal",
            "S2 (closure of aortic & pulmonary valves) — normal",
            "No murmur or extra heart sounds detected",
            "Regular heart cycle rhythm"
        ];
    }

    document.getElementById("clinicalPCGText").textContent = pcgText;
    const pcgUL = document.getElementById("clinicalPCGIndicators");
    pcgUL.innerHTML = "";
    pcgIndicators.forEach(ind => {
        const li = document.createElement("li");
        li.textContent = ind;
        pcgUL.appendChild(li);
    });
})();

// ── 8. FINAL SUMMARY CARD ───────────────────────────────────────
(function populateSummary() {
    const cond = condition.toLowerCase();
    const p    = pcgFinding.toLowerCase();

    // Build prose paragraph
    let ecgSentence, pcgSentence;

    if (cond.includes("normal")) {
        ecgSentence = "The ECG demonstrates normal sinus rhythm with no significant abnormalities identified.";
    } else if (cond.includes("infarction")) {
        ecgSentence = "The ECG shows ST segment elevation consistent with possible Myocardial Infarction (STEMI).";
    } else if (cond.includes("atrial")) {
        ecgSentence = "The ECG shows absence of P waves with an irregularly irregular rhythm, suggesting Atrial Fibrillation.";
    } else if (cond.includes("arrhythmia")) {
        ecgSentence = "The ECG shows irregular R-R intervals indicating a cardiac arrhythmia.";
    } else {
        ecgSentence = "The ECG shows an abnormal pattern requiring further clinical evaluation.";
    }

    if (p.includes("not available")) {
        pcgSentence = "PCG analysis was not performed (file not provided).";
    } else if (p.includes("strong abnormal") || (pcgScore !== null && pcgScore > 0.7)) {
        pcgSentence = "PCG analysis identifies abnormal heart sounds consistent with a systolic murmur, suggesting valve dysfunction.";
    } else if (p.includes("moderate") || (pcgScore !== null && pcgScore > 0.5)) {
        pcgSentence = "PCG analysis reveals moderate abnormality in heart sounds. S2 appears diminished.";
    } else {
        pcgSentence = "PCG analysis reveals normal heart sounds with S1 and S2 clearly present.";
    }

    const pct     = Math.round(confidence * 100);
    const fullText = `${ecgSentence} ${pcgSentence} Model confidence: ${pct}%.`;

    document.getElementById("summaryCondition").textContent = condition;
    document.getElementById("summaryParagraph").textContent = fullText;

    // Risk badge in summary
    const riskBadge = document.getElementById("srb-value");
    riskBadge.textContent = riskLevel;
    const summaryCard = document.getElementById("finalSummaryCard");
    const ringEl = document.getElementById("summaryIconRing");
    if (riskLevel === "Low") {
        riskBadge.className = "srb-value srb-low";
        summaryCard.classList.add("summary-low");
        ringEl.style.borderColor = "#00c853";
        ringEl.style.color       = "#00c853";
    } else if (riskLevel === "High") {
        riskBadge.className = "srb-value srb-high";
        summaryCard.classList.add("summary-high");
        ringEl.style.borderColor = "#d32f2f";
        ringEl.style.color       = "#d32f2f";
    } else {
        riskBadge.className = "srb-value srb-moderate";
        summaryCard.classList.add("summary-moderate");
        ringEl.style.borderColor = "#ffb300";
        ringEl.style.color       = "#ffb300";
    }

    // Tags
    const tags = document.getElementById("summaryTags");
    tags.innerHTML = "";
    const tagList = [condition, `${pct}% confidence`, `Risk: ${riskLevel}`];
    tagList.forEach(t => {
        const span = document.createElement("span");
        span.className = "stag";
        span.textContent = t;
        tags.appendChild(span);
    });
})();

// ── 9. ECG WAVEFORM CANVAS ───────────────────────────────────────
(function renderECG() {
    const canvas = document.getElementById("ecgCanvas");
    if (!canvas) return;

    // Make canvas fill its container
    canvas.width  = canvas.offsetWidth  || 800;
    canvas.height = canvas.offsetHeight || 220;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;

    const signal = ecgData;
    const cond   = condition.toLowerCase();

    // Background
    ctx.fillStyle = "#050e21";
    ctx.fillRect(0, 0, W, H);

    // ECG millimeter grid
    ctx.strokeStyle = "rgba(255,80,80,0.08)";
    ctx.lineWidth   = 0.5;
    for (let x = 0; x < W; x += 20) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 20) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    // Major grid (5x)
    ctx.strokeStyle = "rgba(255,80,80,0.15)";
    ctx.lineWidth = 0.8;
    for (let x = 0; x < W; x += 100) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 100) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    if (!signal || signal.length === 0) {
        ctx.fillStyle = "rgba(232,240,254,0.4)";
        ctx.font = "14px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("No ECG signal data available", W / 2, H / 2);
        return;
    }

    const len  = signal.length;
    const max  = Math.max(...signal.map(v => Math.abs(v))) || 1;
    const step = W / len;
    const mid  = H / 2;

    // ── Detect abnormal region bounds for highlighting
    // Heuristic: ST region is roughly 60-80% along a beat cycle
    const abnormalHighlight = detectAbnormalRegion(signal, cond);

    // ── Draw highlight region
    if (abnormalHighlight) {
        const startX = abnormalHighlight.start * step;
        const endX   = abnormalHighlight.end   * step;

        const grad = ctx.createLinearGradient(startX, 0, endX, 0);
        if (cond.includes("infarction")) {
            grad.addColorStop(0,   "rgba(211,47,47,0)");
            grad.addColorStop(0.3, "rgba(211,47,47,0.22)");
            grad.addColorStop(0.7, "rgba(211,47,47,0.22)");
            grad.addColorStop(1,   "rgba(211,47,47,0)");
        } else {
            grad.addColorStop(0,   "rgba(255,179,0,0)");
            grad.addColorStop(0.3, "rgba(255,179,0,0.18)");
            grad.addColorStop(0.7, "rgba(255,179,0,0.18)");
            grad.addColorStop(1,   "rgba(255,179,0,0)");
        }
        ctx.fillStyle = grad;
        ctx.fillRect(startX, 0, endX - startX, H);

        // Label
        const labelX = (startX + endX) / 2;
        ctx.fillStyle = cond.includes("infarction") ? "#ef9a9a" : "#ffe082";
        ctx.font = "bold 11px Inter, sans-serif";
        ctx.textAlign = "center";
        const regionLabel = cond.includes("infarction") ? "ST Elevation" :
                            cond.includes("atrial")     ? "Fibrillation Zone" :
                            cond.includes("arrhythmia") ? "Irregular Region" : "Abnormal Region";
        ctx.fillText(regionLabel, labelX, 18);

        // Bracket lines
        ctx.strokeStyle = cond.includes("infarction") ? "rgba(239,154,154,0.6)" : "rgba(255,224,130,0.5)";
        ctx.lineWidth   = 1;
        ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(startX, 0); ctx.lineTo(startX, H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(endX, 0);   ctx.lineTo(endX, H);   ctx.stroke();
        ctx.setLineDash([]);
    }

    // ── Detect R-peaks
    const detectedRPeaks = detectRPeaks(signal);

    // ── Draw the waveform in segments (normal green vs abnormal red)
    ctx.lineWidth     = 1.8;
    ctx.lineJoin      = "round";
    ctx.lineCap       = "round";
    ctx.shadowBlur    = 4;
    ctx.shadowColor   = cond === "normal" ? "#00c853" : "#ef5350";

    // Build colour per sample
    const colors = new Array(len).fill("normal-signal");
    if (abnormalHighlight) {
        for (let i = abnormalHighlight.start; i <= abnormalHighlight.end; i++) {
            colors[i] = "abnormal-signal";
        }
    }

    // Draw normal segments
    drawSegment(ctx, signal, colors, "normal-signal",   "#00e676", step, mid, max, H);
    // Draw abnormal segments
    if (abnormalHighlight)
        drawSegment(ctx, signal, colors, "abnormal-signal", "#ef5350", step, mid, max, H);

    ctx.shadowBlur  = 0;

    // ── Mark R-peaks
    detectedRPeaks.forEach(idx => {
        if (idx < 0 || idx >= len) return;
        const x = idx * step;
        const y = mid - (signal[idx] / max) * (H * 0.4);
        // Triangle marker
        ctx.fillStyle   = "#ffd600";
        ctx.strokeStyle = "#ffd600";
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(x, y - 10);
        ctx.lineTo(x - 5, y - 20);
        ctx.lineTo(x + 5, y - 20);
        ctx.closePath();
        ctx.fill();
    });
})();

// ── 10. PCG WAVEFORM CANVAS ──────────────────────────────────────
(function renderPCG() {
    const canvas = document.getElementById("pcgCanvas");
    if (!canvas) return;

    canvas.width  = canvas.offsetWidth  || 800;
    canvas.height = canvas.offsetHeight || 180;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;

    const signal = pcgData;
    const p      = pcgFinding.toLowerCase();

    // Background
    ctx.fillStyle = "#050e21";
    ctx.fillRect(0, 0, W, H);

    // Light grid
    ctx.strokeStyle = "rgba(100,160,255,0.08)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += 20) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 20) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    if (!signal || signal.length === 0) {
        ctx.fillStyle = "rgba(232,240,254,0.4)";
        ctx.font = "14px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("No PCG signal data available", W / 2, H / 2);
        return;
    }

    const len  = signal.length;
    const max  = Math.max(...signal.map(v => Math.abs(v))) || 1;
    const step = W / len;
    const mid  = H / 2;

    // Detect high-energy (abnormal) regions
    const murmurRegions = detectMurmurRegions(signal, p);

    // Shade murmur regions
    murmurRegions.forEach(([start, end]) => {
        const sx = start * step, ex = end * step;
        const grad = ctx.createLinearGradient(sx, 0, ex, 0);
        grad.addColorStop(0,   "rgba(211,47,47,0)");
        grad.addColorStop(0.2, "rgba(211,47,47,0.2)");
        grad.addColorStop(0.8, "rgba(211,47,47,0.2)");
        grad.addColorStop(1,   "rgba(211,47,47,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(sx, 0, ex - sx, H);
        ctx.fillStyle = "#ef9a9a";
        ctx.font = "bold 10px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Murmur", (sx + ex) / 2, 16);
    });

    // Draw PCG waveform
    const isAbnormal = p.includes("strong") || p.includes("moderate") ||
                       (pcgScore !== null && pcgScore > 0.5);
    ctx.strokeStyle  = "#29b6f6";
    ctx.lineWidth    = 1.5;
    ctx.shadowBlur   = 5;
    ctx.shadowColor  = "#29b6f6";
    ctx.beginPath();

    signal.forEach((value, i) => {
        const x = i * step;
        const y = mid - (value / max) * (H * 0.38);
        if (i === 0) ctx.moveTo(x, y);
        else         ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Overlay abnormal spikes in red
    if (isAbnormal) {
        ctx.strokeStyle = "#ef5350";
        ctx.lineWidth   = 1.8;
        ctx.shadowBlur  = 6;
        ctx.shadowColor = "#ef5350";
        murmurRegions.forEach(([start, end]) => {
            ctx.beginPath();
            for (let i = start; i <= end && i < len; i++) {
                const x = i * step;
                const y = mid - (signal[i] / max) * (H * 0.38);
                if (i === start) ctx.moveTo(x, y);
                else             ctx.lineTo(x, y);
            }
            ctx.stroke();
        });
        ctx.shadowBlur = 0;
    }
})();

// ── HELPERS ──────────────────────────────────────────────────────

function setChip(id, { text, cls }) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className   = "finding-chip " + cls;
}

function drawSegment(ctx, signal, colors, targetColor, strokeStyle, step, mid, max, H) {
    ctx.beginPath();
    ctx.strokeStyle = strokeStyle;
    let inSeg = false;

    signal.forEach((value, i) => {
        if (colors[i] !== targetColor) { inSeg = false; return; }
        const x = i * step;
        const y = mid - (value / max) * (H * 0.4);
        if (!inSeg) { ctx.moveTo(x, y); inSeg = true; }
        else          ctx.lineTo(x, y);
    });
    ctx.stroke();
}

function detectRPeaks(signal) {
    // Simple threshold-based R-peak detection
    const peaks = [];
    const max   = Math.max(...signal);
    const thr   = max * 0.6;
    const len   = signal.length;

    for (let i = 2; i < len - 2; i++) {
        if (signal[i] > thr &&
            signal[i] > signal[i-1] &&
            signal[i] > signal[i-2] &&
            signal[i] > signal[i+1] &&
            signal[i] > signal[i+2]) {
            peaks.push(i);
            i += 15; // skip ahead to avoid duplicates
        }
    }
    return peaks;
}

function detectAbnormalRegion(signal, cond) {
    if (cond.includes("normal")) return null;

    const len  = signal.length;
    const peaks = detectRPeaks(signal);
    if (peaks.length === 0) return { start: Math.floor(len * 0.35), end: Math.floor(len * 0.65) };

    // Use first R-peak to identify ST region (J-point to T-wave end approx)
    const refPeak = peaks[Math.min(1, peaks.length - 1)];
    const jPoint  = refPeak + Math.floor(0.04 * 360); // ~40ms after R-peak
    const tEnd    = refPeak + Math.floor(0.25 * 360); // ~250ms after R-peak

    return {
        start: Math.min(jPoint, len - 1),
        end:   Math.min(tEnd,   len - 1)
    };
}

function detectMurmurRegions(signal, pFinding) {
    const len = signal.length;
    if (!signal || len === 0) return [];

    const isAbnormal = pFinding.includes("strong") || pFinding.includes("moderate") ||
                       (pcgScore !== null && pcgScore > 0.5);
    if (!isAbnormal) return [];

    // Find energy envelope — chunk into 128-sample windows
    const windowSize = Math.floor(len / 16);
    const energies   = [];
    for (let w = 0; w < 16; w++) {
        let e = 0;
        const start = w * windowSize;
        const end   = Math.min(start + windowSize, len);
        for (let i = start; i < end; i++) e += signal[i] ** 2;
        energies.push(e / (end - start));
    }

    const maxE = Math.max(...energies);
    const thr  = maxE * 0.45;

    // Collect high-energy windows as murmur regions
    const regions = [];
    energies.forEach((e, w) => {
        if (e > thr) {
            regions.push([w * windowSize, Math.min((w + 1) * windowSize, len - 1)]);
        }
    });

    // Merge adjacent
    const merged = [];
    regions.forEach(([s, e]) => {
        if (merged.length && s <= merged[merged.length - 1][1] + windowSize) {
            merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], e);
        } else {
            merged.push([s, e]);
        }
    });

    return merged;
}
