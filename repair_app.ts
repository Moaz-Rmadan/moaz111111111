import * as fs from 'fs';

const filePath = 'src/App.tsx';
let source = fs.readFileSync(filePath, 'utf8');

// Let's find all occurrences of "try {" in the codebase.
// Since there are two kinds of issues:
// 1. Missing try-catch closures in standard event handlers.
// 2. Missing try-catch closures in inline handlers (like onClick).
//
// Let's write a line-aware compiler that processes the file line-by-line.
// We can use a clean scan.
const lines = source.split('\n');
const resultLines: string[] = [];

let i = 0;
while (i < lines.length) {
  let line = lines[i];
  const trim = line.trim();

  // If a line starts with "try {" or we are entering a try block
  if (trim.startsWith('try {') || trim.includes(' try {')) {
    // We found a try block!
    // Let's scan forward from here to find where this try block is supposed to end or where it gets caught.
    // A try block should have a matching "}" and then a "catch" or "finally".
    // Let's look for the matching closing brace, tracking the brace balance.
    let balance = 1; // Since we are already inside the try {
    let scanIndex = i + 1;
    let foundCatchOrFinally = false;
    let endLineIndex = -1;
    const blockIndent = line.match(/^(\s*)/)?.[1] || '';

    while (scanIndex < lines.length) {
      const scanLine = lines[scanIndex];
      const sTrim = scanLine.trim();

      // Adjust brace balance
      // Count open and close braces on this line.
      // But avoid counting braces inside strings or comments if possible, 
      // though simple counting works for our clean codebase.
      const opens = (scanLine.match(/{/g) || []).length;
      const closes = (scanLine.match(/}/g) || []).length;
      balance += opens;
      balance -= closes;

      // If the try block is properly closed on this scanLine
      if (balance <= 0) {
        endLineIndex = scanIndex;
        // Check if there is a catch or finally or .catch following it on this line or subsequent lines
        let checkStr = '';
        for (let s = scanIndex; s < Math.min(lines.length, scanIndex + 3); s++) {
          checkStr += lines[s];
        }
        if (checkStr.includes('catch') || checkStr.includes('finally')) {
          foundCatchOrFinally = true;
        }
        break;
      }

      // If we hit the end of the parent function or another handler/block structure without balancing
      // This happens when the developer closed the handler with "};" or "}" or "}}" but forgot to close the "try" block first!
      if (sTrim === '};' || sTrim === '}' || sTrim.startsWith('}}')) {
        endLineIndex = scanIndex - 1; // the try block must close right before this handler-closing line
        break;
      }

      scanIndex++;
    }

    if (!foundCatchOrFinally) {
      // Missing catch block!
      // Let's copy the try block lines, append catch block, and then resume
      console.log(`Fixing missing catch block for try at line ${i + 1}`);
      
      const tryBlockLines: string[] = [];
      tryBlockLines.push(line); // push the "try {" line
      
      for (let s = i + 1; s <= endLineIndex; s++) {
        tryBlockLines.push(lines[s]);
      }
      
      // Now, let's close the try block and add the catch block
      // Determine the indent of the catch block
      // It should be the same as the "try {" line's indent
      tryBlockLines.push(`${blockIndent}} catch (err) {`);
      tryBlockLines.push(`${blockIndent}  console.error(err);`);
      tryBlockLines.push(`${blockIndent}}`);
      
      resultLines.push(...tryBlockLines);
      i = endLineIndex + 1; // resume after the end of the try block
    } else {
      // Already correct, leave as is
      resultLines.push(line);
      i++;
    }
  } else {
    resultLines.push(line);
    i++;
  }
}

fs.writeFileSync(filePath, resultLines.join('\n'), 'utf8');
console.log('App.tsx successfully corrected and repaired!');
