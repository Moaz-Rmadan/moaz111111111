import os
import zlib

os.makedirs('/tmp/git_extracted', exist_ok=True)
objects_dir = '.git/objects'

count = 0
for root, dirs, files in os.walk(objects_dir):
    for file in files:
        if len(file) != 38:
            continue
        filepath = os.path.join(root, file)
        try:
            with open(filepath, 'rb') as f:
                data = f.read()
            decompressed = zlib.decompress(data)
            parts = decompressed.split(b'\x00', 1)
            if len(parts) == 2:
                header, content = parts
                out_path = f"/tmp/git_extracted/obj_{count}_{file}.txt"
                with open(out_path, 'wb') as out:
                    out.write(content)
                print(f"Extracted object {file} (type: {header.decode()}) to {out_path}")
                count += 1
        except Exception as e:
            # print(f"Error {file}: {e}")
            pass

print(f"Total objects successfully extracted: {count}")
