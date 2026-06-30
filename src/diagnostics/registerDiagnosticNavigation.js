'use strict';

// -----------------------------------------------------------------------------
// MyDefrag diagnostic navigation integration
// -----------------------------------------------------------------------------
// Add this near the top of src/extension.js with the other require() calls.

const path = require('path');
const vscode = require('vscode');
const { DiagnosticNavigator } = require('./diagnosticNavigator');
const { DiagnosticTreeProvider } = require('./diagnosticTreeProvider');

/**
 * Registers the MyDefrag diagnostic navigation tree and commands.
 *
 * This is intentionally additive. It reads the existing diagnostics-latest.json
 * file and the existing session_dismissed.json navigation state without changing
 * the language server diagnostic pipeline.
 *
 * @param {vscode.ExtensionContext} context
 * @returns {{ navigator: DiagnosticNavigator, treeProvider: DiagnosticTreeProvider }}
 */
function registerDiagnosticNavigation(context) {
    // const diagnosticsFile = path.join(
    //     context.globalStorageUri.fsPath,
    //     'log',
    //     'diagnostics-latest.json'
    // );

    // const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath || '';
    // const dismissedFile = workspaceRoot
    //     ? path.join(workspaceRoot, '.user', 'logs', 'session_dismissed.json')
    //     : path.join(context.globalStorageUri.fsPath, 'log', 'session_dismissed.json');

    const navigator = new DiagnosticNavigator();
    // {
    //     diagnosticsFile,
    //     dismissedFile,
    //     workspaceRoot
    // });

    const treeProvider = new DiagnosticTreeProvider(navigator);

    context.subscriptions.push(
        vscode.window.createTreeView('mydfrgDiagnostics', {
            treeDataProvider: treeProvider,
            showCollapseAll: false
        })
    );

    const refresh = async () => {
        await navigator.reload();
        treeProvider.refresh();
        updateDiagnosticStatusBar(context, navigator);
    };

    const openCurrent = async () => {
        const item = navigator.current();
        if (!item) {
            vscode.window.showInformationMessage('MyDefrag: No current diagnostic.');
            return;
        }

        const uri = vscode.Uri.file(item.filePath);
        const line = Math.max(0, Number(item.line || 1) - 1);
        const column = Math.max(0, Number(item.column || 1) - 1);
        const position = new vscode.Position(line, column);

        await vscode.window.showTextDocument(uri, {
            selection: new vscode.Range(position, position),
            preview: false
        });
    };

    context.subscriptions.push(
        vscode.commands.registerCommand('mydfrg.diagnostics.refresh', async () => {
            await refresh();
        }),

        vscode.commands.registerCommand('mydfrg.diagnostics.current', async () => {
            await refresh();
            await openCurrent();
        }),

        vscode.commands.registerCommand('mydfrg.diagnostics.openCurrent', async () => {
            await openCurrent();
        }),

        vscode.commands.registerCommand('mydfrg.diagnostics.next', async () => {
            await navigator.next();
            treeProvider.refresh();
            updateDiagnosticStatusBar(context, navigator);
            await openCurrent();
        }),

        vscode.commands.registerCommand('mydfrg.diagnostics.nextFile', async () => {
            await navigator.nextFile();
            treeProvider.refresh();
            updateDiagnosticStatusBar(context, navigator);
            await openCurrent();
        }),

        vscode.commands.registerCommand('mydfrg.diagnostics.prevFile', async () => {
            await navigator.prevFile();
            treeProvider.refresh();
            updateDiagnosticStatusBar(context, navigator);
            await openCurrent();
        }),

        vscode.commands.registerCommand('mydfrg.diagnostics.fixedItem', async () => {
            await navigator.fixedItem();
            treeProvider.refresh();
            updateDiagnosticStatusBar(context, navigator);
            await openCurrent();
        }),

        vscode.commands.registerCommand('mydfrg.diagnostics.ignoreItem', async () => {
            await navigator.ignoreItem();
            treeProvider.refresh();
            updateDiagnosticStatusBar(context, navigator);
            await openCurrent();
        }),

        vscode.commands.registerCommand('mydfrg.diagnostics.skipItem', async () => {
            await navigator.skipItem();
            treeProvider.refresh();
            updateDiagnosticStatusBar(context, navigator);
            await openCurrent();
        }),

        vscode.commands.registerCommand('mydfrg.diagnostics.top', async () => {
            await navigator.top();
            treeProvider.refresh();
            updateDiagnosticStatusBar(context, navigator);
            await openCurrent();
        }),

        vscode.commands.registerCommand('mydfrg.diagnostics.reset', async () => {
            await navigator.reset();
            treeProvider.refresh();
            updateDiagnosticStatusBar(context, navigator);
            await openCurrent();
        }),

        vscode.commands.registerCommand('mydfrg.diagnostics.validSyntax', async () => {
            const item = navigator.current();
            const text = item
                ? `MyDefrag: Treating current diagnostic as likely parser/classification issue: ${item.message}`
                : 'MyDefrag: No current diagnostic.';
            await navigator.validSyntax();
            vscode.window.showInformationMessage(text);
        }),

        vscode.commands.registerCommand('mydfrg.diagnostics.sendIt', async () => {
            const item = navigator.current();
            const text = item
                ? `MyDefrag: Treating current diagnostic as likely parser/classification issue: ${item.message}`
                : 'MyDefrag: No current diagnostic.';
            await navigator.sendIt();
            vscode.window.showInformationMessage(text);
        })
    );

    createDiagnosticStatusBar(context, navigator);
    refresh().catch((err) => {
        vscode.window.showWarningMessage(`MyDefrag diagnostic navigation failed to load: ${err.message}`);
    });

    return { navigator, treeProvider };
}

let diagnosticStatusBarItem = null;

/**
 * Creates the status bar item used by diagnostic navigation.
 *
 * @param {vscode.ExtensionContext} context
 * @param {DiagnosticNavigator} navigator
 */
function createDiagnosticStatusBar(context, navigator) {
    if (diagnosticStatusBarItem) return;

    diagnosticStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 90);
    diagnosticStatusBarItem.command = 'mydfrg.diagnostics.openCurrent';
    context.subscriptions.push(diagnosticStatusBarItem);
    updateDiagnosticStatusBar(context, navigator);
}

/**
 * Updates the diagnostic navigation status bar text.
 *
 * @param {vscode.ExtensionContext} _context
 * @param {DiagnosticNavigator} navigator
 */
function updateDiagnosticStatusBar(_context, navigator) {
    if (!diagnosticStatusBarItem) return;

    const state = navigator.getState ? navigator.getState() : null;
    const index = state?.currentIndex ?? 0;
    const total = state?.total ?? 0;

    diagnosticStatusBarItem.text = total > 0
        ? `$(warning) MyDefrag ${index + 1}/${total}`
        : '$(check) MyDefrag 0 diagnostics';

    diagnosticStatusBarItem.tooltip = 'Open current MyDefrag diagnostic';
    diagnosticStatusBarItem.show();
}

// Add this inside activate(context), after the language client/logging setup is ready:
//
//     registerDiagnosticNavigation(context);
//
// If src/extension.js already imports vscode or path, do not duplicate those require lines.

module.exports = {
    registerDiagnosticNavigation
};
