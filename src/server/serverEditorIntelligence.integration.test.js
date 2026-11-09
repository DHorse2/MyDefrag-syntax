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
const { DIAGNOSTIC_CODES, FIX_ALL_KIND } = require('./sourceLanguageDirective');

test('live server owns standard completion and source-language code actions', async (t) => {
    const projectRoot = path.resolve(__dirname, '..', '..');
    const server = spawn(process.execPath, [path.join(__dirname, 'server.js'), '--stdio'], {
        cwd: projectRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true
    });
    const serverExit = new Promise(resolve => server.once('exit', resolve));
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
        if (server.exitCode === null && !server.killed) server.kill();
    });

    const initializeResult = await connection.sendRequest('initialize', {
        processId: process.pid,
        rootUri: null,
        capabilities: {
            textDocument: {
                completion: {},
                codeAction: {
                    codeActionLiteralSupport: {
                        codeActionKind: { valueSet: ['quickfix', 'source.fixAll'] }
                    }
                }
            }
        },
        initializationOptions: {
            locale: 'en',
            excludes: {
                mydfrgExcludes: [],
                fileExcludes: {},
                searchExcludes: {}
            }
        }
    });

    assert.deepEqual(
        initializeResult.capabilities.completionProvider,
        { resolveProvider: false },
        stderr
    );
    assert.deepEqual(
        initializeResult.capabilities.codeActionProvider.codeActionKinds,
        ['quickfix', FIX_ALL_KIND],
        stderr
    );
    connection.sendNotification('initialized', {});

    const actionUri = 'untitled:/D%3A/Preview/editor-intelligence.preview-raw.myd?mode=raw';
    const observedDiagnostics = [];
    const diagnosticsPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(
            () => reject(new Error(
                `Timed out waiting for source-language diagnostics.\n` +
                `${JSON.stringify(observedDiagnostics)}\n${stderr}`
            )),
            5000
        );
        connection.onNotification('textDocument/publishDiagnostics', params => {
            observedDiagnostics.push(params);
            if (params.uri !== actionUri) return;
            const diagnostic = params.diagnostics.find(
                item => item.code === DIAGNOSTIC_CODES.missing
            );
            if (!diagnostic) return;
            clearTimeout(timeout);
            resolve(diagnostic);
        });
    });
    connection.sendNotification('textDocument/didOpen', {
        textDocument: {
            uri: actionUri,
            languageId: 'mydfrg',
            version: 1,
            text: 'ThisIsNotAValidMyDefragStatement()'
        }
    });
    const missingDiagnostic = await diagnosticsPromise;

    const actions = await connection.sendRequest('textDocument/codeAction', {
        textDocument: { uri: actionUri },
        range: missingDiagnostic.range,
        context: {
            diagnostics: [missingDiagnostic],
            only: ['quickfix']
        }
    });

    assert.equal(actions.length, 1, stderr);
    assert.equal(actions[0].kind, 'quickfix');
    assert.deepEqual(Object.keys(actions[0].edit.changes), [actionUri]);
    assert.equal(
        actions[0].edit.changes[actionUri][0].newText,
        '// @mydfrg-language en\n'
    );

    connection.sendNotification('textDocument/didChange', {
        textDocument: { uri: actionUri, version: 2 },
        contentChanges: [{
            text: '// @mydfrg-language en\nVolumeSelect\n    Mou'
        }]
    });
    const completionItems = await connection.sendRequest('textDocument/completion', {
        textDocument: { uri: actionUri },
        position: { line: 2, character: 7 }
    });
    const mounted = completionItems.find(item => item.label === 'Mounted');
    assert.ok(mounted, `Mounted completion was not returned.\n${stderr}`);
    assert.deepEqual(mounted.textEdit.range, {
        start: { line: 2, character: 4 },
        end: { line: 2, character: 7 }
    });
    assert.equal(mounted.textEdit.newText, 'Mounted(yes)');

    await connection.sendRequest('shutdown');
    connection.sendNotification('exit');
    await serverExit;
    assert.doesNotMatch(stderr, /Unexpected error initializing server/, stderr);
});
