'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');
const { getFilePathFromDocumentUri } = require('./documentUri');

test('document URI helper preserves normal file URIs', () => {
    const filePath = path.resolve(__dirname, 'sample.myd');
    assert.equal(getFilePathFromDocumentUri(pathToFileURL(filePath)), filePath);
});

test('document URI helper resolves editable preview URIs to their suggested filesystem path', () => {
    const expected = path.win32.normalize('D:\\Scripts\\sample.preview-raw.myd');
    const actual = getFilePathFromDocumentUri(
        'untitled:/D%3A/Scripts/sample.preview-raw.myd?mode=raw&instance=preview-1'
    );

    assert.equal(actual, expected);
});

test('document URI helper rejects unrelated custom schemes', () => {
    assert.throws(
        () => getFilePathFromDocumentUri('https://example.test/sample.myd'),
        /Unsupported document URI scheme/
    );
});
