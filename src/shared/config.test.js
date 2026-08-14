'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
    normalizeSeveritySetting,
    normalizeVerboseLevel
} = require('./config');

test('normalizeSeveritySetting accepts severity names and aliases', () => {
    assert.equal(normalizeSeveritySetting('Error', 4), 1);
    assert.equal(normalizeSeveritySetting(' warning ', 4), 2);
    assert.equal(normalizeSeveritySetting('Information', 4), 3);
    assert.equal(normalizeSeveritySetting('info', 4), 3);
    assert.equal(normalizeSeveritySetting('HINT', 1), 4);
});

test('normalizeSeveritySetting accepts numeric values from zero through four', () => {
    for (const value of [0, 1, 2, 3, 4, '3']) {
        assert.equal(normalizeSeveritySetting(value, 2), Number(value));
    }
});

test('normalizeSeveritySetting falls back for invalid values', () => {
    assert.equal(normalizeSeveritySetting(-1, 2), 2);
    assert.equal(normalizeSeveritySetting(5, 2), 2);
    assert.equal(normalizeSeveritySetting('verbose', 2), 2);
    assert.equal(normalizeSeveritySetting(undefined, 2), 2);
});

test('normalizeSeveritySetting supports injected severity constants', () => {
    const severity = { Error: 10, Warning: 20, Information: 30, Hint: 40 };

    assert.equal(normalizeSeveritySetting('warning', 99, severity), 20);
});

test('normalizeVerboseLevel accepts numeric strings and clamps the range', () => {
    assert.equal(normalizeVerboseLevel('7', 5), 7);
    assert.equal(normalizeVerboseLevel(-1, 5), 0);
    assert.equal(normalizeVerboseLevel(11, 5), 10);
});

test('normalizeVerboseLevel uses the supplied fallback for nonnumeric input', () => {
    assert.equal(normalizeVerboseLevel('not-a-number', 3), 3);
    assert.equal(normalizeVerboseLevel(undefined, 4), 4);
});
