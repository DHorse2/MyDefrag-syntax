'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { iniErrors, readIni } = require('./ini');

test('readIni parses root values, sections, comments, and embedded equals', t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mydefrag-ini-'));
    const filePath = path.join(directory, 'settings.ini');
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    fs.writeFileSync(filePath, [
        '; comment',
        '# comment',
        'root=value',
        '[server]',
        'endpoint=a=b'
    ].join('\n'), 'utf8');

    const result = readIni(filePath);

    assert.equal(result.root, 'value');
    assert.deepEqual(result.server, { endpoint: 'a=b' });
});

test('readIni substitutes dictionary values', t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mydefrag-ini-'));
    const filePath = path.join(directory, 'settings.ini');
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    fs.writeFileSync(filePath, 'enabled=yes\n', 'utf8');

    const result = readIni(filePath, { yes: true });

    assert.equal(result.enabled, true);
});

test('readIni returns an empty result and records an error for a missing file', () => {
    const before = iniErrors.length;
    const result = readIni(path.join(os.tmpdir(), `missing-${Date.now()}.ini`));

    assert.equal(result.size, 0);
    assert.equal(iniErrors.length, before + 1);
    assert.match(iniErrors.at(-1), /Error Reading INI File/);
});
