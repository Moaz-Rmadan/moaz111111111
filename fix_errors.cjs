const fs = require('fs');
let lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');

const errorLines = [
258, 902, 912, 926, 1000, 1001, 1038, 1039, 1077, 1268, 1276, 1383, 1418, 1448, 1480, 1491, 4935, 4965, 4978, 5003, 5039, 5048, 6082, 6087, 6100, 6482, 6487, 6505, 7027, 7057, 7069, 7086, 7117, 7143, 7155, 7158, 7185, 7196, 7201, 7219, 7236, 8022, 8117, 8120, 8144, 8156, 8167, 8178, 8449, 8538, 8546, 8554, 8789, 8844, 8857, 8860, 8867, 8878, 9255, 9663, 9696, 9707, 9712, 9725, 9889, 9917, 9926, 10133, 10157, 11026, 11106, 11115, 11156, 11165, 11394, 11774, 11831, 11899, 11908, 11943, 12189, 12236, 12283, 12436, 12471, 12550, 12552, 12936, 12973, 13008, 13721, 13731, 14075, 15010, 15011
];

errorLines.forEach(lineNum => {
    let target = lineNum - 1;
    // scan upwards up to 3 lines to find `          }` or `}`
    while (target >= lineNum - 4 && target >= 0) {
        if (lines[target] === '          }') {
            lines[target] = '      });';
            break;
        } else if (lines[target] === '        }') {
            lines[target] = '      });';
            break;
        } else if (lines[target].trim() === '}') {
            lines[target] = lines[target].replace('}', '});');
            break;
        }
        target--;
    }
});

fs.writeFileSync('src/App.tsx', lines.join('\n'));
