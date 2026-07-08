import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx in range(3286, 4128):
    line = lines[idx]
    if 'function ' in line:
        print(f"Line {idx+1}: {line.strip()[:100]}")
