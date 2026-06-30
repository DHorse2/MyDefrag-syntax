'use strict';

const path = require('path');
const vscode = require('vscode');

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

        const items = [];

        items.push(new DiagnosticTreeItem(
            `Diagnostics: ${stats.index}/${stats.total} (${stats.fileCount} files)`,
            vscode.TreeItemCollapsibleState.None,
            undefined,
            'symbol-event'
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
            'mydfrg.diagnostics.openCurrent',
            'go-to-file',
            current.filePath
        ));

        items.push(new DiagnosticTreeItem(
            `Line ${current.oneBasedLine}, Column ${current.oneBasedColumn}`,
            vscode.TreeItemCollapsibleState.None,
            'mydfrg.diagnostics.openCurrent',
            'location'
        ));

        items.push(new DiagnosticTreeItem(
            `Severity ${current.severity}: ${current.message}`,
            vscode.TreeItemCollapsibleState.None,
            'mydfrg.diagnostics.openCurrent',
            'warning'
        ));

        const keywordLabel = current.token
            ? `Keyword/token: ${current.token} (${current.keywordExists ? 'known' : 'unknown'})`
            : 'Keyword/token: not detected';

        items.push(new DiagnosticTreeItem(
            keywordLabel,
            vscode.TreeItemCollapsibleState.None,
            undefined,
            current.keywordExists ? 'symbol-key' : 'question'
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
     */
    constructor(label, collapsibleState, commandId, iconId, tooltip, color = null) {
        super(label, collapsibleState);

        this.tooltip = tooltip || label;

        if (iconId === null || iconId === undefined) { iconId = 'issues'; }
        this.iconPath = color
            ? new vscode.ThemeIcon(iconId, new vscode.ThemeColor(color))
            : new vscode.ThemeIcon(iconId);

        if (commandId) {
            this.command = {
                command: commandId,
                title: label
            };
        }
    }
}

module.exports = {
    DiagnosticTreeProvider
};
