// scripts/test-language-runtime.js
'use strict';

const assert = require('assert');
const path = require('path');
const {
    createLanguageCatalog,
    formatText
} = require('../src/shared/languageCatalog');

const rootDir = path.resolve(__dirname, '..');

const catalog = createLanguageCatalog({
    rootDir,
    locale: 'zh-Hans',
    components: [
        'extension',
        'diagnosticExplorer',
        'preview'
    ]
});

assert.strictEqual(
    catalog.format('extension.command.openPreview.title').text,
    '打开预览'
);

assert.strictEqual(
    catalog.format('preview.annotation.includeBegin.text', {
        depth: 2,
        path: 'file:///D:/Example/MyScript.MyD'
    }).text,
    'BEGIN [depth:2] file:///D:/Example/MyScript.MyD'
);

const missing = catalog.format('preview.annotation.includeBegin.text', {
    depth: 2
});
assert.deepStrictEqual(missing.missingArgs, ['path']);

const absent = catalog.format('missing.example.key');
assert.strictEqual(absent.missing, true);
assert.strictEqual(absent.text, '[missing:missing.example.key]');

const raw = formatText('Expected {expected} but found {actual}', {
    expected: ')',
    actual: 'Name'
}, [
    'expected',
    'actual'
]);
assert.strictEqual(raw.text, 'Expected ) but found Name');
assert.deepStrictEqual(raw.missingArgs, []);

console.log('Language runtime tests passed');
