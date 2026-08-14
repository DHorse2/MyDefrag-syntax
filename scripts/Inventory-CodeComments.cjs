'use strict';

const assert = require('assert');
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
const sourceRoots = ['src', 'build', 'scripts'];
const excludedDirectoryNames = new Set([
    'node_modules',
    'tests',
    'test',
    'catalogs',
    'reports',
    'keyword-maps',
    'runs'
]);
const extensionFamilies = new Map([
    ['.js', 'javascript'],
    ['.cjs', 'javascript'],
    ['.mjs', 'javascript'],
    ['.ps1', 'powershell'],
    ['.psm1', 'powershell'],
    ['.psd1', 'powershell'],
    ['.css', 'css'],
    ['.html', 'html'],
    ['.htm', 'html'],
    ['.yml', 'yaml'],
    ['.yaml', 'yaml'],
    ['.sql', 'sql'],
    ['.ini', 'ini']
]);

function codePointLength(value) {
    return Array.from(String(value || '')).length;
}

function buildLineStarts(text) {
    const starts = [0];
    for (let index = 0; index < text.length; index += 1) {
        if (text[index] === '\n') { starts.push(index + 1); }
    }
    return starts;
}

function lineNumberAt(lineStarts, index) {
    let low = 0;
    let high = lineStarts.length - 1;
    while (low <= high) {
        const middle = Math.floor((low + high) / 2);
        if (lineStarts[middle] <= index) {
            low = middle + 1;
        } else {
            high = middle - 1;
        }
    }
    return high + 1;
}

function cleanCommentBody(body, block = false) {
    const lines = String(body || '').split(/\r?\n/u);
    const cleaned = lines.map((line) => {
        const withoutMarker = block ? line.replace(/^\s*\* ?/u, '') : line;
        return withoutMarker.replace(/[\t ]+$/u, '');
    });
    while (cleaned.length > 0 && cleaned[0].trim() === '') { cleaned.shift(); }
    while (cleaned.length > 0 && cleaned.at(-1).trim() === '') { cleaned.pop(); }
    return cleaned.join('\n').trim();
}

function isDirectiveComment(text) {
    return /^(?:#?\s*(?:region|endregion)\b|eslint(?:-disable|-enable)?\b|istanbul\b|c8\b|@ts-|sourceMappingURL\b|sourceURL\b|prettier-ignore\b|webpack\b|requires\b|shellcheck\b)/iu
        .test(String(text || '').trim());
}

function makeComment(sourceText, lineStarts, options) {
    const lineStartIndex = sourceText.lastIndexOf('\n', options.start - 1) + 1;
    const text = cleanCommentBody(options.body, options.block === true);
    const startLine = lineNumberAt(lineStarts, options.start);
    const endIndex = Math.max(options.start, options.end - 1);
    const endLine = lineNumberAt(lineStarts, endIndex);
    return {
        family: options.family,
        type: options.type,
        startIndex: options.start,
        endIndex: options.end,
        line: startLine,
        endLine,
        lineSpan: endLine - startLine + 1,
        placement: sourceText.slice(lineStartIndex, options.start).trim() ? 'inline' : 'standalone',
        text,
        characters: codePointLength(text),
        translatable: /\p{L}/u.test(text),
        directive: isDirectiveComment(text)
    };
}

function readJavaScriptString(text, start) {
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
        if (character === delimiter) { return index + 1; }
        index += 1;
    }
    return text.length;
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

function scanJavaScript(text, lineStarts) {
    const comments = [];
    let index = 0;
    while (index < text.length) {
        if (text.startsWith('//', index)) {
            const end = text.indexOf('\n', index + 2);
            const commentEnd = end === -1 ? text.length : end;
            comments.push(makeComment(text, lineStarts, {
                family: 'javascript',
                type: 'line',
                start: index,
                end: commentEnd,
                body: text.slice(index + 2, commentEnd)
            }));
            index = commentEnd;
            continue;
        }
        if (text.startsWith('/*', index)) {
            const close = text.indexOf('*/', index + 2);
            const commentEnd = close === -1 ? text.length : close + 2;
            comments.push(makeComment(text, lineStarts, {
                family: 'javascript',
                type: text.startsWith('/**', index) ? 'documentation' : 'block',
                start: index,
                end: commentEnd,
                body: text.slice(index + 2, close === -1 ? text.length : close),
                block: true
            }));
            index = commentEnd;
            continue;
        }
        if (text[index] === '\'' || text[index] === '"' || text[index] === '`') {
            index = readJavaScriptString(text, index);
            continue;
        }
        if (text[index] === '/' && isRegexLiteralStart(text, index)) {
            index = readRegexLiteral(text, index);
            continue;
        }
        index += 1;
    }
    return comments;
}

function readPowerShellString(text, start) {
    const delimiter = text[start];
    let index = start + 1;
    while (index < text.length) {
        if (delimiter === '\'' && text[index] === '\'' && text[index + 1] === '\'') {
            index += 2;
            continue;
        }
        if (delimiter === '"' && text[index] === '`') {
            index += 2;
            continue;
        }
        if (text[index] === delimiter) { return index + 1; }
        index += 1;
    }
    return text.length;
}

function readPowerShellHereString(text, start) {
    const quote = text[start + 1];
    const closingPattern = new RegExp(`(?:^|\\r?\\n)[\\t ]*${quote}@`, 'gu');
    closingPattern.lastIndex = start + 2;
    const match = closingPattern.exec(text);
    return match ? match.index + match[0].length : text.length;
}

function scanPowerShell(text, lineStarts) {
    const comments = [];
    let index = 0;
    while (index < text.length) {
        if (text.startsWith('<#', index)) {
            const close = text.indexOf('#>', index + 2);
            const commentEnd = close === -1 ? text.length : close + 2;
            const body = text.slice(index + 2, close === -1 ? text.length : close);
            comments.push(makeComment(text, lineStarts, {
                family: 'powershell',
                type: /^\s*\.(?:SYNOPSIS|DESCRIPTION|PARAMETER)\b/iu.test(body)
                    ? 'documentation'
                    : 'block',
                start: index,
                end: commentEnd,
                body,
                block: true
            }));
            index = commentEnd;
            continue;
        }
        if (text[index] === '@' && (text[index + 1] === '\'' || text[index + 1] === '"')) {
            index = readPowerShellHereString(text, index);
            continue;
        }
        if (text[index] === '\'' || text[index] === '"') {
            index = readPowerShellString(text, index);
            continue;
        }
        if (text[index] === '#') {
            const end = text.indexOf('\n', index + 1);
            const commentEnd = end === -1 ? text.length : end;
            comments.push(makeComment(text, lineStarts, {
                family: 'powershell',
                type: 'line',
                start: index,
                end: commentEnd,
                body: text.slice(index + 1, commentEnd)
            }));
            index = commentEnd;
            continue;
        }
        index += 1;
    }
    return comments;
}

function readQuotedWithDoubledEscape(text, start) {
    const delimiter = text[start];
    let index = start + 1;
    while (index < text.length) {
        if (text[index] === delimiter && text[index + 1] === delimiter) {
            index += 2;
            continue;
        }
        if (text[index] === '\\') {
            index += 2;
            continue;
        }
        if (text[index] === delimiter) { return index + 1; }
        index += 1;
    }
    return text.length;
}

function scanHashComments(text, lineStarts, family) {
    const comments = [];
    let index = 0;
    while (index < text.length) {
        if (text[index] === '\'' || text[index] === '"') {
            index = readQuotedWithDoubledEscape(text, index);
            continue;
        }
        if (text[index] === '#') {
            const end = text.indexOf('\n', index + 1);
            const commentEnd = end === -1 ? text.length : end;
            comments.push(makeComment(text, lineStarts, {
                family,
                type: 'line',
                start: index,
                end: commentEnd,
                body: text.slice(index + 1, commentEnd)
            }));
            index = commentEnd;
            continue;
        }
        index += 1;
    }
    return comments;
}

function scanIniComments(text, lineStarts) {
    const comments = [];
    let index = 0;
    while (index < text.length) {
        if (text[index] === '\'' || text[index] === '"') {
            index = readQuotedWithDoubledEscape(text, index);
            continue;
        }
        if (text[index] === ';' || text[index] === '#') {
            const end = text.indexOf('\n', index + 1);
            const commentEnd = end === -1 ? text.length : end;
            comments.push(makeComment(text, lineStarts, {
                family: 'ini',
                type: 'line',
                start: index,
                end: commentEnd,
                body: text.slice(index + 1, commentEnd)
            }));
            index = commentEnd;
            continue;
        }
        index += 1;
    }
    return comments;
}

function scanSlashBlockComments(text, lineStarts, family) {
    const comments = [];
    let index = 0;
    while (index < text.length) {
        if (text[index] === '\'' || text[index] === '"') {
            index = readQuotedWithDoubledEscape(text, index);
            continue;
        }
        if (text.startsWith('/*', index)) {
            const close = text.indexOf('*/', index + 2);
            const commentEnd = close === -1 ? text.length : close + 2;
            comments.push(makeComment(text, lineStarts, {
                family,
                type: 'block',
                start: index,
                end: commentEnd,
                body: text.slice(index + 2, close === -1 ? text.length : close),
                block: true
            }));
            index = commentEnd;
            continue;
        }
        index += 1;
    }
    return comments;
}

function scanSql(text, lineStarts) {
    const comments = [];
    let index = 0;
    while (index < text.length) {
        if (text[index] === '\'' || text[index] === '"') {
            index = readQuotedWithDoubledEscape(text, index);
            continue;
        }
        if (text.startsWith('/*', index)) {
            const close = text.indexOf('*/', index + 2);
            const commentEnd = close === -1 ? text.length : close + 2;
            comments.push(makeComment(text, lineStarts, {
                family: 'sql',
                type: 'block',
                start: index,
                end: commentEnd,
                body: text.slice(index + 2, close === -1 ? text.length : close),
                block: true
            }));
            index = commentEnd;
            continue;
        }
        if (text.startsWith('--', index)) {
            const end = text.indexOf('\n', index + 2);
            const commentEnd = end === -1 ? text.length : end;
            comments.push(makeComment(text, lineStarts, {
                family: 'sql',
                type: 'line',
                start: index,
                end: commentEnd,
                body: text.slice(index + 2, commentEnd)
            }));
            index = commentEnd;
            continue;
        }
        index += 1;
    }
    return comments;
}

function scanHtml(text, lineStarts) {
    const comments = [];
    let index = 0;
    while ((index = text.indexOf('<!--', index)) !== -1) {
        const close = text.indexOf('-->', index + 4);
        const commentEnd = close === -1 ? text.length : close + 3;
        comments.push(makeComment(text, lineStarts, {
            family: 'html',
            type: 'block',
            start: index,
            end: commentEnd,
            body: text.slice(index + 4, close === -1 ? text.length : close),
            block: true
        }));
        index = commentEnd;
    }
    return comments;
}

function scanText(text, family) {
    const lineStarts = buildLineStarts(text);
    switch (family) {
        case 'javascript': return scanJavaScript(text, lineStarts);
        case 'powershell': return scanPowerShell(text, lineStarts);
        case 'css': return scanSlashBlockComments(text, lineStarts, 'css');
        case 'html': return scanHtml(text, lineStarts);
        case 'yaml': return scanHashComments(text, lineStarts, 'yaml');
        case 'sql': return scanSql(text, lineStarts);
        case 'ini': return scanIniComments(text, lineStarts);
        default: return [];
    }
}

function walk(directory) {
    const results = [];
    if (!fs.existsSync(directory)) { return results; }
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            if (!excludedDirectoryNames.has(entry.name.toLocaleLowerCase())) {
                results.push(...walk(fullPath));
            }
            continue;
        }
        if (!entry.isFile()) { continue; }
        const family = extensionFamilies.get(path.extname(entry.name).toLocaleLowerCase());
        if (!family || /\.(?:test|spec)\.[^.]+$/iu.test(entry.name)) { continue; }
        results.push({ filePath: fullPath, family });
    }
    return results;
}

function summarize(comments) {
    const translatable = comments.filter((comment) => comment.translatable);
    const unique = [...new Set(translatable.map((comment) => comment.text))];
    const commentLineKeys = new Set();
    const types = {};
    const families = {};
    for (const comment of comments) {
        for (let line = comment.line; line <= comment.endLine; line += 1) {
            commentLineKeys.add(`${comment.file}:${line}`);
        }
        const type = types[comment.type] || { occurrences: 0, translatable: 0, characters: 0 };
        type.occurrences += 1;
        if (comment.translatable) {
            type.translatable += 1;
            type.characters += comment.characters;
        }
        types[comment.type] = type;

        const family = families[comment.family] || {
            files: new Set(),
            occurrences: 0,
            commentLines: new Set(),
            translatable: 0,
            characters: 0
        };
        family.files.add(comment.file);
        family.occurrences += 1;
        for (let line = comment.line; line <= comment.endLine; line += 1) {
            family.commentLines.add(`${comment.file}:${line}`);
        }
        if (comment.translatable) {
            family.translatable += 1;
            family.characters += comment.characters;
        }
        families[comment.family] = family;
    }
    return {
        commentOccurrences: comments.length,
        commentLines: commentLineKeys.size,
        translatableOccurrences: translatable.length,
        uniqueTranslatableComments: unique.length,
        charactersAcrossOccurrences: translatable.reduce(
            (total, comment) => total + comment.characters,
            0
        ),
        charactersAcrossUniqueComments: unique.reduce(
            (total, value) => total + codePointLength(value),
            0
        ),
        standaloneComments: comments.filter((comment) => comment.placement === 'standalone').length,
        inlineComments: comments.filter((comment) => comment.placement === 'inline').length,
        directiveComments: comments.filter((comment) => comment.directive).length,
        types,
        families: Object.fromEntries(Object.entries(families).map(([name, family]) => [name, {
            files: family.files.size,
            occurrences: family.occurrences,
            commentLines: family.commentLines.size,
            translatable: family.translatable,
            characters: family.characters
        }]))
    };
}

const sourceFiles = sourceRoots
    .flatMap((relativePath) => walk(path.join(rootDir, relativePath)))
    .sort((left, right) => left.filePath.localeCompare(right.filePath));
const comments = sourceFiles.flatMap(({ filePath, family }) => {
    const relativePath = path.relative(rootDir, filePath).replace(/\\/gu, '/');
    return scanText(fs.readFileSync(filePath, 'utf8'), family).map((comment) => ({
        file: relativePath,
        ...comment
    }));
});
const summary = summarize(comments);
const localeRegistryPath = path.join(rootDir, 'language', 'locales', 'locales.json');
const localeRegistry = JSON.parse(fs.readFileSync(localeRegistryPath, 'utf8'));
const targetLocales = (localeRegistry.locales || [])
    .map((locale) => locale.id)
    .filter((localeId) => localeId && localeId !== 'en');
const sourceCharactersPerLocale = summary.charactersAcrossOccurrences;
const minimumBatchesPerLocale = Math.max(1, Math.ceil(sourceCharactersPerLocale / (128 * 1024)));

const report = {
    scope: {
        roots: sourceRoots,
        extensions: [...extensionFamilies.keys()],
        filesScanned: sourceFiles.length,
        filesByFamily: Object.fromEntries([...extensionFamilies.values()]
            .filter((value, index, values) => values.indexOf(value) === index)
            .map((family) => [
                family,
                sourceFiles.filter((sourceFile) => sourceFile.family === family).length
            ])),
        exclusions: [...excludedDirectoryNames, '*.test.*', '*.spec.*']
    },
    summary,
    localization: {
        localeRegistry: path.relative(rootDir, localeRegistryPath).replace(/\\/gu, '/'),
        targetLocales,
        targetLocaleCount: targetLocales.length,
        occurrenceCharacterUpperBound: summary.charactersAcrossOccurrences * targetLocales.length,
        uniqueCharacterUpperBound: summary.charactersAcrossUniqueComments * targetLocales.length,
        minimumBatchesPerLocale,
        minimumBatchedRequestCount: minimumBatchesPerLocale * targetLocales.length,
        oneRequestPerCommentUpperBound: summary.translatableOccurrences * targetLocales.length,
        sourceCharactersFitSingle128KiBRequest: sourceCharactersPerLocale < 128 * 1024
    },
    comments
};

function markdownCell(value) {
    return String(value ?? '')
        .replace(/\|/gu, '\\|')
        .replace(/\r?\n/gu, ' ')
        .replace(/`/gu, '\\`')
        .replace(/</gu, '&lt;')
        .replace(/>/gu, '&gt;');
}

function wrapParagraph(value, width = 80) {
    const words = String(value || '').split(/\s+/u).filter(Boolean);
    const lines = [];
    let line = '';
    for (const word of words) {
        if (!line) {
            line = word;
        } else if (line.length + word.length + 1 <= width) {
            line += ` ${word}`;
        } else {
            lines.push(line);
            line = word;
        }
    }
    if (line) { lines.push(line); }
    return lines;
}

function renderDetailedMarkdown(inventory) {
    const output = [
        '# Code Comment Inventory',
        '',
        '> Generated by `npm run inventory:comments`.',
        '',
        '<!-- markdownlint-disable MD013 MD033 MD037 MD052 MD060 -->',
        '',
        '## Scope',
        '',
        `- Production code files scanned: ${inventory.scope.filesScanned}`,
        `- Roots: ${inventory.scope.roots.map((item) => `\`${item}\``).join(', ')}`,
        `- Extensions: ${inventory.scope.extensions.map((item) => `\`${item}\``).join(', ')}`,
        `- Exclusions: ${inventory.scope.exclusions.map((item) => `\`${item}\``).join(', ')}`,
        '- Comment markers inside strings and regular-expression literals are excluded.',
        '',
        '## Summary',
        '',
        `- Comment occurrences: ${inventory.summary.commentOccurrences}`,
        `- Source lines containing comments: ${inventory.summary.commentLines}`,
        `- Translatable comment occurrences: ${inventory.summary.translatableOccurrences}`,
        `- Unique translatable comments: ${inventory.summary.uniqueTranslatableComments}`,
        `- Characters across translatable occurrences: ${inventory.summary.charactersAcrossOccurrences}`,
        `- Characters across unique translatable comments: ${inventory.summary.charactersAcrossUniqueComments}`,
        `- Standalone comments: ${inventory.summary.standaloneComments}`,
        `- Inline comments: ${inventory.summary.inlineComments}`,
        `- Directive comments: ${inventory.summary.directiveComments}`,
        '',
        '| Language family | Files scanned | Files with comments | Comments | Comment lines | Translatable | Characters |',
        '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
        ...Object.entries(inventory.scope.filesByFamily).map(([family, filesScanned]) => {
            const details = inventory.summary.families[family] || {
                files: 0,
                occurrences: 0,
                commentLines: 0,
                translatable: 0,
                characters: 0
            };
            return `| ${family} | ${filesScanned} | ${details.files} | ${details.occurrences} | `
                + `${details.commentLines} | ${details.translatable} | ${details.characters} |`;
        }),
        '',
        '## DeepL resource upper bound',
        '',
        `- Configured non-English locales: ${inventory.localization.targetLocaleCount}`,
        `- Characters if every occurrence is translated into every locale: ${inventory.localization.occurrenceCharacterUpperBound}`,
        `- Characters with exact-comment deduplication: ${inventory.localization.uniqueCharacterUpperBound}`,
        `- Minimum 128-KiB source-text batches: ${inventory.localization.minimumBatchedRequestCount}`,
        `- One-request-per-comment path requests: ${inventory.localization.oneRequestPerCommentUpperBound}`,
        `- Source text fits one 128-KiB request per locale: ${inventory.localization.sourceCharactersFitSingle128KiBRequest ? 'yes' : 'no'}`,
        '',
        '## Comments',
        '',
        '| # | Source | Family | Type | Placement | Lines | Characters | Translatable | Directive | Text |',
        '| ---: | --- | --- | --- | --- | ---: | ---: | --- | --- | --- |'
    ];
    inventory.comments.forEach((comment, index) => {
        output.push(
            `| ${index + 1} | ${markdownCell(`${comment.file}:${comment.line}`)} | `
            + `${comment.family} | ${comment.type} | ${comment.placement} | ${comment.lineSpan} | `
            + `${comment.characters} | ${comment.translatable ? 'yes' : 'no'} | `
            + `${comment.directive ? 'yes' : 'no'} | ${markdownCell(comment.text)} |`
        );
    });
    return output.join('\n');
}

function renderShortMarkdown(inventory) {
    const output = [
        '# Code Comment Text Inventory',
        '',
        '> Generated by `npm run inventory:comments`.',
        '',
        '## Scope',
        '',
        ...wrapParagraph(
            `Scanned ${inventory.scope.filesScanned} production code files under `
            + `${inventory.scope.roots.map((item) => `\`${item}\``).join(', ')}. `
            + 'Tests, generated catalogs/reports, dependencies, and documentation files were excluded.'
        ),
        '',
        '## Findings',
        '',
        `- Comment occurrences: ${inventory.summary.commentOccurrences}`,
        `- Source lines containing comments: ${inventory.summary.commentLines}`,
        `- Translatable comment occurrences: ${inventory.summary.translatableOccurrences}`,
        `- Unique translatable comments: ${inventory.summary.uniqueTranslatableComments}`,
        `- Source characters: ${inventory.summary.charactersAcrossOccurrences}`,
        `- Directive comments: ${inventory.summary.directiveComments}`,
        '',
        '| Language | Files scanned/commented | Comments | Translatable | Characters |',
        '| --- | ---: | ---: | ---: | ---: |',
        ...Object.entries(inventory.scope.filesByFamily).map(([family, filesScanned]) => {
            const details = inventory.summary.families[family] || {
                files: 0,
                occurrences: 0,
                translatable: 0,
                characters: 0
            };
            return `| ${family} | ${filesScanned}/${details.files} | ${details.occurrences} | `
                + `${details.translatable} | ${details.characters} |`;
        }),
        '',
        '## DeepL estimate',
        '',
        ...wrapParagraph(
            `The locale registry contains ${inventory.localization.targetLocaleCount} non-English locales. `
            + `Translating every comment occurrence into every configured locale is an upper bound of `
            + `${inventory.localization.occurrenceCharacterUpperBound} source characters. `
            + `Exact-comment deduplication lowers this to ${inventory.localization.uniqueCharacterUpperBound}.`
        ),
        '',
        ...wrapParagraph(
            `The inventory needs at least ${inventory.localization.minimumBatchedRequestCount} `
            + `128-KiB source-text batches across all locales, or `
            + `${inventory.localization.oneRequestPerCommentUpperBound} requests with one comment per request.`
        ),
        '',
        '## Boundaries',
        '',
        ...wrapParagraph(
            'The estimate includes every comment containing letters, including technical notes, disabled '
            + 'code, and directives. Translation suitability requires review. Markers inside quoted '
            + 'strings and JavaScript regular-expression literals are excluded. HTML scanning counts '
            + 'HTML comments, while JavaScript and CSS embedded inside HTML are outside this pass.'
        ),
        '',
        'Detailed evidence: `scripts/Comment-Strings.md`.'
    ];
    return output.join('\n');
}

function writeOutput(relativePath, content) {
    const resolvedPath = path.resolve(rootDir, relativePath);
    fs.writeFileSync(resolvedPath, `${content}\n`, 'utf8');
    return path.relative(rootDir, resolvedPath);
}

function runSelfTest() {
    const javascript = scanText(
        'const url = "https://example.test/a//b"; // line\n'
        + 'const re = /\\/\\/*/; /* block */\n/** docs */\n',
        'javascript'
    );
    assert.deepEqual(javascript.map((comment) => comment.type), [
        'line',
        'block',
        'documentation'
    ]);
    assert.deepEqual(scanText('"# text"\n$x = 1 # line\n<# block #>\n', 'powershell')
        .map((comment) => comment.text), ['line', 'block']);
    assert.equal(scanText('a { color: red; /* style */ }', 'css').length, 1);
    assert.equal(scanText('<div><!-- markup --></div>', 'html').length, 1);
    assert.equal(scanText('name: "# text" # yaml\n', 'yaml').length, 1);
    assert.equal(scanText("select '--'; -- sql\n/* block -- text */", 'sql').length, 2);
    assert.equal(scanText('value="; text"\n; ini\n', 'ini').length, 1);
    console.log('Comment inventory self-test passed');
}

if (require.main === module) {
    if (process.argv.includes('--self-test')) {
        runSelfTest();
        process.exit(0);
    }
    if (process.argv.includes('--write')) {
        const reportPath = writeOutput('scripts/Comment-Report.md', renderShortMarkdown(report));
        const listPath = writeOutput('scripts/Comment-Strings.md', renderDetailedMarkdown(report));
        console.log(`Comment inventory written: ${reportPath}; ${listPath}`);
        process.exit(0);
    }
    const outputIndex = process.argv.indexOf('--output');
    const outputPath = outputIndex >= 0 ? process.argv[outputIndex + 1] : null;
    const rendered = process.argv.includes('--short')
        ? renderShortMarkdown(report)
        : process.argv.includes('--markdown')
            ? renderDetailedMarkdown(report)
            : JSON.stringify(report, null, 2);
    if (outputPath) {
        console.log(writeOutput(outputPath, rendered));
    } else {
        console.log(rendered);
    }
}

module.exports = {
    report,
    renderDetailedMarkdown,
    renderShortMarkdown,
    scanText,
    summarize
};
