'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const Module = require('node:module');

class EventEmitter {
    constructor() {
        this.event = () => ({ dispose() {} });
    }
    fire() {}
    dispose() {}
}

class TreeItem {
    constructor(label, collapsibleState) {
        this.label = label;
        this.collapsibleState = collapsibleState;
    }
}

class ThemeIcon {
    constructor(id) {
        this.id = id;
    }
}

test('registers Problems-style Explorer toolbar commands and close behavior', async (t) => {
    const commands = new Map();
    const executed = [];
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mydfrg-diagnostic-registration-'));
    t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

    const treeView = {
        visible: true,
        description: '',
        message: '',
        dispose() {},
        onDidChangeVisibility() { return { dispose() {} }; },
        async reveal() {}
    };
    const statusBarItem = {
        dispose() {},
        show() {}
    };
    const vscodeMock = {
        EventEmitter,
        Position: class Position {},
        Range: class Range {},
        StatusBarAlignment: { Left: 1 },
        ThemeIcon,
        TreeItem,
        TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
        Uri: {
            file(filePath) { return { fsPath: filePath }; },
            parse(value) { return { fsPath: value }; }
        },
        commands: {
            registerCommand(command, handler) {
                commands.set(command, handler);
                return { dispose() {} };
            },
            async executeCommand(command, ...args) {
                executed.push([command, ...args]);
            }
        },
        env: { clipboard: { async writeText() {} } },
        languages: {
            getDiagnostics() { return []; },
            onDidChangeDiagnostics() { return { dispose() {} }; }
        },
        window: {
            createTreeView() { return treeView; },
            createStatusBarItem() { return statusBarItem; },
            async showInputBox() { return 'warning'; },
            showInformationMessage() {},
            showWarningMessage() {}
        },
        workspace: { workspaceFolders: undefined }
    };

    const originalLoad = Module._load;
    Module._load = function mockVscode(request, parent, isMain) {
        if (request === 'vscode') return vscodeMock;
        return originalLoad.call(this, request, parent, isMain);
    };

    let registerDiagnosticNavigation;
    try {
        ({ registerDiagnosticNavigation } = require('./registerDiagnosticNavigation'));
    } finally {
        Module._load = originalLoad;
    }

    const paths = require('../shared/path');
    paths.configurePaths({ userDir: tempDir, logDir: tempDir });
    const context = {
        extensionPath: path.resolve(__dirname, '..', '..'),
        subscriptions: []
    };
    const registration = registerDiagnosticNavigation(context);
    await registration.refresh();

    for (const command of [
        'mydfrg.openHelp',
        'mydfrg.diagnostics.openHelp',
        'mydfrg.diagnostics.previous',
        'mydfrg.diagnostics.next',
        'mydfrg.diagnostics.prevFile',
        'mydfrg.diagnostics.nextFile',
        'mydfrg.diagnostics.filter',
        'mydfrg.diagnostics.clearFilter',
        'mydfrg.diagnostics.showTree',
        'mydfrg.diagnostics.showTable',
        'mydfrg.diagnostics.closeView'
    ]) {
        assert.equal(typeof commands.get(command), 'function', `${command} should be registered`);
    }

    await commands.get('mydfrg.diagnostics.showTable')();
    assert.equal(registration.treeProvider.viewMode, 'table');

    await commands.get('mydfrg.diagnostics.filter')();
    assert.equal(registration.treeProvider.filterText, 'warning');

    await commands.get('mydfrg.diagnostics.closeView')();
    assert.ok(executed.some(([command]) => command === 'workbench.action.closeSidebar'));

    await commands.get('mydfrg.openHelp')('Settings/Description.md');
    assert.ok(executed.some(([command, uri]) => {
        return command === 'markdown.showPreviewToSide'
            && /Settings[\\/]Description\.md$/.test(uri.fsPath);
    }));
});
