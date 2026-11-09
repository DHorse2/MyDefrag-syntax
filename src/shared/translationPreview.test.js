'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { buildTranslationPreview, PREVIEW_DIAGNOSTIC_CODES } = require('./translationPreview');

function fixture(files) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mydfrg-translation-preview-'));
    for (const [name, content] of Object.entries(files)) {
        fs.writeFileSync(path.join(root, name), content, 'utf8');
    }
    return root;
}

test('canonical preview translates each file before include expansion', t => {
    const root = fixture({
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
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));

    const result = buildTranslationPreview(path.join(root, 'root.MyD'), 'en');

    assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
    assert.match(result.text, /^\/\/ @mydfrg-language en/);
    assert.match(result.text, /VolumeSelect[\s\S]*FileSelect[\s\S]*Defragment\(\)[\s\S]*VolumeEnd/);
    assert.doesNotMatch(result.text, /!include/);
    assert.equal((result.text.match(/@mydfrg-language/g) || []).length, 1);
    assert.ok(new Set(result.mappings.map(mapping => mapping.sourceUri)).size >= 2);
});

test('localized preview is rendered from validated canonical source and consumes child overrides', t => {
    const root = fixture({
        'root.MyD': [
            '// @mydfrg-language fr-CA',
            'Sélection de volume',
            '  All',
            'Actions sur le volume',
            '  !include "child.MyDc"!',
            'Fin de volume'
        ].join('\n'),
        'child.MyDc': [
            '// @mydfrg-language en',
            'FileSelect',
            '  All',
            'FileActions',
            '  Defragment()',
            'FileEnd'
        ].join('\n')
    });
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));

    const result = buildTranslationPreview(path.join(root, 'root.MyD'), 'fr-CA');

    assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
    assert.match(result.canonicalText, /^\/\/ @mydfrg-language en/);
    assert.match(result.text, /^\/\/ @mydfrg-language fr-CA/);
    assert.match(result.text, /Sélection de volume[\s\S]*Sélection de fichier/);
    assert.match(result.text, /Défragmentation\(\)/);
    assert.equal((result.text.match(/@mydfrg-language/g) || []).length, 1);
});

test('missing and circular includes remain visible with stable diagnostics', t => {
    const root = fixture({
        'root.MyD': [
            '// @mydfrg-language en',
            'VolumeSelect',
            '  All',
            'VolumeActions',
            '  !include "missing.MyDc"!',
            '  !include "cycle.MyDc"!',
            'VolumeEnd'
        ].join('\n'),
        'cycle.MyDc': '!include "cycle.MyDc"!'
    });
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));

    const result = buildTranslationPreview(path.join(root, 'root.MyD'), 'en');

    assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
    assert.doesNotMatch(result.text, /MyDefrag Translation Preview/);
    assert.match(result.text, /!include "missing\.MyDc"!/);
    assert.match(result.text, /!include "cycle\.MyDc"!/);
    assert.ok(result.diagnostics.some(item => item.code === PREVIEW_DIAGNOSTIC_CODES.includeMissing));
    assert.ok(result.diagnostics.some(item => item.code === PREVIEW_DIAGNOSTIC_CODES.includeCircular));
});

test('a child conversion failure aborts the preview without partial translated output', t => {
    const root = fixture({
        'root.MyD': [
            '// @mydfrg-language en',
            'VolumeSelect',
            '  All',
            'VolumeActions',
            '  !include "child.MyDc"!',
            'VolumeEnd'
        ].join('\n'),
        'child.MyDc': [
            '// @mydfrg-language fr',
            '// @mydfrg-language en',
            'FileSelect'
        ].join('\n')
    });
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));

    const result = buildTranslationPreview(path.join(root, 'root.MyD'), 'fr');

    assert.equal(result.ok, false);
    assert.equal(result.text, fs.readFileSync(path.join(root, 'root.MyD'), 'utf8'));
    assert.match(result.diagnostics[0].code, /directiveDuplicate/);
});
