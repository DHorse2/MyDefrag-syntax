// generate-vscodeignore.js
const fs = require('fs');
const patterns = [
    '.user',
    'doc', 'docs', 'lib', 'build', 'coverage', 'dist', 'out', 'tmp', 'temp',
    '.user', '.git', '.github', '.vscode', '.vs', '.idea', 'node_modules',
    '.turbo', '.parcel-cache', '.yalc',
    '*.bat', '*.cmd', '*.bak', '*.tmp', 'temp.txt', 'package-lock.json', 'yarn.lock',
    '*.map', '*.tsbuildinfo'
];
fs.writeFileSync('.vscodeignore', patterns.join('\n') + '\n', 'utf8');
console.log('.vscodeignore written (' + patterns.length + ' patterns)');
