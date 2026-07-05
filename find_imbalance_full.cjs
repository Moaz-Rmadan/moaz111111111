const fs = require('fs');

const file = 'src/App.tsx';
const content = fs.readFileSync(file, 'utf8');

let braceCount = 0;
const lines = content.split('\n');

let lastStartLine = 0;
let lastStartText = '';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  let inString = false;
  let stringChar = '';
  let inComment = false;
  let inLineComment = false;
  
  const startCount = braceCount;
  
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    const nextChar = line[j+1];
    
    if (inLineComment) {
      break;
    }
    if (inComment) {
      if (char === '*' && nextChar === '/') {
        inComment = false;
        j++;
      }
      continue;
    }
    if (inString) {
      if (char === stringChar && line[j-1] !== '\\') {
        inString = false;
      }
      continue;
    }
    
    if (char === '/' && nextChar === '/') {
      inLineComment = true;
      j++;
      continue;
    }
    if (char === '/' && nextChar === '*') {
      inComment = true;
      j++;
      continue;
    }
    
    if (char === '"' || char === "'" || char === '`') {
      inString = true;
      stringChar = char;
      continue;
    }
    
    if (char === '{') {
      braceCount++;
    } else if (char === '}') {
      braceCount--;
    }
  }
  
  if (line.includes('function ') && braceCount === startCount + 1) {
    lastStartLine = i + 1;
    lastStartText = line.trim();
  }
  
  if (braceCount !== startCount) {
    if (line.includes('function ') || line.includes('const ') || line.includes('class ') || line.trim().startsWith('return') || line.trim().startsWith('export default')) {
      console.log(`Line ${i+1}: bc changed from ${startCount} to ${braceCount} : ${line.trim()}`);
    }
  }
}

console.log(`Final brace count: ${braceCount}`);
