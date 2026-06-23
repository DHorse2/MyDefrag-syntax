'use strict';
// parser.js
const { TT } = require('./tokenizer');

let logger = console;
let ini = {
    severity: {
        Error: 1,
        Warning: 2,
        Information: 3,
        Hint: 4,
    }
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
class Parser {
    constructor(tokens, text, state = parseStates.SCRIPT_UNKNOWN) {
        this.tokens = tokens;
        this.text = text;
        this.state = state;
        this.pos = 0;
        this.errors = [];
        // todo logger.dbg("stuff")
    }
    //#region ────── (Primitives) Cross-cutting functions .Parse ───────────────
    peek() { return this.curr(); }
    curr() { return this.tokens[this.pos]; }
    next() { return this.tokens[this.pos++]; }
    prev() { return this.tokens[this.pos - 1]; }
    atEof() { return this.curr().type === TT.EOF; }

    // Yes or No?
    parseYesNo() {
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
    error = (errorSeverity, message, token) => {
        token = token || this.curr();
        const s = this.offsetToPos(token.start);
        const e = this.offsetToPos(token.end);
        this.errors.push({
            message: message,
            range: {
                start: s,
                end: e,
            },
            severity: errorSeverity,
        });
        logger.message(errorSeverity, message);
    }

    warning = (errorSeverity, message, token) => {
        token = token || this.curr();
        const s = this.offsetToPos(token.start);
        const e = this.offsetToPos(token.end);
        this.errors.push({
            message: message,
            range: { start: s, end: e },
            severity: errorSeverity,
        });
        logger.message(errorSeverity, message);
    }
    //#endregion
    // ─────────────────────────────────────────────────────────────────────────────────
    //#region Match a keyword (case-insensitive)
    expectKw(kw) {
        let t = this.curr();
        if ((t.type === TT.KEYWORD || t.type === TT.IDENT) && t.value.toLowerCase() === kw.toLowerCase()) {
            return this.next();
        }
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
        this.error(ini.severity.Error, `Expected ${desc || type} but found '${t.value}'`, t);
        return null;
    }

    tryType(type) {
        if (this.curr().type === type) { this.next(); return true; }
        return false;
    }
    //#endregion
    //#region  Grammar rules - .Parse Statements ─────────────────────────────────────────────────────────
    parseStatements() {
        while (!this.atEof()) {
            if (!this.parseStatement()) break;
            if (this.atEof()) {
                // end of file reached successfully
            }
        }
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
            if (!this.atEof() &&
                (t.type === TT.MACRO ||
                    (t.type === TT.KEYWORD && t.value.toLowerCase() === 'include'))
            ) {
                this.next();
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
                    this.parseFileBooleans();
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
            const message = `server.js:Parser:parseStatement: Unexpected error parsing Token: ${t.value.toLowerCase()} NextToken: ${this.curr().value.toLowerCase()} Error: ${errResult.message}`;
            logger.err(errResult, message);
            return message;
        }
    }
    // ── Fragments .Parse ───────────────────────────────────────────────────────
    parseFragment() {
        const start = this.pos;
        const errorCount = this.errors.length;
        const errorFlag = false;
        // First try normal full-document / full-statement parsing.
        if (this.parseStatements()) {
            if (this.atEof()) return true;
        }

        // ─────────────────────────────────────────────────────────────────────────────────
        logger.dbg(5, `server.js:Parser:parseFragment: Full statement parse failed/errors: ${this.errors.length}`);
        // Reset and try fragment-mode parsing from beginning.
        this.pos = start;
        this.errors.length = errorCount;

        // Fragment Properties:
        // ok: true,
        // kind: 'volumeactions',
        // parent: 'volume_block',
        // opens: null,
        // closes: null,
        // allowedParents: ['volume_block', ...]
        const fragment = {
            kind: null,
            parentKind: null,
            stack: []
        };

        // ─────────────────────────────────────────────────────────────────────────────────
        // Process remaining file (or whole file)
        while (!this.atEof()) {
            const statementStart = this.pos;
            const statementErrors = this.errors.length;
            const t = this.curr();
            // ─────────────────────────────────────────────────────────────────────────────────
            // Parse statement
            // MACROs
            if (!this.atEof() &&
                (t.type === TT.MACRO ||
                    (t.type === TT.KEYWORD && t.value.toLowerCase() === 'include'))
            ) {
                this.next();
            } else {
                const keyword = (
                    t &&
                    (t.type === TT.KEYWORD || t.type === TT.IDENT)
                ) ? String(t.value).toLowerCase() : '';
                // NO KEYWORD error
                if (!keyword) {
                    this.error(
                        ini.severity.Error,
                        `server.js:Parser:parseFragment: Expected fragment keyword, got '${t?.value}'`
                    );
                    const errorFlag = true;
                    break;
                }
                // Get Keyword Data
                const info = this.parseFragmentKeywordBackward(keyword, {
                    fragment,
                    token: t
                });
                // Unknown fragment keyword
                if (!info || !info.ok) {
                    this.error(
                        ini.severity.Error,
                        `server.js:Parser:parseFragment: Unknown fragment keyword '${keyword}' parent '${t.parent}'`
                    );
                    const errorFlag = true;
                    break;
                }

                // ─────────────────────────────────────────────────────────────────────────────────
                // Determine script category. Based on first statement
                const canReplaceFragmentParent =
                    !fragment.parentKind ||
                    fragment.parentKind === 'any' ||
                    (
                        fragment.parentKind === 'script' &&
                        info.parent !== 'script' &&
                        info.parent !== 'any'
                    );

                if (canReplaceFragmentParent) {
                    fragment.kind = info.kind;
                    fragment.parentKind = info.parent;
                    fragment.parentHints = info.parentHints || null;
                }

                // ─────────────────────────────────────────────────────────────────────────────────
                // Later statements must be legal in the established fragment context.
                if (!this.fragmentAllows(info, fragment)) {
                    this.error(
                        ini.severity.Error,
                        `server.js:Parser:parseFragment: '${keyword}' is '${info.kind}' and belongs in '${info.parent}', ` +
                        `but this fragment was established as '${fragment.parentKind}'`
                    );
                    const errorFlag = true;
                    break;
                }

                // ─────────────────────────────────────────────────────────────────────────────────
                // Now actually parse the statement using the real parser.
                if (!this.parseFragmentStatementByKind(info)) {
                    this.pos = statementStart;
                    this.errors.length = statementErrors;

                    this.error(
                        ini.severity.Error,
                        `server.js:Parser:parseFragment: Failed parsing fragment statement '${keyword}' as '${info.kind}'`
                    );
                    const errorFlag = true;
                    break;
                }

                // Safety guard: parser must consume something.
                if (this.pos === statementStart) {
                    this.error(
                        ini.severity.Error,
                        `server.js:Parser:parseFragment: Parser made no progress at '${keyword}'`
                    );
                    const errorFlag = true;
                    break;
                }

                if (!errorFlag) { this.updateFragmentStack(info, fragment); }
            }
        }
        this.hintFragmentParent(fragment);
        if (this.atEof() && !errorFlag) { return true; } else { return false; }
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
        this.errors.push({
            message: message,
            range: {
                start: { line: 0, character: 0 },
                end: { line: 0, character: 0 },
            },
            severity: ini.severity.Hint,
        });
    }
    // Get the array of hint descriptions
    getFragmentParentHints(fragment) {
        const parent = fragment.parentKind;
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
    //#region  Backward reasoning functions.
    parseFragmentKeywordBackward(keyword, ctx = {}) {
        //
        switch ((keyword || '').toLowerCase()) {

            // Top-level script statements
            case 'batterypower':
                return this.backwardBatteryPower(ctx);

            case 'description':
                return this.backwardDescription(ctx);

            case 'title':
                return this.backwardTitle(ctx);

            case 'whenfinished':
                return this.backwardWhenFinished(ctx);

            case 'appendlogfile':
                return this.backwardAppendLogFile(ctx);

            case 'write':
                return this.backwardWrite(ctx);

            case 'message':
                return this.backwardMessage(ctx);

            case 'setvariable':
            case 'setvariabledefault':
            case 'setvariableifempty':
                return this.backwardSetVariable(ctx);

            // Volume-level blocks
            case 'volumeselect':
                return this.backwardVolumeSelect(ctx);

            case 'volumeactions':
                return this.backwardVolumeActions(ctx);

            case 'volumeend':
                return this.backwardVolumeEnd(ctx);

            case 'excludevolumes':
                return this.backwardExcludeVolumes(ctx);

            // File-level blocks
            case 'fileselect':
                return this.backwardFileSelect(ctx);

            case 'fileactions':
                return this.backwardFileActions(ctx);

            case 'fileend':
                return this.backwardFileEnd(ctx);

            case 'excludefiles':
                return this.backwardExcludeFiles(ctx);

            // File action statements
            case 'sortbyname':
            case 'sortbyextension':
            case 'sortbysize':
            case 'sortbycreationdate':
            case 'sortbylastaccess':
            case 'sortbylastchange':
            case 'sortbyimportancetofile':
            case 'sortbyimportancetovolume':
            case 'sortbyfragmentation':
            case 'sortbylcn':
                return this.backwardFileSortAction(ctx);

            case 'moveup':
            case 'movedown':
            case 'movetobeginofdisk':
            case 'movetoendofdisk':
            case 'movetobeginofvolume':
            case 'movetoendofvolume':
            case 'movetoendofdsk': // keep only if your grammar currently accepts this typo/alias
                return this.backwardFileMoveAction(ctx);

            case 'defragment':
            case 'fastfill':
            case 'forcedfill':
            case 'vacate':
            case 'makegap':
            case 'addgap':
                return this.backwardFileAction(ctx);

            // Special/simple
            case 'fastboot':
                return this.backwardSimpleStatement(ctx);

            default:
                if (this.isSetting()) {
                    // this.parseSetting(); 
                    return this.backwardSetting(ctx);
                }
                return this.backwardUnknownKeyword(keyword, ctx);
        }
    }
    // ─────────────────────────────────────────────────────────────────────────────────
    //#endregion
    //#region Backward Syntax Classification
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
        return this.backwardScriptStatement(ctx, 'settingInline');
    }

    backwardBatteryPower(ctx) {
        return this.backwardScriptStatement(ctx, 'batterypower');
    }

    backwardDescription(ctx) {
        return this.backwardScriptStatement(ctx, 'description');
    }

    backwardTitle(ctx) {
        return this.backwardScriptStatement(ctx, 'title');
    }

    backwardWhenFinished(ctx) {
        return this.backwardScriptStatement(ctx, 'whenfinished');
    }

    backwardAppendLogFile(ctx) {
        return this.backwardScriptStatement(ctx, 'appendlogfile');
    }

    backwardWrite(ctx) {
        return this.backwardScriptStatement(ctx, 'write');
    }

    backwardMessage(ctx) {
        return this.backwardScriptStatement(ctx, 'message');
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

    backwardExcludeVolumes(ctx) {
        return {
            ok: true,
            keyword: 'excludevolumes',
            kind: 'volume_condition',
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
            kind: 'file_condition',
            parent: 'script',
            opens: null,
            closes: null,
            allowedParents: ['script']
        };
    }

    backwardFileSortAction(ctx) {
        return {
            ok: true,
            keyword: String(ctx.token?.value || '').toLowerCase(),
            kind: 'sort',
            parent: 'file_action',
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
    fragmentAllows(info, fragment) {
        if (!info || !fragment) return false;

        // First statement is always allowed to establish the fragment.
        if (!fragment.parentKind) return true;

        // Exact parent match.
        if (info.parent === fragment.parentKind) return true;

        // Explicit allowed parent match.
        if (
            Array.isArray(info.allowedParents) &&
            info.allowedParents.includes(fragment.parentKind)
        ) {
            return true;
        }

        // If this fragment opened a nested block, allow statements inside it.
        const currentBlock = fragment.stack?.[fragment.stack.length - 1];
        if (currentBlock && info.parent === currentBlock) return true;

        if (
            currentBlock &&
            Array.isArray(info.allowedParents) &&
            info.allowedParents.includes(currentBlock)
        ) {
            return true;
        }

        return false;
    }
    // ─────────────────────────────────────────────────────────────────────────────────
    parseFragmentStatementByKind(info) {
        switch (info.kind) {
            // Normal statements/blocks already handled by parseStatement()
            case 'description':
            case 'title':
            case 'whenfinished':
            case 'appendlogfile':
            case 'write':
            case 'message':
            case 'settingInline':

            case 'volumeselect':
            case 'volumeactions':
            case 'volumeend':
            case 'excludevolumes':

            case 'fileselect':
            case 'fileactions':
            case 'fileend':
            case 'excludefiles':

            case 'fastboot':
                return this.parseStatement();

            // Fragments that start inside VolumeSelect(...)
            case 'volume_condition':
                return this.parseVolumeBooleans();

            // Fragments that start inside VolumeActions(...)
            case 'volume_action':
            case 'filesystem':
                return this.parseVolumeActions();

            // Fragments that start inside FileSelect(...)
            case 'file_condition':
            case 'file_attribute':
                return this.parseFileBooleans(false);

            // Fragments that start inside FileActions(...)
            case 'file_action':
            case 'sort':
            case 'action_modifier':
                return this.parseFileActions();

            // Literal value fragment
            case 'value':
                return this.parseNumber();

            default:
                return this.parseStatement();
        }
    }
    // ─────────────────────────────────────────────────────────────────────────────────
    updateFragmentStack(info, fragment) {
        if (!info || !fragment) return;

        if (!Array.isArray(fragment.stack)) {
            fragment.stack = [];
        }

        if (info.closes) {
            const top = fragment.stack[fragment.stack.length - 1];

            if (top === info.closes) {
                fragment.stack.pop();
            }
        }

        if (info.opens) {
            fragment.stack.push(info.opens);
        }
    }
    //#endregion
    // ─────────────────────────────────────────────────────────────────────────────────
    //#region Volume and FIle Booleans .Parse ───────────────────────────────────────────────────────
    parseVolumeBooleans() {
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
    parseFileBooleans() {
        console?.log('server.js:Parser: parseFileBooleans: ' + this.curr().value);
        this.parseFileBoolean(true);
        console?.log('server.js:Parser: parseFileBooleans after first boolean: ' + this.curr().value);
        while (!this.atEof() && !this.isKw('FileActions') && !this.isKw('FileEnd') && !this.isKw('VolumeEnd')) {
            if (this.isAnyKw('or', 'and') ||
                this.curr().type === TT.PIPE || this.curr().type === TT.DPIPE ||
                this.curr().type === TT.AMP || this.curr().type === TT.DAMP) {
                this.next();
                this.parseFileBoolean(true);
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
            this.parseFileBooleans();
            this.expect(TT.RPAREN, ')');
            return;
        }
        // Macros
        while (!this.atEof() &&
            (t.type === TT.MACRO ||
                (t.type === TT.KEYWORD && t.value.toLowerCase() === 'include'))
        ) {
            this.next();
            t = this.curr();
        }
        // KEYWORD
        const kw = (t.type === TT.KEYWORD || t.type === TT.IDENT) ? t.value.toLowerCase() : '';
        switch (kw) { // FileBoolean
            case 'not':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.parseFileBooleans();
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
        let t = this.curr();
        // Macros
        if (!this.atEof() &&
            (t.type === TT.MACRO ||
                (t.type === TT.KEYWORD && t.value.toLowerCase() === 'include'))
        ) {
            this.next();
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
                this.parseFileBooleans();
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
                this.parseFileBooleans();
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
        let t = this.curr();
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
            case 'sortbynewestdate': case 'sortbyimportsequence':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.parseAscDesc();
                this.parseSortByOption();
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
    //#endregion
    // ─────────────────────────────────────────────────────────────────────────────────
    //#region Settings .Parse ──────────────────────────────────────────────────────────────

    isSetting() {
        const kw = this.curr().value ? this.curr().value.toLowerCase() : '';
        return [
            'maxruntime', 'message', 'language', 'title', 'windowsize', 'diskmapflip', 'statusbar',
            'zoomlevel', 'setcolor', 'slowdown', 'pause', 'whenfinished', 'otherinstances',
            'runscript', 'runprogram', 'batterypower', 'setscreensaver', 'setscreenpowersaver',
            'filemovechunksize', 'debug', 'setstatisticswindowtext', 'writelogfile',
            'appendlogfile', 'ignorewraparoundfragmentation', 'processpriority',
            'exitiftimeout', 'rememberunmovables', 'setvariable',
        ].includes(kw);
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
                    this.next();
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
            const message = `server.js:ValidateDocument Unexpected error Generating Preview of document: + ${errResult.message}`;
            logger.err(errResult, message);
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

        // Variable or keyword used as value (e.g. VolumeSize)
        if (t.type === TT.IDENT || t.type === TT.KEYWORD) {
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
