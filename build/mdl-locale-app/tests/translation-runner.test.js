'use strict';

const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const test = require('node:test');
const {
    acquireRunnerLock,
    releaseRunnerLock,
    runTranslation
} = require('../../scripts/translate-language-fallbacks');
const { createFixture, readJson } = require('./helpers');

function generateFixture(rootDir) {
    const result = spawnSync(
        process.execPath,
        [path.join(rootDir, 'build/scripts/build-language.js'), 'build', '--UseNormalized'],
        { cwd: rootDir, encoding: 'utf8' }
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);
}

class StubDeepL {
    constructor(results, supported = ['am']) {
        this.results = [...results];
        this.supported = supported;
        this.requests = [];
    }

    async supportedTargetLanguages() {
        return {
            endpointVersion: 'fixture-v3',
            languages: this.supported.map((code) => ({ code, status: 'stable' }))
        };
    }

    async usage() {
        return { characterCount: 100, characterLimit: 100000 };
    }

    async translateText(request) {
        this.requests.push(request);
        const result = this.results.shift();
        return typeof result === 'function' ? result(request) : result;
    }
}

test('resumable runner logs each call, retries throttling, and persists immediately', async (t) => {
    const rootDir = createFixture(t);
    generateFixture(rootDir);
    const reportPath = path.join(rootDir, 'build/language/reports/deepl-calls.md');
    const translator = new StubDeepL([
        {
            ok: false,
            error: 'DeepL request failed with HTTP 429.',
            errorCategory: 'rate-limited',
            httpStatus: 429,
            retryable: true
        },
        (request) => ({
            ok: true,
            provider: 'DeepL',
            text: `Amharic ${request.text}`,
            targetLanguage: 'AM'
        })
    ]);
    const result = await runTranslation({
        rootDir,
        reportPath,
        localeIds: ['am'],
        maxCalls: 2,
        retryLimit: 1,
        retryBaseMs: 1,
        translator,
        sleep: async () => {},
        handleSignals: false,
        progress: () => {}
    });

    assert.equal(result.status, 'paused-max-calls');
    assert.equal(result.apiCalls, 2);
    assert.equal(result.persisted, 1);
    assert.equal(translator.requests.length, 2);
    const key = 'extension.product.displayName';
    const source = readJson(rootDir, 'language/locales/am/extension.json');
    assert.equal(source.entries[key].status, 'machine-generated');
    assert.match(source.entries[key].text, /^Amharic /u);
    const generated = readJson(rootDir, 'build/language/catalogs/am/extension.json');
    assert.equal(generated.entries[key].fallbackLocale, null);
    assert.equal(generated.entries[key].text, source.entries[key].text);

    const report = fs.readFileSync(reportPath, 'utf8');
    const rows = report.split(/\r?\n/u).filter((line) => /^\|\s+\d+\s+\|/u.test(line));
    assert.equal(rows.length, 2);
    assert.match(rows[0], /rate-limited/u);
    assert.match(rows[1], /persisted/u);
    assert.doesNotMatch(report, /fixture-secret|DeepL-Auth-Key/u);
    assert.match(report, /## Executive Summary[\s\S]*\*\*1\*\* catalog translation/u);
    assert.match(report, /## Rejected Items[\s\S]*No called catalog entry remains rejected/u);
});

test('runner skips targets absent from the live supported-language inventory', async (t) => {
    const rootDir = createFixture(t);
    generateFixture(rootDir);
    const translator = new StubDeepL([], ['fr']);
    const result = await runTranslation({
        rootDir,
        reportPath: path.join(rootDir, 'build/language/reports/unsupported.md'),
        localeIds: ['am'],
        translator,
        handleSignals: false,
        progress: () => {}
    });

    assert.equal(result.status, 'completed');
    assert.equal(result.apiCalls, 0);
    assert.equal(result.unsupportedLocales[0].locale, 'am');
    assert.equal(result.unsupportedLocales[0].entries, 623);
});

test('runner stops before a call that cannot fit in the reported quota', async (t) => {
    const rootDir = createFixture(t);
    generateFixture(rootDir);
    const translator = new StubDeepL([]);
    translator.usage = async () => ({ characterCount: 1000, characterLimit: 1000 });
    const result = await runTranslation({
        rootDir,
        reportPath: path.join(rootDir, 'build/language/reports/quota.md'),
        localeIds: ['am'],
        translator,
        handleSignals: false,
        progress: () => {}
    });

    assert.equal(result.status, 'quota-preflight-stop');
    assert.equal(result.apiCalls, 0);
    assert.equal(result.persisted, 0);
});

test('runner circuit breaker stops repeated non-retryable request errors', async (t) => {
    const rootDir = createFixture(t);
    generateFixture(rootDir);
    const failures = Array.from({ length: 3 }, () => ({
        ok: false,
        error: 'DeepL request failed with HTTP 400.',
        errorCategory: 'request-error',
        httpStatus: 400,
        retryable: false
    }));
    const translator = new StubDeepL(failures);
    const result = await runTranslation({
        rootDir,
        reportPath: path.join(rootDir, 'build/language/reports/circuit-breaker.md'),
        localeIds: ['am'],
        translator,
        systemicFailureLimit: 3,
        sleep: async () => {},
        handleSignals: false,
        progress: () => {}
    });

    assert.equal(result.status, 'systemic-request-error-stop');
    assert.equal(result.apiCalls, 3);
    assert.equal(result.failed, 3);
    const report = fs.readFileSync(result.reportPath, 'utf8');
    assert.match(report, /## Rejected Items[\s\S]*3 called catalog entries/u);
    assert.equal(report.trimEnd().endsWith('<!-- deepl-rejected-summary-end -->'), true);

    await runTranslation({
        rootDir,
        reportPath: result.reportPath,
        preflightOnly: true,
        translator: new StubDeepL([]),
        handleSignals: false,
        progress: () => {}
    });
    const preflightReport = fs.readFileSync(result.reportPath, 'utf8');
    assert.match(preflightReport, /## Rejected Items[\s\S]*3 called catalog entries/u);
    assert.equal(
        preflightReport.trimEnd().endsWith('<!-- deepl-rejected-summary-end -->'),
        true
    );
});

test('runner lock rejects a concurrent process and is removable by its owner', async (t) => {
    const rootDir = createFixture(t);
    const lockPath = path.join(
        rootDir,
        'build/language/reports/deepl-translation-runner.lock'
    );
    const lock = acquireRunnerLock(lockPath, { runId: 'first' });
    try {
        await assert.rejects(
            runTranslation({
                rootDir,
                reportPath: path.join(rootDir, 'build/language/reports/locked.md'),
                translator: new StubDeepL([]),
                handleSignals: false,
                progress: () => {}
            }),
            /Another DeepL translation runner is active/u
        );
    } finally {
        releaseRunnerLock(lock);
    }
    assert.equal(fs.existsSync(lockPath), false);
});
