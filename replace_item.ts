import * as fs from 'fs';
const content = fs.readFileSync('src/App.tsx', 'utf8');
const searchStr = `                            setEditingItem(null);\n                      } catch (err) { console.error(err); }}>حفظ البيانات الجديدة</Button>`;
const replaceStr = `                            setEditingItem(null);\n                         } catch (err) {\n                            console.error(err);\n                         }\n                      }}>حفظ البيانات الجديدة</Button>`;
if (content.includes(searchStr)) {
  fs.writeFileSync('src/App.tsx', content.replace(searchStr, replaceStr), 'utf8');
  console.log('Successfully replaced item save button!');
} else {
  // Let's do a more robust string replacement
  const lines = content.split('\n');
  const idx = lines.findIndex(l => l.includes('setEditingItem(null);') && lines[lines.indexOf(l) + 1].includes('} catch (err) { console.error(err); }}>حفظ البيانات الجديدة'));
  if (idx !== -1) {
    lines[idx + 1] = `                         } catch (err) {\n                            console.error(err);\n                         }\n                      }}>حفظ البيانات الجديدة</Button>`;
    fs.writeFileSync('src/App.tsx', lines.join('\n'), 'utf8');
    console.log('Successfully replaced item save button via index!');
  } else {
    console.log('Could not find target sequence!');
  }
}
