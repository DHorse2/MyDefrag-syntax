'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { HELP_DOCUMENTS, KEYWORDS } = require('../../src/server/languageData');

const ROOT = path.resolve(__dirname, '..', '..');
const CANONICAL_PATH = path.join(ROOT, 'language', 'canonical', 'semantic-keywords.json');
const LOCALES_ROOT = path.join(ROOT, 'language', 'locales');
const INTERNAL_KEYWORDS = new Set([
    'any', 'script', 'volume_block', 'file_block', 'volume_condition',
    'filesystem', 'volume_action', 'file_condition', 'file_attribute',
    'file_action', 'sort', 'action_modifier', 'ui', 'window_state',
    'finish_action', 'priority', 'runtime', 'settinginline', 'conflict',
    'variable', 'value', 'toggle', 'operator', 'literal', 'time', 'math',
    'size_unit', 'zone', 'file_state'
]);
const SYMBOL_IDS = Object.freeze({
    '+': 'plus',
    '-': 'minus',
    '*': 'multiply',
    '/': 'divide'
});

function readJson(filePath, fallback = null) {
    return fs.existsSync(filePath)
        ? JSON.parse(fs.readFileSync(filePath, 'utf8'))
        : fallback;
}

function writeJson(filePath, value) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function normalized(value) {
    return String(value).normalize('NFC').toLocaleLowerCase('en');
}

function helpSpellings() {
    const spellings = new Map();
    for (const documents of Object.values(HELP_DOCUMENTS)) {
        for (const [keyword, helpPath] of Object.entries(documents)) {
            const base = path.basename(helpPath, path.extname(helpPath));
            if (normalized(base).replace(/[^a-z0-9]/g, '') === normalized(keyword).replace(/[^a-z0-9]/g, '')) {
                spellings.set(normalized(keyword), base);
            }
        }
    }
    return spellings;
}

function canonicalSpelling(text, existing, helpNames) {
    const key = normalized(text);
    if (existing.has(key)) return existing.get(key).canonical;
    if (helpNames.has(key)) return helpNames.get(key);
    if (SYMBOL_IDS[text]) return text;
    return `${text.charAt(0).toLocaleUpperCase('en')}${text.slice(1)}`;
}

function keywordId(text, existing) {
    const key = normalized(text);
    if (existing.has(key)) return existing.get(key).id;
    return `keyword.${SYMBOL_IDS[text] || key.replace(/_/g, '-')}`;
}

function buildCanonicalKeywords() {
    const previous = readJson(CANONICAL_PATH, { keywords: [] });
    const existing = new Map(previous.keywords.map(keyword => [normalized(keyword.canonical), keyword]));
    const helpNames = helpSpellings();
    const unique = new Map();

    for (const keyword of KEYWORDS) {
        const key = normalized(keyword.text);
        const current = unique.get(key) || { text: keyword.text, parents: [] };
        if (!current.parents.includes(keyword.parent)) current.parents.push(keyword.parent);
        unique.set(key, current);
    }

    const keywords = [...unique.values()].map(({ text, parents }) => {
        const key = normalized(text);
        const old = existing.get(key);
        const internal = INTERNAL_KEYWORDS.has(key);
        return {
            id: keywordId(text, existing),
            canonical: canonicalSpelling(text, existing, helpNames),
            category: old?.category || (internal ? 'grammar.internal' : 'syntax.keyword'),
            parent: old?.parent || parents[0],
            ...(parents.length > 1 ? { parents } : {}),
            description: old?.description || (internal
                ? 'Internal parser grammar label; never emitted into MyDefrag source.'
                : `Canonical MyDefrag spelling for ${canonicalSpelling(text, existing, helpNames)}.`),
            status: old?.status || 'approved',
            translatable: !internal,
            visible: !internal
        };
    });

    if (keywords.length !== 243 || keywords.filter(keyword => keyword.translatable).length !== 214) {
        throw new Error('Keyword inventory must contain exactly 243 entries: 214 visible and 29 internal.');
    }

    return { schemaVersion: 2, locale: 'en', keywords };
}

function migrateLocale(locale, canonical) {
    const localeRoot = path.join(LOCALES_ROOT, locale.id);
    const keywordPath = path.join(localeRoot, 'keywords.json');
    const overridePath = path.join(localeRoot, 'catalogOverrides.json');
    const existingKeywords = readJson(keywordPath, { keywords: [] }).keywords || [];
    const overrides = readJson(overridePath, { locale: locale.id, status: locale.status, entries: [] });
    const previous = new Map([
        ...(overrides.keywords || []),
        ...existingKeywords
    ].map(keyword => [keyword.id, keyword]));

    const keywords = canonical.keywords.map(keyword => {
        const old = previous.get(keyword.id);
        const translated = Boolean(old?.text && old.text !== keyword.canonical);
        const authored = Boolean(old && old.status !== 'draft');
        return {
            id: keyword.id,
            text: old?.text || keyword.canonical,
            status: old?.status || (locale.id === 'en' ? keyword.status : 'draft'),
            fallbackLocale: locale.id === 'en' || translated || authored ? null : 'en',
            translatable: keyword.translatable,
            visible: keyword.visible
        };
    });

    writeJson(keywordPath, {
        schemaVersion: 2,
        locale: locale.id,
        status: locale.status,
        keywords
    });

    if (fs.existsSync(overridePath) && Object.prototype.hasOwnProperty.call(overrides, 'keywords')) {
        delete overrides.keywords;
        writeJson(overridePath, overrides);
    }
}

function main() {
    const locales = readJson(path.join(LOCALES_ROOT, 'locales.json')).locales;
    const canonical = buildCanonicalKeywords();
    writeJson(CANONICAL_PATH, canonical);
    for (const locale of locales) migrateLocale(locale, canonical);
    process.stdout.write(`Wrote ${canonical.keywords.length} keywords for ${locales.length} locales.\n`);
}

main();
