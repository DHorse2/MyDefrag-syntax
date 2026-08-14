'use strict';

/**
 * Looks up diagnostic keywords/tokens against the extension language data.
 *
 * The constructor accepts languageData from the existing project so this module
 * does not duplicate the MyDefrag keyword list.
 */
class KeywordLookup {
    /**
     * @param {object} languageData Existing project language data module/object.
     */
    constructor(languageData) {
        this.languageData = languageData || {};
        this.keywords = new Set();
        this.rebuildIndex();
    }

    /**
     * Rebuild the lowercase keyword index from common languageData shapes.
     */
    rebuildIndex() {
        this.keywords.clear();
        this.addFromValue(this.languageData);
    }

    /**
     * @param {string} token
     * @returns {{token: string|null, exists: boolean}}
     */
    lookup(token) {
        const clean = this.cleanToken(token);
        if (!clean) {
            return { token: null, exists: false };
        }

        const result = {
            token: clean,
            exists: this.keywords.has(clean.toLowerCase())
        };
        const helpDocuments = this.getHelpDocuments(clean);
        if (helpDocuments.length > 0) {
            result.helpDocuments = helpDocuments;
        }
        return result;
    }

    /**
     * Best-effort keyword extraction from a diagnostic message.
     *
     * @param {object} diagnostic
     * @returns {string|null}
     */
    extractToken(diagnostic) {
        if (!diagnostic) return null;

        if (diagnostic.keyword) return this.cleanToken(diagnostic.keyword);
        if (diagnostic.token) return this.cleanToken(diagnostic.token);

        const message = String(diagnostic.message || '');
        const quoted = message.match(/["'`]!?([A-Za-z_][A-Za-z0-9_]*)/);
        if (quoted) return this.cleanToken(quoted[1]);

        const afterKeyword = message.match(/keyword\s+["'`]?!?([A-Za-z_][A-Za-z0-9_]*)/i);
        if (afterKeyword) return this.cleanToken(afterKeyword[1]);

        const afterToken = message.match(/token\s+["'`]?!?([A-Za-z_][A-Za-z0-9_]*)/i);
        if (afterToken) return this.cleanToken(afterToken[1]);

        const unknown = message.match(/unknown\s+["'`]?!?([A-Za-z_][A-Za-z0-9_]*)/i);
        if (unknown) return this.cleanToken(unknown[1]);

        return null;
    }

    /**
     * @param {string|null|undefined} token
     * @returns {string|null}
     */
    cleanToken(token) {
        if (!token) return null;
        const match = String(token).match(/[A-Za-z_][A-Za-z0-9_]*/);
        return match ? match[0] : null;
    }

    /**
     * Resolve Help metadata exposed by languageData without making diagnostics
     * depend on the Help filesystem.
     *
     * @param {string} token
     * @returns {Array<{path: string, text?: string, description?: string}>}
     */
    getHelpDocuments(token) {
        if (typeof this.languageData.getKeywordHelpDocuments === 'function') {
            const documents = this.languageData.getKeywordHelpDocuments(token);
            if (documents.length > 0) return documents;
        }

        if (typeof this.languageData.isPredefinedIdentifier === 'function') {
            const identifier = this.languageData.isPredefinedIdentifier(token);
            if (identifier?.help?.[0]) {
                return [{
                    text: identifier.text,
                    description: `${identifier.description} (${identifier.units}).`,
                    path: identifier.help[0]
                }];
            }
        }

        return [];
    }

    /**
     * Recursively collect likely keyword strings from language data.
     *
     * @param {*} value
     */
    addFromValue(value) {
        if (!value) return;

        if (typeof value === 'string') {
            this.keywords.add(value.toLowerCase());
            return;
        }

        if (Array.isArray(value)) {
            for (const item of value) {
                this.addFromValue(item);
            }
            return;
        }

        if (typeof value === 'object') {
            if (typeof value.text === 'string') this.keywords.add(value.text.toLowerCase());
            if (typeof value.keyword === 'string') this.keywords.add(value.keyword.toLowerCase());
            if (typeof value.name === 'string') this.keywords.add(value.name.toLowerCase());

            for (const [key, child] of Object.entries(value)) {
                if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
                    this.keywords.add(key.toLowerCase());
                }
                this.addFromValue(child);
            }
        }
    }
}

module.exports = {
    KeywordLookup
};
