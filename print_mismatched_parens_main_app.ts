import * as fs from 'fs';

const lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');

const startIndex = 770; // 0-based is line 771
const endIndex = 2412;   // 0-based is line 2413

const stack: { line: number; col: number; snippet: string }[] = [];
let inString: string | null = null;
let inComment = false;

for (let lineIdx = startIndex; lineIdx < endIndex; lineIdx++) {
  const lineNum = lineIdx + 1;
  const lineStr = lines[lineIdx];

  for (let colIdx = 0; colIdx < lineStr.length; colIdx++) {
    const char = lineStr[colIdx];
    const nextChar = lineStr[colIdx + 1];

    if (inComment) {
      if (char === '*' && nextChar === '/') {
        inComment = false;
        colIdx++;
      }
      continue;
    }

    if (lineStr.substring(colIdx, colIdx + 2) === '//') {
      break;
    }

    if (char === '/' && nextChar === '*') {
      inComment = true;
      colIdx++;
      continue;
    }

    if (inString) {
      if (char === '\\') {
        colIdx++;
        continue;
      }
      if (char === inString) {
        inString = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = char;
      continue;
    }

    if (char === '(') {
      stack.push({ line: lineNum, col: colIdx + 1, snippet: lineStr.trim() });
    } else if (char === ')') {
      if (stack.length > 0) {
        stack.pop();
      } else {
        console.log(`Unmatched close ')' at line ${lineNum}: "${lineStr.trim()}"`);
      }
    }
  }
}

console.log(`\nRemaining unclosed parentheses inside MainApp boundaries:`);
stack.forEach((item, idx) => {
  console.log(`[${idx + 1}] Line ${item.line} Col ${item.col}: "${item.snippet}"`);
});
