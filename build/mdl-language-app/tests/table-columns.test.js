'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { boundedWidth } = require('../../shared/renderer-table-columns');

test('table column widths remain within configured bounds', () => {
    assert.equal(boundedWidth(20, 72, 960), 72);
    assert.equal(boundedWidth(240, 72, 960), 240);
    assert.equal(boundedWidth(1200, 72, 960), 960);
    assert.equal(boundedWidth(Number.NaN, 72, 960), 72);
});

test('table column resizers expose pointer, keyboard, reset, and persistence behavior', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../../shared/renderer-table-columns.js'), 'utf8');
    assert.match(source, /setAttribute\('role', 'separator'\)/);
    assert.match(source, /setAttribute\('aria-orientation', 'vertical'\)/);
    assert.match(source, /addEventListener\('pointerdown'/);
    assert.match(source, /addEventListener\('pointermove'/);
    assert.match(source, /addEventListener\('keydown'/);
    assert.match(source, /event\.shiftKey \? 48 : 16/);
    assert.match(source, /addEventListener\('dblclick'/);
    assert.match(source, /storage\?\.setItem/);
    assert.match(source, /classList\.add\('has-resized-columns'\)/);
    assert.match(source, /classList\.remove\('has-resized-columns'\)/);
});
