'use strict';
// loggerExtensions.js
//#region Initialize Initialize loggerExtension.js .Parse
const fs = require("fs");
const path = require('path');
const Ini = require('./ini');
// language server
let connection; // <- Log
let debugOn = false;
let verboseLevel = 0;
let ini = {}
let extensionName = "[MyDefrag]"
let lastSeverity;
let isServer;
let severity = Ini.severity;
let diagnostics = [];
//#endregion
// ──────────────────────────────────────────────────────────────────────────
function initialize(outputChannel, channelDiagnostics = null, isServerRun = false, debugEnabled = false, verbose = 0, inheritIni = {}) {
    try { // ──Logger initialize ─────────────────────────────────────────────────────────────────
        connection = outputChannel;
        isServer = isServerRun;
        debugOn = debugEnabled;
        verboseLevel = verbose;
        ini = inheritIni;
        if (ini !== null && ini !== undefined) {
            if (ini.severity !== null && ini.severity !== undefined) {
                severity = ini.severity;
            } else {
                // todo error Information severity is not present in ini file
            }
        } else {
            ini = {};
            // todo error Error INI file data is not present
        }

        diagnostics = channelDiagnostics;
        if (diagnostics === null || diagnostics === undefined) { diagnostics = []; } else {
            // ToDo error Invalid Channel Diagnostic definition
        }

        isServer = isServerRun;
        if (isServer === null || isServer === undefined) {
            isServer = true;
        } else {
            isServer = true;
            // todo error Error: IsServer is a true/false value
        }
    } catch (errResult) {
        // IniFile not found
        iniErrors.push('Error Opening INI File');
        return result;
    }
}
// ──────────────────────────────────────────────────────────────────────────
//#region Functions
try { // Define Standard Log Functions
    function logToConsole(thisExtensionName, ...args) {
        connection?.console.log(` [${thisExtensionName}] ` + args.join(` `));
    }
    function logToConsole(thisExtensionName, ...args) {
        connection?.append(` [${thisExtensionName}] ` + args.join(` `) + `\n`); // <- Log
    }
    function dbg(severity = verboseLevel, ...args) {
        if (debugOn && severity >= verboseLevel) { logToConsole(extensionName, `[DEBUG]`, ...args); }
    }
    function err(...args) {
        logToConsole(extensionName, `[ERROR!!!]`, ...args);
        lastSeverity = severity.Error
    }
    function warn(...args) {
        logToConsole(extensionName, `[WARNING]`, ...args);
        lastSeverity = severity.Warning;
    }
    function hint(...args) {
        logToConsole(extensionName, `[HINT]`, ...args);
        lastSeverity = severity.Hint;
    }
    function info(...args) {
        logToConsole(extensionName, `[INFO]`, ...args);
        lastSeverity = severity.Information;
    }
    function msg(severity = severity.info, ...args) {
        lastSeverity = severity;
        switch (severity) {
            case severity.Error:
                err(...args);
                break;
            case severity.Warning:
                warn(...args);
                break;
            case severity.Information:
                info(...args);
                break;
            case severity.Hint:
                hint(...args);
                break;
            default:
                info(...args);
                break;
        }
    }
} catch (errResult) {
    // todo error UNEXPECTED ERROR in Logger Initialization
}
//#endregion
// ──────────────────────────────────────────────────────────────────────────
function logArrayToConsole(thisExtensionName, thisSeverity = severity.Error, thisLoggedMessages = null, logArray, ...args) {
    try { // ── Log Array To Console ─────────────────────────────────────────────────────────
        let loggedMessages;
        if (thisLoggedMessages === null || thisLoggedMessages === undefined) {
            loggedMessages = [];
        } else { loggedMessages = thisLoggedMessages; }

        let i = 0;
        while (i <= logArray.length) {
            const nextMsg = logArray[i];
            if (i === 0) { err(`INITIALIZATION ERRORS`); }
            if (thisSeverity >= 0) {
                if (!loggedMessages.has(nextMsg)) {
                    loggedMessages.add(nextMsg);
                    msg(thisSeverity, nextMsg);
                    // Logger.info(nextMsg + '\n.\n');
                }
            }
            if (thisSeverity < 0 || thisSeverity > 4) { thisSeverity = severity.Warning }
            const range = Ini.createRange(1, 1, 1, 1);
            const diagnostic = {
                severity: thisSeverity,
                range: range,
                message: nextMsg,
                source: 'MyDefrag'
            };
            // const diagnostic = new vscode.Diagnostic(
            //     range = new vscode.Range(start, end),
            //     nextMsg,
            //     vscode.severity[thisSeverity]
            // );
            diagnostics.push(diagnostic);
            i++;
        }
    } catch (errResult) {
        // todo error UNEXPECTED ERROR in Logger FUNCTION Initialization
    } finally {
        logArray.length = 0;
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
    msg,
    logArrayToConsole,
    lastSeverity,
    connection,
    debugOn,
    verboseLevel,
    ini,
    isServer
};
