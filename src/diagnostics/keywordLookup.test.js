'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { KeywordLookup } = require('./keywordLookup');

test('keyword lookup indexes nested language-data shapes case-insensitively', () => {
    const lookup = new KeywordLookup({
        KEYWORDS: [
            { text: 'Mounted' },
            { keyword: 'Analyze' }
        ],
        named: { name: 'SortByName' }
    });

    assert.deepEqual(lookup.lookup('mounted'), { token: 'mounted', exists: true });
    assert.deepEqual(lookup.lookup('ANALYZE'), { token: 'ANALYZE', exists: true });
    assert.deepEqual(lookup.lookup('SortByName()'), { token: 'SortByName', exists: true });
    assert.deepEqual(lookup.lookup('Unknown'), { token: 'Unknown', exists: false });
});

test('keyword lookup extracts explicit and message tokens', () => {
    const lookup = new KeywordLookup();

    assert.equal(lookup.extractToken({ keyword: 'Mounted()' }), 'Mounted');
    assert.equal(lookup.extractToken({ token: 'Analyze,' }), 'Analyze');
    assert.equal(lookup.extractToken({ message: "Expected 'VolumeEnd'" }), 'VolumeEnd');
    assert.equal(lookup.extractToken({ message: 'Unknown SortByName' }), 'SortByName');
    assert.equal(lookup.extractToken({ message: 'No identifiable value' }), null);
});

test('keyword lookup can rebuild after language data changes', () => {
    const lookup = new KeywordLookup(['Mounted']);
    assert.equal(lookup.lookup('Writable').exists, false);

    lookup.languageData = ['Writable'];
    lookup.rebuildIndex();

    assert.equal(lookup.lookup('Mounted').exists, false);
    assert.equal(lookup.lookup('Writable').exists, true);
});

test('keyword lookup carries exact language Help metadata into diagnostics', () => {
    const languageData = require('../server/languageData');
    const lookup = new KeywordLookup(languageData);
    const result = lookup.lookup('Description');

    assert.equal(result.exists, true);
    assert.deepEqual(
        result.helpDocuments.map(document => document.path),
        ['Settings/Description.md']
    );

    const variable = lookup.lookup('VolumeSize');
    assert.equal(variable.exists, true);
    assert.equal(variable.helpDocuments[0].path, 'Scripts/Variables.md');
    assert.match(variable.helpDocuments[0].description, /size of the volume/i);

    const include = lookup.lookup('!include "Common.MyD"!');
    assert.equal(include.token, 'include');
    assert.equal(include.exists, true);
    assert.equal(include.helpDocuments[0].path, 'Scripts/Macros.md');
    assert.equal(include.helpDocuments[0].title, '!include PATH!');
});

test('keyword lookup extracts punctuation-led include tokens from diagnostics', () => {
    const lookup = new KeywordLookup(require('../server/languageData'));

    assert.equal(lookup.extractToken({ message: "Unexpected token '!include'" }), 'include');
    assert.equal(lookup.extractToken({ message: 'Unknown `!include` directive' }), 'include');
});
