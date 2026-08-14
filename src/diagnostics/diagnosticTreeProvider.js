'use strict';

const path = require('path');
const vscode = require('vscode');
const {
    createHelpCommandTrust,
    createHelpCommandUri,
    renderHelpMarkdown
} = require('../shared/helpDocumentation');

const VIEW_MODE_TREE = 'tree';
const VIEW_MODE_TABLE = 'table';

/**
 * Problems-style diagnostic data provider with grouped tree and flat table modes.
 */
class DiagnosticTreeProvider {
    /**
     * @param {import('./diagnosticNavigator').DiagnosticNavigator} navigator
     */
    constructor(navigator) {
        this.navigator = navigator;
        this.viewMode = VIEW_MODE_TREE;
        this.filterText = '';
        this.roots = [];
        this.children = new Map();
        this.parents = new Map();
        this.itemByDiagnosticKey = new Map();
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.rebuild();
    }

    dispose() {
        this._onDidChangeTreeData.dispose();
    }

    refresh() {
        this.rebuild();
        this._onDidChangeTreeData.fire(undefined);
    }

    /**
     * @param {'tree'|'table'} viewMode
     */
    setViewMode(viewMode) {
        if (viewMode !== VIEW_MODE_TREE && viewMode !== VIEW_MODE_TABLE) return;
        this.viewMode = viewMode;
        this.refresh();
    }

    /**
     * @param {string} filterText
     */
    setFilter(filterText) {
        this.filterText = String(filterText || '').trim();
        this.refresh();
    }

    /**
     * @returns {boolean}
     */
    hasFilter() {
        return this.filterText.length > 0;
    }

    /**
     * @returns {number}
     */
    getVisibleCount() {
        return this.itemByDiagnosticKey.size;
    }

    /**
     * @returns {DiagnosticTreeItem|null}
     */
    getCurrentElement() {
        const current = this.navigator.current();
        if (!current) return null;
        return this.itemByDiagnosticKey.get(this.navigator.keyOf(current)) || null;
    }

    /**
     * @param {DiagnosticTreeItem} element
     * @returns {DiagnosticTreeItem}
     */
    getTreeItem(element) {
        return element;
    }

    /**
     * @param {DiagnosticTreeItem|undefined} element
     * @returns {DiagnosticTreeItem[]}
     */
    getChildren(element) {
        if (!element) return this.roots;
        return this.children.get(element) || [];
    }

    /**
     * Required so TreeView.reveal can locate nested diagnostics.
     *
     * @param {DiagnosticTreeItem} element
     * @returns {DiagnosticTreeItem|undefined}
     */
    getParent(element) {
        return this.parents.get(element);
    }

    rebuild() {
        const diagnostics = (this.navigator.visibleDiagnostics || []).filter((diagnostic) => {
            return matchesFilter(diagnostic, this.filterText);
        });
        const currentKey = this.navigator.keyOf(this.navigator.current());

        this.roots = [];
        this.children.clear();
        this.parents.clear();
        this.itemByDiagnosticKey.clear();

        if (this.viewMode === VIEW_MODE_TABLE) {
            this.roots = diagnostics.map((diagnostic) => this.createDiagnosticItem(diagnostic, currentKey, true));
            return;
        }

        const groups = new Map();
        for (const diagnostic of diagnostics) {
            const fileKey = normalizePath(diagnostic.filePath);
            let group = groups.get(fileKey);

            if (!group) {
                group = {
                    filePath: diagnostic.filePath,
                    diagnostics: []
                };
                groups.set(fileKey, group);
            }

            group.diagnostics.push(diagnostic);
        }

        for (const [fileKey, group] of groups) {
            const containsCurrent = group.diagnostics.some((diagnostic) => {
                return this.navigator.keyOf(diagnostic) === currentKey;
            });
            const fileItem = createFileItem(group.filePath, group.diagnostics.length, containsCurrent, fileKey);
            const diagnosticItems = group.diagnostics.map((diagnostic) => {
                const item = this.createDiagnosticItem(diagnostic, currentKey, false);
                this.parents.set(item, fileItem);
                return item;
            });

            this.roots.push(fileItem);
            this.children.set(fileItem, diagnosticItems);
        }
    }

    /**
     * @param {object} diagnostic
     * @param {string} currentKey
     * @param {boolean} includeFile
     * @returns {DiagnosticTreeItem}
     */
    createDiagnosticItem(diagnostic, currentKey, includeFile) {
        const key = this.navigator.keyOf(diagnostic);
        const severity = severityLabel(diagnostic.severity);
        const location = `${diagnostic.line + 1}:${diagnostic.character + 1}`;
        const item = new DiagnosticTreeItem(
            diagnostic.message || '(No diagnostic message)',
            vscode.TreeItemCollapsibleState.None
        );

        item.id = `diagnostic:${key}`;
        item.contextValue = 'mydfrgDiagnostic';
        item.diagnostic = diagnostic;
        item.description = includeFile
            ? `${severity}  ${path.basename(diagnostic.filePath)}:${location}`
            : `${severity}  ${location}`;
        item.tooltip = diagnosticTooltip(diagnostic, this.navigator.extensionRoot);
        item.iconPath = new vscode.ThemeIcon(key === currentKey ? 'target' : severityIcon(diagnostic.severity));
        item.command = {
            command: 'mydfrg.diagnostics.select',
            title: 'Open Diagnostic',
            arguments: [diagnostic]
        };
        item.accessibilityInformation = {
            label: `${severity}, ${diagnostic.message}, ${path.basename(diagnostic.filePath)}, line ${diagnostic.line + 1}, column ${diagnostic.character + 1}`
        };

        this.itemByDiagnosticKey.set(key, item);
        return item;
    }
}

/**
 * @param {string} filePath
 * @param {number} count
 * @param {boolean} containsCurrent
 * @param {string} fileKey
 * @returns {DiagnosticTreeItem}
 */
function createFileItem(filePath, count, containsCurrent, fileKey) {
    const item = new DiagnosticTreeItem(
        path.basename(filePath),
        containsCurrent ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed
    );
    item.id = `file:${fileKey}`;
    item.contextValue = 'mydfrgDiagnosticFile';
    item.description = `${count} ${count === 1 ? 'problem' : 'problems'}`;
    item.tooltip = filePath;
    item.resourceUri = vscode.Uri.file(filePath);
    return item;
}

/**
 * @param {object} diagnostic
 * @param {string} filterText
 * @returns {boolean}
 */
function matchesFilter(diagnostic, filterText) {
    if (!filterText) return true;

    const haystack = [
        diagnostic.filePath,
        diagnostic.message,
        diagnostic.token,
        severityLabel(diagnostic.severity),
        `line ${diagnostic.line + 1}`,
        `column ${diagnostic.character + 1}`
    ].filter(Boolean).join(' ').toLowerCase();

    return filterText.toLowerCase().split(/\s+/).every((term) => haystack.includes(term));
}

/**
 * @param {object} diagnostic
 * @returns {string}
 */
function diagnosticTooltip(diagnostic, extensionRoot) {
    const token = diagnostic.token
        ? `\nToken: ${diagnostic.token} (${diagnostic.keywordExists ? 'known' : 'unknown'})`
        : '';
    const diagnosticText = [
        diagnostic.message,
        diagnostic.filePath,
        `Line ${diagnostic.line + 1}, Column ${diagnostic.character + 1}`,
        `Severity: ${severityLabel(diagnostic.severity)}${token}`
    ].join('\n');
    const helpMarkdown = renderHelpMarkdown(diagnostic.helpDocuments, {
        extensionRoot,
        linkForPage(page) {
            return createHelpCommandUri(page.path);
        }
    });

    if (!helpMarkdown) return diagnosticText;

    const tooltip = new vscode.MarkdownString(
        `${escapeMarkdown(diagnosticText).replace(/\n/g, '  \n')}\n\n---\n\n${helpMarkdown}`
    );
    tooltip.isTrusted = createHelpCommandTrust();
    tooltip.supportThemeIcons = true;
    return tooltip;
}

function escapeMarkdown(value) {
    return String(value || '').replace(/([\\`*_{}\[\]()#+.!|-])/g, '\\$1');
}

function severityLabel(severity) {
    if (severity === 1) return 'Error';
    if (severity === 2) return 'Warning';
    if (severity === 3) return 'Information';
    if (severity === 4) return 'Hint';
    return 'Diagnostic';
}

function severityIcon(severity) {
    if (severity === 1) return 'error';
    if (severity === 2) return 'warning';
    return 'info';
}

function normalizePath(filePath) {
    return String(filePath || '').replace(/\\/g, '/').toLowerCase();
}

class DiagnosticTreeItem extends vscode.TreeItem {}

module.exports = {
    DiagnosticTreeProvider,
    VIEW_MODE_TABLE,
    VIEW_MODE_TREE,
    matchesFilter
};
