'use strict';
// inlineCompletionBuilder.js

const { getNextLikelyKeywords, normalizeKeywordData } = require('./nextKeywordProvider');
const { getParameterTemplate } = require('./parameterTemplates');

/**
 * Applies simple casing from the typed fragment to a lowercase keyword.
 *
 * @param {string} keywordText Keyword text from language data.
 * @param {string} typed Active typed fragment.
 * @returns {string} Display keyword text.
 */
function applyTypedCasing(keywordText, typed) {
    if (!typed) {
        return keywordText;
    }

    if (typed.toUpperCase() === typed) {
        return keywordText.toUpperCase();
    }

    if (typed[0] === typed[0].toUpperCase()) {
        return keywordText[0].toUpperCase() + keywordText.slice(1);
    }

    return keywordText;
}

/**
 * Determines whether a language-data keyword should be shown as user-facing ghost text.
 *
 * @param {object} keyword Existing language-data keyword object.
 * @returns {boolean} True when the keyword is safe to suggest.
 */
function isInlineKeyword(keyword) {
    const keywordText = String(keyword?.text ?? '');
    return Boolean(keywordText) && !keywordText.includes('_');
}

/**
 * Gets the first safe keyword candidate for the typed fragment.
 *
 * @param {string} typed Active typed fragment.
 * @param {object} contextInfo Lightweight completion context.
 * @param {object|object[]} keywords Existing language-data module or keyword array.
 * @returns {object|null} The selected keyword, or null.
 */
function findBestKeyword(typed, contextInfo, keywords) {
    const normalizedTyped = typed.toLowerCase();
    const { allKeywords } = normalizeKeywordData(keywords);
    const userKeywords = allKeywords.filter(isInlineKeyword);
    const contextKeywords = getNextLikelyKeywords(contextInfo, keywords).filter(isInlineKeyword);
    const candidateGroups = contextKeywords.length
        ? [contextKeywords, userKeywords]
        : [userKeywords];

    for (const group of candidateGroups) {
        const match = group.find(keyword => {
            const keywordText = String(keyword.text ?? '').toLowerCase();
            return keywordText.length > normalizedTyped.length
                && keywordText.startsWith(normalizedTyped);
        });

        if (match) {
            return match;
        }
    }

    return userKeywords.find(keyword => {
        const keywordText = String(keyword.text ?? '').toLowerCase();
        return keywordText === normalizedTyped;
    }) ?? null;
}

/**
 * Builds inline-completion ghost text for a MyDefrag keyword.
 *
 * @param {object} options Completion inputs.
 * @param {string} options.typed Active typed fragment.
 * @param {object} options.contextInfo Lightweight completion context.
 * @param {object|object[]} options.keywords Existing language-data module or keyword array.
 * @returns {{ insertText: string, keyword: object }|null} Inline completion suggestion data.
 */
function buildInlineCompletion({ typed, contextInfo, keywords }) {
    if (!typed || contextInfo?.isInsideComment || contextInfo?.isInsideString) {
        return null;
    }

    const keyword = findBestKeyword(typed, contextInfo, keywords);
    if (!keyword?.text) {
        return null;
    }

    const displayText = applyTypedCasing(keyword.text, typed);
    const remainingText = displayText.slice(typed.length);

    if (remainingText.length > 0) {
        return {
            insertText: remainingText,
            keyword
        };
    }

    const template = getParameterTemplate(keyword, contextInfo);
    if (!template) {
        return null;
    }

    return {
        insertText: template,
        keyword
    };
}

module.exports = {
    buildInlineCompletion
};
