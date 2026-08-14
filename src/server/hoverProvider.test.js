'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { TextDocument } = require('vscode-languageserver-textdocument');
const { provideHelpHover } = require('./hoverProvider');

const extensionRoot = path.resolve(__dirname, '..', '..');

function hoverFor(source, word, occurrence = 0) {
    const document = TextDocument.create('file:///sample.MyD', 'mydfrg', 1, source);
    let offset = -1;
    for (let index = 0; index <= occurrence; index += 1) {
        offset = source.indexOf(word, offset + 1);
    }
    assert.notEqual(offset, -1, `${word} should exist in the test source`);
    return provideHelpHover(document, document.positionAt(offset + 1), { extensionRoot });
}

test('hover displays the exact contextual VolumeBoolean and FileBoolean Help', () => {
    const volumeHover = hoverFor([
        'VolumeSelect',
        '  Size(0, 100)',
        'VolumeActions',
        'VolumeEnd'
    ].join('\n'), 'Size');
    const fileHover = hoverFor([
        'VolumeSelect',
        '  All',
        'VolumeActions',
        '  FileSelect',
        '    Size(0, 100)',
        '  FileActions',
        '  FileEnd',
        'VolumeEnd'
    ].join('\n'), 'Size');

    assert.match(volumeHover.contents.value, /VolumeBoolean \\- Size/);
    assert.doesNotMatch(volumeHover.contents.value, /FileBoolean \\- Size/);
    assert.match(fileHover.contents.value, /FileBoolean \\- Size/);
    assert.doesNotMatch(fileHover.contents.value, /VolumeBoolean \\- Size/);
    assert.match(fileHover.contents.value, /Open full MyDefrag Help/);
    assert.match(fileHover.contents.value, /command:mydfrg\.openHelp\?/);
    assert.doesNotMatch(fileHover.contents.value, /file:\/\/\//);
});

test('hover uses the containing setting for an ambiguous parameter', () => {
    const hover = hoverFor('WindowSize(fixed)', 'fixed');

    assert.match(hover.contents.value, /Settings \\- WindowSize/);
    assert.doesNotMatch(hover.contents.value, /VolumeBoolean \\- Fixed/);
});

test('hover displays predefined variable descriptions and the Variables Help link', () => {
    const hover = hoverFor('SetVariable(Test, VolumeSize)', 'VolumeSize');

    assert.match(hover.contents.value, /The size of the volume/);
    assert.match(hover.contents.value, /Scripts\\Variables\.md|Scripts\/Variables\.md|Variables/);
});

test('hover recognizes the punctuation-led include directive and displays exact Help', () => {
    const source = '!include "Common.MyD"!';
    const document = TextDocument.create('file:///sample.MyD', 'mydfrg', 1, source);
    const hover = provideHelpHover(document, { line: 0, character: 0 }, { extensionRoot });

    assert.ok(hover);
    assert.deepEqual(hover.range, {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 8 }
    });
    assert.match(hover.contents.value, /\\!include PATH\\!/);
    assert.match(hover.contents.value, /contents of another file/i);
    assert.match(hover.contents.value, /!include "PATH"!/);
    assert.match(hover.contents.value, /command:mydfrg\.openHelp\?/);
});

test('hover returns null for words without a Help mapping', () => {
    assert.equal(hoverFor('NotAKeyword()', 'NotAKeyword'), null);
});
