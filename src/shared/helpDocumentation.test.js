'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const {
    createHelpCommandTrust,
    createHelpCommandUri,
    readHelpPage,
    renderHelpMarkdown,
    resolveHelpFile
} = require('./helpDocumentation');

const extensionRoot = path.resolve(__dirname, '..', '..');

test('Help reader extracts title, summary, syntax, and an exact file URI', () => {
    const page = readHelpPage({ path: 'Settings/Description.md' }, extensionRoot);

    assert.equal(page.title, 'Settings - Description');
    assert.match(page.summary, /description of the script/i);
    assert.match(page.syntax, /Description\(STRING\)/);
    assert.match(page.uri, /^file:\/\/\//);
});

test('Help renderer emits a concise excerpt and open link', () => {
    const markdown = renderHelpMarkdown(
        [{ path: 'VolumeBoolean/Mounted.md' }],
        { extensionRoot }
    );

    assert.match(markdown, /VolumeBoolean \\- Mounted/);
    assert.match(markdown, /```mydfrg/);
    assert.match(markdown, /Open full MyDefrag Help/);
});

test('Help preview command URI carries the relative path and trusts only that command', () => {
    const commandUri = createHelpCommandUri('Settings/Description.md');
    const encodedArguments = commandUri.slice(commandUri.indexOf('?') + 1);

    assert.match(commandUri, /^command:mydfrg\.openHelp\?/);
    assert.deepEqual(JSON.parse(decodeURIComponent(encodedArguments)), ['Settings/Description.md']);
    assert.deepEqual(createHelpCommandTrust(), {
        enabledCommands: ['mydfrg.openHelp']
    });
});

test('Help resolver rejects paths outside the Help root', () => {
    assert.equal(resolveHelpFile(extensionRoot, '../../../package.json'), null);
});
