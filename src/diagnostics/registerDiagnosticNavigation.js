'use strict';

// -----------------------------------------------------------------------------
// MyDefrag diagnostic navigation integration
// -----------------------------------------------------------------------------
// Add this near the top of src/extension.js with the other require() calls.

const path = require('path');
const paths = require('../shared/path');
const vscode = require('vscode');
const { DiagnosticNavigator } = require('./diagnosticNavigator');
const {
    DiagnosticTreeProvider,
    VIEW_MODE_TABLE,
    VIEW_MODE_TREE
} = require('./diagnosticTreeProvider');

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
    paths.ensureDirectories();
    const stateFile = resolveDiagnosticStateFile();
    const legacyStateFile = stateFile === paths.diagnosticsStateFile
        ? null
        : paths.diagnosticsStateFile;

    // const diagnosticsFile = path.join(
    //     context.globalStorageUri.fsPath,
    //     'log',
    //     'diagnostics-latest.json'
    // );

    // const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath || '';
    // const dismissedFile = workspaceRoot
    //     ? path.join(workspaceRoot, '.user', 'logs', 'session_dismissed.json')
    //     : path.join(context.globalStorageUri.fsPath, 'log', 'session_dismissed.json');

    const navigator = new DiagnosticNavigator({
        stateFile,
        legacyStateFile,
        diagnosticsProvider: () => vscode.languages.getDiagnostics()
    });
    // {
    //     diagnosticsFile,
    //     dismissedFile,
    //     workspaceRoot
    // });

    const treeProvider = new DiagnosticTreeProvider(navigator);
    const treeView = vscode.window.createTreeView('mydfrgDiagnostics', {
        treeDataProvider: treeProvider,
        showCollapseAll: true,
        canSelectMany: false
    });

    context.subscriptions.push(
        treeProvider,
        treeView,
        vscode.languages.onDidChangeDiagnostics(() => {
            refresh().catch((err) => {
                vscode.window.showWarningMessage(`Diagnostic explorer refresh failed: ${err.message}`);
            });
        }),
        treeView.onDidChangeVisibility((event) => {
            if (event.visible) {
                refresh({ reload: true, reveal: true }).catch((err) => {
                    vscode.window.showWarningMessage(`Diagnostic explorer refresh failed: ${err.message}`);
                });
            }
        })
    );

    const updateTreeView = () => {
        const visible = treeProvider.getVisibleCount();
        const total = navigator.getStats().total;
        treeView.description = treeProvider.hasFilter() ? `${visible}/${total}` : `${total}`;
        treeView.message = visible > 0
            ? undefined
            : treeProvider.hasFilter()
                ? `No diagnostics match "${treeProvider.filterText}".`
                : 'No eligible diagnostics.';
    };

    const updateViewContext = async () => {
        await vscode.commands.executeCommand('setContext', 'mydfrgDiagnostics.viewMode', treeProvider.viewMode);
        await vscode.commands.executeCommand('setContext', 'mydfrgDiagnostics.filterActive', treeProvider.hasFilter());
    };

    const revealCurrent = async () => {
        if (!treeView.visible) return;

        const element = treeProvider.getCurrentElement();
        if (!element) return;

        const parent = treeProvider.getParent(element);
        if (parent) {
            await treeView.reveal(parent, { expand: true, focus: false, select: false });
        }
        await treeView.reveal(element, { expand: false, focus: false, select: true });
    };

    const refresh = async (options = {}) => {
        const reload = options.reload !== false;
        const reveal = options.reveal !== false;
        if (reload) navigator.reload();
        treeProvider.refresh();
        updateTreeView();
        await updateViewContext();
        updateDiagnosticStatusBar(context, navigator);
        if (reveal) await revealCurrent();
    };

    const openCurrent = async () => {
        const item = navigator.current();
        if (!item) {
            vscode.window.showInformationMessage('MyDefrag: No current diagnostic.');
            return;
        }

        const uri = vscode.Uri.file(item.filePath);
        const line = Number.isInteger(item.line)
            ? item.line
            : Math.max(0, Number(item.oneBasedLine || 1) - 1);
        const column = Number.isInteger(item.character)
            ? item.character
            : Math.max(0, Number(item.oneBasedColumn || 1) - 1);
        const position = new vscode.Position(line, column);

        await vscode.window.showTextDocument(uri, {
            selection: new vscode.Range(position, position),
            preview: false
        });
    };

    const navigate = async (action) => {
        await action();
        await refresh({ reload: false, reveal: true });
        await openCurrent();
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

        vscode.commands.registerCommand('mydfrg.diagnostics.select', async (diagnostic) => {
            if (!navigator.select(diagnostic)) return;
            await refresh({ reload: false, reveal: true });
            await openCurrent();
        }),

        vscode.commands.registerCommand('mydfrg.diagnostics.next', async () => {
            await navigate(() => navigator.next());
        }),

        vscode.commands.registerCommand('mydfrg.diagnostics.previous', async () => {
            await navigate(() => navigator.previous());
        }),

        vscode.commands.registerCommand('mydfrg.diagnostics.nextFile', async () => {
            await navigate(() => navigator.nextFile());
        }),

        vscode.commands.registerCommand('mydfrg.diagnostics.prevFile', async () => {
            await navigate(() => navigator.prevFile());
        }),

        vscode.commands.registerCommand('mydfrg.diagnostics.fixedItem', async () => {
            await navigate(() => navigator.fixedItem());
        }),

        vscode.commands.registerCommand('mydfrg.diagnostics.ignoreItem', async () => {
            await navigate(() => navigator.ignoreItem());
        }),

        vscode.commands.registerCommand('mydfrg.diagnostics.skipItem', async () => {
            await navigate(() => navigator.skipItem());
        }),

        vscode.commands.registerCommand('mydfrg.diagnostics.top', async () => {
            await navigate(() => navigator.top());
        }),

        vscode.commands.registerCommand('mydfrg.diagnostics.reset', async () => {
            await navigate(() => navigator.reset());
        }),

        vscode.commands.registerCommand('mydfrg.diagnostics.filter', async () => {
            const filterText = await vscode.window.showInputBox({
                title: 'Filter MyDefrag Diagnostics',
                prompt: 'Match file, message, token, severity, line, or column',
                value: treeProvider.filterText,
                placeHolder: 'For example: warning parser or sample.MyDc'
            });
            if (filterText === undefined) return;
            treeProvider.setFilter(filterText);
            await refresh({ reload: false, reveal: true });
        }),

        vscode.commands.registerCommand('mydfrg.diagnostics.clearFilter', async () => {
            treeProvider.setFilter('');
            await refresh({ reload: false, reveal: true });
        }),

        vscode.commands.registerCommand('mydfrg.diagnostics.showTree', async () => {
            treeProvider.setViewMode(VIEW_MODE_TREE);
            await refresh({ reload: false, reveal: true });
        }),

        vscode.commands.registerCommand('mydfrg.diagnostics.showTable', async () => {
            treeProvider.setViewMode(VIEW_MODE_TABLE);
            await refresh({ reload: false, reveal: true });
        }),

        vscode.commands.registerCommand('mydfrg.diagnostics.closeView', async () => {
            await vscode.commands.executeCommand('workbench.action.closeSidebar');
        }),

        vscode.commands.registerCommand('mydfrg.diagnostics.validSyntax', async () => {
            const item = navigator.current();
            const text = item
                ? `MyDefrag: Treating current diagnostic as likely parser/classification issue: ${item.message}`
                : 'MyDefrag: No current diagnostic.';
            await navigator.validSyntax();
            await refresh({ reload: false, reveal: true });
            vscode.window.showInformationMessage(text);
        }),

        vscode.commands.registerCommand('mydfrg.diagnostics.sendIt', async () => {
            const item = navigator.current();
            const text = item
                ? `MyDefrag: Wrote AI diagnostic prompt to ${paths.diagnosticsSendPromptFile}`
                : 'MyDefrag: No current diagnostic.';
            const result = await navigator.sendIt();

            if (result) {
                const doc = await vscode.workspace.openTextDocument(result.promptFile);
                await vscode.window.showTextDocument(doc, {
                    preview: false,
                    preserveFocus: false
                });
                vscode.window.showInformationMessage(
                    `MyDefrag: Wrote AI diagnostic prompt to ${result.promptFile}`
                );
            }
            await refresh({ reload: false, reveal: true });
            vscode.window.showInformationMessage(text);
        })
    );

    createDiagnosticStatusBar(context, navigator);
    refresh().catch((err) => {
        vscode.window.showWarningMessage(`MyDefrag diagnostic navigation failed to load: ${err.message}`);
    });

    return { navigator, treeProvider, treeView, refresh };
}

/**
 * Resolve diagnostic navigation state to the target workspace when available.
 *
 * @returns {string}
 */
function resolveDiagnosticStateFile() {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath || '';

    if (!workspaceRoot) {
        return paths.diagnosticsStateFile;
    }

    return path.join(workspaceRoot, '.vscode', 'session_dismissed.json');
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
