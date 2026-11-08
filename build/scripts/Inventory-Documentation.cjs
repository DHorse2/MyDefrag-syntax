'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function findProjectRoot(startDirectory) {
    let directory = path.resolve(startDirectory);
    while (true) {
        if (fs.existsSync(path.join(directory, 'package.json'))
            && fs.existsSync(path.join(directory, 'docs'))) {
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
const documentationRoot = 'docs';
const knownTextExtensions = new Set([
    '.adoc', '.bak', '.base', '.bnf', '.css', '.csv', '.data', '.hhc', '.hhk',
    '.htm', '.html', '.ini', '.js', '.json', '.log', '.markdown', '.md', '.mjs',
    '.ps1', '.rst', '.sql', '.tsv', '.txt', '.xml', '.yaml', '.yml'
]);
const knownBinaryExtensions = new Set([
    '.7z', '.chm', '.chw', '.doc', '.docx', '.gif', '.ico', '.jpeg', '.jpg',
    '.pdf', '.png', '.webp', '.xls', '.xlsx', '.zip'
]);

function walk(directory) {
    const files = [];
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...walk(fullPath));
        } else if (entry.isFile()) {
            files.push(fullPath);
        }
    }
    return files;
}

function decodeUtf16Be(buffer) {
    const swapped = Buffer.allocUnsafe(buffer.length - (buffer.length % 2));
    for (let index = 0; index < swapped.length; index += 2) {
        swapped[index] = buffer[index + 1];
        swapped[index + 1] = buffer[index];
    }
    return swapped.toString('utf16le');
}

function decodeText(buffer) {
    if (buffer.length >= 3
        && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
        return { encoding: 'utf8-bom', text: buffer.subarray(3).toString('utf8') };
    }
    if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
        return { encoding: 'utf16le', text: buffer.subarray(2).toString('utf16le') };
    }
    if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
        return { encoding: 'utf16be', text: decodeUtf16Be(buffer.subarray(2)) };
    }
    try {
        return {
            encoding: 'utf8',
            text: new TextDecoder('utf-8', { fatal: true }).decode(buffer)
        };
    } catch (_error) {
        return {
            encoding: 'windows-1252',
            text: new TextDecoder('windows-1252').decode(buffer)
        };
    }
}

function looksLikeText(buffer, extension) {
    if (knownBinaryExtensions.has(extension)) { return false; }
    if (knownTextExtensions.has(extension)) { return true; }
    if (buffer.length === 0) { return true; }
    let controlBytes = 0;
    for (const byte of buffer) {
        if (byte === 0) { return false; }
        if (byte < 0x20 && byte !== 0x09 && byte !== 0x0A && byte !== 0x0C
            && byte !== 0x0D) {
            controlBytes += 1;
        }
    }
    return controlBytes <= Math.max(4, Math.floor(buffer.length * 0.01));
}

function countWords(text) {
    return (String(text || '').match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu) || []).length;
}

function codePointLength(value) {
    return Array.from(String(value || '')).length;
}

function extensionLabel(filePath) {
    return path.extname(filePath).toLocaleLowerCase() || '[none]';
}

function sum(items, key) {
    return items.reduce((total, item) => total + (item[key] || 0), 0);
}

function formatNumber(value) {
    return new Intl.NumberFormat('en-US').format(value);
}

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

function buildReport() {
    const documentationPath = path.join(rootDir, documentationRoot);
    const files = walk(documentationPath)
        .map((filePath) => {
            const buffer = fs.readFileSync(filePath);
            const extension = extensionLabel(filePath);
            const textFile = looksLikeText(buffer, extension);
            const decoded = textFile ? decodeText(buffer) : null;
            return {
                file: path.relative(rootDir, filePath).replace(/\\/gu, '/'),
                extension,
                kind: textFile ? 'text' : 'binary',
                encoding: decoded?.encoding || null,
                words: decoded ? countWords(decoded.text) : 0,
                bytes: buffer.length,
                characters: decoded ? codePointLength(decoded.text) : 0,
                contentHash: crypto.createHash('sha256').update(buffer).digest('hex')
            };
        })
        .sort((left, right) => left.file.localeCompare(right.file));
    const textFiles = files.filter((file) => file.kind === 'text');
    const binaryFiles = files.filter((file) => file.kind === 'binary');
    const uniqueTextFiles = [...new Map(textFiles.map((file) => [file.contentHash, file])).values()];
    const formats = {};
    for (const file of files) {
        const current = formats[file.extension] || {
            files: 0,
            textFiles: 0,
            binaryFiles: 0,
            words: 0,
            bytes: 0,
            characters: 0
        };
        current.files += 1;
        current[`${file.kind}Files`] += 1;
        current.words += file.words;
        current.bytes += file.bytes;
        current.characters += file.characters;
        formats[file.extension] = current;
    }
    const localeRegistryPath = path.join(rootDir, 'language', 'locales', 'locales.json');
    const localeRegistry = JSON.parse(fs.readFileSync(localeRegistryPath, 'utf8'));
    const targetLocales = (localeRegistry.locales || [])
        .map((locale) => locale.id)
        .filter((localeId) => localeId && localeId !== 'en');
    const textBytes = sum(textFiles, 'bytes');
    const textCharacters = sum(textFiles, 'characters');
    const uniqueTextBytes = sum(uniqueTextFiles, 'bytes');
    const uniqueTextCharacters = sum(uniqueTextFiles, 'characters');
    return {
        scope: {
            root: documentationRoot,
            filesScanned: files.length,
            wordDefinition: 'Raw Unicode letter/number tokens in text-classified files',
            byteDefinition: 'Exact on-disk size for every file'
        },
        summary: {
            files: files.length,
            textFiles: textFiles.length,
            binaryFiles: binaryFiles.length,
            words: sum(textFiles, 'words'),
            bytes: sum(files, 'bytes'),
            textBytes,
            binaryBytes: sum(binaryFiles, 'bytes'),
            textCharacters,
            duplicateTextFiles: textFiles.length - uniqueTextFiles.length,
            uniqueTextContents: uniqueTextFiles.length,
            uniqueTextWords: sum(uniqueTextFiles, 'words'),
            uniqueTextBytes,
            uniqueTextCharacters
        },
        formats: Object.fromEntries(Object.entries(formats)
            .sort((left, right) => right[1].bytes - left[1].bytes || left[0].localeCompare(right[0]))),
        localization: {
            localeRegistry: path.relative(rootDir, localeRegistryPath).replace(/\\/gu, '/'),
            targetLocales,
            targetLocaleCount: targetLocales.length,
            occurrenceCharacterUpperBound: textCharacters * targetLocales.length,
            uniqueCharacterUpperBound: uniqueTextCharacters * targetLocales.length,
            minimumBatchesPerLocale: Math.max(1, Math.ceil(textBytes / (128 * 1024))),
            minimumBatchedRequestCount: Math.max(1, Math.ceil(textBytes / (128 * 1024)))
                * targetLocales.length,
            oneRequestPerFileUpperBound: textFiles.length * targetLocales.length
        },
        largestFiles: [...files]
            .sort((left, right) => right.bytes - left.bytes || left.file.localeCompare(right.file))
            .slice(0, 10),
        files
    };
}

const report = buildReport();

function renderShortMarkdown(inventory) {
    const summary = inventory.summary;
    const output = [
        '# Documentation Inventory',
        '',
        '> Generated by `npm run inventory:documentation`.',
        '',
        '<!-- markdownlint-disable MD013 MD060 -->',
        '',
        '## Scope',
        '',
        ...wrapParagraph(
            `Scanned every file below \`${inventory.scope.root}\`. Byte totals include text, images, `
            + 'archives, compiled help, and other binary assets. Word totals use raw Unicode '
            + 'letter/number tokens from files classified as text.'
        ),
        '',
        '## Findings',
        '',
        `- Files: ${formatNumber(summary.files)}`,
        `- Text files: ${formatNumber(summary.textFiles)}`,
        `- Binary files: ${formatNumber(summary.binaryFiles)}`,
        `- Words: ${formatNumber(summary.words)}`,
        `- All-file bytes: ${formatNumber(summary.bytes)}`,
        `- Text bytes: ${formatNumber(summary.textBytes)}`,
        `- Binary bytes: ${formatNumber(summary.binaryBytes)}`,
        `- Text characters: ${formatNumber(summary.textCharacters)}`,
        `- Exact duplicate text files: ${formatNumber(summary.duplicateTextFiles)}`,
        `- Unique-content words: ${formatNumber(summary.uniqueTextWords)}`,
        `- Unique-content text bytes: ${formatNumber(summary.uniqueTextBytes)}`,
        '',
        '## Largest files',
        '',
        '| File | Kind | Words | Bytes |',
        '| --- | --- | ---: | ---: |',
        ...inventory.largestFiles.map((file) => (
            `| ${markdownCell(file.file)} | ${file.kind} | ${file.kind === 'text' ? formatNumber(file.words) : 'n/a'} | `
            + `${formatNumber(file.bytes)} |`
        )),
        '',
        '## DeepL scale estimate',
        '',
        ...wrapParagraph(
            `The ${formatNumber(summary.textCharacters)} raw text characters become an upper `
            + `bound of ${formatNumber(inventory.localization.occurrenceCharacterUpperBound)} `
            + `source characters across ${inventory.localization.targetLocaleCount} non-English locales. `
            + `Exact-file deduplication lowers this to `
            + `${formatNumber(inventory.localization.uniqueCharacterUpperBound)}.`
        ),
        '',
        ...wrapParagraph(
            `Ignoring request overhead, the text needs at least `
            + `${formatNumber(inventory.localization.minimumBatchedRequestCount)} 128-KiB batches `
            + `across all locales, or ${formatNumber(inventory.localization.oneRequestPerFileUpperBound)} `
            + 'requests when each text file is sent separately.'
        ),
        '',
        '## Boundaries',
        '',
        ...wrapParagraph(
            'Words and characters are measured from source files without removing Markdown, HTML, '
            + 'code samples, navigation, or metadata. Binary formats such as DOCX, CHM, archives, '
            + 'and images contribute bytes but no words. Translation suitability requires review.'
        ),
        '',
        'Detailed evidence: [Documentation-Files.md](Documentation-Files.md).'
    ];
    return output.join('\n');
}

function renderDetailedMarkdown(inventory) {
    const summary = inventory.summary;
    const output = [
        '# Documentation File Inventory',
        '',
        '> Generated by `npm run inventory:documentation`.',
        '',
        '<!-- markdownlint-disable MD013 MD033 MD037 MD052 MD060 -->',
        '',
        '## Table of Contents',
        '',
        '- [Scope](#scope)',
        '- [Summary](#summary)',
        '- [Formats](#formats)',
        '- [Files](#files)',
        '',
        '## Scope',
        '',
        `- Root: \`${inventory.scope.root}\``,
        `- Files scanned: ${formatNumber(inventory.scope.filesScanned)}`,
        `- Words: ${inventory.scope.wordDefinition}`,
        `- Bytes: ${inventory.scope.byteDefinition}`,
        '',
        '## Summary',
        '',
        `- Text files: ${formatNumber(summary.textFiles)}`,
        `- Binary files: ${formatNumber(summary.binaryFiles)}`,
        `- Words: ${formatNumber(summary.words)}`,
        `- All-file bytes: ${formatNumber(summary.bytes)}`,
        `- Text bytes: ${formatNumber(summary.textBytes)}`,
        `- Binary bytes: ${formatNumber(summary.binaryBytes)}`,
        `- Text characters: ${formatNumber(summary.textCharacters)}`,
        `- Exact duplicate text files: ${formatNumber(summary.duplicateTextFiles)}`,
        `- Unique-content words: ${formatNumber(summary.uniqueTextWords)}`,
        `- Unique-content text bytes: ${formatNumber(summary.uniqueTextBytes)}`,
        `- DeepL upper bound for ${inventory.localization.targetLocaleCount} locales: `
            + `${formatNumber(inventory.localization.occurrenceCharacterUpperBound)} characters`,
        '',
        '## Formats',
        '',
        '| Format | Files | Text | Binary | Words | Bytes |',
        '| --- | ---: | ---: | ---: | ---: | ---: |',
        ...Object.entries(inventory.formats).map(([format, details]) => (
            `| ${markdownCell(format)} | ${formatNumber(details.files)} | `
            + `${formatNumber(details.textFiles)} | ${formatNumber(details.binaryFiles)} | `
            + `${formatNumber(details.words)} | ${formatNumber(details.bytes)} |`
        )),
        '',
        '## Files',
        '',
        '| # | File | Format | Kind | Encoding | Words | Bytes | Characters |',
        '| ---: | --- | --- | --- | --- | ---: | ---: | ---: |'
    ];
    inventory.files.forEach((file, index) => {
        output.push(
            `| ${index + 1} | ${markdownCell(file.file)} | ${markdownCell(file.extension)} | `
            + `${file.kind} | ${file.encoding || 'n/a'} | `
            + `${file.kind === 'text' ? formatNumber(file.words) : 'n/a'} | `
            + `${formatNumber(file.bytes)} | `
            + `${file.kind === 'text' ? formatNumber(file.characters) : 'n/a'} |`
        );
    });
    return output.join('\n');
}

function writeOutput(relativePath, content) {
    const resolvedPath = path.resolve(rootDir, relativePath);
    fs.writeFileSync(resolvedPath, `${content}\n`, 'utf8');
    return path.relative(rootDir, resolvedPath);
}

function runSelfTest() {
    assert.equal(countWords('One two-three four’s 42.'), 4);
    assert.equal(looksLikeText(Buffer.from('plain text'), '.md'), true);
    assert.equal(looksLikeText(Buffer.from([0x00, 0x01, 0x02]), ''), false);
    assert.equal(decodeText(Buffer.from('café', 'utf8')).text, 'café');
    console.log('Documentation inventory self-test passed');
}

if (require.main === module) {
    if (process.argv.includes('--self-test')) {
        runSelfTest();
        process.exit(0);
    }
    if (process.argv.includes('--write')) {
        const reportPath = writeOutput(
            'build/language/reports/inventory/Documentation-Report.md',
            renderShortMarkdown(report)
        );
        const listPath = writeOutput(
            'build/language/reports/inventory/Documentation-Files.md',
            renderDetailedMarkdown(report)
        );
        console.log(`Documentation inventory written: ${reportPath}; ${listPath}`);
        process.exit(0);
    }
    const rendered = process.argv.includes('--short')
        ? renderShortMarkdown(report)
        : process.argv.includes('--markdown')
            ? renderDetailedMarkdown(report)
            : JSON.stringify(report, null, 2);
    console.log(rendered);
}

module.exports = {
    buildReport,
    countWords,
    decodeText,
    looksLikeText,
    renderDetailedMarkdown,
    renderShortMarkdown,
    report
};
