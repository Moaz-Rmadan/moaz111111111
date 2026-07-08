import os
import zlib

objects_dir = '.git/objects'
found = []

for root, dirs, files in os.walk(objects_dir):
    for file in files:
        filepath = os.path.join(root, file)
        # Skip small or non-object files
        if len(file) != 38: # Git sha is 40 chars, 2 for dir, 38 for filename
            continue
        try:
            with open(filepath, 'rb') as f:
                data = f.read()
            decompressed = zlib.decompress(data)
            # Git object format: [type] [size]\x00[content]
            parts = decompressed.split(b'\x00', 1)
            if len(parts) == 2:
                header, content = parts
                try:
                    text = content.decode('utf-8', errors='ignore')
                    if 'function Inventory' in text or 'function ItemCardView' in text:
                        print(f"FOUND IN OBJECT: {filepath} (size {len(text)} chars)")
                        # Save it as a backup
                        backup_name = f"recovered_{file}.tsx"
                        with open(backup_name, 'w', encoding='utf-8') as out:
                            out.write(text)
                        print(f"Saved backup as {backup_name}")
                except Exception as e:
                    pass
        except Exception as e:
            # Print error to understand if it's actually corrupted or just zlib format
            pass
