'use strict';
// loggerExtensions.js
//#region Initialize Initialize loggerExtension.js .Parse
const fs = require("fs");
const path = require('path');
const utilCommon = require('../utilities/util');
// communicate only via JSON - RPC(LSP protocol)

// LSP Standard:
// extension.js
// const extLogger = createLogger("extension");
// server.js
// const serverLogger = createLogger("server");

//                 OR
// ⚠️ Option 2: forward logs over LSP(advanced)
// You can send log messages from server → extension:

// server:
// connection.sendNotification("mydefrag/log", {
//     level: "info",
//     message: "something happened"
// });

// Extension:
// client.onNotification("mydefrag/log", (msg) => {
//     logger.log(msg.message);
// });


//#endregion
// ──────────────────────────────────────────────────────────────────────────
// function initialize(outputChannel, isServerRun = false, channelDiagnostics = null, inheritIni = null, thisconfig = null, debugEnabled = false, verbose = 0) {
//     try { // ──Logger initialize ─────────────────────────────────────────────────────────────────
//         connection = outputChannel;
//         isServer = isServerRun;
//         debugOn = debugEnabled;
//         verboseLevel = verbose;
//         iniData = inheritIni;
//         if (inheritIni !== null && iniData !== undefined) {
//             iniData = inheritIni;
//             if (inheritIni.severity !== null && inheritIni.severity !== undefined) {
//                 severity = severity;
//             } else {
//                 const message = `LoggerExtension.js:initialize Unexpected error: INI SEVERITY information not supplied to logger`;
//                 iniErrors.push(message);
//                 throw new Error(message);
//             }
//         } else {
//             const message = `LoggerExtension.js:initialize INFORMATION: INI information not supplied to logger`
//             iniErrors.push(message);
//             throw new Error(message);
//         }

//         diagnostics = channelDiagnostics;
//         if (diagnostics === null || diagnostics === undefined) { diagnostics = []; } else {
//             console.log(`LoggerExtension.js:initialize Channel Diagnostic logs supplied to logger`);
//         }

//         isServer = isServerRun;
//         if (isServer === null || isServer === undefined) { isServer = true; }

//     } catch (errResult) {
//         const message = `LoggerExtension.js:initialize Unexpected ERROR during initialization: ${errResult.message} `
//         iniErrors.push(message);
//         // return -1001;
//         throw new Error(message);
//     }
// }
// ──────────────────────────────────────────────────────────────────────────
//#region Functions
// try { // Define Standard Log Functions
// function logToConsole(thisExtensionName, ...args) {
//     // console.log("connection =", connection);
//     // console.log("typeof connection =", typeof connection);
//     // console.log("keys =", Object.keys(connection || {}));
//     if (!connectionShown) {
//         connection.show();
//         connectionShown = true;
//     }
//     let newLineString = "";
//     if (!isServer) { newLineString = `\n`; }
//     const message = ` ${thisExtensionName} ${args.join(' ')}${newLineString}`;
//     if (connection?.appendLine) {
//         connection.appendLine(message);
//         connection.show();
//         console.log(message);
//     } else {
//         console.log(message);
//     }
// }
function createLogger(config) {
    // language server
    let connection; // <- Log
    var iniData;
    var config;
    var debugOn = false;
    var verboseLevel = 0;
    var logOn = false;
    var connectionShown = false;
    var extensionName = "[MyDefrag]"
    var isServer;
    var diagnostics = [];
    var referenceRelativePathLevel;
    var referenceContainsMacrosLevel;
    var fileReferenceFoundLevel;
    var fileReferenceNotFoundLevel;
    var iniErrors = [];
    var loggedMessages;

    ({
        iniData,
        debugOn,
        verboseLevel,
        logOn,
        referenceRelativePathLevel,
        referenceContainsMacrosLevel,
        fileReferenceFoundLevel,
        fileReferenceNotFoundLevel,
        iniErrors
    } = config);

    let lastSeverity;

    function logToConsole(...args) {
        // const message = args.join(' ');
        const message = `${extensionName} ${args.join(' ')}`;

        if (isServer) {
            // server: usually forward via LSP
            connection?.sendNotification?.('mydefrag/log', { message });
        } else {
            connection?.appendLine?.(message);
        }

        console.log(message);
    }

    function dbg(thisSeverity = verboseLevel, ...args) {
        if (debugOn && thisSeverity <= verboseLevel) {
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
function logArrayToConsole(logger, thisExtensionName, thisSeverity = iniData.severity.Error, thisLoggedMessages = null, logArray, ...args) {
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
    // initialize,
    createLogger,
    // logToConsole,
    // dbg,
    // warn,
    // info,
    // err,
    // message,
    logArrayToConsole
    // lastSeverity,
    // connection,
};
