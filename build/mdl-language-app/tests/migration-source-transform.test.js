'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { extractStringCandidates } = require('../../scripts/build-language');
const {
    applyMigrationSourceTransform,
    buildMigrationSourceTransform,
    placeholderNames
} = require('../services/migration-source-transform');

test('candidate extraction adds exact locations only when requested', () => {
    const source = "const message = 'Go!';";
    assert.deepEqual(extractStringCandidates(source), [{
        line: 1,
        text: 'Go!',
        fullLine: source
    }]);

    const [located] = extractStringCandidates(source, { includeLocations: true });
    assert.equal(located.startColumn, 16);
    assert.equal(located.endColumn, 21);
    assert.equal(located.startIndex, 16);
    assert.equal(located.endIndex, 21);
    assert.equal(located.endLine, 1);
    assert.equal(located.literal, "'Go!'");
    assert.equal(located.delimiter, "'");
    assert.equal(located.rawValue, 'Go!');
    assert.equal(located.literalKind, 'single-quoted');
});

test('builds the two-line catalog transform without changing source text', () => {
    const sourceText = [
        'function showGreeting(name) {',
        '    window.showMessage(`Hello {name}`);',
        '}'
    ].join('\n');
    const result = buildMigrationSourceTransform({
        sourceText,
        line: 2,
        candidateText: 'Hello {name}',
        catalogKey: 'extension.notification.greeting.message',
        extractStringCandidates
    });

    assert.equal(result.ok, true);
    assert.equal(result.originalLine, '    window.showMessage(`Hello {name}`);');
    assert.deepEqual(result.transformedLines, [
        '    const tMessage = catalog.format("extension.notification.greeting.message", { name }).text;',
        '    window.showMessage(tMessage);'
    ]);
    assert.deepEqual(result.placeholders, ['name']);
    assert.deepEqual(result.sourceLiteral, {
        literal: '`Hello {name}`',
        literalKind: 'template',
        delimiter: '`',
        rawValue: 'Hello {name}',
        startIndex: 53,
        endIndex: 67,
        startColumn: 23,
        endColumn: 37
    });
    assert.equal(result.sourceReplacement.enabled, true);
    assert.equal(result.sourceReplacement.variableNameAvailable, true);
    assert.equal(sourceText.includes('tMessage'), false);

    const applied = applyMigrationSourceTransform(sourceText.replace(/\n/g, '\r\n'), result);
    assert.equal(applied.ok, true);
    assert.equal(applied.eol, '\r\n');
    assert.equal(applied.content, [
        'function showGreeting(name) {',
        '    const tMessage = catalog.format("extension.notification.greeting.message", { name }).text;',
        '    window.showMessage(tMessage);',
        '}'
    ].join('\r\n'));
});

test('transforms simple template identifier bindings on the selected source line', () => {
    const sourceText = [
        'async function findFileWalkingUp(dir, filePath) {',
        '    while (true) {',
        '        logger.info(null, `Next candidate: ${dir}, and ${filePath}`); // Debug only',
        '    }',
        '}',
        'function showOtherMessage() {',
        '    const tMessage = catalog.format("extension.other.message").text;',
        '    return tMessage;',
        '}'
    ].join('\n');
    const result = buildMigrationSourceTransform({
        sourceText,
        line: 3,
        candidateText: 'Next candidate: ${dir}, and ${filePath}',
        catalogKey: 'extension.debug.nextCandidate.message',
        extractStringCandidates
    });

    assert.equal(result.ok, true);
    assert.deepEqual(result.placeholders, ['dir', 'filePath']);
    assert.deepEqual(result.transformedLines, [
        '        const tMessage = catalog.format("extension.debug.nextCandidate.message", { dir, filePath }).text;',
        '        logger.info(null, tMessage); // Debug only'
    ]);
});

test('blocks ambiguous occurrences and reports an existing transform variable', () => {
    const ambiguous = buildMigrationSourceTransform({
        sourceText: "notify('Same message', 'Same message');",
        line: 1,
        candidateText: 'Same message',
        catalogKey: 'extension.notification.same.message',
        extractStringCandidates
    });
    assert.equal(ambiguous.ok, false);
    assert.match(ambiguous.error, /more than once/);

    const templateExpression = buildMigrationSourceTransform({
        sourceText: 'notify(`Hello ${formatName(name)}`);',
        line: 1,
        candidateText: 'Hello ${formatName(name)}',
        catalogKey: 'extension.notification.hello.message',
        extractStringCandidates
    });
    assert.equal(templateExpression.ok, false);
    assert.equal(templateExpression.code, 'TEMPLATE_EXPRESSION_PARSER_REQUIRED');

    const memberExpression = buildMigrationSourceTransform({
        sourceText: 'notify(`Hello ${user.name}`);',
        line: 1,
        candidateText: 'Hello ${user.name}',
        catalogKey: 'extension.notification.user.message',
        extractStringCandidates
    });
    assert.equal(memberExpression.ok, false);
    assert.equal(memberExpression.code, 'TEMPLATE_EXPRESSION_PARSER_REQUIRED');

    const existingVariable = buildMigrationSourceTransform({
        sourceText: "const tMessage = 'Earlier message';\nnotify('Later message');",
        line: 2,
        candidateText: 'Later message',
        catalogKey: 'extension.notification.later.message',
        extractStringCandidates
    });
    assert.equal(existingVariable.ok, true);
    assert.equal(existingVariable.sourceReplacement.variableNameAvailable, false);
    assert.equal(existingVariable.sourceReplacement.enabled, true);
    assert.equal(existingVariable.variableName, 'tMessage2');
    assert.match(existingVariable.sourceReplacement.reason, /tMessage2 will be used/);
    assert.deepEqual(placeholderNames('{second} {first} {second}'), ['first', 'second']);
});

test('apply rejects a source line changed after preview', () => {
    const sourceText = "notify('Current message');";
    const transform = buildMigrationSourceTransform({
        sourceText,
        line: 1,
        candidateText: 'Current message',
        catalogKey: 'extension.notification.current.message',
        extractStringCandidates
    });
    const applied = applyMigrationSourceTransform("notify('Changed message');", transform);
    assert.equal(applied.ok, false);
    assert.match(applied.error, /changed after the transform preview/);
});
