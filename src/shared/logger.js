'use strict';
// loggerExtensions.js
//#region Initialize Initialize loggerExtension.js .Parse
const fs = require("fs");
const path = require('path');
const utilCommon = require('../utilities/util');
// communicate only via JSON - RPC(LSP protocol)

// LSP Standard:
// extension.js
// const extLogger = createLogger(channelName, source, "extension");
// server.js
// const serverLogger = createLogger(channelName, source, "server");

//                 OR
// ⚠️ Option 2: forward logs over LSP(advanced)
// You can send log messages from server → extension:

// server:
// connection.sendNotification("mydefrag/log", {
//     level: "info",
//     message: "something happened"
// });

// Extension:
// Client.onNotification("mydefrag/log", (msg) => {
//     logger.log(msg.message);
// });
var source;
let connection; // <- Log
var iniData;
// var config;
var isDebugOn = false;
var verboseLevel = 0;
var isLogOn = false;
var connectionShown = false;
var extensionName = "MyDefrag"
var source;
var isServer;
var diagnostics = [];
var referenceRelativePathLevel;
var referenceContainsMacrosLevel;
var referenceFileFoundLevel;
var referenceFileNotFoundLevel;
var iniErrors = [];
var loggedMessages;
const recreatedLogFiles = new Set();
//#endregion
//#region Functions
function createLogger(channelName, thisSource = "Unknown", config = {}, options = {}) {
    // language server
    const loggerConfig = config || {};
    const localIniData = loggerConfig.iniData || {
        severity: {
            Error: 1,
            Warning: 2,
            Information: 3,
            Hint: 4,
        }
    };
    // Configuration
    const localIsDebugOn = Boolean(loggerConfig.isDebugOn);
    const localVerboseLevel = Number.isFinite(Number(loggerConfig.verboseLevel))
        ? Number(loggerConfig.verboseLevel)
        : 0;
    const localIsLogOn = loggerConfig.isLogOn !== false;
    const localIsServer = Boolean(loggerConfig.isServer || options.isServer);
    const localSource = thisSource; // passed shadows what config had
    const outputChannel = options.outputChannel || null;
    const lspConnection = options.connection || null;
    const logFilePath = options.filePath || null;
    const fileEnabled = options.fileEnabled ?? localIsLogOn;
    let lastSeverity;

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
    } = loggerConfig);

    source = localSource;
    //#region Utility functions
    /**
     * Converts log arguments into readable single-line text.
     *
     * @param {*} value The value to format for log output.
     * @returns {string} The formatted log value.
     */
    function formatLogValue(value) {
        if (value === null || value === undefined) return '';
        if (value instanceof Error) return value.stack || value.message;
        if (typeof value === 'string') return value;
        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    }

    /**
     * Ensures the configured log file directory exists before appending.
     *
     * @param {string} filePath The log file path.
     */
    function ensureLogFile(filePath) {
        if (!filePath) return;
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }

    /**
     * Recreates a configured log file once per process session.
     *
     * @param {string} filePath The log file path.
     */
    function recreateLogFile(filePath) {
        if (!filePath) return;

        const resolvedPath = path.resolve(filePath);
        if (recreatedLogFiles.has(resolvedPath)) return;

        ensureLogFile(resolvedPath);
        fs.writeFileSync(resolvedPath, '', 'utf8');
        recreatedLogFiles.add(resolvedPath);
    }

    /**
     * Appends a single line to the configured log file.
     *
     * @param {string} message The formatted log line.
     */
    function appendToFile(message) {
        if (!fileEnabled || !logFilePath) return;
        try {
            recreateLogFile(logFilePath);
            fs.appendFileSync(logFilePath, `${message}\n`, 'utf8');
        } catch (errResult) {
            console.error(`logger.js:createLogger:appendToFile: ${errResult.message}`);
        }
    }

    /**
     * Writes a session marker so F5 runs are easy to separate in log files.
     */
    function writeSessionHeader() {
        if (!fileEnabled || !logFilePath) return;
        appendToFile(`===== ${channelName} ${localSource} session ${new Date().toISOString()} =====`);
    }

    writeSessionHeader();
    //#endregion
    //#region Logging functions
    function logToConsole(...args) {
        // const message = args.join(' ');
        const content = args.map(formatLogValue).filter(Boolean).join(' ');
        const message = `[${new Date().toISOString()}] [${extensionName}] [${localSource}] ${content}`;

        try {
            appendToFile(message);
            if (localIsServer) {
                // server: usually forward via LSP
                lspConnection?.sendNotification?.('mydefrag/log', { message });
            } else {
                outputChannel?.appendLine?.(message);
            }
            console.log(message);
        } catch (errResult) {
            const errorMessage = `logger.js:createLogger:logToConsole: Error handling output: ${errResult.message}`;
            console.error(errorMessage);
            appendToFile(errorMessage);
        }
    }
    // logToConsole(`logger.js:createLogger: Console LOGGER creation source: ${source}`)

    function dbg(thisSeverity = localVerboseLevel, ...args) {
        if (localIsDebugOn && thisSeverity <= localVerboseLevel) {
            logToConsole(`[DEBUG ${thisSeverity}]`, ...args);
        }
    }
    function err(errResult, ...args) {
        logToConsole(`[ERROR!!!]`, errResult, ...args);
        lastSeverity = localIniData.severity.Error
    }
    function warn(...args) {
        logToConsole(`[WARNING]`, ...args);
        lastSeverity = localIniData.severity.Warning;
    }
    function hint(...args) {
        logToConsole(`[HINT]`, ...args);
        lastSeverity = localIniData.severity.Hint;
    }
    function info(...args) {
        logToConsole(`[INFO]`, ...args);
        lastSeverity = localIniData.severity.Information;
    }
    function message(thisSeverity = localIniData.severity.Information, ...args) {
        lastSeverity = thisSeverity;
        switch (thisSeverity) {
            case localIniData.severity.Error:
                err(...args);
                break;
            case localIniData.severity.Warning:
                warn(...args);
                break;
            case localIniData.severity.Information:
                info(...args);
                break;
            case localIniData.severity.Hint:
                hint(...args);
                break;
            default:
                info(...args);
                break;
        }
    }

    function messageDetail(...args) {
        // const message = args.join(' ');
        const content = args.map(formatLogValue).filter(Boolean).join(' ');
        const message = `${content}`;

        try {
            appendToFile(message);
            if (localIsServer) {
                // server: usually forward via LSP
                lspConnection?.sendNotification?.('mydefrag/log', { message });
            } else {
                outputChannel?.appendLine?.(message);
            }
            console.log(message);
        } catch (errResult) {
            const errorMessage = `logger.js:createLogger:messageDetail: Error handling output: ${errResult.message}`;
            console.error(errorMessage);
            appendToFile(errorMessage);
        }
    }

    //#endregion
    dbg(5, `Logger ${channelName} belonging to ${source} started.`)
    return {
        dbg,
        info,
        hint,
        warn,
        err,
        message,
        messageDetail,
        logToConsole,
        filePath: logFilePath
    };
}
//#endregion
// ──────────────────────────────────────────────────────────────────────────
function logArrayToConsole(logger, thisChannelName, thisSeverity = iniData.severity.Error, thisLoggedMessages = null, logArray, ...args) {
    try { // ── Log Array To Console ─────────────────────────────────────────────────────────
        if (thisLoggedMessages === null || thisLoggedMessages === undefined) {
            loggedMessages = [];
        } else { loggedMessages = thisLoggedMessages; }

        let i = 0;
        while (i < logArray.length) {
            const nextMessage = logArray[i];
            if (i === 0) { logger.err(`INITIALIZATION ERRORS`); }
            if (thisSeverity >= 0) {
                if (!loggedMessages.has(nextMessage)) {
                    loggedMessages.add(nextMessage);
                    logger.message(thisSeverity, nextMessage);
                    // logger.info(nextMessage + '\n.\n');
                    logger.dbg(3, nextMessage);
                }
            }
            if (thisSeverity < 0 || thisSeverity > 4) { thisSeverity = iniData.severity.Warning }
            const range = utilCommon.createRange(1, 1, 1, 1);
            const diagnostic = {
                severity: thisSeverity,
                range: range,
                message: nextMessage,
                source: 'MyDefrag'
            };
            // const diagnostic = new vscode.Diagnostic(
            //     range = new vscode.Range(start, end),
            //     nextMessage,
            //     vscode.severity[thisSeverity]
            // );
            diagnostics.push(diagnostic);
            i++;
        }
    } catch (errResult) {
        // IniFile processing error
        // iniErrors.push(`Array processing error logging the Array: ${errResult.message}`);
        console.error(`Array processing error logging the Array: ${errResult.message}`);
    } finally {
        logArray.length = 0;
        return;
    }
}
// ──────────────────────────────────────────────────────────────────────────
module.exports = {
    source,
    createLogger,
    // logToConsole,
    // dbg,
    // warn,
    // info,
    // err,
    // message,
    logArrayToConsole,
    // lastSeverity,
    // connection,
    loggedMessages
};
