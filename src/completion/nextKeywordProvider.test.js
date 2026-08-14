'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { getNextLikelyKeywords, normalizeKeywordData } = require('./nextKeywordProvider');

const keywords = [
    { text: 'Mounted', parent: 'volume_condition' },
    { text: 'Writable', parent: 'volume_condition' },
    { text: 'Analyze', parent: 'volume_action' },
    { text: 'SortByName', parent: 'sort' }
];

test('normalizeKeywordData accepts arrays and language-data objects', () => {
    assert.deepEqual(normalizeKeywordData(keywords), {
        allKeywords: keywords,
        keywordsByParent: null
    });

    const byParent = new Map([['volume_action', [keywords[2]]]]);
    const normalized = normalizeKeywordData({ KEYWORDS: keywords, KEYWORDS_BY_PARENT: byParent });
    assert.equal(normalized.allKeywords, keywords);
    assert.equal(normalized.keywordsByParent, byParent);
});

test('getNextLikelyKeywords filters by allowed parents', () => {
    const result = getNextLikelyKeywords({
        allowedParents: ['volume_condition']
    }, keywords);

    assert.deepEqual(result.map(keyword => keyword.text), ['Mounted', 'Writable']);
});

test('getNextLikelyKeywords combines parents without duplicates', () => {
    const result = getNextLikelyKeywords({
        allowedParents: ['volume_condition', 'sort'],
        parentHint: 'volume_condition'
    }, keywords);

    assert.deepEqual(result.map(keyword => keyword.text), [
        'Mounted',
        'Writable',
        'SortByName'
    ]);
});

test('getNextLikelyKeywords returns no candidates without context', () => {
    assert.deepEqual(getNextLikelyKeywords({}, keywords), []);
});
