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
 * Maintains diagnostic navigation state.
 *
 * SKIPPED is temporary navigation state.
 * FIXED and IGNORED are persistent exclusion states.
 */
class DiagnosticStateStore {
    /**
     * @param {string|null} stateFile Absolute path to diagnostics state JSON.
     */
    constructor(stateFile = null) {
        paths.ensureDirectories();

        if (stateFile === null || stateFile === undefined) {
            stateFile = paths.diagnosticsStateFile;
        }

        this.stateFile = stateFile;
        this.items = new Map();

        this.load();
    }

    /**
     * Reload diagnostic state from disk.
     *
     * Supported file formats:
     * - { "items": { "key": "fixed" } }
     * - { "fixed": ["key"], "skipped": ["key"], "ignored": ["key"] }
     * - ["key"] legacy format, treated as skipped
     *
     * @returns {Map<string,string>}
     */
    load() {
        this.items.clear();

        if (!this.stateFile || !fs.existsSync(this.stateFile)) {
            return this.items;
        }

        try {
            const raw = fs.readFileSync(this.stateFile, 'utf8');
            if (!raw.trim()) { return this.items; }

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
     * Save diagnostic state to disk.
     */
    save() {
        if (!this.stateFile) { return; }

        const dir = path.dirname(this.stateFile);
        fs.mkdirSync(dir, { recursive: true });

        const sortedItems = {};
        for (const key of Array.from(this.items.keys()).sort()) {
            sortedItems[key] = this.items.get(key);
        }

        const payload = {
            items: sortedItems
        };

        fs.writeFileSync(this.stateFile, JSON.stringify(payload, null, 2), 'utf8');
    }

    /**
     * Set the state for a diagnostic key.
     *
     * @param {string} key
     * @param {string} state
     */
    set(key, state) {
        key = this.normalizeKey(key);

        if (!key) { return; }

        if (!state || state === DiagState.NONE) {
            this.items.delete(key);
        } else {
            this.items.set(key, state);
        }

        this.save();
    }

    /**
     * @param {string} key
     * @returns {string}
     */
    get(key) {
        key = this.normalizeKey(key);

        if (!key) { return DiagState.NONE; }

        return this.items.get(key) || DiagState.NONE;
    }

    /**
     * Remove a diagnostic key from state.
     *
     * @param {string} key
     */
    remove(key) {
        key = this.normalizeKey(key);

        if (!key) { return; }

        this.items.delete(key);
        this.save();
    }

    /**
     * @param {string} key
     * @returns {boolean}
     */
    has(key) {
        key = this.normalizeKey(key);

        if (!key) { return false; }

        return this.items.has(key);
    }

    /**
     * @param {string} key
     * @returns {boolean}
     */
    isSkipped(key) {
        return this.get(key) === DiagState.SKIPPED;
    }

    /**
     * @param {string} key
     * @returns {boolean}
     */
    isFixed(key) {
        return this.get(key) === DiagState.FIXED;
    }

    /**
     * @param {string} key
     * @returns {boolean}
     */
    isIgnored(key) {
        return this.get(key) === DiagState.IGNORED;
    }

    /**
     * Clear only skipped diagnostics.
     */
    clearSkipped() {
        for (const [key, state] of Array.from(this.items.entries())) {
            if (state === DiagState.SKIPPED) {
                this.items.delete(key);
            }
        }

        this.save();
    }

    /**
     * Remove all diagnostic state.
     */
    reset() {
        this.items.clear();
        this.save();
    }

    /**
     * Load an array of keys with the same state.
     *
     * @param {string[]} list
     * @param {string} state
     */
    loadStateArray(list, state) {
        if (!Array.isArray(list)) { return; }

        for (const key of list) {
            this.setLoadedState(key, state);
        }
    }

    /**
     * Set state during load without repeatedly saving.
     *
     * @param {string} key
     * @param {string} state
     */
    setLoadedState(key, state) {
        key = this.normalizeKey(key);

        if (!key) { return; }

        if (!this.isValidState(state)) { return; }

        if (state === DiagState.NONE) {
            this.items.delete(key);
        } else {
            this.items.set(key, state);
        }
    }

    /**
     * @param {string} state
     * @returns {boolean}
     */
    isValidState(state) {
        return state === DiagState.NONE ||
            state === DiagState.SKIPPED ||
            state === DiagState.FIXED ||
            state === DiagState.IGNORED;
    }

    /**
     * Normalize diagnostic keys for stable comparisons.
     *
     * @param {string} key
     * @returns {string}
     */
    normalizeKey(key) {
        if (!key) { return ''; }

        return String(key).replace(/\\/g, '/').toLowerCase();
    }
}

module.exports = {
    DiagState,
    DiagnosticStateStore,

    // Compatibility alias while existing code is updated.
    diagnosticState: DiagnosticStateStore
};