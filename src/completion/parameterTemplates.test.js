'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { getParameterTemplate } = require('./parameterTemplates');

test('getParameterTemplate accepts keyword strings and objects', () => {
    assert.equal(getParameterTemplate('Mounted'), '(yes)');
    assert.equal(getParameterTemplate({ text: 'SortByName' }), '(Ascending)');
});

test('getParameterTemplate is case-insensitive', () => {
    assert.equal(getParameterTemplate('WINDOWSIZE'), '(Restore)');
});

test('getParameterTemplate avoids adding a second opening parenthesis', () => {
    assert.equal(getParameterTemplate('Mounted', {
        lineText: 'Mounted(',
        positionCharacter: 7
    }), null);
});

test('getParameterTemplate rejects unknown or empty keywords', () => {
    assert.equal(getParameterTemplate('NotAKeyword'), null);
    assert.equal(getParameterTemplate(null), null);
});
