'use strict';

const fs = require('fs');
const path = require('path');
const { extractStringCandidates } = require('./build-language');
const { normalizeText } = require('../language/translation/text-normalizer');

function normalizeCandidateText(value, placeholders = []) {
    let placeholderIndex = 0;
    return String(value || '')
        .replace(/\$\{[^{}]+\}/gu, () => {
            const placeholder = placeholders[placeholderIndex] || `value${placeholderIndex + 1}`;
            placeholderIndex += 1;
            return `{${placeholder}}`;
        })
        .replace(/\\[nrt]/gu, ' ')
        .replace(/\\([\\'"`])/gu, '$1')
        .replace(/\s+/gu, ' ')
        .trim();
}

function repositorySourcePath(rootDir, relativePath) {
    if (!relativePath || path.isAbsolute(relativePath)) { return null; }
    const root = path.resolve(rootDir);
    const resolved = path.resolve(root, relativePath);
    const relative = path.relative(root, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) { return null; }
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) { return null; }
    return resolved;
}

function sourceLineMatches(entry, sourceData, substitutions = []) {
    const matches = new Set();
    const expectedText = normalizeText(normalizeCandidateText(entry.text), substitutions);
    for (const candidate of sourceData.candidates) {
        const candidateText = normalizeText(
            normalizeCandidateText(candidate.text, entry.placeholders || []),
            substitutions
        );
        if (candidateText === expectedText) {
            matches.add(candidate.line);
            continue;
        }
        if (candidate.text === entry.key
            && /\bcatalog\s*\.\s*format\s*\(/u.test(candidate.fullLine || '')) {
            matches.add(candidate.line);
        }
    }
    return matches;
}

function synchronizeCatalogSourceLines(catalog, rootDir) {
    const updates = [];
    const sourceCache = new Map();
    const normalizedWordsPath = path.resolve(rootDir, 'language', 'canonical', 'normalized-words.json');
    const substitutions = fs.existsSync(normalizedWordsPath)
        ? JSON.parse(fs.readFileSync(normalizedWordsPath, 'utf8'))
        : [];
    const canonicalCatalogPath = path.resolve(rootDir, 'language', 'canonical', 'component-catalog.json');
    for (const entry of catalog?.entries || []) {
        if (/\bsource-removed entry\b/iu.test(String(entry.notes || ''))) { continue; }
        const sourcePath = repositorySourcePath(rootDir, entry.source);
        if (!sourcePath || sourcePath === canonicalCatalogPath) { continue; }
        let sourceData = sourceCache.get(sourcePath);
        if (!sourceData) {
            const sourceText = fs.readFileSync(sourcePath, 'utf8');
            sourceData = {
                candidates: extractStringCandidates(sourceText)
            };
            sourceCache.set(sourcePath, sourceData);
        }
        const matches = sourceLineMatches(entry, sourceData, substitutions);
        const currentLine = Number(entry.sourceLine);
        if (Number.isInteger(currentLine) && matches.has(currentLine)) { continue; }
        if (matches.size !== 1) { continue; }
        const [nextLine] = matches;
        updates.push({
            key: entry.key,
            source: entry.source,
            previousLine: Number.isInteger(currentLine) ? currentLine : null,
            sourceLine: nextLine
        });
        entry.sourceLine = nextLine;
    }
    return updates;
}

function synchronizeCandidateCatalogDraftSourceLine(
    migrationInventory,
    catalogRecord,
    previousRecord = null
) {
    if (!migrationInventory || !catalogRecord) {
        return false;
    }

    const source = String(catalogRecord.source || '');
    const text = String(catalogRecord.text || '');
    const sourceLine = Number(catalogRecord.sourceLine);

    if (!source || !text || !Number.isInteger(sourceLine) || sourceLine < 1) {
        return false;
    }

    const previousSource = String(previousRecord?.source || source);
    const previousText = String(previousRecord?.text || text);

    const drafts = migrationInventory.candidateCatalogDrafts || [];

    const draft = drafts.find((entry) =>
        String(entry.path || '').toLowerCase() === previousSource.toLowerCase() &&
        String(entry.text || '') === previousText
    );

    if (!draft) {
        return false;
    }

    draft.path = source;
    draft.text = text;
    draft.sourceLine = sourceLine;

    return true;
}

module.exports = {
    normalizeCandidateText,
    sourceLineMatches,
    synchronizeCatalogSourceLines,
    synchronizeCandidateCatalogDraftSourceLine
};
