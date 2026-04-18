import numpy as np

def load_ecg(file_path):
    with open(file_path, "r") as f:
        content = f.read()

    # Clean separators
    content = content.replace(",", " ").replace("\n", " ")

    # Split values
    values = content.split()

    # Convert to float
    signal = np.array([float(v) for v in values if v.strip() != ""], dtype=np.float32)

    # Normalize
    signal = (signal - np.mean(signal)) / (np.std(signal) + 1e-8)

    # Fix length
    target_length = 500
    if len(signal) > target_length:
        signal = signal[:target_length]
    else:
        signal = np.pad(signal, (0, target_length - len(signal)))

    return signal