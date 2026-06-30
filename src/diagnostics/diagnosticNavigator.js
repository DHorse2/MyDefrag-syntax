'use strict';

const fs = require('fs');
const path = require('path');
const vscode = require('vscode');
const {
    DiagState,
    DiagnosticStateStore
} = require('./diagnosticsState');
const { KeywordLookup } = require('./keywordLookup');
const paths = require('../shared/path');

const INFORMATION_SEVERITY = 3;

/**
 * Loads diagnostics-latest.json and provides deterministic next/next-file
 * navigation over non-information diagnostics.
 */
class DiagnosticNavigator {
    /**
     * @param {object} options
     * @param {string} options.diagnosticsFile Absolute path to diagnostics-latest.json.
     * @param {string} options.dismissedFile Absolute path to session_dismissed.json.
     * @param {object} [options.languageData] Existing project keyword/language data.
     */
    constructor(options = {}) {
        paths.ensureDirectories();

        this.diagnosticsFile = options.diagnosticsFile || paths.diagnosticsLatestFile;

        this.dismissedFile = options.dismissedFile || paths.diagnosticsStateFile;

        this.state = new DiagnosticStateStore(options.stateFile || paths.diagnosticsStateFile);

        // this.navigatorStateFile = options.navigatorStateFile || paths.navigatorStateFile;

        // this.state = new DiagnosticState(this.dismissedFile);

        this.currentIndex = 0;
        this.diagnostics = [];
        this.dismissedFiles = new Set(); // remove todo???

        this.keywordLookup = new KeywordLookup(options.languageData || {});

        this.allDiagnostics = [];
        this.visibleDiagnostics = [];
        this.index = -1;
        this.reload();
    }

    // diagnostic key helper
    keyOf(item) {
        if (!item) { return ''; }

        return [
            item.filePath || '',
            item.line ?? '',
            item.column ?? '',
            item.message || ''
        ].join('|');
    };

    /**
     * Reload diagnostics and dismissed state from disk.
     */
    reload() {
        this.state.load();
        this.allDiagnostics = this.loadDiagnostics();
        this.visibleDiagnostics = this.filterDiagnostics(this.allDiagnostics);

        if (this.visibleDiagnostics.length === 0) {
            this.index = -1;
        } else if (this.index < 0 || this.index >= this.visibleDiagnostics.length) {
            this.index = 0;
        }

        return this.current();
    }

    /**
     * @returns {Array<object>}
     */
    loadDiagnostics() {
        if (!this.diagnosticsFile || !fs.existsSync(this.diagnosticsFile)) {
            return [];
        }

        try {
            const raw = fs.readFileSync(this.diagnosticsFile, 'utf8');
            if (!raw.trim()) return [];
            return this.normalizeDiagnostics(JSON.parse(raw));
        } catch (err) {
            console.error(`Failed to load diagnostics: ${err.message}`);
            return [];
        }
    }

    /**
     * Accepts several likely diagnostics-latest.json shapes and returns a flat list.
     *
     * @param {*} parsed
     * @returns {Array<object>}
     */
    normalizeDiagnostics(parsed) {
        const result = [];

        if (Array.isArray(parsed)) {
            for (const item of parsed) {
                this.pushNormalizedItem(result, item, item.filePath || item.file || item.uri);
            }
            return result;
        }

        if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.diagnosticsByUri)) {
                for (const item of parsed.diagnosticsByUri) {
                    this.pushNormalizedItem(result, item, item.filePath || item.file || item.uri);
                }
                return result;
            }
            for (const [filePath, entry] of Object.entries(parsed.diagnosticsByUri || {})) {
                let diagnostics = entry;
                if (entry && Array.isArray(entry.diagnostics)) {
                    diagnostics = entry.diagnostics;
                } else if (entry && Array.isArray(entry.items)) {
                    diagnostics = entry.items;
                } else if (entry && Array.isArray(entry.children)) {
                    diagnostics = entry.children;
                }

                if (!Array.isArray(diagnostics)) { continue; }

                for (const diagnostic of diagnostics) {
                    this.pushNormalizedItem(result, diagnostic, filePath);
                }
            }
        }

        return result;
    }

    /**
     * @param {Array<object>} result
     * @param {object} diagnostic
     * @param {string} filePath
     */
    pushNormalizedItem(result, diagnostic, filePath) {
        if (!diagnostic || !filePath) return;

        const range = diagnostic.range || {};
        const start = range.start || diagnostic.start || {};
        const line = Number.isInteger(diagnostic.line) ? diagnostic.line : Number(start.line || 0);
        const character = Number.isInteger(diagnostic.character) ? diagnostic.character : Number(start.character || diagnostic.column || 0);
        const severity = Number.isInteger(diagnostic.severity) ? diagnostic.severity : Number(diagnostic.severity || 0);
        const token = this.keywordLookup.extractToken(diagnostic);
        const keyword = this.keywordLookup.lookup(token);

        result.push({
            filePath: this.filePathFromUriOrPath(filePath),
            line,
            character,
            severity,
            message: String(diagnostic.message || ''),
            token: keyword.token,
            keywordExists: keyword.exists,
            raw: diagnostic
        });
    }

    /**
     * @param {Array<object>} diagnostics
     * @returns {Array<object>}
     */
    filterDiagnostics(diagnostics) {
        return diagnostics.filter((item) => {
            const key = this.keyOf(item);
            if (item.severity === 3) { return false; }
            if (this.state.isFixed(key)) { return false; }
            if (this.state.isIgnored(key)) { return false; }
            return true;
        });
    }

    /**
     * @param {object} item
     * @returns {boolean}
     */
    isNavigable(item) {
        if (!item) { return false; }
        const key = this.keyOf(item);
        if (this.state.isFixed(key)) { return false; }
        if (this.state.isIgnored(key)) { return false; }
        if (this.state.isSkipped(key)) { return false; }
        return true;
    }

    /**
    * @returns {object|null}
    */
    current() {
        if (this.index < 0 || this.index >= this.visibleDiagnostics.length) return null;
        return this.toDisplayDiagnostic(this.visibleDiagnostics[this.index]);
    }

    /**
     * Return next non-information diagnostic in sequence.
     *
     * @returns {object|null}
     */
    next() {
        this.reload();
        if (this.visibleDiagnostics.length === 0) return null;
        this.index = Math.min(this.index + 1, this.visibleDiagnostics.length - 1);
        return this.current();
    }

    /**
     * Skip remainder of current file and return first diagnostic from next file.
     *
     * @returns {object|null}
     */
    nextFile() {
        this.reload();
        const current = this.visibleDiagnostics[this.index];
        if (!current) return null;

        const currentFile = this.normalizePath(current.filePath);
        for (let i = this.index + 1; i < this.visibleDiagnostics.length; i += 1) {
            if (this.normalizePath(this.visibleDiagnostics[i].filePath) !== currentFile) {
                this.index = i;
                return this.current();
            }
        }

        this.index = this.visibleDiagnostics.length - 1;
        return null;
    }

    /**
     * Move to the first diagnostic in the previous file.
     *
     * @returns {object|null} Current diagnostic after navigation, or null if none.
     */
    prevFile() {
        if (this.index <= 0) { return null; }
        const currentFile = this.visibleDiagnostics[this.index].filePath;

        let i = this.index - 1;
        // Skip remaining diagnostics from the current file.
        while (i >= 0 && this.visibleDiagnostics[i].filePath === currentFile) { i--; }
        if (i < 0) { return null; }

        // We are now inside the previous file.
        // Continue walking backwards until we reach its first diagnostic.
        const previousFile = this.visibleDiagnostics[i].filePath;
        while (i > 0 && this.visibleDiagnostics[i - 1].filePath === previousFile) { i--; }
        this.index = i;

        return this.current();
    }

    /**
     * Add current file to dismissed list, then move to next eligible file.
     *
     * @returns {object|null}
     */
    skipItem() {
        const current = this.current();
        if (!current) { return null; }
        this.state.set(this.keyOf(current), DiagState.SKIPPED);
        return this.next();
    }

    /**
    * Same as next; used when user fixed the current issue in the editor.
    *
    * @returns {object|null}
    */
    fixedItem() {
        const current = this.current();
        if (!current) { return null; }
        this.state.set(this.keyOf(current), DiagState.FIXED);
        this.reload();
        return this.current();
    }

    /**
     * Add current file to dismissed list, then move to next eligible file.
     *
     * @returns {object|null}
     */
    ignoreItem() {
        const current = this.current();
        if (!current) { return null; }
        this.state.set(this.keyOf(current), DiagState.IGNORED);
        this.reload();
        return this.current();
    }

    /**
     * Add current file to dismissed list, then move to next eligible file.
     *
     * @returns {object|null}
     */
    validSyntax() {
        const current = this.current();
        if (!current) { return null; }
        this.state.set(this.keyOf(current), DiagState.IGNORED);
        this.reload();
        return this.current();
    }

    /**
     * Send data to AI Agent or external program/clipboard
     *
     * @returns {object|null}
     */
    sendIt() {
        const current = this.current();
        if (!current) { return null; }
        this.state.set(this.keyOf(current), DiagState.SENT);
        this.reload();
        return this.current();
    }

    /**
     * Clear dismissed list and restart from first diagnostic.
     *
     * @returns {object|null}
     */
    top() {
        this.state.clearSkipped();
        this.reload();
        this.index = -1;
        return this.next();
    }

    /**
     * Clear dismissed list and restart from first diagnostic.
     *
     * @returns {object|null}
     */
    reset() {
        this.state.reset();
        this.reload();
        this.index = -1;
        return this.next();
    }

    /**
     * Open the current diagnostic in the editor.
     *
     * @returns {Promise<void>}
     */
    async openCurrent() {
        const current = this.current();
        if (!current) return;

        const uri = vscode.Uri.file(current.filePath);
        const position = new vscode.Position(current.line, current.character);
        await vscode.window.showTextDocument(uri, {
            selection: new vscode.Range(position, position),
            preview: false
        });
    }

    /**
     * @returns {{index:number,total:number,fileCount:number}}
     */
    getStats() {
        const files = new Set(this.visibleDiagnostics.map(d => this.normalizePath(d.filePath)));
        return {
            index: this.index >= 0 ? this.index + 1 : 0,
            total: this.visibleDiagnostics.length,
            fileCount: files.size
        };
    }

    /**
     * @param {object} diagnostic
     * @returns {object}
     */
    toDisplayDiagnostic(diagnostic) {
        return {
            ...diagnostic,
            oneBasedLine: diagnostic.line + 1,
            oneBasedColumn: diagnostic.character + 1,
            stats: this.getStats()
        };
    }

    /**
     * @param {string} value
     * @returns {string}
     */
    filePathFromUriOrPath(value) {
        const text = String(value);
        if (text.startsWith('file:///')) {
            return vscode.Uri.parse(text).fsPath;
        }
        return text;
    }

    /**
     * @param {string} filePath
     * @returns {string}
     */
    normalizePath(filePath) {
        return String(filePath || '').replace(/\\/g, '/').toLowerCase();
    }
}

module.exports = {
    DiagnosticNavigator
};
