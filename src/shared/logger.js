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
//#endregion
//#region Functions
function createLogger(channelName, thisSource = "Unknown", config) {
    // language server
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
    source = thisSource; // passed shadows what config had
    let lastSeverity;
    //#region Logging functions
    function logToConsole(...args) {
        try {
            // const message = args.join(' ');
            const message = `[${extensionName}] [${source}] ${args.join(' ')}`;

            if (isServer) {
                // server: usually forward via LSP
                connection?.sendNotification?.('mydefrag/log', { message });
            } else {
                connection?.appendLine?.(message);
            }
            console.log(message);
        } catch (errResult) {
            const message = `logger.js:createLogger:logToConsole: Error handling output: ${errResult.message}`;
            console.error(message);
            throw new Error(message);
        }
    }
    // logToConsole(`logger.js:createLogger: Console LOGGER creation source: ${source}`)

    function dbg(thisSeverity = verboseLevel, ...args) {
        if (isDebugOn && thisSeverity <= verboseLevel) {
            logToConsole(`[DEBUG ${thisSeverity}]`, ...args);
        }
    }
    function err(errResult, ...args) {
        logToConsole(`[ERROR!!!]`, errResult, ...args);
        lastSeverity = iniData.severity.Error
    }
    function warn(...args) {
        logToConsole(`[WARNING]`, ...args);
        lastSeverity = iniData.severity.Warning;
    }
    function hint(...args) {
        logToConsole(`[HINT]`, ...args);
        lastSeverity = iniData.severity.Hint;
    }
    function info(...args) {
        logToConsole(`[INFO]`, ...args);
        lastSeverity = iniData.severity.Information;
    }
    function message(thisSeverity = iniData.severity.info, ...args) {
        lastSeverity = thisSeverity;
        switch (thisSeverity) {
            case iniData.severity.Error:
                err(...args);
                break;
            case iniData.severity.Warning:
                warn(...args);
                break;
            case iniData.severity.Information:
                info(...args);
                break;
            case iniData.severity.Hint:
                hint(...args);
                break;
            default:
                info(...args);
                break;
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
        logToConsole
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
