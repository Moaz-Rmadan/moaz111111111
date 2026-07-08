import os

js_file = 'dist/assets/index-CvdHswez.js'
with open(js_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Search for i==="inventory"
idx = 0
while True:
    idx = content.find('i==="inventory"', idx)
    if idx == -1:
        break
    print(f"\n--- Found i===\"inventory\" at index {idx} ---")
    start = max(0, idx - 100)
    end = min(len(content), idx + 400)
    print(content[start:end])
    idx += len('i==="inventory"')

# Search for i==="itemCard"
idx = 0
while True:
    idx = content.find('i==="itemCard"', idx)
    if idx == -1:
        break
    print(f"\n--- Found i===\"itemCard\" at index {idx} ---")
    start = max(0, idx - 100)
    end = min(len(content), idx + 400)
    print(content[start:end])
    idx += len('i==="itemCard"')
