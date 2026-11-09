'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));

function contributedCommands() {
    return manifest.contributes.commands || [];
}

test('extension manifest has a loadable CommonJS entry point', () => {
    assert.equal(typeof manifest.main, 'string');
    assert.equal(fs.existsSync(path.resolve(projectRoot, manifest.main)), true);
    assert.match(manifest.engines.vscode, /^\^1\./);
});

test('VSIX packaging keeps runtime assets and excludes local build evidence', () => {
    const ignorePatterns = new Set(fs.readFileSync(
        path.join(projectRoot, '.vscodeignore'),
        'utf8'
    ).split(/\r?\n/u).filter(Boolean));

    assert.equal(ignorePatterns.has('artifacts'), true);
    assert.equal(ignorePatterns.has('.AI'), true);
    assert.equal(ignorePatterns.has('**/*.test.js'), true);
    assert.equal(ignorePatterns.has('build/mdl-locale-app'), true);
    assert.equal(ignorePatterns.has('build/language/reports'), true);
    assert.equal(ignorePatterns.has('!docs/MyDefrag Help/**'), true);
    assert.equal(ignorePatterns.has('node_modules'), false);

    for (const runtimePath of [
        'build/language/catalogs/en/extension.json',
        'docs/MyDefrag Help/language/Scripts/Macros.md',
        'node_modules/vscode-languageclient/node.js',
        'snippets/mydfrg.code-snippets',
        'syntaxes/mydfrg.tmLanguage.json'
    ]) {
        assert.equal(fs.existsSync(path.join(projectRoot, runtimePath)), true, runtimePath);
    }
});

test('manifest registers MyDefrag language identifiers and extensions', () => {
    const language = manifest.contributes.languages.find(item => item.id === 'mydfrg');

    assert.ok(language);
    assert.ok(language.extensions.some(extension => extension.toLowerCase() === '.myd'));
    assert.ok(language.extensions.some(extension => extension.toLowerCase() === '.mydc'));
    assert.equal(language.extensions.some(extension => extension.toLowerCase() === '.mydd'), false);
    assert.equal(language.extensions.some(extension => extension.toLowerCase() === '.mydcd'), false);
    assert.equal(
        fs.existsSync(path.resolve(projectRoot, language.configuration)),
        true
    );
});

test('manifest grammar paths exist and target registered languages', () => {
    const languageIds = new Set(manifest.contributes.languages.map(language => language.id));

    for (const grammar of manifest.contributes.grammars || []) {
        assert.equal(languageIds.has(grammar.language), true, grammar.language);
        assert.equal(fs.existsSync(path.resolve(projectRoot, grammar.path)), true, grammar.path);
        assert.equal(typeof grammar.scopeName, 'string');
    }
});

test('contributed command identifiers are unique and activated commands exist', () => {
    const commandIds = contributedCommands().map(command => command.command);

    assert.equal(new Set(commandIds).size, commandIds.length);
    for (const activationEvent of manifest.activationEvents || []) {
        if (!activationEvent.startsWith('onCommand:')) continue;
        const commandId = activationEvent.slice('onCommand:'.length);
        assert.equal(commandIds.includes(commandId), true, commandId);
    }
});

test('menu command references resolve to contributed commands', () => {
    const commandIds = new Set(contributedCommands().map(command => command.command));
    const submenuIds = new Set((manifest.contributes.submenus || []).map(submenu => submenu.id));

    for (const menuItems of Object.values(manifest.contributes.menus || {})) {
        for (const item of menuItems) {
            if (item.command) {
                assert.equal(commandIds.has(item.command), true, item.command);
            } else {
                assert.equal(submenuIds.has(item.submenu), true, item.submenu);
            }
        }
    }
});

test('Preview occupies one context-menu line and exposes five submenu variants', () => {
    const previewCommands = [
        'mydfrg.openPreview.raw',
        'mydfrg.openPreview.annotations',
        'mydfrg.openPreview.annotationsFileHeaders',
        'mydfrg.openPreview.annotationsLineNumbers',
        'mydfrg.openPreview.annotationsLineNumbersFileHeaders'
    ];
    const submenu = manifest.contributes.submenus.find(item => item.id === 'mydfrg.preview');
    assert.deepEqual(submenu, { id: 'mydfrg.preview', label: 'Preview' });

    for (const menuId of ['editor/title/context', 'explorer/context']) {
        const previewItems = manifest.contributes.menus[menuId].filter(
            item => item.submenu === 'mydfrg.preview'
        );

        assert.equal(previewItems.length, 1, menuId);
        assert.match(previewItems[0].when, /resourceExtname == \.MyDc/);
        assert.match(previewItems[0].when, /resourceExtname == \.MyD/);
    }

    assert.deepEqual(
        manifest.contributes.menus['mydfrg.preview'].map(item => item.command),
        previewCommands
    );
    assert.deepEqual(
        previewCommands.map(commandId =>
            contributedCommands().find(command => command.command === commandId).shortTitle
        ),
        [
            'Raw (Executable)',
            'Annotations',
            'Annotations + File Headers',
            'Annotations + Line Numbers',
            'Annotations + Line Numbers + File Headers'
        ]
    );
});

test('diagnostic severity settings accept the documented numeric and named forms', () => {
    const properties = manifest.contributes.configuration.properties;
    const names = [
        'mydfrg.referenceRelativePathLevel',
        'mydfrg.referenceContainsMacros',
        'mydfrg.referenceFileFoundLevel',
        'mydfrg.referenceFileNotFoundLevel',
        'mydfrg.fragmentParentLevel'
    ];

    for (const name of names) {
        const setting = properties[name];
        assert.ok(setting, name);
        assert.deepEqual(setting.type, ['number', 'string']);
        assert.ok(setting.enum.includes(1), name);
        assert.ok(setting.enum.includes('Error'), name);
    }
});

test('manifest contributes two stateful MyDefrag editor-aid buttons', () => {
    const properties = manifest.contributes.configuration.properties;
    assert.equal(properties['mydfrg.hoverEnabled'].default, true);
    assert.equal(properties['mydfrg.wordPredictionEnabled'].default, true);

    const editorTitleItems = manifest.contributes.menus['editor/title'];
    const toggleCommands = new Set([
        'mydfrg.hover.disable',
        'mydfrg.hover.enable',
        'mydfrg.wordPrediction.disable',
        'mydfrg.wordPrediction.enable'
    ]);
    const toggleItems = editorTitleItems.filter(item => toggleCommands.has(item.command));

    assert.equal(toggleItems.length, 4);
    assert.ok(toggleItems.every(item => item.when.includes('editorLangId == mydfrg')));
    assert.deepEqual(
        new Set(toggleItems.map(item => item.group)),
        new Set(['navigation@1', 'navigation@2'])
    );
});
