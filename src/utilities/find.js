// find.js
// Concise Node.js function that searches for a file name using the described search pattern.
// It checks (in order) the given string as:
//   - full path
//   - current folder
//   - same directory as the main script
//   - same directory as the executable
//   - several installation locations (with environment-variable expansions)
//   - PATH directories
//   - system root
// If not found it retries with these variations:
//   - ".MyD" appended
//   - "Scripts" prepended (also combined with ".MyD")
// Returns the first match (absolute path) or null if none found.
//
// Usage: call findScriptFile("filename", options)
//   - options may include: installDir (string), exePath (string) to override defaults.
//
// const { findScriptFile } = require('./findScriptFile');

// (async () => {
//     const found = await findScriptFile('myScript.MyD'); // or 'myScript' / 'myScript.txt'
//     console?.log(found ? `Found: ${found}` : 'Not found');
// })();
//
const fs = require('fs').promises;
const path = require('path');
const { accessSync, constants } = require('fs');

function fileExistsSync(p) {
    try {
        accessSync(p, constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

function expandEnvVars(str) {
    if (!str) return str;
    return str.replace(/%([^%]+)%/g, (_, name) => process.env[name] || '');
}

function getPathDirsFromEnv() {
    const PATH = process.env.PATH || process.env.Path || '';
    return PATH.split(path.delimiter).filter(Boolean);
}

function candidateList(baseName, opts = {}) {
    // opts: { installDir, exePath, mainScriptPath }
    const candidates = [];
    const name = baseName;
    const nameWithMyD = baseName.endsWith('.MyD') ? baseName : baseName + '.MyD';
    const scriptsPrefixed = path.join('Scripts', baseName);
    const scriptsPrefixedWithMyD = path.join('Scripts', nameWithMyD);

    // 1. As full path (both variants)
    candidates.push(name);
    candidates.push(nameWithMyD);

    // 2. In current folder
    candidates.push(path.resolve(process.cwd(), name));
    candidates.push(path.resolve(process.cwd(), nameWithMyD));

    // 3. In same directory as main script
    const mainDir = (opts.mainScriptPath && path.dirname(opts.mainScriptPath)) || (require.main && require.main.filename && path.dirname(require.main.filename)) || null;
    if (mainDir) {
        candidates.push(path.join(mainDir, name));
        candidates.push(path.join(mainDir, nameWithMyD));
    }

    // 4. In same directory as executable (opts.exePath or process.execPath)
    const exeDir = (opts.exePath && path.dirname(opts.exePath)) || path.dirname(process.execPath);
    if (exeDir) {
        candidates.push(path.join(exeDir, name));
        candidates.push(path.join(exeDir, nameWithMyD));
    }

    // 5. Installation directory (opts.installDir or common default)
    const defaultInstall = opts.installDir || 'C:\\Program Files\\MyDefrag v4.3.1';
    candidates.push(path.join(defaultInstall, name));
    candidates.push(path.join(defaultInstall, nameWithMyD));

    // 6-8. Several ProgramFiles variations
    const pf = process.env['ProgramFiles'] || process.env['PROGRAMFILES'];
    const pf_x86 = process.env['ProgramFiles(x86)'] || process.env['PROGRAMFILES(X86)'];
    const pf_w6432 = process.env['ProgramW6432'] || process.env['ProgramFilesW6432'];
    const programDirs = [pf, pf_w6432, pf_x86].filter(Boolean);
    for (const pd of programDirs) {
        candidates.push(path.join(pd, 'MyDefrag v4.3.1', name));
        candidates.push(path.join(pd, 'MyDefrag v4.3.1', nameWithMyD));
    }

    // 9. In PATH
    const pathDirs = getPathDirsFromEnv();
    for (const d of pathDirs) {
        candidates.push(path.join(d, name));
        candidates.push(path.join(d, nameWithMyD));
    }

    // 10. SystemRoot
    const sysRoot = process.env['SystemRoot'] || process.env['SYSTEMROOT'] || null;
    if (sysRoot) {
        candidates.push(path.join(sysRoot, name));
        candidates.push(path.join(sysRoot, nameWithMyD));
    }

    // Also include the "Scripts\" prefixed variants for many of the above
    const extended = [];
    for (const c of candidates) {
        // If c already absolute, add Scripts\ prefixed sibling (where sensible)
        const dir = path.isAbsolute(c) ? path.dirname(c) : null;
        if (dir) {
            extended.push(path.join(dir, 'Scripts', path.basename(c)));
        } else {
            extended.push(path.join(process.cwd(), 'Scripts', c));
        }
        // also try .MyD if not already present
        if (!c.endsWith('.MyD')) extended.push(c + '.MyD');
    }

    return [...candidates, ...extended].map(p => p && expandEnvVars(p));
}

async function findScriptFile(baseName, opts = {}) {
    const tried = new Set();
    // Build ordered candidate list once
    const candidates = candidateList(baseName, opts);

    for (const c of candidates) {
        if (!c) continue;
        const normalized = path.resolve(c);
        if (tried.has(normalized)) continue;
        tried.add(normalized);
        if (fileExistsSync(normalized)) return normalized;
    }

    // If still not found, attempt with "Scripts\" prepended to the original baseName variations
    const altCandidates = [
        path.join('Scripts', baseName),
        path.join('Scripts', baseName + '.MyD'),
        path.join(process.cwd(), 'Scripts', baseName),
        path.join(process.cwd(), 'Scripts', baseName + '.MyD')
    ].map(expandEnvVars).map(p => path.resolve(p));

    for (const c of altCandidates) {
        if (tried.has(c)) continue;
        tried.add(c);
        if (fileExistsSync(c)) return c;
    }

    return null;
}

module.exports = { findScriptFile };
