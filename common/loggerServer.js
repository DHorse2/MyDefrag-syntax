'use strict';
// .loggerServer.js
const fs = require("fs");
const path = require('path');
const Ini = require('./ini');
// language server
let connection;
let debugOn = false;
let verboseLevel = 0;
let ini = {}
let extensionName = "[MyDefrag]"
let lastSeverity;
let isServer;
let severity = Ini.severity;
let diagnostics = [];
let ini = {};
// ──────────────────────────────────────────────────────────────────────────
function initialize(outputChannel, channelDiagnostics = null, isServerRun = false, debugEnabled = false, verbose = 0, inheritIni = {}) {
    connection = outputChannel;
    isServer = isServerRun;
    debugOn = debugEnabled;
    verboseLevel = verbose;
    ini = inheritIni;
    if (ini !== null && ini !== undefined) {
        if (ini.severity !== null && ini.severity !== undefined) {
            severity = ini.severity;
        }
    } else { ini = {}; }

    diagnostics = channelDiagnostics;
    if (diagnostics === null || diagnostics === undefined) { diagnostics = []; }

    if (referenceFound === null || referenceFound === undefined) {
        const iniPathErrors = Number(ini.referenceFound);
        fileReferenceFoundLevel = (Number.isFinite(iniPathErrors) && iniPathErrors >= 1 && iniPathErrors <= 4) ? iniPathErrors : severity.Warning;
    } else {
        fileReferenceFoundLevel = (Number.isFinite(referenceFound) && referenceFound >= 1 && referenceFound <= 4) ? referenceFound : severity.Warning;
    }
}
// ──────────────────────────────────────────────────────────────────────────
// MESSAGE FORMS .Parse
function logArrayToConsole(thisExtensionName, ...args) {

}
function logToConsole(thisExtensionName, ...args) {
    connection?.console.log(` [${thisExtensionName}] ` + args.join(` `));
}
function dbg(...args) {
    // if (debugOn) { logToConsole(extensionName, `[DEBUG]`, ...args); } 
    if (debugOn && severity >= verboseLevel) { logToConsole(extensionName, `[DEBUG]`, ...args); }
}
function err(...args) {
    logToConsole(extensionName, `[ERROR!!!]`, ...args);
    lastSeverity = ini.severity.Error;
}
function warn(...args) {
    logToConsole(extensionName, `[WARNING]`, ...args);
    lastSeverity = ini.severity.Warning;
}
function hint(...args) {
    logToConsole(extensionName, `[HINT]`, ...args);
    lastSeverity = ini.severity.Hint;
}
function info(...args) {
    logToConsole(extensionName, `[INFO]`, ...args);
    lastSeverity = ini.severity.Information;
}
function msg(severity = ini.severity.info, ...args) {
    lastSeverity = severity;
    switch (severity) {
        case ini.severity.Error:
            err(...args);
            break;
        case ini.severity.Warning:
            warn(...args);
            break;
        case ini.severity.Information:
            info(...args);
            break;
        case ini.severity.Hint:
            hint(...args);
            break;
        default:
            if (severity >= 5 && severity <= 10) {
                dbg(...args);
            } else {
                info(...args);
            }
            // info(...args);
            break;
    }
}
module.exports = {
    initialize,
    logToConsole,
    dbg,
    warn,
    info,
    err,
    msg
};
