'use strict';
// ini.js
//#region Initialize Initialize ini.js .Parse
const fs = require('fs');
const path = require('path');
const console = require('console');
const { message } = require('./logger');

var source; // the script name basically. server/extension/preview
var isServer; // or extension
var channelName; // = "LoggerOutput", // IE "MyDefrag Syntax"
var iniPath; // default = path.join(PARENT_DIR, "shared", `${channelName}.ini`);
// Defaults, overridden if found in file.
// DEVELOPERS!!! Set your defaults here
// especially if you want to skip using the ini settings.
var isDebugOn = true; // off for production
var verboseLevel = 5; // verbose (not detailed)
var isLogOn = true;
var isStrictMode = false;
var referenceRelativePathLevel = 2; // it's a warning
var referenceContainsMacrosLevel = 3; // it's a info
var referenceFileFoundLevel = 3; // Info
var referenceFileNotFoundLevel = 1; // Error
var fragmentParentLevel = 4; // Hint
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
// combined ini maps
var thisIniMap;
// ini Dictionary
var thisIniDictionary;
// project level settings
var iniDictionary;
// channel (extension/server/preview) settings
var channelNameMap;
// place your ini value substitution mappings here (quick)
// good for prototyping and development temporary stuff
var inlineIniMap = {
    // maxVerbose is a synonym for 7 (it isn't)
    maxVerbose: "7", // ToDo remove test ini setting after testing
    // allow 12 to be used
    // 12: "12"
};
//#endregion
function initialize(
    thisSource = "Unknown",
    thisIniPath = null,
    thisChannelName = "LoggerOutput", // IE "MyDefrag Syntax"
    channelIsServer = false,
    debugEnabled = null, // these all have defaults.
    verbose = null,
    logEnabled = null,
    useStrict = null,
    referenceRelativePath = null,
    referenceContainsMacros = null,
    referenceFound = null,
    referenceNotFound = null,
    fragmentParent = null
) {
    try { // ini.js:initialized
        // iniErrors = [];
        iniErrors.length = 0;  // clears without reassigning
        const SCRIPT_DIR = __dirname;
        const PARENT_DIR = path.dirname(SCRIPT_DIR);
        source = thisSource;
        channelName = thisChannelName;
        isServer = channelIsServer;
        if (isServer === null || isServer === undefined) { isServer = false; }
        // ─────────────────────────────────────────────────────────────────────────────────
        // ini File
        if (thisIniPath === null || thisIniPath === undefined) {
            iniPath = path.join(PARENT_DIR, "shared", `${channelName}.ini`);
        } else { iniPath = thisIniPath; }
        // Custom INI file reader handling.
        var thisIniDictionary = {};
        var thisIniMap = {};
        var iniDictionary = {};
        var channelNameMap = {};

        try { // read "iniDictionary.ini" file from disk shared folder
            iniDictionary = readIni(path.join(PARENT_DIR, "shared", `iniDictionary.ini`));
        } catch (errResult) {
            const message = `ini.js:initialize INFORMATION: Unable to read INI file "IniMap.ini" from disk: ${errResult.message}`;
            console?.error(message);
            iniDictionary = {};
        }

        try { // read "MyDefrage Settings.ini" file from disk root
            // Read MyDefrag Syntax INI file  <---- Your language configuration is in here <----
            iniData = readIni(iniPath, iniDictionary);
        } catch (errResult) {
            const message = `ini.js:initialize ERROR: Unable to read expected MyDefrag INI file "mydefrag-syntax.ini" from disk: ${errResult.message}`;
            console?.error(message);
            iniData = {};
        }
        iniData["severity"] = severity;

        try { // read "{Channel Name}Map.ini" file from disk shared folder
            channelNameMap = readIni(path.join(PARENT_DIR, "shared", `${channelName}Map.ini`), iniDictionary);
        } catch (errResult) {
            const message = `ini.js:initialize WARNING: Unable to read EXTENSION INI file "Mydefrag SyntaxMap.ini" from disk: ${errResult.message}`;
            console?.error(message);
            channelNameMap = {};
        }

        try { // combine "MyDefrag SyntaxMap.ini" file from disk
            iniData = {
                ...iniData,
                ...channelNameMap,
                ...inlineIniMap
            };
        } catch (errResult) {
            const message = `ini.js:initialize ERROR: Unexpected error merging INI files read from disk: ${errResult.message}`;
            throw new Error(message);
        }
        if (thisIniDictionary !== null && thisIniDictionary !== undefined) {
            if (thisIniDictionary['ERROR'] !== null && thisIniDictionary['ERROR'] !== undefined) {
                // ERROR value is not mapped?
                // Check for mandtory values (on disk) here
            }
        } else {
            const message = `ini.js:initialize ERROR: INI SETTINGS are undefined!!!\nUnable to read INI files from disk: ${errResult.message}`;
            throw new Error(message);
        }
        // ─────────────────────────────────────────────────────────────────────────────────
        // DEBUG
        if (debugEnabled === null || debugEnabled === undefined) {
            isDebugOn = String(iniData.isDebugOn ?? "true").toLowerCase() === "true";
        }
        // else { isDebugOn = debugEnabled; }

        // ─────────────────────────────────────────────────────────────────────────────────
        // VERBOSE
        // verboseLevel:
        //  0       - silent
        //  1       - errors
        //  2       - warnings
        //  3       - information
        //  4       - hint
        //  5...    - debug basic with higher values (currently < 10). Default value
        //  Debug (isDebugOn) must be on or logger.dbg messages will be ignored.
        if (verbose === null || verbose === undefined) {
            const iniVerbose = Number(iniData.verboseLevel);
            verboseLevel = (Number.isFinite(iniVerbose) && iniVerbose >= 0 && iniVerbose <= 10) ? iniVerbose : verboseLevel;
        } else {
            verboseLevel = (Number.isFinite(verbose) && verbose >= 0 && verbose <= 10) ? verbose : verboseLevel;
        }

        // ─────────────────────────────────────────────────────────────────────────────────
        // LOGGING available
        if (logEnabled === null || logEnabled === undefined) {
            isLogOn = String(iniData.logEnabled ?? "true").toLowerCase() === "true";
        } else {
            isLogOn = (logEnabled === true || logEnabled === false) ? useStrict : isLogOn;
        }

        // DEVELOPER settings
        // These values are important depending on the project context and methodology (paradigm/desigh pattern).
        // With reasonable defaults the usage and meaning of realitve paths varies.
        // Defaults:
        //      referenceRelativePathLevel      = Warning
        //      referenceContainsMacrosLevel    = Hint
        //      referenceFileFoundLevel         = Information
        //      referenceFileNotFoundLevel      = Error
        // The ambiguous presence of macros (variables) in paths might have different importance.
        // File found/Not found can be independently handled.
        // This is overridden by mode="strict" (see below):
        if (useStrict === null || useStrict === undefined) {
            isStrictMode = String(iniData.mode ?? "strict").toLowerCase() === "strict";
        } else {
            isStrictMode = (useStrict === true || useStrict === false) ? useStrict : isStrictMode;
        }

        if (isStrictMode) {
            referenceRelativePathLevel = severity.Error;
            referenceContainsMacrosLevel = severity.Warning;
            referenceFileFoundLevel = severity.Information;
            referenceFileNotFoundLevel = severity.Error;
        } else {
            if (referenceRelativePath === null || referenceRelativePath === undefined) {
                const iniPathErrors = Number(iniData.referenceRelativePathLevel);
                referenceRelativePathLevel = (Number.isFinite(iniPathErrors) && iniPathErrors >= 1 && iniPathErrors <= 4) ? iniPathErrors : referenceRelativePathLevel;
            } else {
                referenceRelativePathLevel = (Number.isFinite(referenceRelativePath) && referenceRelativePath >= 1 && referenceRelativePath <= 4) ? referenceRelativePath : referenceRelativePathLevel;
            }

            if (referenceContainsMacros === null || referenceContainsMacros === undefined) {
                const iniPathErrors = Number(iniData.referenceContainsMacros);
                referenceContainsMacrosLevel = (Number.isFinite(iniPathErrors) && iniPathErrors >= 1 && iniPathErrors <= 4) ? iniPathErrors : referenceContainsMacrosLevel;
            } else {
                referenceContainsMacrosLevel = (Number.isFinite(referenceContainsMacros) && referenceContainsMacros >= 1 && referenceContainsMacros <= 4) ? referenceContainsMacros : referenceContainsMacrosLevel;
            }

            if (referenceFound === null || referenceFound === undefined) {
                const iniPathErrors = Number(iniData.referenceFound);
                referenceFileFoundLevel = (Number.isFinite(iniPathErrors) && iniPathErrors >= 1 && iniPathErrors <= 4) ? iniPathErrors : referenceFileFoundLevel;
            } else {
                referenceFileFoundLevel = (Number.isFinite(referenceFound) && referenceFound >= 1 && referenceFound <= 4) ? referenceFound : referenceFileFoundLevel;
            }

            if (referenceNotFound === null || referenceNotFound === undefined) {
                const iniPathErrors = Number(iniData.referenceNotFound);
                referenceFileNotFoundLevel = (Number.isFinite(iniPathErrors) && iniPathErrors >= 1 && iniPathErrors <= 4) ? iniPathErrors : referenceFileNotFoundLevel;
            } else {
                referenceFileNotFoundLevel = (Number.isFinite(referenceNotFound) && referenceNotFound >= 1 && referenceNotFound <= 4) ? referenceNotFound : referenceFileNotFoundLevel;
            }

        }
        if (fragmentParent === null || fragmentParent === undefined) {
            const iniPathErrors = Number(iniData.fragmentParentLevel);
            fragmentParentLevel = (Number.isFinite(iniPathErrors) && iniPathErrors >= 1 && iniPathErrors <= 4) ? iniPathErrors : fragmentParentLevel;
        } else {
            fragmentParentLevel = (Number.isFinite(fragmentParent) && fragmentParent >= 1 && fragmentParent <= 4) ? fragmentParent : fragmentParentLevel;
        }
    } catch (errResult) {
        const message = `ini.js:initialize Unexpected error in common initialize: ${errResult.message}`;
        console?.error(message);
        // throw new Error(message);
    }

    return {
        source,
        iniData,
        isDebugOn,
        verboseLevel,
        isLogOn,
        referenceRelativePathLevel,
        referenceContainsMacrosLevel,
        referenceFileFoundLevel,
        referenceFileNotFoundLevel,
        fragmentParentLevel,
        iniErrors
    };
}
// ──────────────────────────────────────────────────────────────────────────
// ini Reader
function readIni(filePath, thisIniDictionary = null) {
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
        // throw new Error(message);
        text = "";
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
                if (thisIniDictionary === null || thisIniDictionary === undefined) { thisIniDictionary = new Set(); }
                // if (thisIniDictionary !== null && thisIniDictionary !== undefined) {
                //     // value = (thisIniDictionary[value] !== undefined ? thisIniDictionary[value] : value);
                // }
                if (value === key) {
                    // Dictionary item. Value unchanged.
                } else {
                    if (thisIniDictionary[value] === null || thisIniDictionary[value] === undefined) {
                        // value not defined in dictionary. Value unchanged.
                        const message = `WARNING, possible invalid data (${key.trim()}=${value}) in INI file. Value is not predefined as valid in "iniDictionary.ini"`
                        iniErrors.push(message);
                        // thisIniDictionary = new Set();
                        // if (section) result[section][key.trim() + '_Validation_'] = message;
                        // else result[key.trim() + '_Validation_'] = message;
                    } else {
                        // possible substitution (true=1), value is normally unchanged. 
                        value = thisIniDictionary[value];
                    }
                    if (section) result[section][key.trim()] = value;
                    else result[key.trim()] = value;
                }
            }
        }
    } catch (errResult) {
        // IniFile processing error
        const messageSimple = `Unexpected Error Processing the INI File:`;
        console?.error(messageSimple);
        iniErrors.push(messageSimple);

        message = `        ${errResult.message}`;
        console?.error(message);
        iniErrors.push(message);

        message = `        ${result}`;
        console?.log(message);
        iniErrors.push(`${messageSimple} errResult.message`);
        // throw new Error(`${messageSimple} errResult.message`)
    }
    return result;
}
// ──────────────────────────────────────────────────────────────────────────
module.exports = {
    source,
    iniData,
    isDebugOn,
    verboseLevel,
    severity,
    isLogOn,
    referenceRelativePathLevel,
    referenceContainsMacrosLevel,
    referenceFileFoundLevel,
    referenceFileNotFoundLevel,
    fragmentParentLevel,
    iniErrors,
    initialize,
    readIni
};
