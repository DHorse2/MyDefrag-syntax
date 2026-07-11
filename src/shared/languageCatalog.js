'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_LOCALE = 'en';

/**
 * Creates a small catalog loader that works without VS Code APIs.
 *
 * @param {object} options
 * @param {string} [options.rootDir] Repository root. Defaults to the project root.
 * @param {string} [options.locale] Requested locale.
 * @param {string[]} [options.components] Component catalog names to load.
 * @param {string} [options.fallbackLocale] Fallback locale.
 * @returns {object}
 */
function createLanguageCatalog(options = {}) {
    const rootDir = options.rootDir || path.resolve(__dirname, '..', '..');
    const locale = options.locale || DEFAULT_LOCALE;
    const fallbackLocale = options.fallbackLocale || DEFAULT_LOCALE;
    const components = Array.isArray(options.components) ? options.components.slice() : [];
    const entries = new Map();
    const loadedComponents = [];

    for (const component of components) {
        loadComponent(entries, loadedComponents, rootDir, fallbackLocale, component, true);
        if (locale !== fallbackLocale) {
            loadComponent(entries, loadedComponents, rootDir, locale, component, false);
        }
    }

    return {
        locale,
        fallbackLocale,
        loadedComponents,

        /**
         * Get a catalog entry without formatting.
         *
         * @param {string} key
         * @returns {object}
         */
        get(key) {
            return entries.get(key) || {
                key,
                text: `[missing:${key}]`,
                missing: true,
                placeholders: []
            };
        },

        /**
         * Format a message key with named arguments.
         *
         * @param {string} key
         * @param {object} args
         * @returns {object}
         */
        format(key, args = {}) {
            const entry = this.get(key);
            const formatted = formatText(entry.text, args, entry.placeholders || []);
            return {
                key,
                text: formatted.text,
                missing: entry.missing === true,
                missingArgs: formatted.missingArgs,
                extraArgs: formatted.extraArgs,
                locale: entry.locale || locale,
                fallbackLocale: entry.fallbackLocale || null
            };
        }
    };
}

function loadComponent(entries, loadedComponents, rootDir, locale, component, fallback) {
    const filePath = path.join(rootDir, 'build', 'language', 'catalogs', locale, `${component}.json`);
    if (!fs.existsSync(filePath)) { return; }

    const catalog = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    loadedComponents.push({
        locale,
        component,
        fallback
    });

    for (const [key, entry] of Object.entries(catalog.entries || {})) {
        if (!fallback || !entries.has(key)) {
            entries.set(key, {
                ...entry,
                key,
                locale,
                fallbackLocale: entry.fallbackLocale || (fallback ? locale : null)
            });
        }
    }
}

/**
 * Format a text template with named placeholders.
 *
 * @param {string} text
 * @param {object} args
 * @param {string[]} declaredPlaceholders
 * @returns {{text:string,missingArgs:string[],extraArgs:string[]}}
 */
function formatText(text, args = {}, declaredPlaceholders = []) {
    const used = new Set();
    const missing = [];
    const output = String(text || '').replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (match, name) => {
        used.add(name);
        if (!Object.prototype.hasOwnProperty.call(args, name)) {
            missing.push(name);
            return match;
        }
        return String(args[name]);
    });
    const expected = new Set(declaredPlaceholders);
    const extraArgs = Object.keys(args).filter((name) => !expected.has(name) && !used.has(name)).sort();

    return {
        text: output,
        missingArgs: Array.from(new Set(missing)).sort(),
        extraArgs
    };
}

module.exports = {
    DEFAULT_LOCALE,
    createLanguageCatalog,
    formatText
};
