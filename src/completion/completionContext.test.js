'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
    getCompletionContext,
    getCompletionContextFromText
} = require('./completionContext');

function document(lines, languageId = 'mydfrg') {
    return {
        languageId,
        lineAt(line) {
            return { text: lines[line] };
        }
    };
}

test('completion context identifies the typed fragment and preceding keyword', () => {
    const context = getCompletionContext(
        document(['SortBy Na']),
        { line: 0, character: 9 }
    );

    assert.equal(context.typed, 'Na');
    assert.equal(context.wordStartCharacter, 7);
    assert.equal(context.precedingKeyword, 'SortBy');
    assert.equal(context.linePrefix, 'SortBy Na');
});

test('completion context detects supported line comments', () => {
    for (const prefix of ['# Mou', '// Mou', '-- Mou', 'REM Mou']) {
        const context = getCompletionContext(document([prefix]), {
            line: 0,
            character: prefix.length
        });
        assert.equal(context.isInsideComment, true, prefix);
    }
});

test('completion context detects unclosed and escaped quoted strings', () => {
    const inside = 'Description("Mou';
    const closed = 'Description("Mounted") Mou';

    assert.equal(getCompletionContext(document([inside]), {
        line: 0,
        character: inside.length
    }).isInsideString, true);
    assert.equal(getCompletionContext(document([closed]), {
        line: 0,
        character: closed.length
    }).isInsideString, false);
});

test('completion context derives volume and file block parents', () => {
    const volumeLines = ['VolumeSelect', 'Mounted(yes)', 'VolumeActions', 'Ana'];
    const fileLines = ['FileSelect', 'Name("*.log")', 'FileActions', 'Sor'];

    const volume = getCompletionContext(document(volumeLines), {
        line: 3,
        character: 3
    });
    const file = getCompletionContext(document(fileLines), {
        line: 3,
        character: 3
    });

    assert.equal(volume.parentHint, 'volume_action');
    assert.deepEqual(volume.allowedParents, ['volume_action', 'settingInline']);
    assert.equal(file.parentHint, 'file_action');
    assert.deepEqual(file.allowedParents, ['file_action', 'sort']);
});

test('completion context treats a preceding Sort keyword as sort context', () => {
    const line = 'SortBy Asc';
    const context = getCompletionContext(document([line]), {
        line: 0,
        character: line.length
    });

    assert.equal(context.parentHint, 'sort');
    assert.deepEqual(context.allowedParents, ['sort']);
});

test('plain-text completion context supports language-server documents', () => {
    const context = getCompletionContextFromText(
        'VolumeSelect\r\n    Mou',
        { line: 1, character: 7 }
    );

    assert.equal(context.typed, 'Mou');
    assert.equal(context.wordStartCharacter, 4);
    assert.equal(context.parentHint, 'volume_condition');
    assert.deepEqual(context.allowedParents, ['volume_condition']);
});
