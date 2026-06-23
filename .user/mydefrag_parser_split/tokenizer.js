'use strict';
// tokenizer.js
const { KEYWORD_MAP, isPredefinedIdentifier } = require('./languageData');

let logger = console;
function configureTokenizer(deps = {}) {
    if (deps.logger) logger = deps.logger;
}

//#region TOKENIZER .Parse
// ─────────────────────────────────────────────────────────────────────────────────
// Token Type
const TT = {
    KEYWORD: 'KEYWORD',
    IDENT: 'IDENT',
    IDENT_PREDEF: 'IDENT_PREDEF',
    NUMBER: 'NUMBER',
    STRING: 'STRING',
    LPAREN: 'LPAREN',
    RPAREN: 'RPAREN',
    COMMA: 'COMMA',
    SLASH: 'SLASH',
    DASH: 'DASH',
    COLON: 'COLON',
    PLUS: 'PLUS',
    STAR: 'STAR',
    PERCENT: 'PERCENT',
    PIPE: 'PIPE',
    DPIPE: 'DPIPE',
    AMP: 'AMP',
    DAMP: 'DAMP',
    MACRO: 'MACRO',
    EOF: 'EOF',
};
// ─────────────────────────────────────────────────────────────────────────────────
// Tokenize Text
function tokenize(text) {
    const tokens = [];
    let i = 0;
    const len = text.length;
    // ─────────────────────────────────────────────────────────────────────────────────
    while (i < len) {
        try { // ─────────────────── Process Next Token ──────────────────────────────────────
            // ─────────────────────────────────────────────────────────────────────────────────
            // Skip whitespace
            if (/\s/.test(text[i])) { i++; continue; }
            // ─────────────────────────────────────────────────────────────────────────────────
            // Skip line comments: //, #, --, REM
            if (text[i] === '/' && text[i + 1] === '/') {
                while (i < len && text[i] !== '\n') i++;
                continue;
            }
            if (text[i] === '#' || (text[i] === '-' && text[i + 1] === '-')) {
                // '--' isn't a comment. neither is REM
                while (i < len && text[i] !== '\n') i++;
                continue;
            }
            // ─────────────────────────────────────────────────────────────────────────────────
            // REM comment (only at word boundary)
            if (/[Rr]/.test(text[i]) &&
                text.slice(i, i + 3).toUpperCase() === 'REM' &&
                (i + 3 >= len || /\W/.test(text[i + 3]))) {
                while (i < len && text[i] !== '\n') i++;
                continue;
            }
            // ─────────────────────────────────────────────────────────────────────────────────
            // Skip block comments /* ... */
            if (text[i] === '/' && text[i + 1] === '*') {
                i += 2;
                while (i < len && !(text[i] === '*' && text[i + 1] === '/')) {
                    i++;
                }
                // Skip closing */
                if (i < len) {
                    i += 2;
                }
                continue;
            }
            const start = i;
            // ─────────────────────────────────────────────────────────────────────────────────
            // Macro !include....! Predefined Identifier !word!
            if (text[i] === '!') {
                i++;
                while (i < len && text[i] !== '!' && text[i] !== '\n') i++;
                if (text[i] === '!') i++;
                const value = text.slice(start, i);
                const internalValue = value.slice(1, value.length - 1)
                const predefined = isPredefinedIdentifier(internalValue);
                const includeCandidate = value.slice(1, 8)
                // !include //
                if (predefined !== null && includeCandidate !== 'include') {
                    tokens.push({ type: TT.IDENT_PREDEF, value: predefined.text, start, end: i });
                } else {
                    tokens.push({ type: TT.MACRO, value: value, start, end: i });
                }
                continue;
            }
            // ─────────────────────────────────────────────────────────────────────────────────
            // String " ... " or ' ... '
            if (text[i] === '"' || text[i] === "'") {
                const q = text[i]; i++;
                while (i < len && text[i] !== q) i++;
                if (i < len) i++; // closing quote
                tokens.push({ type: TT.STRING, value: text.slice(start, i), start, end: i });
                continue;
            }
            // ─────────────────────────────────────────────────────────────────────────────────
            // Number (decimal or float)
            if (/[0-9]/.test(text[i])) {
                while (i < len && /[0-9]/.test(text[i])) i++;
                if (i < len && text[i] === '.') {
                    i++;
                    while (i < len && /[0-9]/.test(text[i])) i++;
                    if (i < len && /[deDE]/.test(text[i])) {
                        i++;
                        if (i < len && /[+\-]/.test(text[i])) i++;
                        while (i < len && /[0-9]/.test(text[i])) i++;
                    }
                }
                tokens.push({ type: TT.NUMBER, value: text.slice(start, i), start, end: i });
                continue;
            }
            // ─────────────────────────────────────────────────────────────────────────────────
            // Identifier or keyword
            if (/[a-zA-Z_]/.test(text[i])) {
                while (i < len && /[a-zA-Z0-9_]/.test(text[i])) i++;
                const value = text.slice(start, i);
                const lower = value.toLowerCase();

                const kw = KEYWORD_MAP.get(lower);

                let type = kw ? TT.KEYWORD : TT.IDENT;
                if (type === TT.IDENT) {
                    const predefined = isPredefinedIdentifier(lower);
                    if (predefined !== null) { type = TT.IDENT_PREDEF; }
                }
                // ...further down, wherever you build the token object:
                // const token = { type, value: lower, start, end: i, parent: kw?.parent ?? null };
                // const type = KEYWORD_MAP.has(lower) ? TT.KEYWORD : TT.IDENT;
                // tokens.push({ type, value, lower, start, end: i });
                const token = { type, value: lower, start, end: i, parent: kw?.parent ?? null };
                tokens.push(token);
                continue;
            }
            // ─────────────────────────────────────────────────────────────────────────────────
            // Punctuation
            switch (text[i]) { // Punctuation
                case '(': tokens.push({ type: TT.LPAREN, value: '(', start, end: i + 1 }); i++; break;
                case ')': tokens.push({ type: TT.RPAREN, value: ')', start, end: i + 1 }); i++; break;
                case ',': tokens.push({ type: TT.COMMA, value: ',', start, end: i + 1 }); i++; break;
                case '/': tokens.push({ type: TT.SLASH, value: '/', start, end: i + 1 }); i++; break;
                case '-': tokens.push({ type: TT.DASH, value: '-', start, end: i + 1 }); i++; break;
                case ':': tokens.push({ type: TT.COLON, value: ':', start, end: i + 1 }); i++; break;
                case '+': tokens.push({ type: TT.PLUS, value: '+', start, end: i + 1 }); i++; break;
                case '*': tokens.push({ type: TT.STAR, value: '*', start, end: i + 1 }); i++; break;
                case '%': tokens.push({ type: TT.PERCENT, value: '%', start, end: i + 1 }); i++; break;
                case '|':
                    if (text[i + 1] === '|') {
                        tokens.push({ type: TT.DPIPE, value: '||', start, end: i + 2 }); i += 2;
                    } else {
                        tokens.push({ type: TT.PIPE, value: '|', start, end: i + 1 }); i++;
                    }
                    break;
                case '&':
                    if (text[i + 1] === '&') {
                        tokens.push({ type: TT.DAMP, value: '&&', start, end: i + 2 }); i += 2;
                    } else {
                        tokens.push({ type: TT.AMP, value: '&', start, end: i + 1 }); i++;
                    }
                    break;
                default:
                    i++; // skip unknown char
                    break;
            }
        } catch (errResult) {
            i++;
            logger.err(errResult, `tokenize had an error: ${errResult.message}`);
        }
    }
    // ─────────────────────────────────────────────────────────────────────────────────
    tokens.push({ type: TT.EOF, value: '', start: len, end: len });
    return tokens;
}
//#endregion
// ─────────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────────
//#region Module Exports
module.exports = {
    TT,
    tokenize,
    configureTokenizer,
};
//#endregion
