'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { DiagState, DiagnosticStateStore } = require('./diagnosticsState');

function fixture(t) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mydefrag-state-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    return {
        directory,
        stateFile: path.join(directory, 'state.json')
    };
}

test('state store persists normalized keys and sorted current-format data', t => {
    const { stateFile } = fixture(t);
    const store = new DiagnosticStateStore(stateFile);

    store.set('C:\\Repo\\Two.MyD|2', DiagState.FIXED);
    store.set('C:\\Repo\\One.MyD|1', DiagState.SKIPPED);

    assert.equal(store.get('c:/repo/two.myd|2'), DiagState.FIXED);
    assert.equal(store.isSkipped('C:/REPO/ONE.MYD|1'), true);
    assert.deepEqual(JSON.parse(fs.readFileSync(stateFile, 'utf8')), {
        items: {
            'c:/repo/one.myd|1': 'skipped',
            'c:/repo/two.myd|2': 'fixed'
        }
    });
});

test('state store removes a key when assigned NONE', t => {
    const { stateFile } = fixture(t);
    const store = new DiagnosticStateStore(stateFile);

    store.set('item', DiagState.SENT);
    assert.equal(store.isSent('item'), true);
    store.set('item', DiagState.NONE);

    assert.equal(store.get('item'), DiagState.NONE);
    assert.deepEqual(JSON.parse(fs.readFileSync(stateFile, 'utf8')), { items: {} });
});

test('state store loads legacy object arrays and ignores invalid states', t => {
    const { stateFile } = fixture(t);
    fs.writeFileSync(stateFile, JSON.stringify({
        fixed: ['A'],
        skipped: ['B'],
        ignore: ['C'],
        ignored: ['D'],
        items: undefined
    }), 'utf8');

    const store = new DiagnosticStateStore(stateFile);

    assert.equal(store.isFixed('a'), true);
    assert.equal(store.isSkipped('b'), true);
    assert.equal(store.isIgnored('c'), true);
    assert.equal(store.isIgnored('d'), true);
    store.setLoadedState('invalid', 'not-a-state');
    assert.equal(store.get('invalid'), DiagState.NONE);
});

test('state store loads a legacy array as skipped diagnostics', t => {
    const { stateFile } = fixture(t);
    fs.writeFileSync(stateFile, JSON.stringify(['A', 'B']), 'utf8');

    const store = new DiagnosticStateStore(stateFile);

    assert.equal(store.isSkipped('a'), true);
    assert.equal(store.isSkipped('b'), true);
});

test('state store falls back to a legacy file only when primary is absent', t => {
    const { directory, stateFile } = fixture(t);
    const legacyStateFile = path.join(directory, 'legacy.json');
    fs.writeFileSync(legacyStateFile, JSON.stringify({ items: { legacy: 'fixed' } }), 'utf8');

    const store = new DiagnosticStateStore(stateFile, { legacyStateFile });

    assert.equal(store.isFixed('legacy'), true);
    assert.equal(store.getLoadStateFile(), legacyStateFile);
});

test('clearSkipped preserves other states and reset removes all states', t => {
    const { stateFile } = fixture(t);
    const store = new DiagnosticStateStore(stateFile);
    store.set('skip', DiagState.SKIPPED);
    store.set('fix', DiagState.FIXED);

    store.clearSkipped();
    assert.equal(store.get('skip'), DiagState.NONE);
    assert.equal(store.isFixed('fix'), true);

    store.reset();
    assert.equal(store.items.size, 0);
    assert.deepEqual(JSON.parse(fs.readFileSync(stateFile, 'utf8')), { items: {} });
});

test('state store tolerates malformed state JSON', t => {
    const { stateFile } = fixture(t);
    fs.writeFileSync(stateFile, '{not-json', 'utf8');
    const originalError = console.error;
    const messages = [];
    console.error = message => messages.push(String(message));
    t.after(() => { console.error = originalError; });

    const store = new DiagnosticStateStore(stateFile);

    assert.equal(store.items.size, 0);
    assert.ok(messages.some(message => /Failed to load diagnostic state/.test(message)));
});
