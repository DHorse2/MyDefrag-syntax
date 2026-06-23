'use strict';
// server.js
//#region Initialize server .Parse
const console = require('console');
console?.error('SERVER: entered server.js');
debugger;
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
    KEYWORD_MAP,
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
const SCRIPT_DIR = __dirname;
const PARENT_DIR = path.dirname(SCRIPT_DIR);
const INI_PATH = path.join(PARENT_DIR, "mydefrag-syntax.ini");

const channelName = 'MyDefrag Issues';
const isServer = true;
var Options;
var config;
var parserState;
const connection = createConnection(ProposedFeatures.all);
var connectionShown = false;
console?.error('SERVER: connection created');
const documents = new TextDocuments(TextDocument);
var diagnostics = [];
const Logger = require('../shared/logger');
let logger;
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
var iniErrors = [];

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
//#endregion
// ─────────────────────────────────────────────────────────────────────────────────
//#region Events for server - connection, documents
connection.onInitialize(async (params) => {
    console?.log(`server.js:connection.onInitialize: SERVER loading configuration`);

    debugger;

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
            // config = ini.initialize(source, INI_PATH, channelName, isServer, true, ini.severity.Verbose);
            config = params.initializationOptions.config || {};
            // console?.error(
            //     JSON.stringify(
            //         config,
            //         null,
            //         2
            //     )
            // );
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
                iniErrors
            } = config);
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
            logger = Logger.createLogger(channelName, source, config);
            configureTokenizer({ logger });
            configureParser({ logger, ini });

            // console?.error("server.js:onInitialize: 2");
            if (ini.iniErrors.length) { Logger.logArrayToConsole(logger, channelName, ini.severity.Warning, loggedMessages, ini.iniErrors) }

            // console?.error("server.js:onInitialize: 3");
            // console?.log(ini.severity);
            logger.info("SERVER: MYDC SERVER INITIALIZED");
            // console?.error("server.js:onInitialize: 4");
            logger.dbg(5, `server.js:onInitialize: Ini Path=${INI_PATH}, Debug=${isDebugOn}`)
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
connection.onDidChangeConfiguration(change => {
    excludeConfig = {
        mydfrgExcludes: change.settings?.mydfrg?.exclude || [],
        fileExcludes: change.settings?.files?.exclude || {},
        searchExcludes: change.settings?.search?.exclude || {},
        fileCount: 0,
        folderCount: 0
    };
    // Re-validate since excludes may have changed
    // Validate document open in editors
    documents.all().forEach(validateDocument);
    // Re-validate since excludes may have changed
    // connection.workspace.getWorkspaceFolders().then(folders => {
    //     for (const folder of folders) {
    //         scanAllFiles(folder.uri);
    //     }
    // });
    for (const folder of workspaceFolders) {
        scanAllFiles(folder.uri);
    }
});
//Events for server - documents
documents.onDidChangeContent(change => {
    console?.log('server.js:onDidChangeContent MyDefrag server document changed');
    validateDocument(change.document);
});

documents.onDidOpen(change => {
    console?.log('server.js:onDidOpen MyDefrag server document opened');
    validateDocument(change.document);
});

documents.onDidSave(change => {
    console?.log('server.js:onDidSave MyDefrag server document saved');
    validateDocument(change.document);
});
//#endregion
// ─────────────────────────────────────────────────────────────────────────────────
//#region VALIDATE DOCUMENT .Parse ───────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────────
let currFilePath = "";
async function validateDocument(document) {
    let parser;
    let fragParser;
    let bestParser;
    let fragParserResult;
    let t = null;
    try { // ── Validate Document ─────────────────────────────────────────────────────────
        const filePath = fileURLToPath(document.uri.toString());
        currFilePath = filePath;
        const ext = path.extname(filePath).toLowerCase();
        const text = document.getText();
        diagnostics = [];
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
                parserState = parseStates.SCRIPT_UNKNOWN;
                break;
        }
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
        logger.dbg(5, `validateDocument: Step 1 Parse Document`);

        if (parserState !== parseStates.SCRIPT_FRAGMENT) {
            // Check for full document errors
            parser = new Parser(tokens, text, parserState);
            logger.dbg(5, `validateDocument: Step 1 Parsing`);
            logger.dbg(5, "validateDocument: Full Document FIRST TOKEN:", parser.curr(), "=", parser.curr().value );

            // ─────────────────────────────────────────────────────────────────────────────────
            parser.parseStatements();
            t = parser.curr();
            if (parser.atEof() && parser.errors.length === 0) {
                parserState = parseStates.SCRIPT_FULL;
                parser.state = parseStates.SCRIPT_FULL;
            }
            logger.dbg(5, `validateDocument: Full Document Parse Statements ${parser.errors.length}`);
            logger.dbg(5, "validateDocument: AFTER PARSE:", parser.curr(), "=", parser.curr().value );
            bestParser = parser;

        } else {
            bestParser = new Parser(tokens, text, parserState);
        }
        // ─────────────────────────────────────────────────────────────────────────────────
        // If full-script parse failed, try fragment mode
        logger.dbg(5, `Parser Eof: ${bestParser.atEof()} Errors: ${bestParser.errors.length}`);
        logger.dbg(5, `validateDocument: Step 2 Parse Fragments`);
        // Errors present. Check if this is a valid fragment
        if (!bestParser.atEof() || bestParser.errors.length > 0) {
            // if any errors were found or processing paused
            parserState = parseStates.SCRIPT_FRAGMENT;
            fragParser = new Parser(tokens, text, parserState);
            logger.dbg(5, `validateDocument: Step 2 Parsing`);
                logger.dbg(5, "validateDocument: Document Fragment FIRST TOKEN:", fragParser.curr(), "=", fragParser.curr().value );

            // ─────────────────────────────────────────────────────────────────────────────────
            // Choose the parser with fewer errors
            fragParserResult = fragParser.parseFragment();
            t = fragParser.curr();
            logger.dbg(5, `validateDocument: Document Fragment Parse Statements. Success: ${fragParserResult} Errors: ${fragParser.errors.length}`);
            logger.dbg(5, "validateDocument: AFTER PARSE:", fragParser.curr(), "=", fragParser.curr().value );
            // Comparison
            logger.dbg(5, `validateDocument: Step Comparison. Errors, Frag: ${fragParser.errors.length}, Full: ${bestParser.errors.length} `);
            if (
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
        logger.dbg(5, `validateDocument: Step 3 Orphaned tokens`);
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
        // ─────────────────────────────────────────────────────────────────────────────────
        logger.dbg(5, `validateDocument: Step 4 Publish diagnostics`);
        for (const errResult of bestParser.errors) {
            diagnostics.push({
                severity: errResult.severity,
                range: errResult.range,
                message: errResult.message,
                source: 'MyDefrag',
            });
        }
    }
    catch (errResult) {
        const message = `server.js:ValidateDocument Unexpected exception: ${errResult.message}`;
        console?.error(message);
        // throw new Error(message);
    }
    //ParserState Send Notification to extension.js
    connection.sendNotification('mydfrg/parserState', { uri: document.uri, state: parserState });

    connection.sendDiagnostics({
        uri: document.uri,
        diagnostics
    });
}
//#endregion
// ─────────────────────────────────────────────────────────────────────────────────
//#region Functions
// Scan All Files
async function scanAllFiles(folderUri) {
    const folderPath = fileURLToPath(folderUri);
    const entries = fs.readdirSync(folderPath, { withFileTypes: true });
    const MYDFRG_EXTENSIONS = ['.MyDc', '.mydc', '.MYDC', '.MyD', '.myd', '.MYD'];

    for (const entry of entries) {
        const fullPath = path.join(folderPath, entry.name);

        if (entry.isDirectory()) {
            // directory
            await scanAllFiles(pathToFileURL(fullPath).toString());

        } else if (entry.isFile() && MYDFRG_EXTENSIONS.some(ext => entry.name.endsWith(ext))) {
            // file
            const uri = pathToFileURL(fullPath).toString();
            const relPath = util.getRelativePath(uri, workspaceFolders);
            // Skip if already open — documents.get() handles those
            if (!documents.get(uri)) {
                const content = fs.readFileSync(fullPath, 'utf8');
                const document = TextDocument.create(uri, 'mydfrg', 1, content);
                if (!util.isExcluded(relPath, excludeConfig, logger)) {
                    await validateDocument(document);
                } else {
                    // clear diagnostics for this file
                    // diagnosticCollection.set(document.uri, []);
                }
            }
        }
    }
}
// ─────────────────────────────────────────────────────────────────────────────────
// MyDefrag pre-defined variables.
//#region connection Management. .Parse 
//  On Completion and Hover ──────────────────────────────────────────────────────
// (ToDo On Completion and Hover are stubs for now)
// ─────────────────────────────────────────────────────────────────────────────────

connection.onCompletion(() => { // ToDo
    logger.dbg(6, 'server.js:onCompletion: MyDefrag server connection on Completion');
    return [];
});
connection.onHover(() => { // ToDo
    logger.dbg(6, 'server.js:onHover: MyDefrag server connection on Hover');
    return null;
});
connection.onInitialized(() => {
    // ─────────────────────────────────────────────────────────────────────────────────
    logger.dbg(6, 'server.js:onInitialized: MyDefrag server Language Client entered initialized');
    logger.dbg(6, 'server.js:onInitialized: Scan all files in the workspace');
    connection.workspace.getWorkspaceFolders().then(folders => {
        for (const folder of folders) {
            scanAllFiles(folder.uri);
        }
    });
    logger.dbg(3, 'server.js:onInitialized: MyDefrag server Language Client initialized. Log test.');
});

// Change File Watcher
connection.onDidChangeWatchedFiles(() => {
    // Re-validate all open documents when files change:
    // documents.all().forEach(validateDocument);
    // Validate all files:
    console?.log('server.js:onDidChangeWatchedFiles: MyDefrag server document watched On Did Change');
    // Validate open documents
    documents.all().forEach(validateDocument);
    // Validate all files in workspace. Was await
    const folders = connection.workspace.getWorkspaceFolders();
    if (folders) {
        for (const folder of folders) {
            // await 
            scanAllFiles(folder.uri);
        }
    }
    // Design note:
    // Many people never use the LSP watcher mechanism and instead use:
    // const watcher = vscode.workspace.createFileSystemWatcher('**/*.MyDc');
    // watcher.onDidCreate(...);
    // watcher.onDidChange(...);
    // watcher.onDidDelete(...);
    // This is often simpler and more reliable.    
});
//#endregion
// Client Open Document and Connection .Parse ──────────────────────────────────────────────────────────────
documents.listen(connection);
connection.listen();
// END of document .Parse ──────────────────────────────────────────────────────────────
module.exports = {};
