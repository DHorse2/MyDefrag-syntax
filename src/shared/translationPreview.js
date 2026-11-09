'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { fileURLToPath, pathToFileURL } = require('node:url');
const { Parser, parseStates } = require('../server/parser');
const { tokenize } = require('../server/tokenizer');
const { loadTranslationIndex, translateSource } = require('./sourceTranslation');

const INCLUDE_PATTERN = /!include\s+"([^"]+)"!/gi;
const PREVIEW_DIAGNOSTIC_CODES = Object.freeze({
    includeMissing: 'mydfrg.translation.includeMissing',
    includeCircular: 'mydfrg.translation.includeCircular',
    canonicalInvalid: 'mydfrg.translation.canonicalInvalid'
});

function cloneMappingAt(mapping, baseOffset) {
    return {
        ...mapping,
        output: {
            ...mapping.output,
            start: mapping.output.start + baseOffset,
            end: mapping.output.end + baseOffset
        }
    };
}

function mappingsForSegment(mappings, start, end, outputBase) {
    const result = [];
    for (const mapping of mappings) {
        if (mapping.output.start >= start && mapping.output.end <= end) {
            result.push(cloneMappingAt(mapping, outputBase - start));
            continue;
        }
        if (mapping.kind !== 'identity') continue;
        const overlapStart = Math.max(mapping.output.start, start);
        const overlapEnd = Math.min(mapping.output.end, end);
        if (overlapStart >= overlapEnd) continue;
        const inputStart = mapping.input.start + (overlapStart - mapping.output.start);
        result.push({
            ...cloneMappingAt({
                ...mapping,
                input: {
                    ...mapping.input,
                    start: inputStart,
                    end: inputStart + (overlapEnd - overlapStart)
                },
                output: { start: overlapStart, end: overlapEnd }
            }, outputBase - start)
        });
    }
    return result;
}

function positionAt(text, offset) {
    const lines = String(text).slice(0, offset).split(/\r?\n/);
    return { line: lines.length - 1, character: lines[lines.length - 1].length };
}

function finalizeMappings(mappings, outputText) {
    const sources = new Map();
    return mappings.map(mapping => {
        let sourceText = '';
        if (mapping.sourceUri) {
            if (!sources.has(mapping.sourceUri)) {
                sources.set(mapping.sourceUri, fs.readFileSync(fileURLToPath(mapping.sourceUri), 'utf8'));
            }
            sourceText = sources.get(mapping.sourceUri);
        }
        return {
            ...mapping,
            input: {
                ...mapping.input,
                range: {
                    start: positionAt(sourceText, mapping.input.start),
                    end: positionAt(sourceText, mapping.input.end)
                }
            },
            output: {
                ...mapping.output,
                range: {
                    start: positionAt(outputText, mapping.output.start),
                    end: positionAt(outputText, mapping.output.end)
                }
            }
        };
    });
}

function expandTranslatedText(text, mappings, includeResults, kind, diagnostics) {
    const outputMappings = [];
    let output = '';
    let inputOffset = 0;
    let includeIndex = 0;
    INCLUDE_PATTERN.lastIndex = 0;
    let match;

    while ((match = INCLUDE_PATTERN.exec(text)) !== null) {
        outputMappings.push(...mappingsForSegment(mappings, inputOffset, match.index, output.length - inputOffset));
        output += text.slice(inputOffset, match.index);
        const include = includeResults[includeIndex++];
        if (include?.ok) {
            const childText = kind === 'canonical' ? include.canonicalText : include.localizedText;
            const childMappings = kind === 'canonical' ? include.canonicalMappings : include.localizedMappings;
            const insertionStart = output.length;
            output += childText;
            outputMappings.push(...childMappings.map(mapping => cloneMappingAt(mapping, insertionStart)));
        } else {
            const message = include?.message || `missing include ${match[1]}`;
            output += match[0];
            diagnostics.push(include?.diagnostic || {
                code: PREVIEW_DIAGNOSTIC_CODES.includeMissing,
                severity: 'warning',
                message
            });
        }
        inputOffset = match.index + match[0].length;
    }
    outputMappings.push(...mappingsForSegment(mappings, inputOffset, text.length, output.length - inputOffset));
    output += text.slice(inputOffset);
    return { text: output, mappings: outputMappings };
}

function composeLocalizedMappings(canonicalMappings, localizedMappings) {
    const available = [...canonicalMappings];
    return localizedMappings.map(localized => {
        const index = available.findIndex(canonical =>
            canonical.kind === localized.kind
            && canonical.id === localized.id
        );
        if (index === -1) return localized;
        const canonical = available.splice(index, 1)[0];
        return {
            ...localized,
            sourceUri: canonical.sourceUri,
            input: canonical.input
        };
    });
}

function parserDiagnostics(text, entryFile) {
    const isFragment = path.extname(entryFile).toLocaleLowerCase('en') === '.mydc';
    const state = isFragment ? parseStates.SCRIPT_FRAGMENT : parseStates.SCRIPT_UNKNOWN;
    const parser = new Parser(tokenize(text), text, state);
    if (isFragment) parser.parseFragment();
    else parser.parseStatements();
    if (!parser.atEof()) {
        parser.error(1, `Unexpected token '${parser.curr()?.value || ''}'`, parser.curr());
    }
    return parser.errors.filter(error => error.severity === 1);
}

function buildTranslationPreview(entryFile, targetLocale = 'en', options = {}) {
    const resolvedEntry = path.resolve(entryFile);
    const entryRoot = path.dirname(resolvedEntry);
    const index = options.index || loadTranslationIndex(options);
    const diagnostics = [];
    const originalRootText = fs.existsSync(resolvedEntry)
        ? fs.readFileSync(resolvedEntry, 'utf8')
        : '';

    function processFile(filePath, inheritedLocale, stack, isRoot) {
        const resolved = path.resolve(filePath);
        const sourceUri = pathToFileURL(resolved).href;
        if (stack.includes(resolved)) {
            const cycle = [...stack, resolved].map(item => path.basename(item)).join(' -> ');
            return {
                ok: false,
                message: `circular include ${cycle}`,
                diagnostic: {
                    code: PREVIEW_DIAGNOSTIC_CODES.includeCircular,
                    severity: 'warning',
                    message: `Circular include: ${cycle}`,
                    sourceUri
                }
            };
        }
        if (!fs.existsSync(resolved)) {
            return {
                ok: false,
                message: `missing include ${resolved}`,
                diagnostic: {
                    code: PREVIEW_DIAGNOSTIC_CODES.includeMissing,
                    severity: 'warning',
                    message: `Missing include: ${resolved}`,
                    sourceUri
                }
            };
        }

        const source = fs.readFileSync(resolved, 'utf8');
        const canonical = translateSource(source, {
            index,
            inheritedLocale,
            targetLocale: 'en',
            sourceUri,
            directiveMode: isRoot ? 'rewrite' : 'consume'
        });
        if (!canonical.ok) return { ok: false, translationFailure: true, diagnostics: canonical.diagnostics };

        const localized = targetLocale === 'en'
            ? canonical
            : translateSource(canonical.text, {
                index,
                inheritedLocale: 'en',
                targetLocale,
                sourceUri,
                directiveMode: isRoot ? 'rewrite' : 'consume'
            });
        if (!localized.ok) return { ok: false, translationFailure: true, diagnostics: localized.diagnostics };

        const includePaths = [];
        INCLUDE_PATTERN.lastIndex = 0;
        let includeMatch;
        while ((includeMatch = INCLUDE_PATTERN.exec(source)) !== null) {
            includePaths.push(includeMatch[1]);
        }
        const includeResults = includePaths.map(includePath => {
            const childPath = path.resolve(entryRoot, includePath);
            return processFile(
                childPath,
                canonical.stats.sourceLocale,
                [...stack, resolved],
                false
            );
        });
        const translationFailure = includeResults.find(result => result.translationFailure);
        if (translationFailure) return translationFailure;

        const canonicalExpanded = expandTranslatedText(
            canonical.text,
            canonical.mappings,
            includeResults,
            'canonical',
            diagnostics
        );
        const localizedBaseMappings = targetLocale === 'en'
            ? canonical.mappings
            : composeLocalizedMappings(canonical.mappings, localized.mappings);
        const localizedExpanded = targetLocale === 'en'
            ? canonicalExpanded
            : expandTranslatedText(
                localized.text,
                localizedBaseMappings,
                includeResults,
                'localized',
                []
            );
        return {
            ok: true,
            canonicalText: canonicalExpanded.text,
            canonicalMappings: canonicalExpanded.mappings,
            localizedText: localizedExpanded.text,
            localizedMappings: localizedExpanded.mappings
        };
    }

    const result = processFile(resolvedEntry, null, [], true);
    if (!result.ok) {
        return {
            ok: false,
            text: originalRootText,
            canonicalText: originalRootText,
            diagnostics: result.diagnostics || [result.diagnostic].filter(Boolean),
            mappings: [],
            stats: { sourceFiles: 0, targetLocale }
        };
    }
    const invalid = parserDiagnostics(result.canonicalText, resolvedEntry);
    if (invalid.length > 0) {
        return {
            ok: false,
            text: originalRootText,
            canonicalText: result.canonicalText,
            diagnostics: invalid.map(error => ({
                ...error,
                code: PREVIEW_DIAGNOSTIC_CODES.canonicalInvalid,
                message: `Canonical preview validation failed: ${error.message}`
            })),
            mappings: [],
            stats: { sourceFiles: new Set(result.canonicalMappings.map(mapping => mapping.sourceUri)).size, targetLocale }
        };
    }
    return {
        ok: true,
        text: targetLocale === 'en' ? result.canonicalText : result.localizedText,
        canonicalText: result.canonicalText,
        diagnostics,
        mappings: finalizeMappings(
            targetLocale === 'en' ? result.canonicalMappings : result.localizedMappings,
            targetLocale === 'en' ? result.canonicalText : result.localizedText
        ),
        stats: {
            sourceFiles: new Set(result.canonicalMappings.map(mapping => mapping.sourceUri)).size,
            targetLocale
        }
    };
}

module.exports = {
    PREVIEW_DIAGNOSTIC_CODES,
    buildTranslationPreview,
    parserDiagnostics
};
