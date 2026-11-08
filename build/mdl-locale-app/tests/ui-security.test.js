'use strict';

const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const { CHANNELS, EVENTS } = require('../shared/contracts');
const { registerIpcHandlers } = require('../main/ipc-handlers');
const { createWindowOptions } = require('../main/window-options');
const { projectRootArgument } = require('../main/project-root');
const {
    matchesSearch,
    mayChangeSelection,
    sourceValue,
    translationSourceMatches
} = require('../renderer/ui-state');

const APP_ROOT = path.resolve(__dirname, '..');

test('renderer is isolated, sandboxed, and restricted by CSP', () => {
    const options = createWindowOptions(APP_ROOT);
    assert.equal(options.webPreferences.nodeIntegration, false);
    assert.equal(options.webPreferences.contextIsolation, true);
    assert.equal(options.webPreferences.sandbox, true);
    assert.equal(options.webPreferences.webviewTag, false);
    const html = fs.readFileSync(path.join(APP_ROOT, 'renderer/index.html'), 'utf8');
    const styles = fs.readFileSync(path.join(APP_ROOT, 'renderer/styles.css'), 'utf8');
    const packaging = fs.readFileSync(path.join(APP_ROOT, 'electron-builder.yml'), 'utf8');
    assert.match(html, /Content-Security-Policy/);
    assert.match(html, /connect-src 'none'/);
    assert.match(html, /id="locale-select"/);
    assert.match(html, /id="component-select"/);
    assert.match(html, /id="api-translation-text"/);
    assert.match(html, /id="translation-comparison"/);
    assert.match(html, /\.\.\/\.\.\/shared\/renderer-splitter\.css/);
    assert.match(html, /\.\.\/\.\.\/shared\/renderer-splitter\.js/);
    assert.match(html, /\.\.\/\.\.\/shared\/renderer-table-columns\.css/);
    assert.match(html, /\.\.\/\.\.\/shared\/renderer-table-columns\.js/);
    assert.match(html, /id="request-api-button"/);
    assert.match(html, /id="use-normalized"[^>]*checked/);
    assert.match(html, /id="use-deepl-api"/);
    assert.match(html, /id="use-google-translate-api"/);
    assert.ok(html.indexOf('id="use-deepl-api"') < html.indexOf('id="use-google-translate-api"'));
    assert.match(html, /Leave both unchecked to build without a translator API/);
    assert.match(html, /id="normalized-text"/);
    assert.match(html, /id="use-normalized-button"/);
    assert.doesNotMatch(html, /id="replace-api-button"/);
    assert.match(html, /class="header-identity"/);
    assert.match(html, /class="editor-form-grid"/);
    assert.match(html, /class="editor-details"/);
    assert.match(html, /class="editor-controls"/);
    assert.match(html, /id="progress-dialog"/);
    assert.match(html, /id="progress-elapsed"/);
    assert.match(html, /id="progress-output"/);
    assert.match(html, /id="cancel-build-button"/);
    const renderer = fs.readFileSync(path.join(APP_ROOT, 'renderer/app.js'), 'utf8');
    assert.match(renderer, /api\?\.onProgress\?\.\(handleProgress\)/);
    assert.match(renderer, /runProgressOperation\('save'/);
    assert.match(renderer, /runProgressOperation\(\s*'rebuild'/);
    assert.match(renderer, /api\.cancelBuild\(\)/);
    assert.match(renderer, /const selectedSource = sourceValue\(row, useNormalizedEnglish\)/);
    assert.match(renderer, /useNormalized: useNormalizedEnglish/);
    assert.match(renderer, /translationProvider/);
    assert.match(renderer, /setTranslationProvider\(deepLApiCheckbox\.checked \? 'deepl' : 'none'\)/);
    assert.match(renderer, /setTranslationProvider\(googleTranslateApiCheckbox\.checked \? 'google' : 'none'\)/);
    assert.match(renderer, /api\.save\(buildRequest\(\)\)/);
    assert.match(renderer, /api\.rebuild\(buildRequest\(\)\)/);
    assert.match(renderer, /!translationSourceMatches\(selectedSource, result\.sourceText\)/);
    assert.match(renderer, /useNormalizedCheckbox\.addEventListener\('change'/);
    assert.match(renderer, /translation-text'\)\.value = result\.translationText/);
    assert.match(renderer, /key: 'locale-catalog-editor'/);
    assert.match(renderer, /key: 'locale-current-api'/);
    assert.match(renderer, /key: 'locale-component-catalog'/);
    assert.match(renderer, /tableColumns\.attach\(catalogTable/);
    assert.match(renderer, /orientation: 'rows'/);
    assert.match(styles, /\.workspace\.resizable-split \{ gap: 0; \}/);
    assert.match(styles, /\.translation-comparison \{ height: 19rem;/);
    assert.match(packaging, /build\/shared\/renderer-splitter\.js/);
    assert.match(packaging, /build\/shared\/renderer-splitter\.css/);
    assert.match(packaging, /build\/shared\/renderer-table-columns\.js/);
    assert.match(packaging, /build\/shared\/renderer-table-columns\.css/);
    assert.doesNotMatch(renderer, /beforeunload/);
});

test('preload exposes fixed invokes and one narrow progress subscription', () => {
    const source = fs.readFileSync(path.join(APP_ROOT, 'preload/preload.js'), 'utf8');
    assert.doesNotMatch(source, /ipcRenderer\.send\s*\(/);
    assert.equal((source.match(/ipcRenderer\.on\s*\(/g) || []).length, 1);
    assert.match(source, /ipcRenderer\.removeListener\(EVENTS\.progress, handler\)/);
    assert.doesNotMatch(source, /require\(['"]\.\.?\//);
    for (const channel of Object.values(CHANNELS)) { assert.ok(source.includes(`'${channel}'`)); }
    for (const event of Object.values(EVENTS)) { assert.ok(source.includes(`'${event}'`)); }
    assert.doesNotMatch(source, /DEEPL_API_KEY/);
    assert.doesNotMatch(source, /GOOGLE_TRANSLATE_API_KEY/);
    assert.match(source, /save: \(request\) => ipcRenderer\.invoke\(CHANNELS\.save, request\)/);
    assert.match(source, /rebuild: \(request\) => ipcRenderer\.invoke\(CHANNELS\.rebuild, request\)/);
});

test('UI helpers search structured rows and protect dirty selection changes', () => {
    assert.equal(matchesSearch({ key: 'parser.test', sourceText: 'Expected token' }, 'expected'), true);
    assert.equal(matchesSearch({ key: 'parser.test' }, 'server'), false);
    assert.equal(mayChangeSelection(false, () => false), true);
    assert.equal(mayChangeSelection(true, () => false), false);
    const row = { sourceText: 'MyDefrag', normalizedText: 'My Storage Management' };
    assert.equal(sourceValue(row), 'MyDefrag');
    assert.equal(sourceValue(row, true), 'My Storage Management');
    assert.equal(sourceValue(null, true), '');
    assert.equal(translationSourceMatches('My Storage Management', 'My Storage Management'), true);
    assert.equal(translationSourceMatches('My Storage Management', 'Prior value'), false);
    assert.equal(translationSourceMatches('  Open Preview  ', 'Open Preview'), true);
});

test('project root parser supports documented argument forms', () => {
    assert.equal(projectRootArgument(['app', '--project-root=D:\\Repo']), 'D:\\Repo');
    assert.equal(projectRootArgument(['app', '--project-root', 'D:\\Repo']), 'D:\\Repo');
});

test('save and rebuild IPC stream progress and expose cancellation', async () => {
    const handlers = new Map();
    const progressEvents = [];
    let closed = 0;
    let apiTranslationRequest = null;
    let saveRequest = null;
    let rebuildRequest = null;
    const service = {
        load: () => ({}),
        select: () => ({}),
        requestApiTranslation: (request) => {
            apiTranslationRequest = request;
            return { ok: true };
        },
        replaceWithApiTranslation: () => ({}),
        applyTranslation: () => ({}),
        removeTranslation: () => ({}),
        revert: () => ({}),
        validate: () => ({ ok: true }),
        previewSave: () => ({ validation: { ok: true }, authoritativeFiles: [] }),
        save: async (request, progress) => {
            saveRequest = request;
            progress({ phase: 'build', message: 'Saving', cancellable: true });
            return { ok: true };
        },
        rebuild: async (request, progress) => {
            rebuildRequest = request;
            progress({ phase: 'snapshot', message: 'Rebuilding', cancellable: false });
            return { ok: true };
        },
        cancelBuild: () => ({ ok: true, cancelled: true }),
        hasChanges: () => false,
        reload: () => ({})
    };
    registerIpcHandlers({
        ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) },
        dialog: { showMessageBox: async () => ({ response: 1 }) },
        service,
        getWindow: () => null,
        closeApplication: async () => { closed += 1; }
    });
    const event = {
        sender: {
            isDestroyed: () => false,
            send: (channel, payload) => progressEvents.push({ channel, payload })
        }
    };

    assert.deepEqual(await handlers.get(CHANNELS.requestApiTranslation)(event, {
        key: 'extension.command.openPreview.title',
        translationProvider: 'google',
        useNormalized: true
    }), { ok: true });
    assert.deepEqual(apiTranslationRequest, {
        key: 'extension.command.openPreview.title',
        translationProvider: 'google',
        useNormalized: true
    });
    assert.deepEqual(await handlers.get(CHANNELS.save)(event, { translationProvider: 'google' }), { ok: true });
    assert.deepEqual(await handlers.get(CHANNELS.rebuild)(event, { translationProvider: 'none' }), { ok: true });
    assert.deepEqual(saveRequest, { translationProvider: 'google' });
    assert.deepEqual(rebuildRequest, { translationProvider: 'none' });
    assert.deepEqual(await handlers.get(CHANNELS.cancelBuild)(event), { ok: true, cancelled: true });
    assert.deepEqual(await handlers.get(CHANNELS.exit)(event), { ok: true });
    assert.equal(closed, 1);
    assert.deepEqual(progressEvents, [{
        channel: EVENTS.progress,
        payload: { operation: 'save', phase: 'build', message: 'Saving', cancellable: true }
    }, {
        channel: EVENTS.progress,
        payload: { operation: 'rebuild', phase: 'snapshot', message: 'Rebuilding', cancellable: false }
    }]);
});
