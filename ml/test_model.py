import pandas as pd
import numpy as np
from tensorflow.keras.models import load_model
from sklearn.metrics import accuracy_score, classification_report

# Load model
model = load_model("../backend/model/ecg_model.h5")

# Load test dataset
data = pd.read_csv("mitbih_test.csv", header=None)

# Split features and labels
X = data.iloc[:, :-1].values
y_true = data.iloc[:, -1].values

# Convert to float
X = X.astype(np.float32)

# Normalize
X = (X - np.mean(X)) / (np.std(X) + 1e-8)

# Pad to 500
def pad_signal(signal, target_len=500):
    if len(signal) >= target_len:
        return signal[:target_len]
    return np.pad(signal, (0, target_len - len(signal)))

X = np.array([pad_signal(x) for x in X])

# Reshape
X = X.reshape(-1, 500, 1)

# Predict
y_pred_probs = model.predict(X)

# Convert to class
y_pred = np.argmax(y_pred_probs, axis=1)

# Accuracy
accuracy = accuracy_score(y_true, y_pred)
print("✅ Accuracy:", accuracy)

# Detailed report (includes F1-score)
print("\n📊 Classification Report:\n")
print(classification_report(y_true, y_pred))