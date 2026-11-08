'use strict';

const path = require('path');
const { parse, visit } = require('jsonc-parser');

const CONTROL_WORDS = new Set(['catch', 'for', 'if', 'switch', 'while', 'with']);
const GENERIC_IDENTIFIERS = new Set(['label', 'message', 'text', 'value']);

function keySegments(values) {
    const segments = [];
    for (const value of values) {
        if (typeof value === 'number') { continue; }
        for (const part of String(value || '').split(/[^A-Za-z0-9_-]+/u)) {
            if (!part) { continue; }
            const segment = /^[A-Za-z]/u.test(part) ? part : `item${part}`;
            if (segments.at(-1) !== segment) { segments.push(segment); }
        }
    }
    return segments;
}

function buildKey(component, construct) {
    const componentSegments = keySegments([component]);
    const constructSegments = keySegments(construct);
    while (constructSegments[0] === componentSegments.at(-1)) { constructSegments.shift(); }
    const segments = [...componentSegments, ...constructSegments];
    return segments.length >= 2 ? segments.join('.') : '';
}

function jsonPathWithArrayIdentity(document, jsonPath) {
    const describedPath = [];
    let current = document;
    for (const segment of jsonPath) {
        if (typeof segment !== 'number') {
            describedPath.push(segment);
            current = current?.[segment];
            continue;
        }
        const item = Array.isArray(current) ? current[segment] : null;
        const identity = item && typeof item === 'object'
            ? ['id', 'key', 'command', 'code', 'name', 'type']
                .map((field) => item[field])
                .find((value) => typeof value === 'string' && value.trim())
            : null;
        describedPath.push(identity || `item${segment + 1}`);
        current = item;
    }
    return describedPath;
}

function uniqueSuggestedKey(suggestedKey, candidateText, line, existingKeys = []) {
    const occupied = new Set(existingKeys);
    if (!suggestedKey || !occupied.has(suggestedKey)) { return suggestedKey; }
    const semanticSuffix = keySegments([candidateText]).slice(0, 4);
    const semanticKey = [...suggestedKey.split('.'), ...semanticSuffix].join('.');
    if (semanticKey !== suggestedKey && !occupied.has(semanticKey)) { return semanticKey; }
    const lineKey = `${suggestedKey}.line${line}`;
    if (!occupied.has(lineKey)) { return lineKey; }
    let sequence = 2;
    while (occupied.has(`${lineKey}.item${sequence}`)) { sequence += 1; }
    return `${lineKey}.item${sequence}`;
}

function suggestJsonPath(sourceText, line, candidateText) {
    const matches = [];
    const targetLine = line - 1;
    const document = parse(sourceText, [], { allowTrailingComma: true });
    visit(sourceText, {
        onObjectProperty: (property, _offset, _length, startLine, _startCharacter, pathSupplier) => {
            if (startLine === targetLine && property === candidateText) {
                matches.push([...pathSupplier(), property]);
            }
        },
        onLiteralValue: (value, _offset, _length, startLine, _startCharacter, pathSupplier) => {
            if (startLine === targetLine && String(value) === candidateText) {
                matches.push(pathSupplier());
            }
        }
    }, { allowTrailingComma: true });
    const jsonPath = matches.sort((left, right) => right.length - left.length)[0] || [];
    return jsonPathWithArrayIdentity(document, jsonPath);
}

function maskJavaScriptStructure(sourceText) {
    let quote = null;
    let escaped = false;
    let blockComment = false;
    let lineComment = false;
    let result = '';
    for (let index = 0; index < sourceText.length; index += 1) {
        const character = sourceText[index];
        const next = sourceText[index + 1];
        if (character === '\n') {
            result += '\n';
            lineComment = false;
            if (quote !== '`') { quote = null; }
            escaped = false;
            continue;
        }
        if (lineComment) { result += ' '; continue; }
        if (blockComment) {
            if (character === '*' && next === '/') {
                result += '  ';
                index += 1;
                blockComment = false;
            } else {
                result += ' ';
            }
            continue;
        }
        if (quote) {
            result += ' ';
            if (escaped) { escaped = false; continue; }
            if (character === '\\') { escaped = true; continue; }
            if (character === quote) { quote = null; }
            continue;
        }
        if (character === '/' && next === '/') {
            result += '  ';
            index += 1;
            lineComment = true;
            continue;
        }
        if (character === '/' && next === '*') {
            result += '  ';
            index += 1;
            blockComment = true;
            continue;
        }
        if (character === '\'' || character === '"' || character === '`') {
            quote = character;
            result += ' ';
            continue;
        }
        result += character;
    }
    return result;
}

function functionName(line) {
    const declaration = line.match(/\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/u);
    if (declaration) { return declaration[1]; }
    const arrow = line.match(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/u);
    if (arrow) { return arrow[1]; }
    const method = line.match(/^\s*(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/u);
    if (method && !CONTROL_WORDS.has(method[1])) { return method[1]; }
    return null;
}

function enclosingFunctions(sourceText, targetLine) {
    const lines = maskJavaScriptStructure(sourceText).split(/\r?\n/u);
    const scopes = [];
    let braceDepth = 0;
    for (let index = 0; index < Math.min(targetLine, lines.length); index += 1) {
        const line = lines[index];
        const name = functionName(line);
        let functionDepth = null;
        for (const character of line) {
            if (character === '{') {
                braceDepth += 1;
                if (name && functionDepth === null) { functionDepth = braceDepth; }
            } else if (character === '}') {
                braceDepth = Math.max(0, braceDepth - 1);
            }
        }
        if (name && functionDepth !== null) { scopes.push({ name, depth: functionDepth }); }
        while (scopes.length && scopes.at(-1).depth > braceDepth) { scopes.pop(); }
    }
    return scopes.map((scope) => scope.name);
}

function strongestMemberExpression(sourceLine) {
    const expressions = Array.from(
        sourceLine.matchAll(/\$\{\s*([A-Za-z_$][\w$]*(?:(?:\?\.)?\.[A-Za-z_$][\w$]*)+)/gu),
        (match) => match[1].replace(/\?\./gu, '.')
    );
    return expressions.sort((left, right) => right.split('.').length - left.split('.').length)[0] || '';
}

function fallbackJavaScriptConstruct(sourceLine) {
    const assignment = sourceLine.match(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/u);
    if (assignment && !GENERIC_IDENTIFIERS.has(assignment[1])) { return assignment[1]; }

    const calls = Array.from(
        sourceLine.matchAll(/([A-Za-z_$][\w$]*(?:\??\.[A-Za-z_$][\w$]*)*)\s*\(/gu),
        (match) => match[1].replace(/\?\./gu, '.')
    ).filter((value) => !CONTROL_WORDS.has(value));
    if (calls.length) { return calls.at(-1); }

    const property = sourceLine.match(/^\s*([A-Za-z_$][\w$]*)\s*:/u);
    return property?.[1] || '';
}

function suggestJavaScriptPath(sourceText, line) {
    const sourceLine = sourceText.split(/\r?\n/u)[line - 1] || '';
    const functions = enclosingFunctions(sourceText, line - 1);
    const expression = strongestMemberExpression(sourceLine) || fallbackJavaScriptConstruct(sourceLine);
    return [...functions, ...expression.split('.').filter(Boolean)];
}

function suggestCatalogKey({ component, relativePath, sourceText, line, candidateText, existingKeys = [] }) {
    const extension = path.extname(relativePath || '').toLocaleLowerCase();
    let construct = [];
    let strategy = 'fallback';
    let confidence = 'low';
    if (extension === '.json' || extension === '.jsonc') {
        construct = suggestJsonPath(sourceText, line, candidateText);
        strategy = 'json-path';
        confidence = construct.length ? 'high' : 'low';
    } else if (['.js', '.cjs', '.mjs', '.ts', '.tsx'].includes(extension)) {
        construct = suggestJavaScriptPath(sourceText, line);
        strategy = 'javascript-context';
        confidence = construct.length >= 2 ? 'medium' : 'low';
    }
    if (!construct.length) {
        construct = [path.basename(relativePath || 'source', extension || undefined), `line${line}`];
    }
    const baseSuggestedKey = buildKey(component, construct);
    const suggestedKey = uniqueSuggestedKey(baseSuggestedKey, candidateText, line, existingKeys);
    return {
        suggestedKey,
        baseSuggestedKey,
        collisionAdjusted: suggestedKey !== baseSuggestedKey,
        strategy,
        confidence,
        construct: keySegments(construct)
    };
}

module.exports = {
    buildKey,
    enclosingFunctions,
    jsonPathWithArrayIdentity,
    suggestCatalogKey,
    suggestJavaScriptPath,
    suggestJsonPath,
    uniqueSuggestedKey
};
