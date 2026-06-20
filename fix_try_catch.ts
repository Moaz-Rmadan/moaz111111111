import * as fs from 'fs';

const filePath = 'src/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// We want to scan the file line-by-line.
const lines = content.split('\n');
const newLines: string[] = [];

let inTry = false;
let tryIndent = '';
let tryLines: string[] = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trim = line.trim();

  if (trim.startsWith('try {') && !inTry) {
    inTry = true;
    tryIndent = line.match(/^(\s*)/)?.[1] || '    ';
    tryLines = [line];
    continue;
  }

  if (inTry) {
    tryLines.push(line);
    // If we hit a catch, we're good
    if (trim.startsWith('} catch') || trim.startsWith('catch') || trim.includes('} catch (')) {
      inTry = false;
      newLines.push(...tryLines);
      tryLines = [];
      continue;
    }
    // If we hit }; or } that ends a function/handler, or the try block has run too long and standard closing occurs
    // Usually, the broken handlers end on exactly "  };" or " };" or "};"
    if (trim === '};' || trim === '}') {
      // Let's verify if try block is broken
      // A broken try block is one that doesn't have an closing bracket for the try block inside `tryLines`
      // Since it is broken, we should close the try block, add catch (err) { console.error(err); } and then close the function/block
      // Let's pop the last line from tryLines if it was the closing bracket (it should be the "};" or "}" itself)
      const last = tryLines.pop(); // this is the }; or }
      
      // Let's add the closing try bracket and catch block
      tryLines.push(`${tryIndent}} catch (err) {`);
      tryLines.push(`${tryIndent}  console.error(err);`);
      tryLines.push(`${tryIndent}}`);
      if (last) tryLines.push(last);
      
      newLines.push(...tryLines);
      inTry = false;
      tryLines = [];
      continue;
    }
  } else {
    newLines.push(line);
  }
}

// Write it back
fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
console.log('Finished repairing app.tsx try-catch blocks!');
