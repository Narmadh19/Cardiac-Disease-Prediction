import numpy as np
from tensorflow.keras.models import load_model
from backend.preprocessing.pcg_preprocess import load_pcg
import librosa

model = load_model("ml/backend/model/pcg_model.h5")

def extract_features(signal, sr=22050):
    mfcc = librosa.feature.mfcc(y=signal, sr=sr, n_mfcc=20)
    return np.mean(mfcc.T, axis=0)

def pcg_predict(file_path):
    try:
        # ✅ unpack properly
        signal, sr = load_pcg(file_path)

        features = extract_features(signal, sr)
        features = features.reshape(1, -1)

        pred = model.predict(features)[0][0]

        return float(pred)

    except Exception as e:
        print("PCG ERROR:", e)
        return None