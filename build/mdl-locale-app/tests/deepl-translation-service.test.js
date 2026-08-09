'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
    DeepLTranslationService,
    protectPlaceholders,
    protectRuntimeSyntax,
    restorePlaceholders,
    toDeepLTargetLanguage,
    translationConfiguration
} = require('../../language/translation/deepl-translation-service');

test('maps repository locale identifiers to DeepL target languages', () => {
    assert.equal(toDeepLTargetLanguage('fr-CA'), 'FR-CA');
    assert.equal(toDeepLTargetLanguage('zh-Hans'), 'ZH-HANS');
    assert.equal(toDeepLTargetLanguage('pt'), 'PT-PT');
    assert.equal(toDeepLTargetLanguage('ru'), 'RU');
    assert.equal(toDeepLTargetLanguage('en'), null);
});

test('loads the established DeeplApi environment variable without exposing it', () => {
    const config = translationConfiguration({ DeeplApi: 'fixture-key:fx' });
    assert.equal(config.apiKey, 'fixture-key:fx');
    assert.equal(config.credentialSource, 'DeeplApi');
    assert.equal(config.endpoint, 'https://api-free.deepl.com/v2/translate');
});

test('protects and restores placeholders through ignored XML tags', () => {
    const protectedValue = protectPlaceholders("Unexpected '{token}' at {position}");
    assert.match(protectedValue.protectedText, /<x id="p0">\{token\}<\/x>/);
    assert.match(protectedValue.protectedText, /<x id="p1">\{position\}<\/x>/);
    const restored = restorePlaceholders(
        "Inattendu '<x id=\"p0\">{token}</x>' à <x id=\"p1\">{position}</x>",
        protectedValue.placeholders
    );
    assert.deepEqual(restored, { ok: true, text: "Inattendu '{token}' à {position}" });
});

test('protects runtime syntax through ignored XML tags', () => {
    const protectedValue = protectRuntimeSyntax(
        '$(check) {index}/{total} (.MyDc) https://example.com/a-b.js ${uri.toString()}'
    );
    assert.equal(protectedValue.placeholders.length, 7);
    for (let index = 0; index < protectedValue.placeholders.length; index += 1) {
        assert.match(protectedValue.protectedText, new RegExp(`<x id="p${index}">`));
    }
    const restored = restorePlaceholders(protectedValue.protectedText, protectedValue.placeholders);
    assert.deepEqual(restored, {
        ok: true,
        text: '$(check) {index}/{total} (.MyDc) https://example.com/a-b.js ${uri.toString()}'
    });
});

test('posts translation text with header authentication and preserves placeholders', async () => {
    let observed;
    const translator = new DeepLTranslationService({
        config: {
            apiKey: 'fixture-secret:fx',
            endpoint: 'https://api-free.deepl.test/v2/translate',
            timeoutMs: 5000
        },
        fetch: async (url, options) => {
            observed = { url, options, body: JSON.parse(options.body) };
            return {
                ok: true,
                status: 200,
                json: async () => ({
                    translations: [{
                        detected_source_language: 'EN',
                        text: "Jeton inattendu '<x id=\"p0\">{token}</x>'"
                    }]
                })
            };
        }
    });
    const result = await translator.translateText({
        text: "Unexpected token '{token}'",
        targetLocale: 'fr-CA',
        placeholders: ['token']
    });
    assert.equal(result.ok, true);
    assert.equal(result.text, "Jeton inattendu '{token}'");
    assert.equal(observed.url, 'https://api-free.deepl.test/v2/translate');
    assert.equal(observed.options.headers.Authorization, 'DeepL-Auth-Key fixture-secret:fx');
    assert.equal(observed.body.target_lang, 'FR-CA');
    assert.equal(observed.body.source_lang, 'EN');
    assert.deepEqual(observed.body.custom_instructions, [
        'Translate every word, including words enclosed in quotation marks.',
        'Translate every word found within parenthesis marks ().'
    ]);
    assert.equal(observed.body.tag_handling, 'xml');
    assert.deepEqual(observed.body.ignore_tags, ['x']);
    assert.equal(observed.options.body.includes('fixture-secret'), false);
});

test('returns an unusable result when placeholder markup is lost', async () => {
    const translator = new DeepLTranslationService({
        config: { apiKey: 'fixture', endpoint: 'https://deepl.test/v2/translate', timeoutMs: 5000 },
        fetch: async () => ({
            ok: true,
            status: 200,
            json: async () => ({ translations: [{ text: 'Jeton inattendu' }] })
        })
    });
    const result = await translator.translateText({
        text: "Unexpected token '{token}'",
        targetLocale: 'fr-CA',
        placeholders: ['token']
    });
    assert.equal(result.ok, false);
    assert.match(result.error, /Protected syntax marker p0/);
});

test('returns an unusable result when protected runtime syntax is lost', async () => {
    const translator = new DeepLTranslationService({
        config: { apiKey: 'fixture', endpoint: 'https://deepl.test/v2/translate', timeoutMs: 5000 },
        fetch: async () => ({
            ok: true,
            status: 200,
            json: async () => ({ translations: [{ text: 'Aucun diagnostic' }] })
        })
    });
    const result = await translator.translateText({
        text: '$(check) No diagnostics',
        targetLocale: 'fr-CA'
    });
    assert.equal(result.ok, false);
    assert.match(result.error, /Protected syntax marker p0/);
});

test('missing configuration fails safely without making a request', async () => {
    let requests = 0;
    const translator = new DeepLTranslationService({
        config: { apiKey: '', endpoint: 'https://deepl.test/v2/translate', timeoutMs: 5000 },
        fetch: async () => { requests += 1; }
    });
    const result = await translator.translateText({ text: 'Open Preview', targetLocale: 'fr-CA' });
    assert.equal(result.ok, false);
    assert.match(result.error, /DeeplApi or DEEPL_API_KEY/);
    assert.equal(requests, 0);
});
