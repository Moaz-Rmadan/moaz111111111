#!/bin/bash
sed -i 's/), (snap) => {/, (snap) => {/g' src/App.tsx
sed -i -E "s/([a-zA-Z0-9_]+) = onSnapshot\(collection\(db, '([^']+)'\), \(snap\) => \{/\1 = onSnapshot(collection(db, '\2'), (snap) => {/g" src/App.tsx

# Wait, the best way to do this is with a small node script
