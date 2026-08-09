'use strict';

(function exposeTextNormalizer(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.LanguageTextNormalizer = api;
    }
}(typeof globalThis === 'object' ? globalThis : this, () => {
    const WORD_PATTERN = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;
    const PLACEHOLDER_PATTERN = /\{[A-Za-z_][A-Za-z0-9_]*\}/g;
    const STRUCTURAL_SEPARATOR_PATTERN = /[_\-\u2010-\u2015\u00b7\u2022]+/gu;
    const TIGHT_PUNCTUATION_PATTERN = /[.:,;!?]+(?=\S)/gu;
    const URL_AT_START_PATTERN = /^(?:https?|file):\/\/[^\s<>"']+/iu;
    const CODICON_AT_START_PATTERN = /^\$\([A-Za-z0-9_-]+\)/u;
    const PLACEHOLDER_AT_START_PATTERN = /^\{[A-Za-z_][A-Za-z0-9_]*\}/u;
    const EXTENSION_AT_START_PATTERN = /^\.[A-Za-z][A-Za-z0-9]{0,15}\b/u;
    const MEANINGFUL_SEPARATOR_AT_START_PATTERN = /^(?:[/\\]+|::|=>|->|\|+)/u;

    function substitutionMap(substitutions) {
        const result = new Map();
        for (const rule of Array.isArray(substitutions) ? substitutions : []) {
            if (!rule || typeof rule.input !== 'string' || typeof rule.output !== 'string') {
                continue;
            }
            const input = rule.input.trim();
            const output = rule.output.trim();
            if (input && output) {
                result.set(input.normalize('NFKC').toLocaleLowerCase(), output);
            }
        }
        return result;
    }

    function validateSubstitutions(substitutions) {
        if (!Array.isArray(substitutions)) {
            return ['Normalized word substitutions must be an array.'];
        }
        const errors = [];
        const inputs = new Set();
        for (const [index, rule] of substitutions.entries()) {
            const label = `Normalized word substitution ${index + 1}`;
            if (!rule || typeof rule !== 'object' || Array.isArray(rule)) {
                errors.push(`${label} must contain input and output strings.`);
                continue;
            }
            if (typeof rule.input !== 'string' || !rule.input.trim()) {
                errors.push(`${label} input must be a non-empty string.`);
            }
            if (typeof rule.output !== 'string' || !rule.output.trim()) {
                errors.push(`${label} output must be a non-empty string.`);
            }
            if (typeof rule.input === 'string' && rule.input.trim()) {
                const key = rule.input.trim().normalize('NFKC').toLocaleLowerCase();
                if (inputs.has(key)) {
                    errors.push(`${label} duplicates input ${rule.input.trim()} (case-insensitive).`);
                }
                inputs.add(key);
            }
            const unsupported = Object.keys(rule).filter((key) => !['input', 'output'].includes(key));
            if (unsupported.length > 0) {
                errors.push(`${label} has unsupported field(s): ${unsupported.join(', ')}.`);
            }
        }
        return errors;
    }

    function templateExpressionEnd(text, start) {
        let depth = 1;
        let quote = null;
        let escaped = false;
        for (let index = start + 2; index < text.length; index += 1) {
            const character = text[index];
            if (escaped) {
                escaped = false;
                continue;
            }
            if (character === '\\') {
                escaped = true;
                continue;
            }
            if (quote) {
                if (character === quote) { quote = null; }
                continue;
            }
            if (character === '"' || character === "'" || character === '`') {
                quote = character;
            } else if (character === '{') {
                depth += 1;
            } else if (character === '}') {
                depth -= 1;
                if (depth === 0) { return index; }
            }
        }
        return -1;
    }

    function protectTemplateExpressions(text, protect) {
        let result = '';
        let offset = 0;
        while (offset < text.length) {
            const start = text.indexOf('${', offset);
            if (start < 0) { break; }
            const end = templateExpressionEnd(text, start);
            if (end < 0) { break; }
            result += text.slice(offset, start);
            result += protect(text.slice(start, end + 1));
            offset = end + 1;
        }
        return `${result}${text.slice(offset)}`;
    }

    function trimUrlToken(token) {
        let result = token;
        while (/[.,;!?]$/u.test(result)) { result = result.slice(0, -1); }
        const pairs = [['(', ')'], ['[', ']']];
        for (const [open, close] of pairs) {
            const openCount = Array.from(result).filter((character) => character === open).length;
            let closeCount = Array.from(result).filter((character) => character === close).length;
            while (result.endsWith(close) && closeCount > openCount) {
                result = result.slice(0, -1);
                closeCount -= 1;
            }
        }
        return result;
    }

    function runtimeSyntaxTokenAt(text, index) {
        const remainder = text.slice(index);
        if (remainder.startsWith('${')) {
            const end = templateExpressionEnd(text, index);
            return end < 0 ? null : text.slice(index, end + 1);
        }
        const url = remainder.match(URL_AT_START_PATTERN)?.[0];
        if (url) { return trimUrlToken(url); }
        for (const pattern of [
            CODICON_AT_START_PATTERN,
            PLACEHOLDER_AT_START_PATTERN,
            EXTENSION_AT_START_PATTERN,
            MEANINGFUL_SEPARATOR_AT_START_PATTERN
        ]) {
            const token = remainder.match(pattern)?.[0];
            if (token) { return token; }
        }
        return null;
    }

    function transformRuntimeSyntax(value, transform) {
        const text = String(value ?? '');
        let result = '';
        let offset = 0;
        let index = 0;
        while (index < text.length) {
            const token = runtimeSyntaxTokenAt(text, index);
            if (!token) {
                index += 1;
                continue;
            }
            result += text.slice(offset, index);
            result += transform(token);
            index += token.length;
            offset = index;
        }
        return `${result}${text.slice(offset)}`;
    }

    /**
     * @param {*} value Text to normalize.
     * @param {{input: string, output: string}[]} substitutions Canonical rules.
     * @param {{preserveTemplateExpressions?: boolean,
     *   preserveRuntimeSyntax?: boolean}|boolean} options When omitted,
     *   JavaScript `${...}` expressions remain byte-for-byte intact. Lossless
     *   build callers can additionally preserve runtime syntax.
     * @returns {string} Translation-oriented normalized text.
     */
    function normalizeText(value, substitutions = [], options = {}) {
        const replacements = substitutionMap(substitutions);
        const preserveTemplateExpressions = typeof options === 'boolean'
            ? options
            : options.preserveTemplateExpressions !== false;
        const preserveRuntimeSyntax = typeof options === 'object'
            && options.preserveRuntimeSyntax === true;
        const protectedValues = [];
        const protect = (text) => {
            if (protectedValues.length >= 0xF8FF - 0xE000) {
                throw new Error('The text contains too many protected normalization values.');
            }
            const marker = String.fromCodePoint(0xE000 + protectedValues.length);
            protectedValues.push(text);
            return marker;
        };

        let text = String(value ?? '').normalize('NFKC');
        if (preserveRuntimeSyntax) {
            text = transformRuntimeSyntax(text, protect);
        } else if (preserveTemplateExpressions) {
            text = protectTemplateExpressions(text, protect);
        }
        if (!preserveRuntimeSyntax) {
            text = text.replace(PLACEHOLDER_PATTERN, (placeholder) => protect(placeholder));
        }

        // Protect direct substitutions before identifier splitting. This keeps
        // intended outputs such as JavaScript from being split a second time.
        text = text.replace(WORD_PATTERN, (token) => {
            const replacement = replacements.get(token.toLocaleLowerCase());
            return replacement === undefined ? token : protect(replacement);
        });

        text = text
            .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
            .replace(/([a-z\d])([A-Z])/g, '$1 $2')
            .replace(/([A-Za-z])(\d)/g, '$1 $2')
            .replace(/(\d)([A-Za-z])/g, '$1 $2')
            .replace(STRUCTURAL_SEPARATOR_PATTERN, ' ')
            .replace(TIGHT_PUNCTUATION_PATTERN, ' ');

        // A second pass lets rules target tokens produced by camel-case and
        // separator expansion, without recursively processing rule outputs.
        text = text.replace(WORD_PATTERN, (token) => {
            const replacement = replacements.get(token.toLocaleLowerCase());
            return replacement === undefined ? token : protect(replacement);
        });

        text = text
            .replace(/\s+/gu, ' ')
            .replace(/\s+([,.;:!?])/gu, '$1')
            .trim();

        for (const [index, replacement] of protectedValues.entries()) {
            text = text.replaceAll(String.fromCodePoint(0xE000 + index), replacement);
        }
        return text;
    }

    return Object.freeze({
        normalizeText,
        transformRuntimeSyntax,
        validateSubstitutions
    });
}));
