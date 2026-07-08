import os

# Read current src/App.tsx
file_path = 'src/App.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Read extracted files
with open('extracted_plate.txt', 'r', encoding='utf-8') as f:
    plate_code = f.read()

with open('extracted_missing_components.txt', 'r', encoding='utf-8') as f:
    missing_code = f.read()

# Target stub to replace
stub = """function PlateSharpeningView(props: any) {
  return null;
}"""

if stub not in content:
    print("ERROR: Could not find PlateSharpeningView stub in current App.tsx!")
    # Let's try matching with different spacing/newlines just in case
    # Line 2827:
    stub_lines = "function PlateSharpeningView(props: any) {\n  return null;\n}"
    if stub_lines in content:
        stub = stub_lines
    else:
        print("ERROR: Alternative stub not found either!")
        exit(1)

print("Found stub. Inserting restored components...")
# We will replace the stub with plate_code followed by missing_code
restored_block = plate_code + "\n\n" + missing_code

updated_content = content.replace(stub, restored_block)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(updated_content)

print("SUCCESS: Merged restored components successfully!")
