'use strict';
// extensions.js
// Order of execution. Process flow.
// activate() starts
//   → LanguageClient created
//   → client.start() called (returns a Promise/Disposable, doesn't block)
//   → ParserStateBar created (if you're doing this in activate())
// activate() returns  ← VS Code considers your extension "active" now
//   new process:
//   ...some async time passes (process spawn + LSP handshake)...
// server.js process starts, registers connection handlers
// server.js receives 'initialize' → responds
// server.js receives 'initialized'
// client sends 'textDocument/didOpen' for the currently open .myd file
// server.js's didOpen handler runs → calls validateDocument()
// validateDocument() sends diagnostics back via connection.sendDiagnostics()
// validateDocument() sends status bar update after processing.

//#region Initialize Extension .Parse
const fs = require("fs");
const path = require('path');
// vscode.Uri is available directly, no import needed
// and from url module:
const { fileURLToPath, pathToFileURL } = require('url');
const vscode = require('vscode');
const cp = require('child_process');
// language server
const { LanguageClient, TransportKind } = require('vscode-languageclient/node');
const ini = require('./shared/ini')
const paths = require('./shared/path');
paths.ensureDirectories();
const util = require('./utilities/util')
const Logger = require('./shared/logger');
const { normalizeSeveritySetting, normalizeVerboseLevel } = require('./shared/config');
const {
    buildOpenFileCommandArguments,
    hasDocumentLinkRange,
    resolveDocumentLinkPath
} = require('./shared/documentLinks');
const { createHelpCommandTrust } = require('./shared/helpDocumentation');
const { createFeatureToggleController } = require('./shared/featureToggles');
const { createLanguageCatalog } = require('./shared/languageCatalog');
const languageData = require('./server/languageData');
const { CompletionPointProvider } = require('./completion/completionPointProvider');
const { registerDiagnosticNavigation } = require('./diagnostics/registerDiagnosticNavigation');
const {
    PREVIEW_SCHEME,
    DEFAULT_PREVIEW_MODE,
    PREVIEW_MODES,
    buildPreviewDocumentPath,
    buildPreviewQuery,
    createLanguageClientDocumentSelector,
    getPreviewMode,
    parsePreviewQuery
} = require('./preprocess/preview-options');

const catalog = createLanguageCatalog({
    locale: vscode.env.language,
    components: ['extension']
});
const tMessage2 = catalog.format("extension.message.channelName.mydefragSyntax.text").text;
const channelName = tMessage2;
var isServer = false;
var ParserStateBar;
let client;
var diagnostics = [];

// ─────────────────────────────────────────────────────────────────────────────────
let iniData;
let source = "Extension";
let connection;
let connectionShown = false;
let config;
let isDebugOn;
let verboseLevel;
let logger;
let isLogOn;
let referenceRelativePathLevel;
let referenceContainsMacrosLevel;
let referenceFileFoundLevel;
let referenceFileNotFoundLevel;
let fragmentParentLevel;
let hoverEnabled;
let wordPredictionEnabled;
let iniErrors = [];

// ─────────────────────────────────────────────────────────────────────────────────
var links = [];
var batchFileCommandLinks = [];
var includeLinks = [];
var fileLinks = [];
var commandLinks = [];

// ─────────────────────────────────────────────────────────────────────────────────
// Module-level config cache - EXCLUDES
// MyDefrag excludes
//     = package.json defaults
//     + user/workspace overrides
// Files excludes
//     = VS Code setting
// Search excludes
//     = VS Code setting

let excludeConfig = {
    mydfrgExcludes: [],
    fileExcludes: {},
    searchExcludes: {},
    fileCount: 0,
    folderCount: 0,
    searchCount: 0
};
// Check against user's search and files.exclude settings
function loadExcludeConfig() {
    excludeConfig.mydfrgExcludes = vscode.workspace.getConfiguration('mydfrg').get('exclude') || [];
    excludeConfig.fileExcludes = vscode.workspace.getConfiguration('files').get('exclude') || {};
    excludeConfig.searchExcludes = vscode.workspace.getConfiguration('search').get('exclude') || {};
    excludeConfig.fileCount = 0;
    excludeConfig.folderCount = 0;
    excludeConfig.searchCount = 0;
}

/**
 * Reads MyDefrag extension settings from the VSCodium configuration API.
 *
 * @returns {object} Normalized MyDefrag extension configuration.
 */
function loadMyDefragConfig() {
    const settings = vscode.workspace.getConfiguration('mydfrg');
    const nextVerboseLevel = normalizeVerboseLevel(settings.get('verboseLevel'), 5);

    return {
        source,
        iniData: {
            severity: ini.severity
        },
        isDebugOn: Boolean(settings.get('debugOn')),
        hoverEnabled: settings.get('hoverEnabled') !== false,
        wordPredictionEnabled: settings.get('wordPredictionEnabled') !== false,
        verboseLevel: nextVerboseLevel,
        isLogOn: true,
        referenceRelativePathLevel: normalizeSeveritySetting(
            settings.get('referenceRelativePathLevel'),
            ini.severity.Warning
        ),
        referenceContainsMacrosLevel: normalizeSeveritySetting(
            settings.get('referenceContainsMacros'),
            ini.severity.Information
        ),
        referenceFileFoundLevel: normalizeSeveritySetting(
            settings.get('referenceFileFoundLevel'),
            ini.severity.Information
        ),
        referenceFileNotFoundLevel: normalizeSeveritySetting(
            settings.get('referenceFileNotFoundLevel'),
            ini.severity.Error
        ),
        fragmentParentLevel: normalizeSeveritySetting(
            settings.get('fragmentParentLevel'),
            ini.severity.Hint
        ),
        iniErrors
    };
}

/**
 * Applies normalized MyDefrag settings to this extension process.
 *
 * @param {object} nextConfig The normalized MyDefrag configuration.
 */
function applyMyDefragConfig(nextConfig) {
    config = nextConfig;
    ({
        source,
        iniData,
        isDebugOn,
        hoverEnabled,
        wordPredictionEnabled,
        verboseLevel,
        isLogOn,
        referenceRelativePathLevel,
        referenceContainsMacrosLevel,
        referenceFileFoundLevel,
        referenceFileNotFoundLevel,
        fragmentParentLevel,
        iniErrors
    } = config);
}
// Load on startup
loadExcludeConfig();
//#endregion
// ─────────────────────────────────────────────────────────────────────────────────
//#region Utility Functions: Escape special regex characters
function escapeRegex(str) {
    try {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    } catch { return null; }
}
// ─────────────────────────────────────────────────────────────────────────────────
function getDiagnostics(documentUri) {
    return vscode.languages.getDiagnostics(documentUri);
    // → returns an array of vscode.Diagnostic for that URI, whatever the source
    // union, already merged, as a flat array of vscode.Diagnostic
}
vscode.languages.onDidChangeDiagnostics((event) => {
    for (const uri of event.uris) {
        const diags = vscode.languages.getDiagnostics(uri);
        // do something, e.g. update ParserStateBar based on diags.length
    }
});

/**
 * Yields provider work back to the extension host event loop.
 *
 * @returns {Promise<void>}
 */
function yieldToEventLoop() {
    return new Promise(resolve => setImmediate(resolve));
}

/**
 * Checks whether a path exists without blocking the extension host.
 *
 * @param {string} filePath Path to check.
 * @returns {Promise<boolean>} True when the path exists.
 */
async function pathExists(filePath) {
    try {
        await fs.promises.access(filePath);
        return true;
    } catch {
        return false;
    }
}

/**
 * Searches for a file from the starting directory upward.
 *
 * @param {string} startDir Directory to start from.
 * @param {string} filePath Relative file path to locate.
 * @param {vscode.CancellationToken} [token] Optional cancellation token.
 * @returns {Promise<{foundPath: string|null, directLinkValid: boolean, stepsUpward: number}>}
 */
async function findFileWalkingUp(startDir, filePath, token) {
    let dir = startDir;
    const root = path.parse(dir).root; // e.g. "D:\"
    let directLinkValid = true;
    let stepsUpward = 0;
    while (true) {
        if (token?.isCancellationRequested) {
            return { foundPath: null, directLinkValid: false, stepsUpward };
        }
        logger.info(null, `Next candidate: ${dir}, and ${filePath}`); // Debug only
        const candidate = path.resolve(dir, filePath).replace(/\//g, '\\');
        if (await pathExists(candidate)) {
            return { foundPath: candidate, directLinkValid, stepsUpward };
        }
        // Stop if we've reached the root
        if (dir === root || dir === path.dirname(dir)) {
            return { foundPath: null, directLinkValid: false, stepsUpward };
        }
        // Walk up one level
        dir = path.dirname(dir);
        stepsUpward++
        directLinkValid = false;
    }
}
//#endregion
// ─────────────────────────────────────────────────────────────────────────────────
/**
 * Builds a table of zero-based line start offsets for a text buffer.
 *
 * @param {string} text Text to inspect.
 * @returns {number[]} Line start offsets.
 */
function getLineStarts(text) {
    const lineStarts = [0];

    for (let i = 0; i < text.length; i++) {
        if (text.charCodeAt(i) === 10) {
            lineStarts.push(i + 1);
        }
    }

    return lineStarts;
}

/**
 * Converts a text offset to a VS Code position without opening a document.
 *
 * @param {string} text Text to inspect.
 * @param {number[]} lineStarts Line start offsets.
 * @param {number} offset Text offset.
 * @returns {vscode.Position} Position for the offset.
 */
function positionAtTextOffset(text, lineStarts, offset) {
    const boundedOffset = Math.max(0, Math.min(offset, text.length));
    let low = 0;
    let high = lineStarts.length - 1;

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const start = lineStarts[mid];
        const nextStart = mid + 1 < lineStarts.length ? lineStarts[mid + 1] : text.length + 1;

        if (boundedOffset < start) {
            high = mid - 1;
        } else if (boundedOffset >= nextStart) {
            low = mid + 1;
        } else {
            return new vscode.Position(mid, boundedOffset - start);
        }
    }

    const lastLine = Math.max(0, lineStarts.length - 1);
    return new vscode.Position(lastLine, boundedOffset - lineStarts[lastLine]);
}

// Search all .MyDc / .MyD files in the workspace for a regex pattern.
async function searchWorkspace(pattern, token) {
    // Returns an array of vscode.Location objects.
    const locations = [];

    // Find every MyDefrag script file on disk
    const uris = await vscode.workspace.findFiles('**/*.{MyDc,MyD}', '**/node_modules/**');

    for (const uri of uris) {
        if (token?.isCancellationRequested) {
            return locations;
        }

        const relPath = vscode.workspace.asRelativePath(uri);
        if (util.isExcluded(relPath, excludeConfig, logger)) {
            continue;
        }

        let text;
        try {
            const bytes = await vscode.workspace.fs.readFile(uri);
            text = Buffer.from(bytes).toString('utf8');
        } catch (errResult) {
            logger?.warn?.(`searchWorkspace: Unable to read ${uri.toString()}: ${errResult.message}`);
            continue;
        }

        const lineStarts = getLineStarts(text);
        let match;

        // Reset lastIndex each call since we reuse the regex
        pattern.lastIndex = 0;

        while ((match = pattern.exec(text)) !== null) {
            // Highlight just the variable name, not the whole match
            const nameIndex = match.index + match[0].indexOf(match[1]);
            const start = positionAtTextOffset(text, lineStarts, nameIndex);
            const end = positionAtTextOffset(text, lineStarts, nameIndex + match[1].length);
            locations.push(new vscode.Location(uri, new vscode.Range(start, end)));
        }

        await yieldToEventLoop();
    }

    return locations;
}
// ─────────────────────────────────────────────────────────────────────────────────
// Load log and user paths
function configureMyDefragPaths() {
    const settings = vscode.workspace.getConfiguration('mydfrg');

    paths.configurePaths({
        userDir: settings.get('userDir'),
        logDir: settings.get('logDir')
    });
}
// ─────────────────────────────────────────────────────────────────────────────────
//#region Extension activate/deactivate .Parse
// Notes for debugging:
// This is a client-side vscode.languages.registerDocumentLinkProvider call (not LSP-routed) and you only see one registration, the double-firing is almost certainly coming from VS Code itself calling provideDocumentLinks twice on open — which is normal/expected behavior in several common scenarios, not a bug in your registration.
// The usual causes, roughly in order of likelihood:
// Two events fire on file open: For example, onDidOpenTextDocument and the editor becoming visible.
// VS Code calls provideDocumentLinks ONCE when the document model is created/opened, and AGAIN when it's actually rendered in an editor pane (visible range changes, becomes the active editor, etc.). These are genuinely two separate triggers from VS Code's side — your provider isn't being registered twice, it's being invoked twice for legitimately different lifecycle events.

async function activate(context) {
    //#region declarations
    const path = require('path');
    const fs = require('fs');
    const uiLocale = vscode.env.language;

    configureMyDefragPaths();
    // const logDir = path.join(context.globalStorageUri.fsPath, "log");
    const logDir = paths.logDir;

    fs.mkdirSync(logDir, { recursive: true });

    // const logPaths = {
    //     client: path.join(logDir, "client.log"),
    //     server: path.join(logDir, "server.log"),
    //     parser: path.join(logDir, "parser.log")
    // };

    let filePath;
    let ext;
    let text;
    let relPath;

    let batLinkDebounceTimer = null;
    let batLinkDebounceValue = 15000;

    let diagnosticCollection;
    let linkChangeEmitter;
    let definitionProvider;
    let referenceProvider;
    let linkProvider;
    let previewDocumentSequence = 0;
    let openCmd;
    let batLinkProvider;
    let inlineCompletionProvider;
    let inlineCompletionRegistration;
    const featureToggleController = createFeatureToggleController({ vscode });
    const featureToggleCommands = featureToggleController.registerCommands();

    function isDiagnosticsDocument(document) {
        return document?.uri?.scheme === 'file' &&
            (document.languageId === 'mydfrg' || document.languageId === 'bat');
    }

    function clearClientDiagnostics() {
        diagnosticCollection.clear();

        for (const document of vscode.workspace.textDocuments) {
            if (isDiagnosticsDocument(document)) {
                diagnosticCollection.delete(document.uri);
            }
        }
    }

    function buildServerSettingsPayload() {
        const mydfrg = vscode.workspace.getConfiguration('mydfrg');

        return {
            mydfrg: {
                exclude: mydfrg.get('exclude') || [],
                debugOn: mydfrg.get('debugOn'),
                hoverEnabled: mydfrg.get('hoverEnabled'),
                verboseLevel: mydfrg.get('verboseLevel'),
                referenceRelativePathLevel: mydfrg.get('referenceRelativePathLevel'),
                referenceContainsMacros: mydfrg.get('referenceContainsMacros'),
                referenceFileFoundLevel: mydfrg.get('referenceFileFoundLevel'),
                referenceFileNotFoundLevel: mydfrg.get('referenceFileNotFoundLevel'),
                fragmentParentLevel: mydfrg.get('fragmentParentLevel')
            },
            files: {
                exclude: vscode.workspace.getConfiguration('files').get('exclude') || {}
            },
            search: {
                exclude: vscode.workspace.getConfiguration('search').get('exclude') || {}
            }
        };
    }

    // ========================================================================================
    //#endregion
    try { // ---- Initialization ----
        try { // VSCodium Settings Init
            applyMyDefragConfig(loadMyDefragConfig());
            await featureToggleController.sync(config);
        } catch (errResult) {
            const message = `extension.js:activate:settings:initialize Error returned from initialization: ${errResult.message}`;
            console?.error(message);
            throw new Error(message);
        }
        const tMessage = catalog.format("extension.log.activate.console.log.initDone.info").text;
        console?.log(tMessage)
        console?.log(`EXTENSION: config: ${config}`)
        console?.log(`iniData: ${iniData}`)
        try { // Logging Channel and Status Bar
            // ─────────────────────────────────────────────────────────────────────────────────
            connection = vscode.window.createOutputChannel(channelName);
            connection.show(true);
            connectionShown = true;
            //             // ─────────────────────────────────────────────────────────────────────────────────
            const loggedMessages = new Set();
            let headingDone = false;
            let source = "Extension";

            logger = Logger.createLogger(channelName, source, config, {
                outputChannel: connection,
                filePath: paths.client
            });
            if (iniErrors.length) { Logger.logArrayToConsole(logger, channelName, ini.severity.Warning, loggedMessages, iniErrors) }
            console?.log(iniData);
            const tMessage = catalog.format("extension.log.activate.logger.info").text;
            logger.info(null, tMessage);
            // ─────────────────────────────────────────────────────────────────────────────────
            ParserStateBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
            ParserStateBar.text = `MyDefrag Unknown document type`;
            ParserStateBar.show();
            context.subscriptions.push(ParserStateBar);
            logger.dbg(3, `  Settings source=VSCodium, Debug=${isDebugOn}`)

        } catch (errResult) {
             const message = `extension.js:activate Unexpected error in Logging Channel and Status Bar initialization: ${errResult.message}`;
            console?.error(message);
            logger?.err?.(errResult, message);   // output channel
            throw new Error(message);
        }
         logger.dbg(3, `  Channel, Status Bar done`)
    } catch (errResult) {
        const message = `extension.js:activate Unexpected error initializing extension: ${errResult.message}`;
        logger?.err?.(errResult, message);   // output channel
        console?.error(message);
        throw new Error(message);
    }
    // ─────────────────────────────────────────────────────────────────────────────────
    try { // Activate Create, Register ──────────────────────────────────────────────────
        // log
        connection.show(true);
        // ── Diagnostics ────────────────────────────────────────────────────────────────
        diagnosticCollection = vscode.languages.createDiagnosticCollection('mydfrg-links');
        context.subscriptions.push(diagnosticCollection);
        // ── Link detection and analysis ─────────────────────────────────────────────────
        linkChangeEmitter = new vscode.EventEmitter();
        // ── Go to Definition ──────────────────────────────────────────────────────────────
        // Triggered by F12 or right-click → Go to Definition.
        // Finds the SetVariable(VarName, ...) declaration for the word under cursor.
        definitionProvider = vscode.languages.registerDefinitionProvider(
            { language: 'mydfrg' },
            {
                async provideDefinition(document, position, token) {
                    const range = document.getWordRangeAtPosition(position, /\w+/);
                    if (!range) return;
                    const word = document.getText(range);

                    // Match: SetVariable(VarName  — capture group 1 = VarName
                    const pattern = new RegExp(
                        `SetVariable\\s*\\(\\s*(${escapeRegex(word)})\\s*,`,
                        'g'
                    );

                    const locations = await searchWorkspace(pattern, token);
                    return locations;   // single result jumps directly; multiple shows a picker
                }
            }
        );
        // ── Find All References ───────────────────────────────────────────────────────────
        // Triggered by Shift+F12 or right-click → Find All References.
        // Finds every place VarName appears: in SetVariable() and anywhere else it's used.
        referenceProvider = vscode.languages.registerReferenceProvider(
            { language: 'mydfrg' },
            {
                async provideReferences(document, position, context, token) {
                    const range = document.getWordRangeAtPosition(position, /\w+/);
                    if (!range) return;
                    const word = document.getText(range);

                    // Match any standalone occurrence of the word (as a whole word)
                    const pattern = new RegExp(`\\b(${escapeRegex(word)})\\b`, 'g');

                    const locations = await searchWorkspace(pattern, token);
                    return locations;
                }
            }
        );
        // ── Inline Completions ───────────────────────────────────────────────────────────
        inlineCompletionProvider = new CompletionPointProvider({
            vscode,
            languageData,
            logger,
            config,
            isEnabled: () => wordPredictionEnabled
        });
        inlineCompletionRegistration = vscode.languages.registerInlineCompletionItemProvider(
            { language: 'mydfrg' },
            {
                provideInlineCompletionItems(document, position, context, token) {
                    return inlineCompletionProvider.provide({
                        document,
                        position,
                        context,
                        token
                    });
                }
            }
        );
        logger.dbg(4, 'Inline completion provider registered');
        // ── Document Links (Ctrl+Click on includes) ─────────────────────────────
        // Triggered by Ctrl+Click or hovering the path in an !include "..."! line.
        // Resolves the relative path to an absolute URI so VSCodium can open it.
        linkProvider = vscode.languages.registerDocumentLinkProvider(
            { language: 'mydfrg' },
            {
                onDidChangeDocumentLinks: linkChangeEmitter.event,
                async provideDocumentLinks(document, token) {
                    await yieldToEventLoop();
                    if (token?.isCancellationRequested) {
                        return [];
                    }

                    // filePath = document.fileName;
                    const filePath = fileURLToPath(document.uri.toString());
                    const text = document.getText();
                    const relPath = vscode.workspace.asRelativePath(document.uri);
                    // Check if file is excluded
                    if (util.isExcluded(relPath, excludeConfig, logger)) {
                        diagnosticCollection.set(document.uri, []);
                        return [];
                    }
                    // Process file
                    if (verboseLevel >= 5) {
                        logger.info(null, `.`);
                        logger.info(null, `MYDC EXTENSION LINKS Provider for ${filePath}, language: mydfrg`);
                        if (verboseLevel >= 8) {
                            logger.info(null, 'provideDocumentLinks called for', document.uri.toString());
                            console.trace(); // shows the call stack — reveals if it's two different VS Code internal callers
                        }
                    }
                    const includeLinks = [];
                    const fileLinks = [];
                    const commandLinks = [];
                    const toZeroBased = (s) => parseInt(s) - 1;

                    // Internal trace diagnostics are for extension debugging only.
                    // They help connect extension-side failures to the active document
                    // without presenting the issue as a MyDefrag syntax error.
                    const internalDiagnostics = [];

                    const internalTraceEnabled = () => {
                        return Boolean(isDebugOn || verboseLevel >= 3);
                    };

                    const formatTraceContext = (traceContext = {}) => {
                        const entries = Object.entries(traceContext)
                            .filter(([, value]) => value !== undefined && value !== null && value !== '');

                        if (!entries.length) {
                            return '';
                        }

                        return entries
                            .map(([key, value]) => `${key}=${String(value)}`)
                            .join(', ');
                    };

                    const addInternalTraceDiagnostic = (message, traceContext = {}) => {
                        if (!internalTraceEnabled()) {
                            return;
                        }

                        const contextText = formatTraceContext(traceContext);
                        const fullMessage = contextText
                            ? `${message} (${contextText})`
                            : message;

                        const diagnostic = new vscode.Diagnostic(
                            new vscode.Range(
                                new vscode.Position(0, 0),
                                new vscode.Position(0, 0)
                            ),
                            fullMessage,
                            vscode.DiagnosticSeverity.Hint
                        );

                        diagnostic.source = 'mydfrg-internal';

                        internalDiagnostics.push(diagnostic);
                    };

                    const docLine = (i, traceContext = {}) => {
                        if (i >= 0 && i < document.lineCount) {
                            // valid line
                            return document.lineAt(i).text;
                        }

                        // error handling properties:
                        // caller
                        // source
                        // statement
                        // token
                        // lineNumber
                        // includeFile
                        // parentFile
                        const message =
                            `Internal trace: requested line ${i}, valid range is 0-${document.lineCount - 1}.`;

                        const mergedContext = {
                            source: 'DocumentLinkProvider',
                            caller: 'docLine',
                            uri: document.uri.toString(),
                            requestedLine: i,
                            lineCount: document.lineCount,
                            ...traceContext
                        };

                        console?.error?.(`${message} ${formatTraceContext(mergedContext)}`);
                        logger?.err?.(null, `${message} ${formatTraceContext(mergedContext)}`);

                        addInternalTraceDiagnostic(message, mergedContext);

                        return "";
                    };
                    const fullMatch = (match) => match[0];
                    const filePathMatch = (match) => match[1];
                    const line = (match) => toZeroBased(match[2]);
                    const col = (match) => toZeroBased(match[3]);
                    const collectedLinks = () => [
                        ...includeLinks,
                        ...fileLinks,
                        ...commandLinks
                    ];

                    // vscode.Uri.file() handles the path correctly on Windows
                    const target = (filePath, line, col) => vscode.Uri.parse(
                        `command:mdm.openFileAtPosition?${encodeURIComponent(
                            JSON.stringify(buildOpenFileCommandArguments(filePath, line, col))
                        )}`
                    );
                    const displayLine = (text, line) => {
                        try {
                            console?.log(`${text[line]}`);
                        } catch {
                            console?.error(`Invalid format: line: ${line}, text: ${text}`);
                        }
                    }
                    const displayMatch = (text, range) => {
                        try {
                            const line = range.start.line;
                            const textOut = text[range.start.line + range.start.character, range.end.line + range.end.character];
                        } catch {
                            console?.error(`Invalid format: range[${range.start.line}::${range.start.character}], text: ${text}`);
                        }
                    }
                    // ── Document INCLUDE Links ─────────────────────────────
                    const pattern = /!include\s+"([^"]+)"!/g;

                    logger.info(null, `Processing File: ${document.fileName}`);
                    let match;
                    let linkSet = false;

                    while ((match = pattern.exec(text)) !== null) {
                        if (token?.isCancellationRequested) {
                            return [];
                        }

                        const includePath = match[1];
                        const quoteStart = match.index + match[0].indexOf('"') + 1;
                        const start = document.positionAt(quoteStart);
                        const end = document.positionAt(quoteStart + includePath.length);
                        const range = new vscode.Range(start, end);
                        // normalize slashes
                        const normalised = includePath.replace(/\\/g, path.sep);
                        // resolve relative OR absolute
                        const targetPath = resolveDocumentLinkPath(document.fileName, normalised);
                        const lineText = docLine(range.start.line, {
                            caller: 'includeLink',
                            includeFile: includePath,
                            parentFile: document.uri.fsPath,
                            statement: match[0]
                        });

                        if (!hasDocumentLinkRange(collectedLinks(), range)) {
                            includeLinks.push(new vscode.DocumentLink(range, target(targetPath, 0, 0)));
                            logger.dbg(5, `INCLUDE file match: index: ${match.index}, range[${range.start.line}::${range.start.character}], ${match[0]}, ${lineText}`);
                        }
                        linkSet = true;
                    }
                    // logger.info(null, `Number of INCLUDE links: ${includeLinks.length}`);

                    // ── Document FILE Links ─────────────────────────────
                    const lineRe = /file:\/\/\/([^:\s]+):(\d+):(\d+)/g;
                    for (let i = 0; i < document.lineCount; i++) {
                        if (token?.isCancellationRequested) {
                            return [];
                        }

                        if (i > 0 && i % 100 === 0) {
                            await yieldToEventLoop();
                        }

                        const lineText = docLine(i, {
                            caller: 'fileUriLinkScan',
                            parentFile: document.uri.fsPath,
                            lineNumber: i
                        });
                        let match;
                        lineRe.lastIndex = 0;
                        while ((match = lineRe.exec(lineText)) !== null) {
                            const includePath = match[1];
                            const start = new vscode.Position(i, match.index);
                            const end = new vscode.Position(i, match.index + fullMatch(match).length);
                            const range = new vscode.Range(start, end);
                            const targetPath = resolveDocumentLinkPath(document.fileName, includePath);
                            if (!hasDocumentLinkRange(collectedLinks(), range)) {
                                fileLinks.push(new vscode.DocumentLink(
                                    range,
                                    target(targetPath, line(match), col(match))
                                ));
                                logger.dbg(5, `FILE file match: index: ${match.index}, range[${range.start.line}::${range.start.character}], ${match[0]}, ${docLine(range.start.line, {
                                    caller: 'fileUriLinkLog',
                                    includeFile: includePath,
                                    parentFile: document.uri.fsPath,
                                    statement: match[0]
                                })}`);
                            }
                        }
                    }
                    // logger.info(null, `Number of FILE links: ${fileLinks.length}`);

                    // ── Document BATCH/Command Links ─────────────────────────────
                    const execPattern = /\s*"([^"]*\.(?:bat|My\w+|cmd|exe|com)[^"]*)"\s*/gi;
                    while ((match = execPattern.exec(text)) !== null) {
                        if (token?.isCancellationRequested) {
                            return [];
                        }

                        const execPath = filePathMatch(match);
                        const quoteStart = text.indexOf('"', match.index) + 1; // skip past opening quote
                        const start = document.positionAt(quoteStart);
                        const end = document.positionAt(quoteStart + execPath.length);
                        const range = new vscode.Range(start, end);
                        const targetPath = resolveDocumentLinkPath(document.fileName, execPath);
                        if (!hasDocumentLinkRange(collectedLinks(), range)) {
                            commandLinks.push(new vscode.DocumentLink(range, target(targetPath, 0, 0)));
                            logger.dbg(5, `BATCH/Command file match: index: ${match.index}, range[${range.start.line}::${range.start.character}], ${match[0]}, ${docLine(range.start.line, {
                                caller: 'commandLinkLog',
                                includeFile: execPath,
                                parentFile: document.uri.fsPath,
                                statement: match[0]
                            })}`);
                        }
                    }
                    // logger.info(null, `Number of BATCH & command links: ${commandLinks.length}`);
                    // Finish 
                    logger.info(null, `includeLinks ${includeLinks.length}, fileLinks ${fileLinks.length}, commandLinks ${commandLinks.length}, EXCLUDED folders ${excludeConfig.folderCount}, files ${excludeConfig.fileCount}, search ${excludeConfig.searchCount}.`);
                    diagnosticCollection.set(document.uri, internalDiagnostics);
                    return [...includeLinks, ...fileLinks, ...commandLinks];
                    // return links;
                }
            }
        );
        // Command that actually opens the file at line/col
        openCmd = vscode.commands.registerCommand(
            "mdm.openFileAtPosition",
            async ({ path: filePath, line, col }) => {
                const uri = vscode.Uri.file(filePath);
                const doc = await vscode.workspace.openTextDocument(uri);
                const editor = await vscode.window.showTextDocument(doc);
                const pos = new vscode.Position(line, col);
                editor.selection = new vscode.Selection(pos, pos);
                editor.revealRange(new vscode.Range(pos, pos));
            }
        );
        // ─────────────────────────────────────────────────────────────────────────────────
        //#region BAT Link Provider ───────────────────────────────────────────────────────
        batLinkProvider = vscode.languages.registerDocumentLinkProvider(
            { language: 'bat' },
            {
                onDidChangeDocumentLinks: linkChangeEmitter.event,
                async provideDocumentLinks(document, token) {
                    await yieldToEventLoop();
                    if (token?.isCancellationRequested) {
                        return [];
                    }

                    const filePath = fileURLToPath(document.uri.toString());
                    const text = document.getText();
                    const relPath = vscode.workspace.asRelativePath(document.uri);
                    if (util.isExcluded(relPath, excludeConfig, logger)) {
                        diagnosticCollection.set(document.uri, []);
                        return [];
                    }

                    logger.info(null, `MYDC EXTENSION BATCH LINK Provider for ${filePath}, language: mydfrg`);
                    const batchFileCommandLinks = [];
                    let diagnostics = [];
                    const currentDir = path.dirname(document.uri.fsPath);
                    let headingDone = false;
                    let headingText = '\n.\n' + `------------ File: (${document.uri.fsPath}) ------------\n.\n`;

                    const execPattern = /\s*"([^"\s]*\.(?:bat|My\w+|cmd|exe|com))([^"]*)"\s*/gi;
                    let match;

                    while ((match = execPattern.exec(text)) !== null) {
                        if (token?.isCancellationRequested) {
                            return [];
                        }

                        if (!headingDone) {
                            logger.info(null, headingText + '\n.\n');
                            headingDone = true;
                        }
                        const filePath = match[1];
                        const quoteStart = text.indexOf('"', match.index) + 1;
                        const start = document.positionAt(quoteStart);
                        const end = document.positionAt(quoteStart + filePath.length);
                        const range = new vscode.Range(start, end);
                        const absolutePath = path.resolve(currentDir, filePath).replace(/\//g, '\\');
                        const absoluteUri = vscode.Uri.file(absolutePath);
                        const dir = path.dirname(absolutePath);
                        const base = path.basename(absolutePath);
                        const tMessage17 = catalog.format("extension.log.activate.provideDocumentLinks.logger.dbg.fileNameIs.structural").text;
                        logger.dbg(3, tMessage17, filePath, `)`);
                        logger.info(null, `BATCH file match: index: ${match.index}, range[${range.start.line}::${range.start.character}], ${match[0]}, ${match[1]}, ${match}`);
                        const lineNum = start.line + 1;
                        const colNum = start.character + 1;
                        const hasMacro = (filePath.match(/!/g) || []).length >= 2;

                        // Validate file (and search upward when missing)
                        const { foundPath, directLinkValid, stepsUpward } = await findFileWalkingUp(currentDir, filePath, token);
                        if (token?.isCancellationRequested) {
                            return [];
                        }

                        const tMessage16 = catalog.format("extension.log.activate.provideDocumentLinks.batMessage.noMessageAvailable.message").text;
                        let batMessage = tMessage16;
                        let severity = 4;
                        if (foundPath) {
                            const tMessage15 = catalog.format("extension.log.activate.provideDocumentLinks.logger.dbg.referencerelativepathlevelReferencerelativepathlevel.text", { referenceRelativePathLevel }).text;
                            logger.dbg(5, tMessage15)
                            if (!directLinkValid) {
                                const tMessage14 = catalog.format("extension.warning.activate.provideDocumentLinks.batLinkFoundInParentStepsupward.error", { stepsUpward }).text;
                                batMessage = tMessage14
                                severity = referenceRelativePathLevel;
                            } else {
                                batMessage = `${document.uri.fsPath}:${lineNum}:${colNum}: Link target found: ${foundPath}`;
                                severity = referenceFileFoundLevel;
                            }
                        } else {
                            if (hasMacro) {
                                const tMessage13 = catalog.format("extension.warning.activate.provideDocumentLinks.batLinkContainsExecutionTimeMacros.structural", { filePath }).text;
                                batMessage = tMessage13;
                                severity = referenceContainsMacrosLevel;
                            } else {
                                const tMessage12 = catalog.format("extension.warning.activate.provideDocumentLinks.batLinkFileNotFoundFilepath.structural", { filePath }).text;
                                batMessage = tMessage12;
                                severity = referenceFileNotFoundLevel;
                            }
                        }
                        let thisSeverity = severity;
                        if (thisSeverity - 4 > verboseLevel) { thisSeverity = -1 }
                        if (thisSeverity > 4) { thisSeverity = 4 }
                        if (thisSeverity > 0) {
                            const diagnostic = new vscode.Diagnostic({
                                severity: thisseverity,
                                range: range,
                                message: batMessage,
                                source: 'MyDefrag',
                            });
                            diagnostics.push(diagnostic);
                        }
                        if (thisSeverity >= 0) {
                            if (!loggedMessages.has(batMessage)) {
                                loggedMessages.add(batMessage);
                                logger.message(thisSeverity, batMessage)
                                // logger.info(null, batMessage + '\n.\n');
                            }
                        }
                        // For debugging only, formatted for console?.log
                        logger.dbg(5, '  dir:', dir);
                        logger.dbg(5, '  base:', base);
                        logger.dbg(5, '  our filename:', base);
                        logger.dbg(5, '  currentDir:', currentDir);
                        logger.dbg(5, '  absolutePath: (', absolutePath, ')');
                        logger.dbg(5, '  absoluteUri:', absoluteUri);
                        logger.dbg(6, '      match.index:', match.index);
                        logger.dbg(6, '      filePath:', filePath);
                        logger.dbg(6, '      quoteStart:', quoteStart);
                        logger.dbg(6, '      start:', start);
                        logger.dbg(6, '      end:', end);
                        logger.dbg(6, '      absolutePath:', absolutePath);
                        logger.dbg(6, '      range:', range);
                        batchFileCommandLinks.push(new vscode.DocumentLink(range, vscode.Uri.file(absolutePath)));
                    }

                    logger.info(null, `Number of BATCH batchFileCommandLinks: ${commandLinks.length}`);
                    diagnosticCollection.set(document.uri, diagnostics);
                    return batchFileCommandLinks;
                }
            }
        );

    } catch (errResult) {
        console?.error(`extension.js:activate Unexpected error activating extension: ${errResult.message}`);
    }
    // ─────────────────────────────────────────────────────────────────────────────────
    // Configure folders
    const configureFolders = vscode.commands.registerCommand(
        'mydfrg.configureFolders',
        async () => {
            const settings = vscode.workspace.getConfiguration('mydfrg');

            const choice = await vscode.window.showQuickPick(
                [
                    {
                        label: 'User Directory',
                        setting: 'userDir',
                        description: settings.get('userDir') || '.user'
                    },
                    {
                        label: 'Log Directory',
                        setting: 'logDir',
                        description: settings.get('logDir') || '.user/logs'
                    }
                ],
                {
                    title: 'MyDefrag: Configure Folders',
                    placeHolder: 'Select the folder setting to update'
                }
            );

            if (!choice) {
                return;
            }

            const currentValue = settings.get(choice.setting) || paths.DEFAULTS[choice.setting];
            const resolvedPath = paths.resolveFromProjectRoot
                ? paths.resolveFromProjectRoot(currentValue)
                : path.isAbsolute(currentValue)
                    ? currentValue
                    : path.join(paths.projectRoot, currentValue);

            const selected = await vscode.window.showOpenDialog({
                title: `Select ${choice.label}`,
                defaultUri: vscode.Uri.file(resolvedPath),
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false
            });

            if (!selected || selected.length === 0) {
                return;
            }

            await settings.update(
                choice.setting,
                selected[0].fsPath,
                vscode.ConfigurationTarget.Workspace
            );

            vscode.window.showInformationMessage(
                `MyDefrag: ${choice.label} set to ${selected[0].fsPath}`
            );

            configureMyDefragPaths();
            paths.ensureDirectories();

        }
    );
    // ─────────────────────────────────────────────────────────────────────────────────
    // Open Settings
    const openSettings = vscode.commands.registerCommand(
        'mydfrg.openSettings',
        async () => {
            await vscode.commands.executeCommand(
                'workbench.action.openSettings',
                '@ext:macrodm.mydefrag-syntax'
            );
        }
    );
    // ─────────────────────────────────────────────────────────────────────────────────
    //#region Open Preview Provider  ───────────────────────────────────────────────────────
    function generatePreview(sourcePath, modeId = DEFAULT_PREVIEW_MODE) {
        getPreviewMode(modeId);
        const preprocessScript = path.join(
            __dirname,
            'preprocess',
            'mydefrag-preprocess.js'
        );
        try { // ── Open Preview Provider  ───────────────────────────────────────────────────────
            const result = cp.spawnSync(
                process.execPath,
                [
                    preprocessScript,
                    sourcePath,
                    '--mode',
                    modeId,
                ],
                {
                    cwd: path.dirname(sourcePath),
                    encoding: 'utf8',
                    maxBuffer: 1024 * 1024 * 50
                }
            );
            const stderr = result.stderr ? result.stderr.toString() : '';
            const stdout = result.stdout ? result.stdout.toString() : '';
            // result.stdout
            // result.stderr
            // result.error
            // result.status
            // ─────────────────────────────────────────────────────────────────────────────────
            // Error Handling  ─────────────────────────────────────────────────────────────────
            if (result.error) {
                const nextMessage = `ERROR: Preview generation failed:\n\n${result.error.message}`;
                logger.err(null, nextMessage)
                return `${nextMessage}`;
            }
            if (result.status !== 0) {
                // const tMessage11 = catalog.format("extension.log.activate.generatePreview.result.status.previewProcessorExitedWithStatusResult.status", result.status).text;
                const failureDetail = stderr.trim() || catalog.format("extension.log.activate.generatePreview.result.status.previewProcessorExitedWithStatusResult.status", result.status).text;
                const tMessage10 = catalog.format("extension.log.activate.generatePreview.nextMessage.errorPreviewGenerationFailed.text", { failureDetail }).text;
                const nextMessage = tMessage10;
                logger.err(null, nextMessage);
                return nextMessage;
            }
            if (stderr.length) {
                const tMessage9 = catalog.format("extension.log.activate.generatePreview.logger.dbg.previewProcessorDiagnosticsStderr.text", { stderr }).text;
                logger.dbg(8, tMessage9);
            }
            const tMessage8 = catalog.format("extension.log.activate.generatePreview.logger.info.finishedPreviewSummary.info").text;
            logger.info(null, tMessage8)
            if (!stdout.length) {
                const tMessage7 = catalog.format("extension.message.activate.generatePreview.GenerationProducedNoContent.text").text;
                const nextMessage = tMessage7;
                logger.err(null, nextMessage);
                return nextMessage;
            }
            // ─────────────────────────────────────────────────────────────────────────────────
            return stdout;
            // ─────────────────────────────────────────────────────────────────────────────────
        } catch (errResult) {
            const message = `extension.js:activate:generatePreview: Unexpected error Generating Preview of document: ${errResult.message}`;
            logger.err(errResult, message);
            return message;
        }
    }
    // ─────────────────────────────────────────────────────────────────────────────────
    // ── Open Preview Function ───────────────────────────────────────────────────────
    async function openPreview(uri, modeId = DEFAULT_PREVIEW_MODE) {
        const mode = getPreviewMode(modeId);
        const editor = vscode.window.activeTextEditor;
        let sourceUri = uri || (editor && editor.document.uri);
        if (!sourceUri) {
            const tMessage = catalog.format("extension.message.noActiveDocument.warning").text;
            vscode.window.showWarningMessage(tMessage);
            return;
        }
        if (
            sourceUri.scheme === PREVIEW_SCHEME
            && new URLSearchParams(sourceUri.query).has('source')
        ) {
            sourceUri = vscode.Uri.parse(parsePreviewQuery(sourceUri.query).source);
        }
        const previewPath = buildPreviewDocumentPath(sourceUri.path, mode.id);
        const previewUri = sourceUri.with({
            scheme: PREVIEW_SCHEME,
            path: previewPath,
            query: buildPreviewQuery(
                sourceUri.toString(),
                mode.id,
                `${Date.now()}-${previewDocumentSequence += 1}`
            ),
            fragment: ''
        });
        const previewContent = generatePreview(sourceUri.fsPath, mode.id);
        let doc = await vscode.workspace.openTextDocument(previewUri);
        doc = await vscode.languages.setTextDocumentLanguage(
            doc,
            mode.executable ? 'mydfrg' : 'plaintext'
        );
        const edit = new vscode.WorkspaceEdit();
        edit.insert(doc.uri, new vscode.Position(0, 0), previewContent);
        const applied = await vscode.workspace.applyEdit(edit);
        if (!applied) {
            throw new Error(`Unable to populate editable preview: ${doc.uri.toString()}`);
        }
        await vscode.window.showTextDocument(
            doc,
            vscode.ViewColumn.Active
        );
    }
    const openPreviewCommand = vscode.commands.registerCommand(
        'mydfrg.openPreview',
        uri => openPreview(uri, DEFAULT_PREVIEW_MODE)
    );
    const previewModeCommands = PREVIEW_MODES.map(mode =>
        vscode.commands.registerCommand(
            mode.command,
            uri => openPreview(uri, mode.id)
        )
    );
    // ─────────────────────────────────────────────────────────────────────────────────
    // Register Diagnostic Explorer
    const diagnosticNavigation = registerDiagnosticNavigation(context);

    const tMessage5 = catalog.format("extension.log.activate.console.log.initDoneCreatingAndRegisteringClient.info").text;
    console?.log(tMessage5)
    //#endregion
    // ─────────────────────────────────────────────────────────────────────────────────
    // Listen for document changes and fire the emitter
    const docChangeListener = vscode.workspace.onDidChangeTextDocument(e => {
        if (e.document.languageId === 'bat') {
            // Clear any pending timer
            if (batLinkDebounceTimer) {
                clearTimeout(batLinkDebounceTimer);
            }
            // Wait 500ms after last keystroke before firing
            batLinkDebounceTimer = setTimeout(() => {
                loggedMessages.clear();
                linkChangeEmitter.fire();
                batLinkDebounceTimer = null;
            }, batLinkDebounceValue);
        } else if (e.document.languageId === 'mydfrg') {
            // loggedMessages.clear();
            diagnosticCollection.delete(e.document.uri);
            linkChangeEmitter.fire();
        }
    });

    const docCloseListener = vscode.workspace.onDidCloseTextDocument(document => {
        if (document.languageId === 'mydfrg') {
            diagnosticCollection.delete(document.uri);
        }
    });

    // ─────────────────────────────────────────────────────────────────────────────────
    // Start the language server
    const serverModule = context.asAbsolutePath(path.join('src', 'server', 'server.js'));
    // The debug options for the server
    // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
    let debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };
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
                // execArgv: ['--inspect-brk=6009']
                // execArgv: ['--inspect=6009']
                // , "--inspect-brk=9229",
            }
        }
    };
    const clientOptions = {
        documentSelector: createLanguageClientDocumentSelector(),
        markdown: {
            isTrusted: createHelpCommandTrust()
        },
        synchronize: {
            fileEvents: vscode.workspace.createFileSystemWatcher('**/*.{MyDc,mydc,MYDC,MyD,myd,MYD}'),
            configurationSection: ['mydfrg', 'files', 'search']
        },
        initializationOptions: {
            locale: vscode.env.language,
            config: config,
            excludes: excludeConfig,
            paths: paths
            //  {
            //     mydfrgExcludes: vscode.workspace.getConfiguration('mydfrg').get('exclude') || [],
            //     fileExcludes: vscode.workspace.getConfiguration('files').get('exclude') || {},
            //     searchExcludes: vscode.workspace.getConfiguration('search').get('exclude') || {}
            // }
        }
    };

    client = new LanguageClient(
        'mydfrg',
        catalog.format("extension.message.activate.mydefragLanguageClient.text").text,
        serverOptions,
        clientOptions
    );
    client.onNotification('mydefrag/log', (msg) => {
        if (msg?.message) {
            connection?.appendLine?.(msg.message);
        }
    });
    client.onNotification('mydfrg/diagnosticsSnapshotChanged', async () => {
        await diagnosticNavigation?.refresh?.();
    });
    const settingsChangeListener = vscode.workspace.onDidChangeConfiguration(async event => {
        if (
            event.affectsConfiguration('mydfrg') ||
            event.affectsConfiguration('files.exclude') ||
            event.affectsConfiguration('search.exclude')
        ) {
            loadExcludeConfig();
            applyMyDefragConfig(loadMyDefragConfig());
            await featureToggleController.sync(config);

            logger = Logger.createLogger(channelName, source, config, {
                outputChannel: connection,
                filePath: paths.client
            });

            clearClientDiagnostics();

            loggedMessages.clear();
            linkChangeEmitter.fire();

            await vscode.commands.executeCommand('mydfrg.diagnostics.refresh');
        }
    });
    // ─────────────────────────────────────────────────────────────────────────────────
    // Push Subscriptions
    const tMessage4 = catalog.format("extension.message.activate.logger.dbg.subscribingToProviders.text").text;
    logger.dbg(5, tMessage4);
    context.subscriptions.push(definitionProvider);
    context.subscriptions.push(referenceProvider);
    context.subscriptions.push(inlineCompletionRegistration);
    context.subscriptions.push(...featureToggleCommands);
    context.subscriptions.push(linkProvider);
    context.subscriptions.push(batLinkProvider);
    context.subscriptions.push(openPreviewCommand);
    context.subscriptions.push(...previewModeCommands);
    context.subscriptions.push(openCmd);
    context.subscriptions.push(configureFolders);
    context.subscriptions.push(openSettings);
    context.subscriptions.push(docChangeListener, docCloseListener, linkChangeEmitter);
    context.subscriptions.push(settingsChangeListener);
    context.subscriptions.push(client);
    const tMessage3 = catalog.format("extension.message.activate.logger.dbg.providersRegistered.text").text;
    logger.dbg(5, tMessage3);

    // ─────────────────────────────────────────────────────────────────────────────────
    const tMessage2 = catalog.format("extension.message.activate.logger.dbg.startingServerChannelname.text", { channelName }).text;
    logger.dbg(3, tMessage2)
    // await client.start(logger, iniData, config);
    client.start();

    // ─────────────────────────────────────────────────────────────────────────────────
    // connection.sendNotification('mydfrg/parserState', { uri: document.uri, state: parserState });
    // connection.sendDiagnostics({
    //     uri: document.uri,
    //     diagnostics
    // });
    client.onNotification('mydfrg/parserState', (params) => {
        const activeUri = vscode.window.activeTextEditor?.document.uri.toString();
        // params.uri === vscode.window.activeTextEditor?.document.uri.toString();
        if (params.uri !== activeUri) {
            return; // ignore updates for documents that aren't currently active
        }
        const labels = {
            0: catalog.format("extension.status.parser.script.text").text,
            1: catalog.format("extension.status.parser.fragment.text").text,
            2: catalog.format("extension.status.parser.unknown.text").text,
            myd: catalog.format("extension.status.parser.script.text").text,
            mydc: catalog.format("extension.status.parser.fragment.text").text,
            unknown: catalog.format("extension.status.parser.unknown.text").text
        };
        const tMessage = catalog.format("extension.status.parser.unknown.text").text;
        ParserStateBar.text = labels[params.state] ?? tMessage;
        ParserStateBar.show();
    });
}
// ─────────────────────────────────────────────────────────────────────────────────
function deactivate() {
    if (client) return client.stop();
}
//#endregion
// ─────────────────────────────────────────────────────────────────────────────────
module.exports = { activate, deactivate };
