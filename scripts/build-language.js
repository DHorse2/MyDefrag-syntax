// scripts/build-language.js
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LANGUAGE_ROOT = path.join(ROOT, 'language');
const BUILD_ROOT = path.join(ROOT, 'build', 'language');
const VALID_STATUSES = new Set([
    'draft',
    'machine-generated',
    'native-review-required',
    'reviewed',
    'approved',
    'deprecated'
]);
const EXPECTED_LOCALES = [
    'en',
    'zh-Hans',
    'sw',
    'am',
    'ha',
    'yo',
    'ig',
    'zu',
    'xh',
    'af',
    'ar',
    'fr',
    'pt'
];

function main() {
    const action = process.argv[2] || 'build';
    const state = loadLanguageState();
    const result = validateLanguageState(state);

    if (action === 'validate') {
        printValidation(result);
        process.exit(result.errors.length > 0 ? 1 : 0);
    }

    if (action === 'build') {
        if (result.errors.length > 0) {
            printValidation(result);
            process.exit(1);
        }

        const reports = buildLanguageOutputs(state, result);
        printBuildSummary(reports);
        return;
    }

    if (action === 'report') {
        if (result.errors.length > 0) {
            printValidation(result);
            process.exit(1);
        }

        const reports = buildLanguageOutputs(state, result);
        printReportSummary(reports);
        return;
    }

    console.error(`Unknown language build action: ${action}`);
    process.exit(1);
}

function loadLanguageState() {
    return {
        schemas: readJsonFiles(path.join(LANGUAGE_ROOT, 'schema')),
        components: readJson('language/canonical/components.json'),
        catalog: readJson('language/canonical/component-catalog.json'),
        keywords: readJson('language/canonical/semantic-keywords.json'),
        diagnostics: readJson('language/canonical/diagnostic-messages.json'),
        previewModes: readJson('language/canonical/preview-modes.json'),
        variableMapExample: readJson('language/canonical/project-variable-map.example.json'),
        locales: readJson('language/locales/locales.json'),
        localeCatalogs: loadLocaleCatalogs()
    };
}

function validateLanguageState(state) {
    const errors = [];
    const warnings = [];
    const componentIds = new Set();
    const catalogKeys = new Set();
    const keywordIds = new Set();
    const keywordCanonicals = new Set();
    const localeIds = new Set();

    for (const schema of state.schemas) {
        requireFields(schema.data, ['$schema', 'title'], `schema:${schema.name}`, errors);
    }

    for (const component of state.components.components || []) {
        requireFields(component, ['id', 'description', 'runtime'], `component:${component.id || '<missing>'}`, errors);
        addUnique(componentIds, component.id, `component id ${component.id}`, errors);
    }

    for (const entry of state.catalog.entries || []) {
        requireFields(entry, ['key', 'component', 'category', 'role', 'text', 'status'], `catalog:${entry.key || '<missing>'}`, errors);
        if (!componentIds.has(entry.component)) {
            errors.push(`Catalog entry ${entry.key} references unknown component ${entry.component}`);
        }
        if (!VALID_STATUSES.has(entry.status)) {
            errors.push(`Catalog entry ${entry.key} has invalid status ${entry.status}`);
        }
        if (!/^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_-]+)+$/.test(entry.key || '')) {
            errors.push(`Catalog entry ${entry.key} does not use a structured flat key`);
        }
        validatePlaceholders(entry.key, entry.text, entry.placeholders || [], errors);
        addUnique(catalogKeys, entry.key, `catalog key ${entry.key}`, errors);
    }

    for (const keyword of state.keywords.keywords || []) {
        requireFields(keyword, ['id', 'canonical', 'category', 'parent', 'status'], `keyword:${keyword.id || '<missing>'}`, errors);
        if (!VALID_STATUSES.has(keyword.status)) {
            errors.push(`Keyword ${keyword.id} has invalid status ${keyword.status}`);
        }
        addUnique(keywordIds, keyword.id, `keyword id ${keyword.id}`, errors);
        addUnique(keywordCanonicals, normalizeToken(keyword.canonical), `canonical keyword ${keyword.canonical}`, errors);
    }

    for (const diagnostic of state.diagnostics.diagnostics || []) {
        requireFields(diagnostic, ['code', 'component', 'severity', 'messageKey', 'status'], `diagnostic:${diagnostic.code || '<missing>'}`, errors);
        if (!catalogKeys.has(diagnostic.messageKey)) {
            errors.push(`Diagnostic ${diagnostic.code} references unknown message key ${diagnostic.messageKey}`);
        }
        const catalogEntry = (state.catalog.entries || []).find((entry) => entry.key === diagnostic.messageKey);
        if (catalogEntry) {
            const catalogPlaceholders = sorted(catalogEntry.placeholders || []);
            const diagnosticPlaceholders = sorted(diagnostic.placeholders || []);
            if (catalogPlaceholders.join('|') !== diagnosticPlaceholders.join('|')) {
                errors.push(`Diagnostic ${diagnostic.code} placeholders do not match catalog entry ${diagnostic.messageKey}`);
            }
        }
        if (!VALID_STATUSES.has(diagnostic.status)) {
            errors.push(`Diagnostic ${diagnostic.code} has invalid status ${diagnostic.status}`);
        }
    }

    validatePreviewModes(state.previewModes, errors);
    validateVariableMapExample(state.variableMapExample, errors);

    for (const locale of state.locales.locales || []) {
        requireFields(locale, ['id', 'englishName', 'nativeName', 'direction', 'status'], `locale:${locale.id || '<missing>'}`, errors);
        if (!VALID_STATUSES.has(locale.status)) {
            errors.push(`Locale ${locale.id} has invalid status ${locale.status}`);
        }
        addUnique(localeIds, locale.id, `locale id ${locale.id}`, errors);
    }

    for (const localeId of EXPECTED_LOCALES) {
        if (!localeIds.has(localeId)) {
            errors.push(`Missing required locale metadata for ${localeId}`);
        }
    }

    for (const [localeId, localeCatalog] of Object.entries(state.localeCatalogs)) {
        if (!localeIds.has(localeId)) {
            errors.push(`Locale catalog exists for unknown locale ${localeId}`);
        }
        validateLocaleCatalog(localeId, localeCatalog, catalogKeys, keywordIds, errors, warnings);
    }

    const collisionReport = buildCollisionReport(state);
    for (const collision of collisionReport.collisions) {
        errors.push(`Duplicate keyword mapping in ${collision.locale}: ${collision.text} -> ${collision.ids.join(', ')}`);
    }

    return { errors, warnings, collisionReport };
}

function buildLanguageOutputs(state, validationResult) {
    const reportsDir = path.join(BUILD_ROOT, 'reports');
    const catalogsDir = path.join(BUILD_ROOT, 'catalogs');
    const keywordMapsDir = path.join(BUILD_ROOT, 'keyword-maps');
    const variableMapsDir = path.join(BUILD_ROOT, 'variable-maps');

    ensureDirectory(reportsDir);
    ensureDirectory(catalogsDir);
    ensureDirectory(keywordMapsDir);
    ensureDirectory(variableMapsDir);

    const locales = state.locales.locales || [];
    const canonicalEntries = state.catalog.entries || [];
    const canonicalKeywords = state.keywords.keywords || [];
    const components = sorted((state.components.components || []).map((component) => component.id));
    const completeness = [];

    for (const locale of locales) {
        const localeCatalog = state.localeCatalogs[locale.id] || emptyLocaleCatalog(locale.id);
        const localeDir = path.join(catalogsDir, locale.id);
        ensureDirectory(localeDir);

        const overrideEntries = mapBy(localeCatalog.entries || [], 'key');
        const overrideKeywords = mapBy(localeCatalog.keywords || [], 'id');
        const localeCompleteness = {
            locale: locale.id,
            status: locale.status,
            entries: {
                total: canonicalEntries.length,
                translated: locale.id === 'en' ? canonicalEntries.length : Object.keys(overrideEntries).length,
                fallback: locale.id === 'en' ? 0 : canonicalEntries.length - Object.keys(overrideEntries).length
            },
            keywords: {
                total: canonicalKeywords.length,
                translated: locale.id === 'en' ? canonicalKeywords.length : Object.keys(overrideKeywords).length,
                fallback: locale.id === 'en' ? 0 : canonicalKeywords.length - Object.keys(overrideKeywords).length
            }
        };
        completeness.push(localeCompleteness);

        for (const component of components) {
            const entries = {};
            for (const entry of canonicalEntries.filter((item) => item.component === component)) {
                const override = overrideEntries[entry.key];
                entries[entry.key] = {
                    text: override?.text || entry.text,
                    status: override?.status || (locale.id === 'en' ? entry.status : 'draft'),
                    sourceStatus: entry.status,
                    fallbackLocale: override ? null : (locale.id === 'en' ? null : 'en'),
                    placeholders: entry.placeholders || []
                };
            }

            writeJson(path.join(localeDir, `${component}.json`), {
                locale: locale.id,
                component,
                generatedAt: new Date(0).toISOString(),
                entries
            });
        }

        const maps = buildKeywordMaps(locale.id, canonicalKeywords, overrideKeywords);
        writeJson(path.join(keywordMapsDir, `${locale.id}-canonical-to-locale.json`), maps.canonicalToLocale);
        writeJson(path.join(keywordMapsDir, `${locale.id}-locale-to-canonical.json`), maps.localeToCanonical);
    }

    writeJson(path.join(variableMapsDir, 'project-variable-map.example.json'), state.variableMapExample);

    const migrationReport = buildMigrationReport(state);
    const buildReport = {
        generatedAt: new Date(0).toISOString(),
        components,
        locales: locales.map((locale) => locale.id),
        validation: {
            errors: validationResult.errors,
            warnings: validationResult.warnings
        },
        outputs: {
            catalogs: path.relative(ROOT, catalogsDir),
            keywordMaps: path.relative(ROOT, keywordMapsDir),
            variableMaps: path.relative(ROOT, variableMapsDir),
            reports: path.relative(ROOT, reportsDir)
        }
    };

    writeJson(path.join(reportsDir, 'language-build-report.json'), buildReport);
    writeJson(path.join(reportsDir, 'translation-completeness.json'), { locales: completeness });
    writeJson(path.join(reportsDir, 'keyword-collisions.json'), validationResult.collisionReport);
    writeJson(path.join(reportsDir, 'migration-report.json'), migrationReport);

    return {
        buildReport,
        completeness,
        collisionReport: validationResult.collisionReport,
        migrationReport
    };
}

function buildKeywordMaps(localeId, canonicalKeywords, overrideKeywords) {
    const canonicalToLocale = {};
    const localeToCanonical = {};

    for (const keyword of canonicalKeywords) {
        const override = overrideKeywords[keyword.id];
        const rendered = override?.text || keyword.canonical;
        canonicalToLocale[keyword.canonical] = {
            id: keyword.id,
            text: rendered,
            status: override?.status || (localeId === 'en' ? keyword.status : 'draft'),
            fallbackLocale: override ? null : (localeId === 'en' ? null : 'en')
        };
        localeToCanonical[rendered] = {
            id: keyword.id,
            canonical: keyword.canonical
        };
    }

    return {
        canonicalToLocale: sortObject(canonicalToLocale),
        localeToCanonical: sortObject(localeToCanonical)
    };
}

function buildCollisionReport(state) {
    const collisions = [];

    for (const locale of state.locales.locales || []) {
        const localeCatalog = state.localeCatalogs[locale.id] || emptyLocaleCatalog(locale.id);
        const overrideKeywords = mapBy(localeCatalog.keywords || [], 'id');
        const seen = new Map();

        for (const keyword of state.keywords.keywords || []) {
            const rendered = overrideKeywords[keyword.id]?.text || keyword.canonical;
            const normalized = normalizeToken(rendered);
            const ids = seen.get(normalized) || [];
            ids.push(keyword.id);
            seen.set(normalized, ids);
        }

        for (const [text, ids] of seen.entries()) {
            if (ids.length > 1) {
                collisions.push({
                    locale: locale.id,
                    text,
                    ids
                });
            }
        }
    }

    return {
        collisions
    };
}

function buildMigrationReport(state) {
    const files = state.components.migrationInventory?.scanFiles || [];
    const knownCatalogTexts = new Set((state.catalog.entries || []).map((entry) => entry.text));
    const items = [];

    for (const relativePath of files) {
        const absolutePath = path.join(ROOT, relativePath);
        if (!fs.existsSync(absolutePath)) {
            items.push({
                file: relativePath,
                status: 'missing'
            });
            continue;
        }

        const text = fs.readFileSync(absolutePath, 'utf8');
        const candidates = extractStringCandidates(text)
            .filter((candidate) => !knownCatalogTexts.has(candidate.text))
            .slice(0, 200);
        items.push({
            file: relativePath,
            status: 'scanned',
            candidateCount: candidates.length,
            candidates
        });
    }

    return {
        title: 'Hard-coded human-facing strings remaining',
        generatedAt: new Date(0).toISOString(),
        note: 'This report is a conservative candidate inventory. It is not a behavior change and does not imply every string should be cataloged.',
        files: items
    };
}

function extractStringCandidates(text) {
    const candidates = [];
    const stringPattern = /(['"`])((?:\\.|(?!\1).){4,}?)\1/g;
    let match;

    while ((match = stringPattern.exec(text)) !== null) {
        const value = match[2]
            .replace(/\\n/g, ' ')
            .replace(/\\r/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (!/[A-Za-z]/.test(value)) { continue; }
        if (/^[./\\A-Za-z0-9_-]+$/.test(value) && !value.includes(' ')) { continue; }
        if (value.startsWith('require(')) { continue; }

        candidates.push({
            line: lineNumberAt(text, match.index),
            text: value
        });
    }

    return candidates;
}

function validateLocaleCatalog(localeId, localeCatalog, catalogKeys, keywordIds, errors, warnings) {
    if (localeCatalog.locale !== localeId) {
        errors.push(`Locale catalog ${localeId} has mismatched locale field ${localeCatalog.locale}`);
    }
    if (!VALID_STATUSES.has(localeCatalog.status)) {
        errors.push(`Locale catalog ${localeId} has invalid status ${localeCatalog.status}`);
    }

    for (const entry of localeCatalog.entries || []) {
        requireFields(entry, ['key', 'text', 'status'], `locale:${localeId}:entry:${entry.key || '<missing>'}`, errors);
        if (!catalogKeys.has(entry.key)) {
            errors.push(`Locale ${localeId} has unknown catalog key ${entry.key}`);
        }
        if (!VALID_STATUSES.has(entry.status)) {
            errors.push(`Locale ${localeId} entry ${entry.key} has invalid status ${entry.status}`);
        }
    }

    for (const keyword of localeCatalog.keywords || []) {
        requireFields(keyword, ['id', 'text', 'status'], `locale:${localeId}:keyword:${keyword.id || '<missing>'}`, errors);
        if (!keywordIds.has(keyword.id)) {
            errors.push(`Locale ${localeId} has unknown keyword id ${keyword.id}`);
        }
        if (!VALID_STATUSES.has(keyword.status)) {
            errors.push(`Locale ${localeId} keyword ${keyword.id} has invalid status ${keyword.status}`);
        }
    }

    if (localeId !== 'en' && (localeCatalog.entries || []).length === 0 && (localeCatalog.keywords || []).length === 0) {
        warnings.push(`Locale ${localeId} contains metadata only and will use English fallback output.`);
    }
}

function validatePreviewModes(previewModes, errors) {
    const ids = new Set((previewModes.modes || []).map((mode) => mode.id));
    if (!ids.has(previewModes.defaultMode)) {
        errors.push(`Preview default mode ${previewModes.defaultMode} is not declared`);
    }
    for (const mode of previewModes.modes || []) {
        requireFields(mode, ['id', 'description', 'status'], `previewMode:${mode.id || '<missing>'}`, errors);
        if (!VALID_STATUSES.has(mode.status)) {
            errors.push(`Preview mode ${mode.id} has invalid status ${mode.status}`);
        }
    }
}

function validateVariableMapExample(variableMap, errors) {
    requireFields(variableMap, ['projectId', 'sourceLocale', 'targetLocale', 'variables'], 'project-variable-map.example', errors);
    for (const variable of variableMap.variables || []) {
        requireFields(variable, ['symbolId', 'canonicalName', 'localizedName', 'status'], `variable:${variable.symbolId || '<missing>'}`, errors);
        if (!VALID_STATUSES.has(variable.status)) {
            errors.push(`Variable map example ${variable.symbolId} has invalid status ${variable.status}`);
        }
    }
}

function validatePlaceholders(key, text, declaredPlaceholders, errors) {
    const used = sorted(Array.from(new Set(extractPlaceholders(text))));
    const declared = sorted(declaredPlaceholders);

    if (used.join('|') !== declared.join('|')) {
        errors.push(`Catalog entry ${key} placeholder mismatch: declared [${declared.join(', ')}], used [${used.join(', ')}]`);
    }
}

function extractPlaceholders(text) {
    const result = [];
    const pattern = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
    let match;

    while ((match = pattern.exec(text || '')) !== null) {
        result.push(match[1]);
    }

    return result;
}

function loadLocaleCatalogs() {
    const localesRoot = path.join(LANGUAGE_ROOT, 'locales');
    const result = {};
    if (!fs.existsSync(localesRoot)) { return result; }

    for (const name of fs.readdirSync(localesRoot)) {
        const fullPath = path.join(localesRoot, name);
        if (!fs.statSync(fullPath).isDirectory()) { continue; }

        const catalogPath = path.join(fullPath, 'catalog.json');
        const samplePath = path.join(fullPath, 'catalog.sample.json');
        if (fs.existsSync(catalogPath)) {
            result[name] = readJson(path.relative(ROOT, catalogPath));
        } else if (fs.existsSync(samplePath)) {
            result[name] = readJson(path.relative(ROOT, samplePath));
        } else {
            result[name] = emptyLocaleCatalog(name);
        }
    }

    return result;
}

function emptyLocaleCatalog(locale) {
    return {
        locale,
        status: locale === 'en' ? 'approved' : 'native-review-required',
        entries: [],
        keywords: []
    };
}

function readJsonFiles(dir) {
    if (!fs.existsSync(dir)) { return []; }
    return fs.readdirSync(dir)
        .filter((name) => name.endsWith('.json'))
        .sort()
        .map((name) => ({
            name,
            data: JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'))
        }));
}

function readJson(relativePath) {
    return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function writeJson(filePath, value) {
    ensureDirectory(path.dirname(filePath));
    fs.writeFileSync(filePath, `${JSON.stringify(sortDeep(value), null, 2)}\n`, 'utf8');
}

function ensureDirectory(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function requireFields(value, fields, label, errors) {
    for (const field of fields) {
        if (value[field] === undefined || value[field] === null || value[field] === '') {
            errors.push(`${label} is missing required field ${field}`);
        }
    }
}

function addUnique(set, value, label, errors) {
    if (!value) { return; }
    if (set.has(value)) {
        errors.push(`Duplicate ${label}`);
    }
    set.add(value);
}

function mapBy(items, field) {
    const result = {};
    for (const item of items || []) {
        result[item[field]] = item;
    }
    return result;
}

function sorted(items) {
    return items.slice().sort((a, b) => String(a).localeCompare(String(b)));
}

function sortObject(value) {
    const result = {};
    for (const key of Object.keys(value).sort()) {
        result[key] = value[key];
    }
    return result;
}

function sortDeep(value) {
    if (Array.isArray(value)) {
        return value.map(sortDeep);
    }

    if (value && typeof value === 'object') {
        const result = {};
        for (const key of Object.keys(value).sort()) {
            result[key] = sortDeep(value[key]);
        }
        return result;
    }

    return value;
}

function normalizeToken(value) {
    return String(value || '').trim().toLocaleLowerCase();
}

function lineNumberAt(text, index) {
    return text.slice(0, index).split(/\r?\n/).length;
}

function printValidation(result) {
    for (const warning of result.warnings) {
        console.warn(`Warning: ${warning}`);
    }
    for (const error of result.errors) {
        console.error(`Error: ${error}`);
    }
    console.log(`Language validation: ${result.errors.length === 0 ? 'passed' : 'failed'} (${result.errors.length} error(s), ${result.warnings.length} warning(s))`);
}

function printBuildSummary(reports) {
    console.log(`Language build complete: ${reports.buildReport.locales.length} locale(s), ${reports.buildReport.components.length} component(s)`);
    console.log(`Keyword collisions: ${reports.collisionReport.collisions.length}`);
}

function printReportSummary(reports) {
    console.log(`Language reports updated: ${reports.completeness.length} locale(s), ${reports.migrationReport.files.length} scanned file(s)`);
}

main();
