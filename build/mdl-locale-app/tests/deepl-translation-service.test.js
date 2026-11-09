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

    const adjacent = protectRuntimeSyntax('{first}{second}$(check)');
    assert.deepEqual(adjacent.placeholders, ['{first}', '{second}', '$(check)']);
    assert.deepEqual(restorePlaceholders(adjacent.protectedText, adjacent.placeholders), {
        ok: true,
        text: '{first}{second}$(check)'
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

test('omits custom instructions for targets where DeepL does not support them', async () => {
    let body;
    const translator = new DeepLTranslationService({
        config: { apiKey: 'fixture', endpoint: 'https://deepl.test/v2/translate', timeoutMs: 5000 },
        fetch: async (_url, options) => {
            body = JSON.parse(options.body);
            return {
                ok: true,
                status: 200,
                json: async () => ({ translations: [{ text: 'Fungua hakiki' }] })
            };
        }
    });
    const result = await translator.translateText({ text: 'Open Preview', targetLocale: 'sw' });
    assert.equal(result.ok, true);
    assert.equal(Object.hasOwn(body, 'custom_instructions'), false);
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

test('retrieves live target support and usage without exposing the credential', async () => {
    const requests = [];
    const translator = new DeepLTranslationService({
        config: {
            apiKey: 'fixture-secret:fx',
            endpoint: 'https://api-free.deepl.test/v2/translate',
            timeoutMs: 5000
        },
        fetch: async (url, options) => {
            requests.push({ url, authorization: options.headers.Authorization });
            if (url.includes('/v3/languages')) {
                return {
                    ok: true,
                    status: 200,
                    json: async () => ([{
                        lang: 'am',
                        name: 'Amharic',
                        usable_as_target: true,
                        status: 'stable',
                        features: { tag_handling: { status: 'stable' } }
                    }])
                };
            }
            return {
                ok: true,
                status: 200,
                json: async () => ({ character_count: 12, character_limit: 1000 })
            };
        }
    });

    const support = await translator.supportedTargetLanguages();
    const usage = await translator.usage();
    assert.deepEqual(support.languages, [{
        code: 'am',
        name: 'Amharic',
        status: 'stable',
        tagHandling: 'stable'
    }]);
    assert.equal(usage.characterCount, 12);
    assert.equal(usage.characterLimit, 1000);
    assert.equal(requests[0].url, 'https://api-free.deepl.test/v3/languages?resource=translate_text&include=beta');
    assert.equal(requests[1].url, 'https://api-free.deepl.test/v2/usage');
    assert.equal(requests[0].authorization, 'DeepL-Auth-Key fixture-secret:fx');
});

test('classifies quota exhaustion so a runner can stop cleanly', async () => {
    const translator = new DeepLTranslationService({
        config: { apiKey: 'fixture', endpoint: 'https://deepl.test/v2/translate', timeoutMs: 5000 },
        fetch: async () => ({ ok: false, status: 456 })
    });
    const result = await translator.translateText({ text: 'Open Preview', targetLocale: 'fr-CA' });
    assert.equal(result.ok, false);
    assert.equal(result.httpStatus, 456);
    assert.equal(result.errorCategory, 'quota-exhausted');
    assert.equal(result.retryable, false);
});
