'use strict';
// util.js
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
module.exports = { createRange };
