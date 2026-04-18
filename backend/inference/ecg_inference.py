import numpy as np
from tensorflow.keras.models import load_model

model = load_model("backend/model/ecg_model.h5")

def ecg_predict(signal):
    try:
        signal = np.array(signal, dtype=np.float32)

        # Ensure correct length
        if signal.shape[0] != 500:
            raise ValueError("ECG input must be length 500")

        signal = signal.reshape(1, 500, 1)

        pred = model.predict(signal)

        predicted_class = int(np.argmax(pred))

        return predicted_class

    except Exception as e:
        print("ECG Prediction Error:", e)
        return None 