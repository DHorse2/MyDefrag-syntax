'use strict';
// nextKeywordProvider.js

/**
 * Normalizes language data or keyword arrays into lookup-friendly structures.
 *
 * @param {object|object[]} keywords Existing language-data module or keyword array.
 * @returns {{ allKeywords: object[], keywordsByParent: Map<string, object[]>|null }} Keyword lookup data.
 */
function normalizeKeywordData(keywords) {
    if (Array.isArray(keywords)) {
        return {
            allKeywords: keywords,
            keywordsByParent: null
        };
    }

    return {
        allKeywords: Array.isArray(keywords?.KEYWORDS) ? keywords.KEYWORDS : [],
        keywordsByParent: keywords?.KEYWORDS_BY_PARENT instanceof Map
            ? keywords.KEYWORDS_BY_PARENT
            : null
    };
}

/**
 * Returns parent-filtered keyword candidates for the current completion context.
 *
 * @param {object} contextInfo Lightweight completion context.
 * @param {object|object[]} keywords Existing language-data module or keyword array.
 * @returns {object[]} Keywords that are likely valid next choices.
 */
function getNextLikelyKeywords(contextInfo = {}, keywords = {}) {
    const parents = [
        ...(Array.isArray(contextInfo.allowedParents) ? contextInfo.allowedParents : []),
        contextInfo.parentHint
    ].filter(Boolean);

    if (!parents.length) {
        return [];
    }

    const { allKeywords, keywordsByParent } = normalizeKeywordData(keywords);
    const seen = new Set();
    const matches = [];

    for (const parent of parents) {
        const parentMatches = keywordsByParent?.get(parent)
            ?? allKeywords.filter(keyword => keyword.parent === parent);

        for (const keyword of parentMatches) {
            const key = `${keyword.parent}:${keyword.text}`;
            if (!seen.has(key)) {
                seen.add(key);
                matches.push(keyword);
            }
        }
    }

    return matches;
}

module.exports = {
    getNextLikelyKeywords,
    normalizeKeywordData
};
