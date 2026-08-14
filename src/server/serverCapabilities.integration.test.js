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

test('language server does not advertise client-side definition or reference providers', async (t) => {
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
        capabilities: {},
        initializationOptions: {
            locale: 'en',
            excludes: {
                mydfrgExcludes: [],
                fileExcludes: {},
                searchExcludes: {}
            },
            config: {
                source: 'Server capability integration test',
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

    assert.equal(initializeResult.capabilities.definitionProvider, undefined, stderr);
    assert.equal(initializeResult.capabilities.referencesProvider, undefined, stderr);

    connection.sendNotification('initialized', {});
    await connection.sendRequest('shutdown');
    connection.sendNotification('exit');
});
