import pandas as pd
import numpy as np
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Conv1D, MaxPooling1D, Flatten, Dense
from sklearn.model_selection import train_test_split

# ===============================
# LOAD DATA
# ===============================
data = pd.read_csv("mitbih_train.csv", header=None)

# Split features & labels
X = data.iloc[:, :-1].values
y = data.iloc[:, -1].values

# ===============================
# PREPROCESSING
# ===============================

X = X.astype(np.float32)

# Normalize
X = (X - np.mean(X)) / (np.std(X) + 1e-8)

# Pad 187 → 500
def pad_signal(signal, target_len=500):
    if len(signal) >= target_len:
        return signal[:target_len]
    return np.pad(signal, (0, target_len - len(signal)))

X = np.array([pad_signal(x) for x in X])

# Reshape for CNN
X = X.reshape(-1, 500, 1)

# ===============================
# SPLIT DATA
# ===============================

X_train, X_val, y_train, y_val = train_test_split(
    X, y,
    test_size=0.2,
    stratify=y,
    random_state=42
)

# ===============================
# BUILD MODEL
# ===============================

model = Sequential([
    Conv1D(32, 3, activation='relu', input_shape=(500,1)),
    MaxPooling1D(2),

    Conv1D(64, 3, activation='relu'),
    MaxPooling1D(2),

    Flatten(),
    Dense(64, activation='relu'),

    Dense(5, activation='softmax')
])

# ===============================
# COMPILE
# ===============================

model.compile(
    optimizer='adam',
    loss='sparse_categorical_crossentropy',
    metrics=['accuracy']
)

# ===============================
# TRAIN 
# ===============================

model.fit(
    X_train,
    y_train,
    epochs=10,
    validation_data=(X_val, y_val),
    batch_size=64
)

# ===============================
# SAVE MODEL
# ===============================

model.save("backend/model/ecg_model.h5")

print("✅ Final stable ECG model trained (no weights)")