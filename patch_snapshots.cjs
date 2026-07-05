const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// The pattern is usually: unsubName = onSnapshot(collection(db, 'name'), (snap) => { ... });
// We want to add an error callback: , (error) => console.error('Error in name listener:', error));

content = content.replace(/onSnapshot\((collection\(db, '[^']+'\)(?:, query\([^)]+\))?), \(([^)]+)\) => \{([\s\S]*?)\}\);/g, (match, p1, p2, p3) => {
    const colNameMatch = p1.match(/'([^']+)'/);
    const colName = colNameMatch ? colNameMatch[1] : 'unknown';
    return `onSnapshot(${p1}, (${p2}) => {${p3}}, (error) => console.error('Permission error in collection ${colName}:', error));`;
});

// also for queries
content = content.replace(/onSnapshot\((query\(collection\(db, '[^']+'\)[^)]+\)), \(([^)]+)\) => \{([\s\S]*?)\}\);/g, (match, p1, p2, p3) => {
    const colNameMatch = p1.match(/'([^']+)'/);
    const colName = colNameMatch ? colNameMatch[1] : 'unknown';
    return `onSnapshot(${p1}, (${p2}) => {${p3}}, (error) => console.error('Permission error in query ${colName}:', error));`;
});

fs.writeFileSync('src/App.tsx', content);
