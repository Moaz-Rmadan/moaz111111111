with open("src/App.tsx") as f:
    lines = f.readlines()

curr = 0
for i, line in enumerate(lines[558:1323]):
    curr += line.count("(") - line.count(")")
    if curr >= 2:
        print(f"Line {i+559}: balance {curr}. Line text: {line.strip()}")

