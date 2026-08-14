'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const paths = require('./path');

test('resolveFromProjectRoot preserves absolute paths and resolves relative paths', () => {
    const absolute = path.join(path.parse(paths.projectRoot).root, 'absolute', 'value');

    assert.equal(paths.resolveFromProjectRoot(absolute), absolute);
    assert.equal(
        paths.resolveFromProjectRoot('relative/value'),
        path.join(paths.projectRoot, 'relative/value')
    );
    assert.equal(paths.resolveFromProjectRoot('  '), '');
});

test('configurePaths creates directories and derives all file paths', t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mydefrag-paths-'));
    const userDir = path.join(directory, 'user');
    const logDir = path.join(directory, 'logs');
    t.after(() => {
        paths.configurePaths(paths.DEFAULTS);
        fs.rmSync(directory, { recursive: true, force: true });
    });

    paths.configurePaths({ userDir, logDir });
    const configured = paths.getPaths();

    assert.equal(fs.existsSync(userDir), true);
    assert.equal(fs.existsSync(logDir), true);
    assert.equal(configured.userDir, userDir);
    assert.equal(configured.logDir, logDir);
    assert.equal(configured.diagnosticsLatestFile, path.join(logDir, 'diagnostics-latest.json'));
    assert.equal(configured.client, path.join(logDir, 'client.log'));
    assert.equal(configured.serverLogFile, path.join(logDir, 'server.log'));
});
