'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

test('preview preprocessor returns a non-empty merged document', () => {
    const preprocessScript = path.join(__dirname, 'preprocess', 'mydefrag-preprocess.js');
    const result = spawnSync(process.execPath, [preprocessScript, __filename], {
        cwd: __dirname,
        encoding: 'utf8'
    });

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.startsWith('|'), true);
    assert.match(result.stdout, /MyDefrag Preprocessor/);
    assert.match(result.stdout, /preview preprocessor returns a non-empty merged document/);
    assert.doesNotMatch(result.stdout, /\[Preview Processor\]/);
});
