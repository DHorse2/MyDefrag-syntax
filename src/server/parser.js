'use strict';
// parser.js
const { TT } = require('./tokenizer');
const {
    KEYWORDS,
    KEYWORDS_MAP,
    KEYWORDS_BY_PARENT,
    KEYWORDS_SETTINGS,
    KEYWORDS_SETTINGS_SET,

    kwGetGroup,
    kwParentExists,
    kwIterateParent,
    kwIterateGroup,

    PREDEFINED_IDENT,
    isPredefinedIdentifier,
} = require('./languageData');

let logger = console;
let ini = {
    severity: {
        Error: 1,
        Warning: 2,
        Information: 3,
        Hint: 4,
    },
    fragmentParentLevel: 4,
};

function configureParser(deps = {}) {
    if (deps.logger) logger = deps.logger;
    if (deps.ini) ini = deps.ini;
}

// Region PARSER .Parse ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────────
const parseStates = {
    SCRIPT_FULL: 0,
    SCRIPT_FRAGMENT: 1,
    SCRIPT_UNKNOWN: 2
};
const fragmentTraceSingleLine = false;
class Parser {
    constructor(tokens, text, state = parseStates.SCRIPT_UNKNOWN) {
        this.tokens = tokens;
        this.text = text;
        this.state = state;
        this.pos = 0;
        this.errors = [];
        this.start = 0;
        this.errorCount = 0;
        this.errorFlag = false;
        // todo logger.dbg("stuff")
    }
    //#region ────── (Primitives) Cross-cutting functions .Parse ───────────────
    peek() { return this.curr(); }
    curr() { return this.tokens[this.pos]; }
    next() { return this.tokens[this.pos++]; }
    prev() { return this.tokens[this.pos - 1]; }
    atEof() { return !this.curr() || this.curr().type === TT.EOF; }

    // Yes or No?
    parseYesNo() {
        if (this.completeStatementWithMacro()) return;

        if (!this.isAnyKw('yes', 'no')) {
            this.error(ini.severity.Error, `Expected 'yes' or 'no'`);
        } else this.next();
    }

    // Convert character offset to { line, character }
    offsetToPos(offset) {
        let line = 0, lastNl = -1;
        for (let i = 0; i < offset && i < this.text.length; i++) {
            if (this.text[i] === '\n') { line++; lastNl = i; }
        }
        return { line, character: offset - lastNl - 1 };
    }

    // ─────────────────────────────────────────────────────────────────────────────────
    /**
     * Adds a parser diagnostic and logs it immediately for later inspection.
     *
     * @param {number} severity The LSP diagnostic severity.
     * @param {string} message The diagnostic message.
     * @param {{ line: number, character: number }} start The diagnostic start position.
     * @param {{ line: number, character: number }} end The diagnostic end position.
     */
    addDiagnostic(severity, message, start, end) {
        this.errors.push({
            message: message,
            range: {
                start,
                end,
            },
            severity,
        });

        logger.message(
            severity,
            `[diagnostic] ${message} ` +
            `(line ${start.line + 1}, char ${start.character + 1} - ` +
            `line ${end.line + 1}, char ${end.character + 1}; ` +
            `state=${this.state}, pos=${this.pos})`
        );
    }

    error = (errorSeverity, message, token) => {
        token = token || this.curr();
        const s = this.offsetToPos(token.start);
        const e = this.offsetToPos(token.end);
        this.addDiagnostic(errorSeverity, message, s, e);
    }

    warning = (errorSeverity, message, token) => {
        token = token || this.curr();
        const s = this.offsetToPos(token.start);
        const e = this.offsetToPos(token.end);
        this.addDiagnostic(errorSeverity, message, s, e);
    }

    warningAtStart(message) {
        const pos = { line: 0, character: 0 };

        this.addDiagnostic(ini.severity.Warning, message, pos, pos);
    }
    //#endregion
    // ─────────────────────────────────────────────────────────────────────────────────
    //#region Match a keyword (case-insensitive)
    expectKw(kw) {
        let t = this.curr();
        if ((t.type === TT.KEYWORD || t.type === TT.IDENT) && t.value.toLowerCase() === kw.toLowerCase()) {
            return this.next();
        }

        if (this.completeStatementWithMacro(t)) return t;
        this.completeStatementAfterMacro(t);

        this.error(ini.severity.Error, `Expected '${kw}' but found '${t.value}'`, t);
        return null;
    }

    // Try to match a keyword without consuming on failure
    tryKw(kw) {
        let t = this.curr();
        if ((t.type === TT.KEYWORD || t.type === TT.IDENT) && t.value.toLowerCase() === kw.toLowerCase()) {
            this.next(); return true;
        }
        return false;
    }

    isKw(kw) {
        let t = this.curr();
        return (t.type === TT.KEYWORD || t.type === TT.IDENT) && t.value.toLowerCase() === kw.toLowerCase();
    }

    isAnyKw(...kws) {
        let t = this.curr();
        if (t.type !== TT.KEYWORD && t.type !== TT.IDENT) return false;
        return kws.some(k => k.toLowerCase() === t.value.toLowerCase());
    }

    expect(type, desc) {
        let t = this.curr();
        if (t.type === type) return this.next();

        if (this.completeStatementWithMacro(t)) return t;
        this.completeStatementAfterMacro(t);

        this.error(ini.severity.Error, `Expected ${desc || type} but found '${t.value}'`, t);
        return null;
    }

    tryType(type) {
        if (this.curr().type === type) { this.next(); return true; }
        return false;
    }

    /**
     * Checks whether the current token is a macro/include directive.
     *
     * @param {object} token Token to test.
     * @returns {boolean} True when the token is a macro/include directive.
     */
    isMacroToken(token = this.curr()) {
        return !!(
            token &&
            (
                token.type === TT.MACRO ||
                (
                    token.type === TT.KEYWORD &&
                    String(token.value || '').toLowerCase() === 'include'
                )
            )
        );
    }

    /**
     * Consumes a macro/include directive when one is present.
     *
     * @returns {boolean} True when a macro/include directive was consumed.
     */
    consumeMacroToken() {
        if (!this.isMacroToken()) return false;

        this.next();
        return true;
    }

    /**
     * Throws the internal signal used when a macro completes the current statement.
     */
    throwMacroStatementCompletion() {
        const macroCompletion = new Error('MYDEFRAG_MACRO_COMPLETES_STATEMENT');
        macroCompletion.code = 'MYDEFRAG_MACRO_COMPLETES_STATEMENT';
        throw macroCompletion;
    }

    /**
     * Checks whether the previous token was a macro/include directive.
     *
     * @returns {boolean} True when the previous token was a macro/include directive.
     */
    previousTokenWasMacro() {
        return this.isMacroToken(this.prev());
    }

    /**
     * Finishes the visible tail left after a macro completes a statement.
     */
    finishMacroCompletedStatement() {
        while (!this.atEof() && this.curr().type === TT.RPAREN) {
            this.next();
        }
    }

    /**
     * Completes the current statement when a macro substitutes the remaining text.
     *
     * @param {object} token Token to test.
     */
    completeStatementWithMacro(token = this.curr()) {
        if (!this.isMacroToken(token)) return false;

        this.next();

        if (!this.atEof() &&
            (
                this.curr().type === TT.COMMA ||
                this.curr().type === TT.RPAREN
            )
        ) {
            return true;
        }

        this.throwMacroStatementCompletion();
    }

    /**
     * Completes the current statement when a previous macro left no valid continuation.
     *
     * @param {object} token Current token.
     */
    completeStatementAfterMacro(token = this.curr()) {
        if (!this.previousTokenWasMacro()) return;

        if (
            this.atEof() ||
            token?.type === TT.RPAREN ||
            token?.type === TT.KEYWORD ||
            token?.type === TT.IDENT
        ) {
            this.throwMacroStatementCompletion();
        }
    }

    /**
     * Checks whether an error is an internal macro-completion signal.
     *
     * @param {Error} errResult Error-like object.
     * @returns {boolean} True when the error represents macro statement completion.
     */
    isMacroStatementCompletion(errResult) {
        return errResult?.code === 'MYDEFRAG_MACRO_COMPLETES_STATEMENT';
    }
    //#endregion
    //
    //#region Grammar rules - .Parse Statements ─────────────────────────────────────────────────────────
    parseStatements(options = {}) {
        const reportUnexpected = options.reportUnexpected ?? true;

        while (!this.atEof()) {
            const statementStart = this.pos;
            const t = this.curr();
            // Next statemement
            if (!this.parseStatement()) {
                // failed
                this.errorCount++;
                if (reportUnexpected) {
                    this.error(
                        ini.severity.Error,
                        `Unexpected statement '${t?.value ?? ''}'`,
                        t
                    );
                }
                return false;
            }

            // Safety guard: parseStatement() must consume at least one token.
            if (this.pos === statementStart) {
                this.errorCount++;
                this.error(
                    ini.severity.Error,
                    `Parser made no progress at '${t?.value ?? ''}'`,
                    t
                );
                return false;
            }
        }
        return true;
    }
    // .parseStatement
    parseStatement() {
        let t;
        try { // greedy tokey consumer via nested
            // t = current token
            t = this.curr();
            // Skip preprocessor !include "..."! directives
            // logger.dbg(5, `xxx`);
            // logger.dbg(5, `>>>>> ${t.value} type: ${t.type} vs. IDENT or MACRO`)
            // Macros
            if (this.consumeMacroToken()) {
                t = this.curr();
                return true;
            }
            // KEYWORD
            const kw = (t.type === TT.KEYWORD || t.type === TT.IDENT) ? t.value.toLowerCase() : '';
            switch (kw) { // Statements // 'script' level
                case 'description':
                    this.next();
                    this.expect(TT.LPAREN, '(');
                    this.expect(TT.STRING, 'string');
                    this.expect(TT.RPAREN, ')');
                    return true;

                case 'excludevolumes':
                    this.next();
                    this.expect(TT.LPAREN, '(');
                    this.parseVolumeBooleans();
                    this.expect(TT.RPAREN, ')');
                    return true;

                case 'excludefiles':
                    this.next();
                    this.expect(TT.LPAREN, '(');
                    this.parseFileBooleans(true);
                    this.expect(TT.RPAREN, ')');
                    return true;

                case 'volumeselect':
                    this.next();
                    this.parseVolumeBooleans();
                    this.expectKw('VolumeActions');
                    this.parseVolumeActions();
                    this.expectKw('VolumeEnd');
                    return true;

                case 'setfilecolor':
                    // ToDo detect parent type.
                    // Outside a VolumeSelect:
                    // SetFileColor(FILESTATE, NUMBER, NUMBER, NUMBER)
                    // Inside a VolumeSelect:
                    // SetFileColor(FILEBOOLEAN, FILESTATE, NUMBER, NUMBER, NUMBER)

                    this.next();
                    this.expect(TT.LPAREN, '(');
                    this.parseFileColorBooleans();
                    this.expect(TT.COMMA, ',');
                    this.parseNumber();
                    this.expect(TT.COMMA, ',');
                    this.parseNumber();
                    this.expect(TT.COMMA, ',');
                    this.parseNumber();
                    this.expect(TT.RPAREN, ')');
                    return true;

                default:
                    if (this.isSetting()) { this.parseSetting(); return true; }
                    return false;
            }
        } catch (errResult) {
            if (this.isMacroStatementCompletion(errResult)) {
                this.finishMacroCompletedStatement();
                return true;
            }

            const currentToken = this.curr?.();
            const tokenValue = String(t?.value ?? '').toLowerCase();
            const nextTokenValue = String(currentToken?.value ?? '').toLowerCase();
            const message = `server.js:Parser:parseStatement: Unexpected error parsing Token: ${tokenValue} NextToken: ${nextTokenValue} Error: ${errResult.message}`;
            console?.error?.(message);           // debugger
            logger?.err?.(errResult, message);   // output channel
            this.error?.(ini.severity.Error, message, t); // document diagnostic
            return false;
        }
    }
    // ── Fragments .Parse ───────────────────────────────────────────────────────
    // Full Parse / Fragment Parse Decision Flow
    // | Step | Action                                       | Result                                     |
    // | ---- | -------------------------------------------- | ------------------------------------------ |
    // | 1    | Save current parser position and error count | Allows rollback                            |
    // | 2    | Call `parseStatements()`                     | Attempt full script parse                  |
    // | 3    | Check `atEof()`                              | Entire file consumed?                      |
    // | 4a   | `atEof() == true` and no new errors          | **SCRIPT_FULL success → return true**      |
    // | 4b   | `atEof() == false`                           | Full parse failed → try fragment mode      |
    // | 4c   | `atEof() == true` but new errors exist       | Treat as parse failure → try fragment mode |
    // | 5    | Restore position and error count             | Clean fragment parse start                 |
    // | 6    | Call fragment parser                         | Classify fragment context                  |
    // | 7    | Fragment parses successfully                 | **SCRIPT_FRAGMENT success → return true**  |
    // | 8    | Fragment parse fails                         | **return false**                           |

    restoreState(errorCount = this.errorCount) {
        // Reset and try fragment-mode parsing from beginning.
        this.pos = this.start;
        this.errors.length = errorCount;
    }

    noNewErrors(errorCount = this.errorCount) {
        return (this.errors.length === errorCount);
    }

    // Verbose fragment parser tracing.
    // logger.dbg(5, ...) is expected to respect verboseLevel internally.
    fragmentTrace(label, data = {}, details = {}) {
        const firstColumns = [
            ['#', data.count, 3],
            ['step', data.step, 2],
            ['event', label, 15],
            ['type', data.tokenType, 8],
            ['kw', data.keyword, 15],
            ['kind', data.keywordKind ?? data.kind ?? data.fragmentKind, 15],
            ['parent', data.keywordParent ?? data.parent ?? data.fragmentParent, 15],
            ['ok', data.ok, 6],
            ['pos', data.pos, 4],
            ['token', data.tokenValue, 40],
        ];

        const secondColumns = [
            ['_____', "___________________", 20],
            ['allowed', data.allowed, 7],
            ['parsed', data.parsed, 7],
            ['stack', data.fragmentStack, 12],
            ['errFlag', this.errorFlag ?? false, 6],
            ['errs', data.errorsAfter ?? data.errors, 4],
            ['fragmentKind', data.fragmentKind, 12],
            ['fragmentParent', data.fragmentParent, 12],
            ['fragmentStack', data.fragmentStack, 40],
        ];

        let message;

        if (fragmentTraceSingleLine) {
            message = this.formatTraceColumnsPacked([...firstColumns, ...secondColumns]);
            logger?.messageDetail?.(null, message);
        } else {
            message = this.formatTraceColumnsFixed(firstColumns);
            logger?.messageDetail?.(null, message);

            message = this.formatTraceColumnsFixed(secondColumns);
            logger?.messageDetail?.(null, message);
        }

        if (details && Object.keys(details).length) {
            message = Object.entries(details)
                .map(([name, value]) => `${name} = ${this.formatTraceValue(value)}`)
                .join('], [');

            logger?.messageDetail?.(null, `details [${message}]`);
        }

        logger?.messageDetail?.(null, ".");
    }

    /**
     * Formats fragment trace columns as one packed single-line message.
     *
     * @param {Array<Array>} columns The trace columns to format.
     * @returns {string} Packed trace column text.
     */
    formatTraceColumnsPacked(columns) {
        return columns
            .filter(column => Array.isArray(column) && column[0] !== '_____')
            .map(([name, value]) => `${name}=${this.formatTraceValue(value)}`)
            .join(', ');
    }

    /**
     * Formats fragment trace columns as fixed-width trace output.
     *
     * @param {Array<Array>} columns The trace columns to format.
     * @returns {string} Fixed-width trace column text.
     */
    formatTraceColumnsFixed(columns) {
        return columns
            .filter(column => Array.isArray(column))
            .map(([name, value, width]) => `[${name} = ${this.formatTraceColumn(value+']', width)}`)
            .join(', ');
    }

    /**
     * Formats one fragment trace value as packed single-line text.
     *
     * @param {*} value The value to format.
     * @returns {string} Single-line trace text.
     */
    formatTraceValue(value) {
        let text;

        if (value === null || value === undefined) {
            text = '';
        } else if (Array.isArray(value)) {
            text = value.join('>');
        } else if (typeof value === 'object') {
            text = JSON.stringify(value);
        } else {
            text = String(value);
        }

        return text.replace(/\s+/g, ' ');
    }

    /**
     * Formats one fragment trace value as a fixed-width single-line column.
     *
     * @param {*} value The value to format.
     * @param {number} width The maximum visible column width.
     * @returns {string} Padded or truncated column text.
     */
    formatTraceColumn(value, width) {
        let text;

        text = this.formatTraceValue(value);
        if (text.length > width) {
            text = text.slice(0, Math.max(0, width - 1)) + '…';
        }

        return text.padEnd(width, ' ');
    }

    parseFragment() {
        this.start = this.pos;
        const fragmentErrorCount = this.errors.length;
        this.errorCount = fragmentErrorCount;
        this.errorFlag = false;
        //#region First try normal full-document / full-statement parsing.
        // ─────────────────────────────────────────────────────────────────────────────────
        // First try normal full-document / full-statement parsing.
        // Do not report "unexpected statement" yet because this may be a valid fragment.
        const fullParseOk = this.parseStatements({
            reportUnexpected: false
        });

        if (fullParseOk && this.atEof() && this.noNewErrors(fragmentErrorCount)) {
            logger.dbg(3, `server.js:Parser:parseFragment: Full statement parse succeeded: ${this.errors.length}`);
            return true;
        }

        // ─────────────────────────────────────────────────────────────────────────────────
        logger.dbg(5, `server.js:Parser:parseFragment: Full statement parse failed. Errors: ${this.errors.length}`);

        this.restoreState(fragmentErrorCount);
        this.errorCount = fragmentErrorCount;

        // Fragment Properties:
        // ok: true,
        // kind: 'volumeactions',
        // parent: 'volume_block',
        // opens: null,
        // closes: null,
        // allowedParents: ['volume_block', ...]
        const fragment = {
            ok: false,
            kind: null,
            parent: null,
            parent: null,
            stack: [],
            incompleteKeyword: false
        };
        //#endregion
        // ─────────────────────────────────────────────────────────────────────────────────
        // Process remaining file (or whole file)
        let fragmentInfo;
        let fragmentCount = 0;
        let keywordData;
        let parsed;
        let canReplaceFragmentParent;
        let t;
        let allowed;

        while (!this.atEof()) {
            fragmentCount++;
            const statementStart = this.pos;
            const statementErrors = this.errors.length;
            t = this.curr();

            fragmentInfo = {
                count: fragmentCount,
                step: 0,
                pos: this.pos,
                keyword: "",
                // keywordKind,
                // keywordData,
                tokenType: t?.type,
                tokenValue: t?.value,
                tokenParent: t?.parent ?? null,
                tokenPosition: t?.start !== undefined ? this.offsetToPos(t.start) : null,
                ok: fragment.ok,
                fragmentKind: fragment.kind,
                fragmentParent: fragment.parent,
                fragmentStack: [...(fragment.stack ?? [])],
                errors: this.errors.length

            };
            fragmentInfo.step++;
            this.fragmentTrace("f-start", fragmentInfo);

            // ─────────────────────────────────────────────────────────────────────────────────
            // Parse statement
            // MACROs
            if (this.isMacroToken(t)) {
                this.fragmentTrace("macro-skip", fragmentInfo);
                this.next();
            } else {
                // KEYWORD
                const parenthesizedBoolean = t?.type === TT.LPAREN
                    ? this.parseParenthesizedBooleanFragment()
                    : null;
                const keyword = parenthesizedBoolean
                    ? parenthesizedBoolean.keywordData.keyword
                    : (
                        t &&
                        (t.type === TT.KEYWORD || t.type === TT.IDENT)
                    ) ? String(t.value).toLowerCase() : '';

                fragmentInfo.step++;
                this.fragmentTrace("keyword", fragmentInfo);

                // NO KEYWORD error
                if (!keyword) {
                    this.errorFlag = true;
                    this.fragmentTrace("no-keyword", fragmentInfo);

                    this.error(
                        ini.severity.Error,
                        `server.js:Parser:parseFragment: Expected fragment keyword, got '${t?.value}'`
                    );
                    break;
                }

                // Get Keyword Data
                keywordData = parenthesizedBoolean
                    ? parenthesizedBoolean.keywordData
                    : this.parseFragmentKeywordBackward(keyword, {
                        fragment,
                        token: t
                    });

                // Update trace data
                fragmentInfo.keyword = keyword;
                fragmentInfo.keywordKind = keywordData.kind;
                fragmentInfo.keywordParent = keywordData.parent;

                fragmentInfo.step++;
                this.fragmentTrace("kw-data", fragmentInfo, {
                    opens: keywordData?.opens ?? null,
                    closes: keywordData?.closes ?? null,
                    allowedParents: keywordData?.allowedParents ?? [],
                    parentHints: keywordData?.parentHints ?? null,
                });

                // Unknown fragment keyword
                if (!keywordData || !keywordData.ok) {
                    const prefixMatches = this.findKnownKeywordPrefixMatches(keyword);
                    if (this.isTrailingKeywordPrefix(t, prefixMatches)) {
                        fragment.incompleteKeyword = true;
                        this.fragmentTrace("kw-prefix", fragmentInfo, {
                            keywordData,
                            prefixMatches
                        });
                        this.next();
                        break;
                    }

                    this.errorFlag = true;
                    this.fragmentTrace("kw-unknown", fragmentInfo, {
                            keywordData,
                        });

                    this.error(
                        ini.severity.Error,
                        `server.js:Parser:parseFragment: Unknown fragment keyword '${keyword}' parent '${t.parent}'`
                    );
                    break;
                }

                // ─────────────────────────────────────────────────────────────────────────────────
                // Determine script category. Based on first statement
                fragmentInfo.step++;
                canReplaceFragmentParent =
                    !fragment.parent ||
                    fragment.parent === 'any' ||
                    (
                        fragment.parent === 'script' &&
                        keywordData.parent !== 'script' &&
                        keywordData.parent !== 'any'
                    ) ||
                    (
                        fragment.parent === 'value' &&
                        fragment.kind === 'operator' &&
                        (
                            keywordData.kind === 'file_condition' ||
                            keywordData.kind === 'volume_condition'
                        )
                    );

                this.fragmentTrace("what-kind", fragmentInfo, {
                        canReplaceFragmentParent,
                    });

                if (canReplaceFragmentParent) {
                    fragment.kind = keywordData.kind;
                    fragment.parent = keywordData.parent;
                    fragment.parentHints = keywordData.parentHints || null;

                    this.fragmentTrace("set-kind", fragmentInfo, {
                            fragmentParentHints: fragment.parentHints,
                        });
                }

                // ─────────────────────────────────────────────────────────────────────────────────
                // Later statements must be legal in the established fragment context.
                allowed = this.fragmentAllows(keywordData, fragment);
                fragmentInfo.step++;
                this.fragmentTrace("f-allowed", fragmentInfo, {
                        allowedParents: keywordData.allowedParents ?? [],
                    });

                if (!allowed) {
                    this.errorFlag = true;
                    this.error(
                        ini.severity.Error,
                        `server.js:Parser:parseFragment: '${keyword}' is '${keywordData.kind}' and belongs in '${keywordData.parent}', ` +
                        `but this fragment was established as '${fragment.parent}'`
                    );
                    break;
                }

                // ─────────────────────────────────────────────────────────────────────────────────
                // Now actually parse the statement using the real parser.
                parsed = parenthesizedBoolean
                    ? parenthesizedBoolean.parsed
                    : this.parseFragmentStatementByKind(keywordData);
                fragmentInfo.step++;
                this.fragmentTrace("parse-by-kind", fragmentInfo, {
                        startPos: statementStart,
                        endPos: this.pos,
                        consumedTokens: this.pos - statementStart,
                        errorsBefore: statementErrors,
                        errorsAfter: this.errors.length,

                    });

                if (!parsed) {
                    this.errorFlag = true;
                    this.pos = statementStart;
                    this.errors.length = statementErrors;

                    this.fragmentTrace("parse--error", fragmentInfo, {
                            restoredPos: this.pos,
                            restoredErrors: this.errors.length,
                        });

                    this.error(
                        ini.severity.Error,
                        `server.js:Parser:parseFragment: Failed parsing fragment statement '${keyword}' as '${keywordData.kind}'`
                    );
                    break;
                }

                // Safety guard: parser must consume something.
                if (this.pos === statementStart) {
                    this.errorFlag = true;
                    this.fragmentTrace("no-progress", fragmentInfo);
                    this.error(
                        ini.severity.Error,
                        `server.js:Parser:parseFragment: Parser made no progress at '${keyword}'`
                    );
                    break;
                }

                if (!this.errorFlag) {
                    this.updateFragmentStack(keywordData, fragment);

                    this.fragmentTrace("update-stack", fragmentInfo, {
                            opens: keywordData.opens ?? null,
                            closes: keywordData.closes ?? null,
                        }
                    );
                }
            }
        }

        fragmentInfo.step++;
        this.fragmentTrace("loop-end", fragmentInfo, {
                atEof: this.atEof(),
                errorFlag: this.errorFlag,
            }
        );
        if (!fragment.incompleteKeyword) {
            this.hintFragmentParent(fragment);
        }
        if (this.atEof() && !this.errorFlag) { return true; } else { return false; }
    }
    // Builds a hint to insert at the top of the document.
    hintFragmentParent(fragment) {
        if (!fragment) return;

        const parents = this.getFragmentParentHints(fragment);
        if (!parents.length) return;

        const message =
            parents.length === 1
                ? `SCRIPT_FRAGMENT: insert this fragment inside ${parents[0]}.`
                : `SCRIPT_FRAGMENT: insert this fragment inside one of: ${parents.join(', ')}.`;

        this.hintAtStart(message);
    }
    // Add a hint diagnostic at the start of the document.
    hintAtStart(message) {
        const start = { line: 0, character: 0 };
        const end = { line: 0, character: 1 };

        this.addDiagnostic(ini.fragmentParentLevel ?? ini.severity.Hint, message, start, end);
    }
    // Get the array of hint descriptions
    getFragmentParentHints(fragment) {
        const parent = fragment.parent;
        const kind = fragment.kind;

        switch (parent) {
            case 'script':
                return ['script'];

            case 'volume_block':
                return ['VolumeSelect ... VolumeActions ... VolumeEnd block'];

            case 'volumeactions':
                return ['VolumeActions'];

            case 'file_block':
                return ['FileSelect ... FileActions ... FileEnd block'];

            case 'fileactions':
                return ['FileActions'];

            case 'fileselect':
                return ['FileSelect'];

            case 'volumeselect':
                return ['VolumeSelect'];

            case 'any':
                return ['script', 'VolumeActions', 'FileActions'];

            default:
                if (kind === 'settingInline') {
                    return ['script'];
                }

                return parent ? [parent] : [];
        }
    }
    // ─────────────────────────────────────────────────────────────────────────────────
    //#region isValue
    isNumber() {
        return this.curr()?.type === TT.NUMBER;
    }

    isString() {
        return this.curr()?.type === TT.STRING;
    }

    isDateTime() {
        // This is intentionally broad.
        // Real date/time parsing is handled later by parseDateTime().
        return this.isNumber() || this.isKw('now');
    }

    /**
     * Finds known keywords that start with the supplied in-progress text.
     *
     * @param {string} prefix In-progress keyword text.
     * @returns {string[]} Matching complete keyword texts.
     */
    findKnownKeywordPrefixMatches(prefix) {
        const normalized = String(prefix || '').toLowerCase();
        const matches = [];
        const seen = new Set();

        if (!normalized) return matches;

        const addMatch = (keywordText) => {
            const text = String(keywordText || '').toLowerCase();
            if (
                text.length > normalized.length &&
                text.startsWith(normalized) &&
                !seen.has(text)
            ) {
                seen.add(text);
                matches.push(text);
            }
        };

        for (const keyword of KEYWORDS) {
            addMatch(keyword?.text);
        }

        for (const keyword of KEYWORDS_SETTINGS) {
            addMatch(keyword);
        }

        return matches;
    }

    /**
     * Detects an active trailing partial keyword that completion can still finish.
     *
     * @param {object} token Current token.
     * @param {string[]} prefixMatches Known keyword completions for the token.
     * @returns {boolean} True when the token is the final in-progress word.
     */
    isTrailingKeywordPrefix(token, prefixMatches) {
        if (!token || !Array.isArray(prefixMatches) || prefixMatches.length === 0) {
            return false;
        }

        if (token.type !== TT.IDENT && token.type !== TT.KEYWORD) {
            return false;
        }

        return this.tokens[this.pos + 1]?.type === TT.EOF;
    }
    //#endregion
    //#region  Backward reasoning functions.
    parseSingleTokenFragment() {
        if (this.atEof()) return false;
        this.next();
        return true;
    }

    parseWithProgress(parseFn) {
        const start = this.pos;
        const errorCount = this.errors.length;
        parseFn.call(this);
        return this.pos > start && this.errors.length === errorCount;
    }

    /**
     * Parses a fragment that starts with a grouped FileBoolean or VolumeBoolean.
     *
     * @returns {?object} Fragment parse result and classification metadata.
     */
    parseParenthesizedBooleanFragment() {
        const start = this.pos;
        const errorCount = this.errors.length;

        const fileKeywordData = {
            ok: true,
            keyword: '(...)',
            kind: 'file_condition',
            parent: 'fileactions',
            opens: null,
            closes: null,
            allowedParents: ['fileactions', 'fileselect']
        };

        const volumeKeywordData = {
            ok: true,
            keyword: '(...)',
            kind: 'volume_condition',
            parent: 'volumeselect',
            opens: null,
            closes: null,
            allowedParents: ['volumeselect']
        };

        if (this.tryParenthesizedBooleanFragment(() => this.parseFileBooleans(false))) {
            return {
                parsed: true,
                keywordData: fileKeywordData
            };
        }

        this.pos = start;
        this.errors.length = errorCount;

        if (this.tryParenthesizedBooleanFragment(this.parseVolumeBooleans)) {
            return {
                parsed: true,
                keywordData: volumeKeywordData
            };
        }

        this.pos = start;
        this.errors.length = errorCount;
        return null;
    }

    /**
     * Attempts a grouped boolean parse without leaving failed state behind.
     *
     * @param {Function} parseFn Boolean parser to try.
     * @returns {boolean} True when the parser consumed tokens without diagnostics.
     */
    tryParenthesizedBooleanFragment(parseFn) {
        const start = this.pos;
        const errorCount = this.errors.length;

        parseFn.call(this);

        if (this.pos > start && this.errors.length === errorCount) {
            return true;
        }

        this.pos = start;
        this.errors.length = errorCount;
        return false;
    }

    parseFragmentKeywordBackward(keyword, ctx = {}) {
        //
        switch ((keyword || '').toLowerCase()) {
            //#region Top-level script statements
            case 'batterypower':
            case 'description':
            case 'title':
            case 'whenfinished':
            case 'appendlogfile':
            case 'write':
            case 'message':
                return this.backwardScriptStatement(ctx, keyword);

            case 'setvariable':
            case 'setvariabledefault':
            case 'setvariableifempty':
                return this.backwardSetVariable(ctx);
            //#endregion
            //#region Volume-level blocks
            case 'volumeselect':
                return this.backwardVolumeSelect(ctx);

            case 'volumeactions':
                return this.backwardVolumeActions(ctx);

            case 'volumeend':
                return this.backwardVolumeEnd(ctx);

            case 'excludevolumes':
                return this.backwardExcludeVolumes(ctx);
            //#endregion
            //#region File-level blocks
            case 'fileselect':
                return this.backwardFileSelect(ctx);

            case 'fileactions':
                return this.backwardFileActions(ctx);

            case 'fileend':
                return this.backwardFileEnd(ctx);

            case 'excludefiles':
                return this.backwardExcludeFiles(ctx);
            //#endregion
            //#region Volume action statements
            case 'makegap':
                return this.backwardVolumeAction(ctx);

            case 'setfilecolor':
                return this.backwardSetFileColor(ctx);
            //#endregion
            //#region  File action statements
            case 'sortbyname':
            case 'sortbyextension':
            case 'sortbysize':
            case 'sortbycreationdate':
            case 'sortbylastaccess':
            case 'sortbylastchange':
            case 'sortbyimportancetofile':
            case 'sortbyimportancetovolume':
            case 'sortbyfragmentation':
            case 'sortbyimportsequence':
            case 'sortbylcn':
                return this.backwardFileSortAction(ctx);

            case 'moveup':
            case 'movedown':
            case 'movedownfill':
            case 'movetoendofdisk':
            case 'movetobeginofvolume':
            case 'moveuptozone':
            case 'movetoendofdsk': // keep only if your grammar currently accepts this typo/alias
                return this.backwardFileMoveAction(ctx);

            case 'defragment':
            case 'fastfill':
            case 'forcedfill':
            case 'vacate':
            case 'addgap':
                return this.backwardFileAction(ctx);

            case 'placentfssystemfiles':
                return this.backwardFileMoveAction(ctx);

            case 'chunksize':
            case 'fast':
                return this.backwardDefragment(ctx);
            //#endregion
            //#region Volume conditions
            case 'mounted':
            case 'writable':
            case 'removable':
            case 'fixed':
            case 'remote':
            case 'cdrom':
            case 'ramdisk':
            case 'name':
            case 'label':
            case 'fragmentsize':
            case 'checkvolume':
            case 'commandlinevolumes':
            case 'numberbetween':
            case 'filesystemtype':
                return this.backwardVolumeCondition(ctx);

            case 'size':
            case 'fragmentcount':
                if (ctx.token?.parent === 'volume_condition') {
                    return this.backwardVolumeCondition(ctx);
                }
                return this.backwardFileSelectAction(ctx);
            //#endregion
            //#region State
            // yes/no - an orphan can belong to any of these:
            case 'archive':
            case 'compressed':
            case 'encrypted':
            case 'hidden':
            case 'unmovable':
            case 'virtual':
            case 'fragmented':
            case 'lastaccessenabled':
            case 'nottobeindexed':
            case 'offline':
            case 'readonly':
            case 'selectntfssystemfiles':
            case 'sparse':
            case 'system':
            case 'temporary':
            case 'directory':

            // xxx(String) - so a string or path
            case 'directoryname':
            case 'directorypath':
            case 'filename':
            case 'importlistfromfile':
            case 'importlistfromprogramhints':

            // xxx(String, String)
            case 'fullpath':

            // xxx()
            case 'importlistfrombootoptimize':

            // number xxx(1)
            case 'largest':
            case 'smallest':

            // ranges xxx(1,2)
            case 'lastaccess':
            case 'lastchange':
            case 'creationdate':
            case 'smallestfragmentsize':
            case 'largestfragmentsize':
            case 'averagefragmentsize':
                // File boolean keyword.
                return this.backwardFileSelectAction(ctx);

            case 'filelocation':
                // FileLocation(ARGUMENT , NUMBER , NUMBER)
                // Possible values for ARGUMENT: BeginOfFile Select files if the beginning of the file is inside the area. 
                // EndOfFile Select files if the end of the file is inside the area. 
                // EntireFile Select files that have all their data inside the area. 
                // AnyPart Select files if any of their data is inside the area. 
                // AnyCompleteFragment Select files if at least 1 complete fragment is inside the area. 
                return this.backwardFileSortAction(ctx);
            //#endregion
            //#region Operators, Values and Units
            case 'or': case 'and': case 'not':
                // Operators
                return this.backwardOperator(ctx);

            case 'all':
                // Operators - All can be volume or file select
                return this.backwardAll(ctx);

            case 'yes': case 'no':
                // Operators
                return this.backwardLiteral(ctx);

            // Special/simple
            case 'fastboot':
                return this.backwardSimpleStatement(ctx);

            case 'now': case 'ago':
                // Time reference keywords
                return this.backwardTime(ctx);

            case 'year': case 'years':
            case 'month': case 'months':
            case 'week': case 'weeks':
            case 'day': case 'days':
            case 'hour': case 'hours':
            case 'minute': case 'minutes':
            case 'second': case 'seconds':
                // Time units
                return this.backwardTimeUnit(ctx);

            case 'rounddown': case 'roundup':
            case 'minimum': case 'maximum':
                // Arithmetic functions
                return this.backwardMath(ctx);

            // Size unit suffixes (SI)
            case 'k': case 'm': case 'g': case 't':
            case 'p': case 'e': case 'z': case 'y':
            // Size unit suffixes (byte labels)
            case 'kb': case 'mb': case 'gb': case 'tb':
            case 'pb': case 'eb': case 'zb': case 'yb':
            // Size unit suffixes (IEC binary)
            case 'ki': case 'mi': case 'gi': case 'ti':
            case 'pi': case 'ei': case 'zi': case 'yi':
                // Size unit suffixes
                return this.backwardSizeUnit(ctx);
            //#endregion
            default:
                if (this.isSetting()) {
                    // this.parseSetting(); 
                    return this.backwardSetting(ctx);
                }
                if (this.isNumber()) {
                    return this.backwardNumber(ctx);
                }
                if (this.isString()) {
                    return this.backwardString(ctx);
                }
                if (this.isDateTime()) {
                    return this.backwardDateTime(ctx);
                }
                return this.backwardUnknownKeyword(keyword, ctx);
        }
    }
    // ─────────────────────────────────────────────────────────────────────────────────
    //#endregion
    //#region Backward Syntax Classification

    // Script level statements
    backwardScriptStatement(ctx, kind = null) {
        const keyword = String(ctx.token?.value || '').toLowerCase();

        return {
            ok: true,
            keyword,
            kind: kind || keyword,
            parent: 'script',
            opens: null,
            closes: null,
            allowedParents: ['script']
        };
    }

    backwardSetting(ctx) {
        const keyword = String(ctx.token?.value || '').toLowerCase();

        if (keyword === 'setstatisticswindowtext') {
            return {
                ok: true,
                keyword,
                kind: 'settingInline',
                parent: 'any',
                opens: null,
                closes: null,
                allowedParents: ['script', 'volumeactions', 'fileactions', 'any']
            };
        }

        return this.backwardScriptStatement(ctx, 'settingInline');
    }

    backwardVolumeSelect(ctx) {
        return {
            ok: true,
            kind: 'volumeselect',
            parent: 'volume_block',
            opens: 'volume_block',
            closes: null,
            allowedParents: ['volume_block', 'script']
        };
    }

    backwardVolumeActions(ctx) {
        return {
            ok: true,
            kind: 'volumeactions',
            parent: 'volume_block',
            opens: null,
            closes: null,
            allowedParents: ['volume_block']
        };
    }

    backwardVolumeEnd(ctx) {
        return {
            ok: true,
            kind: 'volumeend',
            parent: 'volume_block',
            opens: null,
            closes: 'volume_block',
            allowedParents: ['volume_block']
        };
    }

    backwardFileSelect(ctx) {
        return {
            ok: true,
            kind: 'fileselect',
            parent: 'volumeactions',
            opens: 'file_block',
            closes: null,
            allowedParents: ['volumeactions']
        };
    }

    backwardFileActions(ctx) {
        return {
            ok: true,
            kind: 'fileactions',
            parent: 'file_block',
            opens: null,
            closes: null,
            allowedParents: ['file_block']
        };
    }

    backwardFileEnd(ctx) {
        return {
            ok: true,
            kind: 'fileend',
            parent: 'file_block',
            opens: null,
            closes: 'file_block',
            allowedParents: ['file_block']
        };
    }

    backwardSetVariable(ctx) {
        return {
            ok: true,
            keyword: String(ctx.token?.value || '').toLowerCase(),
            kind: 'settingInline',
            parent: 'any',
            opens: null,
            closes: null,
            allowedParents: ['script', 'volumeactions', 'fileactions', 'any']
        };
    }

    /**
     * Classifies SetFileColor fragments by the command argument shape.
     *
     * Outside VolumeSelect:
     * SetFileColor(FILESTATE, NUMBER, NUMBER, NUMBER)
     *
     * Inside VolumeSelect:
     * SetFileColor(FILEBOOLEAN, FILESTATE, NUMBER, NUMBER, NUMBER)
     *
     * @param {object} ctx Fragment parsing context.
     * @returns {object} Fragment classification metadata.
     */
    backwardSetFileColor(ctx) {
        const keyword = String(ctx.token?.value || '').toLowerCase();
        const isVolumeAction = !this.isSetFileColorSettingForm();

        return {
            ok: true,
            keyword,
            kind: isVolumeAction ? 'volume_action' : 'settingInline',
            parent: isVolumeAction ? 'volumeactions' : 'script',
            opens: null,
            closes: null,
            allowedParents: isVolumeAction ? ['volumeactions'] : ['script']
        };
    }

    /**
     * Detects whether SetFileColor uses the outside-VolumeSelect setting form.
     *
     * @returns {boolean} True when the first top-level comma is followed by a number.
     */
    isSetFileColorSettingForm() {
        let depth = 0;

        for (let i = this.pos; i < this.tokens.length; i++) {
            const token = this.tokens[i];
            if (!token || token.type === TT.EOF) return false;

            if (token.type === TT.LPAREN) {
                depth++;
                continue;
            }

            if (token.type === TT.RPAREN) {
                depth--;
                if (depth <= 0) return false;
                continue;
            }

            if (depth === 1 && token.type === TT.COMMA) {
                return this.tokens[i + 1]?.type === TT.NUMBER;
            }
        }

        return false;
    }

    backwardExcludeVolumes(ctx) {
        return {
            ok: true,
            keyword: 'excludevolumes',
            kind: 'excludevolumes',
            parent: 'script',
            opens: null,
            closes: null,
            allowedParents: ['script']
        };
    }

    backwardExcludeFiles(ctx) {
        return {
            ok: true,
            keyword: 'excludefiles',
            kind: 'excludefiles',
            parent: 'script',
            opens: null,
            closes: null,
            allowedParents: ['script']
        };
    }

    /**
     * Classifies fragments that start inside VolumeSelect(...).
     *
     * @param {object} ctx Fragment parsing context.
     * @returns {object} Fragment classification metadata.
     */
    backwardVolumeCondition(ctx) {
        return {
            ok: true,
            keyword: String(ctx.token?.value || '').toLowerCase(),
            kind: 'volume_condition',
            parent: 'volumeselect',
            opens: null,
            closes: null,
            allowedParents: ['volumeselect']
        };
    }

    backwardFileSelectAction(ctx) {
        return {
            ok: true,
            keyword: String(ctx.token?.value || '').toLowerCase(),
            kind: 'file_condition',
            parent: 'fileactions',
            opens: null,
            closes: null,
            allowedParents: ['fileactions', 'fileselect']
        };
    }

    /**
     * Classifies fragments that start inside VolumeActions(...).
     *
     * @param {object} ctx Fragment parsing context.
     * @returns {object} Fragment classification metadata.
     */
    backwardVolumeAction(ctx) {
        return {
            ok: true,
            keyword: String(ctx.token?.value || '').toLowerCase(),
            kind: 'volume_action',
            parent: 'volumeactions',
            opens: null,
            closes: null,
            allowedParents: ['volumeactions']
        };
    }

    backwardFileSortAction(ctx) {
        return {
            ok: true,
            keyword: String(ctx.token?.value || '').toLowerCase(),
            kind: 'sort',
            parent: 'fileactions',
            opens: null,
            closes: null,
            allowedParents: ['fileactions', 'file_action']
        };
    }

    backwardFileMoveAction(ctx) {
        return {
            ok: true,
            keyword: String(ctx.token?.value || '').toLowerCase(),
            kind: 'file_action',
            parent: 'fileactions',
            opens: null,
            closes: null,
            allowedParents: ['fileactions']
        };
    }

    backwardFileAction(ctx) {
        return {
            ok: true,
            keyword: String(ctx.token?.value || '').toLowerCase(),
            kind: 'file_action',
            parent: 'fileactions',
            opens: null,
            closes: null,
            allowedParents: ['fileactions']
        };
    }

    /**
     * Classifies Defragment option fragments such as Fast.
     *
     * @param {object} ctx Fragment parsing context.
     * @returns {object} Fragment classification metadata.
     */
    backwardDefragment(ctx) {
        return {
            ok: true,
            keyword: String(ctx.token?.value || '').toLowerCase(),
            kind: 'defragment_option',
            parent: 'defragment',
            opens: null,
            closes: null,
            allowedParents: ['defragment', 'file_action']
        };
    }

    /**
     * Classifies logical operator fragments such as and, or, and not.
     *
     * @param {object} ctx Fragment parsing context.
     * @returns {object} Fragment classification metadata.
     */
    backwardOperator(ctx) {
        return this.backwardValueFragment(ctx, 'operator');
    }

    /**
     * Classifies the All keyword, which can appear in multiple boolean contexts.
     *
     * @param {object} ctx Fragment parsing context.
     * @returns {object} Fragment classification metadata.
     */
    backwardAll(ctx) {
        return this.backwardValueFragment(ctx, 'boolean_all');
    }

    /**
     * Classifies literal fragments such as yes and no.
     *
     * @param {object} ctx Fragment parsing context.
     * @returns {object} Fragment classification metadata.
     */
    backwardLiteral(ctx) {
        return this.backwardValueFragment(ctx, 'literal');
    }

    /**
     * Classifies date/time keyword fragments such as now and ago.
     *
     * @param {object} ctx Fragment parsing context.
     * @returns {object} Fragment classification metadata.
     */
    backwardTime(ctx) {
        return this.backwardValueFragment(ctx, 'time');
    }

    /**
     * Classifies date/time unit fragments such as days and hours.
     *
     * @param {object} ctx Fragment parsing context.
     * @returns {object} Fragment classification metadata.
     */
    backwardTimeUnit(ctx) {
        return this.backwardValueFragment(ctx, 'time_unit');
    }

    /**
     * Classifies math function fragments such as RoundDown and Maximum.
     *
     * @param {object} ctx Fragment parsing context.
     * @returns {object} Fragment classification metadata.
     */
    backwardMath(ctx) {
        return this.backwardValueFragment(ctx, 'value');
    }

    /**
     * Classifies size suffix fragments such as K, MB, and Gi.
     *
     * @param {object} ctx Fragment parsing context.
     * @returns {object} Fragment classification metadata.
     */
    backwardSizeUnit(ctx) {
        return this.backwardValueFragment(ctx, 'size_unit');
    }

    /**
     * Classifies number fragments.
     *
     * @param {object} ctx Fragment parsing context.
     * @returns {object} Fragment classification metadata.
     */
    backwardNumber(ctx) {
        return this.backwardValueFragment(ctx, 'value');
    }

    /**
     * Classifies string fragments.
     *
     * @param {object} ctx Fragment parsing context.
     * @returns {object} Fragment classification metadata.
     */
    backwardString(ctx) {
        return this.backwardValueFragment(ctx, 'string');
    }

    /**
     * Classifies date/time value fragments.
     *
     * @param {object} ctx Fragment parsing context.
     * @returns {object} Fragment classification metadata.
     */
    backwardDateTime(ctx) {
        return this.backwardValueFragment(ctx, 'datetime');
    }

    /**
     * Builds common metadata for standalone value/operator fragments.
     *
     * @param {object} ctx Fragment parsing context.
     * @param {string} kind Fragment kind.
     * @returns {object} Fragment classification metadata.
     */
    backwardValueFragment(ctx, kind) {
        return {
            ok: true,
            keyword: String(ctx.token?.value || '').toLowerCase(),
            kind,
            parent: 'value',
            opens: null,
            closes: null,
            allowedParents: ['value', 'file_condition', 'volume_condition', 'defragment', 'sort']
        };
    }

    backwardSimpleStatement(ctx) {
        const keyword = String(ctx.token?.value || '').toLowerCase();

        return {
            ok: true,
            keyword,
            kind: keyword,
            parent: 'script',
            opens: null,
            closes: null,
            allowedParents: ['script']
        };
    }

    backwardUnknownKeyword(keyword, ctx) {
        return {
            ok: false,
            keyword: String(keyword || '').toLowerCase(),
            kind: 'unknown',
            parent: null,
            opens: null,
            closes: null,
            allowedParents: []
        };
    }
    // ─────────────────────────────────────────────────────────────────────────────────
    // Builds Case Statement structures
    makeBackwardCases(keywords) {
        return keywords
            .map(k => {
                const method =
                    'backward' +
                    k.replace(/[^a-zA-Z0-9]+/g, ' ')
                        .trim()
                        .split(/\s+/)
                        .map(s => s[0].toUpperCase() + s.slice(1))
                        .join('');

                return `        case '${k.toLowerCase()}':\n            return this.${method}(ctx);`;
            })
            .join('\n\n');
    }
    //#endregion
    //#region Parse Fragment functions
    fragmentAllows(keywordData, fragment) {
        if (!keywordData || !fragment) return false;

        // First statement is always allowed to establish the fragment.
        if (!fragment.parent) return true;

        // Statements explicitly marked any are legal in established fragments.
        if (keywordData.parent === 'any') return true;

        // Exact parent match.
        if (keywordData.parent === fragment.parent) return true;

        // Explicit allowed parent match.
        if (
            Array.isArray(keywordData.allowedParents) &&
            keywordData.allowedParents.includes(fragment.parent)
        ) {
            return true;
        }

        // If this fragment opened a nested block, allow statements inside it.
        const currentBlock = fragment.stack?.[fragment.stack.length - 1];
        if (currentBlock && keywordData.parent === currentBlock) return true;

        if (
            currentBlock &&
            Array.isArray(keywordData.allowedParents) &&
            keywordData.allowedParents.includes(currentBlock)
        ) {
            return true;
        }

        return false;
    }
    // ─────────────────────────────────────────────────────────────────────────────────
    parseFragmentStatementByKind(keywordData) {
        switch (keywordData.kind) {
            // Normal statements/blocks already handled by parseStatement()
            case 'description':
            case 'title':
            case 'whenfinished':
            case 'appendlogfile':
            case 'write':
            case 'message':
            case 'settingInline':
                return this.parseStatement();

            case 'volumeselect':
            case 'volumeactions':
            case 'volumeend':

            case 'fileselect':
            case 'fileactions':
            case 'fileend':
                return this.parseCompoundStructureFragment(keywordData);

            case 'excludevolumes':
            case 'excludefiles':

            case 'fastboot':
                return this.parseStatement();

            // Fragments that start inside VolumeSelect(...)
            case 'volume_condition':
                return this.parseWithProgress(this.parseVolumeBooleans);

            // Fragments that start inside VolumeActions(...)
            case 'volume_action':
            case 'filesystem':
                return this.parseWithProgress(this.parseVolumeActions);

            // Fragments that start inside FileSelect(...)
            case 'file_condition':
            case 'file_attribute':
                return this.parseWithProgress(() => this.parseFileBooleans(false));

            // Fragments that start inside FileActions(...)
            case 'file_action':
            case 'sort':
            case 'action_modifier':
                return this.parseWithProgress(this.parseFileActions);

            // Fragments that start inside Defragment(...)
            case 'defragment_option':
                return this.parseWithProgress(this.parseDefragmentOptions);

            // Literal value fragment
            case 'value':
                return this.parseWithProgress(this.parseNumber);

            case 'operator':
            case 'boolean_all':
            case 'literal':
            case 'time':
            case 'time_unit':
            case 'size_unit':
            case 'string':
            case 'datetime':
                return this.parseSingleTokenFragment();

            default:
                return this.parseStatement();
        }
    }

    /**
     * Parses an orphaned compound structure marker in fragment mode.
     *
     * @param {object} keywordData Fragment keyword metadata.
     * @returns {boolean} True when the structure marker was consumed.
     */
    parseCompoundStructureFragment(keywordData) {
        const t = this.curr();

        if (!this.parseSingleTokenFragment()) return false;

        this.warning(
            ini.severity.Warning,
            `SCRIPT_FRAGMENT: orphaned compound structure '${keywordData.keyword || t?.value}' may be incomplete`,
            t
        );

        return true;
    }
    // ─────────────────────────────────────────────────────────────────────────────────
    updateFragmentStack(keywordData, fragment) {
        if (!keywordData || !fragment) return;

        if (!Array.isArray(fragment.stack)) {
            fragment.stack = [];
        }

        if (keywordData.closes) {
            const top = fragment.stack[fragment.stack.length - 1];

            if (top === keywordData.closes) {
                fragment.stack.pop();
            }
        }

        if (keywordData.opens) {
            fragment.stack.push(keywordData.opens);
        }
    }
    //#endregion
    // ─────────────────────────────────────────────────────────────────────────────────
    //#region Volume and FIle Booleans .Parse ───────────────────────────────────────────────────────
    parseVolumeBooleans() {
        if (this.atEof()) return;

        this.parseVolumeBoolean();
        while (!this.atEof() && !this.isKw('VolumeActions') && !this.isKw('VolumeEnd')) {
            if (this.isAnyKw('or', 'and') ||
                this.curr().type === TT.PIPE || this.curr().type === TT.DPIPE ||
                this.curr().type === TT.AMP || this.curr().type === TT.DAMP) {
                this.next();
                this.parseVolumeBoolean();
            } else {
                break;
            }
        }
    }
    parseVolumeBoolean() {
        if (this.atEof()) return;

        let t = this.curr();
        // Parentheses
        if (t.type === TT.LPAREN) {
            this.next();
            // recursive call to handle parentheses ( ...conditions... )
            this.parseVolumeBooleans();
            this.expect(TT.RPAREN, ')');
            return;
        }
        // Macros
        // Macros
        if (!this.atEof() &&
            (t.type === TT.MACRO ||
                (t.type === TT.KEYWORD && t.value.toLowerCase() === 'include'))
        ) {
            this.next();
            t = this.curr();
            return;
        }
        // KEYWORD
        const kw = (t.type === TT.KEYWORD || t.type === TT.IDENT) ? t.value.toLowerCase() : '';
        // Booleans
        switch (kw) { // VolumeBoolean
            case 'not':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.parseVolumeBooleans();
                this.expect(TT.RPAREN, ')');
                break;
            case 'all': case 'checkvolume':
                this.next();
                break;
            case 'commandlinevolumes':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.expect(TT.RPAREN, ')');
                break;
            case 'mounted': case 'writable': case 'removable': case 'fixed':
            case 'remote': case 'cdrom': case 'ramdisk':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.parseYesNo();
                this.expect(TT.RPAREN, ')');
                break;
            case 'name': case 'label':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.expect(TT.STRING, 'string');
                this.expect(TT.RPAREN, ')');
                break;
            case 'size': case 'fragmentcount': case 'fragmentsize':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.parseNumber();
                this.expect(TT.COMMA, ',');
                this.parseNumber();
                this.expect(TT.RPAREN, ')');
                break;
            case 'numberbetween':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.parseNumber();
                this.expect(TT.COMMA, ',');
                this.parseNumber();
                this.expect(TT.COMMA, ',');
                this.parseNumber();
                this.expect(TT.RPAREN, ')');
                break;
            case 'filesystemtype':
                this.next();
                this.expect(TT.LPAREN, '(');
                if (!this.isAnyKw('ntfs', 'fat', 'fat12', 'fat16', 'fat32')) {
                    this.error(ini.severity.Error, `Expected filesystem type (NTFS, FAT, FAT12, FAT16, FAT32)`);
                } else this.next();
                this.expect(TT.RPAREN, ')');
                break;
            default:
                this.error(ini.severity.Error, `Unexpected token '${t.value}' in volume boolean`, t);
                this.next(); // skip to avoid infinite loop
        }
    }
    // ── File Booleans .Parse ─────────────────────────────────────────────────────────
    parseFileBooleans(reportErrors = true) {
        console?.log('server.js:Parser: parseFileBooleans: ' + this.curr().value);
        this.parseFileBoolean(reportErrors);
        console?.log('server.js:Parser: parseFileBooleans after first boolean: ' + this.curr().value);
        while (!this.atEof() && !this.isKw('FileActions') && !this.isKw('FileEnd') && !this.isKw('VolumeEnd')) {
            if (this.isAnyKw('or', 'and') ||
                this.curr().type === TT.PIPE || this.curr().type === TT.DPIPE ||
                this.curr().type === TT.AMP || this.curr().type === TT.DAMP) {
                this.next();
                this.parseFileBoolean(reportErrors);
            } else {
                break;
            }
        }
    }
    parseFileBoolean(reportErrors = true) {
        let t = this.curr();
        // Parentheses
        if (t.type === TT.LPAREN) {
            this.next();
            // does recursive calls for nested parentheses
            this.parseFileBooleans(reportErrors);
            this.expect(TT.RPAREN, ')');
            return;
        }
        // Macros
        let skippedMacro = false;
        while (!this.atEof() &&
            (t.type === TT.MACRO ||
                (t.type === TT.KEYWORD && t.value.toLowerCase() === 'include'))
        ) {
            skippedMacro = true;
            this.next();
            t = this.curr();
        }

        if (skippedMacro &&
            (
                t.type === TT.RPAREN ||
                this.isAnyKw('or', 'and') ||
                t.type === TT.PIPE ||
                t.type === TT.DPIPE ||
                t.type === TT.AMP ||
                t.type === TT.DAMP
            )
        ) {
            return;
        }

        // KEYWORD
        const kw = (t.type === TT.KEYWORD || t.type === TT.IDENT) ? t.value.toLowerCase() : '';
        switch (kw) { // FileBoolean
            case 'not':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.parseFileBooleans(reportErrors);
                this.expect(TT.RPAREN, ')');
                break;
            case 'all':
                this.next();
                break;
            case 'importlistfrombootoptimize':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.expect(TT.RPAREN, ')');
                break;
            case 'filename': case 'directoryname': case 'directorypath':
            case 'importlistfromfile': case 'importlistfromprogramhints':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.expect(TT.STRING, 'string');
                this.expect(TT.RPAREN, ')');
                break;
            case 'fullpath':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.expect(TT.STRING, 'string');
                this.expect(TT.COMMA, ',');
                this.expect(TT.STRING, 'string');
                this.expect(TT.RPAREN, ')');
                break;
            case 'size': case 'fragmentcount':
            case 'averagefragmentsize': case 'largestfragmentsize': case 'smallestfragmentsize':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.parseNumber();
                this.expect(TT.COMMA, ',');
                this.parseNumber();
                this.expect(TT.RPAREN, ')');
                break;
            case 'lastaccess': case 'lastchange': case 'creationdate':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.parseDateTime();
                this.expect(TT.COMMA, ',');
                this.parseDateTime();
                this.expect(TT.RPAREN, ')');
                break;
            case 'largest': case 'smallest':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.parseNumber();
                this.expect(TT.RPAREN, ')');
                break;
            case 'fragmented': case 'lastaccessenabled':
            case 'archive': case 'compressed': case 'directory': case 'encrypted':
            case 'hidden': case 'nottobeindexed': case 'offline': case 'readonly':
            case 'sparse': case 'system': case 'temporary': case 'virtual':
            case 'unmovable': case 'selectntfssystemfiles':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.parseYesNo();
                this.expect(TT.RPAREN, ')');
                break;
            case 'filelocation':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.parseFileLocationOption();
                this.expect(TT.COMMA, ',');
                this.parseNumber();
                this.expect(TT.COMMA, ',');
                this.parseNumber();
                this.expect(TT.RPAREN, ')');
                break;
            default:
                if (reportErrors) {
                    this.error(ini.severity.Error, `Unexpected token '${t.value}' in file boolean`, t);
                    this.next();
                } else {
                    this.error(ini.severity.Warning, `Unexpected token '${t.value}' in file boolean, continuing...`, t);
                    this.next();
                }
        }
    }
    parseFileLocationOption() {
        if (this.completeStatementWithMacro()) return;

        if (!this.isAnyKw('beginoffile', 'endoffile', 'entirefile', 'anypart', 'anycompletefragment')) {
            this.error(ini.severity.Error, `Expected file location option`);
        } else this.next();
    }
    //#endregion
    //#region Volume and File Actions .Parse ────────────────────────────────────────────────────────
    parseVolumeActions() {
        while (!this.atEof() && !this.isKw('VolumeEnd')) {
            // if (this.tryKw('MaxRunTime')) {
            //     this.expect(TT.LPAREN, '(');
            //     this.parseDateTime();
            //     this.expect(TT.RPAREN, ')');
            //     continue;
            // }
            if (!this.parseVolumeAction()) break;
        }
    }
    parseVolumeAction() {
        try {
            let t = this.curr();
            // Macros
            if (this.consumeMacroToken()) {
                t = this.curr();
                return true;
            }
            const kw = (t.type === TT.KEYWORD || t.type === TT.IDENT) ? t.value.toLowerCase() : '';

            switch (kw) { // VolumeAction
                case 'reclaimntfsreservedareas':
                    this.next();
                    this.expect(TT.LPAREN, '(');
                    this.parseSettings();
                    this.expect(TT.RPAREN, ')');
                    return true;
                case 'fileselect':
                    this.next();
                    this.parseFileBooleans(true);
                    this.expectKw('FileActions');
                    this.parseFileActions();
                    this.expectKw('FileEnd');
                    return true;
                case 'makegap':
                    this.next();
                    this.expect(TT.LPAREN, '(');
                    this.parseNumber();
                    this.parseMakeGapOptions();
                    this.expect(TT.RPAREN, ')');
                    return true;
                case 'dismountvolume': case 'deletejournal':
                    this.next();
                    this.expect(TT.LPAREN, '(');
                    this.expect(TT.RPAREN, ')');
                    return true;
                case 'setfilecolor':
                    this.next();
                    this.expect(TT.LPAREN, '(');
                    this.parseFileBooleans(true);
                    this.expect(TT.COMMA, ',');
                    this.parseFileColorBooleans();
                    this.expect(TT.COMMA, ',');
                    this.parseNumber();
                    this.expect(TT.COMMA, ',');
                    this.parseNumber();
                    this.expect(TT.COMMA, ',');
                    this.parseNumber();
                    this.expect(TT.RPAREN, ')');
                    return true;
                default:
                    if (this.isSetting()) { this.parseSetting(); return true; }
                    return false;
            }
        } catch (errResult) {
            if (this.isMacroStatementCompletion(errResult)) {
                this.finishMacroCompletedStatement();
                return true;
            }

            throw errResult;
        }
    }
    // ── File Actions .Parse ──────────────────────────────────────────────────────────
    parseFileActions() {
        while (!this.atEof() && !this.isKw('FileEnd')) {
            // if (this.tryKw('MaxRunTime')) {
            //     this.expect(TT.LPAREN, '(');
            //     this.parseDateTime();
            //     this.expect(TT.RPAREN, ')');
            //     continue;
            // }
            if (!this.parseFileAction()) break;
        }
    }
    parseFileAction() {
        try {
            let t = this.curr();
            if (this.consumeMacroToken()) return true;

            const kw = (t.type === TT.KEYWORD || t.type === TT.IDENT) ? t.value.toLowerCase() : '';

            switch (kw) { // FileAction
                case 'defragment':
                    this.next();
                    this.expect(TT.LPAREN, '(');
                    this.parseDefragmentOptions();
                    this.expect(TT.RPAREN, ')');
                    return true;
                case 'fastfill':
                    this.next();
                    this.expect(TT.LPAREN, '(');
                    this.parseFastFillOptions();
                    this.expect(TT.RPAREN, ')');
                    return true;
                case 'movedownfill': case 'movetoendofdisk': case 'moveuptozone': case 'forcedfill':
                    this.next();
                    this.expect(TT.LPAREN, '(');
                    this.expect(TT.RPAREN, ')');
                    return true;
                case 'sortbyname': case 'sortbysize': case 'sortbylastaccess':
                case 'sortbylastchange': case 'sortbycreationdate':
                case 'sortbynewestdate':
                    this.next();
                    this.expect(TT.LPAREN, '(');
                    this.parseAscDesc();
                    this.parseSortByOption();
                    this.expect(TT.RPAREN, ')');
                    return true;
                case 'sortbyimportsequence':
                    this.next();
                    this.expect(TT.LPAREN, '(');
                    this.parseSortByImportSequenceOptions();
                    this.expect(TT.RPAREN, ')');
                    return true;
                case 'placentfssystemfiles':
                    this.next();
                    this.expect(TT.LPAREN, '(');
                    this.parseAscDesc();
                    this.parseSortByOption();
                    this.expect(TT.COMMA, ',');
                    this.parseNumber();
                    this.expect(TT.RPAREN, ')');
                    return true;
                case 'addgap':
                    this.next();
                    this.expect(TT.LPAREN, '(');
                    this.parseNumber();
                    this.parseMakeGapOptions();
                    this.expect(TT.RPAREN, ')');
                    return true;
                default:
                    if (this.isSetting()) { this.parseSetting(); return true; }
                    return false;
            }
        } catch (errResult) {
            if (this.isMacroStatementCompletion(errResult)) {
                this.finishMacroCompletedStatement();
                return true;
            }

            throw errResult;
        }
    }
    //#endregion
    //#region Defragment Options .Parse ─────────────────────────────────────────────────────────
    parseDefragmentOptions() {
        if (this.tryKw('ChunkSize')) {
            this.expect(TT.LPAREN, '(');
            this.parseNumber();
            this.expect(TT.RPAREN, ')');
        } else {
            this.tryKw('Fast');
        }
    }
    parseFastFillOptions() {
        this.tryKw('WithShuffling');
    }
    parseMakeGapOptions() {
        if (this.curr().type === TT.COMMA) {
            this.next();
            this.expectKw('DoNotVacate');
        }
    }
    parseAscDesc() {
        if (this.completeStatementWithMacro()) return;

        if (!this.isAnyKw('ascending', 'descending')) {
            this.error(ini.severity.Error, `Expected 'Ascending' or 'Descending'`);
        } else this.next();
    }
    parseSortByOption() {
        if (this.tryKw('SkipBlock')) {
            this.expect(TT.LPAREN, '(');
            this.parseNumber();
            this.expect(TT.COMMA, ',');
            this.parseNumber();
            this.expect(TT.RPAREN, ')');
        }
    }
    /**
     * Parses SortByImportSequence options.
     *
     * MyDefrag accepts Ascending or Descending followed by an optional SkipBlock.
     */
    parseSortByImportSequenceOptions() {
        this.parseAscDesc();
        this.parseSortByOption();
    }
    //#endregion
    // ─────────────────────────────────────────────────────────────────────────────────
    //#region Settings .Parse ──────────────────────────────────────────────────────────────

    isSetting() {
        const token = this.curr();
        const kw = token?.value
            ? token.value.toLowerCase()
            : '';

        return KEYWORDS_SETTINGS_SET.has(kw);
    }

    parseSettings() {
        while (this.isSetting()) {
            this.parseSetting();
        }
    }

    parseSetting() {
        try { // Parser parseSetting
            let t = this.curr();
            const kw = t.value.toLowerCase();
            this.next();

            switch (kw) { // parseSetting
                case 'maxruntime':
                    this.expect(TT.LPAREN, '(');
                    this.parseDateTime();
                    this.expect(TT.RPAREN, ')');
                    return true;
                case 'message':
                    this.expect(TT.LPAREN, '(');
                    this.expect(TT.STRING, 'string');
                    this.expect(TT.COMMA, ',');
                    this.expect(TT.STRING, 'string');
                    this.expect(TT.RPAREN, ')');
                    break;
                case 'language': case 'title': case 'runscript': case 'setstatisticswindowtext':
                    this.expect(TT.LPAREN, '(');
                    this.expect(TT.STRING, 'string');
                    this.expect(TT.RPAREN, ')');
                    break;
                case 'runprogram':
                    this.expect(TT.LPAREN, '(');
                    this.parseStringArguments();
                    this.expect(TT.RPAREN, ')');
                    break;
                case 'windowsize':
                    this.expect(TT.LPAREN, '(');
                    if (!this.isAnyKw('fixed', 'minimized', 'maximized', 'invisible', 'restore')) {
                        this.error(ini.severity.Error, `Expected window size option`);
                    } else this.next();
                    this.expect(TT.RPAREN, ')');
                    break;
                case 'diskmapflip': case 'ignorewraparoundfragmentation': case 'rememberunmovables':
                    this.expect(TT.LPAREN, '(');
                    this.parseYesNo();
                    this.expect(TT.RPAREN, ')');
                    break;
                case 'statusbar':
                    this.expect(TT.LPAREN, '(');
                    this.parseStatusBars();
                    this.expect(TT.RPAREN, ')');
                    break;
                case 'zoomlevel': case 'slowdown': case 'filemovechunksize':
                case 'debug': case 'exitiftimeout':
                    this.expect(TT.LPAREN, '(');
                    this.parseNumber();
                    this.expect(TT.RPAREN, ')');
                    break;
                case 'setcolor':
                    this.expect(TT.LPAREN, '(');
                    this.parseColorName();
                    this.expect(TT.COMMA, ',');
                    this.parseNumber();
                    this.expect(TT.COMMA, ',');
                    this.parseNumber();
                    this.expect(TT.COMMA, ',');
                    this.parseNumber();
                    this.expect(TT.RPAREN, ')');
                    break;
                case 'pause':
                    this.expect(TT.LPAREN, '(');
                    this.parseDateTime();
                    this.expect(TT.RPAREN, ')');
                    break;
                case 'whenfinished':
                    this.expect(TT.LPAREN, '(');
                    this.parseWhenFinished();
                    this.expect(TT.RPAREN, ')');
                    break;
                case 'otherinstances':
                    this.expect(TT.LPAREN, '(');
                    if (!this.isAnyKw('ask', 'allow', 'exit', 'kill')) {
                        this.error(ini.severity.Error, `Expected 'ask', 'allow', 'exit', or 'kill'`);
                    } else this.next();
                    this.expect(TT.RPAREN, ')');
                    break;
                case 'batterypower':
                    this.expect(TT.LPAREN, '(');
                    if (!this.isAnyKw('ask', 'allow', 'exit')) {
                        this.error(ini.severity.Error, `Expected 'ask', 'allow', or 'exit'`);
                    } else this.next();
                    this.expect(TT.RPAREN, ')');
                    break;
                case 'setscreensaver': case 'setscreenpowersaver':
                    this.expect(TT.LPAREN, '(');
                    if (!this.isAnyKw('off', 'reset')) {
                        this.error(ini.severity.Error, `Expected 'off' or 'reset'`);
                    } else this.next();
                    this.expect(TT.RPAREN, ')');
                    break;
                case 'writelogfile': case 'appendlogfile':
                    this.expect(TT.LPAREN, '(');
                    this.expect(TT.STRING, 'string');
                    this.expect(TT.COMMA, ',');
                    this.expect(TT.STRING, 'string');
                    this.expect(TT.RPAREN, ')');
                    break;
                case 'processpriority':
                    this.expect(TT.LPAREN, '(');
                    if (!this.isAnyKw('normal', 'belownormal', 'low', 'abovenormal', 'high', 'background')) {
                        this.error(ini.severity.Error, `Expected process priority`);
                    } else this.next();
                    this.expect(TT.RPAREN, ')');
                    break;
                case 'setvariable':
                    this.expect(TT.LPAREN, '(');

                    // variable name
                    logger.dbg(8, `>> Setting: ${kw} type: ${this.curr().type} vs. IDENT or KEYWORD`)

                    if (this.curr().type !== TT.IDENT && this.curr().type !== TT.KEYWORD) {
                        this.error(ini.severity.Error, `Expected variable name`);
                    } else this.next();

                    this.expect(TT.COMMA, ',');

                    // value can be number or string // ToDo ?includes? ?macros?
                    if (this.curr().type === TT.STRING) {
                        this.next();
                    } else {
                        this.parseNumber();
                    }

                    this.expect(TT.RPAREN, ')');
                    break;
                default:
                    this.error(ini.severity.Error, `Unknown setting '${t.value}'`, t);
            }
        } catch (errResult) {
            if (this.isMacroStatementCompletion(errResult)) {
                this.finishMacroCompletedStatement();
                return true;
            }

            const message = `server.js:ValidateDocument Unexpected error Generating Preview of document: + ${errResult.message}`;
            console?.error?.(message);           // debugger
            logger?.err?.(errResult, message);   // output channel
            this.error?.(message); // document diagnostic
            return message;
        }
    }
    //#endregion
    //#region MyDefrag Features .Parse ─────────────────────────────────────────────────────────
    parseStatusBars() {
        while (this.isAnyKw('all', 'status', 'path', 'mouseover')) {
            this.next();
        }
    }

    parseWhenFinished() {
        if (this.completeStatementWithMacro()) return;

        if (this.tryKw('Wait') || this.tryKw('Exit')) return;
        if (this.tryKw('Shutdown')) {
            while (this.isAnyKw('reboot', 'warnusers', 'forced')) this.next();
            return;
        }
        if (this.tryKw('Hibernate') || this.tryKw('Standby')) {
            this.tryKw('Forced');
            return;
        }
        this.error(ini.severity.Error, `Expected WhenFinished option`);
    }

    // ── Color Features .Parse ───────────────────────────────────────────────────

    parseColorName() {
        if (this.completeStatementWithMacro()) return;

        if (!this.isAnyKw('empty', 'allocated', 'busyread', 'busywrite', 'text')) {
            this.error(ini.severity.Error, `Expected color name`);
        } else this.next();
    }

    parseFileColorBooleans() {
        this.parseFileColorBoolean();
        while (this.isAnyKw('or', 'and') ||
            this.curr().type === TT.PIPE || this.curr().type === TT.DPIPE ||
            this.curr().type === TT.AMP || this.curr().type === TT.DAMP) {
            this.next();
            this.parseFileColorBoolean();
        }
    }

    parseFileColorBoolean() {
        let t = this.curr();
        if (this.completeStatementWithMacro(t)) return;

        if (t.type === TT.LPAREN) {
            this.next();
            this.parseFileColorBooleans();
            this.expect(TT.RPAREN, ')');
            return;
        }
        if (this.isKw('not')) {
            this.next();
            this.expect(TT.LPAREN, '(');
            this.parseFileColorBooleans();
            this.expect(TT.RPAREN, ')');
            return;
        }
        if (this.isAnyKw('fragmented', 'movable', 'selected', 'processed', 'all')) {
            this.next(); return;
        }
        this.error(ini.severity.Error, `Unexpected token '${t.value}' in file color boolean`, t);
        this.next();
    }
    //#endregion
    //#region Number(s) and Value(s) .Parse ───────────────────────────────────────────
    parseNumber() {
        this.parseMultiplyDivide();
        while (this.curr().type === TT.PLUS ||
            (this.curr().type === TT.DASH && this.curr().value === '-')) {
            this.next();
            this.parseMultiplyDivide();
        }
    }
    parseMultiplyDivide() {
        this.parseValue();
        while (this.curr().type === TT.STAR ||
            this.curr().type === TT.SLASH ||
            this.curr().type === TT.PERCENT) {
            this.next();
            this.parseValue();
        }
    }
    tryDecMultiple() {
        const multiples = [
            'k', 'm', 'g', 't', 'p', 'e', 'z', 'y',
            'kb', 'mb', 'gb', 'tb', 'pb', 'eb', 'zb', 'yb',
            'ki', 'mi', 'gi', 'ti', 'pi', 'ei', 'zi', 'yi',
        ];
        let t = this.curr();
        // todo does this apply to predefined? no i think.
        if ((t.type === TT.KEYWORD || t.type === TT.IDENT) &&
            multiples.includes(t.value.toLowerCase())) {
            this.next();
        }
    }
    parseNumbers() {
        this.parseNumber();
        while (this.curr().type === TT.COMMA) {
            this.next();
            this.parseNumber();
        }
    }
    // ── Values .Parse ───────────────────────────────────────────────────────────────
    parseValue() {
        let t = this.curr();

        if (t.type === TT.NUMBER) {
            this.next();
            this.tryDecMultiple();
            return;
        }

        if (t.type === TT.LPAREN) {
            this.next();
            this.parseNumber();
            this.expect(TT.RPAREN, ')');
            return;
        }

        if (t.type === TT.DASH) {
            this.next();
            // negative variable
            if (this.curr().type === TT.IDENT || this.curr().type === TT.KEYWORD) {
                this.next();
            } else {
                this.error(ini.severity.Error, `Expected variable after '-'`);
            }
            return;
        }

        if (this.isAnyKw('rounddown', 'roundup')) {
            this.next();
            this.expect(TT.LPAREN, '(');
            this.parseNumber();
            this.expect(TT.COMMA, ',');
            this.parseNumber();
            this.expect(TT.RPAREN, ')');
            return;
        }

        if (this.isAnyKw('minimum', 'maximum')) {
            this.next();
            this.expect(TT.LPAREN, '(');
            this.parseNumbers();
            this.expect(TT.RPAREN, ')');
            return;
        }

        // Variable, predefined identifier, or keyword used as value (e.g. VolumeSize)
        if (t.type === TT.IDENT || t.type === TT.IDENT_PREDEF || t.type === TT.KEYWORD) {
            this.next();
            this.tryDecMultiple();
            return;
        }

        // Macro used as value
        if (t.type === TT.MACRO) {
            this.next();
            return;
        }

        this.error(ini.severity.Error, `Expected number or variable but found '${t.value}'`, t);
        this.next();
    }
    // ── Strings .Parse ───────────────────────────────────────────────────────────────
    parseStringArguments() {
        if (this.completeStatementWithMacro()) return;

        this.expect(TT.STRING, 'string');
        while (this.curr().type === TT.COMMA) {
            this.next();
            this.expect(TT.STRING, 'string'); // todo or PREDEFINED_IDENT or MACRO
        }
    }
    // ── . Parse DateTime .Parse ──────────────────────────────────────────────────────────────
    parseDateTime() {
        // Empty is valid — return if next token is ) or ,
        if (this.curr().type === TT.RPAREN ||
            this.curr().type === TT.COMMA) return;
        // now
        if (this.tryKw('now')) return;

        // Try to parse date/time — flexible since many forms exist
        // Just parse a value and optional modifiers
        this.parseValue();

        // Check for date separators / or -
        if (this.curr().type === TT.SLASH || this.curr().type === TT.DASH) {
            this.next(); this.parseValue();
            if (this.curr().type === TT.SLASH || this.curr().type === TT.DASH) {
                this.next(); this.parseValue();
            }
        }

        // Check for time hh:mm:ss
        if (this.curr().type === TT.COLON) {
            this.next(); this.parseValue();
            if (this.curr().type === TT.COLON) {
                this.next(); this.parseValue();
            }
        }

        // Optional time unit (days, hours, etc.)
        const timeUnits = ['year', 'years', 'month', 'months', 'day', 'days',
            'hour', 'hours', 'minute', 'minutes', 'second', 'seconds', 'week', 'weeks'];
        if (this.isAnyKw(...timeUnits)) this.next();

        // Optional AGO
        this.tryKw('AGO');
    }
}
//#endregion
// ─────────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────────
//#region Module Exports
module.exports = {
    Parser,
    parseStates,
    configureParser,
};
//#endregion
