'use strict';

const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const { PROJECT_ROOT } = require('./helpers');
const { suggestCatalogKey } = require('../services/source-key-suggester');

function sourceLine(source, text) {
    const index = source.split(/\r?\n/u).findIndex((line) => line.includes(text));
    assert.notEqual(index, -1, `Expected source line containing ${text}`);
    return index + 1;
}

test('suggests a component-prefixed JSON property path', () => {
    const sourceText = fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8');
    const line = sourceLine(sourceText, '"title": "MyDefrag"');

    const result = suggestCatalogKey({
        component: 'package',
        relativePath: 'package.json',
        sourceText,
        line,
        candidateText: 'MyDefrag'
    });

    assert.equal(result.suggestedKey, 'package.contributes.configuration.title');
    assert.equal(result.strategy, 'json-path');
    assert.equal(result.confidence, 'high');
});

test('uses stable array-item identity so repeated JSON properties receive distinct keys', () => {
    const sourceText = `{
  "commands": [
    { "command": "tool.first", "title": "First command" },
    { "command": "tool.second", "title": "Second command" }
  ]
}`;
    const first = suggestCatalogKey({
        component: 'package',
        relativePath: 'package.json',
        sourceText,
        line: sourceLine(sourceText, 'First command'),
        candidateText: 'First command'
    });
    const second = suggestCatalogKey({
        component: 'package',
        relativePath: 'package.json',
        sourceText,
        line: sourceLine(sourceText, 'Second command'),
        candidateText: 'Second command'
    });

    assert.equal(first.suggestedKey, 'package.commands.tool.first.title');
    assert.equal(second.suggestedKey, 'package.commands.tool.second.title');
    assert.notEqual(first.suggestedKey, second.suggestedKey);
});

test('adjusts a suggestion that is already occupied instead of reusing an existing catalog key', () => {
    const sourceText = '{ "title": "Second title" }';
    const result = suggestCatalogKey({
        component: 'package',
        relativePath: 'package.json',
        sourceText,
        line: 1,
        candidateText: 'Second title',
        existingKeys: ['package.title']
    });

    assert.equal(result.baseSuggestedKey, 'package.title');
    assert.equal(result.suggestedKey, 'package.title.Second.title');
    assert.equal(result.collisionAdjusted, true);
});

test('suggests a JavaScript function and interpolation member path', () => {
    const sourceText = fs.readFileSync(path.join(PROJECT_ROOT, 'src', 'extension.js'), 'utf8');
    const message = 'extension.js:activate Unexpected error in Logging Channel and Status Bar initialization';
    const line = sourceLine(sourceText, message);

    const result = suggestCatalogKey({
        component: 'extension',
        relativePath: 'src/extension.js',
        sourceText,
        line,
        candidateText: `${message}: \${errResult.message}`
    });

    assert.equal(result.suggestedKey, 'extension.activate.errResult.message');
    assert.equal(result.strategy, 'javascript-context');
    assert.equal(result.confidence, 'medium');
});
