import * as fs from 'fs';

const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');

const newLines: string[] = [];
let removedCount = 0;

for (let i = 0; i < lines.length; i++) {
  // Check if we have the 3-line sequence inserted by fix_try_catch.ts
  if (i + 2 < lines.length) {
    const l1 = lines[i].trim();
    const l2 = lines[i+1].trim();
    const l3 = lines[i+2].trim();
    
    if (l1 === '} catch (err) {' && l2 === 'console.error(err);' && l3 === '}') {
      // This is the sequence we want to remove!
      console.log(`Removing sequence at line ${i + 1}`);
      i += 2; // skip these 3 lines
      removedCount++;
      continue;
    }
  }
  newLines.push(lines[i]);
}

console.log(`Total removed: ${removedCount}`);
const newContent = newLines.join('\n');
console.log(`Original brace counts: { count: ${content.split('{').length - 1}, } count: ${content.split('}').length - 1}`);
console.log(`New brace counts: { count: ${newContent.split('{').length - 1}, } count: ${newContent.split('}').length - 1}`);

// Let's write the clean version back to src/App.tsx
fs.writeFileSync('src/App.tsx', newContent, 'utf-8');
console.log('Successfully reverted fix_try_catch.ts changes!');
