'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { TextDocument } = require('vscode-languageserver-textdocument');

const {
    DIAGNOSTIC_CODES,
    FIX_ALL_KIND,
    analyzeSourceLanguageDirective,
    provideSourceLanguageCodeActions
} = require('./sourceLanguageDirective');

const locales = [{ id: 'en' }, { id: 'fr-CA' }, { id: 'de' }];
const uri = 'file:///directive.MyD';

function applyEdits(text, edits) {
    const document = TextDocument.create(uri, 'mydfrg', 1, text);
    return [...edits]
        .map(edit => ({
            ...edit,
            start: document.offsetAt(edit.range.start),
            end: document.offsetAt(edit.range.end)
        }))
        .sort((left, right) => right.start - left.start)
        .reduce(
            (current, edit) => current.slice(0, edit.start) + edit.newText + current.slice(edit.end),
            text
        );
}

test('missing directive produces an idempotent document-scoped quick fix', () => {
    const text = 'Description("Example")\r\n';
    const diagnostics = analyzeSourceLanguageDirective(text, locales);
    const actions = provideSourceLanguageCodeActions({
        uri,
        text,
        contextDiagnostics: diagnostics,
        supportedLocales: locales,
        only: ['quickfix']
    });

    assert.equal(diagnostics[0].code, DIAGNOSTIC_CODES.missing);
    assert.equal(actions.length, 1);
    assert.deepEqual(Object.keys(actions[0].edit.changes), [uri]);
    const updated = applyEdits(text, actions[0].edit.changes[uri]);
    assert.equal(updated.startsWith('// @mydfrg-language en\r\n'), true);
    assert.deepEqual(analyzeSourceLanguageDirective(updated, locales), []);
});

test('runtime-safe comment forms are accepted and canonical locale case is enforced', () => {
    for (const prefix of ['//', '#', '--', 'REM']) {
        assert.deepEqual(
            analyzeSourceLanguageDirective(`${prefix} @mydfrg-language fr-CA\n`, locales),
            []
        );
    }

    const diagnostics = analyzeSourceLanguageDirective(
        '// @mydfrg-language fr-ca\n',
        locales
    );
    assert.equal(diagnostics[0].code, DIAGNOSTIC_CODES.invalidLocale);
    assert.equal(diagnostics[0].data.replacement, '// @mydfrg-language fr-CA');
});

test('old semicolon example receives a runtime-safe correction', () => {
    const text = '; @mydfrg-language fr-CA\nVolumeSelect\n';
    const diagnostics = analyzeSourceLanguageDirective(text, locales);
    const actions = provideSourceLanguageCodeActions({
        uri,
        text,
        contextDiagnostics: diagnostics,
        supportedLocales: locales,
        only: ['quickfix']
    });

    assert.equal(diagnostics[0].code, DIAGNOSTIC_CODES.invalidSyntax);
    assert.equal(actions[0].edit.changes[uri][0].newText, '// @mydfrg-language fr-CA');
});

test('directive-like text inside a MyDefrag string is not treated as a directive', () => {
    const diagnostics = analyzeSourceLanguageDirective(
        'Description("Example @mydfrg-language fr-CA")\n',
        locales
    );

    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0].code, DIAGNOSTIC_CODES.missing);
});

test('stale or client-modified diagnostics cannot produce an edit', () => {
    const staleDiagnostic = analyzeSourceLanguageDirective('', locales)[0];
    staleDiagnostic.data.replacement = '// @mydfrg-language fr-CA';

    const actions = provideSourceLanguageCodeActions({
        uri,
        text: '// @mydfrg-language en\n',
        contextDiagnostics: [staleDiagnostic],
        supportedLocales: locales,
        only: ['quickfix']
    });

    assert.deepEqual(actions, []);
});

test('fix all combines invalid and duplicate directive edits safely', () => {
    const text = [
        '; @mydfrg-language fr-ca',
        '// @mydfrg-language de',
        'Description("Example")'
    ].join('\n');
    const diagnostics = analyzeSourceLanguageDirective(text, locales);
    const actions = provideSourceLanguageCodeActions({
        uri,
        text,
        contextDiagnostics: diagnostics,
        supportedLocales: locales,
        only: ['source.fixAll']
    });

    assert.equal(actions.length, 1);
    assert.equal(actions[0].kind, FIX_ALL_KIND);
    const updated = applyEdits(text, actions[0].edit.changes[uri]);
    assert.deepEqual(analyzeSourceLanguageDirective(updated, locales), []);
    assert.equal(updated.match(/@mydfrg-language/g).length, 1);
});
