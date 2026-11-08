'use strict';

const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const { LocaleCatalogRepository } = require('../repositories/locale-catalog-repository');
const { createFixture, readJson } = require('./helpers');

test('build command parser accepts translator and English-source choices independently', (t) => {
    const rootDir = createFixture(t);
    const builder = require(path.join(rootDir, 'build/scripts/build-language.js'));
    assert.equal(builder.parseCommandLine(['build']).translationProvider, 'deepl');
    assert.equal(builder.parseCommandLine(['build']).useNormalized, true);
    assert.equal(
        builder.parseCommandLine(['build', '--TranslationProvider=google']).translationProvider,
        'google'
    );
    assert.equal(
        builder.parseCommandLine(['build-component', 'fr', 'parser', '--TranslationProvider', 'none'])
            .translationProvider,
        'none'
    );
    assert.equal(builder.parseCommandLine(['build', '--UseCanonical']).useNormalized, false);
    assert.equal(builder.parseCommandLine(['build', '--UseNormalized']).useNormalized, true);
    assert.throws(
        () => builder.parseCommandLine(['build', '--TranslationProvider=unknown']),
        /Expected deepl, google, or none/u
    );
});

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

test('fallback refresh changes generated English fallback text without replacing translations', (t) => {
    const rootDir = createFixture(t);
    const builder = require(path.join(rootDir, 'build/scripts/build-language.js'));
    const existing = {
        locale: 'fr',
        component: 'extension',
        entries: {
            fallback: { text: 'MyDefrag', status: 'draft', fallbackLocale: 'en', placeholders: [] },
            translated: { text: 'Traduit', status: 'reviewed', fallbackLocale: null, placeholders: [] }
        }
    };
    const generated = {
        locale: 'fr',
        component: 'extension',
        entries: {
            fallback: { text: 'My Storage Management', status: 'draft', fallbackLocale: 'en', placeholders: [] },
            translated: { text: 'Canonical replacement', status: 'draft', fallbackLocale: 'en', placeholders: [] }
        }
    };

    const merged = builder.mergeMissingLocaleComponentEntries(existing, generated);

    assert.deepEqual(merged.refreshedFallbackKeys, ['fallback']);
    assert.equal(merged.catalog.entries.fallback.text, 'My Storage Management');
    assert.equal(merged.catalog.entries.translated.text, 'Traduit');
    assert.equal(merged.catalog.entries.translated.fallbackLocale, null);
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
    let state = builder.loadLanguageState(rootDir);
    const canonical = state.catalog.entries.find((entry) => entry.component === 'extension');
    const authoredPath = path.join(rootDir, 'language/locales/am/extension.json');
    const authored = readJson(rootDir, 'language/locales/am/extension.json');
    delete authored.entries[canonical.key];
    fs.writeFileSync(authoredPath, `${JSON.stringify(authored, null, 2)}\n`, 'utf8');
    state = builder.loadLanguageState(rootDir);
    const validation = builder.validateLanguageState(state, rootDir);
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
    let state = builder.loadLanguageState(rootDir);
    const canonical = state.catalog.entries.find((entry) => entry.component === 'extension');
    const authoredPath = path.join(rootDir, 'language/locales/yo/extension.json');
    const authored = readJson(rootDir, 'language/locales/yo/extension.json');
    delete authored.entries[canonical.key];
    fs.writeFileSync(authoredPath, `${JSON.stringify(authored, null, 2)}\n`, 'utf8');
    state = builder.loadLanguageState(rootDir);
    const validation = builder.validateLanguageState(state, rootDir);
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
    const authoritative = readJson(rootDir, 'language/locales/yo/extension.json');
    assert.equal(Object.prototype.hasOwnProperty.call(authoritative.entries, canonical.key), false);
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
        provider: 'DeepL',
        englishSource: 'normalized',
        apiCalls: 1,
        sourceCharactersPassed: translation.usage.charactersPassed,
        deepLApiCalls: 1,
        deepLCharactersPassed: translation.usage.charactersPassed,
        googleApiCalls: 0,
        googleCharactersPassed: 0
    });
    assert.ok(requests[0].items.length > 0);
    assert.ok(requests[0].items.some((item) => (
        item.text === '$(check) server JavaScript connection.onInitialize: SERVER loading configuration My Storage Management (.MyDc / .MyD) https://example.com/a-b.js ${uri.toString()}'
    )));
    assert.ok(requests[0].items.some((item) => item.text.includes('My Storage Management')));
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

test('Google retries multiple normalized choices and records the accepted combination', async () => {
    const builder = require('../../scripts/build-language.js');
    const requests = [];
    const state = {
        catalog: {
            entries: [{
                key: 'test.reviewCandidates.title',
                component: 'test',
                text: 'Candidate Locales',
                placeholders: []
            }]
        },
        locales: { locales: [{ id: 'en' }, { id: 'fr' }] },
        localeCatalogs: { fr: { entries: [] } },
        normalizedWords: [
            { input: 'candidate', output: 'proposal', alternatives: ['review item'] },
            { input: 'locales', output: 'language regions', alternatives: ['language settings'] }
        ]
    };
    const translator = {
        info: () => ({ provider: 'Google Translate', configured: true }),
        translateTexts: async (request) => {
            requests.push(request);
            return {
                apiCalls: 1,
                results: request.items.map((item) => ({
                    ok: true,
                    provider: 'Google Translate',
                    text: item.text === 'review item language settings'
                        ? 'élément à examiner paramètres de langue'
                        : item.text
                }))
            };
        }
    };

    const translation = await builder.createBuildTranslationSuggestions(state, {
        translator,
        localeIds: ['fr'],
        componentId: 'test'
    });

    assert.equal(requests.length, 2);
    assert.equal(requests[0].items[0].text, 'proposal language regions');
    assert.equal(requests[1].items[0].text, 'review item language settings');
    assert.equal(
        translation.suggestions.fr['test.reviewCandidates.title'].text,
        'élément à examiner paramètres de langue'
    );
    assert.deepEqual(
        translation.assignments.fr['test.reviewCandidates.title'],
        [
            { input: 'candidate', output: 'review item', choiceIndex: 1 },
            { input: 'locales', output: 'language settings', choiceIndex: 1 }
        ]
    );
    assert.deepEqual(translation.usage, {
        apiCalls: 2,
        charactersPassed: Array.from('proposal language regions').length
            + Array.from('review item language settings').length
    });
    assert.deepEqual(translation.warnings, []);
});

test('Google can advance one retained word after another word exhausts its alternatives', async () => {
    const builder = require('../../scripts/build-language.js');
    const requests = [];
    const state = {
        catalog: {
            entries: [{
                key: 'test.reviewCandidates.title',
                component: 'test',
                text: 'Candidate Locales',
                placeholders: []
            }]
        },
        locales: { locales: [{ id: 'en' }, { id: 'fr' }] },
        localeCatalogs: { fr: { entries: [] } },
        normalizedWords: [
            { input: 'candidate', output: 'proposal', alternatives: ['review item'] },
            {
                input: 'locales',
                output: 'language regions',
                alternatives: ['language settings', 'regional settings']
            }
        ]
    };
    const translator = {
        info: () => ({ provider: 'Google Translate', configured: true }),
        translateTexts: async (request) => {
            requests.push(request.items[0].text);
            return {
                results: [{
                    ok: true,
                    provider: 'Google Translate',
                    text: request.items[0].text === 'review item regional settings'
                        ? 'élément à examiner paramètres régionaux'
                        : request.items[0].text
                }]
            };
        }
    };

    const translation = await builder.createBuildTranslationSuggestions(state, {
        translator,
        localeIds: ['fr'],
        componentId: 'test'
    });

    assert.deepEqual(requests, [
        'proposal language regions',
        'review item language settings',
        'review item regional settings'
    ]);
    assert.deepEqual(translation.assignments.fr['test.reviewCandidates.title'], [
        { input: 'candidate', output: 'review item', choiceIndex: 1 },
        { input: 'locales', output: 'regional settings', choiceIndex: 2 }
    ]);
});

test('API translation failure warns, falls back, and does not fail generation', async (t) => {
    const rootDir = createFixture(t);
    const builder = require(path.join(rootDir, 'build/scripts/build-language.js'));
    const authoredPath = path.join(rootDir, 'language/locales/am/parser.json');
    const authored = readJson(rootDir, 'language/locales/am/parser.json');
    delete authored.entries['parser.diagnostic.unexpectedToken.message'];
    fs.writeFileSync(authoredPath, `${JSON.stringify(authored, null, 2)}\n`, 'utf8');
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

test('normalized fallback build bypasses DeepL only when the translator is disabled', async (t) => {
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
        argv: ['build', '--TranslationProvider=none', '--UseNormalized'],
        translator,
        progress: (message) => progress.push(message)
    });

    const buildReport = readJson(rootDir, 'build/language/reports/language-build-report.json');
    assert.equal(apiCalls, 0);
    assert.deepEqual(buildReport.translation, {
        mode: 'normalized',
        provider: 'None',
        englishSource: 'normalized',
        apiCalls: 0,
        sourceCharactersPassed: 0,
        deepLApiCalls: 0,
        deepLCharactersPassed: 0,
        googleApiCalls: 0,
        googleCharactersPassed: 0
    });
    assert.ok(progress.some((message) => message.includes('generating catalogs, maps, and reports')));
});

test('canonical fallback build bypasses every translator service when the translator is disabled', async (t) => {
    const rootDir = createFixture(t);
    const builder = require(path.join(rootDir, 'build/scripts/build-language.js'));
    let apiCalls = 0;
    const translator = {
        info: () => ({ provider: 'DeepL', configured: true }),
        translateTexts: async () => {
            apiCalls += 1;
            throw new Error('No translator may be called in none mode.');
        }
    };

    await builder.main(rootDir, {
        argv: ['build', '--TranslationProvider=none', '--UseCanonical'],
        translator
    });

    const buildReport = readJson(rootDir, 'build/language/reports/language-build-report.json');
    assert.equal(apiCalls, 0);
    assert.equal(buildReport.translation.mode, 'none');
    assert.equal(buildReport.translation.provider, 'None');
    assert.equal(buildReport.translation.englishSource, 'canonical');
    assert.equal(buildReport.translation.apiCalls, 0);
    assert.equal(buildReport.translation.deepLApiCalls, 0);
    assert.equal(buildReport.translation.googleApiCalls, 0);
});

test('Google build mode selects only the Google translator service', async (t) => {
    const rootDir = createFixture(t);
    const builder = require(path.join(rootDir, 'build/scripts/build-language.js'));
    const normalizedWordsPath = path.join(rootDir, 'language/canonical/normalized-words.json');
    const normalizedWords = readJson(rootDir, 'language/canonical/normalized-words.json');
    normalizedWords.push({
        input: 'token',
        output: 'text unit',
        alternatives: ['text element']
    });
    fs.writeFileSync(normalizedWordsPath, `${JSON.stringify(normalizedWords, null, 2)}\n`, 'utf8');
    const authoredPath = path.join(rootDir, 'language/locales/am/parser.json');
    const authored = readJson(rootDir, 'language/locales/am/parser.json');
    delete authored.entries['parser.diagnostic.unexpectedToken.message'];
    fs.writeFileSync(authoredPath, `${JSON.stringify(authored, null, 2)}\n`, 'utf8');
    let deepLCalls = 0;
    let googleCalls = 0;
    const translators = {
        deepl: {
            info: () => ({ provider: 'DeepL', configured: true }),
            translateTexts: async () => { deepLCalls += 1; return { results: [] }; }
        },
        google: {
            info: () => ({ provider: 'Google Translate', configured: true }),
            translateTexts: async (request) => {
                googleCalls += 1;
                return {
                    apiCalls: 1,
                    results: request.items.map((item) => ({
                        ok: true,
                        provider: 'Google Translate',
                        text: `Google ${item.text}`
                    }))
                };
            }
        }
    };

    await builder.main(rootDir, {
        argv: ['build', '--TranslationProvider=google'],
        translators
    });

    const buildReport = readJson(rootDir, 'build/language/reports/language-build-report.json');
    assert.equal(deepLCalls, 0);
    assert.ok(googleCalls > 0);
    assert.equal(buildReport.translation.mode, 'google');
    assert.equal(buildReport.translation.provider, 'Google Translate');
    assert.equal(buildReport.translation.englishSource, 'normalized');
    assert.equal(buildReport.translation.googleApiCalls, googleCalls);
    assert.equal(buildReport.translation.deepLApiCalls, 0);
    assert.ok(Object.values(
        buildReport.translation.normalizedSubstitutionAssignments || {}
    ).some((localeAssignments) => Object.values(localeAssignments).some((selections) => (
        Array.isArray(selections) && selections.length > 0
    ))));
});

test('placeholder-invalid API output warns and is excluded from generated suggestions', async (t) => {
    const rootDir = createFixture(t);
    const builder = require(path.join(rootDir, 'build/scripts/build-language.js'));
    const authoredPath = path.join(rootDir, 'language/locales/am/parser.json');
    const authored = readJson(rootDir, 'language/locales/am/parser.json');
    delete authored.entries['parser.diagnostic.unexpectedToken.message'];
    fs.writeFileSync(authoredPath, `${JSON.stringify(authored, null, 2)}\n`, 'utf8');
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
