'use strict';

const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { loadTranslationIndex, normalize } = require('./sourceTranslation');
const { buildTranslationPreview } = require('./translationPreview');

const REVIEW_DIAGNOSTIC_CODES = Object.freeze({
    invalidView: 'mydfrg.translationReview.invalidView',
    unsupportedLocale: 'mydfrg.translationReview.unsupportedLocale'
});

const REVIEW_VIEW_DEFINITIONS = Object.freeze([
    Object.freeze({
        id: 'bilingual',
        command: 'mydfrg.openPreview.bilingual',
        label: 'Bilingual Localized + Canonical',
        shortTitle: 'Bilingual'
    }),
    Object.freeze({
        id: 'semantic',
        command: 'mydfrg.openPreview.semantic',
        label: 'Semantic IDs',
        shortTitle: 'Semantic IDs'
    }),
    Object.freeze({
        id: 'differences',
        command: 'mydfrg.openPreview.differences',
        label: 'Localized / Canonical Differences',
        shortTitle: 'Differences'
    }),
    Object.freeze({
        id: 'terminology',
        command: 'mydfrg.openPreview.terminology',
        label: 'Terminology',
        shortTitle: 'Terminology'
    }),
    Object.freeze({
        id: 'untranslated',
        command: 'mydfrg.openPreview.untranslated',
        label: 'Untranslated Tokens',
        shortTitle: 'Untranslated Tokens'
    }),
    Object.freeze({
        id: 'completeness',
        command: 'mydfrg.openPreview.completeness',
        label: 'Translation Completeness',
        shortTitle: 'Completeness'
    })
]);

const reviewViewsById = new Map(REVIEW_VIEW_DEFINITIONS.map(view => [view.id, view]));

function keywordOccurrences(preview) {
    return preview.mappings
        .filter(mapping => mapping.kind === 'keyword' && mapping.id)
        .map(mapping => ({
            id: mapping.id,
            canonical: mapping.canonical,
            localized: preview.text.slice(mapping.output.start, mapping.output.end),
            status: mapping.status || 'unknown',
            fallbackLocale: mapping.fallbackLocale || null,
            sourceUri: mapping.sourceUri,
            sourceLine: mapping.input.range.start.line + 1,
            sourceColumn: mapping.input.range.start.character + 1,
            outputLine: mapping.output.range.start.line + 1,
            outputStartCharacter: mapping.output.range.start.character,
            outputEndCharacter: mapping.output.range.end.character
        }));
}

function buildCatalogRows(index, targetLocale, occurrences) {
    const target = index.locales.get(targetLocale);
    const occurrencesById = new Map();
    for (const occurrence of occurrences) {
        const existing = occurrencesById.get(occurrence.id) || [];
        existing.push(occurrence);
        occurrencesById.set(occurrence.id, existing);
    }
    return Object.entries(target.canonicalToLocale)
        .filter(([, entry]) => entry.translatable && entry.visible)
        .map(([canonical, entry]) => {
            const used = occurrencesById.get(entry.id) || [];
            return {
                id: entry.id,
                canonical,
                localized: entry.text,
                status: entry.status || 'unknown',
                fallbackLocale: entry.fallbackLocale || null,
                changed: normalize(entry.text, targetLocale) !== normalize(canonical, 'en'),
                occurrences: used.length,
                firstLocation: used[0]
                    ? `${used[0].sourceUri}:${used[0].sourceLine}:${used[0].sourceColumn}`
                    : 'not used by source'
            };
        })
        .sort((left, right) => left.id.localeCompare(right.id, 'en'));
}

function reviewHeader(view, entryFile, targetLocale, preview, rows) {
    const sourceUri = pathToFileURL(path.resolve(entryFile)).href;
    const header = [
        'MyDefrag Translation Review',
        `View: ${view.label}`,
        `Target locale: ${targetLocale}`,
        `Source: ${sourceUri}`,
        `Source files: ${preview.stats.sourceFiles}`,
        `Keyword occurrences: ${rows.length}`,
        `Diagnostics: ${preview.diagnostics.length}`,
        'This editable untitled review does not modify the source or included files.'
    ];
    if (preview.diagnostics.length > 0) {
        header.push(
            'Diagnostic details:',
            ...preview.diagnostics.map(item => `- ${item.code}: ${item.message}`)
        );
    }
    header.push('='.repeat(96));
    return header;
}

function mappingForOutputLine(mappings, zeroBasedLine) {
    const candidates = mappings.filter(mapping => {
        const start = mapping.output.range.start;
        const end = mapping.output.range.end;
        if (start.line > zeroBasedLine || end.line < zeroBasedLine) return false;
        if (end.line === zeroBasedLine && end.character === 0 && start.line !== end.line) return false;
        return Boolean(mapping.sourceUri);
    });
    candidates.sort((left, right) => {
        if (left.kind === 'keyword' && right.kind !== 'keyword') return -1;
        if (right.kind === 'keyword' && left.kind !== 'keyword') return 1;
        return right.output.range.start.line - left.output.range.start.line;
    });
    return candidates[0] || null;
}

function sourceLocationForLine(mappings, zeroBasedLine) {
    const mapping = mappingForOutputLine(mappings, zeroBasedLine);
    if (!mapping) return 'generated review content';
    const outputDelta = Math.max(0, zeroBasedLine - mapping.output.range.start.line);
    const inputLine = mapping.input.range.start.line + outputDelta + 1;
    const inputColumn = outputDelta === 0 ? mapping.input.range.start.character + 1 : 1;
    return `${mapping.sourceUri}:${inputLine}:${inputColumn}`;
}

function visibleLine(text) {
    return String(text).replace(/\t/gu, '\\t');
}

function renderBilingual(header, preview) {
    const canonicalLines = preview.canonicalText.split(/\r?\n/u);
    const localizedLines = preview.text.split(/\r?\n/u);
    const total = Math.max(canonicalLines.length, localizedLines.length);
    const output = [...header];
    for (let index = 0; index < total; index += 1) {
        const lineNumber = String(index + 1).padStart(5, '0');
        output.push(
            '',
            `[${lineNumber}] ${sourceLocationForLine(preview.mappings, index)}`,
            `L | ${visibleLine(localizedLines[index] ?? '')}`,
            `C | ${visibleLine(canonicalLines[index] ?? '')}`
        );
    }
    return output.join('\n');
}

function semanticLine(line, lineNumber, occurrences) {
    const onLine = occurrences
        .filter(occurrence => occurrence.outputLine === lineNumber)
        .sort((left, right) => right.outputStartCharacter - left.outputStartCharacter);
    let output = line;
    for (const occurrence of onLine) {
        output = `${output.slice(0, occurrence.outputStartCharacter)}<${occurrence.id}>${output.slice(occurrence.outputEndCharacter)}`;
    }
    return output;
}

function renderSemantic(header, preview, occurrences) {
    const localizedLines = preview.text.split(/\r?\n/u);
    const output = [...header];
    localizedLines.forEach((line, index) => {
        const lineNumber = String(index + 1).padStart(5, '0');
        output.push(
            '',
            `[${lineNumber}] ${sourceLocationForLine(preview.mappings, index)}`,
            `L | ${visibleLine(line)}`,
            `S | ${visibleLine(semanticLine(line, index + 1, occurrences))}`
        );
    });
    return output.join('\n');
}

function renderDifferences(header, preview) {
    const canonicalLines = preview.canonicalText.split(/\r?\n/u);
    const localizedLines = preview.text.split(/\r?\n/u);
    const total = Math.max(canonicalLines.length, localizedLines.length);
    const output = [...header];
    let count = 0;
    for (let index = 0; index < total; index += 1) {
        const canonical = canonicalLines[index] ?? '';
        const localized = localizedLines[index] ?? '';
        if (canonical === localized) continue;
        count += 1;
        const lineNumber = String(index + 1).padStart(5, '0');
        output.push(
            '',
            `[${lineNumber}] ${sourceLocationForLine(preview.mappings, index)}`,
            `- C | ${visibleLine(canonical)}`,
            `+ L | ${visibleLine(localized)}`
        );
    }
    if (count === 0) output.push('', 'No localized/canonical line differences.');
    return output.join('\n');
}

function tableLine(row, reason = null) {
    return [
        row.id,
        row.canonical,
        row.localized,
        row.status,
        row.fallbackLocale || '-',
        String(row.occurrences),
        row.firstLocation,
        reason
    ].filter(value => value !== null).join('\t');
}

function renderTerminology(header, catalogRows) {
    return [
        ...header,
        '',
        'Semantic ID\tCanonical\tLocalized\tStatus\tFallback\tOccurrences\tFirst source location',
        ...catalogRows.map(row => tableLine(row))
    ].join('\n');
}

function renderUntranslated(header, catalogRows) {
    const rows = catalogRows.filter(row => !row.changed || row.fallbackLocale);
    return [
        ...header,
        '',
        'Semantic ID\tCanonical\tLocalized\tStatus\tFallback\tOccurrences\tFirst source location\tReason',
        ...rows.map(row => tableLine(
            row,
            row.fallbackLocale ? `fallback:${row.fallbackLocale}` : 'unchanged'
        )),
        ...(rows.length === 0 ? ['No untranslated or fallback catalog entries.'] : [])
    ].join('\n');
}

function renderCompleteness(header, catalogRows, occurrences) {
    const statusCounts = new Map();
    for (const row of catalogRows) {
        statusCounts.set(row.status, (statusCounts.get(row.status) || 0) + 1);
    }
    const usedIds = new Set(occurrences.map(occurrence => occurrence.id));
    const translated = catalogRows.filter(row => row.changed && !row.fallbackLocale).length;
    const unchanged = catalogRows.filter(row => !row.changed).length;
    const fallback = catalogRows.filter(row => row.fallbackLocale).length;
    return [
        ...header,
        '',
        'Catalog completeness',
        `Visible translatable entries: ${catalogRows.length}`,
        `Localized entries different from canonical without fallback: ${translated}`,
        `Entries unchanged from canonical: ${unchanged}`,
        `Entries using a fallback locale: ${fallback}`,
        '',
        'Source coverage',
        `Keyword occurrences in expanded source: ${occurrences.length}`,
        `Unique semantic IDs used by expanded source: ${usedIds.size}`,
        '',
        'Catalog status counts',
        ...[...statusCounts.entries()]
            .sort(([left], [right]) => left.localeCompare(right, 'en'))
            .map(([status, count]) => `${status}: ${count}`)
    ].join('\n');
}

function failure(code, message, entryFile, targetLocale, viewKind) {
    return {
        ok: false,
        text: '',
        diagnostics: [{ code, severity: 'error', message }],
        stats: { sourceFiles: 0, targetLocale, viewKind },
        source: path.resolve(entryFile)
    };
}

function buildTranslationReview(entryFile, targetLocale, viewKind, options = {}) {
    const view = reviewViewsById.get(viewKind);
    if (!view) {
        return failure(
            REVIEW_DIAGNOSTIC_CODES.invalidView,
            `Unknown translation review view '${viewKind}'.`,
            entryFile,
            targetLocale,
            viewKind
        );
    }
    const index = options.index || loadTranslationIndex(options);
    if (!index.locales.has(targetLocale)) {
        return failure(
            REVIEW_DIAGNOSTIC_CODES.unsupportedLocale,
            `Unsupported translation review locale '${targetLocale}'.`,
            entryFile,
            targetLocale,
            viewKind
        );
    }
    const preview = buildTranslationPreview(entryFile, targetLocale, { ...options, index });
    if (!preview.ok) {
        return {
            ...preview,
            stats: { ...preview.stats, viewKind },
            source: path.resolve(entryFile)
        };
    }
    const occurrences = keywordOccurrences(preview);
    const catalogRows = buildCatalogRows(index, targetLocale, occurrences);
    const header = reviewHeader(view, entryFile, targetLocale, preview, occurrences);
    let text;
    switch (viewKind) {
        case 'bilingual':
            text = renderBilingual(header, preview);
            break;
        case 'semantic':
            text = renderSemantic(header, preview, occurrences);
            break;
        case 'differences':
            text = renderDifferences(header, preview);
            break;
        case 'terminology':
            text = renderTerminology(header, catalogRows);
            break;
        case 'untranslated':
            text = renderUntranslated(header, catalogRows);
            break;
        case 'completeness':
            text = renderCompleteness(header, catalogRows, occurrences);
            break;
        default:
            throw new Error(`Unhandled translation review view '${viewKind}'.`);
    }
    return {
        ok: true,
        text,
        diagnostics: preview.diagnostics,
        stats: {
            ...preview.stats,
            viewKind,
            catalogEntries: catalogRows.length,
            keywordOccurrences: occurrences.length
        },
        source: path.resolve(entryFile)
    };
}

module.exports = {
    REVIEW_DIAGNOSTIC_CODES,
    REVIEW_VIEW_DEFINITIONS,
    buildTranslationReview
};
