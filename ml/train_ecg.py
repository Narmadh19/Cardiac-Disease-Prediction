import numpy as np
import os
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Conv1D, MaxPooling1D, Flatten, Dense
from tensorflow.keras.utils import to_categorical

# Dummy dataset (replace with real later)
X = np.random.rand(100, 500, 1)
y = np.random.randint(0, 6, 100)
y = to_categorical(y, 6)

model = Sequential([
    Conv1D(32, 3, activation='relu', input_shape=(500,1)),
    MaxPooling1D(2),
    Conv1D(64, 3, activation='relu'),
    MaxPooling1D(2),
    Flatten(),
    Dense(64, activation='relu'),
    Dense(6, activation='softmax')
])

model.compile(optimizer='adam',
              loss='categorical_crossentropy',
              metrics=['accuracy'])

model.fit(X, y, epochs=5)

# Save model
os.makedirs("../backend/model", exist_ok=True)
model.save("../backend/model/ecg_model.h5")

print("✅ Model trained and saved")
