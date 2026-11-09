'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const {
    DIAGNOSTIC_CODES,
    loadTranslationIndex,
    translateSource
} = require('./sourceTranslation');

const rootDir = path.resolve(__dirname, '..', '..');
const index = loadTranslationIndex({ rootDir });

test('runtime keyword maps cover all 243 entries in all 18 locales', () => {
    assert.deepEqual(index.errors, []);
    assert.equal(index.locales.size, 18);
    for (const locale of index.locales.values()) {
        assert.equal(Object.keys(locale.canonicalToLocale).length, 243);
        assert.equal(Object.keys(locale.localeToCanonical).length, 243);
        assert.equal(
            Object.values(locale.canonicalToLocale).filter(entry => entry.translatable && entry.visible).length,
            214
        );
    }
});

test('localized source converts through canonical English without touching protected text', () => {
    const source = [
        '// @mydfrg-language fr-CA',
        'Sélection de volume',
        '  Nom("Nom Actions sur le volume")',
        '  // Nom and Sélection de volume stay in a comment',
        '  !include "Nom.MyD"!',
        '  C:\\Scripts\\Nom.MyD',
        'Actions sur le volume',
        '  Définir la valeur modifiable(Nom, "Nom")',
        'Fin de volume'
    ].join('\r\n');
    const result = translateSource(source, {
        index,
        targetLocale: 'en',
        sourceUri: 'file:///sample.MyD'
    });

    assert.equal(result.ok, true);
    assert.match(result.text, /^\/\/ @mydfrg-language en\r\nVolumeSelect\r\n/);
    assert.match(result.text, /Name\("Nom Actions sur le volume"\)/);
    assert.match(result.text, /\/\/ Nom and Sélection de volume stay in a comment/);
    assert.match(result.text, /!include "Nom\.MyD"!/);
    assert.match(result.text, /C:\\Scripts\\Nom\.MyD/);
    assert.match(result.text, /SetVariable\(Nom, "Nom"\)/);
    assert.match(result.text, /VolumeEnd$/);
    assert.ok(result.mappings.every(mapping => mapping.sourceUri === 'file:///sample.MyD'));
    assert.ok(result.mappings.some(mapping => mapping.kind === 'directive'));
    assert.ok(result.mappings.some(mapping => mapping.canonical === 'VolumeSelect'));
});

test('matching is NFC-normalized, case-insensitive, longest-first, and boundary-aware', () => {
    const decomposed = 'Se\u0301lection de volume';
    const result = translateSource([
        '// @mydfrg-language fr-CA',
        decomposed.toLocaleUpperCase('fr-CA'),
        'PréSélection de volumeSuffix'
    ].join('\n'), { index, targetLocale: 'en' });

    assert.equal(result.ok, true);
    assert.match(result.text, /\nVolumeSelect\n/);
    assert.match(result.text, /PréSélection de volumeSuffix/);
});

test('conversion is lexically round-trip stable for translated and fallback entries', () => {
    const localized = [
        '// @mydfrg-language fr-CA',
        'Sélection de volume',
        '  Mounted(Yes)',
        'Actions sur le volume',
        'Fin de volume'
    ].join('\n');
    const canonical = translateSource(localized, { index, targetLocale: 'en' });
    const restored = translateSource(canonical.text, { index, targetLocale: 'fr-CA' });

    assert.equal(canonical.ok, true);
    assert.equal(restored.ok, true);
    assert.equal(restored.text, localized);
});

test('all 214 source-visible keywords round-trip through canonical English for every locale', () => {
    for (const [localeId, locale] of index.locales) {
        const spellings = Object.entries(locale.localeToCanonical)
            .filter(([, entry]) => entry.translatable && entry.visible)
            .map(([spelling]) => spelling);
        assert.equal(spellings.length, 214, localeId);
        const source = `// @mydfrg-language ${localeId}\n${spellings.join('\n')}`;
        const canonical = translateSource(source, { index, targetLocale: 'en' });
        const restored = translateSource(canonical.text, { index, targetLocale: localeId });

        assert.equal(canonical.ok, true, localeId);
        assert.equal(restored.ok, true, localeId);
        assert.equal(restored.text, source, localeId);
    }
});

test('internal grammar labels remain present but are never translated', () => {
    const result = translateSource([
        '// @mydfrg-language fr-CA',
        'volume_block'
    ].join('\n'), { index, targetLocale: 'en' });

    assert.equal(result.ok, true);
    assert.match(result.text, /volume_block$/);
    assert.equal(result.stats.replacements, 0);
});

test('directive failures are atomic and return the original source', () => {
    const cases = [
        ['VolumeSelect', DIAGNOSTIC_CODES.directiveMissing],
        ['; @mydfrg-language en\nVolumeSelect', DIAGNOSTIC_CODES.directiveInvalid],
        ['// @mydfrg-language xx\nVolumeSelect', DIAGNOSTIC_CODES.directiveLocale],
        ['// @mydfrg-language en\n// @mydfrg-language fr\nVolumeSelect', DIAGNOSTIC_CODES.directiveDuplicate]
    ];

    for (const [source, code] of cases) {
        const result = translateSource(source, { index, targetLocale: 'fr' });
        assert.equal(result.ok, false);
        assert.equal(result.text, source);
        assert.equal(result.diagnostics[0].code, code);
        assert.deepEqual(result.mappings, []);
    }
});

test('malformed runtime maps fail atomically', () => {
    const source = '// @mydfrg-language en\nVolumeSelect';
    const result = translateSource(source, {
        index: { errors: ['fr: expected exactly 243 entries'], locales: new Map(), localeRegistry: [] },
        targetLocale: 'fr'
    });

    assert.equal(result.ok, false);
    assert.equal(result.text, source);
    assert.equal(result.diagnostics[0].code, DIAGNOSTIC_CODES.malformedMap);
});

test('an included file may inherit its locale and consume a local override directive', () => {
    const inherited = translateSource('Sélection de volume\nFin de volume', {
        index,
        inheritedLocale: 'fr-CA',
        targetLocale: 'en',
        directiveMode: 'consume'
    });
    const override = translateSource('// @mydfrg-language fr-CA\nSélection de volume', {
        index,
        inheritedLocale: 'en',
        targetLocale: 'en',
        directiveMode: 'consume'
    });

    assert.equal(inherited.ok, true);
    assert.equal(inherited.text, 'VolumeSelect\nVolumeEnd');
    assert.equal(override.ok, true);
    assert.equal(override.text, 'VolumeSelect');
});
