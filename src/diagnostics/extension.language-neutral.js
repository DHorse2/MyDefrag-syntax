'use strict';
// extension.language-neutral.js
// Copy this file as extension.js in a new VS Code/VSCodium extension project
// after copying src/diagnostics and src/shared/path.js.

const path = require('path');
const vscode = require('vscode');
const { LanguageClient, TransportKind } = require('vscode-languageclient/node');
const paths = require('../shared/path');
const { registerDiagnosticNavigation } = require('./registerDiagnosticNavigation');

let client = null;
let outputChannel = null;

const DEFAULT_CONFIG = Object.freeze({
    configurationSection: 'diagnosticsLauncher',
    outputChannelName: 'Diagnostics',
    clientId: 'diagnostics-language-client',
    clientName: 'Diagnostics Language Client',
    diagnosticsSnapshotNotification: 'mydfrg/diagnosticsSnapshotChanged',
    documentSelector: [{ scheme: 'file' }],
    documentLinkProviders: [
        {
            name: 'quoted-relative-paths',
            pattern: '"([^"]+\\.(?:bat|cmd|com|exe|My\\w+|my\\w+|md|txt|json|log))"',
            pathGroup: 1
        },
        {
            name: 'bang-include-paths',
            pattern: '!include\\s+"([^"]+)"!',
            pathGroup: 1
        },
        {
            name: 'file-uri-with-position',
            pattern: 'file:///(.+):(\\d+):(\\d+)',
            pathGroup: 1,
            lineGroup: 2,
            characterGroup: 3
        }
    ],
    serverModule: path.join('src', 'server', 'server.js'),
    userDir: '.user',
    logDir: '.user/logs'
});

/**
 * Activates a language-neutral diagnostic navigation extension.
 *
 * Package contribution IDs still need to match the copied diagnostics module:
 * - view id: mydfrgDiagnostics
 * - commands: mydfrg.diagnostics.*
 *
 * For a fully neutral extension, rename those IDs in package.json and in
 * registerDiagnosticNavigation.js together.
 *
 * @param {vscode.ExtensionContext} context
 * @returns {Promise<void>}
 */
async function activate(context) {
    const launcherConfig = loadLauncherConfig();

    paths.configurePaths({
        userDir: launcherConfig.userDir,
        logDir: launcherConfig.logDir
    });

    outputChannel = vscode.window.createOutputChannel(launcherConfig.outputChannelName);
    context.subscriptions.push(outputChannel);

    const diagnosticNavigation = registerDiagnosticNavigation(context);
    registerDocumentLinkProviders(context, launcherConfig);

    client = startLanguageClient(context, launcherConfig, diagnosticNavigation);
    if (client) {
        context.subscriptions.push(client);
        await client.start();
    }
}

/**
 * Deactivates the optional language client.
 *
 * @returns {Thenable<void>|undefined}
 */
function deactivate() {
    if (client) {
        return client.stop();
    }

    return undefined;
}

/**
 * Loads launcher settings with defaults suitable for a copied extension.
 *
 * @returns {object}
 */
function loadLauncherConfig() {
    const settings = vscode.workspace.getConfiguration(DEFAULT_CONFIG.configurationSection);

    return {
        configurationSection: readSetting(settings, 'configurationSection', DEFAULT_CONFIG.configurationSection),
        outputChannelName: readSetting(settings, 'outputChannelName', DEFAULT_CONFIG.outputChannelName),
        clientId: readSetting(settings, 'clientId', DEFAULT_CONFIG.clientId),
        clientName: readSetting(settings, 'clientName', DEFAULT_CONFIG.clientName),
        diagnosticsSnapshotNotification: readSetting(
            settings,
            'diagnosticsSnapshotNotification',
            DEFAULT_CONFIG.diagnosticsSnapshotNotification
        ),
        documentSelector: readSetting(settings, 'documentSelector', DEFAULT_CONFIG.documentSelector),
        documentLinkProviders: readSetting(
            settings,
            'documentLinkProviders',
            DEFAULT_CONFIG.documentLinkProviders
        ),
        serverModule: readSetting(settings, 'serverModule', DEFAULT_CONFIG.serverModule),
        userDir: readSetting(settings, 'userDir', DEFAULT_CONFIG.userDir),
        logDir: readSetting(settings, 'logDir', DEFAULT_CONFIG.logDir)
    };
}

/**
 * Reads a VS Code setting, preserving falsey values except null/undefined.
 *
 * @param {vscode.WorkspaceConfiguration} settings
 * @param {string} name
 * @param {*} defaultValue
 * @returns {*}
 */
function readSetting(settings, name, defaultValue) {
    const value = settings.get(name);
    return value === null || value === undefined ? defaultValue : value;
}

/**
 * Registers configurable document link providers for copied extensions.
 *
 * @param {vscode.ExtensionContext} context
 * @param {object} launcherConfig
 */
function registerDocumentLinkProviders(context, launcherConfig) {
    const providers = Array.isArray(launcherConfig.documentLinkProviders)
        ? launcherConfig.documentLinkProviders
        : [];

    if (providers.length === 0) {
        return;
    }

    const compiledProviders = providers
        .map(compileDocumentLinkProvider)
        .filter(Boolean);

    if (compiledProviders.length === 0) {
        return;
    }

    const selector = launcherConfig.documentSelector || DEFAULT_CONFIG.documentSelector;
    const registration = vscode.languages.registerDocumentLinkProvider(
        selector,
        {
            provideDocumentLinks(document) {
                const text = document.getText();
                const links = [];

                for (const provider of compiledProviders) {
                    provider.pattern.lastIndex = 0;

                    let match;
                    while ((match = provider.pattern.exec(text)) !== null) {
                        const documentLink = createDocumentLink(document, match, provider);
                        if (documentLink) {
                            links.push(documentLink);
                        }

                        if (match[0].length === 0) {
                            provider.pattern.lastIndex += 1;
                        }
                    }
                }

                return links;
            }
        }
    );

    context.subscriptions.push(registration);
}

/**
 * Compiles a launcher document-link provider setting.
 *
 * @param {object} provider
 * @returns {object|null}
 */
function compileDocumentLinkProvider(provider) {
    if (!provider || typeof provider.pattern !== 'string') {
        return null;
    }

    try {
        return {
            name: provider.name || provider.pattern,
            pattern: new RegExp(provider.pattern, provider.flags || 'gi'),
            pathGroup: Number(provider.pathGroup || 1),
            lineGroup: provider.lineGroup === undefined ? null : Number(provider.lineGroup),
            characterGroup: provider.characterGroup === undefined ? null : Number(provider.characterGroup)
        };
    } catch (error) {
        outputChannel?.appendLine?.(
            `Diagnostics launcher: skipped invalid document link provider ${provider.name || provider.pattern}: ${error.message}`
        );
        return null;
    }
}

/**
 * Creates a VS Code document link from a regex match.
 *
 * @param {vscode.TextDocument} document
 * @param {RegExpExecArray} match
 * @param {object} provider
 * @returns {vscode.DocumentLink|null}
 */
function createDocumentLink(document, match, provider) {
    const rawPath = match[provider.pathGroup];
    if (!rawPath) {
        return null;
    }

    const matchText = match[0];
    const pathOffset = matchText.indexOf(rawPath);
    if (pathOffset < 0) {
        return null;
    }

    const start = document.positionAt(match.index + pathOffset);
    const end = document.positionAt(match.index + pathOffset + rawPath.length);
    const targetUri = resolveDocumentLinkTarget(document, rawPath, match, provider);

    if (!targetUri) {
        return null;
    }

    return new vscode.DocumentLink(new vscode.Range(start, end), targetUri);
}

/**
 * Resolves a matched link path to a target URI.
 *
 * @param {vscode.TextDocument} document
 * @param {string} rawPath
 * @param {RegExpExecArray} match
 * @param {object} provider
 * @returns {vscode.Uri|null}
 */
function resolveDocumentLinkTarget(document, rawPath, match, provider) {
    const fs = require('fs');
    const targetPath = rawPath.replace(/\//g, path.sep);
    const absolutePath = path.isAbsolute(targetPath)
        ? targetPath
        : findExistingPathWalkingUp(path.dirname(document.uri.fsPath), targetPath);

    if (!absolutePath) {
        return null;
    }

    let targetUri = vscode.Uri.file(absolutePath);
    if (provider.lineGroup !== null && provider.characterGroup !== null) {
        const line = Math.max(Number(match[provider.lineGroup] || 1) - 1, 0);
        const character = Math.max(Number(match[provider.characterGroup] || 1) - 1, 0);
        targetUri = targetUri.with({ fragment: `L${line + 1},${character + 1}` });
    }

    if (!fs.existsSync(absolutePath)) {
        return null;
    }

    return targetUri;
}

/**
 * Finds a relative path by walking from the current file toward the root.
 *
 * @param {string} startDir
 * @param {string} relativePath
 * @returns {string|null}
 */
function findExistingPathWalkingUp(startDir, relativePath) {
    const fs = require('fs');
    let currentDir = startDir;
    const root = path.parse(currentDir).root;

    while (true) {
        const candidate = path.resolve(currentDir, relativePath);
        if (fs.existsSync(candidate)) {
            return candidate;
        }

        if (currentDir === root || currentDir === path.dirname(currentDir)) {
            return null;
        }

        currentDir = path.dirname(currentDir);
    }
}

/**
 * Starts the optional language server client when the server module exists.
 *
 * The diagnostics navigator only needs diagnostics-latest.json. A language
 * server is optional if another process writes that file.
 *
 * @param {vscode.ExtensionContext} context
 * @param {object} launcherConfig
 * @param {{refresh?: Function}} diagnosticNavigation
 * @returns {LanguageClient|null}
 */
function startLanguageClient(context, launcherConfig, diagnosticNavigation) {
    const serverModule = context.asAbsolutePath(launcherConfig.serverModule);

    if (!serverModule || !require('fs').existsSync(serverModule)) {
        outputChannel?.appendLine?.(`Diagnostics launcher: no language server found at ${serverModule}`);
        return null;
    }

    const serverOptions = {
        run: {
            module: serverModule,
            transport: TransportKind.ipc
        },
        debug: {
            module: serverModule,
            transport: TransportKind.ipc,
            options: {
                execArgv: ['--nolazy', '--inspect=6009']
            }
        }
    };

    const clientOptions = {
        documentSelector: launcherConfig.documentSelector,
        synchronize: {
            configurationSection: [launcherConfig.configurationSection]
        },
        initializationOptions: {
            paths: paths.getPaths()
        }
    };

    const nextClient = new LanguageClient(
        launcherConfig.clientId,
        launcherConfig.clientName,
        serverOptions,
        clientOptions
    );

    nextClient.onNotification(launcherConfig.diagnosticsSnapshotNotification, async () => {
        await diagnosticNavigation?.refresh?.();
    });

    return nextClient;
}

module.exports = {
    activate,
    deactivate
};
