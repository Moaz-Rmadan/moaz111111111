import os

with open('unusual_new.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

app_lines = []
for line in lines:
    if line.startswith('src/App.tsx:'):
        app_lines.append(line[len('src/App.tsx:'):])
    else:
        if 'src/App.tsx' in line:
            continue
        app_lines.append(line)

start_idx = -1
for idx, l in enumerate(app_lines):
    if 'function PlateSharpeningView' in l:
        start_idx = idx
        break

end_idx = -1
for idx, l in enumerate(app_lines):
    if idx > start_idx and ('function ' in l or 'const ' in l) and l.startswith('function') and 'PlateSharpeningView' not in l:
        end_idx = idx
        break

if start_idx != -1 and end_idx != -1:
    plate_code = ''.join(app_lines[start_idx:end_idx])
    print(f"Extracted PlateSharpeningView: {end_idx - start_idx} lines")
    with open('extracted_plate.txt', 'w', encoding='utf-8') as out:
        out.write(plate_code)
else:
    print(f"ERROR: Start: {start_idx}, End: {end_idx}")
