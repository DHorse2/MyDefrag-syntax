'use strict';

const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const { normalizeText, validateSubstitutions } = require('../../language/translation/text-normalizer');

const substitutions = JSON.parse(fs.readFileSync(
    path.resolve(__dirname, '..', '..', '..', 'language', 'canonical', 'normalized-words.json'),
    'utf8'
));

test('normalizes identifiers, structural punctuation, and canonical word substitutions', () => {
    assert.equal(
        normalizeText('server.js:connection.onInitialize: SERVER loading configuration', substitutions),
        'server JavaScript connection on Initialize: SERVER loading configuration'
    );
    assert.equal(
        normalizeText('MyDefrag-script_name·file', substitutions),
        'My Defragmenter script name file'
    );
});

test('preserves human punctuation and placeholders while splitting generated tokens', () => {
    assert.equal(
        normalizeText('load_{fileName}, then parseXML2Value: ready', substitutions),
        'load {fileName}, then parse XML 2 Value: ready'
    );
    assert.equal(normalizeText('first,second; third: fourth', substitutions), 'first second; third: fourth');
    assert.equal(normalizeText('one/two path\\name', substitutions), 'one/two path\\name');
});

test('matches substitutions case-insensitively and protects their output', () => {
    assert.equal(normalizeText('JS mydefrag', substitutions), 'JavaScript My Defragmenter');
    assert.equal(normalizeText('js', [{ input: 'js', output: 'JavaScript' }]), 'JavaScript');
});

test('preserves JavaScript template interpolation by default', () => {
    const source = 'searchWorkspace: Unable to read ${uri.toString()}: ${errResult.message}.';
    assert.equal(
        normalizeText(source, substitutions),
        'search Workspace: Unable to read ${uri.toString()}: ${errResult.message}.'
    );
    assert.equal(
        normalizeText('Result ${formatValue({myKey: "MyDefrag"})} from loadFile', substitutions),
        'Result ${formatValue({myKey: "MyDefrag"})} from load File'
    );
});

test('can normalize inside JavaScript template interpolation when explicitly enabled', () => {
    const source = 'searchWorkspace: Unable to read ${uri.toString()}: ${errResult.message}.';
    assert.equal(
        normalizeText(source, substitutions, { preserveTemplateExpressions: false }),
        'search Workspace: Unable to read ${uri to String()}: ${err Result message}.'
    );
    assert.equal(normalizeText('${errResult.message}', substitutions, false), '${err Result message}');
});

test('lossless mode preserves runtime syntax while normalizing surrounding text', () => {
    const source = '$(check) MyDefrag {index}/{total} (.MyDc / .MyD) https://example.com/a-b.js ${uri.toString()}';
    assert.equal(
        normalizeText(source, substitutions, { preserveRuntimeSyntax: true }),
        '$(check) My Defragmenter {index}/{total} (.MyDc / .MyD) https://example.com/a-b.js ${uri.toString()}'
    );
});

test('validates the simple input and output substitution contract', () => {
    assert.deepEqual(validateSubstitutions(substitutions), []);
    assert.ok(validateSubstitutions([
        { input: 'js', output: 'JavaScript' },
        { input: 'JS', output: 'ECMAScript', note: 'duplicate' }
    ]).some((error) => /duplicates input JS/.test(error)));
});
