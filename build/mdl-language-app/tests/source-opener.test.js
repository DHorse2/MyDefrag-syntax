'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { openSourceAtLine } = require('../main/source-opener');

test('opens a source location with a discovered line-aware editor', async () => {
    let invocation;
    let unrefCount = 0;
    const result = await openSourceAtLine(
        { openPath: async () => { throw new Error('fallback should not run'); } },
        {
            absolutePath: 'D:\\Repo\\src\\parser.js',
            relativePath: 'src/parser.js',
            line: 42
        },
        {
            editorPaths: ['C:\\Program Files\\VSCodium\\VSCodium.exe'],
            fileSystem: { existsSync: () => true },
            spawnProcess: (executable, args, options) => {
                invocation = { executable, args, options };
                return { unref: () => { unrefCount += 1; } };
            }
        }
    );

    assert.equal(result.ok, true);
    assert.equal(result.mode, 'line');
    assert.equal(unrefCount, 1);
    assert.equal(invocation.executable, 'C:\\Program Files\\VSCodium\\VSCodium.exe');
    assert.deepEqual(invocation.args, [
        '--reuse-window',
        '--goto',
        'D:\\Repo\\src\\parser.js:42:1'
    ]);
    assert.equal(invocation.options.detached, true);
});

test('falls back to the default file application when no line-aware editor exists', async () => {
    let openedPath;
    const result = await openSourceAtLine(
        { openPath: async (filePath) => { openedPath = filePath; return ''; } },
        {
            absolutePath: 'D:\\Repo\\src\\parser.js',
            relativePath: 'src/parser.js',
            line: 42
        },
        {
            editorPaths: ['C:\\Missing\\Editor.exe'],
            fileSystem: { existsSync: () => false }
        }
    );

    assert.equal(result.ok, true);
    assert.equal(result.mode, 'file');
    assert.equal(openedPath, 'D:\\Repo\\src\\parser.js');
    assert.match(result.message, /default application/);
});

test('reports a default file opener failure', async () => {
    const result = await openSourceAtLine(
        { openPath: async () => 'No associated application' },
        {
            absolutePath: 'D:\\Repo\\src\\parser.unknown',
            relativePath: 'src/parser.unknown',
            line: 42
        },
        {
            editorPaths: [],
            fileSystem: { existsSync: () => false }
        }
    );

    assert.equal(result.ok, false);
    assert.match(result.error, /No associated application/);
});
