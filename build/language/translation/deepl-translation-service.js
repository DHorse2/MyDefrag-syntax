'use strict';

const { normalizeText, transformRuntimeSyntax } = require('./text-normalizer');

const DEFAULT_PRO_ENDPOINT = 'https://api.deepl.com/v2/translate';
const DEFAULT_FREE_ENDPOINT = 'https://api-free.deepl.com/v2/translate';
const DEFAULT_TIMEOUT_MS = 15000;
const PLACEHOLDER_PATTERN = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
const CUSTOM_INSTRUCTION_TARGETS = new Set(['de', 'en', 'es', 'fr', 'it', 'ja', 'ko', 'zh']);

function extractPlaceholders(text) {
    return Array.from(String(text || '').matchAll(PLACEHOLDER_PATTERN), (match) => match[1])
        .filter((value, index, values) => values.indexOf(value) === index)
        .sort();
}

function escapeXml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function unescapeXml(value) {
    return String(value)
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&');
}

/**
 * Protect MyDefrag placeholders with ignored XML tags before submitting text.
 * DeepL documents this pre/post-processing pattern for template placeholders.
 */
function protectPlaceholders(text) {
    const source = String(text || '');
    const placeholders = [];
    let offset = 0;
    let protectedText = '';
    let match;
    PLACEHOLDER_PATTERN.lastIndex = 0;
    while ((match = PLACEHOLDER_PATTERN.exec(source)) !== null) {
        protectedText += escapeXml(source.slice(offset, match.index));
        const index = placeholders.length;
        placeholders.push(match[0]);
        protectedText += `<x id="p${index}">${escapeXml(match[0])}</x>`;
        offset = match.index + match[0].length;
    }
    protectedText += escapeXml(source.slice(offset));
    return { protectedText, placeholders };
}

function protectRuntimeSyntax(text) {
    const protectedValues = [];
    const marked = transformRuntimeSyntax(text, (token) => {
        const marker = String.fromCodePoint(0xE000 + protectedValues.length);
        protectedValues.push(token);
        return marker;
    });
    let protectedText = escapeXml(marked);
    for (const [index, value] of protectedValues.entries()) {
        const marker = String.fromCodePoint(0xE000 + index);
        protectedText = protectedText.replace(
            marker,
            `<x id="p${index}">${escapeXml(value)}</x>`
        );
    }
    return { protectedText, placeholders: protectedValues };
}

function restorePlaceholders(text, placeholders) {
    let restored = String(text || '');
    for (let index = 0; index < placeholders.length; index += 1) {
        const pattern = new RegExp(`<x\\s+id=["']p${index}["'][^>]*>[\\s\\S]*?<\\/x>`, 'g');
        const matches = restored.match(pattern) || [];
        if (matches.length !== 1) {
            return { ok: false, error: `Protected syntax marker p${index} was not preserved exactly once.` };
        }
        restored = restored.replace(pattern, placeholders[index]);
    }
    if (/<\/?x(?:\s|>)/i.test(restored)) {
        return { ok: false, error: 'Unexpected placeholder markup remained in the translation.' };
    }
    return { ok: true, text: unescapeXml(restored) };
}

function toDeepLTargetLanguage(localeId) {
    const normalized = String(localeId || '').trim();
    if (!normalized || normalized.toLowerCase() === 'en') { return null; }
    const explicit = {
        'fr-ca': 'FR-CA',
        'pt': 'PT-PT',
        'zh-hans': 'ZH-HANS'
    };
    return explicit[normalized.toLowerCase()] || normalized.toUpperCase();
}

function translationConfiguration(environment = process.env) {
    const credentialSource = environment.DeeplApi ? 'DeeplApi' : 'DEEPL_API_KEY';
    const apiKey = String(environment.DeeplApi || environment.DEEPL_API_KEY || '').trim();
    const suppliedEndpoint = String(environment.DEEPL_API_URL || '').trim().replace(/\/+$/, '');
    const defaultEndpoint = apiKey.endsWith(':fx') ? DEFAULT_FREE_ENDPOINT : DEFAULT_PRO_ENDPOINT;
    const endpoint = suppliedEndpoint
        ? (suppliedEndpoint.endsWith('/v2/translate') ? suppliedEndpoint : `${suppliedEndpoint}/v2/translate`)
        : defaultEndpoint;
    const parsedTimeout = Number.parseInt(environment.DEEPL_TIMEOUT_MS, 10);
    const timeoutMs = Number.isFinite(parsedTimeout) && parsedTimeout >= 1000
        ? Math.min(parsedTimeout, 120000)
        : DEFAULT_TIMEOUT_MS;
    return { apiKey, credentialSource, endpoint, timeoutMs };
}

function errorCategoryForStatus(status) {
    if (status === 429) { return 'rate-limited'; }
    if (status === 456) { return 'quota-exhausted'; }
    if (status === 401 || status === 403) { return 'authentication'; }
    if (status >= 500) { return 'provider-error'; }
    if (status >= 400) { return 'request-error'; }
    return 'unknown';
}

function endpointUrl(endpoint, resourcePath) {
    return new URL(resourcePath, new URL(endpoint).origin).toString();
}

class DeepLTranslationService {
    constructor(options = {}) {
        this.config = options.config || translationConfiguration(options.environment);
        this.fetch = options.fetch || globalThis.fetch;
    }

    info() {
        return {
            provider: 'DeepL',
            configured: Boolean(this.config.apiKey),
            endpoint: this.config.endpoint,
            credentialSource: this.config.credentialSource || 'DeeplApi'
        };
    }

    async requestJson(resourcePath, options = {}) {
        if (!this.config.apiKey) {
            throw new Error('DeepL API is not configured; set DeeplApi or DEEPL_API_KEY.');
        }
        if (typeof this.fetch !== 'function') {
            throw new Error('The current Node.js runtime does not provide fetch.');
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
        const url = endpointUrl(this.config.endpoint, resourcePath);
        try {
            const response = await this.fetch(url, {
                ...options,
                headers: {
                    Authorization: `DeepL-Auth-Key ${this.config.apiKey}`,
                    'User-Agent': 'MyDefrag-Locale-Maintenance/0.5.0',
                    ...(options.headers || {})
                },
                signal: controller.signal
            });
            if (!response.ok) {
                const error = new Error(`DeepL request failed with HTTP ${response.status}.`);
                error.httpStatus = response.status;
                error.category = errorCategoryForStatus(response.status);
                const retryAfter = Number.parseFloat(response.headers?.get?.('retry-after'));
                if (Number.isFinite(retryAfter) && retryAfter >= 0) {
                    error.retryAfterMs = Math.ceil(retryAfter * 1000);
                }
                throw error;
            }
            return {
                data: await response.json(),
                httpStatus: response.status
            };
        } catch (error) {
            if (error?.name === 'AbortError') {
                const timeoutError = new Error(
                    `DeepL request timed out after ${this.config.timeoutMs} ms.`
                );
                timeoutError.category = 'timeout';
                throw timeoutError;
            }
            throw error;
        } finally {
            clearTimeout(timeout);
        }
    }

    async supportedTargetLanguages() {
        try {
            const response = await this.requestJson(
                '/v3/languages?resource=translate_text&include=beta'
            );
            if (!Array.isArray(response.data)) {
                throw new Error('DeepL returned an unexpected supported-language response.');
            }
            return {
                endpointVersion: 'v3',
                httpStatus: response.httpStatus,
                languages: response.data
                    .filter((language) => language?.usable_as_target === true)
                    .map((language) => ({
                        code: String(language.lang || ''),
                        name: String(language.name || ''),
                        status: language.status || null,
                        tagHandling: language.features?.tag_handling?.status || null
                    }))
            };
        } catch (error) {
            if (error.httpStatus && error.httpStatus !== 404) { throw error; }
            const response = await this.requestJson('/v2/languages?type=target');
            if (!Array.isArray(response.data)) {
                throw new Error('DeepL returned an unexpected supported-language response.');
            }
            return {
                endpointVersion: 'v2',
                httpStatus: response.httpStatus,
                languages: response.data.map((language) => ({
                    code: String(language.language || ''),
                    name: String(language.name || ''),
                    status: 'stable',
                    tagHandling: null
                }))
            };
        }
    }

    async usage() {
        const response = await this.requestJson('/v2/usage');
        const data = response.data;
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            throw new Error('DeepL returned an unexpected usage response.');
        }
        return {
            httpStatus: response.httpStatus,
            characterCount: Number.isFinite(data.character_count)
                ? data.character_count
                : null,
            characterLimit: Number.isFinite(data.character_limit)
                ? data.character_limit
                : null,
            apiKeyCharacterCount: Number.isFinite(data.api_key_character_count)
                ? data.api_key_character_count
                : null,
            apiKeyCharacterLimit: Number.isFinite(data.api_key_character_limit)
                ? data.api_key_character_limit
                : null
        };
    }

    async translateText(request = {}) {
        const response = await this.translateTexts({
            targetLocale: request.targetLocale,
            items: [{ text: request.text, placeholders: request.placeholders }]
        });
        return response.results[0];
    }

    async translateTexts(request = {}) {
        const items = Array.isArray(request.items) ? request.items : [];
        const targetLanguage = toDeepLTargetLanguage(request.targetLocale);
        if (items.length === 0) { return { results: [], targetLanguage }; }
        if (!this.config.apiKey) {
            return this.failureResults(
                items,
                'DeepL API is not configured; set DeeplApi or DEEPL_API_KEY.',
                targetLanguage
            );
        }
        if (!targetLanguage) {
            return this.failureResults(items, 'Canonical English is not an API translation target.', targetLanguage);
        }
        if (typeof this.fetch !== 'function') {
            return this.failureResults(items, 'The current Node.js runtime does not provide fetch.', targetLanguage);
        }

        const protectedItems = items.map((item) => protectRuntimeSyntax(item.text));
        const targetBaseLanguage = targetLanguage.split('-')[0].toLocaleLowerCase();
        const customInstructions = CUSTOM_INSTRUCTION_TARGETS.has(targetBaseLanguage)
            ? {
                custom_instructions: [
                    'Translate every word, including words enclosed in quotation marks.',
                    'Translate every word found within parenthesis marks ().'
                ]
            }
            : {};
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
        try {
            const response = await this.fetch(this.config.endpoint, {
                method: 'POST',
                headers: {
                    Authorization: `DeepL-Auth-Key ${this.config.apiKey}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'MyDefrag-Locale-Maintenance/0.4.0'
                },
                body: JSON.stringify({
                    text: protectedItems.map((item) => item.protectedText),
                    target_lang: targetLanguage,
                    source_lang: 'EN',
                    ...customInstructions,
                    preserve_formatting: true,
                    tag_handling: 'xml',
                    tag_handling_version: 'v2',
                    ignore_tags: ['x']
                }),
                signal: controller.signal
            });
            if (!response.ok) {
                let providerDetail = '';
                if (typeof response.text === 'function') {
                    providerDetail = String(await response.text()).replace(/\s+/gu, ' ').trim();
                }
                const detailSuffix = providerDetail
                    ? ` ${providerDetail.slice(0, 300)}`
                    : '';
                return this.failureResults(
                    items,
                    `DeepL request failed with HTTP ${response.status}.${detailSuffix}`,
                    targetLanguage,
                    {
                        httpStatus: response.status,
                        errorCategory: errorCategoryForStatus(response.status),
                        retryable: response.status === 429 || response.status >= 500,
                        retryAfterMs: (() => {
                            const seconds = Number.parseFloat(response.headers?.get?.('retry-after'));
                            return Number.isFinite(seconds) && seconds >= 0
                                ? Math.ceil(seconds * 1000)
                                : null;
                        })()
                    }
                );
            }
            const data = await response.json();
            if (!Array.isArray(data.translations) || data.translations.length !== items.length) {
                return this.failureResults(items, 'DeepL returned an unexpected translation count.', targetLanguage);
            }
            return {
                targetLanguage,
                results: data.translations.map((translation, index) => this.validateResult(
                    translation,
                    items[index],
                    protectedItems[index],
                    targetLanguage
                ))
            };
        } catch (error) {
            const message = error?.name === 'AbortError'
                ? `DeepL request timed out after ${this.config.timeoutMs} ms.`
                : `DeepL request failed: ${error.message}`;
            return this.failureResults(items, message, targetLanguage, {
                errorCategory: error?.name === 'AbortError' ? 'timeout' : 'network-error',
                retryable: true
            });
        } finally {
            clearTimeout(timeout);
        }
    }

    validateResult(translation, item, protectedItem, targetLanguage) {
        const restored = restorePlaceholders(translation?.text, protectedItem.placeholders);
        if (!restored.ok) {
            return { ok: false, error: `Unusable DeepL translation: ${restored.error}`, targetLanguage };
        }
        const text = restored.text.trim();
        if (!text) {
            return { ok: false, error: 'Unusable DeepL translation: the result was empty.', targetLanguage };
        }
        const expected = [...(item.placeholders || extractPlaceholders(item.text))].sort();
        const actual = extractPlaceholders(text);
        if (expected.join('|') !== actual.join('|')) {
            return {
                ok: false,
                error: `Unusable DeepL translation: placeholders must be exactly ${expected.join(', ') || '(none)'}.`,
                targetLanguage
            };
        }
        return {
            ok: true,
            provider: 'DeepL',
            text,
            targetLanguage,
            detectedSourceLanguage: translation.detected_source_language || null
        };
    }

    failureResults(items, error, targetLanguage, details = {}) {
        return {
            targetLanguage,
            results: items.map(() => ({
                ok: false,
                error,
                targetLanguage,
                ...details
            }))
        };
    }
}

async function createBuildTranslationSuggestions(state, options = {}) {
    const translator = options.translator || new DeepLTranslationService();
    const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
    const localeFilter = options.localeIds ? new Set(options.localeIds) : null;
    const entryKeysByLocale = options.entryKeysByLocale || null;
    const componentId = options.componentId || null;
    const suggestions = {};
    const warnings = [];
    const usage = { apiCalls: 0, charactersPassed: 0 };
    const canonicalEntries = (state.catalog.entries || []).filter((entry) => (
        !componentId || entry.component === componentId
    ));

    for (const locale of state.locales.locales || []) {
        if (locale.id === 'en' || (localeFilter && !localeFilter.has(locale.id))) { continue; }
        const authored = new Set((state.localeCatalogs[locale.id]?.entries || []).map((entry) => entry.key));
        const outputMissing = entryKeysByLocale
            ? new Set(entryKeysByLocale[locale.id] || [])
            : null;
        const missing = canonicalEntries.filter((entry) => (
            !authored.has(entry.key) && (!outputMissing || outputMissing.has(entry.key))
        ));
        if (missing.length === 0) { continue; }
        onProgress?.({ localeId: locale.id, missingCount: missing.length });
        if (!translator.info().configured) {
            warnings.push(
                `API translation ${locale.id}: DeepL API is not configured; `
                + `${missing.length} missing value(s) use canonical English fallback.`
            );
            continue;
        }

        const items = missing.map((entry) => ({
            text: normalizeText(entry.text, state.normalizedWords, {
                preserveRuntimeSyntax: true
            }),
            placeholders: entry.placeholders || []
        }));
        usage.apiCalls += 1;
        usage.charactersPassed += items.reduce((total, item) => (
            total + Array.from(String(item.text || '')).length
        ), 0);

        let response;
        try {
            response = await translator.translateTexts({
                targetLocale: locale.id,
                items
            });
        } catch (error) {
            warnings.push(
                `API translation ${locale.id}: request failed: ${error.message}. `
                + `${missing.length} missing value(s) use canonical English fallback.`
            );
            continue;
        }
        if (!Array.isArray(response?.results) || response.results.length !== missing.length) {
            warnings.push(
                `API translation ${locale.id}: provider returned an unexpected result count; `
                + `${missing.length} missing value(s) use canonical English fallback.`
            );
            continue;
        }
        const failures = [];
        suggestions[locale.id] = {};
        response.results.forEach((result, index) => {
            const entry = missing[index];
            const expected = [...(entry.placeholders || [])].sort();
            const actual = extractPlaceholders(result.text);
            const usable = result.ok
                && String(result.text || '').trim()
                && expected.join('|') === actual.join('|');
            if (usable) {
                suggestions[locale.id][entry.key] = {
                    text: result.text,
                    status: 'machine-generated',
                    provider: result.provider
                };
            } else {
                let error = result.error;
                if (result.ok && !String(result.text || '').trim()) {
                    error = 'Unusable API translation: the result was empty.';
                } else if (result.ok) {
                    error = `Unusable API translation: placeholders must be exactly ${expected.join(', ') || '(none)'}.`;
                }
                failures.push({
                    key: entry.key,
                    error
                });
            }
        });
        if (Object.keys(suggestions[locale.id]).length === 0) { delete suggestions[locale.id]; }
        const distinctErrors = new Set(failures.map((failure) => failure.error));
        if (failures.length > 1 && distinctErrors.size === 1) {
            warnings.push(
                `API translation ${locale.id}: ${failures[0].error} `
                + `${failures.length} missing value(s) use canonical English fallback.`
            );
        } else {
            for (const failure of failures) {
                warnings.push(
                    `API translation ${locale.id}/${failure.key}: ${failure.error} Using canonical English fallback.`
                );
            }
        }
    }

    return { suggestions, warnings, usage };
}

module.exports = {
    DeepLTranslationService,
    createBuildTranslationSuggestions,
    extractPlaceholders,
    errorCategoryForStatus,
    endpointUrl,
    protectPlaceholders,
    protectRuntimeSyntax,
    restorePlaceholders,
    toDeepLTargetLanguage,
    translationConfiguration
};
