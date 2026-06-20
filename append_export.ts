import * as fs from 'fs';
fs.appendFileSync('src/App.tsx', '\nexport default AppContent;');
console.log('Appended export.');
