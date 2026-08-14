'use strict';

const assert = require('node:assert/strict');
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

class MarkdownString {
    constructor(value) {
        this.value = value;
    }
}

const vscodeMock = {
    EventEmitter,
    MarkdownString,
    ThemeIcon,
    TreeItem,
    TreeItemCollapsibleState: {
        None: 0,
        Collapsed: 1,
        Expanded: 2
    },
    Uri: {
        file(filePath) {
            return { fsPath: filePath };
        }
    }
};

const originalLoad = Module._load;
Module._load = function mockVscode(request, parent, isMain) {
    if (request === 'vscode') return vscodeMock;
    return originalLoad.call(this, request, parent, isMain);
};

const {
    DiagnosticTreeProvider,
    VIEW_MODE_TABLE
} = require('./diagnosticTreeProvider');
Module._load = originalLoad;

function createNavigator() {
    const visibleDiagnostics = [
        diagnostic('C:\\repo\\one.MyDc', 1, 2, 1, 'Unexpected token Alpha', 'Alpha'),
        diagnostic('C:\\repo\\one.MyDc', 5, 0, 2, 'Deprecated setting', null),
        diagnostic('C:\\repo\\two.MyDc', 8, 3, 1, 'Missing value', null)
    ];

    return {
        visibleDiagnostics,
        index: 1,
        current() { return this.visibleDiagnostics[this.index] || null; },
        keyOf(item) {
            if (!item) return '';
            return `${item.filePath.toLowerCase()}|${item.line}|${item.character}|${item.message}`;
        },
        getStats() {
            return { index: this.index + 1, total: this.visibleDiagnostics.length, fileCount: 2 };
        }
    };
}

function diagnostic(filePath, line, character, severity, message, token) {
    return { filePath, line, character, severity, message, token, keywordExists: Boolean(token) };
}

test('tree mode groups diagnostics by file and exposes the current child for reveal', () => {
    const provider = new DiagnosticTreeProvider(createNavigator());
    const roots = provider.getChildren();

    assert.equal(roots.length, 2);
    assert.equal(roots[0].label, 'one.MyDc');
    assert.equal(provider.getChildren(roots[0]).length, 2);

    const current = provider.getCurrentElement();
    assert.equal(current.label, 'Deprecated setting');
    assert.equal(provider.getParent(current), roots[0]);
    assert.equal(roots[0].collapsibleState, vscodeMock.TreeItemCollapsibleState.Expanded);
});

test('table mode is flat and filter matches file, message, token, and severity', () => {
    const provider = new DiagnosticTreeProvider(createNavigator());
    provider.setViewMode(VIEW_MODE_TABLE);
    provider.setFilter('error alpha');

    const rows = provider.getChildren();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].label, 'Unexpected token Alpha');
    assert.match(rows[0].description, /one\.MyDc:2:3/);

    provider.setFilter('two.MyDc missing');
    assert.equal(provider.getChildren().length, 1);
    assert.equal(provider.getChildren()[0].label, 'Missing value');
});

test('diagnostic hover displays Help and exposes a trusted open-Help command', () => {
    const navigator = createNavigator();
    navigator.extensionRoot = require('node:path').resolve(__dirname, '..', '..');
    navigator.visibleDiagnostics[0].helpDocuments = [{
        text: 'description',
        path: 'Settings/Description.md'
    }];
    const provider = new DiagnosticTreeProvider(navigator);
    const tooltip = provider.getChildren(provider.getChildren()[0])[0].tooltip;

    assert.ok(tooltip instanceof MarkdownString);
    assert.match(tooltip.value, /Settings \\- Description/);
    assert.match(tooltip.value, /command:mydfrg\.openHelp/);
    assert.deepEqual(tooltip.isTrusted, { enabledCommands: ['mydfrg.openHelp'] });
});
