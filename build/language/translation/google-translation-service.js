'use strict';

const {
    errorCategoryForStatus,
    extractPlaceholders
} = require('./deepl-translation-service');
const { transformRuntimeSyntax } = require('./text-normalizer');

const DEFAULT_ENDPOINT = 'https://translation.googleapis.com/language/translate/v2';
const DEFAULT_TIMEOUT_MS = 15000;
const MAX_TEXTS_PER_REQUEST = 128;

function toGoogleTargetLanguage(localeId) {
    const normalized = String(localeId || '').trim();
    if (!normalized || normalized.toLocaleLowerCase() === 'en') { return null; }
    const explicit = {
        'zh-hans': 'zh-CN'
    };
    return explicit[normalized.toLocaleLowerCase()] || normalized;
}

function googleTranslationConfiguration(environment = process.env) {
    const credentialSource = environment.GoogleTranslateApi
        ? 'GoogleTranslateApi'
        : 'GOOGLE_TRANSLATE_API_KEY';
    const apiKey = String(
        environment.GoogleTranslateApi || environment.GOOGLE_TRANSLATE_API_KEY || ''
    ).trim();
    const suppliedEndpoint = String(environment.GOOGLE_TRANSLATE_API_URL || '')
        .trim()
        .replace(/\/+$/u, '');
    const endpoint = suppliedEndpoint
        ? (suppliedEndpoint.endsWith('/language/translate/v2')
            ? suppliedEndpoint
            : `${suppliedEndpoint}/language/translate/v2`)
        : DEFAULT_ENDPOINT;
    const parsedTimeout = Number.parseInt(environment.GOOGLE_TRANSLATE_TIMEOUT_MS, 10);
    const timeoutMs = Number.isFinite(parsedTimeout) && parsedTimeout >= 1000
        ? Math.min(parsedTimeout, 120000)
        : DEFAULT_TIMEOUT_MS;
    return { apiKey, credentialSource, endpoint, timeoutMs };
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/gu, '&amp;')
        .replace(/</gu, '&lt;')
        .replace(/>/gu, '&gt;')
        .replace(/"/gu, '&quot;')
        .replace(/'/gu, '&#39;');
}

function decodeHtml(value) {
    return String(value)
        .replace(/&#x([0-9a-f]+);/giu, (_match, digits) => String.fromCodePoint(Number.parseInt(digits, 16)))
        .replace(/&#([0-9]+);/gu, (_match, digits) => String.fromCodePoint(Number.parseInt(digits, 10)))
        .replace(/&lt;/giu, '<')
        .replace(/&gt;/giu, '>')
        .replace(/&quot;/giu, '"')
        .replace(/&apos;/giu, "'")
        .replace(/&#39;/giu, "'")
        .replace(/&nbsp;/giu, '\u00a0')
        .replace(/&amp;/giu, '&');
}

function protectRuntimeSyntaxForGoogle(text) {
    const placeholders = [];
    const marked = transformRuntimeSyntax(text, (token) => {
        const marker = String.fromCodePoint(0xE000 + placeholders.length);
        placeholders.push(token);
        return marker;
    });
    let protectedText = escapeHtml(marked);
    for (const [index, value] of placeholders.entries()) {
        const marker = String.fromCodePoint(0xE000 + index);
        protectedText = protectedText.replace(
            marker,
            `<span class="notranslate" translate="no" data-mdl-token="p${index}">${escapeHtml(value)}</span>`
        );
    }
    return { protectedText, placeholders };
}

function restoreRuntimeSyntaxFromGoogle(text, placeholders) {
    let restored = String(text || '');
    for (let index = 0; index < placeholders.length; index += 1) {
        const pattern = new RegExp(
            `<span\\b(?=[^>]*\\bdata-mdl-token=["']p${index}["'])[^>]*>[\\s\\S]*?<\\/span>`,
            'giu'
        );
        const matches = restored.match(pattern) || [];
        if (matches.length !== 1) {
            return { ok: false, error: `Protected syntax marker p${index} was not preserved exactly once.` };
        }
        restored = restored.replace(pattern, placeholders[index]);
    }
    if (/data-mdl-token=/iu.test(restored)) {
        return { ok: false, error: 'Unexpected protected syntax markup remained in the translation.' };
    }
    return { ok: true, text: decodeHtml(restored) };
}

function scrubProviderDetail(value, apiKey) {
    const normalized = String(value || '').replace(/\s+/gu, ' ').trim();
    return apiKey ? normalized.replaceAll(apiKey, '[redacted]') : normalized;
}

class GoogleTranslationService {
    constructor(options = {}) {
        this.config = options.config || googleTranslationConfiguration(options.environment);
        this.fetch = options.fetch || globalThis.fetch;
    }

    info() {
        return {
            provider: 'Google Translate',
            configured: Boolean(this.config.apiKey),
            endpoint: this.config.endpoint,
            credentialSource: this.config.credentialSource || 'GoogleTranslateApi'
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
        const targetLanguage = toGoogleTargetLanguage(request.targetLocale);
        if (items.length === 0) {
            return { results: [], targetLanguage, apiCalls: 0 };
        }
        if (!this.config.apiKey) {
            return this.failureResults(
                items,
                'Google Translate API is not configured; set GoogleTranslateApi or GOOGLE_TRANSLATE_API_KEY.',
                targetLanguage,
                { apiCalls: 0 }
            );
        }
        if (!targetLanguage) {
            return this.failureResults(
                items,
                'Canonical English is not an API translation target.',
                targetLanguage,
                { apiCalls: 0 }
            );
        }
        if (typeof this.fetch !== 'function') {
            return this.failureResults(
                items,
                'The current Node.js runtime does not provide fetch.',
                targetLanguage,
                { apiCalls: 0 }
            );
        }

        const protectedItems = items.map((item) => protectRuntimeSyntaxForGoogle(item.text));
        const results = [];
        let apiCalls = 0;
        for (let offset = 0; offset < items.length; offset += MAX_TEXTS_PER_REQUEST) {
            const itemChunk = items.slice(offset, offset + MAX_TEXTS_PER_REQUEST);
            const protectedChunk = protectedItems.slice(offset, offset + MAX_TEXTS_PER_REQUEST);
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
            apiCalls += 1;
            try {
                const endpoint = new URL(this.config.endpoint);
                endpoint.searchParams.set('key', this.config.apiKey);
                const response = await this.fetch(endpoint.toString(), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json; charset=utf-8',
                        'User-Agent': 'MyDefrag-Locale-Maintenance/0.5.0'
                    },
                    body: JSON.stringify({
                        q: protectedChunk.map((item) => item.protectedText),
                        source: 'en',
                        target: targetLanguage,
                        format: 'html'
                    }),
                    signal: controller.signal
                });
                if (!response.ok) {
                    const providerDetail = typeof response.text === 'function'
                        ? scrubProviderDetail(await response.text(), this.config.apiKey)
                        : '';
                    const detailSuffix = providerDetail ? ` ${providerDetail.slice(0, 300)}` : '';
                    const error = `Google Translate request failed with HTTP ${response.status}.${detailSuffix}`;
                    results.push(...this.failureResults(
                        items.slice(offset),
                        error,
                        targetLanguage,
                        {
                            httpStatus: response.status,
                            errorCategory: errorCategoryForStatus(response.status),
                            retryable: response.status === 429 || response.status >= 500
                        }
                    ).results);
                    break;
                }
                const data = await response.json();
                const translations = data?.data?.translations;
                if (!Array.isArray(translations) || translations.length !== itemChunk.length) {
                    results.push(...this.failureResults(
                        items.slice(offset),
                        'Google Translate returned an unexpected translation count.',
                        targetLanguage
                    ).results);
                    break;
                }
                results.push(...translations.map((translation, index) => this.validateResult(
                    translation,
                    itemChunk[index],
                    protectedChunk[index],
                    targetLanguage
                )));
            } catch (error) {
                const message = error?.name === 'AbortError'
                    ? `Google Translate request timed out after ${this.config.timeoutMs} ms.`
                    : `Google Translate request failed: ${error.message}`;
                results.push(...this.failureResults(items.slice(offset), message, targetLanguage, {
                    errorCategory: error?.name === 'AbortError' ? 'timeout' : 'network-error',
                    retryable: true
                }).results);
                break;
            } finally {
                clearTimeout(timeout);
            }
        }
        return { targetLanguage, results, apiCalls };
    }

    validateResult(translation, item, protectedItem, targetLanguage) {
        const restored = restoreRuntimeSyntaxFromGoogle(
            translation?.translatedText,
            protectedItem.placeholders
        );
        if (!restored.ok) {
            return { ok: false, error: `Unusable Google Translate result: ${restored.error}`, targetLanguage };
        }
        const text = restored.text.trim();
        if (!text) {
            return { ok: false, error: 'Unusable Google Translate result: the result was empty.', targetLanguage };
        }
        const expected = [...(item.placeholders || extractPlaceholders(item.text))].sort();
        const actual = extractPlaceholders(text);
        if (expected.join('|') !== actual.join('|')) {
            return {
                ok: false,
                error: `Unusable Google Translate result: placeholders must be exactly ${expected.join(', ') || '(none)'}.`,
                targetLanguage
            };
        }
        return {
            ok: true,
            provider: 'Google Translate',
            text,
            targetLanguage,
            detectedSourceLanguage: translation.detectedSourceLanguage || null
        };
    }

    failureResults(items, error, targetLanguage, details = {}) {
        return {
            targetLanguage,
            apiCalls: details.apiCalls,
            results: items.map(() => ({
                ok: false,
                error,
                targetLanguage,
                ...details
            }))
        };
    }
}

module.exports = {
    GoogleTranslationService,
    googleTranslationConfiguration,
    protectRuntimeSyntaxForGoogle,
    restoreRuntimeSyntaxFromGoogle,
    toGoogleTargetLanguage
};
