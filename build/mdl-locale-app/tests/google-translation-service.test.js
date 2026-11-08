'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
    GoogleTranslationService,
    googleTranslationConfiguration,
    protectRuntimeSyntaxForGoogle,
    restoreRuntimeSyntaxFromGoogle,
    toGoogleTargetLanguage
} = require('../../language/translation/google-translation-service');

test('maps repository locale identifiers to Google Translate target languages', () => {
    assert.equal(toGoogleTargetLanguage('fr-CA'), 'fr-CA');
    assert.equal(toGoogleTargetLanguage('zh-Hans'), 'zh-CN');
    assert.equal(toGoogleTargetLanguage('pt'), 'pt');
    assert.equal(toGoogleTargetLanguage('en'), null);
});

test('loads the Google Translate API key without exposing it through service info', () => {
    const config = googleTranslationConfiguration({ GoogleTranslateApi: 'fixture-secret' });
    const translator = new GoogleTranslationService({ config });
    assert.equal(config.apiKey, 'fixture-secret');
    assert.equal(config.credentialSource, 'GoogleTranslateApi');
    assert.equal(config.endpoint, 'https://translation.googleapis.com/language/translate/v2');
    assert.equal(JSON.stringify(translator.info()).includes('fixture-secret'), false);
});

test('protects and restores runtime syntax through no-translate HTML spans', () => {
    const protectedValue = protectRuntimeSyntaxForGoogle(
        '$(check) {index}/{total} (.MyDc) https://example.com/a-b.js ${uri.toString()}'
    );
    assert.equal(protectedValue.placeholders.length, 7);
    assert.match(protectedValue.protectedText, /translate="no"/u);
    assert.match(protectedValue.protectedText, /class="notranslate"/u);
    const restored = restoreRuntimeSyntaxFromGoogle(
        protectedValue.protectedText,
        protectedValue.placeholders
    );
    assert.deepEqual(restored, {
        ok: true,
        text: '$(check) {index}/{total} (.MyDc) https://example.com/a-b.js ${uri.toString()}'
    });
});

test('posts Basic v2 translation requests and preserves placeholders', async () => {
    let observed;
    const translator = new GoogleTranslationService({
        config: {
            apiKey: 'fixture-secret',
            endpoint: 'https://translation.googleapis.test/language/translate/v2',
            timeoutMs: 5000
        },
        fetch: async (url, options) => {
            const body = JSON.parse(options.body);
            observed = { url, options, body };
            return {
                ok: true,
                status: 200,
                json: async () => ({
                    data: {
                        translations: [{
                            detectedSourceLanguage: 'en',
                            translatedText: body.q[0].replace('Unexpected token', 'Jeton inattendu')
                        }]
                    }
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
    assert.equal(result.provider, 'Google Translate');
    assert.equal(result.text, "Jeton inattendu '{token}'");
    assert.equal(new URL(observed.url).searchParams.get('key'), 'fixture-secret');
    assert.deepEqual(observed.body.target, 'fr-CA');
    assert.deepEqual(observed.body.source, 'en');
    assert.deepEqual(observed.body.format, 'html');
    assert.equal(observed.options.body.includes('fixture-secret'), false);
});

test('chunks more than 128 strings and reports the physical API call count', async () => {
    const requests = [];
    const translator = new GoogleTranslationService({
        config: {
            apiKey: 'fixture-secret',
            endpoint: 'https://translation.googleapis.test/language/translate/v2',
            timeoutMs: 5000
        },
        fetch: async (_url, options) => {
            const body = JSON.parse(options.body);
            requests.push(body);
            return {
                ok: true,
                status: 200,
                json: async () => ({
                    data: { translations: body.q.map((text) => ({ translatedText: text })) }
                })
            };
        }
    });
    const response = await translator.translateTexts({
        targetLocale: 'fr',
        items: Array.from({ length: 129 }, (_value, index) => ({ text: `Text ${index}` }))
    });
    assert.equal(response.results.length, 129);
    assert.equal(response.results.every((result) => result.ok), true);
    assert.equal(response.apiCalls, 2);
    assert.deepEqual(requests.map((body) => body.q.length), [128, 1]);
});

test('missing configuration fails safely without making a request', async () => {
    let requests = 0;
    const translator = new GoogleTranslationService({
        config: { apiKey: '', endpoint: 'https://translation.googleapis.test/language/translate/v2', timeoutMs: 5000 },
        fetch: async () => { requests += 1; }
    });
    const result = await translator.translateText({ text: 'Open Preview', targetLocale: 'fr-CA' });
    assert.equal(result.ok, false);
    assert.match(result.error, /GoogleTranslateApi or GOOGLE_TRANSLATE_API_KEY/u);
    assert.equal(requests, 0);
});
