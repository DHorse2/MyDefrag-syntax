'use strict';
// server.js
//#region Initialize server .Parse
const console = require('console');
console?.error('SERVER: entered server.js');
// debugger;
const {
    createConnection,
    TextDocuments,
    DiagnosticSeverity,
    ProposedFeatures,
    TextDocumentSyncKind,
    Diagnostic,
} = require('vscode-languageserver/node');
const { TextDocument } = require('vscode-languageserver-textdocument');
const fs = require('fs');
const path = require('path');
const { URI } = require('vscode-languageserver/node');
const { fileURLToPath, pathToFileURL } = require('url');
const { start } = require('repl');
console?.error('SERVER: modules loaded');
const { tokenize, configureTokenizer } = require('./tokenizer');
const { Parser, parseStates, configureParser } = require('./parser');
const {
    KEYWORDS,
    KEYWORDS_MAP,
    KEYWORDS_BY_PARENT,
    KEYWORDS_SETTINGS,
    KEYWORDS_SETTINGS_SET,

    kwGetGroup,
    kwParentExists,
    kwIterateParent,
    kwIterateGroup,

    PREDEFINED_IDENT,
    isPredefinedIdentifier,
} = require('./languageData');
const channelName = 'MyDefrag Issues';
const isServer = true;
var Options;
var config;
var parserState;
const connection = createConnection(ProposedFeatures.all);
var connectionShown = false;
console?.error('SERVER: connection created');
const documents = new TextDocuments(TextDocument);
// Diagnostics are scoped per validation run in validateDocument().
const Logger = require('../shared/logger');
let logger;
let parserLogger;
const ini = require('../shared/ini')
const util = require('../utilities/util')
var source = "Server"
var iniData = {};
var isDebugOn = false;
var verboseLevel = 5;
var isLogOn = true;
var isStrictMode = false;
var referenceRelativePathLevel = 2;
var referenceContainsMacrosLevel = 3;
var referenceFileFoundLevel = 3;
var referenceFileNotFoundLevel = 1;
var fragmentParentLevel = 4;
var iniErrors = [];

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
 * Builds normalized MyDefrag server configuration from VSCodium settings.
 *
 * @param {object} settings The mydfrg settings object sent by the client.
 * @returns {object} Normalized MyDefrag server configuration.
 */
function buildMyDefragConfig(settings = {}) {
    const configuredVerboseLevel = Number(settings.verboseLevel ?? verboseLevel);
    const nextVerboseLevel = Number.isFinite(configuredVerboseLevel)
        ? Math.min(Math.max(configuredVerboseLevel, 0), 10)
        : verboseLevel;

    return {
        source: "Server",
        iniData: {
            severity: ini.severity
        },
        isDebugOn: Boolean(settings.debugOn ?? isDebugOn),
        verboseLevel: nextVerboseLevel,
        isLogOn,
        referenceRelativePathLevel: normalizeSeveritySetting(
            settings.referenceRelativePathLevel,
            referenceRelativePathLevel
        ),
        referenceContainsMacrosLevel: normalizeSeveritySetting(
            settings.referenceContainsMacros,
            referenceContainsMacrosLevel
        ),
        referenceFileFoundLevel: normalizeSeveritySetting(
            settings.referenceFileFoundLevel,
            referenceFileFoundLevel
        ),
        referenceFileNotFoundLevel: normalizeSeveritySetting(
            settings.referenceFileNotFoundLevel,
            referenceFileNotFoundLevel
        ),
        fragmentParentLevel: normalizeSeveritySetting(
            settings.fragmentParentLevel,
            fragmentParentLevel
        ),
        iniErrors
    };
}

/**
 * Applies normalized MyDefrag configuration to the language server process.
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

// Module-level config cache
let excludeConfig = {
    mydfrgExcludes: [],
    fileExcludes: {},
    searchExcludes: {},
    fileCount: 0,
    folderCount: 0
};
let workspaceFolders = [];
let workspaceFolderPaths = [];
const paths = require('../shared/path');
paths.ensureDirectories();
// let logPaths = {};
const MYDFRG_EXTENSIONS = new Set(['.mydc', '.myd']);
const currentDiagnosticsByUri = new Map();
const VALIDATION_DEBOUNCE_MS = 250;
const WORKSPACE_REFRESH_DEBOUNCE_MS = 250;
const BULK_SCAN_YIELD_INTERVAL = 25;
const FILE_CHANGE_TYPE_DELETED = 3;
const pendingValidationTimers = new Map();
const pendingWatchedFileChanges = new Map();
let didReceiveConfiguration = false;
let workspaceRefreshTimer = null;
let watchedFileRefreshTimer = null;
let refreshSequence = 0;
let refreshQueue = Promise.resolve();
//#endregion
// ─────────────────────────────────────────────────────────────────────────────────
//#region Events for server - connection, documents
connection.onInitialize(async (params) => {
    console?.log(`server.js:connection.onInitialize: SERVER loading configuration`);

    // debugger;

    // console?.error(
    //     JSON.stringify(
    //         params.capabilities.workspace,
    //         null,
    //         2
    //     )
    // );
    try { // ---- Initialization ----
        //                    OR THIS:
        try { // Ini Init
            // Workspace folders
            // console?.log(JSON.stringify(params.capabilities, null, 2));
            try {
                if (params.capabilities.workspace?.workspaceFolders === null || params.capabilities.workspace?.workspaceFolders === undefined) {
                    console?.error("server.js:onInitialize: WorkspaceFolders are not available");
                }
                workspaceFolders = await connection.workspace.getWorkspaceFolders() || [];
                workspaceFolderPaths = workspaceFolders.map(f => f.uri.endsWith('/') ? f.uri : f.uri + '/');
            } catch {
                console?.error("server.js:onInitialize: WorkspaceFolders error in validation");
                workspaceFolders = [];
                workspaceFolderPaths = [];
            }
            // Folder and file excludes    
            excludeConfig = params.initializationOptions.excludes || {
                mydfrgExcludes: [],
                fileExcludes: {},
                searchExcludes: {}
            };
            // logPaths = params.initializationOptions.logPaths || {};
            // logPaths = paths || {};
            // config = ini.initialize(source, INI_PATH, channelName, isServer, true, ini.severity.Verbose);
            applyMyDefragConfig(params.initializationOptions.config || buildMyDefragConfig());
            // console?.error(
            //     JSON.stringify(
            //         config,
            //         null,
            //         2
            //     )
            // );
        } catch (errResult) {
            const message = `server.js:onInitialize: Error returned from initialization: ${errResult.message}`;
            console?.error(message);
            // throw new Error(message);
        }
        source = "Server";
        if (verboseLevel >= 3) {
            console?.log(`server.js:onInitialize: [${source}] verboseLevel: ${verboseLevel}`)
            if (verboseLevel >= 7) {
                console?.log(`server.js:onInitialize: params:`)
                console?.dir(params, { depth: null });
                // console?.log(`server.js:onInitialize: initializationOptions:`)
                // console?.dir(params.initializationOptions, { depth: null });
                // console?.log(`server.js:onInitialize: config:`)
                // console?.dir(config, { depth: null });
                console?.log(`server.js:onInitialize: iniData:`)
                console?.dir(iniData, { depth: null });
            }
            console?.log("server.js:onInitialize: init done. Creating Logger")
        }

        try { // Logging Channel and Status Bar
            // ─────────────────────────────────────────────────────────────────────────────────
            // Active: const connection = createConnection(ProposedFeatures.all);
            // connection = vscode.window.createOutputChannel(channelName);
            // connection.show(true);
            connectionShown = true;
            //             // ─────────────────────────────────────────────────────────────────────────────────
            const loggedMessages = new Set();
            let headingDone = false;
            // console?.error("server.js:onInitialize: 1");
            // logger.initialize(source, connection, isServer, diagnostics, iniData, config, isDebugOn, verboseLevel)
            logger = Logger.createLogger(channelName, source, config, {
                connection,
                filePath: paths.server,
                isServer: true
            });
            parserLogger = Logger.createLogger('MyDefrag Parser', 'Parser', config, {
                connection,
                filePath: paths.parser,
                isServer: true
            });
            configureTokenizer({ logger: parserLogger });
            configureParser({ logger: parserLogger, ini: { ...ini, ...config } });
            // console?.error("server.js:onInitialize: 2");
            if (ini.iniErrors.length) { Logger.logArrayToConsole(logger, channelName, ini.severity.Warning, loggedMessages, ini.iniErrors) }
            // console?.error("server.js:onInitialize: 3");
            // console?.log(ini.severity);
            logger.info(null, "SERVER: MYDC SERVER INITIALIZED");
            // console?.error("server.js:onInitialize: 4");
            logger.dbg(5, `server.js:onInitialize: Settings source=VSCodium, Debug=${isDebugOn}`)
        } catch (errResult) {
            const message = `server.js:onInitialize: Unexpected error in Logging Channel initialization: ${errResult.message}`;
            console?.error(message);
        }
    } catch (errResult) {
        const message = `server.js:onInitialize: Unexpected error initializing server: ${errResult.message}`;
        console?.error(message);
    }
    logger.dbg(5, "server.js:onInitialize: Initialization done")
    return {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            completionProvider: { resolveProvider: true },
            hoverProvider: true,
            definitionProvider: true,
            referencesProvider: true,
        }
    };
});
// Called when client sends updated config
connection.onDidChangeConfiguration(async change => {
    const isInitialConfiguration = !didReceiveConfiguration;
    didReceiveConfiguration = true;

    applyMyDefragConfig(buildMyDefragConfig(change.settings?.mydfrg || {}));

    logger = Logger.createLogger(channelName, source, config, {
        connection,
        filePath: paths.server,
        isServer: true
    });

    parserLogger = Logger.createLogger('MyDefrag Parser', 'Parser', config, {
        connection,
        filePath: paths.parser,
        isServer: true
    });

    configureTokenizer({ logger: parserLogger });
    configureParser({ logger: parserLogger, ini: { ...ini, ...config } });

    excludeConfig = {
        mydfrgExcludes: change.settings?.mydfrg?.exclude || [],
        fileExcludes: change.settings?.files?.exclude || {},
        searchExcludes: change.settings?.search?.exclude || {},
        fileCount: 0,
        folderCount: 0,
        searchCount: 0
    };

    await enqueueDiagnosticsRefresh('configuration', {
        clear: false,
        clearUnavailable: true,
        scanWorkspace: true
    });
});
//Events for server - documents
documents.onDidChangeContent(change => {
    console?.log('server.js:onDidChangeContent MyDefrag server document changed');
    if (isUriExcluded(change.document.uri)) {
        clearUriDiagnostics(change.document.uri, 'excluded', { writeSnapshot: false });
        return;
    }

    scheduleValidateDocument(change.document);
});

documents.onDidOpen(change => {
    console?.log('server.js:onDidOpen MyDefrag server document opened');
    if (isUriExcluded(change.document.uri)) {
        clearUriDiagnostics(change.document.uri, 'excluded', { writeSnapshot: false });
        return;
    }

    validateDocument(change.document);
});

documents.onDidSave(change => {
    console?.log('server.js:onDidSave MyDefrag server document saved');
    clearPendingValidation(change.document.uri);
    if (isUriExcluded(change.document.uri)) {
        clearUriDiagnostics(change.document.uri, 'excluded', { writeSnapshot: false });
        return;
    }

    validateDocument(change.document);
});

documents.onDidClose(change => {
    console?.log('server.js:onDidClose MyDefrag server document closed');
    clearPendingValidation(change.document.uri);
    currentDiagnosticsByUri.set(change.document.uri, []);
    writeDiagnosticsSnapshot('close', change.document.uri, parserState);
    connection.sendDiagnostics({
        uri: change.document.uri,
        diagnostics: []
    });
});
//#endregion
// ─────────────────────────────────────────────────────────────────────────────────
//#region VALIDATE DOCUMENT .Parse ───────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────────
let currFilePath = "";

/**
 * Returns the compact diagnostics snapshot path.
 *
 * @returns {string}
 */
function getDiagnosticsSnapshotPath() {
    return paths.diagnosticsLatestFile;
}
/**
 * Converts parser state constants into stable snapshot labels.
 *
 * @param {number} state The parser state value.
 * @returns {string} The parser state label.
 */
function formatParserState(state) {
    switch (state) {
        case parseStates.SCRIPT_FULL:
            return 'SCRIPT_FULL';
        case parseStates.SCRIPT_FRAGMENT:
            return 'SCRIPT_FRAGMENT';
        case parseStates.SCRIPT_UNKNOWN:
            return 'SCRIPT_UNKNOWN';
        default:
            return String(state ?? 'unknown');
    }
}
// ─────────────────────────────────────────────────────────────────────────────────
/**
 * Writes the current diagnostics map to a compact JSON snapshot.
 *
 * @param {string} event The lifecycle event that refreshed the snapshot.
 * @param {string} uri The URI that changed.
 * @param {number} state The parser state for the changed URI.
 */
function writeDiagnosticsSnapshot(event, uri, state) {
    const snapshotPath = getDiagnosticsSnapshotPath();
    if (!snapshotPath) return;

    const diagnosticsByUri = {};
    for (const [diagnosticUri, uriDiagnostics] of [...currentDiagnosticsByUri.entries()].sort()) {
        diagnosticsByUri[diagnosticUri] = {
            count: uriDiagnostics.length,
            diagnostics: uriDiagnostics
        };
    }

    const snapshot = {
        generatedAt: new Date().toISOString(),
        event,
        uri,
        parserState: formatParserState(state),
        diagnosticsByUri
    };

    try {
        fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf8');
        connection.sendNotification('mydfrg/diagnosticsSnapshotChanged', {
            event,
            uri,
            snapshotPath,
            parserState: snapshot.parserState
        });
    } catch (errResult) {
        logger?.warn?.(`writeDiagnosticsSnapshot: Unable to write ${snapshotPath}: ${errResult.message}`);
    }
}

function clearPublishedDiagnostics(reason = 'configuration') {
    const uris = Array.from(currentDiagnosticsByUri.keys());

    currentDiagnosticsByUri.clear();

    for (const uri of uris) {
        connection.sendDiagnostics({
            uri,
            diagnostics: []
        });
    }

    writeDiagnosticsSnapshot(`clear-${reason}`, '', parserState);
}

/**
 * Normalizes a URI-like value into the string key used by diagnostics maps.
 *
 * @param {string|object} uri Document URI or URI-like object.
 * @returns {string} URI string.
 */
function normalizeUri(uri) {
    return uri?.toString?.() ?? String(uri);
}

/**
 * Converts a file URI to a filesystem path.
 *
 * @param {string|object} uri Document URI or URI-like object.
 * @returns {string} Filesystem path.
 */
function getFilePathFromUri(uri) {
    return fileURLToPath(normalizeUri(uri));
}

/**
 * Checks whether a URI targets a MyDefrag script file handled by this server.
 *
 * @param {string|object} uri Document URI or URI-like object.
 * @returns {boolean} True when the URI points to a supported script file.
 */
function isMyDefragScriptUri(uri) {
    try {
        return isMyDefragScriptFile(getFilePathFromUri(uri));
    } catch (_err) {
        return false;
    }
}

/**
 * Returns the workspace-relative path used by the exclusion helper.
 *
 * @param {string|object} uri Document URI or URI-like object.
 * @returns {string} Workspace-relative path when possible.
 */
function getRelativePathForUri(uri) {
    return util.getRelativePath(normalizeUri(uri), workspaceFolderPaths);
}

/**
 * Checks whether a URI is excluded by the current server exclude settings.
 *
 * @param {string|object} uri Document URI or URI-like object.
 * @returns {boolean} True when the URI is excluded.
 */
function isUriExcluded(uri) {
    return util.isExcluded(getRelativePathForUri(uri), excludeConfig, logger);
}

/**
 * Clears diagnostics for one URI without rebuilding other files.
 *
 * @param {string|object} uri Document URI or URI-like object.
 * @param {string} reason Clear reason.
 * @param {object} [options] Clear options.
 * @returns {boolean} True when diagnostics were cleared.
 */
function clearUriDiagnostics(uri, reason = 'clear', options = {}) {
    const key = normalizeUri(uri);

    clearPendingValidation(key);
    currentDiagnosticsByUri.delete(key);
    connection.sendDiagnostics({
        uri: key,
        diagnostics: []
    });

    if (options.writeSnapshot !== false) {
        writeDiagnosticsSnapshot(`clear-${reason}`, key, parserState);
    }

    return true;
}

/**
 * Clears diagnostics for excluded or deleted files without clearing all results.
 *
 * @param {string} reason Clear reason.
 * @returns {number} Number of URIs cleared.
 */
function clearUnavailableDiagnostics(reason = 'configuration') {
    let clearedCount = 0;

    for (const uri of Array.from(currentDiagnosticsByUri.keys())) {
        let shouldClear = isUriExcluded(uri);

        if (!shouldClear) {
            try {
                shouldClear = !fs.existsSync(getFilePathFromUri(uri));
            } catch (_err) {
                shouldClear = true;
            }
        }

        if (shouldClear) {
            clearUriDiagnostics(uri, reason, { writeSnapshot: false });
            clearedCount++;
        }
    }

    if (clearedCount > 0) {
        writeDiagnosticsSnapshot(`clear-${reason}`, '', parserState);
    }

    return clearedCount;
}

/**
 * Checks whether a queued refresh has been superseded.
 *
 * @param {object} options Refresh options.
 * @returns {boolean} True when the refresh should stop.
 */
function isRefreshStale(options = {}) {
    return Boolean(options.refreshId && options.refreshId !== refreshSequence);
}

/**
 * Serializes expensive diagnostics refreshes and skips superseded queued work.
 *
 * @param {string} reason Refresh reason.
 * @param {object} [options] Refresh options.
 * @returns {Promise<void>}
 */
function enqueueDiagnosticsRefresh(reason, options = {}) {
    const refreshId = ++refreshSequence;

    refreshQueue = refreshQueue
        .catch(() => { })
        .then(async () => {
            if (refreshId !== refreshSequence) {
                return;
            }

            await refreshAllDiagnostics(reason, {
                ...options,
                refreshId
            });
        });

    return refreshQueue;
}

/**
 * Serializes watched-file refresh work with workspace refresh work.
 *
 * @param {Array<object>} changes LSP file watcher changes.
 * @param {string} reason Refresh reason.
 * @returns {Promise<void>}
 */
function enqueueChangedFileRefresh(changes, reason = 'watched-files') {
    const refreshId = ++refreshSequence;

    refreshQueue = refreshQueue
        .catch(() => { })
        .then(async () => {
            if (refreshId !== refreshSequence) {
                return;
            }

            await refreshChangedFiles(changes, reason, { refreshId });
        });

    return refreshQueue;
}

/**
 * Yields bulk diagnostics work back to the language-server event loop.
 *
 * @returns {Promise<void>}
 */
function yieldToEventLoop() {
    return new Promise(resolve => setImmediate(resolve));
}

/**
 * Clears a queued validation timer for a document.
 *
 * @param {string|object} uri Document URI or URI-like object.
 */
function clearPendingValidation(uri) {
    const key = normalizeUri(uri);
    const timer = pendingValidationTimers.get(key);

    if (timer) {
        clearTimeout(timer);
        pendingValidationTimers.delete(key);
    }
}

/**
 * Schedules current-document validation after typing settles.
 *
 * @param {TextDocument} document The document to validate.
 * @param {number} delayMs Delay in milliseconds.
 */
function scheduleValidateDocument(document, delayMs = VALIDATION_DEBOUNCE_MS) {
    const key = document.uri;

    clearPendingValidation(key);

    const timer = setTimeout(() => {
        pendingValidationTimers.delete(key);
        validateDocument(document);
    }, delayMs);

    pendingValidationTimers.set(key, timer);
}

/**
 * Debounces expensive workspace-wide refreshes.
 *
 * @param {string} reason Refresh reason.
 * @param {number} delayMs Delay in milliseconds.
 */
function scheduleWorkspaceRefresh(reason, delayMs = WORKSPACE_REFRESH_DEBOUNCE_MS) {
    if (workspaceRefreshTimer) {
        clearTimeout(workspaceRefreshTimer);
    }

    workspaceRefreshTimer = setTimeout(() => {
        workspaceRefreshTimer = null;
        enqueueDiagnosticsRefresh(reason, {
            clear: false,
            clearUnavailable: true,
            scanWorkspace: true
        }).catch(errResult => {
            logger?.err?.(errResult, `refreshAllDiagnostics: ${reason} failed`);
        });
    }, delayMs);
}

/**
 * Debounces watched file changes and validates only the affected script files.
 *
 * @param {Array<object>} changes LSP file watcher changes.
 * @param {number} delayMs Delay in milliseconds.
 */
function scheduleWatchedFileRefresh(changes = [], delayMs = WORKSPACE_REFRESH_DEBOUNCE_MS) {
    for (const change of changes) {
        if (change?.uri) {
            pendingWatchedFileChanges.set(change.uri, change);
        }
    }

    if (watchedFileRefreshTimer) {
        clearTimeout(watchedFileRefreshTimer);
    }

    watchedFileRefreshTimer = setTimeout(() => {
        const pendingChanges = Array.from(pendingWatchedFileChanges.values());
        pendingWatchedFileChanges.clear();
        watchedFileRefreshTimer = null;

        enqueueChangedFileRefresh(pendingChanges, 'watched-files').catch(errResult => {
            logger?.err?.(errResult, 'refreshChangedFiles: watched-files failed');
        });
    }, delayMs);
}

/**
 * Validates or clears one changed file URI from a watcher event.
 *
 * @param {string|object} uri Changed file URI.
 * @param {object} [options] Validation options.
 * @returns {Promise<boolean>} True when the URI was handled.
 */
async function validateFileUri(uri, options = {}) {
    const key = normalizeUri(uri);

    if (!isMyDefragScriptUri(key)) {
        return false;
    }

    if (isUriExcluded(key)) {
        clearUriDiagnostics(key, 'excluded', { writeSnapshot: false });
        return true;
    }

    const openDocument = documents.get(key);
    if (openDocument) {
        clearPendingValidation(key);
        await validateDocument(openDocument, options);
        return true;
    }

    try {
        const content = fs.readFileSync(getFilePathFromUri(key), 'utf8');
        const document = TextDocument.create(key, 'mydfrg', 1, content);
        await validateDocument(document, options);
        return true;
    } catch (errResult) {
        clearUriDiagnostics(key, 'missing', { writeSnapshot: false });
        logger?.warn?.(`validateFileUri: Unable to read ${key}: ${errResult.message}`);
        return true;
    }
}

/**
 * Refreshes diagnostics for the exact files reported by the file watcher.
 *
 * @param {Array<object>} changes LSP file watcher changes.
 * @param {string} reason Refresh reason.
 * @param {object} [options] Refresh options.
 * @returns {Promise<void>}
 */
async function refreshChangedFiles(changes = [], reason = 'watched-files', options = {}) {
    let handledCount = 0;

    for (const change of changes) {
        if (isRefreshStale(options)) {
            return;
        }

        const uri = normalizeUri(change?.uri);
        if (!uri || !isMyDefragScriptUri(uri)) {
            continue;
        }

        if (change.type === FILE_CHANGE_TYPE_DELETED) {
            clearUriDiagnostics(uri, reason, { writeSnapshot: false });
            handledCount++;
            continue;
        }

        if (await validateFileUri(uri, { writeSnapshot: false })) {
            handledCount++;
        }

        if (handledCount % BULK_SCAN_YIELD_INTERVAL === 0) {
            await yieldToEventLoop();
        }
    }

    if (isRefreshStale(options)) {
        return;
    }

    if (handledCount > 0) {
        writeDiagnosticsSnapshot(`${reason}-complete`, '', parserState);
    }
}

async function refreshAllDiagnostics(reason = 'configuration', options = {}) {
    const shouldClear = options.clear === true;
    const shouldClearUnavailable = options.clearUnavailable === true;
    const shouldScanWorkspace = options.scanWorkspace !== false;

    if (shouldClear) {
        clearPublishedDiagnostics(reason);
    }

    if (shouldClearUnavailable) {
        clearUnavailableDiagnostics(reason);
    }

    for (const document of documents.all()) {
        if (isRefreshStale(options)) {
            return;
        }

        if (isUriExcluded(document.uri)) {
            clearUriDiagnostics(document.uri, 'excluded', { writeSnapshot: false });
            continue;
        }

        clearPendingValidation(document.uri);
        await validateDocument(document, { writeSnapshot: false });
    }

    if (isRefreshStale(options)) {
        return;
    }

    if (!shouldScanWorkspace) {
        writeDiagnosticsSnapshot(`${reason}-complete`, '', parserState);
        return;
    }

    let folders = workspaceFolders;

    try {
        const latestFolders = await connection.workspace.getWorkspaceFolders();
        if (latestFolders) {
            folders = latestFolders;
            workspaceFolders = latestFolders;
            workspaceFolderPaths = workspaceFolders.map(f =>
                f.uri.endsWith('/') ? f.uri : f.uri + '/'
            );
        }
    } catch (errResult) {
        logger?.warn?.(`refreshAllDiagnostics: Unable to refresh workspace folders: ${errResult.message}`);
    }

    const scanOptions = {
        scannedCount: 0,
        isStale: () => isRefreshStale(options)
    };
    for (const folder of folders || []) {
        if (isRefreshStale(options)) {
            return;
        }

        await scanAllFiles(folder.uri, scanOptions);
    }

    if (isRefreshStale(options)) {
        return;
    }

    writeDiagnosticsSnapshot(`${reason}-complete`, '', parserState);
}
// ─────────────────────────────────────────────────────────────────────────────────
async function validateDocument(document, options = {}) {
    let parser;
    let fragParser;
    let bestParser;
    let fragParserResult;
    let t = null;
    let documentVersion;
    const diagnostics = [];
    try { // ── Validate Document ─────────────────────────────────────────────────────────
        const filePath = fileURLToPath(document.uri.toString());
        currFilePath = filePath;
        const ext = path.extname(filePath).toLowerCase();
        const isMyDefragDocument = document.languageId === 'mydfrg';
        documentVersion = document.version;
        const text = document.getText();
        logger.dbg(5, `validateDocument: `);
        logger.dbg(5, `validateDocument: MYDC SERVER ACTIVATED`);
        logger.dbg(3, `validateDocument: for ${filePath}`);
        // ─────────────────────────────────────────────────────────────────────────────────
        // Initial document set based on file extension
        switch (ext) { // Document Type Full or Fragment
            case '.myd':
                parserState = parseStates.SCRIPT_FULL;
                break;
            case '.mydc':
                parserState = parseStates.SCRIPT_FRAGMENT;
                break;
            default:
                parserState = isMyDefragDocument
                    ? parseStates.SCRIPT_FRAGMENT
                    : parseStates.SCRIPT_UNKNOWN;
                break;
        }
        const initialParserState = parserState;
        // ─────────────────────────────────────────────────────────────────────────────────
        // tokenize document
        const tokens = tokenize(text);
        if (verboseLevel >= 8) {
            console?.log(
                tokens.map(t => `${t.type}:${t.value}`).join('\n')
            );
        }
        // ─────────────────────────────────────────────────────────────────────────────────
        // First attempt: full script
        // Initially treat any script as a valid (complete) script
        // Syntax:
        // the presence of syntax errors are always errors
        // Missing statements:
        // the presence of structural errors, missing ends to closures, 
        // missing closure begin statements, similarly were if statements
        // available (the are not). 
        // These errors are treated as being script fragments and
        // warnings are issued.
        // ToDo extend functionality to add "quick fix"
        // ToDo Add code snippets for structural code. IE Volume & FileSelect groups.
        logger.dbg(5, `validateDocument: Parsing Document`);

        if (parserState !== parseStates.SCRIPT_FRAGMENT) {
            // Check for full document errors
            parser = new Parser(tokens, text, parserState);
            logger.dbg(5, `validateDocument: Full Document: Parsing`);
            logger.dbg(5, "validateDocument: Full Document: First token:", parser.curr());

            // ─────────────────────────────────────────────────────────────────────────────────
            parser.parseStatements();
            t = parser.curr();
            if (parser.atEof() && parser.errors.length === 0) {
                parserState = parseStates.SCRIPT_FULL;
                parser.state = parseStates.SCRIPT_FULL;
            }
            logger.dbg(5, `validateDocument: Full Document: Parse Statements ${parser.errors.length}`);
            logger.dbg(5, "validateDocument: Full Document: After parse:", parser.curr());
            bestParser = parser;

        } else {
            bestParser = new Parser(tokens, text, parserState);
        }
        // ─────────────────────────────────────────────────────────────────────────────────
        // If full-script parse failed, try fragment mode
        logger.dbg(5, `Parser Eof: ${bestParser.atEof()} Errors: ${bestParser.errors.length}`);
        logger.dbg(5, `validateDocument: Parse Document Fragment`);
        // Errors present. Check if this is a valid fragment
        if (!bestParser.atEof() || bestParser.errors.length > 0) {
            // if any errors were found or processing paused
            parserState = parseStates.SCRIPT_FRAGMENT;
            fragParser = new Parser(tokens, text, parserState);
            logger.dbg(5, `validateDocument: Document Fragment: Parsing`);
            logger.dbg(5, "validateDocument: Document Fragment: First token:", fragParser.curr(), "=", fragParser.curr().value);

            // ─────────────────────────────────────────────────────────────────────────────────
            // Choose the parser with fewer errors
            fragParserResult = fragParser.parseFragment();
            t = fragParser.curr();
            logger.dbg(5, `validateDocument: Document Fragment: Parse Statements. Success: ${fragParserResult} Errors: ${fragParser.errors.length}`);
            logger.dbg(5, "validateDocument: Document Fragment: After parse:", fragParser.curr(), "=", fragParser.curr().value);
            // Comparison
            logger.dbg(5, `validateDocument: Document Fragment: Step Comparison. Errors, Frag: ${fragParser.errors.length}, Full: ${bestParser.errors.length} `);
            if (
                initialParserState !== parseStates.SCRIPT_FULL ||
                fragParser.errors.length < bestParser.errors.length ||
                (fragParser.errors.length === bestParser.errors.length &&
                    fragParser.atEof() && !bestParser.atEof())
            ) {
                // Fewer errors were found using "document fragment" state
                bestParser = fragParser;
            }
        }
        // ─────────────────────────────────────────────────────────────────────────────────
        logger.dbg(5, `validateDocument: Parser Eof: ${bestParser.atEof()} Errors: ${bestParser.errors.length}`);
        logger.dbg(5, `validateDocument: Check for orphaned tokens`);
        parser = bestParser;
        parserState = bestParser.state;
        // Report any remaining tokens as unexpected.
        // Processing stopped prematurely.
        if (!bestParser.atEof()) {
            t = bestParser.curr();
            if (bestParser.state === parseStates.SCRIPT_FRAGMENT) {
                bestParser.warning(ini.severity.Warning, `Unexpected token '${t.value}' — fragment may be incomplete`, t);
            } else {
                bestParser.error(ini.severity.Error, `Unexpected token '${t.value}' — expected end of file`, t);
            }
        }

    } catch (errResult) {
        const err =
            errResult instanceof Error
                ? errResult
                : new Error(String(errResult));

        const parserState = bestParser
            ? `\nParser state: pos=${bestParser.pos}, token=${JSON.stringify(bestParser.peek?.() ?? null)}`
            : `\nParser state: unavailable`;

        const message =
            `server.js:validateDocument: Unexpected parser failure\n` +
            `${err.name}: ${err.message}\n` +
            `${err.stack || "(no stack available)"}` +
            parserState;

        try {
            console.error(message);
        } catch { }

        try {
            logger?.err?.(err, message);
        } catch (logErr) {
            console.error("logger.err failed:", logErr);
        }

        try {
            bestParser?.warningAtStart?.(
                `Internal parser failure: ${err.name}: ${err.message}`
            );
        } catch (diagErr) {
            console.error("warningAtStart failed:", diagErr);
        }
    }
    // ─────────────────────────────────────────────────────────────────────────────────
    logger.dbg(5, `validateDocument: Publish diagnostics`);
    const liveDocument = documents.get(document.uri);
    if (liveDocument && liveDocument.version !== documentVersion) {
        scheduleValidateDocument(liveDocument);
        return;
    }

    for (const errResult of bestParser.errors) {
        diagnostics.push({
            severity: errResult.severity,
            range: errResult.range,
            message: errResult.message,
            source: 'MyDefrag',
        });
    }    //ParserState Send Notification to extension.js
    currentDiagnosticsByUri.set(document.uri, diagnostics);
    if (options.writeSnapshot !== false) {
        writeDiagnosticsSnapshot('validate', document.uri, parserState);
    }
    connection.sendNotification('mydfrg/parserState', { uri: document.uri, state: parserState });

    connection.sendDiagnostics({
        uri: document.uri,
        diagnostics
    });
    logger.dbg(5, `validateDocument: Parsing completed`);
}
//#endregion
// ─────────────────────────────────────────────────────────────────────────────────
//#region Functions
// Scan All Files
/**
 * Checks whether a file name is a MyDefrag script file.
 *
 * @param {string} fileName The file name to check.
 * @returns {boolean} True when the file extension is supported by this server.
 */
function isMyDefragScriptFile(fileName) {
    return MYDFRG_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

/**
 * Recursively scans a workspace folder for MyDefrag files, skipping excluded
 * directories before descending and excluded files before reading content.
 *
 * @param {string} folderUri The folder URI to scan.
 * @param {object} [options] Bulk scan options.
 * @returns {Promise<number>} Count of scanned MyDefrag files.
 */
async function scanAllFiles(folderUri, options = {}) {
    const folderPath = fileURLToPath(folderUri);
    const normalizedFolderUri = folderUri.endsWith('/') ? folderUri : `${folderUri}/`;
    const relFolderPath = util.getRelativePath(normalizedFolderUri, workspaceFolderPaths);

    if (options.isStale?.()) {
        return 0;
    }

    if (util.isExcluded(relFolderPath, excludeConfig, logger)) {
        logger.dbg(6, `scanAllFiles: Skipping excluded folder ${relFolderPath}`);
        return 0;
    }

    let entries;
    try {
        entries = fs.readdirSync(folderPath, { withFileTypes: true });
    } catch (errResult) {
        logger?.warn?.(`scanAllFiles: Unable to read folder ${folderPath}: ${errResult.message}`);
        return 0;
    }

    let scannedFiles = 0;

    for (const entry of entries) {
        if (options.isStale?.()) {
            return scannedFiles;
        }

        const fullPath = path.join(folderPath, entry.name);
        const uri = pathToFileURL(fullPath).toString();
        const relPath = util.getRelativePath(uri, workspaceFolderPaths);

        if (entry.isDirectory()) {
            // directory
            if (util.isExcluded(`${relPath}/`, excludeConfig, logger)) {
                logger.dbg(6, `scanAllFiles: Skipping excluded folder ${relPath}`);
                continue;
            }
            scannedFiles += await scanAllFiles(`${uri}/`, options);

        } else if (entry.isFile() && isMyDefragScriptFile(entry.name)) {
            // file
            if (util.isExcluded(relPath, excludeConfig, logger)) {
                // clear diagnostics for this file
                // diagnosticCollection.set(document.uri, []);
                clearUriDiagnostics(uri, 'excluded', { writeSnapshot: false });
                continue;
            }
            // Skip if already open — documents.get() handles those
            if (!documents.get(uri)) {
                const content = fs.readFileSync(fullPath, 'utf8');
                const document = TextDocument.create(uri, 'mydfrg', 1, content);
                await validateDocument(document, { writeSnapshot: false });
                scannedFiles++;
                options.scannedCount = (options.scannedCount || 0) + 1;

                if (options.scannedCount % BULK_SCAN_YIELD_INTERVAL === 0) {
                    await yieldToEventLoop();
                }
            }
        }
    }

    return scannedFiles;
}
// ─────────────────────────────────────────────────────────────────────────────────
// MyDefrag pre-defined variables.
//#region connection Management. .Parse 
//  On Completion and Hover ──────────────────────────────────────────────────────
// (ToDo On Completion and Hover are stubs for now)
// ─────────────────────────────────────────────────────────────────────────────────

connection.onCompletion(() => { // ToDo onCompletion
    logger.dbg(6, 'server.js:onCompletion: MyDefrag server connection on Completion');
    return [];
});
connection.onHover(() => { // ToDo onHover
    logger.dbg(6, 'server.js:onHover: MyDefrag server connection on Hover');
    return null;
});
connection.onInitialized(() => {
    // ─────────────────────────────────────────────────────────────────────────────────
    logger.dbg(6, 'server.js:onInitialized: MyDefrag server Language Client entered initialized');
    logger.dbg(6, 'server.js:onInitialized: Workspace scan deferred to file/configuration refresh');
    logger.dbg(3, 'server.js:onInitialized: MyDefrag server Language Client initialized. Log test.');
});

// Change File Watcher
connection.onDidChangeWatchedFiles(async change => {
    console?.log('server.js:onDidChangeWatchedFiles: MyDefrag server document watched On Did Change');
    if (change?.changes?.length) {
        scheduleWatchedFileRefresh(change.changes);
        return;
    }

    scheduleWorkspaceRefresh('watched-files');
});
//#endregion
// Client Open Document and Connection .Parse ──────────────────────────────────────────────────────────────
documents.listen(connection);
connection.listen();
// END of document .Parse ──────────────────────────────────────────────────────────────
module.exports = {};
