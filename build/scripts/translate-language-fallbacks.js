'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
    DeepLTranslationService,
    toDeepLTargetLanguage
} = require('../language/translation/deepl-translation-service');
const { normalizeText } = require('../language/translation/text-normalizer');
const {
    loadLanguageState,
    persistLocaleTranslationEntry,
    validateLanguageState
} = require('./build-language');

const ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_REPORT = 'build/language/reports/deepl-catalog-entry-calls.md';
const EXECUTIVE_START = '<!-- deepl-executive-summary-start -->';
const EXECUTIVE_END = '<!-- deepl-executive-summary-end -->';
const SUMMARY_START = '<!-- deepl-call-summary-start -->';
const SUMMARY_END = '<!-- deepl-call-summary-end -->';
const REJECTED_START = '<!-- deepl-rejected-summary-start -->';
const REJECTED_END = '<!-- deepl-rejected-summary-end -->';
const CALL_ROW_PATTERN = /^\|\s+\d+\s+\|/u;
const CALL_ROW_FIELDS = /^\| (?<sequence>\d+) \| (?<timestamp>.*?) \| (?<runId>.*?) \| (?<locale>.*?) \| (?<component>.*?) \| (?<key>.*?) \| (?<target>.*?) \| (?<characters>\d+) \| (?<attempt>\d+) \| (?<outcome>.*?) \| (?<http>.*?) \| (?<detail>.*) \|$/u;

function positiveInteger(value, label, options = {}) {
    const number = Number.parseInt(value, 10);
    if (!Number.isSafeInteger(number) || number < (options.allowZero ? 0 : 1)) {
        throw new Error(`${label} must be ${options.allowZero ? 'a non-negative' : 'a positive'} integer.`);
    }
    return number;
}

function parseCommandLine(argv = [], rootDir = ROOT) {
    const options = {
        rootDir: path.resolve(rootDir),
        reportPath: null,
        localeIds: [],
        maxCalls: Number.POSITIVE_INFINITY,
        retryLimit: 4,
        retryBaseMs: 1000,
        systemicFailureLimit: 5,
        callsPerMinute: 30,
        preflightOnly: false
    };
    for (const argument of argv) {
        if (argument === '--PreflightOnly') {
            options.preflightOnly = true;
        } else if (argument.startsWith('--Report=')) {
            options.reportPath = argument.slice('--Report='.length).trim();
        } else if (argument.startsWith('--Locale=')) {
            const localeId = argument.slice('--Locale='.length).trim();
            if (!localeId) { throw new Error('--Locale requires a locale identifier.'); }
            options.localeIds.push(localeId);
        } else if (argument.startsWith('--MaxCalls=')) {
            options.maxCalls = positiveInteger(
                argument.slice('--MaxCalls='.length),
                '--MaxCalls'
            );
        } else if (argument.startsWith('--RetryLimit=')) {
            options.retryLimit = positiveInteger(
                argument.slice('--RetryLimit='.length),
                '--RetryLimit',
                { allowZero: true }
            );
        } else if (argument.startsWith('--RetryBaseMs=')) {
            options.retryBaseMs = positiveInteger(
                argument.slice('--RetryBaseMs='.length),
                '--RetryBaseMs'
            );
        } else if (argument.startsWith('--SystemicFailureLimit=')) {
            options.systemicFailureLimit = positiveInteger(
                argument.slice('--SystemicFailureLimit='.length),
                '--SystemicFailureLimit'
            );
        } else if (argument.startsWith('--CallsPerMinute=')) {
            options.callsPerMinute = positiveInteger(
                argument.slice('--CallsPerMinute='.length),
                '--CallsPerMinute'
            );
        } else {
            throw new Error(`Unknown translation runner option: ${argument}`);
        }
    }
    const requestedReport = options.reportPath || DEFAULT_REPORT;
    options.reportPath = path.isAbsolute(requestedReport)
        ? path.resolve(requestedReport)
        : path.resolve(options.rootDir, requestedReport);
    options.localeIds = Array.from(new Set(options.localeIds));
    return options;
}

function readGeneratedComponent(rootDir, localeId, componentId, cache) {
    const identity = `${localeId}\0${componentId}`;
    if (!cache.has(identity)) {
        const filePath = path.join(
            rootDir,
            'build',
            'language',
            'catalogs',
            localeId,
            `${componentId}.json`
        );
        if (!fs.existsSync(filePath)) {
            throw new Error(`Generated component catalog is missing: ${filePath}`);
        }
        const document = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (document.locale !== localeId || document.component !== componentId
            || !document.entries || Array.isArray(document.entries)
            || typeof document.entries !== 'object') {
            throw new Error(`Generated component catalog has invalid identity or entries: ${filePath}`);
        }
        cache.set(identity, document);
    }
    return cache.get(identity);
}

function collectFallbackWork(state, rootDir = ROOT, options = {}) {
    const localeFilter = options.localeIds?.length > 0
        ? new Set(options.localeIds)
        : null;
    const knownLocales = new Set((state.locales.locales || []).map((locale) => locale.id));
    for (const localeId of localeFilter || []) {
        if (!knownLocales.has(localeId) || localeId === 'en') {
            throw new Error(`Unknown non-English locale requested: ${localeId}`);
        }
    }
    const generatedCache = new Map();
    const work = [];
    const staleAuthored = [];
    for (const locale of state.locales.locales || []) {
        if (locale.id === 'en' || (localeFilter && !localeFilter.has(locale.id))) { continue; }
        const authored = new Set(
            (state.localeCatalogs[locale.id]?.entries || []).map((entry) => entry.key)
        );
        for (const canonicalEntry of state.catalog.entries || []) {
            const generated = readGeneratedComponent(
                rootDir,
                locale.id,
                canonicalEntry.component,
                generatedCache
            ).entries[canonicalEntry.key];
            if (!generated || generated.fallbackLocale !== 'en') { continue; }
            if (authored.has(canonicalEntry.key)) {
                staleAuthored.push({
                    locale: locale.id,
                    component: canonicalEntry.component,
                    key: canonicalEntry.key
                });
                continue;
            }
            const sourceText = normalizeText(
                canonicalEntry.text,
                state.normalizedWords,
                { preserveRuntimeSyntax: true }
            );
            work.push({
                locale: locale.id,
                component: canonicalEntry.component,
                key: canonicalEntry.key,
                sourceText,
                characters: Array.from(sourceText).length,
                placeholders: canonicalEntry.placeholders || [],
                targetLanguage: toDeepLTargetLanguage(locale.id)
            });
        }
    }
    return { work, staleAuthored };
}

function supportedTargetSet(support) {
    return new Set((support.languages || [])
        .map((language) => String(language.code || '').toLocaleLowerCase())
        .filter(Boolean));
}

function effectiveRemainingCharacters(usage) {
    const remaining = [];
    if (Number.isFinite(usage.characterCount) && Number.isFinite(usage.characterLimit)) {
        remaining.push(Math.max(0, usage.characterLimit - usage.characterCount));
    }
    if (Number.isFinite(usage.apiKeyCharacterCount)
        && Number.isFinite(usage.apiKeyCharacterLimit)) {
        remaining.push(Math.max(0, usage.apiKeyCharacterLimit - usage.apiKeyCharacterCount));
    }
    return remaining.length > 0 ? Math.min(...remaining) : null;
}

function groupWorkByLocale(work) {
    const result = new Map();
    for (const item of work) {
        if (!result.has(item.locale)) {
            result.set(item.locale, { entries: 0, characters: 0 });
        }
        const aggregate = result.get(item.locale);
        aggregate.entries += 1;
        aggregate.characters += item.characters;
    }
    return result;
}

function markdownCell(value) {
    return String(value ?? '-')
        .replace(/\r?\n/gu, ' ')
        .replace(/\|/gu, '\\|')
        .replace(/`/gu, '\\`');
}

function reportCallCount(reportPath) {
    if (!fs.existsSync(reportPath)) { return 0; }
    return fs.readFileSync(reportPath, 'utf8')
        .split(/\r?\n/u)
        .filter((line) => CALL_ROW_PATTERN.test(line))
        .length;
}

function renderSummary(summary) {
    const unsupported = summary.unsupportedLocales.length > 0
        ? summary.unsupportedLocales
            .map((item) => `\`${item.locale}\` (${item.entries} entries)`).join(', ')
        : 'None';
    const remaining = Number.isFinite(summary.remainingCharactersAtStart)
        ? summary.remainingCharactersAtStart.toLocaleString('en-US')
        : 'Unavailable';
    return [
        '## Summary',
        '',
        `- Status: ${summary.status}`,
        `- Last run ID: \`${summary.runId}\``,
        `- Last updated: ${summary.updatedAt}`,
        `- DeepL language inventory endpoint: ${summary.languageEndpoint}`,
        `- DeepL characters used at start: ${summary.characterCountAtStart ?? 'Unavailable'}`,
        `- DeepL characters used at end: ${summary.characterCountAtEnd ?? 'Unavailable'}`,
        `- DeepL character limit: ${summary.characterLimit ?? 'Unavailable'}`,
        `- Effective characters remaining at start: ${remaining}`,
        `- Effective characters remaining at end: ${Number.isFinite(summary.remainingCharactersAtEnd)
            ? summary.remainingCharactersAtEnd.toLocaleString('en-US')
            : 'Unavailable'}`,
        `- DeepL characters consumed this run: ${Number.isFinite(summary.charactersConsumed)
            ? summary.charactersConsumed.toLocaleString('en-US')
            : 'Unavailable'}`,
        `- Supported fallback entries planned this run: ${summary.plannedEntries}`,
        `- Planned source characters this run: ${summary.plannedCharacters}`,
        `- Translation call rate limit: ${summary.callsPerMinute} per minute`,
        `- API call lines recorded across all runs: ${summary.totalReportCalls}`,
        `- API calls made this run: ${summary.apiCalls}`,
        `- Entries persisted this run: ${summary.persisted}`,
        `- Failed entries this run: ${summary.failed}`,
        `- Source characters submitted this run: ${summary.charactersSubmitted}`,
        `- Supported fallback entries remaining: ${summary.supportedRemaining}`,
        `- Unsupported locale work: ${unsupported}`,
        `- Stale authored/output conflicts skipped: ${summary.staleAuthored}`
    ].join('\n');
}

function renderExecutiveSummary(summary) {
    const unsupportedEntries = summary.unsupportedLocales
        .reduce((total, item) => total + item.entries, 0);
    const unsupportedSentence = summary.unsupportedLocales.length > 0
        ? `${summary.unsupportedLocales.map((item) => `\`${item.locale}\``).join(' and ')} `
            + 'are unsupported by the live DeepL target-language inventory, leaving '
            + `**${unsupportedEntries.toLocaleString('en-US')}** entries unsubmitted.`
        : 'Every requested project locale is supported by the live DeepL '
            + 'target-language inventory; no entry was excluded for language support.';
    const quota = Number.isFinite(summary.remainingCharactersAtEnd)
        ? `${summary.remainingCharactersAtEnd.toLocaleString('en-US')} DeepL characters remain.`
        : `${Number.isFinite(summary.remainingCharactersAtStart)
            ? summary.remainingCharactersAtStart.toLocaleString('en-US')
            : 'An unknown number of'} DeepL characters remained at preflight.`;
    return [
        '## Executive Summary',
        '',
        `The latest run finished with status **${summary.status}**. It persisted `
            + `**${summary.persisted.toLocaleString('en-US')}** catalog translation`
            + `${summary.persisted === 1 ? '' : 's'}; `
            + `**${summary.supportedRemaining.toLocaleString('en-US')}** supported English `
            + 'fallback entries remain.',
        '',
        `${unsupportedSentence} ${quota} The audit preserves `
            + `**${summary.totalReportCalls.toLocaleString('en-US')}** `
            + 'one-line API call records, including retries and earlier failed attempts.',
        '',
        'The exact unresolved called entries are consolidated in '
            + '[Rejected Items](#rejected-items) at the end of this report.'
    ].join('\n');
}

function initializeReport(reportPath, summary) {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    if (fs.existsSync(reportPath)) {
        const content = fs.readFileSync(reportPath, 'utf8');
        if (!content.startsWith('# DeepL Catalog Translation Call Report\n')
            || !content.includes(SUMMARY_START)
            || !content.includes(SUMMARY_END)) {
            throw new Error(`Existing report is not a compatible resumable report: ${reportPath}`);
        }
        clearRejectedSummary(reportPath);
        return;
    }
    const content = [
        '# DeepL Catalog Translation Call Report',
        '',
        '<!-- markdownlint-disable MD013 -->',
        '',
        EXECUTIVE_START,
        renderExecutiveSummary(summary),
        EXECUTIVE_END,
        '',
        'This resumable report records one physical table row for every DeepL',
        'catalog-entry translation request. It never records API credentials.',
        '',
        '## Table of Contents',
        '',
        '- [Executive Summary](#executive-summary)',
        '- [Summary](#summary)',
        '- [Entry Calls](#entry-calls)',
        '- [Rejected Items](#rejected-items)',
        '',
        SUMMARY_START,
        renderSummary(summary),
        SUMMARY_END,
        '',
        '## Entry Calls',
        '',
        '| Call | UTC | Run | Locale | Component | Catalog key | Target | Characters | Attempt | Outcome | HTTP | Detail |',
        '| ---: | --- | --- | --- | --- | --- | --- | ---: | ---: | --- | ---: | --- |',
        ''
    ].join('\n');
    fs.writeFileSync(reportPath, content, 'utf8');
}

function clearRejectedSummary(reportPath) {
    if (!fs.existsSync(reportPath)) { return; }
    const content = fs.readFileSync(reportPath, 'utf8');
    const start = content.indexOf(REJECTED_START);
    const end = content.indexOf(REJECTED_END);
    if (start < 0 && end < 0) { return; }
    if (start < 0 || end < start) {
        throw new Error(`Rejected-item summary markers are inconsistent: ${reportPath}`);
    }
    const updated = `${content.slice(0, start).trimEnd()}\n`;
    fs.writeFileSync(reportPath, updated, 'utf8');
}

function summarizeRejectedReport(reportPath) {
    const content = fs.readFileSync(reportPath, 'utf8');
    const callsByIdentity = new Map();
    for (const line of content.split(/\r?\n/u)) {
        const fields = line.match(CALL_ROW_FIELDS)?.groups;
        if (!fields) { continue; }
        const identity = `${fields.locale}\0${fields.key}`;
        if (!callsByIdentity.has(identity)) {
            callsByIdentity.set(identity, { calls: [], persisted: false });
        }
        const record = callsByIdentity.get(identity);
        record.calls.push(fields);
        if (fields.outcome === 'persisted') { record.persisted = true; }
    }
    const rejected = Array.from(callsByIdentity.values())
        .filter((record) => !record.persisted)
        .map((record) => ({
            ...record.calls.at(-1),
            calls: record.calls.length
        }))
        .sort((left, right) => (
            left.locale.localeCompare(right.locale)
            || left.key.localeCompare(right.key)
        ));
    const groups = new Map();
    for (const item of rejected) {
        const identity = `${item.locale} / ${item.outcome}`;
        groups.set(identity, (groups.get(identity) || 0) + 1);
    }
    const lines = [
        REJECTED_START,
        '## Rejected Items',
        '',
        rejected.length > 0
            ? `${rejected.length} called catalog entries have no persisted DeepL result.`
            : 'No called catalog entry remains rejected or unresolved.',
        ''
    ];
    if (groups.size > 0) {
        lines.push('### Rejected Counts', '');
        for (const [label, count] of Array.from(groups.entries()).sort()) {
            lines.push(`- ${label}: ${count}`);
        }
        lines.push('', '### Rejected Catalog Keys', '');
        lines.push('| Locale | Component | Catalog key | Calls | Last outcome | HTTP | Detail |');
        lines.push('| --- | --- | --- | ---: | --- | ---: | --- |');
        for (const item of rejected) {
            lines.push(`| ${[
                item.locale,
                item.component,
                item.key,
                item.calls,
                item.outcome,
                item.http,
                item.detail
            ].map(markdownCell).join(' | ')} |`);
        }
        lines.push('');
    }
    lines.push(REJECTED_END, '');
    clearRejectedSummary(reportPath);
    fs.appendFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8');
    return rejected;
}

function updateReportSummary(reportPath, summary) {
    const content = fs.readFileSync(reportPath, 'utf8');
    const start = content.indexOf(SUMMARY_START);
    const end = content.indexOf(SUMMARY_END);
    if (start < 0 || end < start) {
        throw new Error(`Report summary markers are missing: ${reportPath}`);
    }
    const replacement = `${SUMMARY_START}\n${renderSummary(summary)}\n${SUMMARY_END}`;
    let updated = `${content.slice(0, start)}${replacement}${content.slice(end + SUMMARY_END.length)}`;
    const executiveStart = updated.indexOf(EXECUTIVE_START);
    const executiveEnd = updated.indexOf(EXECUTIVE_END);
    if (executiveStart >= 0 && executiveEnd > executiveStart) {
        const executiveReplacement = `${EXECUTIVE_START}\n${renderExecutiveSummary(summary)}\n${EXECUTIVE_END}`;
        updated = `${updated.slice(0, executiveStart)}${executiveReplacement}`
            + `${updated.slice(executiveEnd + EXECUTIVE_END.length)}`;
    }
    const transaction = `${process.pid}-${crypto.randomBytes(4).toString('hex')}`;
    const temporary = `${reportPath}.${transaction}.tmp`;
    const backup = `${reportPath}.${transaction}.bak`;
    fs.writeFileSync(temporary, updated, { encoding: 'utf8', flag: 'wx' });
    try {
        fs.renameSync(reportPath, backup);
        fs.renameSync(temporary, reportPath);
        fs.unlinkSync(backup);
    } catch (error) {
        if (!fs.existsSync(reportPath) && fs.existsSync(backup)) {
            fs.renameSync(backup, reportPath);
        }
        if (fs.existsSync(temporary)) { fs.unlinkSync(temporary); }
        throw error;
    }
}

function appendCallLine(reportPath, call) {
    const cells = [
        call.sequence,
        call.timestamp,
        call.runId,
        call.locale,
        call.component,
        call.key,
        call.targetLanguage,
        call.characters,
        call.attempt,
        call.outcome,
        call.httpStatus ?? '-',
        call.detail || '-'
    ].map(markdownCell);
    fs.appendFileSync(reportPath, `| ${cells.join(' | ')} |\n`, 'utf8');
}

function classifyResult(result) {
    if (result?.ok) { return 'translated'; }
    if (result?.errorCategory) { return result.errorCategory; }
    const message = String(result?.error || '').toLocaleLowerCase();
    if (message.includes('http 456') || message.includes('quota')) { return 'quota-exhausted'; }
    if (message.includes('http 429') || message.includes('rate')) { return 'rate-limited'; }
    if (message.includes('timed out')) { return 'timeout'; }
    if (message.includes('http 401') || message.includes('http 403')) { return 'authentication'; }
    if (message.includes('request failed')) { return 'network-error'; }
    return 'translation-failed';
}

function delay(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function preflightWithRetry(label, action, options) {
    for (let attempt = 1; attempt <= options.retryLimit + 1; attempt += 1) {
        try {
            return await action();
        } catch (error) {
            const category = error.category || (
                error.httpStatus === 429 ? 'rate-limited' : 'preflight-error'
            );
            const retryable = category === 'rate-limited'
                || category === 'timeout'
                || category === 'provider-error'
                || (!error.httpStatus && category !== 'authentication');
            if (!retryable || attempt > options.retryLimit) { throw error; }
            const waitMs = Math.max(error.retryAfterMs || 0, Math.min(
                options.retryBaseMs * (2 ** (attempt - 1)),
                30000
            ));
            options.progress(
                `DeepL ${label} ${category}; retrying in ${waitMs} ms.`
            );
            await options.sleep(waitMs);
        }
    }
    throw new Error(`DeepL ${label} preflight did not complete.`);
}

function createCallRateLimiter(callsPerMinute, sleep, clock = Date.now) {
    const intervalMs = 60000 / callsPerMinute;
    let nextCallAt = 0;
    return async () => {
        const current = clock();
        if (nextCallAt > current) {
            await sleep(Math.ceil(nextCallAt - current));
        }
        nextCallAt = Math.max(nextCallAt, clock()) + intervalMs;
    };
}

function processIsRunning(pid) {
    if (!Number.isSafeInteger(pid) || pid <= 0) { return false; }
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        return error.code === 'EPERM';
    }
}

function acquireRunnerLock(lockPath, details = {}) {
    fs.mkdirSync(path.dirname(lockPath), { recursive: true });
    const token = crypto.randomBytes(12).toString('hex');
    const record = {
        pid: process.pid,
        runId: details.runId || null,
        startedAt: new Date().toISOString(),
        token
    };
    for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
            const descriptor = fs.openSync(lockPath, 'wx');
            fs.writeFileSync(descriptor, `${JSON.stringify(record)}\n`, 'utf8');
            return { descriptor, lockPath, token };
        } catch (error) {
            if (error.code !== 'EEXIST') { throw error; }
            let existing = {};
            try {
                existing = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
            } catch (readError) {
                throw new Error(
                    `The DeepL translation runner lock is unreadable; retry after any `
                    + `starting runner has exited: ${lockPath}`,
                    { cause: readError }
                );
            }
            if (processIsRunning(Number(existing.pid))) {
                throw new Error(
                    `Another DeepL translation runner is active (PID ${existing.pid}, `
                    + `run ${existing.runId || 'unknown'}).`
                );
            }
            fs.unlinkSync(lockPath);
        }
    }
    throw new Error(`Unable to acquire DeepL translation runner lock: ${lockPath}`);
}

function releaseRunnerLock(lock) {
    if (!lock) { return; }
    try {
        fs.closeSync(lock.descriptor);
    } finally {
        if (!fs.existsSync(lock.lockPath)) { return; }
        let current = {};
        try {
            current = JSON.parse(fs.readFileSync(lock.lockPath, 'utf8'));
        } catch {
            return;
        }
        if (current.token === lock.token) {
            fs.unlinkSync(lock.lockPath);
        }
    }
}

async function runTranslationUnlocked(options = {}) {
    const rootDir = path.resolve(options.rootDir || ROOT);
    const translator = options.translator || new DeepLTranslationService({
        environment: options.environment || process.env
    });
    const progress = options.progress || ((message) => console.log(message));
    const sleep = options.sleep || delay;
    const now = options.now || (() => new Date());
    const maxCalls = Number.isFinite(options.maxCalls)
        ? options.maxCalls
        : Number.POSITIVE_INFINITY;
    const retryLimit = Number.isSafeInteger(options.retryLimit) ? options.retryLimit : 4;
    const retryBaseMs = Number.isSafeInteger(options.retryBaseMs) ? options.retryBaseMs : 1000;
    const systemicFailureLimit = Number.isSafeInteger(options.systemicFailureLimit)
        ? options.systemicFailureLimit
        : 5;
    const callsPerMinute = Number.isSafeInteger(options.callsPerMinute)
        ? options.callsPerMinute
        : 30;
    const waitForCallSlot = createCallRateLimiter(
        callsPerMinute,
        sleep,
        options.rateClock || Date.now
    );
    const runId = options.runId || crypto.randomBytes(4).toString('hex');
    const reportPath = path.resolve(options.reportPath || path.join(rootDir, DEFAULT_REPORT));
    const state = loadLanguageState(rootDir);
    const validation = validateLanguageState(state, rootDir);
    if (validation.errors.length > 0) {
        throw new Error(`Language validation failed:\n${validation.errors.join('\n')}`);
    }
    const inventory = collectFallbackWork(state, rootDir, options);
    if (inventory.staleAuthored.length > 0) {
        progress(
            `Skipping ${inventory.staleAuthored.length} fallback output(s) that already have durable authored values.`
        );
    }
    progress('DeepL preflight: retrieving supported targets and current usage.');
    const preflightOptions = {
        retryLimit,
        retryBaseMs,
        progress,
        sleep
    };
    const support = await preflightWithRetry(
        'supported-language',
        () => translator.supportedTargetLanguages(),
        preflightOptions
    );
    const usage = await preflightWithRetry(
        'usage',
        () => translator.usage(),
        preflightOptions
    );
    const supported = supportedTargetSet(support);
    const supportedWork = inventory.work.filter((item) => (
        supported.has(String(item.targetLanguage || '').toLocaleLowerCase())
    ));
    const unsupportedWork = inventory.work.filter((item) => (
        !supported.has(String(item.targetLanguage || '').toLocaleLowerCase())
    ));
    const unsupportedLocales = Array.from(groupWorkByLocale(unsupportedWork).entries())
        .map(([locale, counts]) => ({ locale, ...counts }));
    const plannedCharacters = supportedWork.reduce((total, item) => total + item.characters, 0);
    const remainingCharactersAtStart = effectiveRemainingCharacters(usage);
    let sequence = reportCallCount(reportPath) + 1;
    let stopRequested = false;
    let stopStatus = null;
    let apiCalls = 0;
    let persisted = 0;
    let failed = 0;
    let charactersSubmitted = 0;
    let consecutiveRequestErrors = 0;
    const summary = {
        status: options.preflightOnly ? 'preflight-only' : 'running',
        runId,
        updatedAt: now().toISOString(),
        languageEndpoint: support.endpointVersion,
        characterCountAtStart: usage.characterCount,
        characterCountAtEnd: null,
        characterLimit: usage.characterLimit,
        remainingCharactersAtStart,
        remainingCharactersAtEnd: null,
        charactersConsumed: null,
        plannedEntries: supportedWork.length,
        plannedCharacters,
        callsPerMinute,
        totalReportCalls: sequence - 1,
        apiCalls,
        persisted,
        failed,
        charactersSubmitted,
        supportedRemaining: supportedWork.length,
        unsupportedLocales,
        staleAuthored: inventory.staleAuthored.length
    };
    initializeReport(reportPath, summary);
    updateReportSummary(reportPath, summary);

    progress(
        `DeepL preflight: ${supportedWork.length} supported fallback entries `
        + `(${plannedCharacters} characters); ${unsupportedWork.length} unsupported entries.`
    );
    if (options.preflightOnly) {
        summarizeRejectedReport(reportPath);
        return { ...summary, reportPath, support, usage };
    }

    const signalHandler = () => {
        stopRequested = true;
        stopStatus = 'interrupted';
        progress('Stop requested; finishing the current catalog entry before pausing.');
    };
    if (options.handleSignals !== false) {
        process.once('SIGINT', signalHandler);
        process.once('SIGTERM', signalHandler);
    }
    try {
        for (const [index, item] of supportedWork.entries()) {
            if (stopRequested) { break; }
            if (apiCalls >= maxCalls) {
                stopStatus = 'paused-max-calls';
                break;
            }
            if (Number.isFinite(remainingCharactersAtStart)
                && charactersSubmitted + item.characters > remainingCharactersAtStart) {
                stopStatus = 'quota-preflight-stop';
                break;
            }

            let entryComplete = false;
            for (let attempt = 1; attempt <= retryLimit + 1; attempt += 1) {
                if (apiCalls >= maxCalls) {
                    stopStatus = 'paused-max-calls';
                    stopRequested = true;
                    break;
                }
                let result;
                await waitForCallSlot();
                try {
                    result = await translator.translateText({
                        targetLocale: item.locale,
                        text: item.sourceText,
                        placeholders: item.placeholders
                    });
                } catch (error) {
                    result = {
                        ok: false,
                        error: error.message,
                        errorCategory: error.category || 'network-error',
                        httpStatus: error.httpStatus || null,
                        retryable: true
                    };
                }
                apiCalls += 1;
                charactersSubmitted += item.characters;
                const category = classifyResult(result);
                let outcome = category;
                let detail = result.error || '-';
                if (result.ok) {
                    try {
                        persistLocaleTranslationEntry(state, rootDir, item.locale, item.key, {
                            text: result.text,
                            status: 'machine-generated'
                        });
                        persisted += 1;
                        entryComplete = true;
                        outcome = 'persisted';
                        detail = 'Durable source and generated catalog updated.';
                        consecutiveRequestErrors = 0;
                    } catch (error) {
                        failed += 1;
                        outcome = 'persistence-failed';
                        detail = error.message;
                        stopRequested = true;
                        stopStatus = 'persistence-failed';
                    }
                } else if (!result.retryable || attempt > retryLimit) {
                    failed += 1;
                    entryComplete = true;
                    if (category === 'request-error') {
                        consecutiveRequestErrors += 1;
                    } else if (category !== 'rate-limited') {
                        consecutiveRequestErrors = 0;
                    }
                }
                appendCallLine(reportPath, {
                    sequence,
                    timestamp: now().toISOString(),
                    runId,
                    locale: item.locale,
                    component: item.component,
                    key: item.key,
                    targetLanguage: item.targetLanguage,
                    characters: item.characters,
                    attempt,
                    outcome,
                    httpStatus: result.httpStatus ?? (result.ok ? 200 : null),
                    detail
                });
                sequence += 1;

                if (category === 'quota-exhausted') {
                    stopRequested = true;
                    stopStatus = 'quota-exhausted';
                    break;
                }
                if (category === 'authentication') {
                    stopRequested = true;
                    stopStatus = 'authentication-failed';
                    break;
                }
                if (consecutiveRequestErrors >= systemicFailureLimit) {
                    stopRequested = true;
                    stopStatus = 'systemic-request-error-stop';
                    break;
                }
                if (result.ok || stopRequested || entryComplete) { break; }
                const waitMs = Math.max(result.retryAfterMs || 0, Math.min(
                    retryBaseMs * (2 ** (attempt - 1)),
                    30000
                ));
                progress(
                    `DeepL ${category} for ${item.locale}/${item.key}; retrying in ${waitMs} ms.`
                );
                await sleep(waitMs);
            }
            if (persisted > 0 && persisted % 25 === 0) {
                progress(
                    `DeepL progress: ${persisted}/${supportedWork.length} entries persisted; `
                    + `${apiCalls} API calls.`
                );
            }
            summary.updatedAt = now().toISOString();
            summary.totalReportCalls = sequence - 1;
            summary.apiCalls = apiCalls;
            summary.persisted = persisted;
            summary.failed = failed;
            summary.charactersSubmitted = charactersSubmitted;
            summary.supportedRemaining = Math.max(0, supportedWork.length - persisted);
            if ((index + 1) % 25 === 0 || stopRequested) {
                updateReportSummary(reportPath, summary);
            }
        }
    } finally {
        if (options.handleSignals !== false) {
            process.removeListener('SIGINT', signalHandler);
            process.removeListener('SIGTERM', signalHandler);
        }
    }

    const finalState = loadLanguageState(rootDir);
    const finalValidation = validateLanguageState(finalState, rootDir);
    if (finalValidation.errors.length > 0) {
        stopStatus = 'validation-failed';
    }
    summary.status = stopStatus || (failed > 0 ? 'completed-with-failures' : 'completed');
    summary.updatedAt = now().toISOString();
    summary.totalReportCalls = reportCallCount(reportPath);
    summary.apiCalls = apiCalls;
    summary.persisted = persisted;
    summary.failed = failed;
    summary.charactersSubmitted = charactersSubmitted;
    summary.supportedRemaining = collectFallbackWork(finalState, rootDir, options).work
        .filter((item) => supported.has(String(item.targetLanguage || '').toLocaleLowerCase()))
        .length;
    try {
        const usageAtEnd = await preflightWithRetry(
            'postflight-usage',
            () => translator.usage(),
            preflightOptions
        );
        summary.characterCountAtEnd = usageAtEnd.characterCount;
        summary.remainingCharactersAtEnd = effectiveRemainingCharacters(usageAtEnd);
        summary.charactersConsumed = Number.isFinite(usage.characterCount)
            && Number.isFinite(usageAtEnd.characterCount)
            ? Math.max(0, usageAtEnd.characterCount - usage.characterCount)
            : null;
    } catch (error) {
        progress(`DeepL postflight usage unavailable: ${error.message}`);
    }
    updateReportSummary(reportPath, summary);
    summarizeRejectedReport(reportPath);
    if (finalValidation.errors.length > 0) {
        throw new Error(`Post-translation validation failed:\n${finalValidation.errors.join('\n')}`);
    }
    progress(
        `DeepL runner ${summary.status}: ${persisted} persisted, ${failed} failed, `
        + `${apiCalls} API calls. Report: ${path.relative(rootDir, reportPath)}`
    );
    return { ...summary, reportPath, support, usage };
}

async function runTranslation(options = {}) {
    const rootDir = path.resolve(options.rootDir || ROOT);
    const runId = options.runId || crypto.randomBytes(4).toString('hex');
    const reportPath = path.resolve(options.reportPath || path.join(rootDir, DEFAULT_REPORT));
    const lockPath = path.resolve(
        options.lockPath || path.join(rootDir, 'build/language/reports/deepl-translation-runner.lock')
    );
    const lock = options.acquireLock === false
        ? null
        : acquireRunnerLock(lockPath, { runId });
    try {
        return await runTranslationUnlocked({ ...options, rootDir, reportPath, runId });
    } finally {
        releaseRunnerLock(lock);
    }
}

async function main() {
    const options = parseCommandLine(process.argv.slice(2));
    await runTranslation(options);
}

if (require.main === module) {
    void main().catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    });
}

module.exports = {
    acquireRunnerLock,
    collectFallbackWork,
    createCallRateLimiter,
    effectiveRemainingCharacters,
    initializeReport,
    parseCommandLine,
    preflightWithRetry,
    releaseRunnerLock,
    runTranslation,
    summarizeRejectedReport,
    supportedTargetSet,
    updateReportSummary
};
