import * as fs from 'fs';
fs.appendFileSync('src/App.tsx', '\n}');
console.log('Appended brace.');
