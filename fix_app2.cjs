const fs = require('fs');
let lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('let unsub') || lines[i].includes('const unsubscribe = onSnapshot') || lines[i].includes('const unsub = onSnapshot')) {
     let j = i - 1;
     while (j >= 0 && lines[j].trim() === '') j--;
     if (j >= 0) {
         if (lines[j].trim() === '}') {
             lines[j] = lines[j].replace('}', '});');
         } else if (lines[j].includes('set') && !lines[j].trim().endsWith(';')) {
             // add }); on the next line
             lines.splice(j + 1, 0, '      });');
             i++;
         } else if (lines[j].trim() === '));') {
             // e.g. setWarehouses(...)
             lines.splice(j + 1, 0, '      });');
             i++;
         }
     }
  }
}

fs.writeFileSync('src/App.tsx', lines.join('\n'));
