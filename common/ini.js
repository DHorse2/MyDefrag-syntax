'use strict';
// ini.js
//#region Initialize Initialize ini.js .Parse
const fs = require('fs');
const path = require('path');
const console = require('console');
const { message } = require('./loggerExtension');

var isServer = false;
var debugOn = false;
var verboseLevel = 1;
var logOn = true;
var strictMode = false;
var referenceRelativePathLevel = 2;
var referenceContainsMacrosLevel = 3;
var fileReferenceFoundLevel = 3;
var fileReferenceNotFoundLevel = 1;
// ─────────────────────────────────────────────────────────────────────────────────
var iniData = {};
const iniErrors = [];
var severity = {
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
// Custom INI file reader handling.
var thisIniMap;
var iniMap;
var channelNameMap;
// place your ini value substitution mappings here (quick)
var inlineIniMap = {
    // maxVerbose is a synonym for 7 (it isn't)
    maxVerbose: "7", // ToDo remove after testing
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
    try { // ini.js:initialized
        // iniErrors = [];
        iniErrors.length = 0;  // clears without reassigning
        const SCRIPT_DIR = __dirname;
        const PARENT_DIR = path.dirname(SCRIPT_DIR);
        if (channelName === null) { channelName = "LoggerOutput"; }
        isServer = channelIsServer;
        if (isServer === null || isServer === undefined) { isServer = false; }
        // ─────────────────────────────────────────────────────────────────────────────────
        // ini File
        if (iniPath === null || iniPath === undefined) {
            iniPath = path.join(PARENT_DIR, "common", `${channelName}.ini`);
        }
        // Custom INI file reader handling.
        var thisIniMap = {};
        var iniMap = {};
        var channelNameMap = {};
        try { // read "iniMap.ini" file from disk
            iniMap = readIni(path.join(PARENT_DIR, "common", `iniMap.ini`));
        } catch (errResult) {
            const message = `ini.js:initialize INFORMATION: Unable to read INI file "IniMap.ini" from disk: ${errResult.message}`;
            console.error(message);
        }
        try { // read "MyDefrag SyntaxMap.ini" file from disk
            channelNameMap = readIni(path.join(PARENT_DIR, "common", `${channelName}Map.ini`));
        } catch (errResult) {
            const message = `ini.js:initialize WARNING: Unable to read EXTENSION INI file "Mydefrag SyntaxMap.ini" from disk: ${errResult.message}`;
            console.error(message);
        }
        try { // read "MyDefrag SyntaxMap.ini" file from disk
            thisIniMap = {
                ...iniMap,
                ...channelNameMap,
                ...inlineIniMap
            };
        } catch (errResult) {
            const message = `ini.js:initialize ERROR: Unexpected error merging INI files read from disk: ${errResult.message}`;
            throw new Error(message);
        }
        if (thisIniMap !== null && thisIniMap !== undefined) {
            if (thisIniMap['ERROR'] !== null && thisIniMap['ERROR'] !== undefined) {
                // ERROR value is not mapped?
                // Check for mandtory values (on disk) here
            }
        } else {
            const message = `ini.js:initialize ERROR: INI SETTINGS are undefined!!!\nUnable to read INI files from disk: ${errResult.message}`;
            throw new Error(message);
        }

        // Read INI file
        iniData = readIni(iniPath, thisIniMap);
        iniData["severity"] = severity;

        // ─────────────────────────────────────────────────────────────────────────────────
        // DEBUG
        if (debugEnabled === null || debugEnabled === undefined) {
            debugOn = String(iniData.debugOn ?? "true").toLowerCase() === "true";
        } else { debugOn = debugEnabled; }

        // ─────────────────────────────────────────────────────────────────────────────────
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
            const iniVerbose = Number(iniData.verboseLevel);
            verboseLevel = (Number.isFinite(iniVerbose) && iniVerbose >= 0 && iniVerbose <= 10) ? iniVerbose : 5;
        } else {
            verboseLevel = (Number.isFinite(verbose) && verbose >= 0 && verbose <= 10) ? verbose : 5;
        }

        // ─────────────────────────────────────────────────────────────────────────────────
        // LOGGING available
        if (logEnabled === null || logEnabled === undefined) {
            logOn = String(iniData.logEnabled ?? "true").toLowerCase() === "true";
        } else { logOn = logEnabled; }

        // DEVELOPER settings
        // These values are important depending on the project context and methodology (paradigm/desigh pattern).
        // With reasonable defaults the usage and meaning of realitve paths varies.
        // Defaults:
        //      referenceRelativePathLevel  =Warning
        //      referenceContainsMacrosLevel=Hint
        //      fileReferenceFoundLevel         =Information
        //      fileReferenceNotFoundLevel      =Error
        // The ambiguous presence of macros (variables) in paths might have different importance.
        // File found/Not found can be independently handled.
        // This is overridden by mode="strict" (see below):

        // LOGGING available
        if (useStrict === null || useStrict === undefined) {
            strictMode = String(iniData.mode ?? "strict").toLowerCase() === "strict";
        } else { strictMode = useStrict; }

        if (strictMode) {
            referenceRelativePathLevel = severity.Error;
            referenceContainsMacrosLevel = severity.Warning;
            fileReferenceFoundLevel = severity.Information;
            fileReferenceNotFoundLevel = severity.Error;
        } else {
            if (referenceRelativePath === null || referenceRelativePath === undefined) {
                const iniPathErrors = Number(iniData.referenceRelativePathLevel);
                referenceRelativePathLevel = (Number.isFinite(iniPathErrors) && iniPathErrors >= 1 && iniPathErrors <= 4) ? iniPathErrors : severity.Warning;
            } else {
                referenceRelativePathLevel = (Number.isFinite(referenceRelativePath) && referenceRelativePath >= 1 && referenceRelativePath <= 4) ? referenceRelativePath : 2;
            }

            if (referenceContainsMacros === null || referenceContainsMacros === undefined) {
                const iniPathErrors = Number(iniData.referenceContainsMacros);
                referenceContainsMacrosLevel = (Number.isFinite(iniPathErrors) && iniPathErrors >= 1 && iniPathErrors <= 4) ? iniPathErrors : severity.Warning;
            } else {
                referenceContainsMacrosLevel = (Number.isFinite(referenceContainsMacros) && referenceContainsMacros >= 1 && referenceContainsMacros <= 4) ? referenceContainsMacros : 2;
            }

            if (referenceFound === null || referenceFound === undefined) {
                const iniPathErrors = Number(iniData.referenceFound);
                fileReferenceFoundLevel = (Number.isFinite(iniPathErrors) && iniPathErrors >= 1 && iniPathErrors <= 4) ? iniPathErrors : severity.Warning;
            } else {
                fileReferenceFoundLevel = (Number.isFinite(referenceFound) && referenceFound >= 1 && referenceFound <= 4) ? referenceFound : severity.Warning;
            }

            if (referenceNotFound === null || referenceNotFound === undefined) {
                const iniPathErrors = Number(iniData.referenceNotFound);
                fileReferenceNotFoundLevel = (Number.isFinite(iniPathErrors) && iniPathErrors >= 1 && iniPathErrors <= 4) ? iniPathErrors : severity.Error;
            } else {
                fileReferenceNotFoundLevel = (Number.isFinite(referenceNotFound) && referenceNotFound >= 1 && referenceNotFound <= 4) ? referenceNotFound : severity.Error;
            }

        }
    } catch (errResult) {
        const message = `ini.js:initialize Unexpected error in common initialize: + ${errResult.message}`;
        throw new Error(message);
    }

    return {
        iniData,
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
// ini Reader
function readIni(filePath, thisIniMap = null) {
    // very basic INI parser (example)
    const result = new Set();
    // ──────────────────────────────────────────────────────────────────────────
    let text;
    let section = null;
    try { // ── Text - Read File ─────────────────────────────────────────────────────────────────
        text = fs.readFileSync(filePath, 'utf8');
    } catch (errResult) {
        // IniFile not found
        const message = `Error Reading INI File ${filePath}: ${errResult.message}`;
        iniErrors.push(message);
        throw new Error(message);
    }
    try { // ── Text - Process INI file ────────────────────────────────────────────────────
        for (const line of text.split(/\r?\n/)) {
            let value;
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('#')) continue;
            // ──────── SECTION ───────────────────────────────────────────────────
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                section = trimmed.slice(1, -1);
                result[section] = {};
            } else {
                // ──────── Key / value pairs ───────────────────────────────────────────────────
                const [key, ...rest] = trimmed.split('=');
                value = rest.join('=').trim();
                // Is value present in INI and therefore an Expected Value VS Unique
                if (thisIniMap === null || thisIniMap === undefined) { thisIniMap = new Set(); }
                if (thisIniMap[value] === null || thisIniMap[value] === undefined) {
                    const message = `WARNING, possible invalid data (${key.trim()}=${value}) in INI file. Value is not predefined as valid in "iniMap.ini"`
                    iniErrors.push(message);
                    thisIniMap = new Set();
                    if (section) result[section][key.trim() + '_Validation_'] = message;
                    else result[key.trim() + '_Validation_'] = message;
                } else {
                    value = thisIniMap[value];
                    if (thisIniMap !== null && thisIniMap !== undefined) {
                        // value = (thisIniMap[value] !== undefined ? thisIniMap[value] : value);
                    }
                }
                if (section) result[section][key.trim()] = value;
                else result[key.trim()] = value;
            }
        }
    } catch (errResult) {
        // IniFile processing error
        const messageSimple = `Unexpected Error Processing the INI File:`;
        console.error(messageSimple);
        iniErrors.push(messageSimple);

        message = `        ${errResult.message}`;
        console.error(message);
        iniErrors.push(message);

        message = `        ${result}`;
        console.log(message);
        iniErrors.push(message);
        throw new Error(`${messageSimple} errResult.message`)
    }
    return result;
}
// ──────────────────────────────────────────────────────────────────────────
module.exports = {
    iniData,
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
    readIni
};
