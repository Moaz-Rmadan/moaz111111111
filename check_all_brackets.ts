import * as fs from 'fs';

const content = fs.readFileSync('src/App.tsx', 'utf8');

let p_depth = 0; // parens ()
let s_depth = 0; // square brackets []
let c_depth = 0; // curly braces {}

let inString: string | null = null;
let inComment = false;
let backtick_count = 0;

for (let i = 0; i < content.length; i++) {
  const char = content[i];
  const nextChar = content[i + 1];

  if (inComment) {
    if (char === '*' && nextChar === '/') {
      inComment = false;
      i++;
    }
    continue;
  }

  if (content.substring(i, i + 2) === '//') {
    while (i < content.length && content[i] !== '\n') {
      i++;
    }
    continue;
  }

  if (char === '/' && nextChar === '*') {
    inComment = true;
    i++;
    continue;
  }

  if (inString) {
    if (char === '\\') {
      i++;
      continue;
    }
    if (char === inString) {
      inString = null;
    }
    continue;
  }

  if (char === '"' || char === "'") {
    inString = char;
    continue;
  }

  if (char === '`') {
    backtick_count++;
    if (inString === '`') {
      inString = null;
    } else {
      inString = '`';
    }
    continue;
  }

  if (char === '{') c_depth++;
  else if (char === '}') c_depth--;

  if (char === '[') s_depth++;
  else if (char === ']') s_depth--;

  if (char === '(') p_depth++;
  else if (char === ')') p_depth--;
}

console.log(`Balance Audit at End Of File:`);
console.log(`- String literal mode at EOF: ${inString}`);
console.log(`- Curly braces Depth: ${c_depth}`);
console.log(`- Square brackets Depth: ${s_depth}`);
console.log(`- Parentheses Depth: ${p_depth}`);
