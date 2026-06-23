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
//#region KEYWORDS
// All keywords from the grammar (case-insensitive)
// ToDo A few notes on decisions made: 
// fixed appeared twice in your original Set (Sets deduplicate, so only one survived). 
// It's placed under volume_condition since that's its primary use; 
// if your grammar also uses it as a window_state value you can add a second entry.
// fragmented also appeared twice in the original — it's under file_condition (the fragment state test) and 
// I added a second entry under file_state since it doubles as a file state flag.
// text as a zone label is kept under zone; 
// if it also doubles as a literal type name in your tokenizer you may want a second entry with parent: 'literal'.
// Your tokenize(text) call can now filter with .filter(k => k.parent === 'volume_condition') or 
// build a fast lookup with new Map(KEYWORDS.map(k => [k.text, k])) for O(1) access by keyword string.
const KEYWORDS = [
    // ─────────────────────────────────────────────────────────────────────────────────
    // Parent Child Relationships
    // ─────────────────────────────────────────────────────────────────────────────────
    //#region Global / Root
    { text: 'any', parent: 'any' },
    // Commands that can be used anywhere
    { text: 'maxruntime', parent: 'any' },
    { text: 'runscript', parent: 'any' },
    { text: 'runprogram', parent: 'any' },
    // ─────────────────────────────────────────────────────────────────────────────────
    { text: 'script', parent: 'script' },
    // Statements:
    // Script-level settings
    { text: 'description', parent: 'script' },
    { text: 'excludevolumes', parent: 'script' },
    { text: 'excludefiles', parent: 'script' },
    // Volume block structure
    { text: 'volume_block', parent: 'script' },
    { text: 'volumeselect', parent: 'volume_block' },
    { text: 'volumeactions', parent: 'volume_block' },
    { text: 'volumeend', parent: 'volume_block' },
    // File block structure (within volumeactions)
    { text: 'file_block', parent: 'volumeactions' },
    { text: 'fileselect', parent: 'volumeactions' },
    { text: 'fileactions', parent: 'file_block' },
    { text: 'fileend', parent: 'file_block' },
    //#endregion
    // ─────────────────────────────────────────────────────────────────────────────────
    //#region Siblings / Child structures
    { text: 'volume_condition', parent: 'volumeselect' },
    { text: 'filesystem', parent: 'volumeactions' },
    { text: 'volume_action', parent: 'volume_actions' },

    { text: 'file_condition', parent: 'fileselect' },
    { text: 'file_attribute', parent: 'fileselect' },
    { text: 'file_action', parent: 'file_actions' },

    { text: 'sort', parent: 'file_action' },
    { text: 'action_modifier', parent: 'action_modifier' },

    { text: 'ui', parent: 'script' },
    { text: 'window_state', parent: 'windowsize' },
    { text: 'finish_action', parent: 'whenfinished' },
    { text: 'priority', parent: 'any' },

    { text: 'runtime', parent: 'script' },
    { text: 'setscreensaver', parent: 'runtime' },
    { text: 'settingInline', parent: 'any' },
    { text: 'conflict', parent: 'batterypower' },

    { text: 'variable', parent: 'any' },
    { text: 'value', parent: 'any' },
    { text: 'toggle', parent: 'any' },
    { text: 'operator', parent: 'any' },
    { text: 'literal', parent: 'any' },
    { text: 'time', parent: 'any' },
    { text: 'math', parent: 'any' },
    { text: 'size_unit', parent: 'any' },
    { text: 'zone', parent: 'any' },
    { text: 'file_state', parent: 'any' },
    //#endregion
    // ─────────────────────────────────────────────────────────────────────────────────
    // KEYWORDS:
    // ─────────────────────────────────────────────────────────────────────────────────
    // ─────────────────────────────────────────────────────────────────────────────────
    //#region VOLUME
    // Volume type conditions
    { text: 'mounted', parent: 'volume_condition' },
    { text: 'writable', parent: 'volume_condition' },
    { text: 'removable', parent: 'volume_condition' },
    { text: 'fixed', parent: 'volume_condition' },
    { text: 'remote', parent: 'volume_condition' },
    { text: 'cdrom', parent: 'volume_condition' },
    { text: 'ramdisk', parent: 'volume_condition' },

    // Volume property conditions
    { text: 'name', parent: 'volume_condition' },
    { text: 'label', parent: 'volume_condition' },
    { text: 'size', parent: 'volume_condition' },
    { text: 'fragmentcount', parent: 'volume_condition' },
    { text: 'fragmentsize', parent: 'volume_condition' },
    { text: 'checkvolume', parent: 'volume_condition' },
    { text: 'commandlinevolumes', parent: 'volume_condition' },
    { text: 'numberbetween', parent: 'volume_condition' },
    { text: 'filesystemtype', parent: 'volume_condition' },

    // Filesystem types
    { text: 'ntfs', parent: 'filesystem' },
    { text: 'fat', parent: 'filesystem' },
    { text: 'fat12', parent: 'filesystem' },
    { text: 'fat16', parent: 'filesystem' },
    { text: 'fat32', parent: 'filesystem' },

    // ─────────────────────────────────────────────────────────────────────────────────
    // Volume actions
    { text: 'reclaimntfsreservedareas', parent: 'volume_action' },
    { text: 'makegap', parent: 'volume_action' },
    { text: 'dismountvolume', parent: 'volume_action' },
    { text: 'deletejournal', parent: 'volume_action' },
    //#endregion
    // ─────────────────────────────────────────────────────────────────────────────────
    //#region FILE SELECT
    // File select properties/name/path conditions

    { text: 'filename', parent: 'file_condition' },
    { text: 'directoryname', parent: 'file_condition' },
    { text: 'directorypath', parent: 'file_condition' },
    { text: 'fullpath', parent: 'file_condition' },

    // File fragmentation conditions
    { text: 'fragmented', parent: 'file_condition' },
    { text: 'averagefragmentsize', parent: 'file_condition' },
    { text: 'largestfragmentsize', parent: 'file_condition' },
    { text: 'smallestfragmentsize', parent: 'file_condition' },

    // File date conditions
    { text: 'lastaccess', parent: 'file_condition' },
    { text: 'lastaccessenabled', parent: 'file_condition' },
    { text: 'lastchange', parent: 'file_condition' },
    { text: 'creationdate', parent: 'file_condition' },

    // File list import conditions
    { text: 'importlistfrombootoptimize', parent: 'file_condition' },
    { text: 'importlistfromfile', parent: 'file_condition' },
    { text: 'importlistfromprogramhints', parent: 'file_condition' },

    // File size conditions
    { text: 'largest', parent: 'file_condition' },
    { text: 'smallest', parent: 'file_condition' },

    // ─────────────────────────────────────────────────────────────────────────────────
    // File select attribute conditions
    { text: 'archive', parent: 'file_attribute' },
    { text: 'compressed', parent: 'file_attribute' },
    { text: 'directory', parent: 'file_attribute' },
    { text: 'encrypted', parent: 'file_attribute' },
    { text: 'hidden', parent: 'file_attribute' },
    { text: 'nottobeindexed', parent: 'file_attribute' },
    { text: 'offline', parent: 'file_attribute' },
    { text: 'readonly', parent: 'file_attribute' },
    { text: 'sparse', parent: 'file_attribute' },
    { text: 'system', parent: 'file_attribute' },
    { text: 'temporary', parent: 'file_attribute' },
    { text: 'virtual', parent: 'file_attribute' },
    { text: 'unmovable', parent: 'file_attribute' },

    // File location conditions
    { text: 'selectntfssystemfiles', parent: 'file_condition' },
    { text: 'filelocation', parent: 'file_condition' },

    // File location values
    { text: 'beginoffile', parent: 'file_location' },
    { text: 'endoffile', parent: 'file_location' },
    { text: 'entirefile', parent: 'file_location' },
    { text: 'anypart', parent: 'file_location' },
    { text: 'anycompletefragment', parent: 'file_location' },

    // File actions (defrag strategies)
    { text: 'addgap', parent: 'file_action' },
    { text: 'defragment', parent: 'file_action' },
    { text: 'fastfill', parent: 'file_action' },
    { text: 'forcedfill', parent: 'file_action' },
    { text: 'movedownfill', parent: 'file_action' },
    { text: 'movetoendofdisk', parent: 'file_action' },
    { text: 'moveuptozone', parent: 'file_action' },

    // ─────────────────────────────────────────────────────────────────────────────────
    // File Sort orders
    { text: 'sortbyname', parent: 'sort' },
    { text: 'sortbysize', parent: 'sort' },
    { text: 'sortbylastaccess', parent: 'sort' },
    { text: 'sortbylastchange', parent: 'sort' },
    { text: 'sortbycreationdate', parent: 'sort' },
    { text: 'sortbynewestdate', parent: 'sort' },
    { text: 'sortbyimportsequence', parent: 'sort' },

    // Placement actions
    { text: 'placentfssystemfiles', parent: 'file_action' },

    // Action modifiers
    { text: 'chunksize', parent: 'defragment' },
    { text: 'fast', parent: 'defragment' },
    { text: 'withshuffling', parent: 'fastfill' },
    { text: 'donotvacate', parent: 'addgap' },
    { text: 'ascending', parent: 'sort' },
    { text: 'descending', parent: 'sort' },
    { text: 'skipblock', parent: 'sort' },
    //#endregion
    // ─────────────────────────────────────────────────────────────────────────────────
    //#region UI / display / flow control settings
    // ─────────────────────────────────────────────────────────────────────────────────
    { text: 'language', parent: 'ui' },
    { text: 'title', parent: 'ui' },
    { text: 'windowsize', parent: 'ui' },
    { text: 'diskmapflip', parent: 'ui' },
    { text: 'statusbar', parent: 'ui' },
    { text: 'zoomlevel', parent: 'ui' },
    // Messaging
    // { text: 'msg', parent: 'ui' },
    { text: 'message', parent: 'ui' },

    // Status Bar
    { text: 'status', parent: 'statusbar' },
    { text: 'path', parent: 'statusbar' },
    { text: 'mouseover', parent: 'statusbar' },
    { text: 'all', parent: 'statusbar' },

    // Window state values
    { text: 'minimized', parent: 'window_state' },
    { text: 'maximized', parent: 'window_state' },
    { text: 'invisible', parent: 'window_state' },
    { text: 'restore', parent: 'window_state' },
    { text: 'fixed', parent: 'window_state' },

    // Post-run / finish actions
    { text: 'wait', parent: 'finish_action' },
    { text: 'exit', parent: 'finish_action' },
    { text: 'shutdown', parent: 'finish_action' },
    { text: 'hibernate', parent: 'finish_action' },
    { text: 'standby', parent: 'finish_action' },
    { text: 'reboot', parent: 'finish_action' },
    { text: 'warnusers', parent: 'finish_action' },
    { text: 'forced', parent: 'finish_action' },
    //#endregion
    // ─────────────────────────────────────────────────────────────────────────────────
    //#region System / settings 
    // Set screensaver values
    { text: 'off', parent: 'setscreensaver' },
    { text: 'reset', parent: 'setscreensaver' },

    // Process priority values
    { text: 'normal', parent: 'priority' },
    { text: 'belownormal', parent: 'priority' },
    { text: 'low', parent: 'priority' },
    { text: 'abovenormal', parent: 'priority' },
    { text: 'high', parent: 'priority' },
    { text: 'background', parent: 'priority' },

    // Setting commands
    { text: 'setting', parent: 'settingInline' },
    { text: 'setfilecolor', parent: 'settingInline' },
    { text: 'setcolor', parent: 'settingInline' },

    // Runtime behavior settings
    { text: 'pause', parent: 'any' },
    { text: 'writelogfile', parent: 'any' },
    { text: 'appendlogfile', parent: 'any' },
    { text: 'debug', parent: 'any' },
    { text: 'slowdown', parent: 'runtime' },
    { text: 'whenfinished', parent: 'runtime' },
    { text: 'otherinstances', parent: 'runtime' },
    { text: 'batterypower', parent: 'runtime' },
    { text: 'setscreensaver', parent: 'runtime' },
    { text: 'setscreenpowersaver', parent: 'runtime' },
    { text: 'filemovechunksize', parent: 'runtime' },
    { text: 'ignorewraparoundfragmentation', parent: 'runtime' },
    { text: 'processpriority', parent: 'runtime' },
    { text: 'exittimeout', parent: 'runtime' },
    { text: 'exitiftimeout', parent: 'runtime' },
    { text: 'rememberunmovables', parent: 'runtime' },

    // Disk map zone states
    { text: 'empty', parent: 'setcolor' },
    { text: 'allocated', parent: 'setcolor' },
    { text: 'busyread', parent: 'setcolor' },
    { text: 'busywrite', parent: 'setcolor' },
    { text: 'text', parent: 'setcolor' },

    // Conflict / instance resolution
    { text: 'ask', parent: 'conflict' },
    { text: 'allow', parent: 'conflict' },
    { text: 'kill', parent: 'conflict' },

    // File state flags
    { text: 'movable', parent: 'file_state' },
    { text: 'selected', parent: 'file_state' },
    { text: 'processed', parent: 'file_state' },
    // File state operands
    // All
    // AND
    // OR
    // NOT
    // (...) 
    //#endregion
    //#region Variable and Units
    // Variables
    { text: 'setvariable', parent: 'variable' },
    { text: 'setstatisticswindowtext', parent: 'any' },

    // Logical operators
    { text: 'or', parent: 'operator' },
    { text: 'and', parent: 'operator' },
    { text: 'not', parent: 'operator' },
    { text: 'all', parent: 'operator' },

    // Boolean literals
    { text: 'yes', parent: 'literal' },
    { text: 'no', parent: 'literal' },

    // Time reference keywords
    { text: 'now', parent: 'time' },
    { text: 'ago', parent: 'time' },

    // Time units
    { text: 'time_unit', parent: 'any' },
    { text: 'year', parent: 'time_unit' },
    { text: 'years', parent: 'time_unit' },
    { text: 'month', parent: 'time_unit' },
    { text: 'months', parent: 'time_unit' },
    { text: 'week', parent: 'time_unit' },
    { text: 'weeks', parent: 'time_unit' },
    { text: 'day', parent: 'time_unit' },
    { text: 'days', parent: 'time_unit' },
    { text: 'hour', parent: 'time_unit' },
    { text: 'hours', parent: 'time_unit' },
    { text: 'minute', parent: 'time_unit' },
    { text: 'minutes', parent: 'time_unit' },
    { text: 'second', parent: 'time_unit' },
    { text: 'seconds', parent: 'time_unit' },

    // Arithmetic functions
    { text: 'rounddown', parent: 'math' },
    { text: 'roundup', parent: 'math' },
    { text: 'minimum', parent: 'math' },
    { text: 'maximum', parent: 'math' },

    // Size unit suffixes (SI)
    { text: 'k', parent: 'size_unit' },
    { text: 'm', parent: 'size_unit' },
    { text: 'g', parent: 'size_unit' },
    { text: 't', parent: 'size_unit' },
    { text: 'p', parent: 'size_unit' },
    { text: 'e', parent: 'size_unit' },
    { text: 'z', parent: 'size_unit' },
    { text: 'y', parent: 'size_unit' },

    // Size unit suffixes (byte labels)
    { text: 'kb', parent: 'size_unit' },
    { text: 'mb', parent: 'size_unit' },
    { text: 'gb', parent: 'size_unit' },
    { text: 'tb', parent: 'size_unit' },
    { text: 'pb', parent: 'size_unit' },
    { text: 'eb', parent: 'size_unit' },
    { text: 'zb', parent: 'size_unit' },
    { text: 'yb', parent: 'size_unit' },

    // Size unit suffixes (IEC binary)
    { text: 'ki', parent: 'size_unit' },
    { text: 'mi', parent: 'size_unit' },
    { text: 'gi', parent: 'size_unit' },
    { text: 'ti', parent: 'size_unit' },
    { text: 'pi', parent: 'size_unit' },
    { text: 'ei', parent: 'size_unit' },
    { text: 'zi', parent: 'size_unit' },
    { text: 'yi', parent: 'size_unit' },
    //#endregion
];
// Create a searchable map of keywords (by text, existing)
const KEYWORD_MAP = new Map(KEYWORDS.map(k => [k.text, k]));

// Group keywords by parent for parent-based lookup/iteration
const KEYWORDS_BY_PARENT = new Map();
for (const kw of KEYWORDS) {
    if (!KEYWORDS_BY_PARENT.has(kw.parent)) {
        KEYWORDS_BY_PARENT.set(kw.parent, []);
    }
    KEYWORDS_BY_PARENT.get(kw.parent).push(kw);
}
// ─────────────────────────────────────────────────────────────────────────────────
// Parent functionality (not used at the moment)
function kwGetGroup(group) {
    // Get all size_unit keywords
    const kwGroup = KEYWORDS_BY_PARENT.get(group);
    // → [{ text: 'k', parent: 'size_unit' }, { text: 'm', parent: 'size_unit' }, ...]
    return kwGroup;
}
function kwParentExists(parent) {
    // Check if a parent group exists at all
    KEYWORDS_BY_PARENT.has(parent); // true/false
}
function kwIterateParent(group) {
    // Iterate every parent group
    for (const [parent, keywords] of KEYWORDS_BY_PARENT) {
        console.log(parent, '→', keywords.map(k => k.text));
    }
}
function kwIterateGroup(group) {
    // Iterate just that group
    for (const kw of KEYWORDS_BY_PARENT.get(group) ?? []) {
        console.log(kw.text);
    }
}
//#endregion
// ─────────────────────────────────────────────────────────────────────────────────
//#region TOKENIZER .Parse
// ─────────────────────────────────────────────────────────────────────────────────
// Token Type
const TT = {
    KEYWORD: 'KEYWORD',
    IDENT: 'IDENT',
    IDENT_PREDEF: 'IDENT_PREDEF',
    NUMBER: 'NUMBER',
    STRING: 'STRING',
    LPAREN: 'LPAREN',
    RPAREN: 'RPAREN',
    COMMA: 'COMMA',
    SLASH: 'SLASH',
    DASH: 'DASH',
    COLON: 'COLON',
    PLUS: 'PLUS',
    STAR: 'STAR',
    PERCENT: 'PERCENT',
    PIPE: 'PIPE',
    DPIPE: 'DPIPE',
    AMP: 'AMP',
    DAMP: 'DAMP',
    MACRO: 'MACRO',
    EOF: 'EOF',
};
// ─────────────────────────────────────────────────────────────────────────────────
// Tokenize Text
function tokenize(text) {
    const tokens = [];
    let i = 0;
    const len = text.length;
    // ─────────────────────────────────────────────────────────────────────────────────
    while (i < len) {
        try { // ─────────────────── Process Next Token ──────────────────────────────────────
            // ─────────────────────────────────────────────────────────────────────────────────
            // Skip whitespace
            if (/\s/.test(text[i])) { i++; continue; }
            // ─────────────────────────────────────────────────────────────────────────────────
            // Skip line comments: //, #, --, REM
            if (text[i] === '/' && text[i + 1] === '/') {
                while (i < len && text[i] !== '\n') i++;
                continue;
            }
            if (text[i] === '#' || (text[i] === '-' && text[i + 1] === '-')) {
                // '--' isn't a comment. neither is REM
                while (i < len && text[i] !== '\n') i++;
                continue;
            }
            // ─────────────────────────────────────────────────────────────────────────────────
            // REM comment (only at word boundary)
            if (/[Rr]/.test(text[i]) &&
                text.slice(i, i + 3).toUpperCase() === 'REM' &&
                (i + 3 >= len || /\W/.test(text[i + 3]))) {
                while (i < len && text[i] !== '\n') i++;
                continue;
            }
            // ─────────────────────────────────────────────────────────────────────────────────
            // Skip block comments /* ... */
            if (text[i] === '/' && text[i + 1] === '*') {
                i += 2;
                while (i < len && !(text[i] === '*' && text[i + 1] === '/')) {
                    i++;
                }
                // Skip closing */
                if (i < len) {
                    i += 2;
                }
                continue;
            }
            const start = i;
            // ─────────────────────────────────────────────────────────────────────────────────
            // Macro !include....! Predefined Identifier !word!
            if (text[i] === '!') {
                i++;
                while (i < len && text[i] !== '!' && text[i] !== '\n') i++;
                if (text[i] === '!') i++;
                const value = text.slice(start, i);
                const internalValue = value.slice(1, value.length - 1)
                const predefined = isPredefinedIdentifier(internalValue);
                const includeCandidate = value.slice(1, 8)
                // !include //
                if (predefined !== null && includeCandidate !== 'include') {
                    tokens.push({ type: TT.IDENT_PREDEF, value: predefined.text, start, end: i });
                } else {
                    tokens.push({ type: TT.MACRO, value: value, start, end: i });
                }
                continue;
            }
            // ─────────────────────────────────────────────────────────────────────────────────
            // String " ... " or ' ... '
            if (text[i] === '"' || text[i] === "'") {
                const q = text[i]; i++;
                while (i < len && text[i] !== q) i++;
                if (i < len) i++; // closing quote
                tokens.push({ type: TT.STRING, value: text.slice(start, i), start, end: i });
                continue;
            }
            // ─────────────────────────────────────────────────────────────────────────────────
            // Number (decimal or float)
            if (/[0-9]/.test(text[i])) {
                while (i < len && /[0-9]/.test(text[i])) i++;
                if (i < len && text[i] === '.') {
                    i++;
                    while (i < len && /[0-9]/.test(text[i])) i++;
                    if (i < len && /[deDE]/.test(text[i])) {
                        i++;
                        if (i < len && /[+\-]/.test(text[i])) i++;
                        while (i < len && /[0-9]/.test(text[i])) i++;
                    }
                }
                tokens.push({ type: TT.NUMBER, value: text.slice(start, i), start, end: i });
                continue;
            }
            // ─────────────────────────────────────────────────────────────────────────────────
            // Identifier or keyword
            if (/[a-zA-Z_]/.test(text[i])) {
                while (i < len && /[a-zA-Z0-9_]/.test(text[i])) i++;
                const value = text.slice(start, i);
                const lower = value.toLowerCase();

                const kw = KEYWORD_MAP.get(lower);

                const type = kw ? TT.KEYWORD : TT.IDENT;
                if (type === TT.IDENT) {
                    const predefined = isPredefinedIdentifier(lower);
                    if (predefined !== null) { type = TT.IDENT_PREDEF; }
                }
                // ...further down, wherever you build the token object:
                // const token = { type, value: lower, start, end: i, parent: kw?.parent ?? null };
                // const type = KEYWORD_MAP.has(lower) ? TT.KEYWORD : TT.IDENT;
                // tokens.push({ type, value, lower, start, end: i });
                const token = { type, value: lower, start, end: i, parent: kw?.parent ?? null };
                tokens.push(token);
                continue;
            }
            // ─────────────────────────────────────────────────────────────────────────────────
            // Punctuation
            switch (text[i]) { // Punctuation
                case '(': tokens.push({ type: TT.LPAREN, value: '(', start, end: i + 1 }); i++; break;
                case ')': tokens.push({ type: TT.RPAREN, value: ')', start, end: i + 1 }); i++; break;
                case ',': tokens.push({ type: TT.COMMA, value: ',', start, end: i + 1 }); i++; break;
                case '/': tokens.push({ type: TT.SLASH, value: '/', start, end: i + 1 }); i++; break;
                case '-': tokens.push({ type: TT.DASH, value: '-', start, end: i + 1 }); i++; break;
                case ':': tokens.push({ type: TT.COLON, value: ':', start, end: i + 1 }); i++; break;
                case '+': tokens.push({ type: TT.PLUS, value: '+', start, end: i + 1 }); i++; break;
                case '*': tokens.push({ type: TT.STAR, value: '*', start, end: i + 1 }); i++; break;
                case '%': tokens.push({ type: TT.PERCENT, value: '%', start, end: i + 1 }); i++; break;
                case '|':
                    if (text[i + 1] === '|') {
                        tokens.push({ type: TT.DPIPE, value: '||', start, end: i + 2 }); i += 2;
                    } else {
                        tokens.push({ type: TT.PIPE, value: '|', start, end: i + 1 }); i++;
                    }
                    break;
                case '&':
                    if (text[i + 1] === '&') {
                        tokens.push({ type: TT.DAMP, value: '&&', start, end: i + 2 }); i += 2;
                    } else {
                        tokens.push({ type: TT.AMP, value: '&', start, end: i + 1 }); i++;
                    }
                    break;
                default:
                    i++; // skip unknown char
                    break;
            }
        } catch (errResult) {
            i++;
            logger.err(errResult, `tokenize had an error: ${errResult.message}`);
        }
    }
    // ─────────────────────────────────────────────────────────────────────────────────
    tokens.push({ type: TT.EOF, value: '', start: len, end: len });
    return tokens;
}
//#endregion
// ─────────────────────────────────────────────────────────────────────────────────
// Region PARSER .Parse ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────────
const parseStates = {
    SCRIPT_FULL: 0,
    SCRIPT_FRAGMENT: 1,
    SCRIPT_UNKNOWN: 2
};
class Parser {
    constructor(tokens, text, state = parseStates.SCRIPT_UNKNOWN) {
        this.tokens = tokens;
        this.text = text;
        this.state = state;
        this.pos = 0;
        this.errors = [];
        // todo logger.dbg("stuff")
    }
    //#region ────── (Primitives) Cross-cutting functions .Parse ───────────────
    peek() { return this.curr(); }
    curr() { return this.tokens[this.pos]; }
    next() { return this.tokens[this.pos++]; }
    prev() { return this.tokens[this.pos - 1]; }
    atEof() { return this.curr().type === TT.EOF; }

    // Yes or No?
    parseYesNo() {
        if (!this.isAnyKw('yes', 'no')) {
            this.error(ini.severity.Error, `Expected 'yes' or 'no'`);
        } else this.next();
    }

    // Convert character offset to { line, character }
    offsetToPos(offset) {
        let line = 0, lastNl = -1;
        for (let i = 0; i < offset && i < this.text.length; i++) {
            if (this.text[i] === '\n') { line++; lastNl = i; }
        }
        return { line, character: offset - lastNl - 1 };
    }

    // ─────────────────────────────────────────────────────────────────────────────────
    error = (errorSeverity, message, token) => {
        token = token || this.curr();
        const s = this.offsetToPos(token.start);
        const e = this.offsetToPos(token.end);
        this.errors.push({
            message: message,
            range: {
                start: s,
                end: e,
            },
            severity: errorSeverity,
        });
        logger.message(errorSeverity, message);
    }

    warning = (errorSeverity, message, token) => {
        token = token || this.curr();
        const s = this.offsetToPos(token.start);
        const e = this.offsetToPos(token.end);
        this.errors.push({
            message: message,
            range: { start: s, end: e },
            severity: errorSeverity,
        });
        logger.message(errorSeverity, message);
    }
    //#endregion
    // ─────────────────────────────────────────────────────────────────────────────────
    //#region Match a keyword (case-insensitive)
    expectKw(kw) {
        let t = this.curr();
        if ((t.type === TT.KEYWORD || t.type === TT.IDENT) && t.value.toLowerCase() === kw.toLowerCase()) {
            return this.next();
        }
        this.error(ini.severity.Error, `Expected '${kw}' but found '${t.value}'`, t);
        return null;
    }

    // Try to match a keyword without consuming on failure
    tryKw(kw) {
        let t = this.curr();
        if ((t.type === TT.KEYWORD || t.type === TT.IDENT) && t.value.toLowerCase() === kw.toLowerCase()) {
            this.next(); return true;
        }
        return false;
    }

    isKw(kw) {
        let t = this.curr();
        return (t.type === TT.KEYWORD || t.type === TT.IDENT) && t.value.toLowerCase() === kw.toLowerCase();
    }

    isAnyKw(...kws) {
        let t = this.curr();
        if (t.type !== TT.KEYWORD && t.type !== TT.IDENT) return false;
        return kws.some(k => k.toLowerCase() === t.value.toLowerCase());
    }

    expect(type, desc) {
        let t = this.curr();
        if (t.type === type) return this.next();
        this.error(ini.severity.Error, `Expected ${desc || type} but found '${t.value}'`, t);
        return null;
    }

    tryType(type) {
        if (this.curr().type === type) { this.next(); return true; }
        return false;
    }
    //#endregion
    //#region  Grammar rules - .Parse Statements ─────────────────────────────────────────────────────────
    parseStatements() {
        while (!this.atEof()) {
            if (!this.parseStatement()) break;
            if (this.atEof) {
                // end of file reached successfully
            }
        }
    }
    // .parseStatement
    parseStatement() {
        let t;
        try { // greedy tokey consumer via nested
            // t = current token
            t = this.curr();
            // Skip preprocessor !include "..."! directives
            // logger.dbg(5, `xxx`);
            // logger.dbg(5, `>>>>> ${t.value} type: ${t.type} vs. IDENT or MACRO`)
            // Macros
            if (!this.atEof() &&
                (t.type === TT.MACRO ||
                    (t.type === TT.KEYWORD && t.value.toLowerCase() === 'include'))
            ) {
                this.next();
                t = this.curr();
                return true;
            }
            // KEYWORD
            const kw = (t.type === TT.KEYWORD || t.type === TT.IDENT) ? t.value.toLowerCase() : '';
            switch (kw) { // Statements // 'script' level
                case 'description':
                    this.next();
                    this.expect(TT.LPAREN, '(');
                    this.expect(TT.STRING, 'string');
                    this.expect(TT.RPAREN, ')');
                    return true;

                case 'excludevolumes':
                    this.next();
                    this.expect(TT.LPAREN, '(');
                    this.parseVolumeBooleans();
                    this.expect(TT.RPAREN, ')');
                    return true;

                case 'excludefiles':
                    this.next();
                    this.expect(TT.LPAREN, '(');
                    this.parseFileBooleans();
                    this.expect(TT.RPAREN, ')');
                    return true;

                case 'volumeselect':
                    this.next();
                    this.parseVolumeBooleans();
                    this.expectKw('VolumeActions');
                    this.parseVolumeActions();
                    this.expectKw('VolumeEnd');
                    return true;

                case 'setfilecolor':
                    // ToDo detect parent type.
                    // Outside a VolumeSelect:
                    // SetFileColor(FILESTATE, NUMBER, NUMBER, NUMBER)
                    // Inside a VolumeSelect:
                    // SetFileColor(FILEBOOLEAN, FILESTATE, NUMBER, NUMBER, NUMBER)

                    this.next();
                    this.expect(TT.LPAREN, '(');
                    this.parseFileColorBooleans();
                    this.expect(TT.COMMA, ',');
                    this.parseNumber();
                    this.expect(TT.COMMA, ',');
                    this.parseNumber();
                    this.expect(TT.COMMA, ',');
                    this.parseNumber();
                    this.expect(TT.RPAREN, ')');
                    return true;

                default:
                    if (this.isSetting()) { this.parseSetting(); return true; }
                    return false;
            }
        } catch (errResult) {
            const message = `server.js:Parser:parseStatement: Unexpected error parsing Token: ${t.value.toLowerCase()} NextToken: ${this.curr().value.toLowerCase()} Error: ${errResult.message}`;
            logger.err(errResult, message);
            return message;
        }
    }
    // ── Fragments .Parse ───────────────────────────────────────────────────────
    parseFragment() {
        const start = this.pos;
        const errorCount = this.errors.length;
        const errorFlag = false;
        // First try normal full-document / full-statement parsing.
        if (this.parseStatements()) {
            if (this.atEof()) return true;
        }

        // ─────────────────────────────────────────────────────────────────────────────────
        logger.dbg(5, `server.js:Parser:parseFragment: Full statement parse failed/errors: ${this.errors.length}`);
        // Reset and try fragment-mode parsing from beginning.
        this.pos = start;
        this.errors.length = errorCount;

        // Fragment Properties:
        // ok: true,
        // kind: 'volumeactions',
        // parent: 'volume_block',
        // opens: null,
        // closes: null,
        // allowedParents: ['volume_block', ...]
        const fragment = {
            kind: null,
            parentKind: null,
            stack: []
        };

        // ─────────────────────────────────────────────────────────────────────────────────
        // Process remaining file (or whole file)
        while (!this.atEof()) {
            const statementStart = this.pos;
            const statementErrors = this.errors.length;
            const t = this.curr();
            // ─────────────────────────────────────────────────────────────────────────────────
            // Parse statement
            // MACROs
            if (!this.atEof() &&
                (t.type === TT.MACRO ||
                    (t.type === TT.KEYWORD && t.value.toLowerCase() === 'include'))
            ) {
                this.next();
            } else {
                const keyword = (
                    t &&
                    (t.type === TT.KEYWORD || t.type === TT.IDENT)
                ) ? String(t.value).toLowerCase() : '';
                // NO KEYWORD error
                if (!keyword) {
                    this.error(
                        ini.severity.Error,
                        `server.js:Parser:parseFragment: Expected fragment keyword, got '${t?.value}'`
                    );
                    const errorFlag = true;
                    break;
                }
                // Get Keyword Data
                const info = this.parseFragmentKeywordBackward(keyword, {
                    fragment,
                    token: t
                });
                // Unknown fragment keyword
                if (!info || !info.ok) {
                    this.error(
                        ini.severity.Error,
                        `server.js:Parser:parseFragment: Unknown fragment keyword '${keyword}' parent '${t.parent}'`
                    );
                    const errorFlag = true;
                    break;
                }

                // ─────────────────────────────────────────────────────────────────────────────────
                // Determine script category. Based on first statement
                const canReplaceFragmentParent =
                    !fragment.parentKind ||
                    fragment.parentKind === 'any' ||
                    (
                        fragment.parentKind === 'script' &&
                        info.parent !== 'script' &&
                        info.parent !== 'any'
                    );

                if (canReplaceFragmentParent) {
                    fragment.kind = info.kind;
                    fragment.parentKind = info.parent;
                    fragment.parentHints = info.parentHints || null;
                }

                // ─────────────────────────────────────────────────────────────────────────────────
                // Later statements must be legal in the established fragment context.
                if (!this.fragmentAllows(info, fragment)) {
                    this.error(
                        ini.severity.Error,
                        `server.js:Parser:parseFragment: '${keyword}' is '${info.kind}' and belongs in '${info.parent}', ` +
                        `but this fragment was established as '${fragment.parentKind}'`
                    );
                    const errorFlag = true;
                    break;
                }

                // ─────────────────────────────────────────────────────────────────────────────────
                // Now actually parse the statement using the real parser.
                if (!this.parseFragmentStatementByKind(info)) {
                    this.pos = statementStart;
                    this.errors.length = statementErrors;

                    this.error(
                        ini.severity.Error,
                        `server.js:Parser:parseFragment: Failed parsing fragment statement '${keyword}' as '${info.kind}'`
                    );
                    const errorFlag = true;
                    break;
                }

                // Safety guard: parser must consume something.
                if (this.pos === statementStart) {
                    this.error(
                        ini.severity.Error,
                        `server.js:Parser:parseFragment: Parser made no progress at '${keyword}'`
                    );
                    const errorFlag = true;
                    break;
                }

                if (!errorFlag) { this.updateFragmentStack(info, fragment); }
            }
        }
        this.hintFragmentParent(fragment);
        if (this.atEof() && !errorFlag) { return true; } else { return false; }
    }
    // Builds a hint to insert at the top of the document.
    hintFragmentParent(fragment) {
        if (!fragment) return;

        const parents = this.getFragmentParentHints(fragment);
        if (!parents.length) return;

        const message =
            parents.length === 1
                ? `SCRIPT_FRAGMENT: insert this fragment inside ${parents[0]}.`
                : `SCRIPT_FRAGMENT: insert this fragment inside one of: ${parents.join(', ')}.`;

        this.hintAtStart(message);
    }
    // Add a hint diagnostic at the start of the document.
    hintAtStart(message) {
        this.errors.push({
            message: message,
            range: { start: 0, end: 0 },
            severity: ini.severity.Hint,
        });
    }
    // Get the array of hint descriptions
    getFragmentParentHints(fragment) {
        const parent = fragment.parentKind;
        const kind = fragment.kind;

        switch (parent) {
            case 'script':
                return ['script'];

            case 'volume_block':
                return ['VolumeSelect ... VolumeActions ... VolumeEnd block'];

            case 'volumeactions':
                return ['VolumeActions'];

            case 'file_block':
                return ['FileSelect ... FileActions ... FileEnd block'];

            case 'fileactions':
                return ['FileActions'];

            case 'fileselect':
                return ['FileSelect'];

            case 'volumeselect':
                return ['VolumeSelect'];

            case 'any':
                return ['script', 'VolumeActions', 'FileActions'];

            default:
                if (kind === 'settingInline') {
                    return ['script'];
                }

                return parent ? [parent] : [];
        }
    }
    // ─────────────────────────────────────────────────────────────────────────────────
    //#region  Backward reasoning functions.
    parseFragmentKeywordBackward(keyword, ctx = {}) {
        //
        switch ((keyword || '').toLowerCase()) {

            // Top-level script statements
            case 'batterypower':
                return this.backwardBatteryPower(ctx);

            case 'description':
                return this.backwardDescription(ctx);

            case 'title':
                return this.backwardTitle(ctx);

            case 'whenfinished':
                return this.backwardWhenFinished(ctx);

            case 'appendlogfile':
                return this.backwardAppendLogFile(ctx);

            case 'write':
                return this.backwardWrite(ctx);

            case 'message':
                return this.backwardMessage(ctx);

            case 'setvariable':
            case 'setvariabledefault':
            case 'setvariableifempty':
                return this.backwardSetVariable(ctx);

            // Volume-level blocks
            case 'volumeselect':
                return this.backwardVolumeSelect(ctx);

            case 'volumeactions':
                return this.backwardVolumeActions(ctx);

            case 'volumeend':
                return this.backwardVolumeEnd(ctx);

            case 'excludevolumes':
                return this.backwardExcludeVolumes(ctx);

            // File-level blocks
            case 'fileselect':
                return this.backwardFileSelect(ctx);

            case 'fileactions':
                return this.backwardFileActions(ctx);

            case 'fileend':
                return this.backwardFileEnd(ctx);

            case 'excludefiles':
                return this.backwardExcludeFiles(ctx);

            // File action statements
            case 'sortbyname':
            case 'sortbyextension':
            case 'sortbysize':
            case 'sortbycreationdate':
            case 'sortbylastaccess':
            case 'sortbylastchange':
            case 'sortbyimportancetofile':
            case 'sortbyimportancetovolume':
            case 'sortbyfragmentation':
            case 'sortbylcn':
                return this.backwardFileSortAction(ctx);

            case 'moveup':
            case 'movedown':
            case 'movetobeginofdisk':
            case 'movetoendofdisk':
            case 'movetobeginofvolume':
            case 'movetoendofvolume':
            case 'movetoendofdsk': // keep only if your grammar currently accepts this typo/alias
                return this.backwardFileMoveAction(ctx);

            case 'defragment':
            case 'fastfill':
            case 'forcedfill':
            case 'vacate':
            case 'makegap':
            case 'addgap':
                return this.backwardFileAction(ctx);

            // Special/simple
            case 'fastboot':
                return this.backwardSimpleStatement(ctx);

            default:
                if (this.isSetting()) {
                    // this.parseSetting(); 
                    return this.backwardSetting(ctx);
                }
                return this.backwardUnknownKeyword(keyword, ctx);
        }
    }
    // ─────────────────────────────────────────────────────────────────────────────────
    //#endregion
    //#region Backward Syntax Classification
    backwardVolumeSelect(ctx) {
        return {
            ok: true,
            kind: 'volumeselect',
            parent: 'volume_block',
            opens: 'volume_block',
            closes: null,
            allowedParents: ['volume_block', 'script']
        };
    }

    backwardVolumeActions(ctx) {
        return {
            ok: true,
            kind: 'volumeactions',
            parent: 'volume_block',
            opens: null,
            closes: null,
            allowedParents: ['volume_block']
        };
    }

    backwardVolumeEnd(ctx) {
        return {
            ok: true,
            kind: 'volumeend',
            parent: 'volume_block',
            opens: null,
            closes: 'volume_block',
            allowedParents: ['volume_block']
        };
    }

    backwardFileSelect(ctx) {
        return {
            ok: true,
            kind: 'fileselect',
            parent: 'volumeactions',
            opens: 'file_block',
            closes: null,
            allowedParents: ['volumeactions']
        };
    }

    backwardFileActions(ctx) {
        return {
            ok: true,
            kind: 'fileactions',
            parent: 'file_block',
            opens: null,
            closes: null,
            allowedParents: ['file_block']
        };
    }

    backwardFileEnd(ctx) {
        return {
            ok: true,
            kind: 'fileend',
            parent: 'file_block',
            opens: null,
            closes: 'file_block',
            allowedParents: ['file_block']
        };
    }
    // Script level statements
    backwardScriptStatement(ctx, kind = null) {
        const keyword = String(ctx.token?.value || '').toLowerCase();

        return {
            ok: true,
            keyword,
            kind: kind || keyword,
            parent: 'script',
            opens: null,
            closes: null,
            allowedParents: ['script']
        };
    }

    backwardSetting(ctx) {
        return this.backwardScriptStatement(ctx, 'settingInline');
    }

    backwardBatteryPower(ctx) {
        return this.backwardScriptStatement(ctx, 'batterypower');
    }

    backwardDescription(ctx) {
        return this.backwardScriptStatement(ctx, 'description');
    }

    backwardTitle(ctx) {
        return this.backwardScriptStatement(ctx, 'title');
    }

    backwardWhenFinished(ctx) {
        return this.backwardScriptStatement(ctx, 'whenfinished');
    }

    backwardAppendLogFile(ctx) {
        return this.backwardScriptStatement(ctx, 'appendlogfile');
    }

    backwardWrite(ctx) {
        return this.backwardScriptStatement(ctx, 'write');
    }

    backwardMessage(ctx) {
        return this.backwardScriptStatement(ctx, 'message');
    }

    backwardSetVariable(ctx) {
        return {
            ok: true,
            keyword: String(ctx.token?.value || '').toLowerCase(),
            kind: 'settingInline',
            parent: 'any',
            opens: null,
            closes: null,
            allowedParents: ['script', 'volumeactions', 'fileactions', 'any']
        };
    }

    backwardExcludeVolumes(ctx) {
        return {
            ok: true,
            keyword: 'excludevolumes',
            kind: 'volume_condition',
            parent: 'script',
            opens: null,
            closes: null,
            allowedParents: ['script']
        };
    }

    backwardExcludeFiles(ctx) {
        return {
            ok: true,
            keyword: 'excludefiles',
            kind: 'file_condition',
            parent: 'script',
            opens: null,
            closes: null,
            allowedParents: ['script']
        };
    }

    backwardFileSortAction(ctx) {
        return {
            ok: true,
            keyword: String(ctx.token?.value || '').toLowerCase(),
            kind: 'sort',
            parent: 'file_action',
            opens: null,
            closes: null,
            allowedParents: ['fileactions', 'file_action']
        };
    }

    backwardFileMoveAction(ctx) {
        return {
            ok: true,
            keyword: String(ctx.token?.value || '').toLowerCase(),
            kind: 'file_action',
            parent: 'fileactions',
            opens: null,
            closes: null,
            allowedParents: ['fileactions']
        };
    }

    backwardFileAction(ctx) {
        return {
            ok: true,
            keyword: String(ctx.token?.value || '').toLowerCase(),
            kind: 'file_action',
            parent: 'fileactions',
            opens: null,
            closes: null,
            allowedParents: ['fileactions']
        };
    }

    backwardSimpleStatement(ctx) {
        const keyword = String(ctx.token?.value || '').toLowerCase();

        return {
            ok: true,
            keyword,
            kind: keyword,
            parent: 'script',
            opens: null,
            closes: null,
            allowedParents: ['script']
        };
    }

    backwardUnknownKeyword(keyword, ctx) {
        return {
            ok: false,
            keyword: String(keyword || '').toLowerCase(),
            kind: 'unknown',
            parent: null,
            opens: null,
            closes: null,
            allowedParents: []
        };
    }
    // ─────────────────────────────────────────────────────────────────────────────────
    // Builds Case Statement structures
    makeBackwardCases(keywords) {
        return keywords
            .map(k => {
                const method =
                    'backward' +
                    k.replace(/[^a-zA-Z0-9]+/g, ' ')
                        .trim()
                        .split(/\s+/)
                        .map(s => s[0].toUpperCase() + s.slice(1))
                        .join('');

                return `        case '${k.toLowerCase()}':\n            return this.${method}(ctx);`;
            })
            .join('\n\n');
    }
    //#endregion
    //#region Parse Fragment functions
    fragmentAllows(info, fragment) {
        if (!info || !fragment) return false;

        // First statement is always allowed to establish the fragment.
        if (!fragment.parentKind) return true;

        // Exact parent match.
        if (info.parent === fragment.parentKind) return true;

        // Explicit allowed parent match.
        if (
            Array.isArray(info.allowedParents) &&
            info.allowedParents.includes(fragment.parentKind)
        ) {
            return true;
        }

        // If this fragment opened a nested block, allow statements inside it.
        const currentBlock = fragment.stack?.[fragment.stack.length - 1];
        if (currentBlock && info.parent === currentBlock) return true;

        if (
            currentBlock &&
            Array.isArray(info.allowedParents) &&
            info.allowedParents.includes(currentBlock)
        ) {
            return true;
        }

        return false;
    }
    // ─────────────────────────────────────────────────────────────────────────────────
    parseFragmentStatementByKind(info) {
        switch (info.kind) {
            // Normal statements/blocks already handled by parseStatement()
            case 'description':
            case 'title':
            case 'whenfinished':
            case 'appendlogfile':
            case 'write':
            case 'message':
            case 'settingInline':

            case 'volumeselect':
            case 'volumeactions':
            case 'volumeend':
            case 'excludevolumes':

            case 'fileselect':
            case 'fileactions':
            case 'fileend':
            case 'excludefiles':

            case 'fastboot':
                return this.parseStatement();

            // Fragments that start inside VolumeSelect(...)
            case 'volume_condition':
                return this.parseVolumeBooleans();

            // Fragments that start inside VolumeActions(...)
            case 'volume_action':
            case 'filesystem':
                return this.parseVolumeActions();

            // Fragments that start inside FileSelect(...)
            case 'file_condition':
            case 'file_attribute':
                return this.parseFileBooleans(false);

            // Fragments that start inside FileActions(...)
            case 'file_action':
            case 'sort':
            case 'action_modifier':
                return this.parseFileActions();

            // Literal value fragment
            case 'value':
                return this.parseNumber();

            default:
                return this.parseStatement();
        }
    }
    // ─────────────────────────────────────────────────────────────────────────────────
    updateFragmentStack(info, fragment) {
        if (!info || !fragment) return;

        if (!Array.isArray(fragment.stack)) {
            fragment.stack = [];
        }

        if (info.closes) {
            const top = fragment.stack[fragment.stack.length - 1];

            if (top === info.closes) {
                fragment.stack.pop();
            }
        }

        if (info.opens) {
            fragment.stack.push(info.opens);
        }
    }
    //#endregion
    // ─────────────────────────────────────────────────────────────────────────────────
    //#region Volume and FIle Booleans .Parse ───────────────────────────────────────────────────────
    parseVolumeBooleans() {
        this.parseVolumeBoolean();
        while (!this.atEof() && !this.isKw('VolumeActions') && !this.isKw('VolumeEnd')) {
            if (this.isAnyKw('or', 'and') ||
                this.curr().type === TT.PIPE || this.curr().type === TT.DPIPE ||
                this.curr().type === TT.AMP || this.curr().type === TT.DAMP) {
                this.next();
                this.parseVolumeBoolean();
            } else {
                break;
            }
        }
    }
    parseVolumeBoolean() {
        let t = this.curr();
        // Parentheses
        if (t.type === TT.LPAREN) {
            this.next();
            // recursive call to handle parentheses ( ...conditions... )
            this.parseVolumeBooleans();
            this.expect(TT.RPAREN, ')');
            return;
        }
        // Macros
        // Macros
        if (!this.atEof() &&
            (t.type === TT.MACRO ||
                (t.type === TT.KEYWORD && t.value.toLowerCase() === 'include'))
        ) {
            this.next();
            t = this.curr();
            return;
        }
        // KEYWORD
        const kw = (t.type === TT.KEYWORD || t.type === TT.IDENT) ? t.value.toLowerCase() : '';
        // Booleans
        switch (kw) { // VolumeBoolean
            case 'not':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.parseVolumeBooleans();
                this.expect(TT.RPAREN, ')');
                break;
            case 'all': case 'checkvolume':
                this.next();
                break;
            case 'commandlinevolumes':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.expect(TT.RPAREN, ')');
                break;
            case 'mounted': case 'writable': case 'removable': case 'fixed':
            case 'remote': case 'cdrom': case 'ramdisk':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.parseYesNo();
                this.expect(TT.RPAREN, ')');
                break;
            case 'name': case 'label':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.expect(TT.STRING, 'string');
                this.expect(TT.RPAREN, ')');
                break;
            case 'size': case 'fragmentcount': case 'fragmentsize':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.parseNumber();
                this.expect(TT.COMMA, ',');
                this.parseNumber();
                this.expect(TT.RPAREN, ')');
                break;
            case 'numberbetween':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.parseNumber();
                this.expect(TT.COMMA, ',');
                this.parseNumber();
                this.expect(TT.COMMA, ',');
                this.parseNumber();
                this.expect(TT.RPAREN, ')');
                break;
            case 'filesystemtype':
                this.next();
                this.expect(TT.LPAREN, '(');
                if (!this.isAnyKw('ntfs', 'fat', 'fat12', 'fat16', 'fat32')) {
                    this.error(ini.severity.Error, `Expected filesystem type (NTFS, FAT, FAT12, FAT16, FAT32)`);
                } else this.next();
                this.expect(TT.RPAREN, ')');
                break;
            default:
                this.error(ini.severity.Error, `Unexpected token '${t.value}' in volume boolean`, t);
                this.next(); // skip to avoid infinite loop
        }
    }
    // ── File Booleans .Parse ─────────────────────────────────────────────────────────
    parseFileBooleans() {
        console?.log('server.js:Parser: parseFileBooleans: ' + this.curr().value);
        this.parseFileBoolean(true);
        console?.log('server.js:Parser: parseFileBooleans after first boolean: ' + this.curr().value);
        while (!this.atEof() && !this.isKw('FileActions') && !this.isKw('FileEnd') && !this.isKw('VolumeEnd')) {
            if (this.isAnyKw('or', 'and') ||
                this.curr().type === TT.PIPE || this.curr().type === TT.DPIPE ||
                this.curr().type === TT.AMP || this.curr().type === TT.DAMP) {
                this.next();
                this.parseFileBoolean(true);
            } else {
                break;
            }
        }
    }
    parseFileBoolean(reportErrors = true) {
        let t = this.curr();
        // Parentheses
        if (t.type === TT.LPAREN) {
            this.next();
            // does recursive calls for nested parentheses
            this.parseFileBooleans();
            this.expect(TT.RPAREN, ')');
            return;
        }
        // Macros
        while (!this.atEof() &&
            (t.type === TT.MACRO ||
                (t.type === TT.KEYWORD && t.value.toLowerCase() === 'include'))
        ) {
            this.next();
            t = this.curr();
        }
        // KEYWORD
        const kw = (t.type === TT.KEYWORD || t.type === TT.IDENT) ? t.value.toLowerCase() : '';
        switch (kw) { // FileBoolean
            case 'not':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.parseFileBooleans();
                this.expect(TT.RPAREN, ')');
                break;
            case 'all':
                this.next();
                break;
            case 'importlistfrombootoptimize':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.expect(TT.RPAREN, ')');
                break;
            case 'filename': case 'directoryname': case 'directorypath':
            case 'importlistfromfile': case 'importlistfromprogramhints':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.expect(TT.STRING, 'string');
                this.expect(TT.RPAREN, ')');
                break;
            case 'fullpath':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.expect(TT.STRING, 'string');
                this.expect(TT.COMMA, ',');
                this.expect(TT.STRING, 'string');
                this.expect(TT.RPAREN, ')');
                break;
            case 'size': case 'fragmentcount':
            case 'averagefragmentsize': case 'largestfragmentsize': case 'smallestfragmentsize':
            case 'lastaccess': case 'lastchange': case 'creationdate':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.parseDateTime();
                this.expect(TT.COMMA, ',');
                this.parseDateTime();
                this.expect(TT.RPAREN, ')');
                break;
            case 'largest': case 'smallest':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.parseNumber();
                this.expect(TT.RPAREN, ')');
                break;
            case 'fragmented': case 'lastaccessenabled':
            case 'archive': case 'compressed': case 'directory': case 'encrypted':
            case 'hidden': case 'nottobeindexed': case 'offline': case 'readonly':
            case 'sparse': case 'system': case 'temporary': case 'virtual':
            case 'unmovable': case 'selectntfssystemfiles':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.parseYesNo();
                this.expect(TT.RPAREN, ')');
                break;
            case 'filelocation':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.parseFileLocationOption();
                this.expect(TT.COMMA, ',');
                this.parseNumber();
                this.expect(TT.COMMA, ',');
                this.parseNumber();
                this.expect(TT.RPAREN, ')');
                break;
            default:
                if (reportErrors) {
                    this.error(ini.severity.Error, `Unexpected token '${t.value}' in file boolean`, t);
                    this.next();
                } else {
                    this.error(ini.severity.Warning, `Unexpected token '${t.value}' in file boolean, continuing...`, t);
                    this.next();
                }
        }
    }
    parseFileLocationOption() {
        if (!this.isAnyKw('beginoffile', 'endoffile', 'entirefile', 'anypart', 'anycompletefragment')) {
            this.error(ini.severity.Error, `Expected file location option`);
        } else this.next();
    }
    //#endregion
    //#region Volume and File Actions .Parse ────────────────────────────────────────────────────────
    parseVolumeActions() {
        while (!this.atEof() && !this.isKw('VolumeEnd')) {
            // if (this.tryKw('MaxRunTime')) {
            //     this.expect(TT.LPAREN, '(');
            //     this.parseDateTime();
            //     this.expect(TT.RPAREN, ')');
            //     continue;
            // }
            if (!this.parseVolumeAction()) break;
        }
    }
    parseVolumeAction() {
        let t = this.curr();
        // Macros
        if (!this.atEof() &&
            (t.type === TT.MACRO ||
                (t.type === TT.KEYWORD && t.value.toLowerCase() === 'include'))
        ) {
            this.next();
            t = this.curr();
            return true;
        }
        const kw = (t.type === TT.KEYWORD || t.type === TT.IDENT) ? t.value.toLowerCase() : '';

        switch (kw) { // VolumeAction
            case 'reclaimntfsreservedareas':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.parseSettings();
                this.expect(TT.RPAREN, ')');
                return true;
            case 'fileselect':
                this.next();
                this.parseFileBooleans();
                this.expectKw('FileActions');
                this.parseFileActions();
                this.expectKw('FileEnd');
                return true;
            case 'makegap':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.parseNumber();
                this.parseMakeGapOptions();
                this.expect(TT.RPAREN, ')');
                return true;
            case 'dismountvolume': case 'deletejournal':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.expect(TT.RPAREN, ')');
                return true;
            case 'setfilecolor':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.parseFileBooleans();
                this.expect(TT.COMMA, ',');
                this.parseFileColorBooleans();
                this.expect(TT.COMMA, ',');
                this.parseNumber();
                this.expect(TT.COMMA, ',');
                this.parseNumber();
                this.expect(TT.COMMA, ',');
                this.parseNumber();
                this.expect(TT.RPAREN, ')');
                return true;
            default:
                if (this.isSetting()) { this.parseSetting(); return true; }
                return false;
        }
    }
    // ── File Actions .Parse ──────────────────────────────────────────────────────────
    parseFileActions() {
        while (!this.atEof() && !this.isKw('FileEnd')) {
            // if (this.tryKw('MaxRunTime')) {
            //     this.expect(TT.LPAREN, '(');
            //     this.parseDateTime();
            //     this.expect(TT.RPAREN, ')');
            //     continue;
            // }
            if (!this.parseFileAction()) break;
        }
    }
    parseFileAction() {
        let t = this.curr();
        const kw = (t.type === TT.KEYWORD || t.type === TT.IDENT) ? t.value.toLowerCase() : '';

        switch (kw) { // FileAction
            case 'defragment':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.parseDefragmentOptions();
                this.expect(TT.RPAREN, ')');
                return true;
            case 'fastfill':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.parseFastFillOptions();
                this.expect(TT.RPAREN, ')');
                return true;
            case 'movedownfill': case 'movetoendofdisk': case 'moveuptozone': case 'forcedfill':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.expect(TT.RPAREN, ')');
                return true;
            case 'sortbyname': case 'sortbysize': case 'sortbylastaccess':
            case 'sortbylastchange': case 'sortbycreationdate':
            case 'sortbynewestdate': case 'sortbyimportsequence':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.parseAscDesc();
                this.parseSortByOption();
                this.expect(TT.RPAREN, ')');
                return true;
            case 'placentfssystemfiles':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.parseAscDesc();
                this.parseSortByOption();
                this.expect(TT.COMMA, ',');
                this.parseNumber();
                this.expect(TT.RPAREN, ')');
                return true;
            case 'addgap':
                this.next();
                this.expect(TT.LPAREN, '(');
                this.parseNumber();
                this.parseMakeGapOptions();
                this.expect(TT.RPAREN, ')');
                return true;
            default:
                if (this.isSetting()) { this.parseSetting(); return true; }
                return false;
        }
    }
    //#endregion
    //#region Defragment Options .Parse ─────────────────────────────────────────────────────────
    parseDefragmentOptions() {
        if (this.tryKw('ChunkSize')) {
            this.expect(TT.LPAREN, '(');
            this.parseNumber();
            this.expect(TT.RPAREN, ')');
        } else {
            this.tryKw('Fast');
        }
    }
    parseFastFillOptions() {
        this.tryKw('WithShuffling');
    }
    parseMakeGapOptions() {
        if (this.curr().type === TT.COMMA) {
            this.next();
            this.expectKw('DoNotVacate');
        }
    }
    parseAscDesc() {
        if (!this.isAnyKw('ascending', 'descending')) {
            this.error(ini.severity.Error, `Expected 'Ascending' or 'Descending'`);
        } else this.next();
    }
    parseSortByOption() {
        if (this.tryKw('SkipBlock')) {
            this.expect(TT.LPAREN, '(');
            this.parseNumber();
            this.expect(TT.COMMA, ',');
            this.parseNumber();
            this.expect(TT.RPAREN, ')');
        }
    }
    //#endregion
    // ─────────────────────────────────────────────────────────────────────────────────
    //#region Settings .Parse ──────────────────────────────────────────────────────────────

    isSetting() {
        const kw = this.curr().value ? this.curr().value.toLowerCase() : '';
        return [
            'maxruntime', 'message', 'language', 'title', 'windowsize', 'diskmapflip', 'statusbar',
            'zoomlevel', 'setcolor', 'slowdown', 'pause', 'whenfinished', 'otherinstances',
            'runscript', 'runprogram', 'batterypower', 'setscreensaver', 'setscreenpowersaver',
            'filemovechunksize', 'debug', 'setstatisticswindowtext', 'writelogfile',
            'appendlogfile', 'ignorewraparoundfragmentation', 'processpriority',
            'exitiftimeout', 'rememberunmovables', 'setvariable',
        ].includes(kw);
    }

    parseSettings() {
        while (this.isSetting()) {
            this.parseSetting();
        }
    }

    parseSetting() {
        try { // Parser parseSetting
            let t = this.curr();
            const kw = t.value.toLowerCase();
            this.next();

            switch (kw) { // parseSetting
                case 'maxruntime':
                    this.next();
                    this.expect(TT.LPAREN, '(');
                    this.parseDateTime();
                    this.expect(TT.RPAREN, ')');
                    return true;
                case 'message':
                    this.expect(TT.LPAREN, '(');
                    this.expect(TT.STRING, 'string');
                    this.expect(TT.COMMA, ',');
                    this.expect(TT.STRING, 'string');
                    this.expect(TT.RPAREN, ')');
                    break;
                case 'language': case 'title': case 'runscript': case 'setstatisticswindowtext':
                    this.expect(TT.LPAREN, '(');
                    this.expect(TT.STRING, 'string');
                    this.expect(TT.RPAREN, ')');
                    break;
                case 'runprogram':
                    this.expect(TT.LPAREN, '(');
                    this.parseStringArguments();
                    this.expect(TT.RPAREN, ')');
                    break;
                case 'windowsize':
                    this.expect(TT.LPAREN, '(');
                    if (!this.isAnyKw('fixed', 'minimized', 'maximized', 'invisible', 'restore')) {
                        this.error(ini.severity.Error, `Expected window size option`);
                    } else this.next();
                    this.expect(TT.RPAREN, ')');
                    break;
                case 'diskmapflip': case 'ignorewraparoundfragmentation': case 'rememberunmovables':
                    this.expect(TT.LPAREN, '(');
                    this.parseYesNo();
                    this.expect(TT.RPAREN, ')');
                    break;
                case 'statusbar':
                    this.expect(TT.LPAREN, '(');
                    this.parseStatusBars();
                    this.expect(TT.RPAREN, ')');
                    break;
                case 'zoomlevel': case 'slowdown': case 'filemovechunksize':
                case 'debug': case 'exitiftimeout':
                    this.expect(TT.LPAREN, '(');
                    this.parseNumber();
                    this.expect(TT.RPAREN, ')');
                    break;
                case 'setcolor':
                    this.expect(TT.LPAREN, '(');
                    this.parseColorName();
                    this.expect(TT.COMMA, ',');
                    this.parseNumber();
                    this.expect(TT.COMMA, ',');
                    this.parseNumber();
                    this.expect(TT.COMMA, ',');
                    this.parseNumber();
                    this.expect(TT.RPAREN, ')');
                    break;
                case 'pause':
                    this.expect(TT.LPAREN, '(');
                    this.parseDateTime();
                    this.expect(TT.RPAREN, ')');
                    break;
                case 'whenfinished':
                    this.expect(TT.LPAREN, '(');
                    this.parseWhenFinished();
                    this.expect(TT.RPAREN, ')');
                    break;
                case 'otherinstances':
                    this.expect(TT.LPAREN, '(');
                    if (!this.isAnyKw('ask', 'allow', 'exit', 'kill')) {
                        this.error(ini.severity.Error, `Expected 'ask', 'allow', 'exit', or 'kill'`);
                    } else this.next();
                    this.expect(TT.RPAREN, ')');
                    break;
                case 'batterypower':
                    this.expect(TT.LPAREN, '(');
                    if (!this.isAnyKw('ask', 'allow', 'exit')) {
                        this.error(ini.severity.Error, `Expected 'ask', 'allow', or 'exit'`);
                    } else this.next();
                    this.expect(TT.RPAREN, ')');
                    break;
                case 'setscreensaver': case 'setscreenpowersaver':
                    this.expect(TT.LPAREN, '(');
                    if (!this.isAnyKw('off', 'reset')) {
                        this.error(ini.severity.Error, `Expected 'off' or 'reset'`);
                    } else this.next();
                    this.expect(TT.RPAREN, ')');
                    break;
                case 'writelogfile': case 'appendlogfile':
                    this.expect(TT.LPAREN, '(');
                    this.expect(TT.STRING, 'string');
                    this.expect(TT.COMMA, ',');
                    this.expect(TT.STRING, 'string');
                    this.expect(TT.RPAREN, ')');
                    break;
                case 'processpriority':
                    this.expect(TT.LPAREN, '(');
                    if (!this.isAnyKw('normal', 'belownormal', 'low', 'abovenormal', 'high', 'background')) {
                        this.error(ini.severity.Error, `Expected process priority`);
                    } else this.next();
                    this.expect(TT.RPAREN, ')');
                    break;
                case 'setvariable':
                    this.expect(TT.LPAREN, '(');

                    // variable name
                    logger.dbg(8, `>> Setting: ${kw} type: ${this.curr().type} vs. IDENT or KEYWORD`)

                    if (this.curr().type !== TT.IDENT && this.curr().type !== TT.KEYWORD) {
                        this.error(ini.severity.Error, `Expected variable name`);
                    } else this.next();

                    this.expect(TT.COMMA, ',');

                    // value can be number or string // ToDo ?includes? ?macros?
                    if (this.curr().type === TT.STRING) {
                        this.next();
                    } else {
                        this.parseNumber();
                    }

                    this.expect(TT.RPAREN, ')');
                    break;
                default:
                    this.error(ini.severity.Error, `Unknown setting '${t.value}'`, t);
            }
        } catch (errResult) {
            const message = `server.js:ValidateDocument Unexpected error Generating Preview of document: + ${errResult.message}`;
            logger.err(errResult, message);
            return message;
        }
    }
    //#endregion
    //#region MyDefrag Features .Parse ─────────────────────────────────────────────────────────
    parseStatusBars() {
        while (this.isAnyKw('all', 'status', 'path', 'mouseover')) {
            this.next();
        }
    }

    parseWhenFinished() {
        if (this.tryKw('Wait') || this.tryKw('Exit')) return;
        if (this.tryKw('Shutdown')) {
            while (this.isAnyKw('reboot', 'warnusers', 'forced')) this.next();
            return;
        }
        if (this.tryKw('Hibernate') || this.tryKw('Standby')) {
            this.tryKw('Forced');
            return;
        }
        this.error(ini.severity.Error, `Expected WhenFinished option`);
    }

    // ── Color Features .Parse ───────────────────────────────────────────────────

    parseColorName() {
        if (!this.isAnyKw('empty', 'allocated', 'busyread', 'busywrite', 'text')) {
            this.error(ini.severity.Error, `Expected color name`);
        } else this.next();
    }

    parseFileColorBooleans() {
        this.parseFileColorBoolean();
        while (this.isAnyKw('or', 'and') ||
            this.curr().type === TT.PIPE || this.curr().type === TT.DPIPE ||
            this.curr().type === TT.AMP || this.curr().type === TT.DAMP) {
            this.next();
            this.parseFileColorBoolean();
        }
    }

    parseFileColorBoolean() {
        let t = this.curr();
        if (t.type === TT.LPAREN) {
            this.next();
            this.parseFileColorBooleans();
            this.expect(TT.RPAREN, ')');
            return;
        }
        if (this.isKw('not')) {
            this.next();
            this.expect(TT.LPAREN, '(');
            this.parseFileColorBooleans();
            this.expect(TT.RPAREN, ')');
            return;
        }
        if (this.isAnyKw('fragmented', 'movable', 'selected', 'processed', 'all')) {
            this.next(); return;
        }
        this.error(ini.severity.Error, `Unexpected token '${t.value}' in file color boolean`, t);
        this.next();
    }
    //#endregion
    //#region Number(s) and Value(s) .Parse ───────────────────────────────────────────
    parseNumber() {
        this.parseMultiplyDivide();
        while (this.curr().type === TT.PLUS ||
            (this.curr().type === TT.DASH && this.curr().value === '-')) {
            this.next();
            this.parseMultiplyDivide();
        }
    }
    parseMultiplyDivide() {
        this.parseValue();
        while (this.curr().type === TT.STAR ||
            this.curr().type === TT.SLASH ||
            this.curr().type === TT.PERCENT) {
            this.next();
            this.parseValue();
        }
    }
    tryDecMultiple() {
        const multiples = [
            'k', 'm', 'g', 't', 'p', 'e', 'z', 'y',
            'kb', 'mb', 'gb', 'tb', 'pb', 'eb', 'zb', 'yb',
            'ki', 'mi', 'gi', 'ti', 'pi', 'ei', 'zi', 'yi',
        ];
        let t = this.curr();
        if ((t.type === TT.KEYWORD || t.type === TT.IDENT) &&
            multiples.includes(t.value.toLowerCase())) {
            this.next();
        }
    }
    parseNumbers() {
        this.parseNumber();
        while (this.curr().type === TT.COMMA) {
            this.next();
            this.parseNumber();
        }
    }
    // ── Values .Parse ───────────────────────────────────────────────────────────────
    parseValue() {
        let t = this.curr();

        if (t.type === TT.NUMBER) {
            this.next();
            this.tryDecMultiple();
            return;
        }

        if (t.type === TT.LPAREN) {
            this.next();
            this.parseNumber();
            this.expect(TT.RPAREN, ')');
            return;
        }

        if (t.type === TT.DASH) {
            this.next();
            // negative variable
            if (this.curr().type === TT.IDENT || this.curr().type === TT.KEYWORD) {
                this.next();
            } else {
                this.error(ini.severity.Error, `Expected variable after '-'`);
            }
            return;
        }

        if (this.isAnyKw('rounddown', 'roundup')) {
            this.next();
            this.expect(TT.LPAREN, '(');
            this.parseNumber();
            this.expect(TT.COMMA, ',');
            this.parseNumber();
            this.expect(TT.RPAREN, ')');
            return;
        }

        if (this.isAnyKw('minimum', 'maximum')) {
            this.next();
            this.expect(TT.LPAREN, '(');
            this.parseNumbers();
            this.expect(TT.RPAREN, ')');
            return;
        }

        // Variable or keyword used as value (e.g. VolumeSize)
        if (t.type === TT.IDENT || t.type === TT.KEYWORD) {
            this.next();
            this.tryDecMultiple();
            return;
        }

        // Macro used as value
        if (t.type === TT.MACRO) {
            this.next();
            return;
        }

        this.error(ini.severity.Error, `Expected number or variable but found '${t.value}'`, t);
        this.next();
    }
    // ── Strings .Parse ───────────────────────────────────────────────────────────────
    parseStringArguments() {
        this.expect(TT.STRING, 'string');
        while (this.curr().type === TT.COMMA) {
            this.next();
            this.expect(TT.STRING, 'string'); // todo or PREDEFINED_IDENT or MACRO
        }
    }
    // ── . Parse DateTime .Parse ──────────────────────────────────────────────────────────────
    parseDateTime() {
        // Empty is valid — return if next token is ) or ,
        if (this.curr().type === TT.RPAREN ||
            this.curr().type === TT.COMMA) return;
        // now
        if (this.tryKw('now')) return;

        // Try to parse date/time — flexible since many forms exist
        // Just parse a value and optional modifiers
        this.parseValue();

        // Check for date separators / or -
        if (this.curr().type === TT.SLASH || this.curr().type === TT.DASH) {
            this.next(); this.parseValue();
            if (this.curr().type === TT.SLASH || this.curr().type === TT.DASH) {
                this.next(); this.parseValue();
            }
        }

        // Check for time hh:mm:ss
        if (this.curr().type === TT.COLON) {
            this.next(); this.parseValue();
            if (this.curr().type === TT.COLON) {
                this.next(); this.parseValue();
            }
        }

        // Optional time unit (days, hours, etc.)
        const timeUnits = ['year', 'years', 'month', 'months', 'day', 'days',
            'hour', 'hours', 'minute', 'minutes', 'second', 'seconds', 'week', 'weeks'];
        if (this.isAnyKw(...timeUnits)) this.next();

        // Optional AGO
        this.tryKw('AGO');
    }
}
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
const PREDEFINED_IDENT = [
    // Program and script program_script
    { text: 'MyDefragVersion', units: 'String', parent: 'program_script', category: 'Program and script', description: 'MyDefrag version (for example "MyDefrag v4.0b4")' },
    { text: 'WindowsVersion', units: 'String', parent: 'program_script', category: 'Program and script', description: 'Windows version (for example "v6.0 build 6000")' },
    { text: 'Commandline', units: 'String', parent: 'program_script', category: 'Program and script', description: 'Commandline (for example "MyDefrag.exe -r Weekly.MyD")' },
    { text: 'ExecutableDirectory', units: 'String', parent: 'program_script', category: 'Program and script', description: 'Executable directory, the directory where the currently running MyDefrag interpreter is located' },
    { text: 'WorkingDirectory', units: 'String', parent: 'program_script', category: 'Program and script', description: 'Working directory' },
    { text: 'ScriptDirectory', units: 'String', parent: 'program_script', category: 'Program and script', description: 'Script directory, the directory where the currently running script is located' },
    { text: 'InstallDirectory', units: 'String', parent: 'program_script', category: 'Program and script', description: 'Install directory, where MyDefrag was installed' },
    { text: 'ProcessID', units: 'Number', parent: 'program_script', category: 'Program and script', description: 'Program ID (PID), for example "5816"' },
    { text: 'ScriptTitle', units: 'String', parent: 'program_script', category: 'Program and script', description: 'Script title (see Title)' },
    { text: 'ScriptDescription', units: 'String', parent: 'program_script', category: 'Program and script', description: 'Script description (see Description)' },
    { text: 'Date', units: 'String', parent: 'program_script', category: 'Program and script', description: 'Date "year-month-day", for example "2010-12-31"' },
    { text: 'Time', units: 'String', parent: 'program_script', category: 'Program and script', description: 'Time "hours-minutes-seconds", for example "12:27:01"' },
    { text: 'RunTime', units: 'String', parent: 'program_script', category: 'Program and script', description: 'Elapsed real time (wall-time) since the program started, for example "2:05:18"' },

    // Current volume current_volume
    { text: 'MountPoint', units: 'String', parent: 'current_volume', category: 'Current volume', description: 'Mountpoint (for example "c:")' },
    { text: 'VolumeName', units: 'String', parent: 'current_volume', category: 'Current volume', description: 'VolumeName (for example a GUID-style volume path)' },
    { text: 'VolumeType', units: 'String', parent: 'current_volume', category: 'Current volume', description: 'VolumeType (for example "NTFS")' },
    { text: 'VolumeSize', units: 'bytes', parent: 'current_volume', category: 'Current volume', description: 'The size of the volume' },
    { text: 'VolumeSizeG', units: 'Gigabytes', parent: 'current_volume', category: 'Current volume', description: 'The size of the volume' },
    { text: 'VolumeFree', units: 'bytes', parent: 'current_volume', category: 'Current volume', description: 'The amount of free space on the volume' },
    { text: 'VolumeFreeG', units: 'Gigabytes', parent: 'current_volume', category: 'Current volume', description: 'The amount of free space on the volume' },
    { text: 'VolumeFreeP', units: 'Percentage', parent: 'current_volume', category: 'Current volume', description: 'The amount of free space on the volume' },
    { text: 'VolumeUsed', units: 'bytes', parent: 'current_volume', category: 'Current volume', description: 'The amount of used space on the volume' },
    { text: 'VolumeUsedG', units: 'Gigabytes', parent: 'current_volume', category: 'Current volume', description: 'The amount of used space on the volume' },
    { text: 'VolumeUsedP', units: 'Percentage', parent: 'current_volume', category: 'Current volume', description: 'The amount of used space on the volume' },
    { text: 'MftSize', units: 'bytes', parent: 'current_volume', category: 'Current volume', description: 'The size of the $MFT' },
    { text: 'BytesPerCluster', units: 'bytes', parent: 'current_volume', category: 'Current volume', description: 'The size of a cluster. The minimum size a file will occupy is 1 cluster; very small files on NTFS may be stored in the MFT and reported as zero clusters' },
    { text: 'AverageBeginEndDistance', units: 'Clusters', parent: 'current_volume', category: 'Current volume', description: 'Average end-begin distance between files; a lower number means files are better packed and accessed more quickly. Does not account for disk geometry' },
    { text: 'AverageBeginEndDistanceP', units: 'Percentage', parent: 'current_volume', category: 'Current volume', description: 'Average end-begin distance, as a percentage' },

    // Volume: Files and directories by count volume_files_count
    { text: 'FILES000N', units: 'Number', parent: 'volume_files_count', category: 'Volume: Files and directories by count', description: 'The number of unfragmented files on the volume' },
    { text: 'FILES000P', units: 'Percentage', parent: 'volume_files_count', category: 'Volume: Files and directories by count', description: 'The number of unfragmented files on the volume' },
    { text: 'FILES010N', units: 'Number', parent: 'volume_files_count', category: 'Volume: Files and directories by count', description: 'The number of fragmented files on the volume' },
    { text: 'FILES010P', units: 'Percentage', parent: 'volume_files_count', category: 'Volume: Files and directories by count', description: 'The number of fragmented files on the volume' },
    { text: 'FILES020N', units: 'Number', parent: 'volume_files_count', category: 'Volume: Files and directories by count', description: 'The number of files on the volume (fragmented + unfragmented)' },
    { text: 'FILES020P', units: 'Percentage', parent: 'volume_files_count', category: 'Volume: Files and directories by count', description: 'The number of files on the volume (fragmented + unfragmented)' },
    { text: 'FILES100N', units: 'Number', parent: 'volume_files_count', category: 'Volume: Files and directories by count', description: 'The number of unfragmented directories on the volume' },
    { text: 'FILES100P', units: 'Percentage', parent: 'volume_files_count', category: 'Volume: Files and directories by count', description: 'The number of unfragmented directories on the volume' },
    { text: 'FILES110N', units: 'Number', parent: 'volume_files_count', category: 'Volume: Files and directories by count', description: 'The number of fragmented directories on the volume' },
    { text: 'FILES110P', units: 'Percentage', parent: 'volume_files_count', category: 'Volume: Files and directories by count', description: 'The number of fragmented directories on the volume' },
    { text: 'FILES120N', units: 'Number', parent: 'volume_files_count', category: 'Volume: Files and directories by count', description: 'The number of directories on the volume (fragmented + unfragmented)' },
    { text: 'FILES120P', units: 'Percentage', parent: 'volume_files_count', category: 'Volume: Files and directories by count', description: 'The number of directories on the volume (fragmented + unfragmented)' },
    { text: 'FILES200N', units: 'Number', parent: 'volume_files_count', category: 'Volume: Files and directories by count', description: 'The number of unfragmented files and directories on the volume' },
    { text: 'FILES200P', units: 'Percentage', parent: 'volume_files_count', category: 'Volume: Files and directories by count', description: 'The number of unfragmented files and directories on the volume' },
    { text: 'FILES210N', units: 'Number', parent: 'volume_files_count', category: 'Volume: Files and directories by count', description: 'The number of fragmented files and directories on the volume' },
    { text: 'FILES210P', units: 'Percentage', parent: 'volume_files_count', category: 'Volume: Files and directories by count', description: 'The number of fragmented files and directories on the volume' },
    { text: 'FILES220N', units: 'Number', parent: 'volume_files_count', category: 'Volume: Files and directories by count', description: 'The number of files and directories on the volume (fragmented + unfragmented)' },
    { text: 'FILES220P', units: 'Percentage', parent: 'volume_files_count', category: 'Volume: Files and directories by count', description: 'The number of files and directories on the volume (fragmented + unfragmented)' },

    // Volume: Files and directories by occupied size
    { text: 'FILES002N', units: 'Bytes', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of unfragmented files on the volume' },
    { text: 'FILES002G', units: 'Gigabytes', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of unfragmented files on the volume' },
    { text: 'FILES002P', units: 'Percentage', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of unfragmented files on the volume' },
    { text: 'FILES012N', units: 'Bytes', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of fragmented files on the volume' },
    { text: 'FILES012G', units: 'Gigabytes', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of fragmented files on the volume' },
    { text: 'FILES012P', units: 'Percentage', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of fragmented files on the volume' },
    { text: 'FILES022N', units: 'Bytes', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the fragmented + unfragmented files on the volume' },
    { text: 'FILES022G', units: 'Gigabytes', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the fragmented + unfragmented files on the volume' },
    { text: 'FILES022P', units: 'Percentage', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the fragmented + unfragmented files on the volume' },
    { text: 'FILES102N', units: 'Bytes', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the unfragmented folders on the volume' },
    { text: 'FILES102G', units: 'Gigabytes', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the unfragmented folders on the volume' },
    { text: 'FILES102P', units: 'Percentage', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the unfragmented folders on the volume' },
    { text: 'FILES112N', units: 'Bytes', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the fragmented folders on the volume' },
    { text: 'FILES112G', units: 'Gigabytes', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the fragmented folders on the volume' },
    { text: 'FILES112P', units: 'Percentage', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the fragmented folders on the volume' },
    { text: 'FILES122N', units: 'Bytes', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the fragmented + unfragmented folders on the volume' },
    { text: 'FILES122G', units: 'Gigabytes', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the fragmented + unfragmented folders on the volume' },
    { text: 'FILES122P', units: 'Percentage', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the fragmented + unfragmented folders on the volume' },
    { text: 'FILES202N', units: 'Bytes', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the fragmented files + folders on the volume' },
    { text: 'FILES202G', units: 'Gigabytes', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the fragmented files + folders on the volume' },
    { text: 'FILES202P', units: 'Percentage', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the fragmented files + folders on the volume' },
    { text: 'FILES212N', units: 'Bytes', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the unfragmented files + folders on the volume' },
    { text: 'FILES212G', units: 'Gigabytes', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the unfragmented files + folders on the volume' },
    { text: 'FILES212P', units: 'Percentage', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the unfragmented files + folders on the volume' },
    { text: 'FILES222N', units: 'Bytes', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the files + folders on the volume (fragmented + unfragmented)' },
    { text: 'FILES222G', units: 'Gigabytes', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the files + folders on the volume (fragmented + unfragmented)' },
    { text: 'FILES222P', units: 'Percentage', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the files + folders on the volume (fragmented + unfragmented)' },

    // Volume: Files and directories by sparse size
    { text: 'FILES001N', units: 'Bytes', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of unfragmented files on the volume' },
    { text: 'FILES001G', units: 'Gigabytes', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of unfragmented files on the volume' },
    { text: 'FILES001P', units: 'Percentage', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of unfragmented files on the volume' },
    { text: 'FILES011N', units: 'Bytes', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of fragmented files on the volume' },
    { text: 'FILES011G', units: 'Gigabytes', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of fragmented files on the volume' },
    { text: 'FILES011P', units: 'Percentage', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of fragmented files on the volume' },
    { text: 'FILES021N', units: 'Bytes', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all files on the volume (fragmented + unfragmented)' },
    { text: 'FILES021G', units: 'Gigabytes', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all files on the volume (fragmented + unfragmented)' },
    { text: 'FILES021P', units: 'Percentage', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all files on the volume (fragmented + unfragmented)' },
    { text: 'FILES101N', units: 'Bytes', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all unfragmented folders on the volume' },
    { text: 'FILES101G', units: 'Gigabytes', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all unfragmented folders on the volume' },
    { text: 'FILES101P', units: 'Percentage', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all unfragmented folders on the volume' },
    { text: 'FILES111N', units: 'Bytes', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all fragmented folders on the volume' },
    { text: 'FILES111G', units: 'Gigabytes', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all fragmented folders on the volume' },
    { text: 'FILES111P', units: 'Percentage', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all fragmented folders on the volume' },
    { text: 'FILES121N', units: 'Bytes', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all folders on the volume (fragmented + unfragmented)' },
    { text: 'FILES121G', units: 'Gigabytes', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all folders on the volume (fragmented + unfragmented)' },
    { text: 'FILES121P', units: 'Percentage', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all folders on the volume (fragmented + unfragmented)' },
    { text: 'FILES201N', units: 'Bytes', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all unfragmented files + folders on the volume' },
    { text: 'FILES201G', units: 'Gigabytes', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all unfragmented files + folders on the volume' },
    { text: 'FILES201P', units: 'Percentage', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all unfragmented files + folders on the volume' },
    { text: 'FILES211N', units: 'Bytes', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all fragmented files + folders on the volume' },
    { text: 'FILES211G', units: 'Gigabytes', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all fragmented files + folders on the volume' },
    { text: 'FILES211P', units: 'Percentage', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all fragmented files + folders on the volume' },
    { text: 'FILES221N', units: 'Bytes', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all files + folders on the volume (fragmented + unfragmented)' },
    { text: 'FILES221G', units: 'Gigabytes', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all files + folders on the volume (fragmented + unfragmented)' },
    { text: 'FILES221P', units: 'Percentage', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all files + folders on the volume (fragmented + unfragmented)' },

    // Zone
    { text: 'ZoneNumber', units: 'Count', parent: 'zone', category: 'Zone', description: 'The current zone number (for example "3")' },
    { text: 'ZoneCount', units: 'Count', parent: 'zone', category: 'Zone', description: 'The number of zones (for example "6")' },
    { text: 'ProgressPercentage', units: 'Number', parent: 'zone', category: 'Zone', description: 'The percentage as shown in the status bar, progress from 0.0000 to 100.0000 for the current zone (floating-point, 4 decimal digits)' },
    { text: 'ZoneBegin', units: 'Bytes', parent: 'zone', category: 'Zone', description: 'The beginning of the zone, number of bytes from the beginning of the disk' },
    { text: 'ZoneEnd', units: 'Bytes', parent: 'zone', category: 'Zone', description: 'The end of the zone, number of bytes from the beginning of the disk' },
    { text: 'ZoneSize', units: 'Bytes', parent: 'zone', category: 'Zone', description: 'The size of the zone, number of bytes occupied by all items in the zone (includes unmovable items)' },
    { text: 'MaxNextZoneBegin', units: 'Bytes', parent: 'zone', category: 'Zone', description: 'The maximum beginning of the next zone — the end of the disk minus the bytes in items not yet placed' },

    // Zone: Files and directories by count
    { text: 'ZONE000N', units: 'Number', parent: 'zone_files_count', category: 'Zone: Files and directories by count', description: 'The number of unfragmented files in the zone' },
    { text: 'ZONE000P', units: 'Percentage', parent: 'zone_files_count', category: 'Zone: Files and directories by count', description: 'The number of unfragmented files in the zone' },
    { text: 'ZONE010N', units: 'Number', parent: 'zone_files_count', category: 'Zone: Files and directories by count', description: 'The number of fragmented files in the zone' },
    { text: 'ZONE010P', units: 'Percentage', parent: 'zone_files_count', category: 'Zone: Files and directories by count', description: 'The number of fragmented files in the zone' },
    { text: 'ZONE020N', units: 'Number', parent: 'zone_files_count', category: 'Zone: Files and directories by count', description: 'The number of files in the zone (fragmented + unfragmented)' },
    { text: 'ZONE020P', units: 'Percentage', parent: 'zone_files_count', category: 'Zone: Files and directories by count', description: 'The number of files in the zone (fragmented + unfragmented)' },
    { text: 'ZONE100N', units: 'Number', parent: 'zone_files_count', category: 'Zone: Files and directories by count', description: 'The number of unfragmented folders in the zone' },
    { text: 'ZONE100P', units: 'Percentage', parent: 'zone_files_count', category: 'Zone: Files and directories by count', description: 'The number of unfragmented folders in the zone' },
    { text: 'ZONE110N', units: 'Number', parent: 'zone_files_count', category: 'Zone: Files and directories by count', description: 'The number of fragmented folders in the zone' },
    { text: 'ZONE110P', units: 'Percentage', parent: 'zone_files_count', category: 'Zone: Files and directories by count', description: 'The number of fragmented folders in the zone' },
    { text: 'ZONE120N', units: 'Number', parent: 'zone_files_count', category: 'Zone: Files and directories by count', description: 'The number of folders in the zone (fragmented + unfragmented)' },
    { text: 'ZONE120P', units: 'Percentage', parent: 'zone_files_count', category: 'Zone: Files and directories by count', description: 'The number of folders in the zone (fragmented + unfragmented)' },
    { text: 'ZONE200N', units: 'Number', parent: 'zone_files_count', category: 'Zone: Files and directories by count', description: 'The number of unfragmented files + folders in the zone' },
    { text: 'ZONE200P', units: 'Percentage', parent: 'zone_files_count', category: 'Zone: Files and directories by count', description: 'The number of unfragmented files + folders in the zone' },
    { text: 'ZONE210N', units: 'Number', parent: 'zone_files_count', category: 'Zone: Files and directories by count', description: 'The number of fragmented files + folders in the zone' },
    { text: 'ZONE210P', units: 'Percentage', parent: 'zone_files_count', category: 'Zone: Files and directories by count', description: 'The number of fragmented files + folders in the zone' },
    { text: 'ZONE220N', units: 'Number', parent: 'zone_files_count', category: 'Zone: Files and directories by count', description: 'The number of files + folders in the zone (fragmented + unfragmented)' },
    { text: 'ZONE220P', units: 'Percentage', parent: 'zone_files_count', category: 'Zone: Files and directories by count', description: 'The number of files + folders in the zone (fragmented + unfragmented)' },

    // Zone: Files and directories by occupied size
    { text: 'ZONE002N', units: 'Bytes', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of unfragmented files in the zone' },
    { text: 'ZONE002G', units: 'Gigabytes', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of unfragmented files in the zone' },
    { text: 'ZONE002P', units: 'Percentage', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of unfragmented files in the zone' },
    { text: 'ZONE012N', units: 'Bytes', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of fragmented files in the zone' },
    { text: 'ZONE012G', units: 'Gigabytes', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of fragmented files in the zone' },
    { text: 'ZONE012P', units: 'Percentage', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of fragmented files in the zone' },
    { text: 'ZONE022N', units: 'Bytes', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of all files in the zone (fragmented + unfragmented)' },
    { text: 'ZONE022G', units: 'Gigabytes', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of all files in the zone (fragmented + unfragmented)' },
    { text: 'ZONE022P', units: 'Percentage', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of all files in the zone (fragmented + unfragmented)' },
    { text: 'ZONE102N', units: 'Bytes', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of unfragmented folders in the zone' },
    { text: 'ZONE102G', units: 'Gigabytes', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of unfragmented folders in the zone' },
    { text: 'ZONE102P', units: 'Percentage', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of unfragmented folders in the zone' },
    { text: 'ZONE112N', units: 'Bytes', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of fragmented folders in the zone' },
    { text: 'ZONE112G', units: 'Gigabytes', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of fragmented folders in the zone' },
    { text: 'ZONE112P', units: 'Percentage', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of fragmented folders in the zone' },
    { text: 'ZONE122N', units: 'Bytes', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of all folders in the zone (fragmented + unfragmented)' },
    { text: 'ZONE122G', units: 'Gigabytes', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of all folders in the zone (fragmented + unfragmented)' },
    { text: 'ZONE122P', units: 'Percentage', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of all folders in the zone (fragmented + unfragmented)' },
    { text: 'ZONE202N', units: 'Bytes', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of unfragmented files + folders in the zone' },
    { text: 'ZONE202G', units: 'Gigabytes', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of unfragmented files + folders in the zone' },
    { text: 'ZONE202P', units: 'Percentage', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of unfragmented files + folders in the zone' },
    { text: 'ZONE212N', units: 'Bytes', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of fragmented files + folders in the zone' },
    { text: 'ZONE212G', units: 'Gigabytes', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of fragmented files + folders in the zone' },
    { text: 'ZONE212P', units: 'Percentage', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of fragmented files + folders in the zone' },
    { text: 'ZONE222N', units: 'Bytes', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of all files + folders in the zone (fragmented + unfragmented)' },
    { text: 'ZONE222G', units: 'Gigabytes', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of all files + folders in the zone (fragmented + unfragmented)' },
    { text: 'ZONE222P', units: 'Percentage', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of all files + folders in the zone (fragmented + unfragmented)' },

    // Zone: Files and directories by sparse size
    { text: 'ZONE001N', units: 'Bytes', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of unfragmented files in the zone' },
    { text: 'ZONE001G', units: 'Gigabytes', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of unfragmented files in the zone' },
    { text: 'ZONE001P', units: 'Percentage', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of unfragmented files in the zone' },
    { text: 'ZONE011N', units: 'Bytes', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of fragmented files in the zone' },
    { text: 'ZONE011G', units: 'Gigabytes', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of fragmented files in the zone' },
    { text: 'ZONE011P', units: 'Percentage', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of fragmented files in the zone' },
    { text: 'ZONE021N', units: 'Bytes', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of all files in the zone (fragmented + unfragmented)' },
    { text: 'ZONE021G', units: 'Gigabytes', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of all files in the zone (fragmented + unfragmented)' },
    { text: 'ZONE021P', units: 'Percentage', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of all files in the zone (fragmented + unfragmented)' },
    { text: 'ZONE101N', units: 'Bytes', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of unfragmented folders in the zone' },
    { text: 'ZONE101G', units: 'Gigabytes', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of unfragmented folders in the zone' },
    { text: 'ZONE101P', units: 'Percentage', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of unfragmented folders in the zone' },
    { text: 'ZONE111N', units: 'Bytes', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of fragmented folders in the zone' },
    { text: 'ZONE111G', units: 'Gigabytes', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of fragmented folders in the zone' },
    { text: 'ZONE111P', units: 'Percentage', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of fragmented folders in the zone' },
    { text: 'ZONE121N', units: 'Bytes', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of all folders in the zone (fragmented + unfragmented)' },
    { text: 'ZONE121G', units: 'Gigabytes', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of all folders in the zone (fragmented + unfragmented)' },
    { text: 'ZONE121P', units: 'Percentage', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of all folders in the zone (fragmented + unfragmented)' },
    { text: 'ZONE201N', units: 'Bytes', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of unfragmented files + folders in the zone' },
    { text: 'ZONE201G', units: 'Gigabytes', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of unfragmented files + folders in the zone' },
    { text: 'ZONE201P', units: 'Percentage', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of unfragmented files + folders in the zone' },
    { text: 'ZONE211N', units: 'Bytes', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of fragmented files + folders in the zone' },
    { text: 'ZONE211G', units: 'Gigabytes', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of fragmented files + folders in the zone' },
    { text: 'ZONE211P', units: 'Percentage', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of fragmented files + folders in the zone' },
    { text: 'ZONE221N', units: 'Bytes', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of all files + folders in the zone (fragmented + unfragmented)' },
    { text: 'ZONE221G', units: 'Gigabytes', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of all files + folders in the zone (fragmented + unfragmented)' },
    { text: 'ZONE221P', units: 'Percentage', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of all files + folders in the zone (fragmented + unfragmented)' },

    // Gaps by count
    { text: 'GAP01N', units: 'Count', parent: 'gaps_count', category: 'Gaps by count', description: 'The number of small gaps (smaller than the average gap size, GAP13N)' },
    { text: 'GAP01P', units: 'Percentage', parent: 'gaps_count', category: 'Gaps by count', description: 'The number of small gaps (smaller than the average gap size, GAP13N)' },
    { text: 'GAP02N', units: 'Count', parent: 'gaps_count', category: 'Gaps by count', description: 'The number of big gaps (bigger than the average gap size, GAP13N)' },
    { text: 'GAP02P', units: 'Percentage', parent: 'gaps_count', category: 'Gaps by count', description: 'The number of big gaps (bigger than the average gap size, GAP13N)' },
    { text: 'GAP00N', units: 'Count', parent: 'gaps_count', category: 'Gaps by count', description: 'All gaps' },
    { text: 'GAP00P', units: 'Percentage', parent: 'gaps_count', category: 'Gaps by count', description: 'All gaps' },

    // Gaps by size
    { text: 'GAP11N', units: 'Bytes', parent: 'gaps_size', category: 'Gaps by size', description: 'The size of the small gaps (smaller than the average gap size, GAP13N)' },
    { text: 'GAP11G', units: 'Gigabytes', parent: 'gaps_size', category: 'Gaps by size', description: 'The size of the small gaps (smaller than the average gap size, GAP13N)' },
    { text: 'GAP11P', units: 'Percentage', parent: 'gaps_size', category: 'Gaps by size', description: 'The size of the small gaps (smaller than the average gap size, GAP13N)' },
    { text: 'GAP12N', units: 'Bytes', parent: 'gaps_size', category: 'Gaps by size', description: 'The size of the big gaps (bigger than the average gap size, GAP13N)' },
    { text: 'GAP12G', units: 'Gigabytes', parent: 'gaps_size', category: 'Gaps by size', description: 'The size of the big gaps (bigger than the average gap size, GAP13N)' },
    { text: 'GAP12P', units: 'Percentage', parent: 'gaps_size', category: 'Gaps by size', description: 'The size of the big gaps (bigger than the average gap size, GAP13N)' },
    { text: 'GAP10N', units: 'Bytes', parent: 'gaps_size', category: 'Gaps by size', description: 'The size of all the gaps' },
    { text: 'GAP10G', units: 'Gigabytes', parent: 'gaps_size', category: 'Gaps by size', description: 'The size of all the gaps' },
    { text: 'GAP10P', units: 'Percentage', parent: 'gaps_size', category: 'Gaps by size', description: 'The size of all the gaps' },
    { text: 'GAP13N', units: 'Bytes', parent: 'gaps_size', category: 'Gaps by size', description: 'The average gap size' },
    { text: 'GAP13G', units: 'Gigabytes', parent: 'gaps_size', category: 'Gaps by size', description: 'The average gap size' },
    { text: 'GAP13P', units: 'Percentage', parent: 'gaps_size', category: 'Gaps by size', description: 'The average gap size' },
    { text: 'GAP14N', units: 'Bytes', parent: 'gaps_size', category: 'Gaps by size', description: 'The median gap size — the gap in the middle of the sorted list, half the gaps are smaller and half are bigger' },
    { text: 'GAP14G', units: 'Gigabytes', parent: 'gaps_size', category: 'Gaps by size', description: 'The median gap size — the gap in the middle of the sorted list, half the gaps are smaller and half are bigger' },
    { text: 'GAP14P', units: 'Percentage', parent: 'gaps_size', category: 'Gaps by size', description: 'The median gap size — the gap in the middle of the sorted list, half the gaps are smaller and half are bigger' },
    { text: 'GAP15N', units: 'Bytes', parent: 'gaps_size', category: 'Gaps by size', description: 'The size of the biggest gap' },
    { text: 'GAP15G', units: 'Gigabytes', parent: 'gaps_size', category: 'Gaps by size', description: 'The size of the biggest gap' },
    { text: 'GAP15P', units: 'Percentage', parent: 'gaps_size', category: 'Gaps by size', description: 'The size of the biggest gap' },

    // Unmovable items
    { text: 'UnmovablesList', units: 'List', parent: 'unmovable_items', category: 'Unmovable items', description: 'List of unmovable items. Fixed format, 1 line per item with fragments, sparse bytes, occupied clusters, and full path' },
    { text: 'UnmovablesTotalFragments', units: 'Count', parent: 'unmovable_items', category: 'Unmovable items', description: 'Total of the "fragments" column' },
    { text: 'UnmovablesTotalBytes', units: 'Bytes', parent: 'unmovable_items', category: 'Unmovable items', description: 'Total of the "bytes" column' },
    { text: 'UnmovablesTotalClusters', units: 'Clusters', parent: 'unmovable_items', category: 'Unmovable items', description: 'Total of the "clusters" column' },

    // Fragmented items
    { text: 'FragmentedList', units: 'List', parent: 'fragmented_items', category: 'Fragmented items', description: 'List of fragmented items. Fixed format, 1 line per item with fragments, sparse bytes, occupied clusters, and full path' },
    { text: 'FragmentedTotalFragments', units: 'Count', parent: 'fragmented_items', category: 'Fragmented items', description: 'Total of the "fragments" column' },
    { text: 'FragmentedTotalBytes', units: 'Bytes', parent: 'fragmented_items', category: 'Fragmented items', description: 'Total of the "bytes" column' },
    { text: 'FragmentedTotalClusters', units: 'Clusters', parent: 'fragmented_items', category: 'Fragmented items', description: 'Total of the "clusters" column' },

    // The 25 largest items
    { text: 'LargestItemsList', units: 'List', parent: 'largest_items', category: 'The 25 largest items', description: 'List of the 25 largest items on the volume. Fixed format, 1 line per item with fragments, sparse bytes, occupied clusters, and full path' },
    { text: 'LargestItemsTotalFragments', units: 'Count', parent: 'largest_items', category: 'The 25 largest items', description: 'Total of the "fragments" column' },
    { text: 'LargestItemsTotalBytes', units: 'Bytes', parent: 'largest_items', category: 'The 25 largest items', description: 'Total of the "bytes" column' },
    { text: 'LargestItemsTotalClusters', units: 'Clusters', parent: 'largest_items', category: 'The 25 largest items', description: 'Total of the "clusters" column' },

    // Bad cluster list
    { text: 'BadClusterList', units: 'List', parent: 'bad_cluster_list', category: 'Bad cluster list', description: 'List of bad clusters. Fixed format, 1 line per block of clusters with number of clusters and LCN (Logical Cluster Number)' },
    { text: 'BadClusterTotal', units: 'Count', parent: 'bad_cluster_list', category: 'Bad cluster list', description: 'Total of the "clusters" column' },

    // Memory usage
    { text: 'MemoryHeapBytes', units: 'Bytes', parent: 'memory_usage', category: 'Memory usage', description: 'Heap memory' },
    { text: 'MemoryHeapItems', units: 'Count', parent: 'memory_usage', category: 'Memory usage', description: 'Heap items' },
    { text: 'MemoryVolumes', units: 'Bytes', parent: 'memory_usage', category: 'Memory usage', description: 'Volumes' },
    { text: 'MemoryItems', units: 'Bytes', parent: 'memory_usage', category: 'Memory usage', description: 'Items (files, directories)' },
    { text: 'MemoryFileNames', units: 'Bytes', parent: 'memory_usage', category: 'Memory usage', description: 'Filenames' },
    { text: 'MemoryFullPaths', units: 'Bytes', parent: 'memory_usage', category: 'Memory usage', description: 'FullPaths' },
    { text: 'MemoryExtends', units: 'Bytes', parent: 'memory_usage', category: 'Memory usage', description: 'Extends (fragments)' },
    { text: 'MemoryContext', units: 'Bytes', parent: 'memory_usage', category: 'Memory usage', description: 'Context' },
];
function isPredefinedIdentifier(variable) {
    // MyDefrag has a long list of pre-defined variables that you can use. 
    // They are dynamic variables, that is, they are automatically recalculated when they are used.
    // The parent keys used (16 total, matching the 16 source headings):
    // program_script
    // current_volume
    // volume_files_count
    // volume_files_occupied_size
    // volume_files_sparse_size
    // zone
    // zone_files_count
    // zone_files_occupied_size
    // zone_files_sparse_size
    // gaps_count
    // gaps_size
    // unmovable_items
    // fragmented_items
    // largest_items
    // bad_cluster_list
    // memory_usage
    const found = PREDEFINED_IDENT.find(v => v.text === variable);
    return found ?? null;
}
//#endregion
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
