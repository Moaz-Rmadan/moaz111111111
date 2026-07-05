const fs = require('fs');
let lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('let unsub') || lines[i].includes('const unsubscribe = onSnapshot') || lines[i].includes('const unsub = onSnapshot')) {
     // Check if previous non-empty line has `});` or `}`
     let j = i - 1;
     while (j >= 0 && lines[j].trim() === '') j--;
     if (j >= 0 && lines[j].trim() !== '}' && lines[j].trim() !== '});' && lines[j].trim() !== 'return unsub;' && !lines[j].includes('} else {') && !lines[j].includes('if (!profile) return;')) {
         if (lines[j].includes('set')) {
             lines.splice(j + 1, 0, '      });');
             i++;
         }
     }
  }
}

fs.writeFileSync('src/App.tsx', lines.join('\n'));
