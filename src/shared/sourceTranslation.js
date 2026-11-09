'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DIAGNOSTIC_CODES = Object.freeze({
    directiveMissing: 'mydfrg.translation.directiveMissing',
    directiveInvalid: 'mydfrg.translation.directiveInvalid',
    directiveLocale: 'mydfrg.translation.directiveLocale',
    directiveDuplicate: 'mydfrg.translation.directiveDuplicate',
    unsupportedLocale: 'mydfrg.translation.unsupportedLocale',
    malformedMap: 'mydfrg.translation.malformedMap',
    ambiguousKeyword: 'mydfrg.translation.ambiguousKeyword'
});
const DIRECTIVE_CANDIDATE = /^\s*(?:\/\/|#|--|REM\b|;)\s*@mydfrg-language\b/i;
const DIRECTIVE_EXACT = /^\s*(?:\/\/|#|--|REM\b)\s*@mydfrg-language\s+([A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)\s*$/i;
const WORD_CHARACTER = /[\p{L}\p{N}_\p{M}]/u;

function normalize(value, locale = 'en') {
    return String(value).normalize('NFC').toLocaleLowerCase(locale);
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function offsetPosition(text, offset) {
    const before = text.slice(0, offset);
    const lines = before.split(/\r?\n/);
    return { line: lines.length - 1, character: lines[lines.length - 1].length };
}

function rangeForOffsets(text, start, end) {
    return { start: offsetPosition(text, start), end: offsetPosition(text, end) };
}

function diagnostic(code, message, text, start = 0, end = start) {
    return { code, message, severity: 'error', range: rangeForOffsets(text, start, end) };
}

function inspectDirective(text, localeIds, inheritedLocale) {
    const occurrences = [];
    let offset = 0;
    for (const line of String(text).split(/(?<=\n)/)) {
        const content = line.replace(/\r?\n$/, '');
        if (DIRECTIVE_CANDIDATE.test(content)) {
            occurrences.push({ text: content, start: offset, end: offset + content.length });
        }
        offset += line.length;
    }

    if (occurrences.length === 0) {
        if (inheritedLocale) return { locale: inheritedLocale, occurrences };
        return {
            occurrences,
            error: diagnostic(
                DIAGNOSTIC_CODES.directiveMissing,
                'Exactly one MyDefrag source-language directive is required.',
                text
            )
        };
    }
    if (occurrences.length > 1) {
        const duplicate = occurrences[1];
        return {
            occurrences,
            error: diagnostic(
                DIAGNOSTIC_CODES.directiveDuplicate,
                'Only one MyDefrag source-language directive is allowed.',
                text,
                duplicate.start,
                duplicate.end
            )
        };
    }

    const match = occurrences[0].text.match(DIRECTIVE_EXACT);
    if (!match) {
        return {
            occurrences,
            error: diagnostic(
                DIAGNOSTIC_CODES.directiveInvalid,
                'Use // @mydfrg-language <locale>.',
                text,
                occurrences[0].start,
                occurrences[0].end
            )
        };
    }
    const canonicalLocale = localeIds.get(match[1].toLocaleLowerCase('en'));
    if (!canonicalLocale || canonicalLocale !== match[1]) {
        return {
            occurrences,
            error: diagnostic(
                DIAGNOSTIC_CODES.directiveLocale,
                canonicalLocale
                    ? `Use canonical locale spelling '${canonicalLocale}'.`
                    : `Unknown source-language locale '${match[1]}'.`,
                text,
                occurrences[0].start,
                occurrences[0].end
            )
        };
    }
    return { locale: canonicalLocale, occurrences };
}

function loadTranslationIndex(options = {}) {
    const rootDir = options.rootDir || path.resolve(__dirname, '..', '..');
    const localeRegistry = JSON.parse(fs.readFileSync(
        path.join(rootDir, 'language', 'locales', 'locales.json'),
        'utf8'
    )).locales;
    const mapsRoot = options.mapsRoot || path.join(rootDir, 'build', 'language', 'keyword-maps');
    const locales = new Map();
    const errors = [];

    for (const metadata of localeRegistry) {
        try {
            const canonicalToLocale = JSON.parse(fs.readFileSync(
                path.join(mapsRoot, `${metadata.id}-canonical-to-locale.json`),
                'utf8'
            ));
            const localeToCanonical = JSON.parse(fs.readFileSync(
                path.join(mapsRoot, `${metadata.id}-locale-to-canonical.json`),
                'utf8'
            ));
            if (Object.keys(canonicalToLocale).length !== 243 || Object.keys(localeToCanonical).length !== 243) {
                throw new Error('expected exactly 243 entries in each direction');
            }
            const canonicalIds = new Set();
            for (const [canonical, entry] of Object.entries(canonicalToLocale)) {
                if (!entry || typeof entry.id !== 'string' || typeof entry.text !== 'string'
                    || typeof entry.translatable !== 'boolean' || typeof entry.visible !== 'boolean') {
                    throw new Error(`malformed canonical-to-locale entry '${canonical}'`);
                }
                if (canonicalIds.has(entry.id)) throw new Error(`duplicate semantic ID '${entry.id}'`);
                canonicalIds.add(entry.id);
            }
            const localeIds = new Set();
            for (const [rendered, entry] of Object.entries(localeToCanonical)) {
                if (!entry || typeof entry.id !== 'string' || typeof entry.canonical !== 'string'
                    || typeof entry.translatable !== 'boolean' || typeof entry.visible !== 'boolean') {
                    throw new Error(`malformed locale-to-canonical entry '${rendered}'`);
                }
                if (localeIds.has(entry.id)) throw new Error(`duplicate semantic ID '${entry.id}'`);
                localeIds.add(entry.id);
                const reverse = canonicalToLocale[entry.canonical];
                if (!reverse || reverse.id !== entry.id || reverse.text !== rendered) {
                    throw new Error(`directional map mismatch for '${rendered}'`);
                }
            }
            locales.set(metadata.id, { metadata, canonicalToLocale, localeToCanonical });
        } catch (error) {
            errors.push(`${metadata.id}: ${error.message}`);
        }
    }
    return { rootDir, locales, localeRegistry, errors };
}

function compileSourceEntries(locale, text) {
    const byNormalizedText = new Map();
    const collisions = [];
    for (const [sourceText, entry] of Object.entries(locale.localeToCanonical)) {
        if (entry.translatable === false || entry.visible === false) continue;
        const key = normalize(sourceText, locale.metadata.id);
        const previous = byNormalizedText.get(key);
        if (previous && previous.entry.id !== entry.id) {
            collisions.push({ text: sourceText, ids: [previous.entry.id, entry.id] });
        } else {
            byNormalizedText.set(key, { sourceText, normalized: key, entry });
        }
    }
    if (collisions.length > 0) {
        return {
            error: diagnostic(
                DIAGNOSTIC_CODES.ambiguousKeyword,
                `Ambiguous localized keyword '${collisions[0].text}'.`,
                text
            )
        };
    }
    return {
        entries: [...byNormalizedText.values()].sort(
            (left, right) => right.normalized.length - left.normalized.length
        )
    };
}

function collectPathRanges(text) {
    const ranges = [];
    const pattern = /(?:\b[A-Za-z]:[\\/]|\\\\|(?:^|[\s(])\.\.?[\\/])[^\s,)]*/gm;
    let match;
    while ((match = pattern.exec(text)) !== null) {
        const leading = /^\s/.test(match[0]) ? 1 : 0;
        ranges.push({ start: match.index + leading, end: match.index + match[0].length });
    }
    return ranges;
}

function collectVariableRanges(text, sourceLocale) {
    const names = Object.entries(sourceLocale.localeToCanonical)
        .filter(([, entry]) => /^setting\.setVariable$|setvariable(default|ifempty)?$/i.test(entry.id))
        .map(([name]) => escapeRegExp(name));
    if (names.length === 0) return [];
    const pattern = new RegExp(`(?:${names.join('|')})\\s*\\(\\s*([\\p{L}_][\\p{L}\\p{N}_]*)`, 'giu');
    const ranges = [];
    let match;
    while ((match = pattern.exec(text)) !== null) {
        const start = match.index + match[0].lastIndexOf(match[1]);
        ranges.push({ start, end: start + match[1].length });
    }
    return ranges;
}

function inRanges(offset, ranges) {
    return ranges.some(range => offset >= range.start && offset < range.end);
}

function normalizedMatchAt(text, offset, expected, locale) {
    let end = offset;
    const maxEnd = Math.min(text.length, offset + expected.length + 12);
    while (end < maxEnd) {
        end += 1;
        const candidate = normalize(text.slice(offset, end), locale);
        if (candidate === expected) return end;
        if (candidate.length > expected.length) break;
    }
    return -1;
}

function isBoundary(text, start, end, rendered) {
    const first = rendered[0];
    const last = rendered[rendered.length - 1];
    if (WORD_CHARACTER.test(first) && start > 0 && WORD_CHARACTER.test(text[start - 1])) return false;
    if (WORD_CHARACTER.test(last) && end < text.length && WORD_CHARACTER.test(text[end])) return false;
    return true;
}

function collectKeywordReplacements(text, entries, sourceLocale, targetLocale, protectedRanges) {
    const replacements = [];
    let index = 0;
    let blockComment = false;
    while (index < text.length) {
        if (blockComment) {
            const close = text.indexOf('*/', index);
            if (close === -1) break;
            index = close + 2;
            blockComment = false;
            continue;
        }
        if (text.startsWith('/*', index)) {
            blockComment = true;
            index += 2;
            continue;
        }
        if (text.startsWith('//', index) || text.startsWith('--', index) || text[index] === '#'
            || (/^REM\b/i.test(text.slice(index)) && (index === 0 || /[\s]/.test(text[index - 1])))) {
            const newline = text.indexOf('\n', index);
            index = newline === -1 ? text.length : newline + 1;
            continue;
        }
        if (text[index] === '"' || text[index] === "'") {
            const quote = text[index++];
            while (index < text.length && text[index] !== quote) index += 1;
            index += index < text.length ? 1 : 0;
            continue;
        }
        if (text[index] === '!') {
            const end = text.indexOf('!', index + 1);
            const newline = text.indexOf('\n', index + 1);
            index = end !== -1 && (newline === -1 || end < newline) ? end + 1 : (newline === -1 ? text.length : newline + 1);
            continue;
        }
        if (inRanges(index, protectedRanges)) {
            index += 1;
            continue;
        }

        let found = null;
        for (const candidate of entries) {
            const end = normalizedMatchAt(text, index, candidate.normalized, sourceLocale.metadata.id);
            if (end !== -1 && isBoundary(text, index, end, candidate.sourceText)) {
                found = { candidate, end };
                break;
            }
        }
        if (!found) {
            index += 1;
            continue;
        }
        const canonicalEntry = sourceLocale.localeToCanonical[found.candidate.sourceText];
        const target = targetLocale.canonicalToLocale[canonicalEntry.canonical];
        if (!target || target.translatable === false || target.visible === false) {
            index = found.end;
            continue;
        }
        replacements.push({
            start: index,
            end: found.end,
            text: target.text,
            id: canonicalEntry.id,
            canonical: canonicalEntry.canonical,
            status: target.status,
            fallbackLocale: target.fallbackLocale
        });
        index = found.end;
    }
    return replacements;
}

function findKeywordAtOffset(text, offset, localeId, index) {
    const locale = index?.locales?.get(localeId);
    if (!locale || offset < 0 || offset > String(text).length) return null;
    const compiled = compileSourceEntries(locale, String(text));
    if (compiled.error) return null;
    const maxLength = compiled.entries.reduce(
        (maximum, entry) => Math.max(maximum, entry.sourceText.length + 12),
        0
    );
    const firstStart = Math.max(0, offset - maxLength);
    let best = null;
    for (let start = firstStart; start <= offset; start += 1) {
        for (const candidate of compiled.entries) {
            const end = normalizedMatchAt(String(text), start, candidate.normalized, locale.metadata.id);
            if (end === -1 || offset < start || offset > end) continue;
            if (!isBoundary(String(text), start, end, candidate.sourceText)) continue;
            if (!best || end - start > best.end - best.start) {
                best = {
                    text: String(text).slice(start, end),
                    start,
                    end,
                    locale: localeId,
                    ...candidate.entry
                };
            }
        }
    }
    return best;
}

function applyReplacements(text, replacements, sourceUri) {
    const sorted = [...replacements].sort((left, right) => left.start - right.start);
    const mappings = [];
    let inputOffset = 0;
    let outputOffset = 0;
    let output = '';
    for (const replacement of sorted) {
        const unchanged = text.slice(inputOffset, replacement.start);
        if (unchanged.length > 0) {
            mappings.push({
                sourceUri,
                kind: 'identity',
                id: null,
                input: {
                    start: inputOffset,
                    end: replacement.start,
                    range: rangeForOffsets(text, inputOffset, replacement.start)
                },
                output: { start: outputOffset, end: outputOffset + unchanged.length },
                canonical: null,
                status: null,
                fallbackLocale: null
            });
        }
        output += unchanged;
        outputOffset += unchanged.length;
        const outputStart = outputOffset;
        output += replacement.text;
        outputOffset += replacement.text.length;
        mappings.push({
            sourceUri,
            kind: replacement.kind || 'keyword',
            id: replacement.id || null,
            input: { start: replacement.start, end: replacement.end, range: rangeForOffsets(text, replacement.start, replacement.end) },
            output: { start: outputStart, end: outputOffset },
            canonical: replacement.canonical || null,
            status: replacement.status || null,
            fallbackLocale: replacement.fallbackLocale ?? null
        });
        inputOffset = replacement.end;
    }
    const tail = text.slice(inputOffset);
    if (tail.length > 0 || mappings.length === 0) {
        mappings.push({
            sourceUri,
            kind: 'identity',
            id: null,
            input: {
                start: inputOffset,
                end: text.length,
                range: rangeForOffsets(text, inputOffset, text.length)
            },
            output: { start: outputOffset, end: outputOffset + tail.length },
            canonical: null,
            status: null,
            fallbackLocale: null
        });
    }
    output += tail;
    for (const mapping of mappings) {
        mapping.output.range = rangeForOffsets(output, mapping.output.start, mapping.output.end);
    }
    return { text: output, mappings };
}

function translateSource(text, options = {}) {
    const original = String(text ?? '');
    const index = options.index || loadTranslationIndex(options);
    const sourceUri = options.sourceUri || null;
    if (index.errors.length > 0) {
        return {
            ok: false,
            text: original,
            diagnostics: [diagnostic(DIAGNOSTIC_CODES.malformedMap, index.errors[0], original)],
            mappings: [],
            stats: { replacements: 0, inputLength: original.length, outputLength: original.length }
        };
    }
    const localeIds = new Map(index.localeRegistry.map(locale => [locale.id.toLocaleLowerCase('en'), locale.id]));
    const directive = inspectDirective(original, localeIds, options.inheritedLocale);
    if (directive.error) {
        return { ok: false, text: original, diagnostics: [directive.error], mappings: [], stats: { replacements: 0, inputLength: original.length, outputLength: original.length } };
    }
    const targetLocaleId = options.targetLocale || 'en';
    const sourceLocale = index.locales.get(directive.locale);
    const targetLocale = index.locales.get(targetLocaleId);
    if (!sourceLocale || !targetLocale) {
        const unsupported = !sourceLocale ? directive.locale : targetLocaleId;
        return {
            ok: false,
            text: original,
            diagnostics: [diagnostic(DIAGNOSTIC_CODES.unsupportedLocale, `Unsupported locale '${unsupported}'.`, original)],
            mappings: [],
            stats: { replacements: 0, inputLength: original.length, outputLength: original.length }
        };
    }
    const compiled = compileSourceEntries(sourceLocale, original);
    if (compiled.error) {
        return { ok: false, text: original, diagnostics: [compiled.error], mappings: [], stats: { replacements: 0, inputLength: original.length, outputLength: original.length } };
    }

    const protectedRanges = [
        ...collectPathRanges(original),
        ...collectVariableRanges(original, sourceLocale)
    ];
    const replacements = collectKeywordReplacements(
        original,
        compiled.entries,
        sourceLocale,
        targetLocale,
        protectedRanges
    );
    const directiveOccurrence = directive.occurrences[0];
    if (directiveOccurrence) {
        const mode = options.directiveMode || 'rewrite';
        const lineEnd = original.slice(directiveOccurrence.end).match(/^(\r?\n)/)?.[1] || '';
        replacements.push({
            start: directiveOccurrence.start,
            end: directiveOccurrence.end + (mode === 'consume' ? lineEnd.length : 0),
            text: mode === 'consume' ? '' : `// @mydfrg-language ${targetLocaleId}`,
            kind: 'directive'
        });
    }
    const applied = applyReplacements(original, replacements, sourceUri);
    return {
        ok: true,
        text: applied.text,
        diagnostics: [],
        mappings: applied.mappings,
        stats: {
            sourceLocale: directive.locale,
            targetLocale: targetLocaleId,
            replacements: replacements.filter(replacement => replacement.kind !== 'directive').length,
            inputLength: original.length,
            outputLength: applied.text.length
        }
    };
}

module.exports = {
    DIAGNOSTIC_CODES,
    findKeywordAtOffset,
    inspectDirective,
    loadTranslationIndex,
    normalize,
    translateSource
};
