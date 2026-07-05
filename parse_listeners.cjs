const fs = require('fs');

const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');

let inUseEffect = false;
let listeners = [];
let currentListener = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('useEffect(() => {') && lines[i+1].includes('if (!user || !profile) return;')) {
    inUseEffect = true;
    continue;
  }
  if (inUseEffect && line.includes('return () => {')) {
    inUseEffect = false;
    break;
  }
  if (inUseEffect) {
    const letMatch = line.match(/let\s+(unsub\w+)\s*=\s*\(\)\s*=>\s*\{\};/);
    if (letMatch) {
      if (currentListener) {
        listeners.push(currentListener);
      }
      currentListener = {
        unsubName: letMatch[1],
        lineNum: i + 1,
        ifLine: '',
        onSnapshotLine: '',
        setLine: '',
        queryLine: ''
      };
      continue;
    }
    if (currentListener) {
      if (line.includes('if (profile.isAdmin ||')) {
        currentListener.ifLine = line.trim();
      } else if (line.includes('onSnapshot(')) {
        currentListener.onSnapshotLine = line.trim();
      } else if (line.includes('set') && (line.includes('map(d') || line.includes('snap.docs'))) {
        currentListener.setLine = line.trim();
      } else if (line.includes('const q = query(')) {
        currentListener.queryLine = line.trim();
      }
    }
  }
}
if (currentListener) {
  listeners.push(currentListener);
}

fs.writeFileSync('listeners_metadata.json', JSON.stringify(listeners, null, 2), 'utf8');
console.log(`Saved ${listeners.length} listeners to listeners_metadata.json`);
