import os
import numpy as np
import librosa
from sklearn.model_selection import train_test_split
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout

# =========================
# CONFIG
# =========================
DATASET_PATH = "pcg_dataset"
SAMPLE_RATE = 22050
MAX_LEN = 500

# =========================
# LOAD AUDIO
# =========================
def load_audio(file_path):
    signal, sr = librosa.load(file_path, sr=SAMPLE_RATE)

    # Fix length
    if len(signal) >= MAX_LEN:
        signal = signal[:MAX_LEN]
    else:
        signal = np.pad(signal, (0, MAX_LEN - len(signal)))

    return signal

# =========================
# FEATURE EXTRACTION
# =========================
def extract_features(signal):
    mfcc = librosa.feature.mfcc(y=signal, sr=SAMPLE_RATE, n_mfcc=20)
    return np.mean(mfcc.T, axis=0)

# =========================
# DATASET LOADING
# =========================
X = []
y = []

for label, folder in enumerate(["normal", "abnormal"]):
    folder_path = os.path.join(DATASET_PATH, folder)

    for file in os.listdir(folder_path):
        if file.endswith(".wav"):
            path = os.path.join(folder_path, file)

            signal = load_audio(path)
            features = extract_features(signal)

            X.append(features)
            y.append(label)

X = np.array(X)
y = np.array(y)

print("Dataset shape:", X.shape, y.shape)

# =========================
# SPLIT
# =========================
X_train, X_val, y_train, y_val = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# =========================
# MODEL
# =========================
model = Sequential([
    Dense(64, activation='relu', input_shape=(20,)),
    Dropout(0.3),
    Dense(32, activation='relu'),
    Dense(1, activation='sigmoid')   # Binary classification
])

model.compile(
    optimizer='adam',
    loss='binary_crossentropy',
    metrics=['accuracy']
)

# =========================
# TRAIN
# =========================
history = model.fit(
    X_train,
    y_train,
    epochs=15,
    validation_data=(X_val, y_val),
    batch_size=32
)

# =========================
# SAVE MODEL
# =========================
model.save("backend/model/pcg_model.h5")

print("✅ PCG model trained successfully!")