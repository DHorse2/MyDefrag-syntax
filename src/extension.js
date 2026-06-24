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
const util = require('./utilities/util')
const Logger = require('./shared/logger');
const channelName = 'MyDefrag Syntax';
var isServer = false;
var ParserStateBar;
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
 * Converts a VSCodium setting value into an LSP diagnostic severity.
 *
 * @param {string|number} value The configured severity name or number.
 * @param {number} defaultValue The severity to use when the setting is invalid.
 * @returns {number} An LSP diagnostic severity value.
 */
function normalizeSeveritySetting(value, defaultValue) {
    const severityNames = {
        error: ini.severity.Error,
        warning: ini.severity.Warning,
        information: ini.severity.Information,
        info: ini.severity.Information,
        hint: ini.severity.Hint
    };
    const normalizedName = String(value ?? '').toLowerCase();
    const numericValue = Number(value);

    if (Number.isFinite(numericValue) && numericValue >= 0 && numericValue <= 4) {
        return numericValue;
    }

    return severityNames[normalizedName] ?? defaultValue;
}

/**
 * Reads MyDefrag extension settings from the VSCodium configuration API.
 *
 * @returns {object} Normalized MyDefrag extension configuration.
 */
function loadMyDefragConfig() {
    const settings = vscode.workspace.getConfiguration('mydfrg');
    const configuredVerboseLevel = Number(settings.get('verboseLevel'));
    const nextVerboseLevel = Number.isFinite(configuredVerboseLevel)
        ? Math.min(Math.max(configuredVerboseLevel, 0), 10)
        : 5;

    return {
        source,
        iniData: {
            severity: ini.severity
        },
        isDebugOn: Boolean(settings.get('debugOn')),
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

function findFileWalkingUp(startDir, filePath) {
    let dir = startDir;
    const root = path.parse(dir).root; // e.g. "D:\"
    let directLinkValid = true;
    let stepsUpward = 0;
    while (true) {
        logger.info(`Next candidate: ${dir}, and ${filePath}`); // Debug only
        const candidate = path.resolve(dir, filePath).replace(/\//g, '\\');
        if (fs.existsSync(candidate)) {
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
// Search all .MyDc / .MyD files in the workspace for a regex pattern.
async function searchWorkspace(pattern) {
    // Returns an array of vscode.Location objects.
    const locations = [];

    // Find every MyDefrag script file on disk
    const uris = await vscode.workspace.findFiles('**/*.{MyDc,MyD}', '**/node_modules/**');

    for (const uri of uris) {
        const doc = await vscode.workspace.openTextDocument(uri);
        const text = doc.getText();
        let match;

        // Reset lastIndex each call since we reuse the regex
        pattern.lastIndex = 0;

        while ((match = pattern.exec(text)) !== null) {
            const pos = doc.positionAt(match.index);
            // Highlight just the variable name, not the whole match
            const nameIndex = match.index + match[0].indexOf(match[1]);
            const start = doc.positionAt(nameIndex);
            const end = doc.positionAt(nameIndex + match[1].length);
            locations.push(new vscode.Location(uri, new vscode.Range(start, end)));
        }
    }

    return locations;
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

    const logDir = path.join(context.globalStorageUri.fsPath, "log");
    fs.mkdirSync(logDir, { recursive: true });

    const logPaths = {
        client: path.join(logDir, "client.log"),
        server: path.join(logDir, "server.log"),
        parser: path.join(logDir, "parser.log")
    };

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
    let providerRegistration;
    let openCmd;
    let batLinkProvider;
    //#endregion
    try { // ---- Initialization ----
        try { // VSCodium Settings Init
            applyMyDefragConfig(loadMyDefragConfig());
        } catch (errResult) {
            const message = `extension.js:activate:settings:initialize Error returned from initialization: ${errResult.message}`;
            console?.error(message);
            throw new Error(message);
        }
        console?.log("init done")
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
                filePath: logPaths.client
            });
            if (iniErrors.length) { Logger.logArrayToConsole(logger, channelName, ini.severity.Warning, loggedMessages, iniErrors) }
            console?.log(iniData);
            logger.info("MYDC EXTENSION INITIALIZED");
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
                async provideDefinition(document, position) {
                    const range = document.getWordRangeAtPosition(position, /\w+/);
                    if (!range) return;
                    const word = document.getText(range);

                    // Match: SetVariable(VarName  — capture group 1 = VarName
                    const pattern = new RegExp(
                        `SetVariable\\s*\\(\\s*(${escapeRegex(word)})\\s*,`,
                        'g'
                    );

                    const locations = await searchWorkspace(pattern);
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
                async provideReferences(document, position, context) {
                    const range = document.getWordRangeAtPosition(position, /\w+/);
                    if (!range) return;
                    const word = document.getText(range);

                    // Match any standalone occurrence of the word (as a whole word)
                    const pattern = new RegExp(`\\b(${escapeRegex(word)})\\b`, 'g');

                    const locations = await searchWorkspace(pattern);
                    return locations;
                }
            }
        );
        // ── Document Links (Ctrl+Click on includes) ─────────────────────────────
        // Triggered by Ctrl+Click or hovering the path in an !include "..."! line.
        // Resolves the relative path to an absolute URI so VSCodium can open it.
        linkProvider = vscode.languages.registerDocumentLinkProvider(
            { language: 'mydfrg' },
            {
                onDidChangeDocumentLinks: linkChangeEmitter.event,
                provideDocumentLinks(document) {
                    // filePath = document.fileName;
                    filePath = fileURLToPath(document.uri.toString());
                    ext = path.extname(filePath).toLowerCase();
                    text = document.getText();
                    relPath = vscode.workspace.asRelativePath(document.uri);
                    // Check if file is excluded
                    if (util.isExcluded(relPath, excludeConfig, logger)) {
                        diagnosticCollection.set(document.uri, []);
                        return [];
                    }
                    // Process file
                    if (verboseLevel >= 5) {
                        logger.info(`.`);
                        logger.info(`MYDC EXTENSION LINKS Provider for ${filePath}, language: mydfrg`);
                        if (verboseLevel >= 8) {
                            logger.info('provideDocumentLinks called for', document.uri.toString());
                            console.trace(); // shows the call stack — reveals if it's two different VS Code internal callers
                        }
                    }
                    includeLinks = [];
                    fileLinks = [];
                    commandLinks = [];
                    let isDuplicate = false;
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
                    const currentDir = () => path.dirname(document.uri.fsPath);
                    const absolutePath = (currentDir, filePath) => path.resolve(document.fileName, filePath);

                    // vscode.Uri.file() handles the path correctly on Windows
                    const target = (filePath, line, col) => vscode.Uri.parse(
                        `command:mdm.openFileAtPosition?${encodeURIComponent(
                            JSON.stringify({ path: filePath, line, col })
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

                    logger.info(`Processing File: ${document.fileName}`);
                    let match;
                    let linkSet = false;

                    while ((match = pattern.exec(text)) !== null) {
                        const includePath = match[1];
                        const quoteStart = match.index + match[0].indexOf('"') + 1;
                        const start = document.positionAt(quoteStart);
                        const end = new vscode.Position(start.line, match.index + fullMatch(match).length);
                        const range = new vscode.Range(start, end);
                        // normalize slashes
                        const normalised = includePath.replace(/\\/g, path.sep);
                        // resolve relative OR absolute
                        const targetUri = vscode.Uri.file(absolutePath(currentDir, includePath));
                        const lineText = docLine(range.start.line, {
                            caller: 'includeLink',
                            includeFile: includePath,
                            parentFile: document.uri.fsPath,
                            statement: match[0]
                        });

                        isDuplicate = includeLinks.some(link =>
                            link.range.start.line === start.line &&
                            link.range.start.character === start &&
                            link.range.end.character === end
                        );
                        if (!isDuplicate) {
                            includeLinks.push(new vscode.DocumentLink(range, target(targetUri, start.line, start)));
                            logger.dbg(5, `INCLUDE file match: index: ${match.index}, range[${range.start.line}::${range.start.character}], ${match[0]}, ${lineText}`);
                        }
                        linkSet = true;
                    }
                    // logger.info(`Number of INCLUDE links: ${includeLinks.length}`);

                    // ── Document FILE Links ─────────────────────────────
                    const lineRe = /file:\/\/\/([^:\s]+):(\d+):(\d+)/g;
                    for (let i = 0; i < document.lineCount; i++) {
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
                            const targetUri = vscode.Uri.file(absolutePath(currentDir, includePath));
                            isDuplicate = fileLinks.some(link =>
                                link.range.start.line === i &&
                                link.range.start.character === start &&
                                link.range.end.character === end
                            );
                            if (!isDuplicate) {
                                fileLinks.push(new vscode.DocumentLink(range, target(targetUri, i, start)));
                                logger.dbg(5, `FILE file match: index: ${match.index}, range[${range.start.line}::${range.start.character}], ${match[0]}, ${docLine(range.start.line, {
                                    caller: 'fileUriLinkLog',
                                    includeFile: includePath,
                                    parentFile: document.uri.fsPath,
                                    statement: match[0]
                                })}`);
                            }
                        }
                    }
                    // logger.info(`Number of FILE links: ${fileLinks.length}`);

                    // ── Document BATCH/Command Links ─────────────────────────────
                    const execPattern = /\s*"([^"]*\.(?:bat|My\w+|cmd|exe|com)[^"]*)"\s*/gi;
                    while ((match = execPattern.exec(text)) !== null) {
                        const execPath = filePathMatch(match);
                        const quoteStart = text.indexOf('"', match.index) + 1; // skip past opening quote
                        const start = document.positionAt(quoteStart);
                        const end = document.positionAt(quoteStart + execPath.length);
                        const range = new vscode.Range(start, end);
                        const targetUri = vscode.Uri.file(absolutePath(currentDir, execPath));
                        isDuplicate = commandLinks.some(link =>
                            link.range.start.line === start.line &&
                            link.range.start.character === start &&
                            link.range.end.character === end
                        );
                        if (!isDuplicate) {
                            commandLinks.push(new vscode.DocumentLink(range, target(targetUri, start.line, start)));
                            logger.dbg(5, `BATCH/Command file match: index: ${match.index}, range[${range.start.line}::${range.start.character}], ${match[0]}, ${docLine(range.start.line, {
                                caller: 'commandLinkLog',
                                includeFile: execPath,
                                parentFile: document.uri.fsPath,
                                statement: match[0]
                            })}`);
                        }
                    }
                    // logger.info(`Number of BATCH & command links: ${commandLinks.length}`);
                    // Finish 
                    logger.info(`includeLinks ${includeLinks.length}, fileLinks ${fileLinks.length}, commandLinks ${commandLinks.length}, EXCLUDED folders ${excludeConfig.folderCount}, files ${excludeConfig.fileCount}, search ${excludeConfig.searchCount}.`);
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
                provideDocumentLinks(document) {
                    filePath = fileURLToPath(document.uri.toString());
                    ext = path.extname(filePath).toLowerCase();
                    text = document.getText();
                    relPath = vscode.workspace.asRelativePath(document.uri);
                    if (util.isExcluded(relPath, excludeConfig, logger)) {
                        diagnosticCollection.set(document.uri, []);
                        return [];
                    }

                    logger.info(`MYDC EXTENSION BATCH LINK Provider for ${filePath}, language: mydfrg`);
                    batchFileCommandLinks = [];
                    let diagnostics = [];
                    const currentDir = path.dirname(document.uri.fsPath);
                    let headingDone = false;
                    let headingText = '\n.\n' + `------------ File: (${document.uri.fsPath}) ------------\n.\n`;

                    const execPattern = /\s*"([^"\s]*\.(?:bat|My\w+|cmd|exe|com))([^"]*)"\s*/gi;
                    let match;

                    while ((match = execPattern.exec(text)) !== null) {
                        if (!headingDone) {
                            logger.info(headingText + '\n.\n');
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
                        logger.dbg(3, `File name is: (`, filePath, `)`);
                        logger.info(`BATCH file match: index: ${match.index}, range[${range.start.line}::${range.start.character}], ${match[0]}, ${match[1]}, ${match}`);
                        const lineNum = start.line + 1;
                        const colNum = start.character + 1;
                        const hasMacro = (filePath.match(/!/g) || []).length >= 2;

                        // Validate file (and search upward when missing)
                        const { foundPath, directLinkValid, stepsUpward } = findFileWalkingUp(currentDir, filePath);
                        let batMessage = "No message available";
                        let severity = 4;
                        if (foundPath) {
                            logger.dbg(5, ` referenceRelativePathLevel: ${referenceRelativePathLevel}`)
                            if (!directLinkValid) {
                                batMessage = `BAT Link: Found in PARENT ${stepsUpward} steps up, possibly invalid.`
                                severity = referenceRelativePathLevel;
                            } else {
                                batMessage = `${document.uri.fsPath}:${lineNum}:${colNum}: Link target found: ${foundPath}`;
                                severity = referenceFileFoundLevel;
                            }
                        } else {
                            if (hasMacro) {
                                batMessage = `BAT Link: Contains execution time macros: ${filePath}`;
                                severity = referenceContainsMacrosLevel;
                            } else {
                                batMessage = `BAT Link: File not found: ${filePath}`;
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
                                // logger.info(batMessage + '\n.\n');
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

                    logger.info(`Number of BATCH batchFileCommandLinks: ${commandLinks.length}`);
                    diagnosticCollection.set(document.uri, diagnostics);
                    return batchFileCommandLinks;
                }
            }
        );

    } catch (errResult) {
        console?.error(`extension.js:activate Unexpected error activating extension: ${errResult.message}`);
    }
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
    function generatePreview(sourcePath) {
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
                ],
                {
                    cwd: path.dirname(sourcePath),
                    encoding: 'utf8',
                    maxBuffer: 1024 * 1024 * 50
                }
            );
            // result.stdout
            // result.stderr
            // result.error
            // result.status
            // ─────────────────────────────────────────────────────────────────────────────────
            // Send stderr to OUTPUT window  ───────────────────────────────────────────────────
            if (result.stderr.length) {
                logger.err(null, `Error, in preparing preview summary!`, result.stderr);
            } else {
                logger.info(`Finished preview summary!`)
            }
            // ─────────────────────────────────────────────────────────────────────────────────
            // Error Handling  ─────────────────────────────────────────────────────────────────
            if (result.error) {
                const nextMessage = `ERROR: Preview generation failed:\n\n${result.error.msg}`;
                logger.err(null, nextMessage)
                return `${nextMessage}`;
            }
            // ─────────────────────────────────────────────────────────────────────────────────
            return result.stdout.toString();
            // ─────────────────────────────────────────────────────────────────────────────────
        } catch (errResult) {
            const message = `extension.js:activate:generatePreview: Unexpected error Generating Preview of document: ${errResult.message}`;
            logger.err(errResult, message);
            return message;
        }
    }
    // ─────────────────────────────────────────────────────────────────────────────────
    // ───────────────── MyPreviewProvider ─────────────────────────────────────────────
    // ── Open Preview Function ───────────────────────────────────────────────────────
    const openPreviewCommand = vscode.commands.registerCommand(
        'mydfrg.openPreview',
        async (uri) => {
            const editor = vscode.window.activeTextEditor;
            const sourceUri = uri || (editor && editor.document.uri);
            if (!sourceUri) {
                vscode.window.showWarningMessage('No MyDefrag document is active.');
                return;
            }
            const mergedPath = sourceUri.fsPath.replace(/(\.\w+)$/, '.merged$1');
            const previewUri = vscode.Uri.parse(`mydfrg-preview:${mergedPath}`);
            const doc = await vscode.workspace.openTextDocument(previewUri);
            await vscode.window.showTextDocument(
                doc,
                vscode.ViewColumn.Active
            );
        }
    );
    class MyPreviewProvider {
        provideTextDocumentContent(uri) {
            const mergedPath = uri.fsPath;
            const sourcePath = mergedPath.replace(/\.merged(\.\w+)$/, '$1');
            logger.info(`Preview source: ${sourcePath}\n`);
            return generatePreview(sourcePath);
            // return generatePreview(uri.fsPath);
        }
    }
    const previewProvider = new MyPreviewProvider();

    // ─────────────────────────────────────────────────────────────────────────────────
    // Text Document Content Provider
    providerRegistration = vscode.workspace.registerTextDocumentContentProvider(
        'mydfrg-preview',
        previewProvider
    );

    console?.log("Init done, Creating and Registering Client")
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
            linkChangeEmitter.fire();
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
        documentSelector: [{ scheme: 'file', language: 'mydfrg' }],
        synchronize: {
            fileEvents: vscode.workspace.createFileSystemWatcher('**/*.{MyDc,mydc,MYDC,MyD,myd,MYD}'),
            configurationSection: ['mydfrg', 'files', 'search']
        },
        initializationOptions: {
            config: config,
            excludes: excludeConfig,
            logPaths: logPaths
            //  {
            //     mydfrgExcludes: vscode.workspace.getConfiguration('mydfrg').get('exclude') || [],
            //     fileExcludes: vscode.workspace.getConfiguration('files').get('exclude') || {},
            //     searchExcludes: vscode.workspace.getConfiguration('search').get('exclude') || {}
            // }
        }
    };

    const Client = new LanguageClient(
        'mydfrg',
        'MyDefrag Language Client',
        serverOptions,
        clientOptions
    );
    Client.onNotification('mydefrag/log', (msg) => {
        if (msg?.message) {
            connection?.appendLine?.(msg.message);
        }
    });
    const settingsChangeListener = vscode.workspace.onDidChangeConfiguration(event => {
        if (
            event.affectsConfiguration('mydfrg') ||
            event.affectsConfiguration('files.exclude') ||
            event.affectsConfiguration('search.exclude')
        ) {
            loadExcludeConfig();
            applyMyDefragConfig(loadMyDefragConfig());
            linkChangeEmitter.fire();
        }
    });
    // ─────────────────────────────────────────────────────────────────────────────────
    // Push Subscriptions
    logger.dbg(5, 'Subscribing to providers');
    context.subscriptions.push(providerRegistration);
    context.subscriptions.push(definitionProvider);
    context.subscriptions.push(referenceProvider);
    context.subscriptions.push(linkProvider);
    context.subscriptions.push(batLinkProvider);
    context.subscriptions.push(openPreviewCommand);
    context.subscriptions.push(openCmd);
    context.subscriptions.push(openSettings);
    context.subscriptions.push(docChangeListener, linkChangeEmitter);
    context.subscriptions.push(settingsChangeListener);
    context.subscriptions.push(Client);
    logger.dbg(5, 'Providers registered');

    // ─────────────────────────────────────────────────────────────────────────────────
    logger.dbg(3, `Starting server ${channelName}`)
    // await Client.start(logger, iniData, config);
    Client.start();

    // ─────────────────────────────────────────────────────────────────────────────────
    // connection.sendNotification('mydfrg/parserState', { uri: document.uri, state: parserState });
    // connection.sendDiagnostics({
    //     uri: document.uri,
    //     diagnostics
    // });
    Client.onNotification('mydefrag/parserStateChanged', (params) => {
        const activeUri = vscode.window.activeTextEditor?.document.uri.toString();
        // params.uri === vscode.window.activeTextEditor?.document.uri.toString();
        if (params.uri !== activeUri) {
            return; // ignore updates for documents that aren't currently active
        }
        const labels = {
            myd: 'MyDefrag Script (.myd)',
            mydc: 'MyDefrag Fragment (.mydc)',
            unknown: 'MyDefrag Unknown document type'
        };
        ParserStateBar.text = labels[params.state] ?? 'MyDefrag Unknown document type';
        ParserStateBar.show();
    });
}
// ─────────────────────────────────────────────────────────────────────────────────
function deactivate() {
    if (Client) return Client.stop();
}
//#endregion
// ─────────────────────────────────────────────────────────────────────────────────
module.exports = { activate, deactivate };
