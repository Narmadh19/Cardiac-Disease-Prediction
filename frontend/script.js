function openUploadModal() {
    document.getElementById("uploadModal").classList.add("active");
    setStatus("", "");
}

function closeUploadModal() {
    document.getElementById("uploadModal").classList.remove("active");
}

function setStatus(msg, type) {
    const el = document.getElementById("statusMsg");
    if (!msg) { el.style.display = "none"; return; }
    el.style.display = "block";
    el.style.background = type === "error" ? "#fee2e2" : type === "ok" ? "#d1fae5" : "#dbeafe";
    el.style.color = type === "error" ? "#991b1b" : type === "ok" ? "#065f46" : "#1e40af";
    el.innerText = msg;
}

document.getElementById("uploadForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const ecgFile = document.getElementById("ecgFile").files[0];
    const pcgFile = document.getElementById("pcgFile").files[0];
    const btn = document.getElementById("analyzeBtn");

    if (!ecgFile || !pcgFile) {
        setStatus("Please upload both ECG and PCG files.", "error");
        return;
    }

    btn.disabled = true;
    btn.innerText = "Analyzing...";
    setStatus("Connecting to backend at http://127.0.0.1:8000 ...", "info");

    const formData = new FormData();
    formData.append("ecg_file", ecgFile);
    formData.append("pcg_file", pcgFile);

    try {
        setStatus("Uploading files and running AI analysis... (may take 10-30 seconds)", "info");

        const response = await fetch("http://127.0.0.1:8000/analyze", {
            method: "POST",
            body: formData
        });

        setStatus("Received response from backend. Parsing...", "info");
        const result = await response.json();

        if (!response.ok || result.detail) {
            setStatus("Backend error: " + (result.detail || JSON.stringify(result)), "error");
            btn.disabled = false;
            btn.innerText = "Analyze";
            return;
        }

        setStatus("Success! Redirecting to results...", "ok");
        localStorage.setItem("analysisResult", JSON.stringify(result));

        setTimeout(() => {
            closeUploadModal();
            window.location.href = "results.html";
        }, 800);

    } catch (err) {
        console.error(err);
        setStatus(
            "ERROR: " + err.message +
            " — Make sure 'venv\\Scripts\\uvicorn backend.app:app --reload' is running in the project folder.",
            "error"
        );
        btn.disabled = false;
        btn.innerText = "Analyze";
    }
});
