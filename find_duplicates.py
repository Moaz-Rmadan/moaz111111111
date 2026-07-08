import re
from collections import Counter

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

funcs = re.findall(r'function\s+([A-Za-z0-9_]+)', code)
counts = Counter(funcs)

print("Duplicate functions in App.tsx:")
for fn, count in counts.items():
    if count > 1:
        print(f"- {fn}: {count} times")
