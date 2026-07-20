with open("src/App.tsx") as f:
    lines = f.readlines()

curr = 0
for i, line in enumerate(lines[558:1323]):
    curr += line.count("(") - line.count(")")
    
print(f"Final balance: {curr}")
