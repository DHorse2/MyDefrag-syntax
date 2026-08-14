'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
    HELP_DOCUMENTS,
    KEYWORDS,
    KEYWORDS_MAP,
    KEYWORDS_BY_PARENT,
    KEYWORDS_SETTINGS,
    KEYWORDS_SETTINGS_SET,
    PREDEFINED_IDENT,
    isPredefinedIdentifier,
    getKeywordHelpDocuments,
    kwGetGroup,
    kwParentExists
} = require('./languageData');

test('keyword lookup structures reference the canonical keyword objects', () => {
    assert.ok(KEYWORDS.length > 100);
    const description = KEYWORDS_MAP.get('description');

    assert.equal(description.text, 'description');
    assert.ok(KEYWORDS.includes(description));
    assert.ok(KEYWORDS_BY_PARENT.get(description.parent).includes(description));
});

test('kwGetGroup returns keywords belonging to the requested parent', () => {
    const group = kwGetGroup('volume_condition');

    assert.ok(Array.isArray(group));
    assert.ok(group.length > 0);
    assert.ok(group.every(keyword => keyword.parent === 'volume_condition'));
});

test('kwParentExists reports existing and missing parents', () => {
    assert.equal(kwParentExists('volume_condition'), true);
    assert.equal(kwParentExists('not-a-real-parent'), false);
});

test('setting array and set remain synchronized', () => {
    assert.equal(KEYWORDS_SETTINGS_SET.size, new Set(KEYWORDS_SETTINGS).size);
    for (const setting of KEYWORDS_SETTINGS) {
        assert.equal(KEYWORDS_SETTINGS_SET.has(setting), true);
        assert.equal(setting, setting.toLowerCase());
    }
});

test('predefined identifiers are found case-insensitively', () => {
    const canonical = PREDEFINED_IDENT.find(item => item.text === 'VolumeSize');

    assert.equal(isPredefinedIdentifier('VolumeSize'), canonical);
    assert.equal(isPredefinedIdentifier('volumesize'), canonical);
    assert.equal(isPredefinedIdentifier('VOLUMESIZE'), canonical);
    assert.equal(isPredefinedIdentifier('notDefined'), null);
});

test('Help mappings match the TextMate metadata and resolve to packaged source files', () => {
    const grammar = JSON.parse(fs.readFileSync(
        path.resolve(__dirname, '..', '..', 'syntaxes', 'mydfrg.tmLanguage.json'),
        'utf8'
    ));
    const { root, ...grammarDocuments } = grammar.documentation;

    assert.equal(root, 'docs/MyDefrag Help/language');
    assert.deepEqual(grammarDocuments, JSON.parse(JSON.stringify(HELP_DOCUMENTS)));

    for (const documents of Object.values(HELP_DOCUMENTS)) {
        for (const helpPath of Object.values(documents)) {
            assert.equal(
                fs.existsSync(path.resolve(__dirname, '..', '..', root, ...helpPath.split('/'))),
                true,
                helpPath
            );
        }
    }
});

test('Help lookup disambiguates contextual keywords and annotates language entries', () => {
    assert.deepEqual(
        getKeywordHelpDocuments('Size', 'volume_condition').map(document => document.path),
        ['VolumeBoolean/Size.md']
    );
    assert.deepEqual(
        getKeywordHelpDocuments('Size', 'fileBoolean').map(document => document.path),
        ['FileBoolean/Size.md']
    );
    assert.deepEqual(
        getKeywordHelpDocuments('fixed', 'window_state').map(document => document.path),
        ['Settings/WindowSize.md']
    );
    const includeHelp = getKeywordHelpDocuments('include');
    assert.deepEqual(includeHelp.map(document => document.path), ['Scripts/Macros.md']);
    assert.equal(includeHelp[0].title, '!include PATH!');
    assert.equal(includeHelp[0].syntax, '!include "PATH"!');
    assert.match(includeHelp[0].description, /contents of another file/i);
    assert.ok(KEYWORDS_MAP.get('include').help.includes('Scripts/Macros.md'));
    assert.ok(KEYWORDS_MAP.get('description').help.includes('Settings/Description.md'));
    assert.deepEqual(isPredefinedIdentifier('VolumeSize').help, ['Scripts/Variables.md']);
});
