'use strict';
// logger.js
const fs = require("fs");
const path = require('path');
const vscode = require('vscode');
// language server
let log;
let debugOn = false;
let verboseLevel = 0;
let extensionName = "[MyDefrag]"
let lastSeverity;

function initialize(outputChannel, debugEnabled = false, verboseLevel = 0) {
    log = outputChannel;
    debugOn = debugEnabled;
    verbose = verboseLevel;
}
function logToConsole(thisExtensionName, ...args) { 
    log?.append(' [${thisExtensionName}] ' + args.join(' ') + '\n'); 
}
function dbg(...args) { 
    if (ini.debugOn) { logToConsole(extensionName, '[DEBUG]', ...args); } 
}
function error(...args) { 
    logToConsole(extensionName, '[ERROR!!!]', ...args);
    lastSeverity = vscode.DiagnosticSeverity.error;
}
function warn(...args) { 
    logToConsole(extensionName, '[WARNING]', ...args); 
    lastSeverity = vscode.DiagnosticSeverity.warn;
}
function hint(...args) { 
    logToConsole(extensionName, '[HINT]', ...args); 
    lastSeverity = vscode.DiagnosticSeverity.hint;
}
function info(...args) { 
    logToConsole(extensionName, '[INFO]', ...args); 
    lastSeverity = vscode.DiagnosticSeverity.info;
}
function msg(diagnosticSeverity = vscode.DiagnosticSeverity.info, ...args) {
    lastSeverity = diagnosticSeverity;
    switch (diagnosticSeverity) {
        case vscode.DiagnosticSeverity.error:
            error(...args);
            break;
        case vscode.DiagnosticSeverity.warn:
            warn(...args);
            break;
        case vscode.DiagnosticSeverity.info:
            info(...args);
            break;
        case vscode.DiagnosticSeverity.hint:
            hint(...args);
            break;
        default:
            info(...args);
            break;
    }
}
module.exports = {
    initialize,
    logToConsole,
    dbg,
    warn,
    info,
    error,
    msg
};
