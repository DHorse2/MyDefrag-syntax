'use strict';

const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const { LocaleCatalogRepository } = require('../repositories/locale-catalog-repository');
const { createFixture, readJson } = require('./helpers');

test('atomic rollback removes a newly created component file', (t) => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mydefrag-locale-transaction-'));
    t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
    const repository = new LocaleCatalogRepository(rootDir);
    const relativePath = 'language/locales/fr-CA/parser.json';
    const transaction = repository.beginTransaction([{
        relativePath,
        content: '{"locale":"fr-CA","component":"parser","entries":{}}\n'
    }]);
    assert.equal(fs.existsSync(path.join(rootDir, relativePath)), true);
    transaction.rollback();
    assert.equal(fs.existsSync(path.join(rootDir, relativePath)), false);
});

test('component source participates in validation and targeted generation', (t) => {
    const rootDir = createFixture(t);
    const componentPath = path.join(rootDir, 'language/locales/zh-Hans/parser.json');
    fs.writeFileSync(componentPath, `${JSON.stringify({
        locale: 'zh-Hans',
        component: 'parser',
        entries: {
            'parser.diagnostic.unexpectedToken.message': {
                text: '意外的 {token}',
                status: 'native-review-required'
            }
        }
    }, null, 2)}\n`);
    const builder = require(path.join(rootDir, 'build/scripts/build-language.js'));
    const state = builder.loadLanguageState(rootDir);
    const validation = builder.validateLanguageState(state, rootDir);
    assert.deepEqual(validation.errors, []);
    const output = builder.buildLocaleComponentOutput(state, validation, 'zh-Hans', 'parser', rootDir);
    assert.equal(output.relativePath, 'build/language/catalogs/zh-Hans/parser.json');
    const generated = readJson(rootDir, output.relativePath);
    assert.equal(generated.entries['parser.diagnostic.unexpectedToken.message'].text, '意外的 {token}');
    assert.equal(generated.entries['parser.diagnostic.unexpectedToken.message'].fallbackLocale, null);
});

test('targeted generation preserves and durably records an unrelated generated translation', (t) => {
    const rootDir = createFixture(t);
    const builder = require(path.join(rootDir, 'build/scripts/build-language.js'));
    const state = builder.loadLanguageState(rootDir);
    const validation = builder.validateLanguageState(state, rootDir);
    const canonical = state.catalog.entries.find((entry) => (
        entry.component === 'extension'
        && !(state.localeCatalogs.am?.entries || []).some((item) => item.key === entry.key)
    ));
    const generatedPath = path.join(
        rootDir,
        'build/language/catalogs/am/extension.json'
    );
    fs.mkdirSync(path.dirname(generatedPath), { recursive: true });
    fs.writeFileSync(generatedPath, `${JSON.stringify({
        locale: 'am',
        component: 'extension',
        generatedAt: new Date(0).toISOString(),
        entries: {
            [canonical.key]: {
                text: 'TRADUCTION CONSERVÉE',
                status: 'machine-generated',
                sourceStatus: canonical.status,
                fallbackLocale: null,
                placeholders: canonical.placeholders || []
            },
            'extension.retired.translation.text': {
                text: 'TRADUCTION HISTORIQUE',
                status: 'machine-generated',
                sourceStatus: 'deprecated',
                fallbackLocale: null,
                placeholders: []
            }
        }
    }, null, 2)}\n`, 'utf8');

    builder.buildLocaleComponentOutput(
        state,
        validation,
        'am',
        'extension',
        rootDir
    );

    const generated = readJson(rootDir, 'build/language/catalogs/am/extension.json');
    const authoritative = readJson(rootDir, 'language/locales/am/extension.json');
    assert.equal(generated.entries[canonical.key].text, 'TRADUCTION CONSERVÉE');
    assert.equal(generated.entries[canonical.key].fallbackLocale, null);
    assert.equal(
        generated.entries['extension.retired.translation.text'].text,
        'TRADUCTION HISTORIQUE'
    );
    assert.deepEqual(authoritative.entries[canonical.key], {
        text: 'TRADUCTION CONSERVÉE',
        status: 'machine-generated'
    });
    assert.equal(
        Object.prototype.hasOwnProperty.call(
            authoritative.entries,
            'extension.retired.translation.text'
        ),
        false
    );
});

test('targeted generation replaces a translation with fallback only for an exact approved key', (t) => {
    const rootDir = createFixture(t);
    const builder = require(path.join(rootDir, 'build/scripts/build-language.js'));
    const state = builder.loadLanguageState(rootDir);
    const validation = builder.validateLanguageState(state, rootDir);
    const canonical = state.catalog.entries.find((entry) => (
        entry.component === 'extension'
        && !(state.localeCatalogs.yo?.entries || []).some((item) => item.key === entry.key)
    ));
    const generatedPath = path.join(
        rootDir,
        'build/language/catalogs/yo/extension.json'
    );
    fs.mkdirSync(path.dirname(generatedPath), { recursive: true });
    fs.writeFileSync(generatedPath, `${JSON.stringify({
        locale: 'yo',
        component: 'extension',
        entries: {
            [canonical.key]: {
                text: 'TRADUCTION À RETIRER',
                status: 'machine-generated',
                sourceStatus: canonical.status,
                fallbackLocale: null,
                placeholders: canonical.placeholders || []
            }
        }
    }, null, 2)}\n`, 'utf8');

    builder.buildLocaleComponentOutput(
        state,
        validation,
        'yo',
        'extension',
        rootDir,
        { allowFallbackReplacementKeys: [canonical.key] }
    );

    const generated = readJson(rootDir, 'build/language/catalogs/yo/extension.json');
    assert.equal(generated.entries[canonical.key].text, canonical.text);
    assert.equal(generated.entries[canonical.key].fallbackLocale, 'en');
    assert.equal(
        fs.existsSync(path.join(rootDir, 'language/locales/yo/extension.json')),
        false
    );
});

test('component source rejects keys owned by another component', (t) => {
    const rootDir = createFixture(t);
    const componentPath = path.join(rootDir, 'language/locales/zh-Hans/parser.json');
    fs.writeFileSync(componentPath, `${JSON.stringify({
        locale: 'zh-Hans',
        component: 'parser',
        entries: {
            'extension.command.openPreview.title': { text: '打开', status: 'draft' }
        }
    }, null, 2)}\n`);
    const builder = require(path.join(rootDir, 'build/scripts/build-language.js'));
    const validation = builder.validateLanguageState(builder.loadLanguageState(rootDir), rootDir);
    assert.ok(validation.errors.some((error) => error.includes('owned by extension')));
});

test('default component generation fills only missing values with API translations', async (t) => {
    const rootDir = createFixture(t);
    const builder = require(path.join(rootDir, 'build/scripts/build-language.js'));
    const initialState = builder.loadLanguageState(rootDir);
    const localeDocument = readJson(rootDir, 'language/locales/sw/extension.json');
    const missingKey = initialState.catalog.entries.find((entry) => (
        entry.component === 'extension'
        && (entry.placeholders || []).length === 0
        && localeDocument.entries[entry.key]
    )).key;
    delete localeDocument.entries[missingKey];
    fs.writeFileSync(
        path.join(rootDir, 'language/locales/sw/extension.json'),
        `${JSON.stringify(localeDocument, null, 2)}\n`,
        'utf8'
    );
    const state = builder.loadLanguageState(rootDir);
    const normalizationProbe = state.catalog.entries.find((entry) => entry.key === missingKey);
    normalizationProbe.text = '$(check) serverJs:connection.onInitialize: SERVER loading configuration MyDefrag (.MyDc / .MyD) https://example.com/a-b.js ${uri.toString()}';
    const requests = [];
    const translator = {
        info: () => ({ provider: 'DeepL', configured: true }),
        translateTexts: async (request) => {
            requests.push(request);
            return {
                results: request.items.map((item) => ({
                    ok: true,
                    provider: 'DeepL',
                    text: `API ${item.text}`
                }))
            };
        }
    };
    const translation = await builder.createBuildTranslationSuggestions(state, {
        translator,
        localeIds: ['sw'],
        componentId: 'extension'
    });
    const validation = builder.validateLanguageState(state, rootDir);
    assert.deepEqual(validation.errors, []);
    builder.buildLanguageOutputs(state, validation, rootDir, {
        translationSuggestions: translation.suggestions,
        translationUsage: translation.usage,
        translationMode: 'deepl'
    });
    const generated = readJson(rootDir, 'build/language/catalogs/sw/extension.json');
    const buildReport = readJson(rootDir, 'build/language/reports/language-build-report.json');

    assert.equal(translation.warnings.length, 0);
    assert.equal(requests.length, 1);
    assert.deepEqual(translation.usage, {
        apiCalls: 1,
        charactersPassed: requests[0].items.reduce((total, item) => (
            total + Array.from(item.text).length
        ), 0)
    });
    assert.deepEqual(buildReport.translation, {
        mode: 'deepl',
        deepLApiCalls: 1,
        deepLCharactersPassed: translation.usage.charactersPassed
    });
    assert.ok(requests[0].items.length > 0);
    assert.ok(requests[0].items.some((item) => (
        item.text === '$(check) server JavaScript connection.onInitialize: SERVER loading configuration My Defragmenter (.MyDc / .MyD) https://example.com/a-b.js ${uri.toString()}'
    )));
    assert.ok(requests[0].items.some((item) => item.text.includes('My Defragmenter')));
    assert.ok(requests[0].items.every((item) => !item.text.includes('MyDefrag')));
    assert.equal(
        generated.entries['extension.command.openPreview.title'].text,
        state.localeCatalogs.sw.entries.find((entry) => (
            entry.key === 'extension.command.openPreview.title'
        )).text
    );
    const generatedEntry = Object.values(generated.entries).find((entry) => entry.text.startsWith('API '));
    assert.ok(generatedEntry);
    assert.equal(generatedEntry.status, 'machine-generated');
    assert.equal(generatedEntry.fallbackLocale, null);
    const durable = readJson(rootDir, 'language/locales/sw/extension.json');
    assert.equal(durable.entries[
        Object.keys(generated.entries).find((key) => generated.entries[key] === generatedEntry)
    ].text, generatedEntry.text);
});

test('API translation failure warns, falls back, and does not fail generation', async (t) => {
    const rootDir = createFixture(t);
    const builder = require(path.join(rootDir, 'build/scripts/build-language.js'));
    const state = builder.loadLanguageState(rootDir);
    const translator = {
        info: () => ({ provider: 'DeepL', configured: true }),
        translateTexts: async () => { throw new Error('fixture API failure'); }
    };
    const translation = await builder.createBuildTranslationSuggestions(state, {
        translator,
        localeIds: ['am'],
        componentId: 'parser'
    });
    const validation = builder.validateLanguageState(state, rootDir);
    assert.deepEqual(validation.errors, []);
    builder.buildLanguageOutputs(state, validation, rootDir, {
        translationSuggestions: translation.suggestions,
        translationWarnings: translation.warnings
    });
    const generated = readJson(rootDir, 'build/language/catalogs/am/parser.json');
    const buildReport = readJson(rootDir, 'build/language/reports/language-build-report.json');
    const canonical = state.catalog.entries.find((entry) => (
        entry.key === 'parser.diagnostic.unexpectedToken.message'
    ));

    assert.equal(Object.keys(translation.suggestions).length, 0);
    assert.equal(translation.warnings.length, 1);
    assert.match(translation.warnings[0], /fixture API failure/);
    assert.equal(generated.entries[canonical.key].text, canonical.text);
    assert.equal(generated.entries[canonical.key].fallbackLocale, 'en');
    assert.ok(buildReport.validation.warnings.some((warning) => warning.includes('fixture API failure')));
    assert.equal(translation.usage.apiCalls, 1);
    assert.ok(translation.usage.charactersPassed > 0);
});

test('normalized command build bypasses DeepL and reports zero API usage', async (t) => {
    const rootDir = createFixture(t);
    const builder = require(path.join(rootDir, 'build/scripts/build-language.js'));
    let apiCalls = 0;
    const progress = [];
    const translator = {
        info: () => ({ provider: 'DeepL', configured: true }),
        translateTexts: async () => {
            apiCalls += 1;
            throw new Error('DeepL must not be called in normalized mode.');
        }
    };

    await builder.main(rootDir, {
        argv: ['build', '--UseNormalized'],
        translator,
        progress: (message) => progress.push(message)
    });

    const buildReport = readJson(rootDir, 'build/language/reports/language-build-report.json');
    assert.equal(apiCalls, 0);
    assert.deepEqual(buildReport.translation, {
        mode: 'normalized',
        deepLApiCalls: 0,
        deepLCharactersPassed: 0
    });
    assert.ok(progress.some((message) => message.includes('generating catalogs, maps, and reports')));
});

test('placeholder-invalid API output warns and is excluded from generated suggestions', async (t) => {
    const rootDir = createFixture(t);
    const builder = require(path.join(rootDir, 'build/scripts/build-language.js'));
    const state = builder.loadLanguageState(rootDir);
    const translator = {
        info: () => ({ provider: 'DeepL', configured: true }),
        translateTexts: async (request) => ({
            results: request.items.map(() => ({
                ok: true,
                provider: 'DeepL',
                text: 'API result without required placeholders'
            }))
        })
    };
    const translation = await builder.createBuildTranslationSuggestions(state, {
        translator,
        localeIds: ['am'],
        componentId: 'parser'
    });

    assert.equal(Object.keys(translation.suggestions).length, 0);
    assert.ok(translation.warnings.some((warning) => warning.includes('placeholders must be exactly token')));
});
