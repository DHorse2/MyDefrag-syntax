'use strict';

const fs = require('fs');
const path = require('path');
const paths = require('../shared/path');

const DiagState = Object.freeze({
    NONE: '',
    SKIPPED: 'skipped',
    FIXED: 'fixed',
    IGNORED: 'ignored',
    SENT: 'sent'
});

/**
 * Maintains persistent state for individual diagnostics.
 */
class DiagnosticStateStore {
    /**
     * @param {string|null} stateFile Absolute path to diagnostics state JSON.
     * @param {object} [options]
     * @param {string|null} [options.legacyStateFile] Legacy state path to read when the primary file does not exist.
     */
    constructor(stateFile = null, options = {}) {
        paths.ensureDirectories();
        this.stateFile = stateFile ?? paths.diagnosticsStateFile;
        this.legacyStateFile = options.legacyStateFile || null;
        this.items = new Map();
        this.saveFailed = false;
        this.load();
    }

    /**
     * Reload state from disk while accepting current and legacy formats.
     *
     * @returns {Map<string,string>}
     */
    load() {
        if (this.saveFailed) return this.items;

        this.items.clear();
        const loadStateFile = this.getLoadStateFile();
        if (!loadStateFile || !fs.existsSync(loadStateFile)) return this.items;

        try {
            const raw = fs.readFileSync(loadStateFile, 'utf8');
            if (!raw.trim()) return this.items;

            const parsed = JSON.parse(raw);
            if (parsed && parsed.items && typeof parsed.items === 'object' && !Array.isArray(parsed.items)) {
                for (const [key, state] of Object.entries(parsed.items)) {
                    this.setLoadedState(key, state);
                }
                return this.items;
            }

            this.loadStateArray(parsed.fixed, DiagState.FIXED);
            this.loadStateArray(parsed.skipped, DiagState.SKIPPED);
            this.loadStateArray(parsed.ignore, DiagState.IGNORED);
            this.loadStateArray(parsed.ignored, DiagState.IGNORED);

            if (Array.isArray(parsed)) {
                this.loadStateArray(parsed, DiagState.SKIPPED);
            }
        } catch (err) {
            console.error(`Failed to load diagnostic state: ${err.message}`);
        }

        return this.items;
    }

    /**
     * @returns {string|null}
     */
    getLoadStateFile() {
        if (this.stateFile && fs.existsSync(this.stateFile)) return this.stateFile;
        if (this.legacyStateFile && this.legacyStateFile !== this.stateFile && fs.existsSync(this.legacyStateFile)) {
            return this.legacyStateFile;
        }
        return this.stateFile;
    }

    save() {
        if (!this.stateFile) return;

        fs.mkdirSync(path.dirname(this.stateFile), { recursive: true });
        const sortedItems = {};
        for (const key of Array.from(this.items.keys()).sort()) {
            sortedItems[key] = this.items.get(key);
        }

        try {
            replaceFileSync(this.stateFile, JSON.stringify({ items: sortedItems }, null, 2), 'utf8');
            this.saveFailed = false;
        } catch (err) {
            this.saveFailed = true;
            console.error(`Failed to save diagnostic state: ${err.message}`);
        }
    }

    /**
     * @param {string} key
     * @param {string} state
     */
    set(key, state) {
        key = this.normalizeKey(key);
        if (!key) return;

        if (!state || state === DiagState.NONE) this.items.delete(key);
        else this.items.set(key, state);
        this.save();
    }

    /**
     * @param {string} key
     * @returns {string}
     */
    get(key) {
        key = this.normalizeKey(key);
        return key ? this.items.get(key) || DiagState.NONE : DiagState.NONE;
    }

    isSkipped(key) { return this.get(key) === DiagState.SKIPPED; }
    isFixed(key) { return this.get(key) === DiagState.FIXED; }
    isIgnored(key) { return this.get(key) === DiagState.IGNORED; }
    isSent(key) { return this.get(key) === DiagState.SENT; }

    clearSkipped() {
        for (const [key, state] of Array.from(this.items.entries())) {
            if (state === DiagState.SKIPPED) this.items.delete(key);
        }
        this.save();
    }

    reset() {
        this.items.clear();
        this.save();
    }

    loadStateArray(list, state) {
        if (!Array.isArray(list)) return;
        for (const key of list) this.setLoadedState(key, state);
    }

    setLoadedState(key, state) {
        key = this.normalizeKey(key);
        if (!key || !this.isValidState(state)) return;

        if (state === DiagState.NONE) this.items.delete(key);
        else this.items.set(key, state);
    }

    isValidState(state) {
        return Object.values(DiagState).includes(state);
    }

    normalizeKey(key) {
        return key ? String(key).replace(/\\/g, '/').toLowerCase() : '';
    }
}

function replaceFileSync(filePath, content, encoding) {
    const dir = path.dirname(filePath);
    const base = path.basename(filePath);
    const tempFile = path.join(dir, `.${base}.${process.pid}.${Date.now()}.tmp`);

    try {
        fs.writeFileSync(tempFile, content, encoding);
        retryFileOperation(() => fs.renameSync(tempFile, filePath));
    } finally {
        if (fs.existsSync(tempFile)) {
            try {
                fs.unlinkSync(tempFile);
            } catch (_err) {
                // Best-effort cleanup for a failed atomic write.
            }
        }
    }
}

function retryFileOperation(operation) {
    let lastError = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
            operation();
            return;
        } catch (err) {
            lastError = err;
            if (!isRetriableFileError(err) || attempt === 4) throw err;
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
        }
    }

    throw lastError;
}

function isRetriableFileError(err) {
    return err && ['UNKNOWN', 'EBUSY', 'EPERM', 'EACCES'].includes(err.code);
}

module.exports = {
    DiagState,
    DiagnosticStateStore,
    diagnosticState: DiagnosticStateStore
};
