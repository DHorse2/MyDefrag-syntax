'use strict';
// completionContext.js

const MAX_CONTEXT_LINES = 100;

/**
 * Gets the active word fragment ending at the cursor.
 *
 * @param {string} linePrefix Text before the cursor.
 * @returns {{ typed: string, wordStartCharacter: number }} The fragment and start column.
 */
function getTypedFragment(linePrefix) {
    const match = linePrefix.match(/[A-Za-z_][A-Za-z0-9_]*$/);

    if (!match) {
        return {
            typed: '',
            wordStartCharacter: linePrefix.length
        };
    }

    return {
        typed: match[0],
        wordStartCharacter: linePrefix.length - match[0].length
    };
}

/**
 * Detects whether the cursor is inside a line comment.
 *
 * @param {string} linePrefix Text before the cursor.
 * @returns {boolean} True when the cursor is inside a comment.
 */
function isCommentPrefix(linePrefix) {
    return /^\s*(#|\/\/|--|rem\b)/i.test(linePrefix);
}

/**
 * Detects whether the cursor is inside a quoted string on the current line.
 *
 * @param {string} linePrefix Text before the cursor.
 * @returns {boolean} True when an unclosed quote appears before the cursor.
 */
function isInsideQuotedString(linePrefix) {
    let quoteCount = 0;
    let escaped = false;

    for (const character of linePrefix) {
        if (escaped) {
            escaped = false;
            continue;
        }

        if (character === '\\') {
            escaped = true;
            continue;
        }

        if (character === '"') {
            quoteCount++;
        }
    }

    return quoteCount % 2 === 1;
}

/**
 * Finds the keyword immediately before the active typed fragment.
 *
 * @param {string} precedingText Text before the current typed fragment.
 * @returns {string|null} The preceding keyword, or null.
 */
function getPrecedingKeyword(precedingText) {
    const matches = precedingText.match(/[A-Za-z_][A-Za-z0-9_]*/g);
    return matches?.length ? matches[matches.length - 1] : null;
}

/**
 * Maps lightweight surrounding block text to a conservative parent hint.
 *
 * @param {string[]} contextLines Lines before the cursor, bounded by MAX_CONTEXT_LINES.
 * @returns {{ parentHint: string|null, allowedParents: string[] }} Parent hint data.
 */
function getParentHint(contextLines) {
    const markers = {
        volumeSelect: -1,
        volumeActions: -1,
        volumeEnd: -1,
        fileSelect: -1,
        fileActions: -1,
        fileEnd: -1
    };

    contextLines.forEach((line, index) => {
        const normalized = line.toLowerCase();
        if (/\bvolumeselect\b/.test(normalized)) markers.volumeSelect = index;
        if (/\bvolumeactions\b/.test(normalized)) markers.volumeActions = index;
        if (/\bvolumeend\b/.test(normalized)) markers.volumeEnd = index;
        if (/\bfileselect\b/.test(normalized)) markers.fileSelect = index;
        if (/\bfileactions\b/.test(normalized)) markers.fileActions = index;
        if (/\bfileend\b/.test(normalized)) markers.fileEnd = index;
    });

    if (markers.fileActions > markers.fileEnd) {
        return { parentHint: 'file_action', allowedParents: ['file_action', 'sort'] };
    }

    if (markers.fileSelect > markers.fileActions && markers.fileSelect > markers.fileEnd) {
        return { parentHint: 'file_condition', allowedParents: ['file_condition', 'file_attribute'] };
    }

    if (markers.volumeActions > markers.volumeEnd) {
        return { parentHint: 'volume_action', allowedParents: ['volume_action', 'settingInline'] };
    }

    if (markers.volumeSelect > markers.volumeActions && markers.volumeSelect > markers.volumeEnd) {
        return { parentHint: 'volume_condition', allowedParents: ['volume_condition'] };
    }

    return { parentHint: null, allowedParents: [] };
}

/**
 * Builds a bounded, line-oriented completion context for inline completions.
 *
 * @param {object} document VS Code text document.
 * @param {object} position VS Code position.
 * @returns {object} Lightweight completion context.
 */
function getCompletionContext(document, position) {
    const lineText = document.lineAt(position.line).text;
    const linePrefix = lineText.slice(0, position.character);
    const { typed, wordStartCharacter } = getTypedFragment(linePrefix);
    const precedingText = linePrefix.slice(0, wordStartCharacter);
    const precedingKeyword = getPrecedingKeyword(precedingText);
    const startLine = Math.max(0, position.line - MAX_CONTEXT_LINES);
    const contextLines = [];

    for (let line = startLine; line < position.line; line++) {
        contextLines.push(document.lineAt(line).text);
    }
    contextLines.push(linePrefix);

    const blockContext = getParentHint(contextLines);
    let parentHint = blockContext.parentHint;
    let allowedParents = blockContext.allowedParents;

    if (!parentHint && precedingKeyword?.toLowerCase().startsWith('sort')) {
        parentHint = 'sort';
        allowedParents = ['sort'];
    }

    return {
        lineText,
        linePrefix,
        typed,
        wordStartCharacter,
        positionCharacter: position.character,
        parentHint,
        allowedParents,
        isInsideString: isInsideQuotedString(linePrefix),
        isInsideComment: isCommentPrefix(linePrefix),
        precedingKeyword,
        precedingText
    };
}

module.exports = {
    getCompletionContext
};
