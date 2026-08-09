'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { boundedFraction } = require('../../shared/renderer-splitter');

test('splitter fraction enforces both pane minimums', () => {
    assert.equal(boundedFraction(1000, 0.5, 280, 320, 9), 0.5);
    assert.equal(boundedFraction(1000, 0.05, 280, 320, 9), 0.28);
    assert.equal(boundedFraction(1000, 0.95, 280, 320, 9), 0.671);
});

test('splitter fraction remains usable before layout measurement', () => {
    assert.equal(boundedFraction(0, 0.02, 280, 320, 9), 0.1);
    assert.equal(boundedFraction(Number.NaN, 0.98, 280, 320, 9), 0.9);
});

test('splitter exposes accessible pointer, keyboard, reset, and persistence behavior', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../../shared/renderer-splitter.js'), 'utf8');
    assert.match(source, /setAttribute\('role', 'separator'\)/);
    assert.match(source, /setAttribute\('aria-orientation', separatorOrientation\)/);
    assert.match(source, /addEventListener\('pointerdown'/);
    assert.match(source, /addEventListener\('pointermove'/);
    assert.match(source, /addEventListener\('keydown'/);
    assert.match(source, /event\.shiftKey \? 48 : 16/);
    assert.match(source, /addEventListener\('dblclick'/);
    assert.match(source, /storage\?\.setItem/);
});
