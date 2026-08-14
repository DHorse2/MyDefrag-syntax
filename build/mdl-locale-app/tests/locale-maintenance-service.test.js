'use strict';

const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const { BuildIntegration } = require('../../mdl-language-app/services/build-integration');
const { LocaleMaintenanceService } = require('../services/locale-maintenance-service');
const { StubBuildIntegration, createFixture, readJson } = require('./helpers');

class StubTranslator {
    constructor(result) { this.result = result; this.requests = []; }
    info() { return { provider: 'DeepL', configured: true, endpoint: 'https://deepl.test', credentialSource: 'DEEPL_API_KEY' }; }
    async translateText(request) { this.requests.push(request); return this.result; }
}

test('loads locale and component selectors from authoritative registries', (t) => {
    const rootDir = createFixture(t);
    const service = new LocaleMaintenanceService(rootDir);
    const state = service.load();
    assert.equal(state.selectedLocale, 'zh-Hans');
    assert.equal(state.selectedComponent, 'extension');
    assert.ok(state.locales.some((locale) => locale.id === 'fr-CA'));
    assert.ok(state.components.some((component) => component.id === 'parser'));
    assert.equal(state.authoritativeFile, 'language/locales/zh-Hans/extension.json');
    assert.equal(state.generatedFile, 'build/language/catalogs/zh-Hans/extension.json');
});

test('loads the selected component and saves a schema-valid translation', async (t) => {
    const rootDir = createFixture(t);
    const integration = new StubBuildIntegration();
    const service = new LocaleMaintenanceService(rootDir, { buildIntegration: integration });
    service.load();
    assert.equal(service.select({ localeId: 'zh-Hans', componentId: 'parser' }).ok, true);

    const applied = service.applyTranslation({
        key: 'parser.diagnostic.unexpectedToken.message',
        text: "意外的标记“{token}”",
        status: 'native-review-required',
        notes: 'Initial translator draft.'
    });
    assert.equal(applied.ok, true);
    assert.equal(applied.state.dirty, true);
    const saved = await service.save();
    assert.equal(saved.ok, true);
    assert.deepEqual(integration.runArguments, [['build-component', 'zh-Hans', 'parser']]);
    assert.equal(readJson(rootDir, 'language/locales/zh-Hans/parser.json').entries[
        'parser.diagnostic.unexpectedToken.message'
    ].text, "意外的标记“{token}”");
});

test('loads generated API translations without hiding them or dirtying authored data', async (t) => {
    const rootDir = createFixture(t);
    const generatedDir = path.join(rootDir, 'build', 'language', 'catalogs', 'am');
    fs.mkdirSync(generatedDir, { recursive: true });
    fs.writeFileSync(path.join(generatedDir, 'extension.json'), `${JSON.stringify({
        locale: 'am',
        component: 'extension',
        generatedAt: new Date(0).toISOString(),
        entries: {
            'extension.command.openSettings.title': {
                text: 'MyDefrag : Ouvrir les paramètres',
                status: 'machine-generated',
                sourceStatus: 'approved',
                fallbackLocale: null,
                placeholders: []
            },
            'extension.product.displayName': {
                text: 'MyDefrag Script (.MyDc / .MyD)',
                status: 'draft',
                sourceStatus: 'approved',
                fallbackLocale: 'en',
                placeholders: []
            }
        }
    }, null, 2)}\n`, 'utf8');

    const integration = new StubBuildIntegration();
    const service = new LocaleMaintenanceService(rootDir, { buildIntegration: integration });
    service.load();
    const selected = service.select({ localeId: 'am', componentId: 'extension' });
    assert.equal(selected.ok, true);
    const generated = selected.state.rows.find((row) => (
        row.key === 'extension.command.openSettings.title'
    ));
    const fallback = selected.state.rows.find((row) => row.key === 'extension.product.displayName');

    assert.equal(selected.state.dirty, false);
    assert.equal(generated.translationText, 'MyDefrag : Ouvrir les paramètres');
    assert.equal(generated.translationStatus, 'machine-generated');
    assert.equal(generated.translated, true);
    assert.equal(generated.authored, false);
    assert.equal(generated.translationOrigin, 'generated');
    assert.equal(fallback.translationText, '');
    assert.equal(fallback.translated, false);
    assert.equal(fallback.translationOrigin, 'fallback');
    assert.equal(selected.state.completeness.translated, 1);
    assert.deepEqual(service.previewSave().authoritativeFiles, []);
    assert.equal(service.removeTranslation(generated.key).ok, false);

    const applied = service.applyTranslation({
        key: generated.key,
        text: generated.translationText,
        status: 'native-review-required',
        notes: 'Review the generated translation.'
    });
    assert.equal(applied.ok, true);
    const promoted = applied.state.rows.find((row) => row.key === generated.key);
    assert.equal(promoted.authored, true);
    assert.equal(promoted.translationOrigin, 'authored');
    assert.equal(applied.state.dirty, true);
    assert.equal((await service.save()).ok, true);
    assert.equal(readJson(rootDir, 'language/locales/am/extension.json').entries[
        generated.key
    ].text, generated.translationText);
});

test('authored locale entries take precedence over generated translations', (t) => {
    const rootDir = createFixture(t);
    const authoredDir = path.join(rootDir, 'language', 'locales', 'fr-CA');
    const generatedDir = path.join(rootDir, 'build', 'language', 'catalogs', 'fr-CA');
    fs.mkdirSync(authoredDir, { recursive: true });
    fs.mkdirSync(generatedDir, { recursive: true });
    fs.writeFileSync(path.join(authoredDir, 'extension.json'), `${JSON.stringify({
        locale: 'fr-CA',
        component: 'extension',
        entries: {
            'extension.command.openSettings.title': {
                text: 'Paramètres révisés',
                status: 'reviewed'
            }
        }
    }, null, 2)}\n`, 'utf8');
    fs.writeFileSync(path.join(generatedDir, 'extension.json'), `${JSON.stringify({
        locale: 'fr-CA',
        component: 'extension',
        entries: {
            'extension.command.openSettings.title': {
                text: 'Valeur générée',
                status: 'machine-generated',
                fallbackLocale: null
            }
        }
    }, null, 2)}\n`, 'utf8');

    const service = new LocaleMaintenanceService(rootDir);
    service.load();
    const state = service.select({ localeId: 'fr-CA', componentId: 'extension' }).state;
    const row = state.rows.find((item) => item.key === 'extension.command.openSettings.title');
    assert.equal(row.translationText, 'Paramètres révisés');
    assert.equal(row.translationStatus, 'reviewed');
    assert.equal(row.authored, true);
    assert.equal(row.translationOrigin, 'authored');
});

test('rejects unknown selections and placeholder mismatches', (t) => {
    const rootDir = createFixture(t);
    const service = new LocaleMaintenanceService(rootDir);
    service.load();
    assert.equal(service.select({ localeId: 'xx', componentId: 'parser' }).ok, false);
    assert.equal(service.select({ localeId: 'zh-Hans', componentId: 'parser' }).ok, true);
    const result = service.applyTranslation({
        key: 'parser.diagnostic.expectedToken.message',
        text: '缺少 expected placeholder',
        status: 'draft'
    });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.source === 'placeholder'));
});

test('tracks, reverts, and protects dirty selection changes', (t) => {
    const rootDir = createFixture(t);
    const service = new LocaleMaintenanceService(rootDir);
    service.load();
    service.applyTranslation({
        key: 'extension.command.openPreview.title',
        text: '预览窗口',
        status: 'draft'
    });
    assert.equal(service.hasChanges(), true);
    assert.equal(service.select({ localeId: 'fr-CA', componentId: 'extension' }).stage, 'unsaved');
    assert.equal(service.revert().dirty, false);
    assert.equal(service.select({ localeId: 'fr-CA', componentId: 'extension' }).ok, true);
});

test('first component save migrates legacy entries and preserves unrelated fields', async (t) => {
    const rootDir = createFixture(t);
    const service = new LocaleMaintenanceService(rootDir, {
        buildIntegration: new StubBuildIntegration()
    });
    service.load();
    const applied = service.applyTranslation({
        key: 'extension.command.openPreview.title',
        text: '打开预览窗口',
        status: 'native-review-required'
    });
    assert.equal(applied.ok, true);
    assert.equal((await service.save()).ok, true);

    const component = readJson(rootDir, 'language/locales/zh-Hans/extension.json');
    assert.equal(component.entries['extension.command.openPreview.title'].text, '打开预览窗口');
    assert.ok(component.entries['extension.command.openSettings.title']);
    const aggregate = readJson(rootDir, 'language/locales/zh-Hans/catalogOverrides.sample.json');
    assert.deepEqual(aggregate.entries.map((entry) => entry.key), [
        'diagnosticExplorer.message.noCurrentDiagnostic.info'
    ]);
    assert.equal(aggregate.keywords.length, 3);
});

test('build failure rolls back the authoritative component file', async (t) => {
    const rootDir = createFixture(t);
    const before = fs.readFileSync(path.join(rootDir, 'language/locales/zh-Hans/parser.json'), 'utf8');
    const integration = new StubBuildIntegration({
        ok: false,
        status: 1,
        signal: null,
        stdout: '',
        stderr: 'fixture failure'
    });
    const service = new LocaleMaintenanceService(rootDir, { buildIntegration: integration });
    service.load();
    service.select({ localeId: 'zh-Hans', componentId: 'parser' });
    service.applyTranslation({
        key: 'parser.diagnostic.unexpectedToken.message',
        text: '意外的 {token}',
        status: 'draft'
    });
    const result = await service.save();
    assert.equal(result.ok, false);
    assert.equal(result.rolledBack, true);
    assert.equal(integration.restoreCount, 1);
    assert.equal(fs.readFileSync(path.join(rootDir, 'language/locales/zh-Hans/parser.json'), 'utf8'), before);
});

test('save awaits an asynchronous component build before committing', async (t) => {
    const rootDir = createFixture(t);
    let finishBuild;
    const integration = new StubBuildIntegration();
    integration.run = (args) => {
        integration.runArguments.push(args);
        return new Promise((resolve) => { finishBuild = resolve; });
    };
    const service = new LocaleMaintenanceService(rootDir, { buildIntegration: integration });
    service.load();
    service.select({ localeId: 'zh-Hans', componentId: 'parser' });
    service.applyTranslation({
        key: 'parser.diagnostic.unexpectedToken.message',
        text: '异步 {token}',
        status: 'draft'
    });

    let completed = false;
    const save = service.save().then((result) => {
        completed = true;
        return result;
    });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(completed, false);
    finishBuild({ ok: true, status: 0, signal: null, stdout: 'done\n', stderr: '' });

    const result = await save;
    assert.equal(result.ok, true);
    assert.equal(completed, true);
    assert.deepEqual(integration.runArguments, [['build-component', 'zh-Hans', 'parser']]);
});

test('save completes through the real component subprocess and streams progress', async (t) => {
    const rootDir = createFixture(t);
    const integration = new BuildIntegration(rootDir, {
        spawn: (executable, args, options) => spawn(executable, args, {
            ...options,
            env: { ...options.env, DeeplApi: '', DEEPL_API_KEY: '' }
        })
    });
    const service = new LocaleMaintenanceService(rootDir, { buildIntegration: integration });
    service.load();
    service.select({ localeId: 'zh-Hans', componentId: 'parser' });
    service.applyTranslation({
        key: 'parser.diagnostic.unexpectedToken.message',
        text: '进程 {token}',
        status: 'draft'
    });
    const progress = [];

    const result = await service.save((update) => progress.push(update));

    assert.equal(result.ok, true);
    assert.match(result.build.stdout, /Language component build complete: zh-Hans\/parser/);
    assert.ok(progress.some((update) => update.phase === 'build' && update.cancellable));
    assert.ok(progress.some((update) => update.phase === 'build-output' && update.stream === 'stdout'));
    assert.ok(progress.some((update) => update.phase === 'commit'));
});

test('saving one authored value preserves and persists an unrelated generated translation', async (t) => {
    const rootDir = createFixture(t);
    const builder = require(path.join(rootDir, 'build/scripts/build-language.js'));
    const initialState = builder.loadLanguageState(rootDir);
    const canonicalEntries = initialState.catalog.entries.filter((entry) => entry.component === 'extension');
    const generatedOnly = canonicalEntries.find((entry) => (
        entry.key !== 'extension.command.openPreview.title'
        &&
        !(initialState.localeCatalogs.am?.entries || []).some((item) => item.key === entry.key)
    ));
    const generatedDir = path.join(rootDir, 'build/language/catalogs/am');
    fs.mkdirSync(generatedDir, { recursive: true });
    fs.writeFileSync(path.join(generatedDir, 'extension.json'), `${JSON.stringify({
        locale: 'am',
        component: 'extension',
        generatedAt: new Date(0).toISOString(),
        entries: {
            [generatedOnly.key]: {
                text: '必须保留的生成翻译',
                status: 'machine-generated',
                sourceStatus: generatedOnly.status,
                fallbackLocale: null,
                placeholders: generatedOnly.placeholders || []
            }
        }
    }, null, 2)}\n`, 'utf8');
    const integration = new BuildIntegration(rootDir, {
        spawn: (executable, args, options) => spawn(executable, args, {
            ...options,
            env: { ...options.env, DeeplApi: '', DEEPL_API_KEY: '' }
        })
    });
    const service = new LocaleMaintenanceService(rootDir, { buildIntegration: integration });
    service.load();
    service.select({ localeId: 'am', componentId: 'extension' });
    service.applyTranslation({
        key: 'extension.command.openPreview.title',
        text: '保存预览',
        status: 'reviewed'
    });

    const result = await service.save();

    assert.equal(result.ok, true);
    const generated = readJson(rootDir, 'build/language/catalogs/am/extension.json');
    const authoritative = readJson(rootDir, 'language/locales/am/extension.json');
    assert.equal(generated.entries[generatedOnly.key].text, '必须保留的生成翻译');
    assert.equal(generated.entries[generatedOnly.key].fallbackLocale, null);
    assert.deepEqual(authoritative.entries[generatedOnly.key], {
        text: '必须保留的生成翻译',
        status: 'machine-generated'
    });
});

test('rebuilding reloads a preserved generated translation as durable authored state', async (t) => {
    const rootDir = createFixture(t);
    const builder = require(path.join(rootDir, 'build/scripts/build-language.js'));
    const componentPath = path.join(rootDir, 'language/locales/fr-CA/extension.json');
    const componentDocument = readJson(rootDir, 'language/locales/fr-CA/extension.json');
    const generatedOnlyKey = Object.keys(componentDocument.entries)[0];
    delete componentDocument.entries[generatedOnlyKey];
    fs.writeFileSync(componentPath, `${JSON.stringify(componentDocument, null, 2)}\n`, 'utf8');
    const initialState = builder.loadLanguageState(rootDir);
    const canonical = initialState.catalog.entries.find((entry) => entry.key === generatedOnlyKey);
    const generatedDir = path.join(rootDir, 'build/language/catalogs/fr-CA');
    fs.mkdirSync(generatedDir, { recursive: true });
    fs.writeFileSync(path.join(generatedDir, 'extension.json'), `${JSON.stringify({
        locale: 'fr-CA',
        component: 'extension',
        generatedAt: new Date(0).toISOString(),
        entries: {
            [canonical.key]: {
                text: 'TRADUCTION DURABLE',
                status: 'machine-generated',
                sourceStatus: canonical.status,
                fallbackLocale: null,
                placeholders: canonical.placeholders || []
            }
        }
    }, null, 2)}\n`, 'utf8');
    const integration = new BuildIntegration(rootDir, {
        spawn: (executable, args, options) => spawn(executable, args, {
            ...options,
            env: { ...options.env, DeeplApi: '', DEEPL_API_KEY: '' }
        })
    });
    const service = new LocaleMaintenanceService(rootDir, { buildIntegration: integration });
    service.load();
    service.select({ localeId: 'fr-CA', componentId: 'extension' });

    const result = await service.rebuild();

    assert.equal(result.ok, true);
    const row = result.state.rows.find((item) => item.key === canonical.key);
    assert.equal(row.translationText, 'TRADUCTION DURABLE');
    assert.equal(row.authored, true);
    assert.equal(row.translationOrigin, 'authored');
    assert.deepEqual(
        readJson(rootDir, 'language/locales/fr-CA/extension.json').entries[canonical.key],
        { text: 'TRADUCTION DURABLE', status: 'machine-generated' }
    );
});

test('English canonical text is read-only in the locale application', (t) => {
    const rootDir = createFixture(t);
    const service = new LocaleMaintenanceService(rootDir);
    service.load();
    assert.equal(service.select({ localeId: 'en', componentId: 'parser' }).ok, true);
    const result = service.applyTranslation({
        key: 'parser.diagnostic.unexpectedToken.message',
        text: 'Changed {token}',
        status: 'approved'
    });
    assert.equal(result.ok, false);
    assert.equal(service.snapshot().readOnly, true);
});

test('API translation uses Current locale value without dirtying the draft', async (t) => {
    const rootDir = createFixture(t);
    const translator = new StubTranslator({
        ok: true,
        provider: 'DeepL',
        text: 'Ouvrir l’aperçu',
        targetLanguage: 'FR-CA'
    });
    const service = new LocaleMaintenanceService(rootDir, { translator });
    service.load();
    service.select({ localeId: 'fr-CA', componentId: 'extension' });
    const before = service.snapshot().rows.find((row) => row.key === 'extension.command.openPreview.title');

    assert.equal(before.normalizedText, 'Open Preview');
    const suggested = await service.requestApiTranslation({
        key: before.key,
        text: before.normalizedText
    });
    const suggestedRow = suggested.state.rows.find((row) => row.key === before.key);
    assert.equal(suggested.ok, true);
    assert.equal(suggested.sourceText, before.normalizedText);
    assert.equal(suggested.translationText, 'Ouvrir l’aperçu');
    assert.deepEqual(suggested.state.apiTranslation, { configured: true });
    assert.equal(suggested.state.dirty, false);
    assert.equal(suggestedRow.translationText, before.translationText);
    assert.equal(suggestedRow.apiTranslationText, 'Ouvrir l’aperçu');
    assert.equal(translator.requests[0].text, before.normalizedText);
    assert.deepEqual(translator.requests[0].placeholders, []);
    assert.equal(Object.prototype.hasOwnProperty.call(translator.requests[0], 'key'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(translator.requests[0], 'component'), false);

    const replaced = service.replaceWithApiTranslation({ key: before.key });
    const replacedRow = replaced.state.rows.find((row) => row.key === before.key);
    assert.equal(replaced.ok, true);
    assert.equal(replaced.state.dirty, true);
    assert.equal(replacedRow.translationText, 'Ouvrir l’aperçu');
    assert.equal(replacedRow.translationStatus, 'machine-generated');
});

test('API failure leaves the locale draft unchanged', async (t) => {
    const rootDir = createFixture(t);
    const translator = new StubTranslator({ ok: false, error: 'fixture API failure' });
    const service = new LocaleMaintenanceService(rootDir, { translator });
    service.load();
    service.select({ localeId: 'fr-CA', componentId: 'parser' });
    const before = service.snapshot();
    const row = before.rows.find((item) => item.key === 'parser.diagnostic.unexpectedToken.message');
    const result = await service.requestApiTranslation({
        key: row.key,
        text: row.sourceText
    });
    assert.equal(result.ok, false);
    assert.equal(result.error, 'fixture API failure');
    assert.equal(result.state.dirty, false);
    assert.deepEqual(result.state.rows, before.rows);
});

test('replacement revalidates placeholders before changing the draft', async (t) => {
    const rootDir = createFixture(t);
    const translator = new StubTranslator({
        ok: true,
        provider: 'DeepL',
        text: 'Jeton inattendu sans espace réservé',
        targetLanguage: 'FR-CA'
    });
    const service = new LocaleMaintenanceService(rootDir, { translator });
    service.load();
    service.select({ localeId: 'fr-CA', componentId: 'parser' });
    const key = 'parser.diagnostic.unexpectedToken.message';
    const sourceText = service.snapshot().rows.find((row) => row.key === key).sourceText;
    assert.equal((await service.requestApiTranslation({ key, text: sourceText })).ok, true);
    const result = service.replaceWithApiTranslation({ key });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.source === 'placeholder'));
    assert.equal(service.snapshot().dirty, false);
});

test('API translation rejects an empty Current locale value without making a request', async (t) => {
    const rootDir = createFixture(t);
    const translator = new StubTranslator({ ok: true, text: 'unused' });
    const service = new LocaleMaintenanceService(rootDir, { translator });
    service.load();
    service.select({ localeId: 'fr-CA', componentId: 'extension' });

    const result = await service.requestApiTranslation({
        key: 'extension.command.openPreview.title',
        text: '   '
    });

    assert.equal(result.ok, false);
    assert.match(result.error, /Current locale value/);
    assert.equal(translator.requests.length, 0);
    assert.equal(result.state.dirty, false);
});
