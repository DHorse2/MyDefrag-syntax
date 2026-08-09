'use strict';

const Ajv = require('ajv');

function extractPlaceholders(text) {
    return Array.from(String(text || '').matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g), (match) => match[1])
        .filter((value, index, values) => values.indexOf(value) === index)
        .sort();
}

class LocaleCatalogValidator {
    constructor(state) {
        this.state = state;
        this.ajv = new Ajv({ allErrors: true, strict: false });
        for (const schema of state.schemas) { this.ajv.addSchema(schema.data, schema.name); }
        this.schema = this.ajv.getSchema('locale-component-catalog.schema.json');
    }

    validate(document) {
        const errors = [];
        if (!this.schema) {
            errors.push({ path: '/', message: 'The locale component schema is unavailable.', source: 'schema' });
        } else if (!this.schema(document)) {
            errors.push(...(this.schema.errors || []).map((error) => ({
                path: error.instancePath || '/',
                message: error.message || error.keyword,
                source: 'schema'
            })));
        }

        const localeIds = new Set((this.state.locales.locales || []).map((locale) => locale.id));
        const componentIds = new Set((this.state.components.components || []).map((component) => component.id));
        if (!localeIds.has(document.locale)) {
            errors.push({ path: '/locale', message: `Unknown locale: ${document.locale}`, source: 'cross-file' });
        }
        if (!componentIds.has(document.component)) {
            errors.push({ path: '/component', message: `Unknown component: ${document.component}`, source: 'cross-file' });
        }

        const canonicalByKey = new Map((this.state.catalog.entries || []).map((entry) => [entry.key, entry]));
        for (const [key, entry] of Object.entries(document.entries || {})) {
            const canonical = canonicalByKey.get(key);
            if (!canonical) {
                errors.push({ path: `/entries/${key}`, message: `Unknown catalog key: ${key}`, source: 'cross-file' });
                continue;
            }
            if (canonical.component !== document.component) {
                errors.push({
                    path: `/entries/${key}`,
                    message: `Catalog key belongs to component ${canonical.component}.`,
                    source: 'cross-file'
                });
            }
            const expected = [...(canonical.placeholders || [])].sort();
            const actual = extractPlaceholders(entry.text);
            if (expected.join('|') !== actual.join('|')) {
                errors.push({
                    path: `/entries/${key}/text`,
                    message: `Placeholders must be exactly: ${expected.join(', ') || '(none)'}.`,
                    source: 'placeholder'
                });
            }
        }
        return { ok: errors.length === 0, errors, warnings: [] };
    }
}

module.exports = { LocaleCatalogValidator, extractPlaceholders };
