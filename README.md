❤️ AI-Based Heart Screening System
📌 Overview

The AI-Based Heart Screening System is a non-invasive, intelligent web application designed for early detection of cardiac abnormalities using Electrocardiogram (ECG) and Phonocardiogram (PCG) signals.

It leverages advanced deep learning and audio signal processing techniques to provide fast, accurate, and interpretable screening results.

🚀 Key Features
🔍 Dual-Modal Analysis – Combines ECG (electrical signals) and PCG (heart sounds)
🧠 AI-Powered Detection – Uses deep learning models for classification
📊 Interactive Dashboard – Visualizes waveforms and results clearly
⚡ Fast Screening – Real-time or near real-time predictions
📈 Confidence Scores – Displays prediction reliability
🩺 Medical Insights – Provides understandable explanations
🫀 ECG Analysis Module
Processes time-series ECG signals using a 1D Convolutional Neural Network (CNN)
Identifies key waveform components:
P wave
QRS complex
ST segment
Classifies conditions such as:
Normal Activity
Arrhythmia
Myocardial Infarction (Suspected)
Atrial Fibrillation
Other abnormalities
🔊 PCG Analysis Module
Analyzes heart sound recordings (.wav files)
Uses MFCC (Mel-Frequency Cepstral Coefficients) for feature extraction
Detects:
Heart murmurs
Valve disorders
Irregular heart sounds
🔗 Fusion-Based Interpretation
Integrates ECG and PCG outputs
Generates a combined clinical assessment
Improves:
Accuracy
Reliability
Interpretability
🖥️ User Interface
Clean and user-friendly dashboard
Features include:
📉 Waveform visualization
⚠️ Abnormality highlighting
📊 Confidence scores
📘 Detailed medical explanations
🛠️ Technologies Used
Frontend: HTML, CSS, JavaScript
Backend: Python (Flask / Django)
Machine Learning: TensorFlow / PyTorch
Audio Processing: Librosa
Data Handling: NumPy, Pandas
📂 How to Use
Upload ECG signal data or PCG (.wav) file
The system processes the input using trained AI models
View results on the dashboard
Analyze predictions and medical insights
🎯 Objective

To enhance early cardiac screening by combining electrical (ECG) and acoustic (PCG) analysis, making diagnosis more accessible, accurate, and interpretable.
