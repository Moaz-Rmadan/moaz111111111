
import os
import re

found_new = set()
for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
                matches = re.findall(r'new\s+([A-Za-z0-9_]+)', content)
                for m in matches:
                    found_new.add(m)

print(sorted(list(found_new)))
