'use strict';

const path = require('node:path');

/**
 * Resolves a document-link path relative to the document's containing folder.
 *
 * @param {string} documentFileName The source document's absolute filename.
 * @param {string} referencedPath The absolute or relative referenced path.
 * @returns {string} The resolved absolute path.
 */
function resolveDocumentLinkPath(documentFileName, referencedPath) {
    const normalizedPath = String(referencedPath).replace(/[\\/]/g, path.sep);
    return path.resolve(path.dirname(documentFileName), normalizedPath);
}

/**
 * Compares two VS Code-compatible ranges by their numeric coordinates.
 *
 * @param {object} left The first range.
 * @param {object} right The second range.
 * @returns {boolean} Whether the ranges are identical.
 */
function rangesEqual(left, right) {
    return left?.start?.line === right?.start?.line &&
        left?.start?.character === right?.start?.character &&
        left?.end?.line === right?.end?.line &&
        left?.end?.character === right?.end?.character;
}

/**
 * Checks whether a document link already owns a range.
 *
 * @param {object[]} links The document links collected so far.
 * @param {object} range The candidate range.
 * @returns {boolean} Whether an existing link has the same range.
 */
function hasDocumentLinkRange(links, range) {
    return links.some(link => rangesEqual(link.range, range));
}

/**
 * Builds the scalar argument contract expected by mdm.openFileAtPosition.
 *
 * @param {string} filePath The resolved file path.
 * @param {number} line The zero-based line number.
 * @param {number} col The zero-based column number.
 * @returns {{path: string, line: number, col: number}} The command arguments.
 */
function buildOpenFileCommandArguments(filePath, line = 0, col = 0) {
    if (typeof filePath !== 'string' || !filePath) {
        throw new TypeError('filePath must be a non-empty string');
    }
    if (!Number.isInteger(line) || line < 0 || !Number.isInteger(col) || col < 0) {
        throw new TypeError('line and col must be non-negative integers');
    }

    return { path: filePath, line, col };
}

module.exports = {
    buildOpenFileCommandArguments,
    hasDocumentLinkRange,
    rangesEqual,
    resolveDocumentLinkPath
};
