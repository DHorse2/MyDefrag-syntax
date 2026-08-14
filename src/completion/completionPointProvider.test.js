'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { CompletionPointProvider } = require('./completionPointProvider');

class InlineCompletionItem {
    constructor(insertText) {
        this.insertText = insertText;
    }
}

function document(text, languageId = 'mydfrg') {
    return {
        languageId,
        lineAt() { return { text }; }
    };
}

function provider(options = {}) {
    return new CompletionPointProvider({
        vscode: { InlineCompletionItem },
        languageData: {
            KEYWORDS: [{ text: 'mounted', parent: 'volume_condition' }]
        },
        ...options
    });
}

test('provider returns an inline completion for a MyDefrag keyword prefix', () => {
    const result = provider().provide({
        document: document('mou'),
        position: { line: 0, character: 3 },
        token: { isCancellationRequested: false }
    });

    assert.equal(result.length, 1);
    assert.equal(result[0].insertText, 'nted');
});

test('provider rejects other languages, short prefixes, and cancellation', () => {
    assert.deepEqual(provider().provide({
        document: document('mou', 'plaintext'),
        position: { line: 0, character: 3 }
    }), []);
    assert.deepEqual(provider().provide({
        document: document('m'),
        position: { line: 0, character: 1 }
    }), []);
    assert.deepEqual(provider().provide({
        document: document('mou'),
        position: { line: 0, character: 3 },
        token: { isCancellationRequested: true }
    }), []);
});

test('provider rejects missing request data and comments', () => {
    assert.deepEqual(provider().provide(), []);
    assert.deepEqual(provider().provide({
        document: document('// mou'),
        position: { line: 0, character: 6 }
    }), []);
});

test('provider returns no word prediction when the feature is disabled', () => {
    const result = provider({ isEnabled: () => false }).provide({
        document: document('mou'),
        position: { line: 0, character: 3 },
        token: { isCancellationRequested: false }
    });

    assert.deepEqual(result, []);
});
