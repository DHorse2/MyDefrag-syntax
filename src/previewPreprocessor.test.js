'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const {
    PREVIEW_MODES,
    PREVIEW_SCHEME,
    buildPreviewDocumentPath,
    buildPreviewQuery,
    createLanguageClientDocumentSelector,
    parsePreviewQuery
} = require('./preprocess/preview-options');

const preprocessScript = path.join(__dirname, 'preprocess', 'mydefrag-preprocess.js');

function createFixture() {
    const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mydfrg-preview-'));
    const entryFile = path.join(fixtureRoot, 'main.MyD');
    fs.writeFileSync(
        entryFile,
        ['RunAll()', '!include "child.MyDc"!', 'WhenFinished(Shutdown())', ''].join('\r\n'),
        'utf8'
    );
    fs.writeFileSync(
        path.join(fixtureRoot, 'child.MyDc'),
        'VolumeSelect\r\nVolumeActions\r\n',
        'utf8'
    );
    return { fixtureRoot, entryFile };
}

function runPreview(entryFile, modeId) {
    return spawnSync(
        process.execPath,
        [preprocessScript, entryFile, '--mode', modeId],
        {
            cwd: path.dirname(entryFile),
            encoding: 'utf8'
        }
    );
}

test('preview options expose the five requested variants and safe extensions', () => {
    const expectedModeIds = [
            'raw',
            'annotations',
            'annotations-file-headers',
            'annotations-line-numbers',
            'annotations-line-numbers-file-headers'
        ];
    assert.deepEqual(PREVIEW_MODES.map(mode => mode.id), expectedModeIds);
    const canonicalModes = JSON.parse(fs.readFileSync(
        path.join(__dirname, '..', 'language', 'canonical', 'preview-modes.json'),
        'utf8'
    ));
    assert.deepEqual(canonicalModes.modes.map(mode => mode.id), expectedModeIds);
    assert.equal(buildPreviewDocumentPath('C:/jobs/main.MyD', 'raw').endsWith('.myd'), true);
    assert.equal(
        buildPreviewDocumentPath('C:/jobs/main.MyD', 'annotations').endsWith('.mydd'),
        true
    );
    assert.equal(
        buildPreviewDocumentPath('C:/jobs/fragment.MyDc', 'annotations').endsWith('.mydcd'),
        true
    );
});

test('raw preview is executable merged source without generated annotations', t => {
    const { fixtureRoot, entryFile } = createFixture();
    t.after(() => fs.rmSync(fixtureRoot, { recursive: true, force: true }));

    const result = runPreview(entryFile, 'raw');

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^RunAll\(\)/);
    assert.match(result.stdout, /VolumeSelect/);
    assert.match(result.stdout, /WhenFinished\(Shutdown\(\)\)/);
    assert.doesNotMatch(result.stdout, /!include/);
    assert.doesNotMatch(result.stdout, /MyDefrag Preprocessor|BEGIN|>>>|<outLine>/);
});

test('annotation variants independently control line numbers and file headers', t => {
    const { fixtureRoot, entryFile } = createFixture();
    t.after(() => fs.rmSync(fixtureRoot, { recursive: true, force: true }));

    const annotations = runPreview(entryFile, 'annotations');
    const headers = runPreview(entryFile, 'annotations-file-headers');
    const numbers = runPreview(entryFile, 'annotations-line-numbers');
    const all = runPreview(entryFile, 'annotations-line-numbers-file-headers');

    for (const result of [annotations, headers, numbers, all]) {
        assert.equal(result.status, 0, result.stderr);
        assert.match(result.stdout, /MyDefrag Preprocessor/);
        assert.match(result.stdout, /BEGIN \[depth:1\]/);
    }

    assert.doesNotMatch(annotations.stdout, /<outLine>/);
    assert.doesNotMatch(annotations.stdout, />>> FILE/);
    assert.match(headers.stdout, />>> FILE \[depth:0\]/);
    assert.doesNotMatch(headers.stdout, /<outLine>/);
    assert.match(numbers.stdout, /<outLine>/);
    assert.match(numbers.stdout, /^\|\s*1\s+\|\s*1\s+RunAll\(\)/m);
    assert.doesNotMatch(numbers.stdout, /FILE \[depth:0\]/);
    assert.match(all.stdout, /<outLine>/);
    assert.match(all.stdout, /FILE \[depth:0\]/);
});

test('raw previews are selected for language-server validation', () => {
    assert.equal(PREVIEW_SCHEME, 'untitled');
    assert.deepEqual(createLanguageClientDocumentSelector(), [
        { scheme: 'file', language: 'mydfrg' },
        { scheme: 'untitled', language: 'mydfrg' }
    ]);

    const query = buildPreviewQuery('file:///C:/jobs/main.myd', 'raw', 'preview-1');
    assert.deepEqual(parsePreviewQuery(query), {
        source: 'file:///C:/jobs/main.myd',
        modeId: 'raw'
    });
    assert.equal(new URLSearchParams(query).get('instance'), 'preview-1');
});
