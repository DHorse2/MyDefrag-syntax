'use strict';
// server.js
//#region Initialize server .Parse
const {
    createConnection,
    TextDocuments,
    DiagnosticSeverity,
    ProposedFeatures,
    TextDocumentSyncKind,
    Diagnostic,
} = require('vscode-languageserver/node');
const { TextDocument } = require('vscode-languageserver-textdocument');
const path = require('path');
const console = require('console');
const { URI } = require('vscode-languageserver/node');
// const URI = require('vscode-uri').URI;
const { URL, fileURLToPath, pathToFileURL } = require('url');
let parserState;
const SCRIPT_DIR = __dirname;
const channelName = 'MyDefrag Language Validation';
const INI_PATH = path.join(SCRIPT_DIR, "mydefrag-syntax.ini");
const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);
// const connection = createConnection(ProposedFeatures.all);
const Logger = require('../common/loggerServer');
const Ini = require('../common/ini')
const channelName = 'MyDefrag Issues';

const {
    ini,
    debugOn,
    verboseLevel,
    logOn,
    referenceRelativePathLevel,
    referenceContainsMacrosLevel,
    fileReferenceFoundLevel,
    fileReferenceNotFoundLevel,
    iniErrors
} = Ini.initialize(INI_PATH, channelName, null, Ini.severity.Verbose, null, false);

const isServer = true;
Logger.initialize(connection, isServer, debugOn, verboseLevel, ini);
if (iniErrors.length) { Logger.logArrayToConsole(channelName, iniErrors) }
//#endregion
//#region Events for server
documents.onDidChangeContent(change => {
    connection.console.log('MyDefrag document changed');
    validateDocument(change.document);
});

documents.onDidOpen(change => {
    connection.console.log('MyDefrag document opened');
    validateDocument(change.document);
});

documents.onDidSave(change => {
    validateDocument(change.document);
});
//#endregion
// ─────────────────────────────────────────────────────────────────────────────────
//#region .Parse TOKENIZER
// ─────────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────────
// Token Type
const TT = {
    KEYWORD: 'KEYWORD',
    IDENT: 'IDENT',
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
// All keywords from the grammar (case-insensitive)
const KEYWORDS = new Set([
    'maxruntime', 'description', 'excludevolumes', 'excludefiles',
    'volumeselect', 'volumeactions', 'volumeend',
    'fileselect', 'fileactions', 'fileend',
    'setting', 'setfilecolor', 'setcolor', 'setvariable', 'setstatisticswindowtext',
    'or', 'and', 'not', 'all',
    'mounted', 'writable', 'removable', 'fixed', 'remote', 'cdrom', 'ramdisk',
    'name', 'label', 'size', 'fragmentcount', 'fragmentsize', 'checkvolume',
    'commandlinevolumes', 'numberbetween', 'filesystemtype',
    'ntfs', 'fat', 'fat12', 'fat16', 'fat32',
    'reclaimntfsreservedareas',
    'makegap', 'dismountvolume', 'deletejournal',
    'filename', 'directoryname', 'directorypath', 'fullpath',
    'fragmented', 'averagefragmentsize', 'largestfragmentsize', 'smallestfragmentsize',
    'lastaccess', 'lastaccessenabled', 'lastchange', 'creationdate',
    'importlistfrombootoptimize', 'importlistfromfile', 'importlistfromprogramhints',
    'largest', 'smallest',
    'archive', 'compressed', 'directory', 'encrypted', 'hidden', 'nottobeindexed',
    'offline', 'readonly', 'sparse', 'system', 'temporary', 'virtual', 'unmovable',
    'selectntfssystemfiles', 'filelocation',
    'yes', 'no',
    'beginoffile', 'endoffile', 'entirefile', 'anypart', 'anycompletefragment',
    'defragment', 'fastfill', 'movedownfill', 'movetoendofdisk',
    'moveuptozone', 'forcedfill',
    'sortbyname', 'sortbysize', 'sortbylastaccess', 'sortbylastchange',
    'sortbycreationdate', 'sortbynewestdate', 'sortbyimportsequence',
    'placentfssystemfiles', 'addgap',
    'chunksize', 'fast', 'withshuffling', 'donotvacate',
    'ascending', 'descending', 'skipblock',
    'message', 'language', 'title', 'windowsize', 'diskmapflip', 'statusbar',
    'zoomlevel', 'slowdown', 'pause', 'whenfinished', 'otherinstances',
    'runscript', 'runprogram', 'batterypower', 'setscreensaver', 'setscreenpowersaver',
    'filemovechunksize', 'debug', 'writelogfile', 'appendlogfile',
    'ignorewraparoundfragmentation', 'processpriority', 'exittimeout', 'exitiftimeout',
    'rememberunmovables',
    'fixed', 'minimized', 'maximized', 'invisible', 'restore',
    'wait', 'exit', 'shutdown', 'hibernate', 'standby', 'reboot', 'warnusers', 'forced',
    'status', 'path', 'mouseover',
    'off', 'reset',
    'normal', 'belownormal', 'low', 'abovenormal', 'high', 'background',
    'now', 'ago',
    'year', 'years', 'month', 'months', 'day', 'days',
    'hour', 'hours', 'minute', 'minutes', 'second', 'seconds', 'week', 'weeks',
    'rounddown', 'roundup', 'minimum', 'maximum',
    'k', 'm', 'g', 't', 'p', 'e', 'z', 'y',
    'kb', 'mb', 'gb', 'tb', 'pb', 'eb', 'zb', 'yb',
    'ki', 'mi', 'gi', 'ti', 'pi', 'ei', 'zi', 'yi',
    'empty', 'allocated', 'busyread', 'busywrite', 'text',
    'ask', 'allow', 'kill',
    'fragmented', 'movable', 'selected', 'processed',
]);
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
            // Macro !word!
            if (text[i] === '!') {
                i++;
                while (i < len && text[i] !== '!' && text[i] !== '\n') i++;
                if (text[i] === '!') i++;
                tokens.push({ type: TT.MACRO, value: text.slice(start, i), start, end: i });
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
                const type = KEYWORDS.has(lower) ? TT.KEYWORD : TT.IDENT;
                tokens.push({ type, value, lower, start, end: i });
                continue;
            }
            // ─────────────────────────────────────────────────────────────────────────────────
            // Punctuation
            switch (text[i]) {
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
            // tokenize ERROR
            Logger.err(`writeFileSync ERROR writing output: ${errResult.message}`);
            // iniErrors.push('unexpected error in tokenize text');
            return result;
        }
    }
    // ─────────────────────────────────────────────────────────────────────────────────
    tokens.push({ type: TT.EOF, value: '', start: len, end: len });
    return tokens;
}
//#endregion
// ─────────────────────────────────────────────────────────────────────────────────
//#region .Parse PARSER ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────────

const parseState = {
    SCRIPT_FULL: 0,
    SCRIPT_FRAGMENT: 1,
    SCRIPT_UNKNOWN: 2
};

class Parser {
    constructor(tokens, text, state = parseState.SCRIPT_UNKNOWN) {
        this.tokens = tokens;
        this.text = text;
        this.state = state;
        this.pos = 0;
        this.errors = [];
        // todo Logger.dbg("stuff")
    }

    peek() { return this.curr[this.pos]; }
    curr() { return this.tokens[this.pos]; }
    next() { return this.tokens[this.pos++]; }
    prev() { return this.tokens[this.pos - 1]; }
    atEof() { return this.curr().type === TT.EOF; }

    // ────── .Parse (Primitives) Cross-cutting functions ───────────────
    // Yes or No?
    parseYesNo() {
        if (!this.isAnyKw('yes', 'no')) {
            this.error(severity.Error, `Expected 'yes' or 'no'`);
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
    error = (errorSeverity, msg, token) => {
        token = token || this.curr();
        const s = this.offsetToPos(token.start);
        const e = this.offsetToPos(token.end);
        this.errors.push({
            message: msg,
            range: {
                start: s,
                end: e,
            },
            severity: errorSeverity,
        });
    }

    warning = (errorSeverity, msg, token) => {
        token = token || this.curr();
        const s = this.offsetToPos(token.start);
        const e = this.offsetToPos(token.end);
        this.errors.push({
            message: msg,
            range: { start: s, end: e },
            severity: severity.Warning,
        });
    }

    // ─────────────────────────────────────────────────────────────────────────────────
    // Match a keyword (case-insensitive)
    expectKw(kw) {
        const t = this.curr();
        if ((t.type === TT.KEYWORD || t.type === TT.IDENT) && t.value.toLowerCase() === kw.toLowerCase()) {
            return this.next();
        }
        this.error(severity.Error, `Expected '${kw}' but found '${t.value}'`, t);
        return null;
    }

    // Try to match a keyword without consuming on failure
    tryKw(kw) {
        const t = this.curr();
        if ((t.type === TT.KEYWORD || t.type === TT.IDENT) && t.value.toLowerCase() === kw.toLowerCase()) {
            this.next(); return true;
        }
        return false;
    }

    isKw(kw) {
        const t = this.curr();
        return (t.type === TT.KEYWORD || t.type === TT.IDENT) && t.value.toLowerCase() === kw.toLowerCase();
    }

    isAnyKw(...kws) {
        const t = this.curr();
        if (t.type !== TT.KEYWORD && t.type !== TT.IDENT) return false;
        return kws.some(k => k.toLowerCase() === t.value.toLowerCase());
    }

    expect(type, desc) {
        const t = this.curr();
        if (t.type === type) return this.next();
        this.error(severity.Error, `Expected ${desc || type} but found '${t.value}'`, t);
        return null;
    }

    tryType(type) {
        if (this.curr().type === type) { this.next(); return true; }
        return false;
    }

    // ── Grammar rules - .Parse Statements ─────────────────────────────────────────────────────────

    parseStatements() {
        while (!this.atEof()) {
            if (this.tryKw('MaxRunTime')) {
                this.expect(TT.LPAREN, '(');
                this.parseDateTime();
                this.expect(TT.RPAREN, ')');
            }
            if (this.atEof()) break;
            if (!this.parseStatement()) break;
        }
    }
    // .parseStatement
    parseStatement() {
        const t = this.curr();

        // Skip preprocessor !include "..."! directives
        if (t.type === TT.MACRO ||
            (t.type === TT.KEYWORD && t.value.toLowerCase() === 'include')) {
            this.next();
            return true;
        }

        const kw = (t.type === TT.KEYWORD || t.type === TT.IDENT) ? t.value.toLowerCase() : '';

        switch (kw) {
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
                if (this.isSetting()) {
                    this.parseSetting();
                    return true;
                }
                return false;
        }
    }

    // ── .Parse Fragments ───────────────────────────────────────────────────────
    parseFragment() {
        const start = this.pos;
        const errorCount = this.errors.length;

        // Try full statement
        if (this.parseStatement()) {
            if (this.atEof()) return true;
        }
        this.pos = start;
        this.errors.length = errorCount;

        // Try file action
        if (this.parseFileAction()) {
            if (this.atEof()) return true;
        }
        this.pos = start;
        this.errors.length = errorCount;

        // Try volume action
        if (this.parseVolumeAction()) {
            if (this.atEof()) return true;
        }
        this.pos = start;
        this.errors.length = errorCount;

        // Try file boolean
        if (this.parseFileBoolean(false)) {
            if (this.atEof()) return true;
        }
        this.pos = start;
        this.errors.length = errorCount;

        // Try volume boolean
        if (this.parseVolumeBoolean()) {
            if (this.atEof()) return true;
        }

        // Try expression (number)
        if (this.parseNumber()) {
            if (this.atEof()) return true;
        }
        this.pos = start;
        this.errors.length = errorCount;

        // Nothing matched
        this.error(severity.Error, `Unrecognized SCRIPT_FRAGMENT starting with '${this.curr().value}'`);
        return false;
    }

    // ── .Parse Volume Booleans ───────────────────────────────────────────────────────

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
        const t = this.curr();
        const kw = (t.type === TT.KEYWORD || t.type === TT.IDENT) ? t.value.toLowerCase() : '';

        if (t.type === TT.LPAREN) {
            this.next();
            this.parseVolumeBooleans();
            this.expect(TT.RPAREN, ')');
            return;
        }

        switch (kw) {
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
                    this.error(severity.Error, `Expected filesystem type (NTFS, FAT, FAT12, FAT16, FAT32)`);
                } else this.next();
                this.expect(TT.RPAREN, ')');
                break;
            default:
                this.error(severity.Error, `Unexpected token '${t.value}' in volume boolean`, t);
                this.next(); // skip to avoid infinite loop
        }
    }

    // ── .Parse File Booleans ─────────────────────────────────────────────────────────

    parseFileBooleans() {
        connection.console.log('parseFileBooleans: ' + this.curr().value);
        this.parseFileBoolean(true);
        connection.console.log('after first boolean: ' + this.curr().value);
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
        const t = this.curr();
        const kw = (t.type === TT.KEYWORD || t.type === TT.IDENT) ? t.value.toLowerCase() : '';

        if (t.type === TT.LPAREN) {
            this.next();
            this.parseFileBooleans();
            this.expect(TT.RPAREN, ')');
            return;
        }

        switch (kw) {
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
                    this.error(severity.Error, `Unexpected token '${t.value}' in file boolean`, t);
                    this.next();
                } else {
                    this.error(severity.Warning, `Unexpected token '${t.value}' in file boolean, continuing...`, t);
                    this.next();
                }
        }
    }

    parseFileLocationOption() {
        if (!this.isAnyKw('beginoffile', 'endoffile', 'entirefile', 'anypart', 'anycompletefragment')) {
            this.error(severity.Error, `Expected file location option`);
        } else this.next();
    }

    // ── .Parse Volume Actions ────────────────────────────────────────────────────────

    parseVolumeActions() {
        while (!this.atEof() && !this.isKw('VolumeEnd')) {
            if (this.tryKw('MaxRunTime')) {
                this.expect(TT.LPAREN, '(');
                this.parseDateTime();
                this.expect(TT.RPAREN, ')');
                continue;
            }
            if (!this.parseVolumeAction()) break;
        }
    }

    parseVolumeAction() {
        const t = this.curr();
        const kw = (t.type === TT.KEYWORD || t.type === TT.IDENT) ? t.value.toLowerCase() : '';

        switch (kw) {
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

    // ── .Parse File Actions ──────────────────────────────────────────────────────────

    parseFileActions() {
        while (!this.atEof() && !this.isKw('FileEnd')) {
            if (this.tryKw('MaxRunTime')) {
                this.expect(TT.LPAREN, '(');
                this.parseDateTime();
                this.expect(TT.RPAREN, ')');
                continue;
            }
            if (!this.parseFileAction()) break;
        }
    }

    parseFileAction() {
        const t = this.curr();
        const kw = (t.type === TT.KEYWORD || t.type === TT.IDENT) ? t.value.toLowerCase() : '';

        switch (kw) {
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

    // ── .Parse Defragment Options ─────────────────────────────────────────────────────────
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
            this.error(severity.Error, `Expected 'Ascending' or 'Descending'`);
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

    // ── .Parse Settings ──────────────────────────────────────────────────────────────

    isSetting() {
        const kw = this.curr().value ? this.curr().value.toLowerCase() : '';
        return [
            'message', 'language', 'title', 'windowsize', 'diskmapflip', 'statusbar',
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
        const t = this.curr();
        const kw = t.value.toLowerCase();
        this.next();

        switch (kw) {
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
                this.parseStrings();
                this.expect(TT.RPAREN, ')');
                break;
            case 'windowsize':
                this.expect(TT.LPAREN, '(');
                if (!this.isAnyKw('fixed', 'minimized', 'maximized', 'invisible', 'restore')) {
                    this.error(severity.Error, `Expected window size option`);
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
                    this.error(severity.Error, `Expected 'ask', 'allow', 'exit', or 'kill'`);
                } else this.next();
                this.expect(TT.RPAREN, ')');
                break;
            case 'batterypower':
                this.expect(TT.LPAREN, '(');
                if (!this.isAnyKw('ask', 'allow', 'exit')) {
                    this.error(severity.Error, `Expected 'ask', 'allow', or 'exit'`);
                } else this.next();
                this.expect(TT.RPAREN, ')');
                break;
            case 'setscreensaver': case 'setscreenpowersaver':
                this.expect(TT.LPAREN, '(');
                if (!this.isAnyKw('off', 'reset')) {
                    this.error(severity.Error, `Expected 'off' or 'reset'`);
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
                    this.error(severity.Error, `Expected process priority`);
                } else this.next();
                this.expect(TT.RPAREN, ')');
                break;
            case 'setvariable':
                this.expect(TT.LPAREN, '(');
                // variable name
                if (this.curr().type !== TT.IDENT && this.curr().type !== TT.KEYWORD) {
                    this.error(severity.Error, `Expected variable name`);
                } else this.next();
                this.expect(TT.COMMA, ',');
                // value can be number or string
                if (this.curr().type === TT.STRING) {
                    this.next();
                } else {
                    this.parseNumber();
                }
                this.expect(TT.RPAREN, ')');
                break;
            default:
                this.error(severity.Error, `Unknown setting '${t.value}'`, t);
        }
    }

    // ── .Parse MyDefrag Features   ─────────────────────────────────────────────────────────

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
        this.error(severity.Error, `Expected WhenFinished option`);
    }

    // ── .Parse Color Features ───────────────────────────────────────────────────

    parseColorName() {
        if (!this.isAnyKw('empty', 'allocated', 'busyread', 'busywrite', 'text')) {
            this.error(severity.Error, `Expected color name`);
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
        const t = this.curr();
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
        this.error(severity.Error, `Unexpected token '${t.value}' in file color boolean`, t);
        this.next();
    }

    // ── .Parse Number(s) and Value(s) ───────────────────────────────────────────────────────────────

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
        const t = this.curr();
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

    // ── .Parse Values ───────────────────────────────────────────────────────────────
    parseValue() {
        const t = this.curr();

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
                this.error(severity.Error, `Expected variable after '-'`);
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

        this.error(severity.Error, `Expected number or variable but found '${t.value}'`, t);
        this.next();
    }


    // ── .Parse Strings ───────────────────────────────────────────────────────────────
    parseStrings() {
        this.expect(TT.STRING, 'string');
        while (this.curr().type === TT.COMMA) {
            this.next();
            this.expect(TT.STRING, 'string');
        }
    }

    // ── . Parse DateTime ──────────────────────────────────────────────────────────────
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
//#region .Parse VALIDATE DOCUMENT ───────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────────
async function validateDocument(document) {
    try { // ── Validate Document ─────────────────────────────────────────────────────────
        const filePath = fileURLToPath(document.uri);
        const ext = path.extname(filePath).toLowerCase();
        const text = document.getText();
        const diagnostics = [];
        const log = {
            appendLine: (...args) => console.log(...args),
            append: (...args) => process.stdout.write(args.join('')),
            show: () => { }
        };
        Logger.info(`MYDC SERVER ACTIVATED for ${filePath}`);

        switch (ext) {
            case '.mydfrg':
                parserState = parseState.SCRIPT_FULL;
                break;
            case '.myd':
                parserState = parseState.SCRIPT_FRAGMENT;
                break;
            default:
                parserState = parseState.SCRIPT_UNKNOWN;
                break;
        }

        const tokens = tokenize(text);

        // First attempt: full script
        let parser;
        let fragParser;
        let bestParser = new Parser(tokens, text, parserState);
        if (parserState !== parseState.SCRIPT_FRAGMENT) {
            parser = new Parser(tokens, text, parserState);
            parser.parseStatements();
            bestParser = parser;
        }
        // If full-script parse failed, try fragment mode
        parserState = parseState.SCRIPT_FRAGMENT
        if (!bestParser.atEof() || bestParser.errors.length > 0) {
            fragParser = new Parser(tokens, text, parserState);
            fragParser.parseFragment();
            // Choose the parser with fewer errors
            if (
                fragParser.errors.length < bestParser.errors.length ||
                (fragParser.errors.length === bestParser.errors.length &&
                    fragParser.atEof() && !bestParser.atEof())
            ) { bestParser = fragParser; }
        }

        parser = bestParser;
        parserState = bestParser.state;
        // Report any remaining tokens as unexpected
        if (!bestParser.atEof()) {
            const t = bestParser.curr();
            if (bestParser.state === parseState.SCRIPT_FRAGMENT) {
                bestParser.warning(severity.Warning, `Unexpected token '${t.value}' — fragment may be incomplete`, t);
            } else {
                bestParser.error(severity.Error, `Unexpected token '${t.value}' — expected end of file`, t);
            }
        }

        for (const errResult of bestParser.errors) {
            diagnostics.push({
                severity: errResult.severity,
                range: errResult.range,
                message: errResult.message,
                source: 'MyDefrag',
            });
        }
    }
    catch (e) {
        connection.console.error('Parser exception: ' + e.message);
    }

    connection.sendNotification('mydfrg/parserState', { uri: document.uri, state: parserState });

    connection.sendDiagnostics({
        uri: document.uri,
        diagnostics
    });
}
//#endregion
// ─────────────────────────────────────────────────────────────────────────────────
//#region .Parse connection Management.
//  On Completion and Hover ──────────────────────────────────────────────────────
// (ToDo On Completion and Hover are stubs for now)
// ─────────────────────────────────────────────────────────────────────────────────

connection.onInitialize(() => {
    return {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            completionProvider: { resolveProvider: true },
            hoverProvider: true,
            definitionProvider: true,
            referencesProvider: true,
        }
    };
});

connection.onInitialized(() => {
    connection.console.log('MyDefrag Language Server initialized');
});

connection.onCompletion(() => {
    return [];
});

connection.onHover(() => {
    return null;
});

connection.onInitialized(() => {
    // Request the client to watch all MyDefrag files
    connection.client.register(
        require('vscode-languageserver/node').DidChangeWatchedFilesNotification.type,
        {
            watchers: [
                { globPattern: '**/*.MyDc' },
                { globPattern: '**/*.MyD' }
            ]
        }
    );
    connection.console.log('MyDefrag Language Server initialized');
});

connection.onDidChangeWatchedFiles(() => {
    // Re-validate all open documents when files change
    documents.all().forEach(validateDocument);
});
//#endregion
// .Parse Server Open Document and Connection ──────────────────────────────────────────────────────────────
documents.listen(connection);
connection.listen();
// .Parse END of document ──────────────────────────────────────────────────────────────
