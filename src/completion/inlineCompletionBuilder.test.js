'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { buildInlineCompletion } = require('./inlineCompletionBuilder');

const keywords = [
    { text: 'mounted', parent: 'volume_condition' },
    { text: 'mount_point_internal', parent: 'volume_condition' },
    { text: 'sortbyname', parent: 'sort' }
];

test('buildInlineCompletion returns only the remaining keyword text', () => {
    const result = buildInlineCompletion({
        typed: 'mou',
        contextInfo: { allowedParents: ['volume_condition'] },
        keywords
    });

    assert.equal(result.insertText, 'nted');
    assert.equal(result.keyword.text, 'mounted');
});

test('buildInlineCompletion preserves uppercase and initial-cap casing', () => {
    assert.equal(buildInlineCompletion({
        typed: 'MOU',
        contextInfo: { allowedParents: ['volume_condition'] },
        keywords
    }).insertText, 'NTED');
    assert.equal(buildInlineCompletion({
        typed: 'Mou',
        contextInfo: { allowedParents: ['volume_condition'] },
        keywords
    }).insertText, 'nted');
});

test('buildInlineCompletion adds a parameter template for a complete keyword', () => {
    const result = buildInlineCompletion({
        typed: 'mounted',
        contextInfo: {
            allowedParents: ['volume_condition'],
            lineText: 'mounted',
            positionCharacter: 7
        },
        keywords
    });

    assert.equal(result.insertText, '(yes)');
});

test('buildInlineCompletion suppresses comments, strings, and internal keywords', () => {
    assert.equal(buildInlineCompletion({
        typed: 'mou',
        contextInfo: { isInsideComment: true },
        keywords
    }), null);
    assert.equal(buildInlineCompletion({
        typed: 'mou',
        contextInfo: { isInsideString: true },
        keywords
    }), null);
    assert.equal(buildInlineCompletion({
        typed: 'mount_',
        contextInfo: { allowedParents: ['volume_condition'] },
        keywords
    }), null);
});

test('buildInlineCompletion prefers context keywords over global matches', () => {
    const result = buildInlineCompletion({
        typed: 'sor',
        contextInfo: { allowedParents: ['sort'] },
        keywords
    });

    assert.equal(result.keyword.text, 'sortbyname');
});
