'use strict';

const fs = require('fs');
const path = require('path');

function findProjectRoot(startDirectory) {
    let directory = path.resolve(startDirectory);
    while (true) {
        if (fs.existsSync(path.join(directory, 'package.json'))
            && fs.existsSync(path.join(directory, 'src'))) {
            return directory;
        }
        const parent = path.dirname(directory);
        if (parent === directory) {
            throw new Error(`Unable to find the project root above ${startDirectory}.`);
        }
        directory = parent;
    }
}

const rootDir = findProjectRoot(__dirname);
const sourceRoots = ['src', 'build'];
const excludedDirectoryNames = new Set([
    'node_modules',
    'tests',
    'test',
    'catalogs',
    'reports',
    'keyword-maps'
]);
const loggingMethods = new Set([
    'dbg',
    'debug',
    'info',
    'hint',
    'warn',
    'warning',
    'err',
    'error',
    'fatal',
    'message',
    'messageDetail',
    'log',
    'logToConsole',
    'trace'
]);

function codePointLength(value) {
    return Array.from(String(value || '')).length;
}

function normalizeLiteral(rawValue) {
    return rawValue
        .replace(/\\n/gu, ' ')
        .replace(/\\r/gu, ' ')
        .replace(/\s+/gu, ' ')
        .trim();
}

function lineNumberAt(text, index) {
    let line = 1;
    for (let offset = 0; offset < index; offset += 1) {
        if (text[offset] === '\n') { line += 1; }
    }
    return line;
}

function skipWhitespace(text, start) {
    let index = start;
    while (index < text.length && /\s/u.test(text[index])) { index += 1; }
    return index;
}

function readIdentifier(text, start) {
    if (!/[A-Za-z_$]/u.test(text[start] || '')) { return null; }
    let end = start + 1;
    while (end < text.length && /[A-Za-z0-9_$]/u.test(text[end])) { end += 1; }
    return { value: text.slice(start, end), end };
}

function readString(text, start) {
    const delimiter = text[start];
    let index = start + 1;
    let escaped = false;
    while (index < text.length) {
        const character = text[index];
        if (escaped) {
            escaped = false;
            index += 1;
            continue;
        }
        if (character === '\\') {
            escaped = true;
            index += 1;
            continue;
        }
        if (character === delimiter) {
            return {
                delimiter,
                rawValue: text.slice(start + 1, index),
                end: index + 1
            };
        }
        index += 1;
    }
    return {
        delimiter,
        rawValue: text.slice(start + 1),
        end: text.length
    };
}

function isRegexLiteralStart(text, start) {
    let index = start - 1;
    while (index >= 0 && /\s/u.test(text[index])) { index -= 1; }
    if (index < 0) { return true; }
    return /[=(:,!&|?;{}\[\]+*%^~<>-]/u.test(text[index]);
}

function readRegexLiteral(text, start) {
    let index = start + 1;
    let escaped = false;
    let inCharacterClass = false;
    while (index < text.length) {
        const character = text[index];
        if (escaped) {
            escaped = false;
            index += 1;
            continue;
        }
        if (character === '\\') {
            escaped = true;
            index += 1;
            continue;
        }
        if (character === '[') { inCharacterClass = true; }
        if (character === ']') { inCharacterClass = false; }
        if (character === '/' && !inCharacterClass) {
            index += 1;
            while (index < text.length && /[A-Za-z]/u.test(text[index])) { index += 1; }
            return index;
        }
        if (character === '\n' || character === '\r') { return start + 1; }
        index += 1;
    }
    return start + 1;
}

function memberSeparatorEnd(text, start) {
    const index = skipWhitespace(text, start);
    if (text.startsWith('?.', index)) { return index + 2; }
    if (text[index] === '.') { return index + 1; }
    return null;
}

function openingParenIndex(text, start) {
    let index = skipWhitespace(text, start);
    if (text.startsWith('?.', index)) { index = skipWhitespace(text, index + 2); }
    return text[index] === '(' ? index : null;
}

function readCall(text, openingParen) {
    let index = openingParen + 1;
    let depth = 1;
    const literals = [];
    while (index < text.length && depth > 0) {
        if (text.startsWith('//', index)) {
            const newline = text.indexOf('\n', index + 2);
            index = newline === -1 ? text.length : newline + 1;
            continue;
        }
        if (text.startsWith('/*', index)) {
            const close = text.indexOf('*/', index + 2);
            index = close === -1 ? text.length : close + 2;
            continue;
        }
        if (text[index] === '/' && isRegexLiteralStart(text, index)) {
            index = readRegexLiteral(text, index);
            continue;
        }
        if (text[index] === '\'' || text[index] === '"' || text[index] === '`') {
            const literal = readString(text, index);
            if (depth === 1) {
                const normalized = normalizeLiteral(literal.rawValue);
                literals.push({
                    line: lineNumberAt(text, index),
                    delimiter: literal.delimiter,
                    text: normalized,
                    characters: codePointLength(normalized),
                    translatable: /\p{L}/u.test(normalized)
                });
            }
            index = literal.end;
            continue;
        }
        if (text[index] === '(') { depth += 1; }
        if (text[index] === ')') { depth -= 1; }
        index += 1;
    }
    return { literals, end: index };
}

function classifyLogger(objectName) {
    if (/logger$/iu.test(objectName)) { return 'logger-api'; }
    if (objectName === 'console') { return 'console'; }
    if (objectName === 'startupDiagnostics') { return 'startup-diagnostics'; }
    return null;
}

function scanFile(filePath) {
    const text = fs.readFileSync(filePath, 'utf8');
    const calls = [];
    let index = 0;
    while (index < text.length) {
        if (text.startsWith('//', index)) {
            const newline = text.indexOf('\n', index + 2);
            index = newline === -1 ? text.length : newline + 1;
            continue;
        }
        if (text.startsWith('/*', index)) {
            const close = text.indexOf('*/', index + 2);
            index = close === -1 ? text.length : close + 2;
            continue;
        }
        if (text[index] === '/' && isRegexLiteralStart(text, index)) {
            index = readRegexLiteral(text, index);
            continue;
        }
        if (text[index] === '\'' || text[index] === '"' || text[index] === '`') {
            index = readString(text, index).end;
            continue;
        }

        const objectToken = readIdentifier(text, index);
        if (!objectToken) {
            index += 1;
            continue;
        }
        const category = classifyLogger(objectToken.value);
        const separatorEnd = memberSeparatorEnd(text, objectToken.end);
        if (!category || separatorEnd === null) {
            index = objectToken.end;
            continue;
        }
        const methodStart = skipWhitespace(text, separatorEnd);
        const methodToken = readIdentifier(text, methodStart);
        if (!methodToken || !loggingMethods.has(methodToken.value)) {
            index = objectToken.end;
            continue;
        }
        const openingParen = openingParenIndex(text, methodToken.end);
        if (openingParen === null) {
            index = objectToken.end;
            continue;
        }
        const call = readCall(text, openingParen);
        calls.push({
            category,
            object: objectToken.value,
            method: methodToken.value,
            line: lineNumberAt(text, index),
            literals: call.literals
        });
        index = call.end;
    }
    return calls;
}

function walk(directory) {
    const results = [];
    if (!fs.existsSync(directory)) { return results; }
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            if (!excludedDirectoryNames.has(entry.name)) { results.push(...walk(fullPath)); }
            continue;
        }
        if (!entry.isFile() || !/\.(?:c?js|mjs)$/iu.test(entry.name)) { continue; }
        if (/\.(?:test|spec)\.js$/iu.test(entry.name)) { continue; }
        results.push(fullPath);
    }
    return results;
}

function summarize(calls) {
    const literals = calls.flatMap((call) => call.literals);
    const translatable = literals.filter((literal) => literal.translatable);
    const unique = [...new Set(translatable.map((literal) => literal.text))];
    const methods = {};
    for (const call of calls) {
        methods[call.method] = (methods[call.method] || 0) + 1;
    }
    return {
        callSites: calls.length,
        callsWithLiteralStrings: calls.filter((call) => call.literals.length > 0).length,
        literalFragments: literals.length,
        translatableLiteralOccurrences: translatable.length,
        uniqueTranslatableLiterals: unique.length,
        charactersAcrossOccurrences: translatable.reduce((total, literal) => total + literal.characters, 0),
        charactersAcrossUniqueLiterals: unique.reduce((total, value) => total + codePointLength(value), 0),
        methods
    };
}

const files = sourceRoots.flatMap((relativePath) => walk(path.join(rootDir, relativePath)));
const calls = files.flatMap((filePath) => scanFile(filePath).map((call) => ({
    file: path.relative(rootDir, filePath).replace(/\\/gu, '/'),
    ...call
})));
const categories = {};
for (const category of ['logger-api', 'console', 'startup-diagnostics']) {
    categories[category] = summarize(calls.filter((call) => call.category === category));
}

const loggerDetails = calls
    .filter((call) => call.category === 'logger-api')
    .map((call) => ({
        file: call.file,
        line: call.line,
        object: call.object,
        method: call.method,
        strings: call.literals.map((literal) => literal.text),
        translatableStrings: call.literals.filter((literal) => literal.translatable).map((literal) => literal.text)
    }));

console.log(JSON.stringify({
    scope: {
        roots: sourceRoots,
        productionFilesScanned: files.length,
        exclusions: [...excludedDirectoryNames, '*.test.js', '*.spec.js']
    },
    categories,
    loggerDetails
}, null, 2));
