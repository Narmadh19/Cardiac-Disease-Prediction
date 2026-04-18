
import librosa
import numpy as np

def load_pcg(file_path, target_length=500):
    signal, sr = librosa.load(file_path, sr=22050)

    # Normalize
    if np.max(np.abs(signal)) != 0:
        signal = signal / np.max(np.abs(signal))

    # Fix length
    if len(signal) >= target_length:
        signal = signal[:target_length]
    else:
        signal = np.pad(signal, (0, target_length - len(signal)))

    return signal, sr   # ✅ tuple

# ===============================
# FEATURE EXTRACTION
# ===============================
def extract_features(signal, sr=22050):
    try:
        mfcc = librosa.feature.mfcc(y=signal, sr=sr, n_mfcc=20)
        mfcc = np.mean(mfcc.T, axis=0)

        return mfcc   # ✅ numpy array

    except Exception as e:
        print("Feature Extraction Error:", e)
        return np.zeros(20)