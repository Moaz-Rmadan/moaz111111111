import re

with open("src/App.tsx") as f:
    lines = f.readlines()

for i, line in enumerate(lines[558:1323]):
    if "useMemo" in line:
        # scan forward until finding '}, ['
        for j in range(i, len(lines[558:1323])):
            if "}, [" in lines[558+j] or "}  ," in lines[558+j]:
                print(f"Memo at {i+559}: ends at {559+j}: {lines[558+j].strip()}")
                break
        else:
            print(f"Memo at {i+559}: couldn't find end!")
