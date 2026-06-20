import * as fs from 'fs';

const content = fs.readFileSync('src/App.tsx', 'utf8');

const stack: { line: number; char: string; snippet: string }[] = [];
let lineNum = 1;

for (let i = 0; i < content.length; i++) {
  const char = content[i];
  if (char === '\n') {
    lineNum++;
  }

  if (char === '{') {
    const startOfLine = content.lastIndexOf('\n', i);
    const endOfLine = content.indexOf('\n', i);
    const snippet = content.substring(startOfLine !== -1 ? startOfLine + 1 : 0, endOfLine !== -1 ? endOfLine : content.length).trim();
    stack.push({ line: lineNum, char, snippet });
  } else if (char === '}') {
    if (stack.length > 0) {
      stack.pop();
    }
  }
}

console.log(`\nRemaining open braces:`);
stack.forEach((item, index) => {
  console.log(`[${index + 1}] Line ${item.line}: "${item.snippet}"`);
});
