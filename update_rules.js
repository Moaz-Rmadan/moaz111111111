const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf8');

rules = rules.replace(/request\.auth\.uid/g, "getUserId()");

// we need to add the getUserId function inside the Helper Functions section
const helperFunc = `    function getUserId() {\n      return request.auth.token.email != null ? request.auth.token.email : request.auth.uid;\n    }\n`;

rules = rules.replace(/function isAuthenticated\(\) \{/, helperFunc + "    function isAuthenticated() {");

fs.writeFileSync('firestore.rules', rules);
