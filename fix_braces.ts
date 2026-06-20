import * as fs from 'fs';
const content = fs.readFileSync('src/App.tsx', 'utf8');
const newContent = content.replace(/\} catch \(err\) \{ console\.error\(err\); \};/g, '} catch (err) { console.error(err); } };');
fs.writeFileSync('src/App.tsx', newContent);
console.log('Replaced all occurrences.');
