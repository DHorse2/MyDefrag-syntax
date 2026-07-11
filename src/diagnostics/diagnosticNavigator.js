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

const MAX_PROBLEMS_SEVERITY = 2;

/**
 * Loads diagnostics-latest.json and provides deterministic next/next-file
 * navigation over non-information diagnostics.
 */
class DiagnosticNavigator {
    /**
     * @param {object} options
     * @param {string} options.diagnosticsFile Absolute path to diagnostics-latest.json.
     * @param {string} options.dismissedFile Absolute path to session_dismissed.json.
     * @param {string} options.stateFile Absolute path to writable diagnostic state JSON.
     * @param {string} options.legacyStateFile Legacy diagnostic state JSON used only when stateFile does not exist.
     * @param {object} [options.languageData] Existing project keyword/language data.
     */
    constructor(options = {}) {
        paths.ensureDirectories();

        this.diagnosticsFile = options.diagnosticsFile || paths.diagnosticsLatestFile;

        const stateFile = options.stateFile || paths.diagnosticsStateFile;

        this.dismissedFile = options.dismissedFile || stateFile;

        this.state = new DiagnosticStateStore(stateFile, {
            legacyStateFile: options.legacyStateFile
        });

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
    // ─────────────────────────────────────────────────────────────────────────────────
    //#region Diagnostic Data
    // diagnostic key helper
    keyOf(item) {
        if (!item) { return ''; }

        return [
            this.normalizePath(item.filePath || ''),
            item.line ?? '',
            item.column ?? '',
            item.message || ''
        ].join('|');
    };

    /**
     * Reload diagnostics and dismissed state from disk.
     */
    reload() {
        const currentKey = this.keyOf(this.visibleDiagnostics[this.index]);
        this.state.load();
        this.allDiagnostics = this.loadDiagnostics();
        this.visibleDiagnostics = this.filterDiagnostics(this.allDiagnostics);

        if (this.visibleDiagnostics.length === 0) {
            this.index = -1;
        } else if (currentKey) {
            const nextIndex = this.visibleDiagnostics.findIndex((item) => this.keyOf(item) === currentKey);
            this.index = nextIndex >= 0 ? nextIndex : Math.min(this.index, this.visibleDiagnostics.length - 1);
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
            return this.dedupeDiagnostics(this.sortDiagnostics(result));
        }

        if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.diagnosticsByUri)) {
                for (const item of parsed.diagnosticsByUri) {
                    this.pushNormalizedItem(result, item, item.filePath || item.file || item.uri);
                }
                return this.dedupeDiagnostics(this.sortDiagnostics(result));
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

        return this.dedupeDiagnostics(this.sortDiagnostics(result));
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
     * Remove duplicate diagnostics that differ only by URI spelling.
     *
     * @param {Array<object>} diagnostics
     * @returns {Array<object>}
     */
    dedupeDiagnostics(diagnostics) {
        const result = [];
        const seen = new Set();

        for (const diagnostic of diagnostics) {
            const key = this.keyOf(diagnostic);
            if (seen.has(key)) { continue; }

            seen.add(key);
            result.push(diagnostic);
        }

        return result;
    }

    /**
     * Keep diagnostic navigation stable across snapshot rewrites.
     *
     * @param {Array<object>} diagnostics
     * @returns {Array<object>}
     */
    sortDiagnostics(diagnostics) {
        return diagnostics.slice().sort((a, b) => this.keyOf(a).localeCompare(this.keyOf(b)));
    }

    /**
     * @param {Array<object>} diagnostics
     * @returns {Array<object>}
     */
    filterDiagnostics(diagnostics) {
        return diagnostics.filter((item) => {
            const key = this.keyOf(item);
            if (!isProblemsDiagnostic(item)) { return false; }
            if (this.state.isFixed(key)) { return false; }
            if (this.state.isIgnored(key)) { return false; }
            if (this.state.isSkipped(key)) { return false; }
            if (this.state.isSent(key)) { return false; }
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
        if (!isProblemsDiagnostic(item)) { return false; }
        if (this.state.isFixed(key)) { return false; }
        if (this.state.isIgnored(key)) { return false; }
        if (this.state.isSkipped(key)) { return false; }
        if (this.state.isSent(key)) { return false; }
        return true;
    }
    //#endregion
    // ─────────────────────────────────────────────────────────────────────────────────
    //#region API Exposed Commands
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
        this.index = this.index < 0
            ? 0
            : Math.min(this.index + 1, this.visibleDiagnostics.length - 1);
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
        this.reload();
        return this.current();
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
     * Generate an AI prompt for the current diagnostic.
     * The current diagnostic remains selected.
     *
     * @returns {object|null}
     * 
     * use the VS Code API.
     *      const vscode = require('vscode');
     *      await vscode.env.clipboard.writeText(promptText);
     * or in a non-async function:
     *      vscode.env.clipboard.writeText(promptText).then(() => {
     *          vscode.window.showInformationMessage("Diagnostic prompt copied to clipboard.");
     *      });
     *         
     */
    async sendIt() {
        const current = this.current();
        if (!current) {
            return null;
        }

        paths.ensureDirectories();

        const payload = {
            generatedAt: new Date().toISOString(),
            diagnostic: current,
            key: this.keyOf(current),
            diagnosticsFile: this.diagnosticsFile
        };

        const prompt = this.buildAiPrompt(payload);

        // Save prompt to disk
        fs.writeFileSync(
            paths.diagnosticsSendPromptFile,
            prompt,
            'utf8'
        );

        // Optional JSON companion
        fs.writeFileSync(
            paths.diagnosticsSendItemFile,
            JSON.stringify(payload, null, 2),
            'utf8'
        );

        // Optional clipboard
        vscode.env.clipboard.writeText(prompt).then(() => {
            vscode.window.showInformationMessage("Diagnostic prompt copied to clipboard.");
        });

        // Remember that this diagnostic has been sent
        this.state.set(this.keyOf(current), DiagState.SENT);

        // Reload so the tree/status can reflect SENT
        this.reload();

        // Stay on THIS diagnostic
        return {
            diagnostic: this.current(),
            promptFile: paths.diagnosticsSendPromptFile
        };
    }

    /**
     * Clear dismissed list and restart from first diagnostic.
     *
     * @returns {object|null}
     */
    top() {
        this.state.clearSkipped();
        this.reload();
        this.index = this.visibleDiagnostics.length > 0 ? 0 : -1;
        return this.current();
    }

    /**
     * Clear dismissed list and restart from first diagnostic.
     *
     * @returns {object|null}
     */
    reset() {
        this.state.reset();
        this.reload();
        this.index = this.visibleDiagnostics.length > 0 ? 0 : -1;
        return this.current();
    }
    //#endregion
    // ─────────────────────────────────────────────────────────────────────────────────
    //#region Functions
    /**
     * Builds a Markdown prompt for AI-assisted diagnosis of a MyDefrag
     * language extension diagnostic.
     *
     * @param {object} payload
     * @returns {string}
     */
    buildAiPrompt(payload) {
        const diagnostic = payload.diagnostic || {};

        return [
            "# MyDefrag Language Extension",
            "",
            "## Developer comments",
            "",
            "None",
            "",
            "## Diagnostic Repair Request",
            "",
            "You are assisting in the development of the MyDefrag Language Extension.",
            "",
            "Your objective is to determine whether the current diagnostic is caused by:",
            "",
            "1. Invalid MyDefrag script syntax.",
            "2. A tokenizer defect.",
            "3. A parser defect.",
            "4. Incorrect languageData metadata.",
            "5. An incorrect diagnostic.",
            "6. A navigation or classification bug.",
            "",
            "When proposing code changes:",
            "",
            "- Preserve all existing comments.",
            "- Preserve formatting.",
            "- Make the smallest possible safe change.",
            "- Do not refactor unrelated code.",
            "- Explain the root cause before proposing a fix.",
            "- If multiple fixes are possible, recommend the safest one.",
            "",
            "---",
            "",
            "## Diagnostic",
            "",
            `File: ${diagnostic.filePath}`,
            `Line: ${diagnostic.oneBasedLine}`,
            `Column: ${diagnostic.oneBasedColumn}`,
            `Severity: ${diagnostic.severity}`,
            `Message: ${diagnostic.message}`,
            `Token: ${diagnostic.token || "(not detected)"}`,
            `Known Keyword: ${diagnostic.keywordExists ? "Yes" : "No"}`,
            "",
            "---",
            "",
            "## Investigation",
            "",
            "Determine:",
            "",
            "- What the parser was expecting.",
            "- Why the diagnostic was produced.",
            "- Whether the script is valid.",
            "- Whether the language extension is correct.",
            "",
            "---",
            "",
            "## Expected Response",
            "",
            "Please provide:",
            "",
            "1. Root cause.",
            "2. Recommended fix.",
            "3. Files requiring modification.",
            "4. Exact code changes.",
            "5. Any risks or side effects.",
            "",
            "---",
            "",
            "## Diagnostic JSON",
            "",
            "```json",
            JSON.stringify(payload, null, 2),
            "```",
            ""
        ].join("\n");
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
     * @returns {{currentIndex:number,total:number,fileCount:number}}
     */
    getState() {
        const stats = this.getStats();
        return {
            currentIndex: stats.index > 0 ? stats.index - 1 : 0,
            total: stats.total,
            fileCount: stats.fileCount
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
            let uriText = text;
            try {
                uriText = decodeURIComponent(text);
            } catch (_err) {
                uriText = text;
            }

            try {
                return vscode.Uri.parse(uriText).fsPath;
            } catch (_err) {
                return uriText.replace(/^file:\/\/\//, '');
            }
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
//#endregion

/**
 * Match the diagnostic severities that should be navigated from the Problems list.
 *
 * @param {object} diagnostic
 * @returns {boolean}
 */
function isProblemsDiagnostic(diagnostic) {
    return Boolean(diagnostic && diagnostic.severity > 0 && diagnostic.severity <= MAX_PROBLEMS_SEVERITY);
}

module.exports = {
    DiagnosticNavigator
};
