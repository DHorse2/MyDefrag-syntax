'use strict';

const fs = require('fs');
const path = require('path');
const loggerInventory = require('./Inventory-LoggerStrings.cjs').report;
const commentInventory = require('./Inventory-CodeComments.cjs').report;
const documentationInventory = require('./Inventory-Documentation.cjs').report;

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

function formatNumber(value) {
    return new Intl.NumberFormat('en-US').format(value);
}

function renderMasterMarkdown() {
    const loggerSummary = loggerInventory.categories['logger-api'];
    const commentSummary = commentInventory.summary;
    const documentationSummary = documentationInventory.summary;
    const targetLocaleCount = loggerInventory.localization.targetLocaleCount;
    if (targetLocaleCount !== commentInventory.localization.targetLocaleCount
        || targetLocaleCount !== documentationInventory.localization.targetLocaleCount) {
        throw new Error('Primary inventories disagree on target locale count.');
    }
    const currentCharacters = loggerSummary.charactersAcrossOccurrences
        + commentSummary.charactersAcrossOccurrences
        + documentationSummary.textCharacters;
    const currentUpperBound = currentCharacters * targetLocaleCount;
    const output = [
        '# Source Text Inventory',
        '',
        '> Refresh this index with `npm run inventory:master` after running a primary inventory.',
        '',
        '<!-- markdownlint-disable MD013 -->',
        '',
        '## Primary inventory commands',
        '',
        '| Area | Command | Short report | Detailed evidence | Status |',
        '| --- | --- | --- | --- | --- |',
        '| Logging | `npm run inventory:logger` | [Report](Logger-Report.md) | [Strings](Logger-Strings.md) | Implemented |',
        '| Code comments | `npm run inventory:comments` | [Report](Comment-Report.md) | [Comments](Comment-Strings.md) | Implemented |',
        '| Documentation | `npm run inventory:documentation` | [Report](Documentation-Report.md) | [Files](Documentation-Files.md) | Implemented |',
        '',
        'Each implemented primary command regenerates its short report and complete evidence',
        'list.',
        '',
        '## 1. Logging',
        '',
        ...wrapParagraph(
            `${formatNumber(loggerSummary.translatableLiteralOccurrences)} translatable logging `
            + `literals contain ${formatNumber(loggerSummary.charactersAcrossOccurrences)} source `
            + `characters. See [Logger-Report.md](Logger-Report.md).`
        ),
        '',
        '## 2. Code comments',
        '',
        ...wrapParagraph(
            `${formatNumber(commentSummary.translatableOccurrences)} comments containing letters `
            + `hold ${formatNumber(commentSummary.charactersAcrossOccurrences)} source characters. `
            + 'See [Comment-Report.md](Comment-Report.md).'
        ),
        '',
        '## 3. Documentation',
        '',
        '| Measure | Total |',
        '| --- | ---: |',
        `| Files | ${formatNumber(documentationSummary.files)} |`,
        `| Text files | ${formatNumber(documentationSummary.textFiles)} |`,
        `| Binary files | ${formatNumber(documentationSummary.binaryFiles)} |`,
        `| Raw words | ${formatNumber(documentationSummary.words)} |`,
        `| All-file bytes | ${formatNumber(documentationSummary.bytes)} |`,
        `| Text bytes | ${formatNumber(documentationSummary.textBytes)} |`,
        `| Binary bytes | ${formatNumber(documentationSummary.binaryBytes)} |`,
        `| Text characters | ${formatNumber(documentationSummary.textCharacters)} |`,
        `| Exact duplicate text files | ${formatNumber(documentationSummary.duplicateTextFiles)} |`,
        `| Unique-content words | ${formatNumber(documentationSummary.uniqueTextWords)} |`,
        `| Unique-content text bytes | ${formatNumber(documentationSummary.uniqueTextBytes)} |`,
        '',
        'Per-file evidence: [Documentation-Files.md](Documentation-Files.md).',
        '',
        '## Aggregate localization scale',
        '',
        '| Area | Inventory measure | Source characters | Target locales | DeepL upper bound |',
        '| --- | ---: | ---: | ---: | ---: |',
        `| Logging | ${formatNumber(loggerSummary.translatableLiteralOccurrences)} strings | ${formatNumber(loggerSummary.charactersAcrossOccurrences)} | ${targetLocaleCount} | ${formatNumber(loggerInventory.localization.occurrenceCharacterUpperBound)} |`,
        `| Code comments | ${formatNumber(commentSummary.translatableOccurrences)} comments | ${formatNumber(commentSummary.charactersAcrossOccurrences)} | ${targetLocaleCount} | ${formatNumber(commentInventory.localization.occurrenceCharacterUpperBound)} |`,
        `| Documentation | ${formatNumber(documentationSummary.words)} words | ${formatNumber(documentationSummary.textCharacters)} | ${targetLocaleCount} | ${formatNumber(documentationInventory.localization.occurrenceCharacterUpperBound)} |`,
        `| Total | Mixed units | ${formatNumber(currentCharacters)} | ${targetLocaleCount} | ${formatNumber(currentUpperBound)} |`,
        '',
        '<!-- markdownlint-enable MD013 -->',
        '',
        ...wrapParagraph(
            'These are conservative raw-source estimates. Documentation includes Markdown, HTML, '
            + 'code samples, navigation, and metadata; binary formats contribute bytes but no words '
            + 'or characters. Translation suitability requires review.'
        ),
        '',
        '## Refresh sequence',
        '',
        '```powershell',
        'npm run inventory:logger',
        'npm run inventory:comments',
        'npm run inventory:documentation',
        'npm run inventory:master',
        '```'
    ];
    return output.join('\n');
}

function writeOutput(relativePath, content) {
    const resolvedPath = path.resolve(rootDir, relativePath);
    fs.writeFileSync(resolvedPath, `${content}\n`, 'utf8');
    return path.relative(rootDir, resolvedPath);
}

if (require.main === module) {
    const rendered = renderMasterMarkdown();
    if (process.argv.includes('--write')) {
        console.log(`Master inventory written: ${writeOutput('build/language/reports/inventory/Inventory-Report.md', rendered)}`);
    } else {
        console.log(rendered);
    }
}

module.exports = {
    renderMasterMarkdown
};
