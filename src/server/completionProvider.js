'use strict';

const { CompletionItemKind } = require('vscode-languageserver/node');
const {
    getCompletionContextFromText
} = require('../completion/completionContext');
const {
    applyTypedCasing,
    isInlineKeyword
} = require('../completion/inlineCompletionBuilder');
const {
    getNextLikelyKeywords,
    normalizeKeywordData
} = require('../completion/nextKeywordProvider');
const { getParameterTemplate } = require('../completion/parameterTemplates');

const MAX_COMPLETION_ITEMS = 100;

/**
 * Returns context-first, user-facing keyword candidates without duplicates.
 *
 * @param {object} contextInfo Completion context.
 * @param {object|object[]} languageData MyDefrag keyword data.
 * @returns {object[]} Ordered keyword candidates.
 */
function getCompletionCandidates(contextInfo, languageData) {
    const contextual = getNextLikelyKeywords(contextInfo, languageData);
    const { allKeywords } = normalizeKeywordData(languageData);
    const seen = new Set();
    const candidates = [];

    for (const keyword of [...contextual, ...allKeywords]) {
        if (!isInlineKeyword(keyword)) {
            continue;
        }

        const key = String(keyword.text).toLowerCase();
        if (seen.has(key)) {
            continue;
        }

        seen.add(key);
        candidates.push(keyword);
    }

    return candidates;
}

/**
 * Provides standard LSP completion items while the extension keeps ownership
 * of inline ghost-text prediction.
 *
 * @param {object} document LSP text document.
 * @param {{ line: number, character: number }} position Cursor position.
 * @param {object|object[]} languageData MyDefrag keyword data.
 * @returns {object[]} LSP completion items.
 */
function provideServerCompletions(document, position, languageData) {
    if (!document || !position || document.languageId !== 'mydfrg') {
        return [];
    }

    const contextInfo = getCompletionContextFromText(document.getText(), position);
    if (contextInfo.isInsideComment || contextInfo.isInsideString) {
        return [];
    }

    const normalizedTyped = contextInfo.typed.toLowerCase();
    const candidates = getCompletionCandidates(contextInfo, languageData)
        .filter(keyword => String(keyword.text).toLowerCase().startsWith(normalizedTyped))
        .slice(0, MAX_COMPLETION_ITEMS);

    return candidates.map((keyword, index) => {
        const label = applyTypedCasing(String(keyword.text), contextInfo.typed);
        const parameterTemplate = getParameterTemplate(keyword, contextInfo) ?? '';

        return {
            label,
            kind: CompletionItemKind.Keyword,
            detail: `MyDefrag ${keyword.parent || 'keyword'}`,
            filterText: label,
            sortText: String(index).padStart(4, '0'),
            textEdit: {
                range: {
                    start: {
                        line: position.line,
                        character: contextInfo.wordStartCharacter
                    },
                    end: position
                },
                newText: `${label}${parameterTemplate}`
            },
            data: {
                keyword: keyword.text,
                parent: keyword.parent || null
            }
        };
    });
}

module.exports = {
    getCompletionCandidates,
    provideServerCompletions
};
