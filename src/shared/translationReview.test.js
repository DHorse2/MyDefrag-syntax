'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
    REVIEW_DIAGNOSTIC_CODES,
    REVIEW_VIEW_DEFINITIONS,
    buildTranslationReview
} = require('./translationReview');

function fixture(files) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mydfrg-translation-review-'));
    for (const [name, content] of Object.entries(files)) {
        fs.writeFileSync(path.join(root, name), content, 'utf8');
    }
    return root;
}

function translatedFixture() {
    return fixture({
        'root.MyD': [
            '// @mydfrg-language fr-CA',
            'Sélection de volume',
            '  All',
            'Actions sur le volume',
            '  !include "child.MyDc"!',
            'Fin de volume'
        ].join('\n'),
        'child.MyDc': [
            'Sélection de fichier',
            '  All',
            'Actions sur le fichier',
            '  Défragmentation()',
            'Fin de fichier'
        ].join('\n')
    });
}

test('review view definitions expose six stable extension commands', () => {
    assert.deepEqual(
        REVIEW_VIEW_DEFINITIONS.map(view => view.id),
        ['bilingual', 'semantic', 'differences', 'terminology', 'untranslated', 'completeness']
    );
    assert.equal(
        new Set(REVIEW_VIEW_DEFINITIONS.map(view => view.command)).size,
        REVIEW_VIEW_DEFINITIONS.length
    );
});

test('bilingual, semantic, and difference views retain source locations', t => {
    const root = translatedFixture();
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const entry = path.join(root, 'root.MyD');

    const bilingual = buildTranslationReview(entry, 'fr-CA', 'bilingual');
    const semantic = buildTranslationReview(entry, 'fr-CA', 'semantic');
    const differences = buildTranslationReview(entry, 'fr-CA', 'differences');

    for (const result of [bilingual, semantic, differences]) {
        assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
        assert.match(result.text, /Target locale: fr-CA/);
        assert.match(result.text, /root\.MyD:2:1/);
        assert.match(result.text, /child\.MyDc:1:1/);
        assert.equal(result.stats.sourceFiles, 2);
    }
    assert.match(bilingual.text, /L \| Sélection de volume/);
    assert.match(bilingual.text, /C \| VolumeSelect/);
    assert.match(semantic.text, /S \| <structure\.volumeSelect>/);
    assert.match(differences.text, /- C \| VolumeSelect/);
    assert.match(differences.text, /\+ L \| Sélection de volume/);
});

test('terminology, untranslated, and completeness views use the target catalog', t => {
    const root = translatedFixture();
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const entry = path.join(root, 'root.MyD');

    const terminology = buildTranslationReview(entry, 'fr-CA', 'terminology');
    const untranslated = buildTranslationReview(entry, 'fr-CA', 'untranslated');
    const completeness = buildTranslationReview(entry, 'fr-CA', 'completeness');

    for (const result of [terminology, untranslated, completeness]) {
        assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
        assert.equal(result.stats.catalogEntries, 214);
        assert.ok(result.stats.keywordOccurrences > 0);
    }
    assert.match(
        terminology.text,
        /structure\.volumeSelect\tVolumeSelect\tSélection de volume\tmachine-generated/
    );
    assert.match(untranslated.text, /keyword\.all\tAll\tAll\tdraft\ten/);
    assert.match(completeness.text, /Visible translatable entries: 214/);
    assert.match(completeness.text, /machine-generated: 20/);
    assert.match(completeness.text, /draft: 194/);
});

test('include diagnostics remain visible in review output without changing source', t => {
    const root = fixture({
        'root.MyD': [
            '// @mydfrg-language en',
            'VolumeSelect',
            '  All',
            'VolumeActions',
            '  !include "missing.MyDc"!',
            'VolumeEnd'
        ].join('\n')
    });
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const entry = path.join(root, 'root.MyD');
    const original = fs.readFileSync(entry, 'utf8');

    const result = buildTranslationReview(entry, 'fr-CA', 'bilingual');

    assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
    assert.equal(result.diagnostics.length, 1);
    assert.match(result.text, /Diagnostics: 1/);
    assert.match(result.text, /!include "missing\.MyDc"!/);
    assert.equal(fs.readFileSync(entry, 'utf8'), original);
});

test('invalid review inputs fail with stable diagnostics', t => {
    const root = translatedFixture();
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const entry = path.join(root, 'root.MyD');

    const invalidView = buildTranslationReview(entry, 'fr-CA', 'unknown');
    const invalidLocale = buildTranslationReview(entry, 'xx-test', 'bilingual');

    assert.equal(invalidView.ok, false);
    assert.equal(invalidView.diagnostics[0].code, REVIEW_DIAGNOSTIC_CODES.invalidView);
    assert.equal(invalidLocale.ok, false);
    assert.equal(invalidLocale.diagnostics[0].code, REVIEW_DIAGNOSTIC_CODES.unsupportedLocale);
});
