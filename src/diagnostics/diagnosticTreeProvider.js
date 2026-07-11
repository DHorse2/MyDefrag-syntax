'use strict';

const path = require('path');
const vscode = require('vscode');
const { DiagState } = require('./diagnosticsState');

const MAX_PROBLEMS_SEVERITY = 2;
const COPY_TREE_ITEM_COMMAND = 'mydfrg.diagnostics.copyTreeItem';
let copyTreeItemCommandRegistered = false;

/**
 * Native VSCodium TreeView provider for diagnostic navigation.
 */
class DiagnosticTreeProvider {
    /**
     * @param {import('./diagnosticNavigator').DiagnosticNavigator} navigator
     */
    constructor(navigator) {
        this.navigator = navigator;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        registerCopyTreeItemCommand();
    }

    refresh() {
        this._onDidChangeTreeData.fire();
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
        if (element) return [];

        this.navigator.reload();
        const current = this.navigator.current();
        const stats = this.navigator.getStats();
        const stateCounts = countDiagnosticStates(this.navigator);
        const totalDiagnosticCount = countTraversableDiagnostics(this.navigator.allDiagnostics);
        const totalMessageCount = this.navigator.allDiagnostics?.length || 0;
        const totalTraversableFileCount = countDiagnosticFiles(filterTraversableDiagnostics(this.navigator.allDiagnostics));
        const totalFileCount = countDiagnosticFiles(this.navigator.allDiagnostics);

        const items = [];
        const diagnosticHeaderLabel = `Diagnostics: ${stats.index}/${totalDiagnosticCount}/${totalMessageCount} (${stats.total} remaining, ${stats.fileCount}/${totalTraversableFileCount}/${totalFileCount} files, fixed ${stateCounts.fixed}, ignored ${stateCounts.ignored}, skipped ${stateCounts.skipped})`;

        items.push(new DiagnosticTreeItem(
            diagnosticHeaderLabel,
            vscode.TreeItemCollapsibleState.None,
            COPY_TREE_ITEM_COMMAND,
            'symbol-event',
            undefined,
            null,
            [diagnosticHeaderLabel]
        ));

        if (!current) {
            items.push(new DiagnosticTreeItem(
                'No eligible diagnostics',
                vscode.TreeItemCollapsibleState.None,
                undefined,
                'pass'
            ));
            items.push(actionItem('Reset dismissed diagnostics', 'mydfrg.diagnostics.reset', 'debug-restart'));
            return items;
        }

        items.push(new DiagnosticTreeItem(
            path.basename(current.filePath),
            vscode.TreeItemCollapsibleState.None,
            COPY_TREE_ITEM_COMMAND,
            'go-to-file',
            current.filePath,
            null,
            [path.basename(current.filePath)]
        ));

        items.push(new DiagnosticTreeItem(
            `Line ${current.oneBasedLine}, Column ${current.oneBasedColumn}`,
            vscode.TreeItemCollapsibleState.None,
            COPY_TREE_ITEM_COMMAND,
            'location',
            undefined,
            null,
            [`Line ${current.oneBasedLine}, Column ${current.oneBasedColumn}`]
        ));

        items.push(new DiagnosticTreeItem(
            `Severity ${current.severity}`,
            vscode.TreeItemCollapsibleState.None,
            COPY_TREE_ITEM_COMMAND,
            'warning',
            undefined,
            null,
            [`Severity ${current.severity}`]
        ));

        items.push(new DiagnosticTreeItem(
            `Diagnostic: ${current.message}`,
            vscode.TreeItemCollapsibleState.None,
            COPY_TREE_ITEM_COMMAND,
            'comment-discussion',
            undefined,
            null,
            [current.message]
        ));

        const keywordLabel = current.token
            ? `Keyword/token: ${current.token} (${current.keywordExists ? 'known' : 'unknown'})`
            : 'Keyword/token: not detected';

        items.push(new DiagnosticTreeItem(
            keywordLabel,
            vscode.TreeItemCollapsibleState.None,
            COPY_TREE_ITEM_COMMAND,
            current.keywordExists ? 'symbol-key' : 'question',
            undefined,
            null,
            [keywordLabel]
        ));

        items.push(actionItem('Get next', 'mydfrg.diagnostics.next', 'debug-step-into'));
        items.push(actionItem('Fixed', 'mydfrg.diagnostics.fixedItem', 'pass-filled', 'green'));
        items.push(actionItem('Ignore', 'mydfrg.diagnostics.ignoreItem', 'eye-closed'));
        items.push(actionItem('Skip', 'mydfrg.diagnostics.skipItem', 'debug-step-over'));
        items.push(actionItem('Valid', 'mydfrg.diagnostics.validSyntax', 'thumbsup-filled', 'green'));
        items.push(actionItem('Send', 'mydfrg.diagnostics.sendIt', 'send', 'green'));
        items.push(actionItem('Next file', 'mydfrg.diagnostics.nextFile', 'arrow-right'));
        items.push(actionItem('Previous file', 'mydfrg.diagnostics.prevFile', 'arrow-left'));
        items.push(actionItem('Go to top', 'mydfrg.diagnostics.top', 'arrow-circle-up'));
        items.push(actionItem('Reset dismissed diagnostics', 'mydfrg.diagnostics.reset', 'debug-restart'));

        return items;
    }
}

/**
 * Register the command used by copyable diagnostic detail rows.
 *
 * @returns {void}
 */
function registerCopyTreeItemCommand() {
    if (copyTreeItemCommandRegistered) { return; }

    copyTreeItemCommandRegistered = true;
    vscode.commands.registerCommand(COPY_TREE_ITEM_COMMAND, async (text) => {
        const copyText = String(text || '');
        await vscode.env.clipboard.writeText(copyText);
        vscode.window.showInformationMessage(`Copied diagnostic explorer text: ${copyText}`);
    });
}

/**
 * @param {Array<object>} diagnostics
 * @returns {number}
 */
function countTraversableDiagnostics(diagnostics) {
    return filterTraversableDiagnostics(diagnostics).length;
}

/**
 * @param {Array<object>} diagnostics
 * @returns {Array<object>}
 */
function filterTraversableDiagnostics(diagnostics) {
    return (diagnostics || []).filter(isProblemsDiagnostic);
}

/**
 * @param {Array<object>} diagnostics
 * @returns {number}
 */
function countDiagnosticFiles(diagnostics) {
    return new Set((diagnostics || []).map(diagnostic => normalizePath(diagnostic.filePath))).size;
}

/**
 * @param {import('./diagnosticNavigator').DiagnosticNavigator} navigator
 * @returns {{fixed:number,ignored:number,skipped:number}}
 */
function countDiagnosticStates(navigator) {
    const counts = {
        fixed: 0,
        ignored: 0,
        skipped: 0
    };

    for (const state of navigator.state?.items?.values?.() || []) {
        if (state === DiagState.FIXED) { counts.fixed++; }
        if (state === DiagState.IGNORED) { counts.ignored++; }
        if (state === DiagState.SKIPPED) { counts.skipped++; }
    }

    return counts;
}

/**
 * @param {string} filePath
 * @returns {string}
 */
function normalizePath(filePath) {
    return String(filePath || '').replace(/\\/g, '/').toLowerCase();
}

/**
 * Match the diagnostic severities that should be counted from the Problems list.
 *
 * @param {object} diagnostic
 * @returns {boolean}
 */
function isProblemsDiagnostic(diagnostic) {
    return Boolean(diagnostic && diagnostic.severity > 0 && diagnostic.severity <= MAX_PROBLEMS_SEVERITY);
}

/**
 * @param {string} label
 * @param {string} command
 * @param {string} icon
 * @returns {DiagnosticTreeItem}
 */
function actionItem(label, command, icon, color = null) {
    const item = new vscode.TreeItem(label);

    item.command = {
        command,
        title: label
    };

    if (color) {
        item.iconPath = new vscode.ThemeIcon(
            icon,
            new vscode.ThemeColor(color)
        );
    } else {
        item.iconPath = new vscode.ThemeIcon(icon);
    }
    // return item;

    return new DiagnosticTreeItem(
        label,
        vscode.TreeItemCollapsibleState.None,
        command,
        icon,
        color
    );
}

class DiagnosticTreeItem extends vscode.TreeItem {
    /**
     * @param {string} label
     * @param {vscode.TreeItemCollapsibleState} collapsibleState
     * @param {string|undefined} commandId
     * @param {string|undefined} iconId
     * @param {string|undefined} tooltip
     * @param {string|undefined} color
     * @param {Array<*>} commandArgs
     */
    constructor(label, collapsibleState, commandId, iconId, tooltip, color = null, commandArgs = []) {
        super(label, collapsibleState);

        this.tooltip = tooltip || label;

        if (iconId === null || iconId === undefined) { iconId = 'issues'; }
        this.iconPath = color
            ? new vscode.ThemeIcon(iconId, new vscode.ThemeColor(color))
            : new vscode.ThemeIcon(iconId);

        if (commandId) {
            this.command = {
                command: commandId,
                title: label,
                arguments: commandArgs
            };
        }
    }
}

module.exports = {
    DiagnosticTreeProvider
};
