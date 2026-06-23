'use strict';
// util.js
const fs = require("fs");
const path = require('path');
// const vscode = require('vscode');
const console = require('console');
// ──────────────────────────────────────────────────────────────────────────
// Utility Functions - crosscutting (shared) createRange
// range createRange
function createRange(startLine, startChar, endLine, endChar) {
    return {
        // range.start
        start: {
            // range.start.line
            line: startLine,
            // range.start.character
            character: startChar
        },
        // range.end
        end: {
            // range.end.line
            line: endLine,
            // range.end.character
            character: endChar
        }
    };
}
// ──────────────────────────────────────────────────────────────────────────
// let mydfrgExcludes, fileExcludes, searchExcludes;
let excludeConfig = {
    mydfrgExcludes: [],
    fileExcludes: {},
    searchExcludes: {},
    fileCount: 0,
    folderCount: 0,
    searchCount: 0
};
// ──────────────────────────────────────────────────────────────────────────
// Language server Get Relative Path
// Extension: relPath = vscode.workspace.asRelativePath(document.uri);
function getRelativePath(documentUri, workspaceFolderPaths = []) {
    for (const folderPath of workspaceFolderPaths) {
        if (documentUri.startsWith(folderPath)) {
            return documentUri.slice(folderPath.length);
        }
    }
    return documentUri;
}
// ──────────────────────────────────────────────────────────────────────────
// checkIsExcluded
function isExcluded(relPath, excludeConfig, logger) {
    // Check against user's search and files.exclude settings
    // const mydfrgExcludes = vscode.workspace.getConfiguration('mydfrg').get('exclude') || [];
    // const fileExcludes = vscode.workspace.getConfiguration('files').get('exclude') || {};
    // const searchExcludes = vscode.workspace.getConfiguration('search').get('exclude') || {};

    logger.dbg(8, "typeof relPath =", typeof relPath);
    logger.dbg(8, "relPath =", relPath);

    // Check user folder excludes (array of glob patterns)
    // const relPath = vscode.workspace.asRelativePath(document.uri);
    for (const pattern of excludeConfig.mydfrgExcludes) {
        // Strip **/ prefix and /** suffix to get the folder/file name
        const simplified = pattern.replace(/\*\*\//g, '').replace(/\/\*\*/g, '').replace(/\*/g, '');
        // console?.log(`User exclude: relPath ${relPath}, USER pattern}: ${pattern}, simplified: ${simplified}`);
        if (simplified && relPath.includes(simplified)) {
            excludeConfig.folderCount++;
            // diagnosticCollection.set(document.uri, []);
            return true;
        }
    }

    // Check files and search excludes (objects with pattern keys)
    for (const pattern of Object.keys(excludeConfig.fileExcludes)) {
        // Strip **/ prefix and /** suffix to get the folder/file name
        const simplified = pattern.replace(/\*\*\//g, '').replace(/\/\*\*/g, '').replace(/\*/g, '');
        // console?.log(`File and search exclude: relPath ${relPath},  IDE pattern: ${pattern}, simplified: ${simplified}`);
        if (simplified && relPath.includes(simplified)) {
            excludeConfig.fileCount++;
            // diagnosticCollection.set(document.uri, []);
            return true;
        }
    }
    // Check files and search excludes (objects with pattern keys)
    const excludes = { ...excludeConfig.fileExcludes, ...excludeConfig.searchExcludes };
    for (const pattern of Object.keys(excludeConfig.searchExcludes)) {
        // Strip **/ prefix and /** suffix to get the folder/file name
        const simplified = pattern.replace(/\*\*\//g, '').replace(/\/\*\*/g, '').replace(/\*/g, '');
        // console?.log(`File and search exclude: relPath ${relPath},  IDE pattern: ${pattern}, simplified: ${simplified}`);
        if (simplified && relPath.includes(simplified)) {
            excludeConfig.searchCount++;
            // diagnosticCollection.set(document.uri, []);
            return true;
        }
    }
    return false;
}

module.exports = { createRange, getRelativePath, isExcluded };
