'use strict';
// ini.js
let debugOn = false;
let verbose = 1;
// Ini Reader
function readIni(filePath) {
    const text = fs.readFileSync(filePath, 'utf8');

    // very basic INI parser (example)
    const result = {};
    let section = null;

    for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('#')) continue;

        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            section = trimmed.slice(1, -1);
            result[section] = {};
        } else {
            const [key, ...rest] = trimmed.split('=');
            const value = rest.join('=').trim();

            if (section) result[section][key.trim()] = value;
            else result[key.trim()] = value;
        }
    }

    return result;
}
