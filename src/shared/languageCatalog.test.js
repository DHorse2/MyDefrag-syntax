'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { createLanguageCatalog, formatText } = require('./languageCatalog');

function writeCatalog(rootDir, locale, component, entries) {
    const directory = path.join(rootDir, 'build', 'language', 'catalogs', locale);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(
        path.join(directory, `${component}.json`),
        JSON.stringify({ entries }),
        'utf8'
    );
}

test('formatText replaces named placeholders and reports missing arguments', () => {
    const result = formatText('Found {count} items in {folder}', {
        count: 3
    }, ['count', 'folder']);

    assert.equal(result.text, 'Found 3 items in {folder}');
    assert.deepEqual(result.missingArgs, ['folder']);
    assert.deepEqual(result.extraArgs, []);
});

test('formatText reports only arguments unused by the text and declaration', () => {
    const result = formatText('Hello {name}', {
        name: 'Ada',
        declaredButUnused: 'allowed',
        unexpected: true
    }, ['name', 'declaredButUnused']);

    assert.equal(result.text, 'Hello Ada');
    assert.deepEqual(result.extraArgs, ['unexpected']);
});

test('language catalog overlays requested locale on fallback entries', t => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mydefrag-catalog-'));
    t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
    writeCatalog(rootDir, 'en', 'extension', {
        greeting: { text: 'Hello {name}', placeholders: ['name'] },
        fallbackOnly: { text: 'Fallback', placeholders: [] }
    });
    writeCatalog(rootDir, 'fr-CA', 'extension', {
        greeting: { text: 'Bonjour {name}', placeholders: ['name'] }
    });

    const catalog = createLanguageCatalog({
        rootDir,
        locale: 'fr-CA',
        fallbackLocale: 'en',
        components: ['extension']
    });

    assert.equal(catalog.format('greeting', { name: 'David' }).text, 'Bonjour David');
    assert.equal(catalog.get('greeting').locale, 'fr-CA');
    assert.equal(catalog.get('fallbackOnly').text, 'Fallback');
    assert.equal(catalog.get('fallbackOnly').locale, 'en');
    assert.deepEqual(catalog.loadedComponents, [
        { locale: 'en', component: 'extension', fallback: true },
        { locale: 'fr-CA', component: 'extension', fallback: false }
    ]);
});

test('language catalog returns a visible missing-key marker', () => {
    const catalog = createLanguageCatalog({ components: [] });

    assert.deepEqual(catalog.get('missing.key'), {
        key: 'missing.key',
        text: '[missing:missing.key]',
        missing: true,
        placeholders: []
    });
    assert.equal(catalog.format('missing.key').missing, true);
});
