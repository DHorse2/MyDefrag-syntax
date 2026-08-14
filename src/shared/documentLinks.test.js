'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const {
    buildOpenFileCommandArguments,
    hasDocumentLinkRange,
    resolveDocumentLinkPath
} = require('./documentLinks');

test('relative document links resolve from the source document folder', () => {
    const documentFileName = path.join('D:\\', 'scripts', 'parent', 'main.MyD');
    const referencedPath = path.join('fragments', 'child.MyD');

    assert.equal(
        resolveDocumentLinkPath(documentFileName, referencedPath),
        path.join('D:\\', 'scripts', 'parent', 'fragments', 'child.MyD')
    );
});

test('document-link range detection deduplicates links across provider categories', () => {
    const range = {
        start: { line: 4, character: 12 },
        end: { line: 4, character: 30 }
    };
    const links = [{ range, target: 'first-target' }];

    assert.equal(hasDocumentLinkRange(links, {
        start: { line: 4, character: 12 },
        end: { line: 4, character: 30 }
    }), true);
    assert.equal(hasDocumentLinkRange(links, {
        start: { line: 4, character: 13 },
        end: { line: 4, character: 30 }
    }), false);
});

test('open-file command arguments contain only the expected scalar values', () => {
    assert.deepEqual(
        buildOpenFileCommandArguments('D:\\scripts\\child.MyD', 6, 8),
        { path: 'D:\\scripts\\child.MyD', line: 6, col: 8 }
    );
    assert.throws(
        () => buildOpenFileCommandArguments({ fsPath: 'D:\\scripts\\child.MyD' }, 6, 8),
        /filePath must be a non-empty string/
    );
    assert.throws(
        () => buildOpenFileCommandArguments('D:\\scripts\\child.MyD', 6, { character: 8 }),
        /line and col must be non-negative integers/
    );
});
