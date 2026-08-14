'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { tokenize } = require('./tokenizer');
const { Parser, configureParser, parseStates } = require('./parser');

const logger = {
    dbg() {},
    err() {},
    message() {},
    messageDetail() {}
};

configureParser({
    logger,
    ini: {
        severity: { Error: 1, Warning: 2, Information: 3, Hint: 4 },
        fragmentParentLevel: 4
    }
});

function createParser(text, state = parseStates.SCRIPT_UNKNOWN) {
    return new Parser(tokenize(text), text, state);
}

test('parser accepts a description statement', () => {
    const parser = createParser('Description("Weekly maintenance")');

    assert.equal(parser.parseStatements(), true);
    assert.equal(parser.atEof(), true);
    assert.deepEqual(parser.errors, []);
});

test('parser accepts a numeric setting statement', () => {
    const parser = createParser('MaxRunTime(15)');

    assert.equal(parser.parseStatements(), true);
    assert.deepEqual(parser.errors, []);
});

test('parser reports unexpected top-level statements with a precise range', () => {
    const parser = createParser('Mounted(yes)');

    assert.equal(parser.parseStatements(), false);
    assert.equal(parser.errors.length, 1);
    assert.match(parser.errors[0].message, /Unexpected statement 'mounted'/);
    assert.deepEqual(parser.errors[0].range.start, { line: 0, character: 0 });
    assert.deepEqual(parser.errors[0].range.end, { line: 0, character: 7 });
});

test('parser records missing arguments without throwing', () => {
    const parser = createParser('Description(');

    assert.equal(parser.parseStatements(), true);
    assert.deepEqual(
        parser.errors.map(error => error.message),
        ["Expected string but found ''", "Expected ) but found ''"]
    );
});

test('offsetToPos handles multiple lines', () => {
    const parser = createParser('one\ntwo\nthree');

    assert.deepEqual(parser.offsetToPos(0), { line: 0, character: 0 });
    assert.deepEqual(parser.offsetToPos(5), { line: 1, character: 1 });
    assert.deepEqual(parser.offsetToPos(8), { line: 2, character: 0 });
});

test('fragment parser recognizes a volume condition and emits a parent hint', () => {
    const parser = createParser('Mounted(yes)', parseStates.SCRIPT_FRAGMENT);

    assert.equal(parser.parseFragment(), true);
    assert.ok(parser.errors.some(error => /inside VolumeSelect/.test(error.message)));
    assert.ok(parser.errors.some(error => error.severity === 4));
});

test('fragment parser recognizes a file-action sort statement', () => {
    const parser = createParser('SortByName(Ascending)', parseStates.SCRIPT_FRAGMENT);

    assert.equal(parser.parseFragment(), true);
    assert.ok(parser.errors.some(error => /inside FileActions/.test(error.message)));
});

test('fragment parser tolerates an incomplete keyword prefix', () => {
    const parser = createParser('Vol', parseStates.SCRIPT_FRAGMENT);

    assert.equal(parser.parseFragment(), true);
    assert.equal(parser.atEof(), true);
});

test('parser trace formatting is deterministic and single-line', () => {
    const parser = createParser('');

    assert.equal(parser.formatTraceValue(['one', 'two']), 'one>two');
    assert.equal(parser.formatTraceValue({ ok: true }), '{"ok":true}');
    assert.equal(parser.formatTraceValue('one\n two'), 'one two');
    assert.equal(parser.formatTraceColumn('abcdef', 4), 'abc…');
});
