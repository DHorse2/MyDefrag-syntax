// build/scripts/test-language-runtime.js
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
    createLanguageCatalog,
    formatText
} = require('../../src/shared/languageCatalog');

const ROOT = path.resolve(__dirname, '..', '..');

const catalog = createLanguageCatalog({
    rootDir: ROOT,
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
    'BEGIN [depth 2] file:///D:/Example/MyScript.MyD'
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

const frenchCanadianOutput = JSON.parse(fs.readFileSync(
    path.join(ROOT, 'build', 'language', 'catalogs', 'fr-CA', 'extension.json'),
    'utf8'
));
const frenchCanadianGenerated = frenchCanadianOutput.entries['extension.command.openPreview.title'];
const frenchCanadianCatalog = createLanguageCatalog({
    rootDir: ROOT,
    locale: 'fr-CA',
    components: ['extension']
});
const frenchCanadianEntry = frenchCanadianCatalog.format('extension.command.openPreview.title');
assert.strictEqual(frenchCanadianGenerated.status, 'machine-generated');
assert.strictEqual(frenchCanadianGenerated.fallbackLocale, null);
assert.notStrictEqual(frenchCanadianGenerated.text, 'Open Preview');
assert.strictEqual(frenchCanadianEntry.text, frenchCanadianGenerated.text);
assert.strictEqual(frenchCanadianEntry.locale, 'fr-CA');
assert.strictEqual(frenchCanadianEntry.fallbackLocale, null);

const fallbackFixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mydefrag-language-runtime-'));
try {
    const fixtureCatalogRoot = path.join(fallbackFixtureRoot, 'build', 'language', 'catalogs');
    fs.mkdirSync(path.join(fixtureCatalogRoot, 'en'), { recursive: true });
    fs.mkdirSync(path.join(fixtureCatalogRoot, 'fa'), { recursive: true });
    fs.writeFileSync(path.join(fixtureCatalogRoot, 'en', 'fixture.json'), JSON.stringify({
        entries: {
            'fixture.productName.text': {
                text: 'MyDefrag',
                placeholders: []
            }
        }
    }));
    fs.writeFileSync(path.join(fixtureCatalogRoot, 'fa', 'fixture.json'), JSON.stringify({
        entries: {
            'fixture.productName.text': {
                text: 'My Storage Management',
                placeholders: [],
                fallbackLocale: 'en'
            }
        }
    }));

    const fallbackCatalog = createLanguageCatalog({
        rootDir: fallbackFixtureRoot,
        locale: 'fa',
        components: ['fixture']
    });
    const fallbackEntry = fallbackCatalog.format('fixture.productName.text');

    assert.strictEqual(fallbackEntry.text, 'My Storage Management');
    assert.strictEqual(fallbackEntry.locale, 'fa');
    assert.strictEqual(fallbackEntry.fallbackLocale, 'en');
} finally {
    fs.rmSync(fallbackFixtureRoot, { recursive: true, force: true });
}

console.log('Language runtime tests passed');
