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

const localeRegistryPath = path.join(rootDir, 'language', 'locales', 'locales.json');
const localeRegistry = JSON.parse(fs.readFileSync(localeRegistryPath, 'utf8'));
const targetLocales = (localeRegistry.locales || [])
    .map((locale) => locale.id)
    .filter((localeId) => localeId && localeId !== 'en');

const loggerDetails = calls
    .filter((call) => call.category === 'logger-api')
    .map((call) => ({
        file: call.file,
        line: call.line,
        object: call.object,
        method: call.method,
        literals: call.literals,
        strings: call.literals.map((literal) => literal.text),
        translatableStrings: call.literals.filter((literal) => literal.translatable).map((literal) => literal.text)
    }));

const report = {
    scope: {
        roots: sourceRoots,
        productionFilesScanned: files.length,
        exclusions: [...excludedDirectoryNames, '*.test.js', '*.spec.js']
    },
    categories,
    localization: {
        localeRegistry: path.relative(rootDir, localeRegistryPath).replace(/\\/gu, '/'),
        targetLocales,
        targetLocaleCount: targetLocales.length,
        occurrenceCharacterUpperBound: categories['logger-api'].charactersAcrossOccurrences
            * targetLocales.length,
        uniqueCharacterUpperBound: categories['logger-api'].charactersAcrossUniqueLiterals
            * targetLocales.length,
        batchedBuildRequestUpperBound: targetLocales.length,
        oneRequestPerEntryUpperBound: categories['logger-api'].translatableLiteralOccurrences
            * targetLocales.length,
        uniqueOneRequestPerEntryUpperBound: categories['logger-api'].uniqueTranslatableLiterals
            * targetLocales.length
    },
    loggerDetails
};

function markdownCell(value) {
    return String(value ?? '')
        .replace(/\|/gu, '\\|')
        .replace(/\r?\n/gu, ' ')
        .replace(/`/gu, '\\`');
}

function methodDetailsFor(inventory) {
    const methodDetails = {};
    for (const call of inventory.loggerDetails) {
        const details = methodDetails[call.method] || {
            calls: 0,
            literals: 0,
            translatable: 0,
            characters: 0
        };
        details.calls += 1;
        for (const literal of call.literals) {
            details.literals += 1;
            if (literal.translatable) {
                details.translatable += 1;
                details.characters += literal.characters;
            }
        }
        methodDetails[call.method] = details;
    }
    return methodDetails;
}

function renderMarkdown(inventory) {
    const summary = inventory.categories['logger-api'];
    const methodDetails = methodDetailsFor(inventory);
    const output = [
        '# Logger String Inventory',
        '',
        '> Generated by `npm run inventory:logger`.',
        '',
        '<!-- markdownlint-disable MD013 MD033 MD060 -->',
        '',
        '## Scope',
        '',
        `- Production JavaScript files scanned: ${inventory.scope.productionFilesScanned}`,
        `- Roots: ${inventory.scope.roots.map((item) => `\`${item}\``).join(', ')}`,
        `- Exclusions: ${inventory.scope.exclusions.map((item) => `\`${item}\``).join(', ')}`,
        '- Comments and commented-out calls are excluded.',
        '- Logger-like objects are identifiers ending in `logger`, case-insensitively.',
        '',
        '## Summary',
        '',
        `- Logger call sites: ${summary.callSites}`,
        `- Calls containing literal strings: ${summary.callsWithLiteralStrings}`,
        `- Literal string fragments: ${summary.literalFragments}`,
        `- Translatable literal occurrences: ${summary.translatableLiteralOccurrences}`,
        `- Unique translatable literals: ${summary.uniqueTranslatableLiterals}`,
        `- Characters across translatable occurrences: ${summary.charactersAcrossOccurrences}`,
        `- Characters across unique translatable literals: ${summary.charactersAcrossUniqueLiterals}`,
        '',
        '| Method | Call sites | Literals | Translatable | Characters |',
        '| --- | ---: | ---: | ---: | ---: |',
        ...Object.entries(methodDetails).map(([method, details]) => (
            `| ${method} | ${details.calls} | ${details.literals} | `
            + `${details.translatable} | ${details.characters} |`
        )),
        '',
        '## DeepL resource upper bound',
        '',
        `- Configured non-English locales: ${inventory.localization.targetLocaleCount}`,
        `- Locale IDs: ${inventory.localization.targetLocales.map((item) => `\`${item}\``).join(', ')}`,
        `- Characters if every occurrence is translated into every locale: ${inventory.localization.occurrenceCharacterUpperBound}`,
        `- Characters with exact-string deduplication: ${inventory.localization.uniqueCharacterUpperBound}`,
        `- Batched build path requests: ${inventory.localization.batchedBuildRequestUpperBound}`,
        `- One-request-per-entry path requests: ${inventory.localization.oneRequestPerEntryUpperBound}`,
        `- Deduplicated one-request-per-entry path requests: ${inventory.localization.uniqueOneRequestPerEntryUpperBound}`,
        '- These are safe upper bounds before existing translations and the live DeepL supported-language filter are applied.',
        '',
        '## Literal strings',
        '',
        '| # | Source | Method | Characters | Translatable | String |',
        '| ---: | --- | --- | ---: | --- | --- |'
    ];

    let sequence = 0;
    for (const call of inventory.loggerDetails) {
        for (const literal of call.literals) {
            sequence += 1;
            output.push(
                `| ${sequence} | ${markdownCell(`${call.file}:${literal.line}`)} | ${call.method} | `
                + `${literal.characters} | ${literal.translatable ? 'yes' : 'no'} | ${markdownCell(literal.text)} |`
            );
        }
    }

    output.push(
        '',
        '## Dynamic-only logger calls',
        '',
        'These calls receive messages from variables or expressions and have no direct string literal to count.',
        '',
        '| Source | Method |',
        '| --- | --- |',
        ...inventory.loggerDetails
            .filter((call) => call.literals.length === 0)
            .map((call) => `| ${markdownCell(`${call.file}:${call.line}`)} | ${call.method} |`)
    );
    return output.join('\n');
}

function renderShortMarkdown(inventory) {
    const summary = inventory.categories['logger-api'];
    const methodDetails = methodDetailsFor(inventory);
    const operational = inventory.loggerDetails
        .filter((call) => call.method !== 'dbg')
        .flatMap((call) => call.literals)
        .filter((literal) => literal.translatable);
    const operationalCharacters = operational.reduce(
        (total, literal) => total + literal.characters,
        0
    );
    const dynamicOnly = inventory.loggerDetails.filter((call) => call.literals.length === 0).length;
    const output = [
        '# Logging Text Inventory',
        '',
        '> Generated by `npm run inventory:logger`.',
        '',
        '## Scope',
        '',
        `Scanned ${inventory.scope.productionFilesScanned} production JavaScript files under `
        + `${inventory.scope.roots.map((item) => `\`${item}\``).join(' and ')}. Tests, generated`,
        'catalogs/reports, dependencies, comments, and commented-out calls were',
        'excluded.',
        '',
        '## Findings',
        '',
        `- Active logger call sites: ${summary.callSites}`,
        `- Literal fragments: ${summary.literalFragments}`,
        `- Translatable literal occurrences: ${summary.translatableLiteralOccurrences}`,
        `- Unique translatable literals: ${summary.uniqueTranslatableLiterals}`,
        `- Source characters: ${summary.charactersAcrossOccurrences}`,
        `- Dynamic-only logger calls: ${dynamicOnly}`,
        '',
        '| Method | Calls | Translatable literals | Characters |',
        '| --- | ---: | ---: | ---: |',
        ...Object.entries(methodDetails).map(([method, details]) => (
            `| ${method} | ${details.calls} | ${details.translatable} | ${details.characters} |`
        )),
        '',
        'Debug logging is the largest portion: '
        + `${methodDetails.dbg.translatable} strings and ${methodDetails.dbg.characters} characters.`,
        `All non-debug logger levels together contain ${operational.length} strings and`,
        `${operationalCharacters} characters.`,
        '',
        '## DeepL estimate',
        '',
        `The locale registry contains ${inventory.localization.targetLocaleCount} non-English locales.`,
        'Translating every occurrence into every configured locale is an upper',
        `bound of ${inventory.localization.occurrenceCharacterUpperBound} source characters. Exact-string deduplication lowers this`,
        `slightly to ${inventory.localization.uniqueCharacterUpperBound}.`,
        '',
        `The batched build path would need at most ${inventory.localization.batchedBuildRequestUpperBound} translation requests.`,
        `The one-entry-at-a-time fallback path would need ${inventory.localization.oneRequestPerEntryUpperBound} requests. Existing`,
        'translations and the live supported-language filter can reduce both totals.',
        '',
        '## Boundaries',
        '',
        `The primary count covers direct literals in \`logger.*\` calls. The ${dynamicOnly}`,
        'dynamic-only calls are listed in the detailed inventory but require a',
        'separate data-flow review to count their possible runtime messages. Console',
        'logging and startup diagnostics were measured by the scanner but excluded',
        'from this logger-only estimate.',
        '',
        'Detailed evidence: `build/language/reports/inventory/Logger-Strings.md`.'
    ];
    return output.join('\n');
}

function writeOutput(relativePath, content) {
    const resolvedPath = path.resolve(rootDir, relativePath);
    fs.writeFileSync(resolvedPath, `${content}\n`, 'utf8');
    return path.relative(rootDir, resolvedPath);
}

if (require.main === module) {
    if (process.argv.includes('--write')) {
        const reportPath = writeOutput(
            'build/language/reports/inventory/Logger-Report.md',
            renderShortMarkdown(report)
        );
        const listPath = writeOutput(
            'build/language/reports/inventory/Logger-Strings.md',
            renderMarkdown(report)
        );
        console.log(`Logger inventory written: ${reportPath}; ${listPath}`);
        process.exit(0);
    }
    const outputIndex = process.argv.indexOf('--output');
    const outputPath = outputIndex >= 0 ? process.argv[outputIndex + 1] : null;
    const rendered = process.argv.includes('--short')
        ? renderShortMarkdown(report)
        : process.argv.includes('--markdown')
            ? renderMarkdown(report)
            : JSON.stringify(report, null, 2);
    if (outputPath) {
        console.log(writeOutput(outputPath, rendered));
    } else {
        console.log(rendered);
    }
}

module.exports = {
    report,
    renderMarkdown,
    renderShortMarkdown,
    scanFile,
    summarize
};
