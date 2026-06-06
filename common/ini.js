'use strict';
// ini.js
//#region Initialize Initialize ini.js .Parse
const fs = require('fs');
const path = require('path');
const { isServer } = require('./loggerExtension');
// const vscode = require('vscode');
let debugOn = false;
let verboseLevel = 1;
let logOn = true;

let strictMode = false;
let referenceRelativePathLevel = 2;
let referenceContainsMacrosLevel = 3;
let fileReferenceFoundLevel = 3;
let fileReferenceNotFoundLevel = 1;

let ini = {};
const iniErrors = [];
let severity = {
    None: 0,
    Error: 1,
    Warning: 2,
    Information: 3,
    Hint: 4,
    Verbose: 5,
    Verbose2: 6,
    Verbose3: 7,
    Verbose4: 8,
    Verbose5: 9,
    Verbose6: 10,
    Verbose7: 11,
    Verbose8: 12,
    Verbose9: 13,
    Verbose10: 14
};
// place your ini value substitution mappings here (quick)
const inlineIniMap = {
    // maxVerbose is a synonym fo 7 (it isn't)
    maxVerbose: 7,
    // allow 12 to be used
    // 12: "12"
};
//#endregion
function initialize(
    iniPath = null,
    channelName = null,
    channelIsServer = null,
    debugEnabled = null,
    verbose = null,
    logEnabled = null,
    useStrict = null,
    referenceRelativePath = null,
    referenceContainsMacros = null,
    referenceFound = null,
    referenceNotFound = null
) {
    // iniErrors = [];
    iniErrors.length = 0;  // clears without reassigning
    const SCRIPT_DIR = __dirname;
    if (channelName === null) { channelName = "LoggerOutput"; }
    isServer = channelIsServer;
    if (IsServer === null || IsServer === undefined) { IsServer = false; }
    if (iniPath === null || iniPath === undefined) {
        iniPath = path.join(SCRIPT_DIR, channelName + `.ini`);
    }
    // Custom INI file reader handling.
    const thisIniMap = {
        ...readIni(path.join(SCRIPT_DIR, `IniMap.ini`)),
        ...readIni(path.join(SCRIPT_DIR, channelName + `Map.ini`)),
        ...inlineIniMap
    };
    if (thisIniMap !== null && thisIniMap !== undefined) {
        if (thisIniMap['ERROR'] !== null && thisIniMap['ERROR'] !== undefined) {

        }
    }

    // Read INI file
    ini = readIni(iniPath, thisIniMap);

    // DEBUG
    if (debugEnabled === null || debugEnabled === undefined) {
        debugOn = String(ini.debugOn ?? "true").toLowerCase() === "true";
    } else { debugOn = debugEnabled; }

    // VERBOSE
    // verboseLevel:
    //  0       - silent
    //  1       - errors
    //  2       - warnings
    //  3       - information
    //  4       - hint
    //  5...    - debug basic with higher values (currently < 10). Default value
    //  Debug (debugOn) must be on or Logger.dbg messages will be ignored.
    if (verbose === null || verbose === undefined) {
        const iniVerbose = Number(ini.verboseLevel);
        verboseLevel = (Number.isFinite(iniVerbose) && iniVerbose >= 0 && iniVerbose <= 10) ? iniVerbose : 5;
    } else {
        verboseLevel = (Number.isFinite(verbose) && verbose >= 0 && verbose <= 10) ? verbose : 5;
    }

    // LOGGING available
    if (logEnabled === null || logEnabled === undefined) {
        logOn = String(ini.logEnabled ?? "true").toLowerCase() === "true";
    } else { logOn = logEnabled; }

    // DEVELOPER settings
    // These values are important depending on the project context and methodology (paradigm/desigh pattern).
    // With resonable defaults the usage and meaning of realitve paths varies.
    // Defaults:
    //      referenceRelativePathLevel  =Warning
    //      referenceContainsMacrosLevel=Hint
    //      fileReferenceFoundLevel         =Information
    //      fileReferenceNotFoundLevel      =Error
    // The ambiguos presence of macros (variables) in paths might have different importance.
    // File found/Not found can be independently handled.
    // This is overriden by mode="strict" (see below):

    // LOGGING available
    if (useStrict === null || useStrict === undefined) {
        strictMode = String(ini.mode ?? "strict").toLowerCase() === "strict";
    } else { strictMode = useStrict; }

    if (useStrict) {
        referenceRelativePathLevel = severity.Error;
        referenceContainsMacrosLevel = severity.Warning;
        fileReferenceFoundLevel = severity.Information;
        fileReferenceNotFoundLevel = severity.Error;
    } else {
        if (referenceRelativePath === null || referenceRelativePath === undefined) {
            const iniPathErrors = Number(ini.referenceRelativePathLevel);
            referenceRelativePathLevel = (Number.isFinite(iniPathErrors) && iniPathErrors >= 1 && iniPathErrors <= 4) ? iniPathErrors : severity.Warning;
        } else {
            referenceRelativePathLevel = (Number.isFinite(referenceRelativePath) && referenceRelativePath >= 1 && referenceRelativePath <= 4) ? referenceRelativePath : 2;
        }

        if (referenceContainsMacros === null || referenceContainsMacros === undefined) {
            const iniPathErrors = Number(ini.referenceContainsMacros);
            referenceContainsMacrosLevel = (Number.isFinite(iniPathErrors) && iniPathErrors >= 1 && iniPathErrors <= 4) ? iniPathErrors : severity.Warning;
        } else {
            referenceContainsMacrosLevel = (Number.isFinite(referenceContainsMacros) && referenceContainsMacros >= 1 && referenceContainsMacros <= 4) ? referenceContainsMacros : 2;
        }

        if (referenceFound === null || referenceFound === undefined) {
            const iniPathErrors = Number(ini.referenceFound);
            fileReferenceFoundLevel = (Number.isFinite(iniPathErrors) && iniPathErrors >= 1 && iniPathErrors <= 4) ? iniPathErrors : severity.Warning;
        } else {
            fileReferenceFoundLevel = (Number.isFinite(referenceFound) && referenceFound >= 1 && referenceFound <= 4) ? referenceFound : severity.Warning;
        }

        if (referenceNotFound === null || referenceNotFound === undefined) {
            const iniPathErrors = Number(ini.referenceNotFound);
            fileReferenceNotFoundLevel = (Number.isFinite(iniPathErrors) && iniPathErrors >= 1 && iniPathErrors <= 4) ? iniPathErrors : severity.Error;
        } else {
            fileReferenceNotFoundLevel = (Number.isFinite(referenceNotFound) && referenceNotFound >= 1 && referenceNotFound <= 4) ? referenceNotFound : severity.Error;
        }

    }

    return {
        ini,
        debugOn,
        verboseLevel,
        logOn,
        referenceRelativePathLevel,
        referenceContainsMacrosLevel,
        fileReferenceFoundLevel,
        fileReferenceNotFoundLevel,
        iniErrors
    };
}
// ──────────────────────────────────────────────────────────────────────────
// Ini Reader
function readIni(filePath, thisIniMap = null) {
    // very basic INI parser (example)
    let result = {};
    // ──────────────────────────────────────────────────────────────────────────
    let text;
    try { // ── Text - Read ─────────────────────────────────────────────────────────────────
        text = fs.readFileSync(filePath, 'utf8');
    } catch (errResult) {
        // IniFile not found
        iniErrors.push('Error Opening INI File');
        return result;
    }
    // ──────────────────────────────────────────────────────────────────────────
    try { // ── Text - Process INI file ────────────────────────────────────────────────────
        let section = null;
        for (const line of text.split(/\r?\n/)) {
            let value;
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('#')) continue;

            // ──────── SECTION ───────────────────────────────────────────────────
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                section = trimmed.slice(1, -1);
                result[section] = {};
            } else {
            // ──────── Key / value ───────────────────────────────────────────────────
                const [key, ...rest] = trimmed.split('=');
                value = rest.join('=').trim();
                if (thisIniMap !== null && thisIniMap !== undefined) {
                    if (thisIniMap[value] === undefined) {
                        const msg = `WARNING, possible invalid data (${key.trim()}=${value}) in INI file. Value is not predefined as valid in "iniMap.ini"`
                        iniErrors.push(msg);
                        if (section) result[section][key.trim() + '_Validation_'] = msg;
                        else result[key.trim() + '_Validation_'] = msg;
                    } else { value = thisIniMap[value]; }
                    // value = (thisIniMap[value] !== undefined ? thisIniMap[value] : value);
                }
                if (section) result[section][key.trim()] = value;
                else result[key.trim()] = value;
            }
        }
    } catch (errResult) {
        // IniFile not found
        iniErrors.push('Error Opening INI File');
        return result;
    }
    return result;
}
// ──────────────────────────────────────────────────────────────────────────
// Utility Functions - crosscutting (shared) createRange
function createRange(startLine, startChar, endLine, endChar) {
    return {
        start: {
            line: startLine,
            character: startChar
        },
        end: {
            line: endLine,
            character: endChar
        }
    };
}
// ──────────────────────────────────────────────────────────────────────────
module.exports = {
    ini,
    debugOn,
    verboseLevel,
    severity,
    logOn,
    referenceRelativePathLevel,
    referenceContainsMacrosLevel,
    fileReferenceFoundLevel,
    fileReferenceNotFoundLevel,
    iniErrors,
    initialize,
    readIni,
    createRange
};
