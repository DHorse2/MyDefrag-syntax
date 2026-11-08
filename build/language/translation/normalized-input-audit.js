'use strict';

const fs = require('fs');
const path = require('path');
const { transformRuntimeSyntax } = require('./text-normalizer');

const WORD_PATTERN = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;

function normalizedRuleMap(substitutions) {
    const rules = new Map();
    for (const rule of Array.isArray(substitutions) ? substitutions : []) {
        if (!rule || typeof rule.input !== 'string' || typeof rule.output !== 'string') {
            continue;
        }
        const input = rule.input.trim();
        const output = rule.output.trim();
        if (!input || !output) { continue; }
        rules.set(input.normalize('NFKC').toLocaleLowerCase(), { input, output });
    }
    return rules;
}

function findNormalizedInputWords(text, substitutions) {
    const rules = normalizedRuleMap(substitutions);
    if (rules.size === 0 || typeof text !== 'string' || text.length === 0) { return []; }

    // Match the normalizer's lossless translation boundary. Runtime syntax is
    // intentionally protected before substitutions, so it must not be
    // reported as untranslated prose here.
    const prose = transformRuntimeSyntax(text.normalize('NFKC'), () => ' ');
    const matches = [];
    for (const match of prose.matchAll(WORD_PATTERN)) {
        const candidates = [match[0], ...match[0].split(/['’]/u).slice(1)];
        const matchedText = candidates.find((candidate) => (
            rules.has(candidate.toLocaleLowerCase())
        ));
        if (!matchedText) { continue; }
        const rule = rules.get(matchedText.toLocaleLowerCase());
        if (!rule) { continue; }
        matches.push({
            input: rule.input,
            output: rule.output,
            matchedText
        });
    }
    return matches;
}

function textRecords(document) {
    const records = [];
    if (document?.entries && !Array.isArray(document.entries)) {
        for (const [key, entry] of Object.entries(document.entries)) {
            if (typeof entry?.text === 'string') {
                records.push({ id: key, field: `entries.${key}.text`, text: entry.text });
            }
        }
    }
    if (Array.isArray(document?.entries)) {
        for (const [index, entry] of document.entries.entries()) {
            if (typeof entry?.text === 'string') {
                const id = entry.key || `entry-${index + 1}`;
                records.push({ id, field: `entries[${index}].text`, text: entry.text });
            }
        }
    }
    if (Array.isArray(document?.keywords)) {
        for (const [index, keyword] of document.keywords.entries()) {
            if (typeof keyword?.text === 'string') {
                const id = keyword.id || `keyword-${index + 1}`;
                records.push({ id, field: `keywords[${index}].text`, text: keyword.text });
            }
        }
    }
    return records;
}

function sourceFilesForLocale(rootDir, localeId, componentIds) {
    const localeDir = path.join(rootDir, 'language', 'locales', localeId);
    if (!fs.existsSync(localeDir) || !fs.statSync(localeDir).isDirectory()) { return []; }

    const files = [];
    const overridePath = path.join(localeDir, 'catalogOverrides.json');
    const samplePath = path.join(localeDir, 'catalogOverrides.sample.json');
    if (fs.existsSync(overridePath)) {
        files.push(overridePath);
    } else if (fs.existsSync(samplePath)) {
        files.push(samplePath);
    }
    for (const componentId of componentIds) {
        const componentPath = path.join(localeDir, `${componentId}.json`);
        if (fs.existsSync(componentPath)) { files.push(componentPath); }
    }
    return files.sort((left, right) => left.localeCompare(right));
}

function summarizeWords(entries) {
    const counts = new Map();
    for (const entry of entries) {
        for (const match of entry.matches) {
            const current = counts.get(match.input) || {
                input: match.input,
                output: match.output,
                count: 0
            };
            current.count += 1;
            counts.set(match.input, current);
        }
    }
    return Array.from(counts.values()).sort((left, right) => left.input.localeCompare(right.input));
}

function buildNormalizedInputAudit(state, rootDir) {
    const localeIds = (state.locales?.locales || [])
        .map((locale) => locale.id)
        .filter((localeId) => localeId && localeId !== 'en')
        .sort((left, right) => left.localeCompare(right));
    const componentIds = (state.components?.components || [])
        .map((component) => component.id)
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right));
    const files = [];
    let filesScanned = 0;
    let entriesScanned = 0;

    for (const locale of localeIds) {
        for (const filePath of sourceFilesForLocale(rootDir, locale, componentIds)) {
            filesScanned += 1;
            const document = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const matches = [];
            for (const record of textRecords(document)) {
                entriesScanned += 1;
                const inputMatches = findNormalizedInputWords(record.text, state.normalizedWords);
                if (inputMatches.length === 0) { continue; }
                matches.push({
                    id: record.id,
                    field: record.field,
                    text: record.text,
                    matches: inputMatches
                });
            }
            if (matches.length === 0) { continue; }
            const relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/');
            files.push({
                locale,
                file: relativePath,
                entryCount: matches.length,
                occurrenceCount: matches.reduce((total, entry) => total + entry.matches.length, 0),
                words: summarizeWords(matches),
                entries: matches
            });
        }
    }

    const occurrenceCount = files.reduce((total, file) => total + file.occurrenceCount, 0);
    return {
        schemaVersion: '1.0',
        source: 'language/canonical/normalized-words.json',
        scope: 'Non-English authored locale entry and keyword text fields',
        status: occurrenceCount > 0 ? 'partial' : 'passed',
        rules: Array.from(normalizedRuleMap(state.normalizedWords).values()),
        summary: {
            localesScanned: localeIds.length,
            filesScanned,
            entriesScanned,
            filesWithMatches: files.length,
            entriesWithMatches: files.reduce((total, file) => total + file.entryCount, 0),
            occurrences: occurrenceCount
        },
        files
    };
}

function renderNormalizedInputAuditMarkdown(audit) {
    const lines = [
        '# Normalized Input Audit',
        '',
        `Status: \`${audit.status}\``,
        '',
        `Canonical rules: \`${audit.source}\``,
        '',
        `Scope: ${audit.scope}.`,
        'Protected runtime syntax is excluded.',
        '',
        `Scanned ${audit.summary.localesScanned} non-English locales, ${audit.summary.filesScanned} files, and ${audit.summary.entriesScanned} text fields.`,
        '',
        `Found ${audit.summary.occurrences} normalized input occurrence(s) in ${audit.summary.entriesWithMatches} text field(s) across ${audit.summary.filesWithMatches} file(s).`,
        '',
        '## Files',
        ''
    ];
    if (audit.files.length === 0) {
        lines.push('No normalized input words remain in the audited locale text fields.', '');
        return lines.join('\n');
    }
    lines.push('<!-- markdownlint-disable MD013 -->', '');
    lines.push('| Locale | File | Text fields | Occurrences | Input words |');
    lines.push('| --- | --- | ---: | ---: | --- |');
    for (const file of audit.files) {
        const words = file.words.map((word) => `${word.input} (${word.count})`).join(', ');
        lines.push(`| ${file.locale} | \`${file.file}\` | ${file.entryCount} | ${file.occurrenceCount} | ${words} |`);
    }
    lines.push('', '<!-- markdownlint-enable MD013 -->', '');
    return lines.join('\n');
}

module.exports = {
    buildNormalizedInputAudit,
    findNormalizedInputWords,
    renderNormalizedInputAuditMarkdown,
    textRecords
};
