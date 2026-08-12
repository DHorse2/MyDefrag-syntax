'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const Module = require('node:module');

const originalLoad = Module._load;
Module._load = function mockVscode(request, parent, isMain) {
    if (request === 'vscode') {
        return {
            Uri: {
                parse(value) {
                    return { fsPath: String(value).replace(/^file:\/\/\//, '') };
                }
            }
        };
    }

    return originalLoad.call(this, request, parent, isMain);
};

const { DiagnosticNavigator } = require('./diagnosticNavigator');
Module._load = originalLoad;

test('loads file diagnostics from every VS Code language source', (t) => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mydfrg-diagnostics-'));
    t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

    const navigator = new DiagnosticNavigator({
        diagnosticsFile: path.join(tempDir, 'missing-diagnostics.json'),
        stateFile: path.join(tempDir, 'state.json'),
        diagnosticsProvider: () => [
            [
                { scheme: 'file', fsPath: 'C:\\repo\\README.md' },
                [{ severity: 0, message: 'Markdown error', range: { start: { line: 2, character: 4 } } }]
            ],
            [
                { scheme: 'file', fsPath: 'C:\\repo\\build.ps1' },
                [{ severity: 1, message: 'PowerShell warning', range: { start: { line: 5, character: 1 } } }]
            ],
            [
                { scheme: 'untitled', fsPath: 'Untitled-1' },
                [{ severity: 0, message: 'Unsaved document', range: { start: { line: 0, character: 0 } } }]
            ]
        ]
    });

    assert.deepEqual(
        navigator.allDiagnostics.map((diagnostic) => path.extname(diagnostic.filePath)).sort(),
        ['.md', '.ps1']
    );
    assert.deepEqual(
        navigator.allDiagnostics.map((diagnostic) => diagnostic.severity).sort(),
        [1, 2]
    );
    assert.equal(navigator.visibleDiagnostics.length, 2);
});

test('deduplicates the same diagnostic from the snapshot and VS Code', (t) => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mydfrg-diagnostics-'));
    const diagnosticsFile = path.join(tempDir, 'diagnostics.json');
    t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

    fs.writeFileSync(diagnosticsFile, JSON.stringify({
        diagnosticsByUri: {
            'file:///C:/repo/sample.MyDc': [{
                severity: 1,
                message: 'Duplicate error',
                range: { start: { line: 1, character: 3 } }
            }]
        }
    }));

    const navigator = new DiagnosticNavigator({
        diagnosticsFile,
        stateFile: path.join(tempDir, 'state.json'),
        diagnosticsProvider: () => [[
            { scheme: 'file', fsPath: 'C:\\repo\\sample.MyDc' },
            [{ severity: 0, message: 'Duplicate error', range: { start: { line: 1, character: 3 } } }]
        ]]
    });

    assert.equal(navigator.allDiagnostics.length, 1);
});

test('selects displayed diagnostics and navigates backward without losing character position', (t) => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mydfrg-diagnostics-'));
    t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

    const navigator = new DiagnosticNavigator({
        diagnosticsFile: path.join(tempDir, 'missing-diagnostics.json'),
        stateFile: path.join(tempDir, 'state.json'),
        diagnosticsProvider: () => [[
            { scheme: 'file', fsPath: 'C:\\repo\\sample.MyDc' },
            [
                { severity: 0, message: 'Same message', range: { start: { line: 4, character: 1 } } },
                { severity: 0, message: 'Same message', range: { start: { line: 4, character: 2 } } },
                { severity: 0, message: 'Same message', range: { start: { line: 4, character: 3 } } }
            ]
        ]]
    });

    assert.equal(navigator.visibleDiagnostics.length, 3);
    assert.equal(new Set(navigator.visibleDiagnostics.map((item) => navigator.keyOf(item))).size, 3);

    const selected = navigator.select(navigator.visibleDiagnostics[2]);
    assert.equal(selected.character, 3);
    assert.equal(navigator.previous().character, 2);
    assert.equal(navigator.previous().character, 1);
    assert.equal(navigator.previous().character, 1);
});
