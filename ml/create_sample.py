import pandas as pd

data = pd.read_csv("mitbih_test.csv", header=None)

# Find first occurrence of each class
for cls in range(5):
    row = data[data.iloc[:, -1] == cls].iloc[0]

    signal = row.iloc[:-1].values
    label = int(row.iloc[-1])

    filename = f"sample_class_{cls}.txt"

    with open(filename, "w") as f:
        for val in signal:
            f.write(f"{val}\n")

    print(f"✅ Created {filename} with class {label}")