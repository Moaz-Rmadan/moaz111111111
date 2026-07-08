import os

js_file = 'dist/assets/index-CvdHswez.js'
if os.path.exists(js_file):
    with open(js_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    print(f"File size: {len(content)} chars")
    
    # Let's search for occurrences of "ItemCardView"
    idx = 0
    while True:
        idx = content.find('ItemCardView', idx)
        if idx == -1:
            break
        print(f"\n--- Found ItemCardView at index {idx} ---")
        # Print 1000 characters before and 3000 characters after
        start = max(0, idx - 1000)
        end = min(len(content), idx + 3000)
        print(content[start:end])
        idx += len('ItemCardView')

    # Let's search for occurrences of "Inventory"
    idx = 0
    while True:
        idx = content.find('Inventory', idx)
        if idx == -1:
            break
        print(f"\n--- Found Inventory at index {idx} ---")
        start = max(0, idx - 1000)
        end = min(len(content), idx + 3000)
        print(content[start:end])
        idx += len('Inventory')
else:
    print("JS file does not exist!")
