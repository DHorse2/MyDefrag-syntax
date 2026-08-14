'use strict';

const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');
const {
    createMessageConnection,
    StreamMessageReader,
    StreamMessageWriter
} = require('vscode-jsonrpc/node');

test('language server returns converted Help from a live LSP hover request', async (t) => {
    const projectRoot = path.resolve(__dirname, '..', '..');
    const server = spawn(process.execPath, [path.join(__dirname, 'server.js'), '--stdio'], {
        cwd: projectRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true
    });
    let stderr = '';
    server.stderr.setEncoding('utf8');
    server.stderr.on('data', chunk => { stderr += chunk; });

    const connection = createMessageConnection(
        new StreamMessageReader(server.stdout),
        new StreamMessageWriter(server.stdin)
    );
    connection.onRequest('workspace/workspaceFolders', () => []);
    connection.onRequest('client/registerCapability', () => null);
    connection.onNotification('window/logMessage', () => {});
    connection.listen();

    t.after(() => {
        connection.dispose();
        if (!server.killed) server.kill();
    });

    const initializeResult = await connection.sendRequest('initialize', {
        processId: process.pid,
        rootUri: null,
        capabilities: {
            workspace: { workspaceFolders: true },
            textDocument: { hover: { contentFormat: ['markdown'] } }
        },
        initializationOptions: {
            locale: 'en',
            excludes: {
                mydfrgExcludes: [],
                fileExcludes: {},
                searchExcludes: {}
            },
            config: {
                source: 'Server integration test',
                iniData: {},
                isDebugOn: false,
                verboseLevel: 0,
                isLogOn: false,
                referenceRelativePathLevel: 2,
                referenceContainsMacrosLevel: 3,
                referenceFileFoundLevel: 3,
                referenceFileNotFoundLevel: 1,
                fragmentParentLevel: 4,
                iniErrors: []
            }
        }
    });

    assert.equal(initializeResult.capabilities.hoverProvider, true, stderr);
    connection.sendNotification('initialized', {});
    connection.sendNotification('textDocument/didOpen', {
        textDocument: {
            uri: 'file:///hover-integration.MyD',
            languageId: 'mydfrg',
            version: 1,
            text: 'VolumeSelect\n  Size(0, 100)\nVolumeActions\nVolumeEnd'
        }
    });

    const hover = await connection.sendRequest('textDocument/hover', {
        textDocument: { uri: 'file:///hover-integration.MyD' },
        position: { line: 1, character: 3 }
    });

    assert.equal(hover.contents.kind, 'markdown', stderr);
    assert.match(hover.contents.value, /VolumeBoolean \\- Size/);
    assert.match(hover.contents.value, /Open full MyDefrag Help/);
    assert.match(hover.contents.value, /command:mydfrg\.openHelp\?/);
    assert.doesNotMatch(hover.contents.value, /file:\/\/\//);

    connection.sendNotification('textDocument/didOpen', {
        textDocument: {
            uri: 'file:///include-hover-integration.MyD',
            languageId: 'mydfrg',
            version: 1,
            text: '!include "Common.MyD"!'
        }
    });
    const includeHover = await connection.sendRequest('textDocument/hover', {
        textDocument: { uri: 'file:///include-hover-integration.MyD' },
        position: { line: 0, character: 0 }
    });

    assert.match(includeHover.contents.value, /\\!include PATH\\!/);
    assert.match(includeHover.contents.value, /Scripts%2FMacros\.md/);

    connection.sendNotification('workspace/didChangeConfiguration', {
        settings: {
            mydfrg: { hoverEnabled: false },
            files: { exclude: {} },
            search: { exclude: {} }
        }
    });
    const disabledHover = await connection.sendRequest('textDocument/hover', {
        textDocument: { uri: 'file:///include-hover-integration.MyD' },
        position: { line: 0, character: 0 }
    });

    assert.equal(disabledHover, null);

    await connection.sendRequest('shutdown');
    connection.sendNotification('exit');
});
