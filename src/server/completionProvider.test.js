'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { TextDocument } = require('vscode-languageserver-textdocument');

const languageData = require('./languageData');
const { provideServerCompletions } = require('./completionProvider');

function document(text, languageId = 'mydfrg') {
    return TextDocument.create('file:///completion.MyD', languageId, 1, text);
}

test('server completion returns context-first keyword edits with templates', () => {
    const items = provideServerCompletions(
        document('VolumeSelect\n    Mou'),
        { line: 1, character: 7 },
        languageData
    );
    const mounted = items.find(item => item.label === 'Mounted');

    assert.ok(mounted);
    assert.equal(mounted.textEdit.newText, 'Mounted(yes)');
    assert.deepEqual(mounted.textEdit.range, {
        start: { line: 1, character: 4 },
        end: { line: 1, character: 7 }
    });
    assert.equal(items[0].data.parent, 'volume_condition');
});

test('server completion preserves typed casing and excludes internal keywords', () => {
    const items = provideServerCompletions(
        document('VolumeSelect\n    MOU'),
        { line: 1, character: 7 },
        languageData
    );

    assert.ok(items.some(item => item.label === 'MOUNTED'));
    assert.equal(items.some(item => item.label.includes('_')), false);
});

test('server completion is suppressed in comments, strings, and other languages', () => {
    assert.deepEqual(provideServerCompletions(
        document('// Mou'),
        { line: 0, character: 6 },
        languageData
    ), []);
    assert.deepEqual(provideServerCompletions(
        document('Description("Mou'),
        { line: 0, character: 16 },
        languageData
    ), []);
    assert.deepEqual(provideServerCompletions(
        document('Mou', 'plaintext'),
        { line: 0, character: 3 },
        languageData
    ), []);
});
