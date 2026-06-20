import * as fs from 'fs';

const filePath = 'src/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

let i = 0;
let fixCount = 0;

while (i < content.length) {
  if (content.substring(i, i + 3) === 'try' && (i === 0 || /\s|\{|\}|;/.test(content[i - 1])) && /\s|\{/.test(content[i + 3])) {
    // Find matching '{'
    let openBraceIdx = -1;
    let scanPtr = i + 3;
    while (scanPtr < content.length) {
      const c = content[scanPtr];
      if (c === '{') {
        openBraceIdx = scanPtr;
        break;
      }
      if (/\s/.test(c)) {
        scanPtr++;
        continue;
      }
      // If we see anything other than whitespace before '{', this is not a clear try-block
      break;
    }

    if (openBraceIdx !== -1) {
      // Find matching '}' skipping comments, regex, and strings
      let braceCount = 1;
      let j = openBraceIdx + 1;
      let isInsideSingleQuote = false;
      let isInsideDoubleQuote = false;
      let isInsideTemplateLiteral = false;
      let isInsideSingleLineComment = false;
      let isInsideMultiLineComment = false;

      while (j < content.length && braceCount > 0) {
        const char = content[j];
        
        if (isInsideSingleLineComment) {
          if (char === '\n') {
            isInsideSingleLineComment = false;
          }
          j++;
          continue;
        }

        if (isInsideMultiLineComment) {
          if (char === '*' && content[j + 1] === '/') {
            isInsideMultiLineComment = false;
            j += 2;
          } else {
            j++;
          }
          continue;
        }

        if (isInsideSingleQuote) {
          if (char === "'" && content[j - 1] !== '\\') {
            isInsideSingleQuote = false;
          }
          j++;
          continue;
        }

        if (isInsideDoubleQuote) {
          if (char === '"' && content[j - 1] !== '\\') {
            isInsideDoubleQuote = false;
          }
          j++;
          continue;
        }

        if (isInsideTemplateLiteral) {
          if (char === '`' && content[j - 1] !== '\\') {
            isInsideTemplateLiteral = false;
          }
          j++;
          continue;
        }

        // Check for comments
        if (char === '/' && content[j + 1] === '/') {
          isInsideSingleLineComment = true;
          j += 2;
          continue;
        }
        if (char === '/' && content[j + 1] === '*') {
          isInsideMultiLineComment = true;
          j += 2;
          continue;
        }

        // Check for quotes
        if (char === "'") {
          isInsideSingleQuote = true;
          j++;
          continue;
        }
        if (char === '"') {
          isInsideDoubleQuote = true;
          j++;
          continue;
        }
        if (char === '`') {
          isInsideTemplateLiteral = true;
          j++;
          continue;
        }

        // Brace tracking
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
        }
        j++;
      }

      if (braceCount === 0) {
        let closeBraceIdx = j - 1;
        // Check what comes next
        let k = closeBraceIdx + 1;
        while (k < content.length && /\s/.test(content[k])) {
          k++;
        }
        
        let hasCatchOrFinally = false;
        if (content.substring(k, k + 5) === 'catch' && (k + 5 >= content.length || /\s|\{/.test(content[k + 5]))) {
          hasCatchOrFinally = true;
        }
        if (content.substring(k, k + 7) === 'finally' && (k + 7 >= content.length || /\s|\{/.test(content[k + 7]))) {
          hasCatchOrFinally = true;
        }

        if (!hasCatchOrFinally) {
          // Missing catch block! Let's insert a catch block
          const insertText = ' catch (err) { console.error(err); }';
          content = content.substring(0, closeBraceIdx + 1) + insertText + content.substring(closeBraceIdx + 1);
          fixCount++;
          // Restart scan to account for string length change
          i = 0;
          continue;
        }
      }
    }
  }
  i++;
}

fs.writeFileSync(filePath, content, 'utf8');
console.log(`Processed all try blocks! Fixed ${fixCount} missing catch/finally clauses.`);
