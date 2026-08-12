'use strict';

const DEFAULT_CATALOG_IDENTIFIER = 'catalog';
const DEFAULT_VARIABLE_NAME = 'tMessage';

function placeholderNames(text) {
    return Array.from(new Set(
        Array.from(String(text || '').matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g), (match) => match[1])
    )).sort();
}

function identifierIsPresent(sourceText, identifier) {
    const escaped = identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'u').test(sourceText);
}

function availableIdentifier(sourceText, preferredIdentifier) {
    if (!identifierIsPresent(sourceText, preferredIdentifier)) { return preferredIdentifier; }
    let suffix = 2;
    while (identifierIsPresent(sourceText, `${preferredIdentifier}${suffix}`)) {
        suffix += 1;
    }
    return `${preferredIdentifier}${suffix}`;
}

function enclosingBlockText(sourceText, targetIndex) {
    const stack = [];
    const ranges = [];
    let state = 'code';
    for (let index = 0; index < sourceText.length; index += 1) {
        const character = sourceText[index];
        const nextCharacter = sourceText[index + 1];
        if (state === 'line-comment') {
            if (character === '\r' || character === '\n') { state = 'code'; }
            continue;
        }
        if (state === 'block-comment') {
            if (character === '*' && nextCharacter === '/') {
                state = 'code';
                index += 1;
            }
            continue;
        }
        if (state !== 'code') {
            if (character === '\\') {
                index += 1;
            } else if (character === state) {
                state = 'code';
            }
            continue;
        }
        if (character === '/' && nextCharacter === '/') {
            state = 'line-comment';
            index += 1;
        } else if (character === '/' && nextCharacter === '*') {
            state = 'block-comment';
            index += 1;
        } else if (character === "'" || character === '"' || character === '`') {
            state = character;
        } else if (character === '{') {
            stack.push(index);
        } else if (character === '}' && stack.length > 0) {
            ranges.push({ start: stack.pop(), end: index });
        }
    }
    const enclosing = ranges
        .filter((range) => range.start < targetIndex && targetIndex < range.end)
        .sort((left, right) => right.start - left.start)[0];
    return enclosing
        ? sourceText.slice(enclosing.start + 1, enclosing.end)
        : sourceText;
}

function simpleTemplateBindings(rawValue) {
    const bindings = [];
    for (let index = 0; index < rawValue.length; index += 1) {
        if (rawValue[index] === '\\') {
            index += 1;
            continue;
        }
        if (rawValue[index] !== '$' || rawValue[index + 1] !== '{') { continue; }
        const end = rawValue.indexOf('}', index + 2);
        if (end < 0) { return null; }
        const expression = rawValue.slice(index + 2, end).trim();
        if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(expression)) { return null; }
        bindings.push(expression);
        index = end;
    }
    return Array.from(new Set(bindings)).sort();
}

function sourceLineBounds(sourceText, sourceLine) {
    let line = 1;
    let start = 0;
    for (let index = 0; index <= sourceText.length; index += 1) {
        const atEnd = index === sourceText.length;
        const character = sourceText[index];
        if (!atEnd && character !== '\r' && character !== '\n') { continue; }
        if (line === sourceLine) {
            const eol = atEnd
                ? ''
                : character === '\r' && sourceText[index + 1] === '\n'
                    ? '\r\n'
                    : character;
            return { start, end: index, eol };
        }
        if (character === '\r' && sourceText[index + 1] === '\n') { index += 1; }
        line += 1;
        start = index + 1;
    }
    return null;
}

function applyMigrationSourceTransform(sourceText, transform) {
    if (!transform?.ok || !Array.isArray(transform.transformedLines) || transform.transformedLines.length === 0) {
        return { ok: false, error: 'A valid migration source transform is required.' };
    }
    const bounds = sourceLineBounds(sourceText, transform.line);
    if (!bounds) {
        return { ok: false, error: 'The selected source line no longer exists.' };
    }
    const currentLine = sourceText.slice(bounds.start, bounds.end);
    if (currentLine !== transform.originalLine) {
        return { ok: false, error: 'The selected source line changed after the transform preview was created.' };
    }
    const eol = bounds.eol || sourceText.match(/\r\n|\n|\r/u)?.[0] || '\n';
    return {
        ok: true,
        content: `${sourceText.slice(0, bounds.start)}${transform.transformedLines.join(eol)}${sourceText.slice(bounds.end)}`,
        eol
    };
}

function buildMigrationSourceTransform(options = {}) {
    const sourceText = String(options.sourceText || '');
    const candidateText = String(options.candidateText || '');
    const catalogKey = String(options.catalogKey || '').trim();
    const sourceLine = Number(options.line);
    const extractStringCandidates = options.extractStringCandidates;
    const preferredVariableName = String(options.variableName || DEFAULT_VARIABLE_NAME);
    const catalogIdentifier = String(options.catalogIdentifier || DEFAULT_CATALOG_IDENTIFIER);

    if (!Number.isInteger(sourceLine) || sourceLine < 1 || !candidateText || !catalogKey) {
        return { ok: false, error: 'A current source line, candidate text, and catalog key are required.' };
    }
    if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(preferredVariableName)) {
        return { ok: false, error: 'The transform variable name is not a valid JavaScript identifier.' };
    }
    if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(catalogIdentifier)) {
        return { ok: false, error: 'The catalog identifier is not a valid JavaScript identifier.' };
    }
    if (typeof extractStringCandidates !== 'function') {
        return { ok: false, error: 'The configured scanner cannot provide candidate source locations.' };
    }

    const matches = extractStringCandidates(sourceText, { includeLocations: true })
        .filter((candidate) => candidate.line === sourceLine && candidate.text === candidateText);
    if (matches.length !== 1) {
        return {
            ok: false,
            error: matches.length === 0
                ? 'The selected string is no longer present on the reported source line.'
                : 'The selected string occurs more than once on the source line; an exact occurrence is required.'
        };
    }

    const match = matches[0];
    if (match.endLine !== match.line) {
        return { ok: false, error: 'Multiline string replacement is not supported by the initial transform hook.' };
    }
    const templateBindings = match.literalKind === 'template'
        ? simpleTemplateBindings(match.rawValue)
        : [];
    if (templateBindings === null) {
        return {
            ok: false,
            code: 'TEMPLATE_EXPRESSION_PARSER_REQUIRED',
            error: 'Complex template expressions require parser-derived placeholder bindings before transformation.'
        };
    }

    const originalLine = sourceText.split(/\r?\n/)[sourceLine - 1] || '';
    const indentation = originalLine.match(/^\s*/u)?.[0] || '';
    const placeholders = Array.from(new Set([
        ...placeholderNames(candidateText),
        ...templateBindings
    ])).sort();
    const formatArguments = placeholders.length > 0 ? `, { ${placeholders.join(', ')} }` : '';
    const variableName = availableIdentifier(
        enclosingBlockText(sourceText, match.startIndex),
        preferredVariableName
    );
    const loadLine = `${indentation}const ${variableName} = ${catalogIdentifier}.format(${JSON.stringify(catalogKey)}${formatArguments}).text;`;
    const replacementLine = `${originalLine.slice(0, match.startColumn)}${variableName}${originalLine.slice(match.endColumn)}`;
    const variableNameAvailable = variableName === preferredVariableName;
    const replacementReason = variableNameAvailable
        ? 'Ready to replace the exact source line.'
        : `${preferredVariableName} already appears in the source file; ${variableName} will be used instead.`;

    return {
        ok: true,
        line: sourceLine,
        candidateText,
        catalogKey,
        variableName,
        originalLine,
        transformedLines: [loadLine, replacementLine],
        replacementText: `${loadLine}\n${replacementLine}`,
        placeholders,
        sourceLiteral: {
            literal: match.literal,
            literalKind: match.literalKind,
            delimiter: match.delimiter,
            rawValue: match.rawValue,
            startIndex: match.startIndex,
            endIndex: match.endIndex,
            startColumn: match.startColumn,
            endColumn: match.endColumn
        },
        sourceReplacement: {
            enabled: true,
            variableNameAvailable,
            reason: replacementReason
        }
    };
}

module.exports = {
    DEFAULT_CATALOG_IDENTIFIER,
    DEFAULT_VARIABLE_NAME,
    applyMigrationSourceTransform,
    buildMigrationSourceTransform,
    placeholderNames
};
