'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { createRange, getRelativePath, isExcluded } = require('./util');

const logger = { dbg() {} };

test('createRange returns an LSP-compatible range', () => {
    assert.deepEqual(createRange(1, 2, 3, 4), {
        start: { line: 1, character: 2 },
        end: { line: 3, character: 4 }
    });
});

test('getRelativePath uses the first matching workspace path', () => {
    assert.equal(
        getRelativePath('C:/repo/scripts/file.MyD', ['C:/other', 'C:/repo']),
        '/scripts/file.MyD'
    );
    assert.equal(getRelativePath('C:/outside/file.MyD', ['C:/repo']), 'C:/outside/file.MyD');
});

test('isExcluded matches MyDefrag, files, and search patterns and counts them', () => {
    const config = {
        mydfrgExcludes: ['**/generated/**'],
        fileExcludes: { '**/vendor/**': true },
        searchExcludes: { '**/cache/**': true },
        fileCount: 0,
        folderCount: 0,
        searchCount: 0
    };

    assert.equal(isExcluded('/generated/a.MyD', config, logger), true);
    assert.equal(isExcluded('/vendor/b.MyD', config, logger), true);
    assert.equal(isExcluded('/cache/c.MyD', config, logger), true);
    assert.equal(isExcluded('/source/d.MyD', config, logger), false);
    assert.deepEqual({
        folderCount: config.folderCount,
        fileCount: config.fileCount,
        searchCount: config.searchCount
    }, {
        folderCount: 1,
        fileCount: 1,
        searchCount: 1
    });
});
