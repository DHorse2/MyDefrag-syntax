'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { TT, tokenize } = require('./tokenizer');

function withoutEof(text) {
    return tokenize(text).filter(token => token.type !== TT.EOF);
}

test('tokenize returns EOF for empty input', () => {
    assert.deepEqual(tokenize(''), [
        { type: TT.EOF, value: '', start: 0, end: 0 }
    ]);
});

test('tokenize classifies keywords case-insensitively and preserves offsets', () => {
    const [token] = withoutEof('  DeScRiPtIoN');

    assert.equal(token.type, TT.KEYWORD);
    assert.equal(token.value, 'description');
    assert.equal(token.start, 2);
    assert.equal(token.end, 13);
});

test('tokenize emits identifiers and predefined identifiers', () => {
    const tokens = withoutEof('customName VolumeSize');

    assert.equal(tokens[0].type, TT.IDENT);
    assert.equal(tokens[0].value, 'customname');
    assert.equal(tokens[1].type, TT.IDENT_PREDEF);
    assert.equal(tokens[1].value, 'volumesize');
});

test('tokenize recognizes include macros and predefined macro identifiers', () => {
    const tokens = withoutEof('!include "Common.MyD"! !VolumeSize!');

    assert.deepEqual(tokens.map(token => token.type), [TT.MACRO, TT.IDENT_PREDEF]);
    assert.equal(tokens[0].value, '!include "Common.MyD"!');
    assert.equal(tokens[1].value, 'VolumeSize');
});

test('tokenize keeps a macro inside a quoted string as one string token', () => {
    const [token] = withoutEof('"before !Name! after"');

    assert.equal(token.type, TT.STRING);
    assert.equal(token.value, '"before !Name! after"');
});

test('tokenize skips all supported comment forms', () => {
    const text = [
        '// one',
        '# two',
        '-- three',
        'REM four',
        '/* five */ Description("kept")'
    ].join('\n');
    const tokens = withoutEof(text);

    assert.deepEqual(tokens.map(token => token.type), [
        TT.KEYWORD,
        TT.LPAREN,
        TT.STRING,
        TT.RPAREN
    ]);
});

test('tokenize recognizes numeric and punctuation tokens', () => {
    const tokens = withoutEof('12 3.5d-2 (),/-:+*%| || & &&');

    assert.deepEqual(tokens.map(token => token.type), [
        TT.NUMBER,
        TT.NUMBER,
        TT.LPAREN,
        TT.RPAREN,
        TT.COMMA,
        TT.SLASH,
        TT.DASH,
        TT.COLON,
        TT.PLUS,
        TT.STAR,
        TT.PERCENT,
        TT.PIPE,
        TT.DPIPE,
        TT.AMP,
        TT.DAMP
    ]);
    assert.equal(tokens[1].value, '3.5d-2');
});

test('tokenize skips unknown characters without losing following tokens', () => {
    const tokens = withoutEof('@ Description');

    assert.equal(tokens.length, 1);
    assert.equal(tokens[0].value, 'description');
});
