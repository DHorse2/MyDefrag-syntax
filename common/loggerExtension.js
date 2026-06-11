'use strict';
// loggerExtensions.js
//#region Initialize Initialize loggerExtension.js .Parse
const fs = require("fs");
const path = require('path');
const utilCommon = require('./util');
var severity;
// language server
var connection; // <- Log
var iniData;
var extensionConfig;
var debugOn = false;
var verboseLevel = 0;
var extensionName = "[MyDefrag]"
var lastSeverity;
var isServer;
var diagnostics = [];
var referenceRelativePathLevel;
var referenceContainsMacrosLevel;
var fileReferenceFoundLevel;
var fileReferenceNotFoundLevel;
var iniErrors = [];
var loggedMessages;

//#endregion
// ──────────────────────────────────────────────────────────────────────────
function initialize(outputChannel, isServerRun = false, channelDiagnostics = null, inheritIni = null, thisExtensionConfig = null, debugEnabled = false, verbose = 0) {
    try { // ──Logger initialize ─────────────────────────────────────────────────────────────────
        connection = outputChannel;
        isServer = isServerRun;
        debugOn = debugEnabled;
        verboseLevel = verbose;
        iniData = inheritIni;
        if (inheritIni !== null && iniData !== undefined) {
            iniData = inheritIni;
            if (inheritIni.severity !== null && inheritIni.severity !== undefined) {
                severity = iniData.severity;
            } else {
                const message = `LoggerExtension.js:initialize Unexpected error: INI SEVERITY information not supplied to logger`;
                iniErrors.push(message);
                throw new Error(message);
            }
        } else {
            const message = `LoggerExtension.js:initialize INFORMATION: INI information not supplied to logger`
            iniErrors.push(message);
            throw new Error(message);
        }

        diagnostics = channelDiagnostics;
        if (diagnostics === null || diagnostics === undefined) { diagnostics = []; } else {
            console.log(`LoggerExtension.js:initialize Channel Diagnostic logs supplied to logger`);
        }

        isServer = isServerRun;
        if (isServer === null || isServer === undefined) { isServer = true; }

    } catch (errResult) {
        const message = `LoggerExtension.js:initialize Unexpected ERROR during initialization: ${errResult.message} `
        iniErrors.push(message);
        // return -1001;
        throw new Error(message);
    }
}
// ──────────────────────────────────────────────────────────────────────────
//#region Functions
// try { // Define Standard Log Functions
function logToConsole(thisExtensionName, ...args) {
    let newLineString = "";
    if (!isServer) { newLineString = `\n`; }
    const message = ` ${thisExtensionName} ${args.join(' ')}${newLineString}`;
    if (connection.console !== null && connection.console !== undefined) {
        connection?.console?.log(message);
    } else {
        connection?.append(message);
        connection?.show();
    }
}
function dbg(thisSeverity = verboseLevel, ...args) {
    if (debugOn && thisSeverity <= verboseLevel) { logToConsole(extensionName, `[DEBUG ${thisSeverity}]`, ...args); }
}
function err(errResult, ...args) {
    logToConsole(extensionName, `[ERROR!!!]`, errResult, ...args);
    lastSeverity = iniData.severity.Error
}
function warn(...args) {
    logToConsole(extensionName, `[WARNING]`, ...args);
    lastSeverity = iniData.severity.Warning;
}
function hint(...args) {
    logToConsole(extensionName, `[HINT]`, ...args);
    lastSeverity = iniData.severity.Hint;
}
function info(...args) {
    logToConsole(extensionName, `[INFO]`, ...args);
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
// ──────────────────────────────────────────────────────────────────────────
function logArrayToConsole(thisExtensionName, thisSeverity = iniData.severity.Error, thisLoggedMessages = null, logArray, ...args) {
    try { // ── Log Array To Console ─────────────────────────────────────────────────────────
        if (thisLoggedMessages === null || thisLoggedMessages === undefined) {
            loggedMessages = [];
        } else { loggedMessages = thisLoggedMessages; }

        let i = 0;
        while (i < logArray.length) {
            const nextMessage = logArray[i];
            if (i === 0) { err(`INITIALIZATION ERRORS`); }
            if (thisSeverity >= 0) {
                if (!loggedMessages.has(nextMessage)) {
                    loggedMessages.add(nextMessage);
                    message(thisSeverity, nextMessage);
                    // logger.info(nextMessage + '\n.\n');
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
    initialize,
    logToConsole,
    dbg,
    warn,
    info,
    err,
    message,
    logArrayToConsole,
    lastSeverity,
    connection,
};
