import os

with open('unusual_new.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Clean lines (remove prefix 'src/App.tsx:')
app_lines = []
for line in lines:
    if line.startswith('src/App.tsx:'):
        app_lines.append(line[len('src/App.tsx:'):])
    else:
        # if there are lines from src/App.tsx without prefix (unlikely but safe)
        if 'src/App.tsx' in line:
            continue
        app_lines.append(line)

code = ''.join(app_lines)

# We want to extract starting from 'function UserManagement' up to 'function Inventory'
# Let's find index of 'function UserManagement' and 'function Inventory'

start_marker = 'function UserManagement'
# Since UserManagement can be declared as 'function UserManagement(' or similar
start_idx = -1
for idx, l in enumerate(app_lines):
    if 'function UserManagement' in l or 'const UserManagement' in l:
        start_idx = idx
        break

end_marker = 'function Inventory'
end_idx = -1
for idx, l in enumerate(app_lines):
    if 'function Inventory' in l:
        end_idx = idx
        break

if start_idx != -1 and end_idx != -1:
    missing_code = ''.join(app_lines[start_idx:end_idx])
    print(f"Successfully extracted {end_idx - start_idx} lines of missing components!")
    with open('extracted_missing_components.txt', 'w', encoding='utf-8') as out:
        out.write(missing_code)
else:
    print(f"ERROR: Could not locate markers. Start: {start_idx}, End: {end_idx}")
