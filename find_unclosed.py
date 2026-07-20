import sys

with open("src/App.tsx") as f:
    lines = f.readlines()

for start_line in range(558, 1323):
    text = "".join(lines[558:start_line])
    open_p = text.count("(")
    close_p = text.count(")")
    if open_p - close_p > 5:
        print(f"Around {start_line}, open: {open_p}, close: {close_p}")
        break

def get_balance(text):
    return text.count("(") - text.count(")")

balances = []
curr = 0
for i, line in enumerate(lines[558:1323]):
    curr += get_balance(line)
    balances.append((i+559, curr))

# Print lines where balance jumps up and doesn't come down soon
for i, (ln, bal) in enumerate(balances):
    if bal > 0:
        pass
