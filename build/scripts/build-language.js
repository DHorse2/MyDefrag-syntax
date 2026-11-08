// build/scripts/build-language.js
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
    DeepLTranslationService,
    createBuildTranslationSuggestions
} = require('../language/translation/deepl-translation-service');
const { GoogleTranslationService } = require('../language/translation/google-translation-service');
const { normalizeText, validateSubstitutions } = require('../language/translation/text-normalizer');
const {
    buildNormalizedInputAudit,
    renderNormalizedInputAuditMarkdown
} = require('../language/translation/normalized-input-audit');

const ROOT = path.resolve(__dirname, '..', '..');
const VALID_STATUSES = new Set([
    'draft',
    'machine-generated',
    'native-review-required',
    'reviewed',
    'approved',
    'deprecated'
]);
const VALID_DIAGNOSTIC_SEVERITIES = new Set([
    'error',
    'warning',
    'information',
    'hint'
]);
const EXPECTED_LOCALES = [
    'en'
];
const VALID_TRANSLATION_PROVIDERS = new Set(['deepl', 'google', 'none']);

function portablePath(value) {
    return String(value || '').replaceAll('\\', '/');
}

function loadLanguageProjectManifest(rootDir) {
    return readJson(rootDir, 'language/language-project.json');
}

function sourceRootBindingsFromEnvironment(environment = process.env) {
    const serialized = environment.MDM_LOCALIZE_SOURCE_ROOTS;
    if (!serialized) { return {}; }
    let bindings;
    try {
        bindings = JSON.parse(serialized);
    } catch (error) {
        throw new Error(`MDM_LOCALIZE_SOURCE_ROOTS must be valid JSON: ${error.message}`);
    }
    if (!bindings || typeof bindings !== 'object' || Array.isArray(bindings)) {
        throw new Error('MDM_LOCALIZE_SOURCE_ROOTS must be a JSON object keyed by source root ID.');
    }
    return bindings;
}

function migrationSourceIdentity(entry) {
    const rootId = String(entry?.rootId || 'project');
    return `${rootId}\0${portablePath(entry?.path).toLocaleLowerCase()}`;
}

function resolveMigrationSource(rootDir, state, entry, options = {}) {
    const rootId = String(entry?.rootId || 'project');
    const relativePath = portablePath(entry?.path).trim();
    if (!relativePath || path.posix.isAbsolute(relativePath) || /^[A-Za-z]:\//u.test(relativePath)) {
        throw new Error('path must be relative to its explicitly mapped source root');
    }
    const normalizedPath = path.posix.normalize(relativePath);
    if (normalizedPath === '..' || normalizedPath.startsWith('../')) {
        throw new Error('path escapes its explicitly mapped source root');
    }
    const definition = state.languageProject?.sourceRoots?.find((root) => root.id === rootId);
    if (!definition) {
        throw new Error(`references unknown source root ${rootId}`);
    }
    const binding = rootId === 'project'
        ? { path: rootDir }
        : state.sourceRootBindings?.[rootId];
    if (!binding?.path) {
        if (options.allowUnmapped === true && definition.required !== true) {
            return {
                rootId,
                path: normalizedPath,
                absolutePath: null,
                displayPath: `${rootId}:${normalizedPath}`,
                unmapped: true
            };
        }
        throw new Error(`source root ${rootId} has no machine-local binding`);
    }
    const sourceRoot = path.resolve(binding.path);
    const absolutePath = path.resolve(sourceRoot, ...normalizedPath.split('/'));
    const lexicalRelative = path.relative(sourceRoot, absolutePath);
    if (lexicalRelative.startsWith('..') || path.isAbsolute(lexicalRelative)) {
        throw new Error(`path escapes source root ${rootId}`);
    }
    if (fs.existsSync(sourceRoot) && fs.existsSync(absolutePath)) {
        const realRoot = fs.realpathSync.native(sourceRoot);
        const realTarget = fs.realpathSync.native(absolutePath);
        const realRelative = path.relative(realRoot, realTarget);
        if (realRelative.startsWith('..') || path.isAbsolute(realRelative)) {
            throw new Error(`path resolves outside source root ${rootId}`);
        }
    }
    return {
        rootId,
        path: normalizedPath,
        absolutePath,
        displayPath: rootId === 'project' ? normalizedPath : `${rootId}:${normalizedPath}`
    };
}

async function main(rootDir = ROOT, options = {}) {
    const command = parseCommandLine(
        options.argv || process.argv.slice(2),
        options.environment || process.env
    );
    const {
        action,
        args,
        useNormalized,
        translationProvider,
        allowFallbackReplacementKeys
    } = command;
    const progress = options.progress || ((message) => console.log(message));
    if (!['build', 'report', 'build-component'].includes(action) && command.englishSourceWasSpecified) {
        throw new Error('--UseNormalized and --UseCanonical are supported only by the build, report, and build-component actions.');
    }
    if (allowFallbackReplacementKeys.length > 0 && action !== 'build-component') {
        throw new Error('--AllowFallbackReplacement is supported only by the build-component action.');
    }
    if (translationProvider !== 'deepl' && !['build', 'report', 'build-component'].includes(action)) {
        throw new Error('--TranslationProvider is supported only by the build, report, and build-component actions.');
    }
    if (['build', 'report'].includes(action)) {
        progress('Language build: loading and validating canonical data.');
    }
    const state = loadLanguageState(rootDir);
    const result = validateLanguageState(state, rootDir);

    if (action === 'validate') {
        printValidation(result);
        process.exit(result.errors.length > 0 ? 1 : 0);
    }

    if (action === 'audit-normalized-inputs') {
        const reportPaths = writeNormalizedInputAuditReports(result.normalizedInputAudit, rootDir);
        printValidation(result);
        console.log(`Normalized input audit JSON: ${path.relative(rootDir, reportPaths.jsonPath)}`);
        console.log(`Normalized input audit list: ${path.relative(rootDir, reportPaths.markdownPath)}`);
        process.exit(result.errors.length > 0 ? 1 : 0);
    }

    if (action === 'build') {
        if (result.errors.length > 0) {
            printValidation(result);
            process.exit(1);
        }
        progress('Language build: validation passed.');
        printWarnings(result.warnings);

        const missingEntryKeysByLocale = collectMissingCatalogEntryKeys(state, rootDir);
        const missingLocales = Object.entries(missingEntryKeysByLocale)
            .filter(([localeId, keys]) => localeId !== 'en' && keys.length > 0)
            .map(([localeId]) => localeId);
        const fallbackLocales = (state.locales.locales || [])
            .map((locale) => locale.id)
            .filter((localeId) => localeId !== 'en');
        const translationMode = translationProvider === 'none'
            ? (useNormalized ? 'normalized' : 'none')
            : translationProvider;
        let translation;
        if (translationProvider === 'none' && useNormalized) {
            printNormalizedPlan(fallbackLocales);
            translation = createNormalizedEnglishSuggestions(state, {
                localeIds: fallbackLocales
            });
        } else if (translationProvider === 'none') {
            printNoTranslationApiPlan(missingLocales);
            translation = createNoTranslationApiSuggestions();
        } else {
            const translator = createTranslationService(translationProvider, options);
            printTranslationPlan(translator, missingLocales, null, { useNormalized });
            translation = await createBuildTranslationSuggestions(state, {
                translator,
                useNormalized,
                localeIds: missingLocales,
                entryKeysByLocale: missingEntryKeysByLocale,
                onProgress: ({ localeId, missingCount }) => progress(
                    `Language build: translating ${missingCount} missing value(s) for ${localeId}.`
                )
            });
            if (useNormalized) {
                translation = mergeTranslationSuggestions(
                    createNormalizedEnglishSuggestions(state, {
                        localeIds: fallbackLocales
                    }),
                    translation
                );
            }
        }
        progress('Language build: generating catalogs, maps, and reports.');
        const reports = buildLanguageOutputs(state, result, rootDir, {
            translationSuggestions: translation.suggestions,
            translationWarnings: translation.warnings,
            translationUsage: translation.usage,
            translationAssignments: translation.assignments,
            translationMode,
            useNormalized
        });
        printWarnings(translation.warnings);
        printSuggestionResult(translation, translationMode);
        printBuildSummary(reports);
        return;
    }

    if (action === 'report') {
        if (result.errors.length > 0) {
            printValidation(result);
            process.exit(1);
        }
        progress('Language report: validation passed.');
        printWarnings(result.warnings);

        const missingEntryKeysByLocale = collectMissingCatalogEntryKeys(state, rootDir);
        const missingLocales = Object.entries(missingEntryKeysByLocale)
            .filter(([localeId, keys]) => localeId !== 'en' && keys.length > 0)
            .map(([localeId]) => localeId);
        const fallbackLocales = (state.locales.locales || [])
            .map((locale) => locale.id)
            .filter((localeId) => localeId !== 'en');
        const translationMode = translationProvider === 'none'
            ? (useNormalized ? 'normalized' : 'none')
            : translationProvider;
        let translation;
        if (translationProvider === 'none' && useNormalized) {
            printNormalizedPlan(fallbackLocales);
            translation = createNormalizedEnglishSuggestions(state, {
                localeIds: fallbackLocales
            });
        } else if (translationProvider === 'none') {
            printNoTranslationApiPlan(missingLocales);
            translation = createNoTranslationApiSuggestions();
        } else {
            const translator = createTranslationService(translationProvider, options);
            printTranslationPlan(translator, missingLocales, null, { useNormalized });
            translation = await createBuildTranslationSuggestions(state, {
                translator,
                useNormalized,
                localeIds: missingLocales,
                entryKeysByLocale: missingEntryKeysByLocale,
                onProgress: ({ localeId, missingCount }) => progress(
                    `Language report: translating ${missingCount} missing value(s) for ${localeId}.`
                )
            });
            if (useNormalized) {
                translation = mergeTranslationSuggestions(
                    createNormalizedEnglishSuggestions(state, {
                        localeIds: fallbackLocales
                    }),
                    translation
                );
            }
        }
        progress('Language report: generating catalogs, maps, and reports.');
        const reports = buildLanguageOutputs(state, result, rootDir, {
            translationSuggestions: translation.suggestions,
            translationWarnings: translation.warnings,
            translationUsage: translation.usage,
            translationAssignments: translation.assignments,
            translationMode,
            useNormalized
        });
        printWarnings(translation.warnings);
        printSuggestionResult(translation, translationMode);
        writeHumanReadableReport(reports, rootDir);
        return;
    }

    if (action === 'build-component') {
        if (result.errors.length > 0) {
            printValidation(result);
            process.exit(1);
        }
        printWarnings(result.warnings);
        const localeId = args[0];
        const componentId = args[1];
        try {
            const missingEntryKeysByLocale = collectMissingCatalogEntryKeys(state, rootDir, {
                localeIds: [localeId],
                componentIds: [componentId]
            });
            const translationMode = translationProvider === 'none'
                ? (useNormalized ? 'normalized' : 'none')
                : translationProvider;
            let translation;
            if (translationProvider === 'none' && useNormalized) {
                printNormalizedPlan([localeId]);
                translation = createNormalizedEnglishSuggestions(state, {
                    localeIds: [localeId],
                    componentId
                });
            } else if (translationProvider === 'none') {
                printNoTranslationApiPlan([localeId], componentId);
                translation = createNoTranslationApiSuggestions();
            } else {
                const translator = createTranslationService(translationProvider, options);
                printTranslationPlan(translator, [localeId], componentId, { useNormalized });
                translation = await createBuildTranslationSuggestions(state, {
                    translator,
                    useNormalized,
                    localeIds: [localeId],
                    componentId,
                    entryKeysByLocale: missingEntryKeysByLocale
                });
                if (useNormalized) {
                    translation = mergeTranslationSuggestions(
                        createNormalizedEnglishSuggestions(state, {
                            localeIds: [localeId],
                            componentId
                        }),
                        translation
                    );
                }
            }
            const targeted = buildLocaleComponentOutput(
                state,
                result,
                localeId,
                componentId,
                rootDir,
                {
                    translationSuggestions: translation.suggestions,
                    translationWarnings: translation.warnings,
                    translationUsage: translation.usage,
                    translationAssignments: translation.assignments,
                    translationMode,
                    useNormalized,
                    allowFallbackReplacementKeys
                }
            );
            printWarnings(translation.warnings);
            printSuggestionResult(translation, translationMode);
            console.log(`Language component build complete: ${targeted.locale}/${targeted.component}`);
            console.log(`Generated catalog: ${targeted.relativePath}`);
        } catch (error) {
            console.error(error.message);
            process.exit(1);
        }
        return;
    }

    console.error(`Unknown language build action: ${action}`);
    process.exit(1);
}

function parseCommandLine(argv = [], environment = process.env) {
    const args = [];
    const allowFallbackReplacementKeys = [];
    // `npm run language:build --UseNormalized` is not normal npm argument
    // forwarding syntax. npm 11 consumes the flag as CLI configuration and
    // exposes it to the child only as npm_config_usenormalized=true. Honor that
    // form as well as the preferred `npm run language:build -- --UseNormalized`
    // form so a requested normalized build can never silently enter DeepL mode.
    const configuredUseNormalized = String(environment.npm_config_usenormalized || '').trim();
    let useNormalized = configuredUseNormalized
        ? /^(?:1|true|yes|on)$/iu.test(configuredUseNormalized)
        : true;
    let englishSourceWasSpecified = Boolean(configuredUseNormalized);
    let translationProvider = String(
        environment.npm_config_translationprovider || 'deepl'
    ).trim().toLocaleLowerCase();
    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index];
        if (argument === '--UseNormalized') {
            useNormalized = true;
            englishSourceWasSpecified = true;
        } else if (argument === '--UseCanonical' || argument === '--NoUseNormalized') {
            useNormalized = false;
            englishSourceWasSpecified = true;
        } else if (argument === '--TranslationProvider') {
            index += 1;
            translationProvider = String(argv[index] || '').trim().toLocaleLowerCase();
            if (!translationProvider) {
                throw new Error('--TranslationProvider requires deepl, google, or none.');
            }
        } else if (String(argument).startsWith('--TranslationProvider=')) {
            translationProvider = String(argument)
                .slice('--TranslationProvider='.length)
                .trim()
                .toLocaleLowerCase();
            if (!translationProvider) {
                throw new Error('--TranslationProvider requires deepl, google, or none.');
            }
        } else if (String(argument).startsWith('--AllowFallbackReplacement=')) {
            const key = String(argument).slice('--AllowFallbackReplacement='.length).trim();
            if (!key) {
                throw new Error('--AllowFallbackReplacement requires an exact catalog key.');
            }
            allowFallbackReplacementKeys.push(key);
        } else if (String(argument).startsWith('--')) {
            throw new Error(`Unknown language build option: ${argument}`);
        } else {
            args.push(argument);
        }
    }
    if (!VALID_TRANSLATION_PROVIDERS.has(translationProvider)) {
        throw new Error(
            `Unknown translation provider: ${translationProvider || '<missing>'}. `
            + 'Expected deepl, google, or none.'
        );
    }
    return {
        action: args.shift() || 'build',
        args,
        useNormalized,
        englishSourceWasSpecified,
        translationProvider,
        allowFallbackReplacementKeys: sorted(Array.from(new Set(allowFallbackReplacementKeys)))
    };
}

function createTranslationService(provider, options = {}) {
    if (options.translators?.[provider]) { return options.translators[provider]; }
    if (options.translator) { return options.translator; }
    return provider === 'google'
        ? new GoogleTranslationService({ environment: options.environment })
        : new DeepLTranslationService({ environment: options.environment });
}

function createNoTranslationApiSuggestions() {
    return {
        suggestions: {},
        assignments: {},
        warnings: [],
        usage: { apiCalls: 0, charactersPassed: 0 }
    };
}

function mergeTranslationSuggestions(fallback, translated) {
    const localeIds = new Set([
        ...Object.keys(fallback?.suggestions || {}),
        ...Object.keys(translated?.suggestions || {})
    ]);
    const suggestions = {};
    for (const localeId of localeIds) {
        suggestions[localeId] = {
            ...(fallback?.suggestions?.[localeId] || {}),
            ...(translated?.suggestions?.[localeId] || {})
        };
        if (Object.keys(suggestions[localeId]).length === 0) { delete suggestions[localeId]; }
    }
    return {
        suggestions,
        assignments: {
            ...(fallback?.assignments || {}),
            ...(translated?.assignments || {})
        },
        warnings: [
            ...(fallback?.warnings || []),
            ...(translated?.warnings || [])
        ],
        usage: translated?.usage || fallback?.usage || { apiCalls: 0, charactersPassed: 0 }
    };
}

function createNormalizedEnglishSuggestions(state, options = {}) {
    const localeFilter = options.localeIds ? new Set(options.localeIds) : null;
    const entryKeysByLocale = options.entryKeysByLocale || null;
    const componentId = options.componentId || null;
    const suggestions = {};
    const canonicalEntries = (state.catalog.entries || []).filter((entry) => (
        !componentId || entry.component === componentId
    ));

    for (const locale of state.locales.locales || []) {
        if (locale.id === 'en' || (localeFilter && !localeFilter.has(locale.id))) { continue; }
        const authored = new Set((state.localeCatalogs[locale.id]?.entries || [])
            .map((entry) => entry.key));
        const outputMissing = entryKeysByLocale
            ? new Set(entryKeysByLocale[locale.id] || [])
            : null;
        const missing = canonicalEntries.filter((entry) => (
            !authored.has(entry.key) && (!outputMissing || outputMissing.has(entry.key))
        ));
        if (missing.length === 0) { continue; }
        suggestions[locale.id] = {};
        for (const entry of missing) {
            suggestions[locale.id][entry.key] = {
                text: normalizeText(entry.text, state.normalizedWords, {
                    preserveRuntimeSyntax: true
                }),
                status: 'draft',
                fallbackLocale: 'en',
                normalizedEnglish: true
            };
        }
    }

    return {
        suggestions,
        assignments: {},
        warnings: [],
        usage: { apiCalls: 0, charactersPassed: 0 }
    };
}

/**
 * The complete in-memory snapshot of authored language inputs.
 *
 * @typedef {Object} LanguageState
 * @property {{name: string, data: Object}[]} schemas JSON Schema documents,
 *   sorted by filename and retained with both their filename and parsed data.
 * @property {Object} components Component identities used to partition generated
 *   catalogs, plus the source-file inventory used by the migration report.
 * @property {{input: string, output: string}[]} normalizedWords Ordered
 *   translation-oriented substitutions used by migration text normalization.
 * @property {Object} localeTemplates Canonical locale metadata choices used by
 *   Language Maintenance when creating locale-registry entries.
 * @property {Object} catalog Canonical human-facing text entries. These provide
 *   stable keys, English fallback text, component ownership, and placeholders.
 * @property {Object} categories Catalog category identities and descriptions.
 *   Categories used by catalog entries are existing; unused entries are
 *   maintained recommendations available to the editor.
 * @property {Object} roles Catalog role identities and descriptions. Roles
 *   used by catalog entries are existing; unused entries are maintained
 *   recommendations available to the editor.
 * @property {Object} keywords Stable semantic keyword identities and their
 *   canonical MyDefrag spellings, independent of locale-specific renderings.
 * @property {Object} diagnostics Stable diagnostic codes linked to canonical
 *   catalog message keys, severities, sources, and placeholder contracts.
 * @property {Object} previewModes The declared preview-mode inventory and the
 *   mode that future preview consumers should treat as the default.
 * @property {Object} variableMapExample A project-scoped variable translation
 *   example that is validated and copied to the generated variable-map output.
 * @property {Object} locales The locale registry. It drives output generation,
 *   locale status reporting, direction metadata, and required-locale checks.
 * @property {Object.<string, Object>} localeCatalogs Locale override catalogs
 *   keyed by locale directory name; these remain unmerged until output build.
 * @property {Object.<string, Object.<string, Object>>} localeComponentCatalogs
 *   Permanent sparse component files keyed first by locale and then component.
 * @property {string[]} inactiveLocaleDirectories Preserved authored locale
 *   directories that are not active because their ID is absent from the registry.
 */

/**
 * Read all authored language sources before validation or output generation.
 *
 * This function performs JSON parsing and source discovery only. The `schemas`
 * member is not applied through a JSON Schema engine; `validateLanguageState()`
 * performs the build tool's current explicit cross-file and field checks.
 *
 * @param {string} [rootDir] Repository root. Defaults to this script's project.
 * @returns {LanguageState} A single snapshot shared by validation and builders.
 */
function loadLanguageState(rootDir = ROOT) {
    const languageRoot = path.join(rootDir, 'language');
    const components = readJson(rootDir, 'language/canonical/components.json');
    const locales = readJson(rootDir, 'language/locales/locales.json');
    const localeSources = loadLocaleCatalogs(rootDir, components, locales);
    return {
        languageProject: loadLanguageProjectManifest(rootDir),
        sourceRootBindings: sourceRootBindingsFromEnvironment(),
        schemas: readJsonFiles(path.join(languageRoot, 'schema')),
        components,
        localeTemplates: readJson(rootDir, 'language/canonical/language-locales.json'),
        normalizedWords: readJson(rootDir, 'language/canonical/normalized-words.json'),
        catalog: readJson(rootDir, 'language/canonical/component-catalog.json'),
        categories: readJson(rootDir, 'language/canonical/catalog-categories.json'),
        roles: readJson(rootDir, 'language/canonical/catalog-roles.json'),
        keywords: readJson(rootDir, 'language/canonical/semantic-keywords.json'),
        diagnostics: readJson(rootDir, 'language/canonical/diagnostic-messages.json'),
        previewModes: readJson(rootDir, 'language/canonical/preview-modes.json'),
        variableMapExample: readJson(rootDir, 'language/canonical/project-variable-map.example.json'),
        locales,
        localeCatalogs: localeSources.catalogs,
        localeComponentCatalogs: localeSources.components,
        inactiveLocaleDirectories: localeSources.inactiveDirectories
    };
}

function validateLanguageState(state, rootDir = ROOT) {
    const errors = [];
    const warnings = [];
    const componentIds = new Set();
    const categoryIds = new Set();
    const roleIds = new Set();
    const catalogKeys = new Set();
    const catalogByKey = new Map();
    const keywordIds = new Set();
    const keywordCanonicals = new Set();
    const diagnosticCodes = new Set();
    const localeIds = new Set();
    const localeTemplateIds = new Set();

    for (const schema of state.schemas) {
        requireFields(schema.data, ['$schema', 'title'], `schema:${schema.name}`, errors);
    }

    errors.push(...validateSubstitutions(state.normalizedWords));

    if (!Array.isArray(state.categories?.categories)) {
        errors.push('Canonical catalog categories must contain a categories array');
    } else {
        for (const category of state.categories.categories) {
            requireFields(category, ['id', 'description'], `category:${category?.id || '<missing>'}`, errors);
            if (!/^[a-z][a-z0-9-]*$/.test(category?.id || '')) {
                errors.push(`Catalog category ${category?.id || '<missing>'} has an invalid identifier`);
            }
            if (typeof category?.description !== 'string' || category.description.trim().length === 0) {
                errors.push(`Catalog category ${category?.id || '<missing>'} description must be a non-empty string`);
            }
            addUnique(categoryIds, category?.id, `catalog category id ${category?.id}`, errors);
        }
    }

    if (!Array.isArray(state.roles?.roles)) {
        errors.push('Canonical catalog roles must contain a roles array');
    } else {
        for (const role of state.roles.roles) {
            requireFields(role, ['id', 'description'], `role:${role?.id || '<missing>'}`, errors);
            if (!/^[a-z][A-Za-z0-9]*$/.test(role?.id || '')) {
                errors.push(`Catalog role ${role?.id || '<missing>'} has an invalid identifier`);
            }
            if (typeof role?.description !== 'string' || role.description.trim().length === 0) {
                errors.push(`Catalog role ${role?.id || '<missing>'} description must be a non-empty string`);
            }
            addUnique(roleIds, role?.id, `catalog role id ${role?.id}`, errors);
        }
    }

    if (!Array.isArray(state.localeTemplates.locales)) {
        errors.push('Canonical locale templates must contain a locales array');
    } else {
        for (const locale of state.localeTemplates.locales) {
            requireFields(locale, ['id', 'englishName', 'nativeName', 'direction', 'status'], `locale-template:${locale.id || '<missing>'}`, errors);
            if (!/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(locale.id || '')) {
                errors.push(`Locale template ${locale.id || '<missing>'} has an invalid identifier`);
            }
            if (!['ltr', 'rtl'].includes(locale.direction)) {
                errors.push(`Locale template ${locale.id || '<missing>'} has invalid direction ${locale.direction}`);
            }
            if (!VALID_STATUSES.has(locale.status)) {
                errors.push(`Locale template ${locale.id} has invalid status ${locale.status}`);
            }
            addUnique(localeTemplateIds, locale.id, `locale template id ${locale.id}`, errors);
        }
    }

    for (const component of state.components.components || []) {
        requireFields(component, ['id', 'description', 'runtime'], `component:${component.id || '<missing>'}`, errors);
        if (!/^[a-z][A-Za-z0-9]*$/.test(component.id || '')) {
            errors.push(`Component ${component.id || '<missing>'} has an invalid identifier`);
        }
        if (typeof component.description !== 'string') {
            errors.push(`Component ${component.id || '<missing>'} description must be a string`);
        }
        if (typeof component.runtime !== 'boolean') {
            errors.push(`Component ${component.id || '<missing>'} runtime must be a boolean`);
        }
        addUnique(componentIds, component.id, `component id ${component.id}`, errors);
    }

    const migrationInventory = state.components.migrationInventory;
    if (!migrationInventory || !Array.isArray(migrationInventory.scanFiles)) {
        errors.push('Migration inventory scanFiles must be an array');
    } else {
        const inventoryPaths = new Set();
        for (const [index, entry] of migrationInventory.scanFiles.entries()) {
            const label = `migration inventory entry ${index + 1}`;
            if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
                errors.push(`${label} must contain path and component fields`);
                continue;
            }
            requireFields(entry, ['path', 'component'], label, errors);
            if (typeof entry.path !== 'string') {
                errors.push(`${label} path must be a string`);
            } else {
                try {
                    resolveMigrationSource(rootDir, state, entry, { allowUnmapped: true });
                } catch (error) {
                    errors.push(`${label} ${error.message}`);
                }
                addUnique(
                    inventoryPaths,
                    migrationSourceIdentity(entry),
                    `migration inventory path ${entry.rootId || 'project'}:${entry.path}`,
                    errors
                );
            }
            if (!componentIds.has(entry.component)) {
                errors.push(`${label} references unknown component ${entry.component}`);
            }
        }

        const candidateStatuses = migrationInventory.candidateStatuses;
        if (candidateStatuses !== undefined && !Array.isArray(candidateStatuses)) {
            errors.push('Migration inventory candidateStatuses must be an array');
        } else {
            const candidateStatusIdentities = new Set();
            for (const [index, entry] of (candidateStatuses || []).entries()) {
                const label = `migration candidate status ${index + 1}`;
                if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
                    errors.push(`${label} must contain path, text, and status fields`);
                    continue;
                }
                requireFields(entry, ['path', 'text', 'status'], label, errors);
                if (typeof entry.path !== 'string') {
                    errors.push(`${label} path must be a string`);
                } else if (!inventoryPaths.has(migrationSourceIdentity(entry))) {
                    errors.push(`${label} references a file outside the migration inventory: ${entry.rootId || 'project'}:${entry.path}`);
                }
                if (typeof entry.text !== 'string' || entry.text.length === 0) {
                    errors.push(`${label} text must be a non-empty string`);
                }
                if (!['potential', 'review', 'rejected', 'code-edit', 'code-updated'].includes(entry.status)) {
                    errors.push(`${label} has invalid status ${entry.status}`);
                }
                if (entry.schemaVersion === 2 && (typeof entry.occurrenceId !== 'string' || entry.occurrenceId.length === 0)) {
                    errors.push(`${label} schemaVersion 2 requires a non-empty occurrenceId`);
                }
                if (typeof entry.path === 'string' && typeof entry.text === 'string') {
                    addUnique(
                        candidateStatusIdentities,
                        entry.schemaVersion === 2
                            ? `v2\0${entry.occurrenceId}`
                            : `v1\0${migrationSourceIdentity(entry)}\0${entry.text}`,
                        `migration candidate status ${entry.rootId || 'project'}:${entry.path} / ${entry.occurrenceId || entry.text}`,
                        errors
                    );
                }
            }
        }

        const candidateCatalogDrafts = migrationInventory.candidateCatalogDrafts;
        if (candidateCatalogDrafts !== undefined && !Array.isArray(candidateCatalogDrafts)) {
            errors.push('Migration inventory candidateCatalogDrafts must be an array');
        } else {
            const candidateDraftIdentities = new Set();
            const candidateDraftKeys = new Set();
            for (const [index, entry] of (candidateCatalogDrafts || []).entries()) {
                const label = `migration candidate catalog draft ${index + 1}`;
                if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
                    errors.push(`${label} must contain candidate identity and catalog fields`);
                    continue;
                }
                requireFields(
                    entry,
                    ['path', 'sourceLine', 'text', 'component', 'category', 'role', 'key'],
                    label,
                    errors
                );
                if (typeof entry.path !== 'string') {
                    errors.push(`${label} path must be a string`);
                } else {
                    try {
                        resolveMigrationSource(rootDir, state, entry, { allowUnmapped: true });
                    } catch (error) {
                        errors.push(`${label} ${error.message}`);
                    }
                }
                if (!Number.isInteger(entry.sourceLine) || entry.sourceLine < 1) {
                    errors.push(`${label} sourceLine must be a positive integer`);
                }
                if (typeof entry.text !== 'string' || entry.text.length === 0) {
                    errors.push(`${label} text must be a non-empty string`);
                }
                if (!componentIds.has(entry.component)) {
                    errors.push(`${label} references unknown component ${entry.component}`);
                }
                if (!categoryIds.has(entry.category)) {
                    errors.push(`${label} references unknown category ${entry.category}`);
                }
                if (!roleIds.has(entry.role)) {
                    errors.push(`${label} references unknown role ${entry.role}`);
                }
                if (!/^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_-]+)+$/.test(entry.key || '')) {
                    errors.push(`${label} key ${entry.key} does not use a structured flat key`);
                }
                if (typeof entry.path === 'string' && Number.isInteger(entry.sourceLine)
                    && typeof entry.text === 'string') {
                    addUnique(
                        candidateDraftIdentities,
                        `${migrationSourceIdentity(entry)}\0${entry.text}`,
                        `migration candidate catalog draft ${entry.rootId || 'project'}:${entry.path} / ${entry.text}`,
                        errors
                    );
                }
                if (typeof entry.key === 'string') {
                    addUnique(
                        candidateDraftKeys,
                        entry.key,
                        `migration candidate catalog draft key ${entry.key}`,
                        errors
                    );
                }
            }
        }
    }

    for (const entry of state.catalog.entries || []) {
        requireFields(entry, ['key', 'component', 'category', 'role', 'text', 'status'], `catalog:${entry.key || '<missing>'}`, errors);
        if (!componentIds.has(entry.component)) {
            errors.push(`Catalog entry ${entry.key} references unknown component ${entry.component}`);
        }
        if (!categoryIds.has(entry.category)) {
            errors.push(`Catalog entry ${entry.key} references unknown category ${entry.category}`);
        }
        if (!roleIds.has(entry.role)) {
            errors.push(`Catalog entry ${entry.key} references unknown role ${entry.role}`);
        }
        if (!VALID_STATUSES.has(entry.status)) {
            errors.push(`Catalog entry ${entry.key} has invalid status ${entry.status}`);
        }
        if (entry.sourceLine !== undefined && (!Number.isInteger(entry.sourceLine) || entry.sourceLine < 1)) {
            errors.push(`Catalog entry ${entry.key} has invalid sourceLine ${entry.sourceLine}`);
        }
        if (entry.sourceLine !== undefined && !entry.source) {
            errors.push(`Catalog entry ${entry.key} has sourceLine without source`);
        }
        if (!/^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_-]+)+$/.test(entry.key || '')) {
            errors.push(`Catalog entry ${entry.key} does not use a structured flat key`);
        }
        validatePlaceholders(entry.key, entry.text, entry.placeholders || [], errors);
        addUnique(catalogKeys, entry.key, `catalog key ${entry.key}`, errors);
        catalogByKey.set(entry.key, entry);
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
        addUnique(diagnosticCodes, diagnostic.code, `diagnostic code ${diagnostic.code}`, errors);
        if (!componentIds.has(diagnostic.component)) {
            errors.push(`Diagnostic ${diagnostic.code} references unknown component ${diagnostic.component}`);
        }
        if (!VALID_DIAGNOSTIC_SEVERITIES.has(diagnostic.severity)) {
            errors.push(`Diagnostic ${diagnostic.code} has invalid severity ${diagnostic.severity}`);
        }
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

    for (const localeId of state.inactiveLocaleDirectories || []) {
        warnings.push(`Locale source directory ${localeId} is preserved but inactive because it is not registered`);
    }

    for (const [localeId, localeCatalog] of Object.entries(state.localeCatalogs)) {
        if (!localeIds.has(localeId)) {
            errors.push(`Locale catalog exists for unknown locale ${localeId}`);
        }
        validateLocaleCatalog(localeId, localeCatalog, catalogByKey, keywordIds, errors, warnings);
    }

    for (const [localeId, componentCatalogs] of Object.entries(state.localeComponentCatalogs || {})) {
        for (const [componentId, document] of Object.entries(componentCatalogs)) {
            validateLocaleComponentCatalog(
                localeId,
                componentId,
                document,
                componentIds,
                catalogByKey,
                errors
            );
        }
    }

    const collisionReport = buildCollisionReport(state);
    for (const collision of collisionReport.collisions) {
        errors.push(`Duplicate keyword mapping in ${collision.locale}: ${collision.text} -> ${collision.ids.join(', ')}`);
    }

    const catalogOutputs = inspectCatalogOutputs(state, rootDir);
    errors.push(...catalogOutputs.errors);
    if (catalogOutputs.errors.length === 0) {
        try {
            collectMissingCatalogEntryKeys(state, rootDir);
        } catch (error) {
            errors.push(error.message);
        }
    }

    const normalizedInputAudit = buildNormalizedInputAudit(state, rootDir);
    if (normalizedInputAudit.status === 'partial') {
        warnings.push(
            `Normalized input audit is partial: ${normalizedInputAudit.summary.occurrences} `
            + `occurrence(s) remain in ${normalizedInputAudit.summary.filesWithMatches} `
            + 'non-English locale source file(s).'
        );
    }

    return {
        errors,
        warnings,
        collisionReport,
        catalogOutputs: catalogOutputs.locales,
        normalizedInputAudit
    };
}

/**
 * Inspect generated catalog paths without creating, deleting, or modifying
 * them. A missing locale directory is valid because it is the unit a later
 * build is allowed to create. An existing directory is also valid and must be
 * preserved. Only a non-directory collision is an error.
 *
 * @param {LanguageState} state Parsed authored language inputs.
 * @param {string} [rootDir] Repository root.
 * @returns {{errors: string[], locales: Object[]}} Per-locale output status.
 */
function inspectCatalogOutputs(state, rootDir = ROOT) {
    const catalogsDir = path.join(rootDir, 'build', 'language', 'catalogs');
    const locales = state.locales.locales || [];
    const errors = [];

    // The shared catalogs path may exist, but it must be a directory so locale
    // children can be inspected safely.
    if (fs.existsSync(catalogsDir) && !fs.statSync(catalogsDir).isDirectory()) {
        errors.push(`Catalog output root is not a directory: ${catalogsDir}`);
        return {
            errors,
            locales: locales.map((locale) => ({
                locale: locale.id,
                path: path.relative(rootDir, path.join(catalogsDir, locale.id)).split(path.sep).join('/'),
                status: 'invalid'
            }))
        };
    }

    // Report every registered locale. Missing is informational, not an error:
    // it means the next build may create that locale's complete catalog set.
    const outputLocales = locales.map((locale) => {
        const localeDir = path.join(catalogsDir, locale.id);
        if (!fs.existsSync(localeDir)) {
            return {
                locale: locale.id,
                path: path.relative(rootDir, localeDir).split(path.sep).join('/'),
                status: 'missing'
            };
        }
        if (!fs.statSync(localeDir).isDirectory()) {
            errors.push(`Catalog output path for locale ${locale.id} is not a directory: ${localeDir}`);
            return {
                locale: locale.id,
                path: path.relative(rootDir, localeDir).split(path.sep).join('/'),
                status: 'invalid'
            };
        }
        return {
            locale: locale.id,
            path: path.relative(rootDir, localeDir).split(path.sep).join('/'),
            status: 'existing'
        };
    });

    return { errors, locales: outputLocales };
}

/**
 * Atomically decide whether one locale may be generated.
 *
 * mkdirSync() is intentionally the decision point instead of a preceding
 * existsSync() check. Successful creation reserves a previously missing locale
 * for this build. EEXIST means the locale already exists and is eligible for
 * additive component updates. A file or other non-directory collision is
 * rejected.
 *
 * @param {string} localeId Registered locale identifier.
 * @param {string} catalogsDir Generated catalog root.
 * @param {string} rootDir Repository root used for report-relative paths.
 * @returns {{locale: string, path: string, status: string}} Build decision.
 */
function reserveCatalogLocale(localeId, catalogsDir, rootDir) {
    const localeDir = path.join(catalogsDir, localeId);
    let status;
    try {
        fs.mkdirSync(localeDir);
        status = 'generated';
    } catch (error) {
        if (error.code !== 'EEXIST') { throw error; }
        if (!fs.statSync(localeDir).isDirectory()) {
            throw new Error(`Catalog output path for locale ${localeId} is not a directory: ${localeDir}`);
        }
        status = 'existing';
    }
    return {
        locale: localeId,
        path: path.relative(rootDir, localeDir).split(path.sep).join('/'),
        status
    };
}

function createLocaleComponentCatalog(state, localeId, componentId, options = {}) {
    const localeCatalog = state.localeCatalogs[localeId] || emptyLocaleCatalog(localeId);
    const overrideEntries = mapBy(localeCatalog.entries || [], 'key');
    const apiTranslations = options.translationSuggestions?.[localeId] || {};
    const entries = {};

    for (const entry of (state.catalog.entries || []).filter((item) => item.component === componentId)) {
        const override = overrideEntries[entry.key];
        const apiTranslation = apiTranslations[entry.key];
        const translated = override || apiTranslation;
        entries[entry.key] = {
            text: translated?.text || entry.text,
            status: translated?.status || (localeId === 'en' ? entry.status : 'draft'),
            sourceStatus: entry.status,
            fallbackLocale: translated
                ? (Object.prototype.hasOwnProperty.call(translated, 'fallbackLocale')
                    ? translated.fallbackLocale
                    : null)
                : (localeId === 'en' ? null : 'en'),
            placeholders: entry.placeholders || []
        };
    }

    return {
        locale: localeId,
        component: componentId,
        generatedAt: new Date(0).toISOString(),
        entries
    };
}

function readExistingLocaleComponentCatalog(filePath, localeId, componentId) {
    if (!fs.existsSync(filePath)) { return null; }
    if (!fs.statSync(filePath).isFile()) {
        throw new Error(`Catalog component output is not a file: ${filePath}`);
    }

    let document;
    try {
        document = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        throw new Error(
            `Cannot update existing catalog ${localeId}/${componentId}: ${error.message}`
        );
    }
    if (!document || Array.isArray(document) || typeof document !== 'object') {
        throw new Error(`Cannot update existing catalog ${localeId}/${componentId}: root must be an object`);
    }
    if (document.locale !== undefined && document.locale !== localeId) {
        throw new Error(
            `Cannot update existing catalog ${localeId}/${componentId}: locale is ${document.locale}`
        );
    }
    if (document.component !== undefined && document.component !== componentId) {
        throw new Error(
            `Cannot update existing catalog ${localeId}/${componentId}: component is ${document.component}`
        );
    }
    if (Object.prototype.hasOwnProperty.call(document, 'entries')
        && (!document.entries || Array.isArray(document.entries) || typeof document.entries !== 'object')) {
        throw new Error(
            `Cannot update existing catalog ${localeId}/${componentId}: entries must be an object`
        );
    }
    return document;
}

function sourceEntryFromGenerated(entry) {
    return {
        text: entry.text,
        status: entry.status,
        ...(entry.notes ? { notes: entry.notes } : {})
    };
}

function validateDurableTranslationCandidate(localeId, componentId, key, entry, canonicalEntry) {
    if (!canonicalEntry || canonicalEntry.component !== componentId) {
        throw new Error(
            `Cannot persist generated translation ${localeId}/${componentId}/${key}: `
            + 'the key is not owned by the selected canonical component.'
        );
    }
    if (!entry || typeof entry.text !== 'string' || !entry.text.trim()) {
        throw new Error(
            `Cannot persist generated translation ${localeId}/${componentId}/${key}: text is empty.`
        );
    }
    if (!VALID_STATUSES.has(entry.status)) {
        throw new Error(
            `Cannot persist generated translation ${localeId}/${componentId}/${key}: `
            + `invalid status ${entry.status || '<missing>'}.`
        );
    }
    const placeholderErrors = [];
    validatePlaceholders(key, entry.text, canonicalEntry.placeholders || [], placeholderErrors);
    if (placeholderErrors.length > 0) {
        throw new Error(
            `Cannot persist generated translation ${localeId}/${componentId}/${key}: `
            + placeholderErrors.join(' ')
        );
    }
}

function writeJsonChangesAtomically(changes) {
    if (changes.length === 0) { return; }
    const transactionId = `${process.pid}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const staged = [];
    const activated = [];
    try {
        for (const change of changes) {
            ensureDirectory(path.dirname(change.filePath));
            const temporary = path.join(
                path.dirname(change.filePath),
                `.${path.basename(change.filePath)}.${transactionId}.tmp`
            );
            const backup = path.join(
                path.dirname(change.filePath),
                `.${path.basename(change.filePath)}.${transactionId}.bak`
            );
            fs.writeFileSync(temporary, `${JSON.stringify(change.document, null, 2)}\n`, {
                encoding: 'utf8',
                flag: 'wx'
            });
            staged.push({
                ...change,
                temporary,
                backup,
                hadOriginal: fs.existsSync(change.filePath)
            });
        }
        for (const item of staged) {
            if (item.hadOriginal) { fs.renameSync(item.filePath, item.backup); }
            try {
                fs.renameSync(item.temporary, item.filePath);
                activated.push(item);
            } catch (error) {
                if (item.hadOriginal && fs.existsSync(item.backup)) {
                    fs.renameSync(item.backup, item.filePath);
                }
                throw error;
            }
        }
        for (const item of staged) {
            try {
                if (fs.existsSync(item.backup)) { fs.unlinkSync(item.backup); }
            } catch {
                // A retained backup is safer than rolling back after other
                // transaction backups may already have been removed.
            }
        }
    } catch (error) {
        for (const item of activated.slice().reverse()) {
            if (fs.existsSync(item.filePath)) { fs.unlinkSync(item.filePath); }
            if (item.hadOriginal && fs.existsSync(item.backup)) {
                fs.renameSync(item.backup, item.filePath);
            }
        }
        for (const item of staged) {
            if (fs.existsSync(item.temporary)) { fs.unlinkSync(item.temporary); }
        }
        throw error;
    }
}

function persistGeneratedTranslations(state, rootDir = ROOT, translationSuggestions = {}, options = {}) {
    const canonicalByKey = new Map((state.catalog.entries || []).map((entry) => [entry.key, entry]));
    const componentIds = new Set((state.components.components || []).map((component) => component.id));
    const localeFilter = options.localeIds ? new Set(options.localeIds) : null;
    const componentFilter = options.componentIds ? new Set(options.componentIds) : null;
    const excludedKeysByLocale = options.excludedKeysByLocale || {};
    const changes = [];
    const persisted = [];

    for (const locale of state.locales.locales || []) {
        if (locale.id === 'en' || (localeFilter && !localeFilter.has(locale.id))) { continue; }
        const excludedKeys = new Set(excludedKeysByLocale[locale.id] || []);
        const authoredKeys = new Set((state.localeCatalogs[locale.id]?.entries || [])
            .map((entry) => entry.key));
        const candidatesByComponent = new Map();

        const addCandidate = (componentId, key, entry) => {
            if (excludedKeys.has(key)
                || authoredKeys.has(key)
                || entry?.fallbackLocale === 'en') {
                return;
            }
            const canonicalEntry = canonicalByKey.get(key);
            validateDurableTranslationCandidate(locale.id, componentId, key, entry, canonicalEntry);
            if (!candidatesByComponent.has(componentId)) {
                candidatesByComponent.set(componentId, new Map());
            }
            candidatesByComponent.get(componentId).set(key, sourceEntryFromGenerated(entry));
        };

        const generatedLocaleDir = path.join(rootDir, 'build', 'language', 'catalogs', locale.id);
        if (fs.existsSync(generatedLocaleDir) && fs.statSync(generatedLocaleDir).isDirectory()) {
            for (const componentId of componentIds) {
                if (componentFilter && !componentFilter.has(componentId)) { continue; }
                const generatedPath = path.join(generatedLocaleDir, `${componentId}.json`);
                const generated = readExistingLocaleComponentCatalog(
                    generatedPath,
                    locale.id,
                    componentId
                );
                for (const [key, entry] of Object.entries(generated?.entries || {})) {
                    const canonicalEntry = canonicalByKey.get(key);
                    if (!canonicalEntry
                        || (componentFilter && !componentFilter.has(canonicalEntry.component))) {
                        continue;
                    }
                    addCandidate(canonicalEntry.component, key, entry);
                }
            }
        }

        for (const [key, entry] of Object.entries(translationSuggestions[locale.id] || {})) {
            const canonicalEntry = canonicalByKey.get(key);
            if (!canonicalEntry) {
                throw new Error(`Cannot persist generated translation ${locale.id}/${key}: unknown key.`);
            }
            if (!componentFilter || componentFilter.has(canonicalEntry.component)) {
                addCandidate(canonicalEntry.component, key, entry);
            }
        }

        for (const [componentId, componentCandidates] of candidatesByComponent) {
            const existingDocument = state.localeComponentCatalogs[locale.id]?.[componentId] || {
                locale: locale.id,
                component: componentId,
                entries: {}
            };
            const entries = { ...(existingDocument.entries || {}) };
            const addedKeys = [];
            for (const [key, entry] of Array.from(componentCandidates.entries())
                .sort(([left], [right]) => left.localeCompare(right))) {
                if (Object.prototype.hasOwnProperty.call(entries, key)) { continue; }
                entries[key] = entry;
                addedKeys.push(key);
            }
            if (addedKeys.length === 0) { continue; }
            const relativePath = `language/locales/${locale.id}/${componentId}.json`;
            changes.push({
                filePath: path.join(rootDir, ...relativePath.split('/')),
                document: {
                    ...existingDocument,
                    locale: locale.id,
                    component: componentId,
                    entries
                }
            });
            persisted.push({
                locale: locale.id,
                component: componentId,
                entriesAdded: addedKeys.length,
                path: relativePath
            });
        }
    }

    if (options.dryRun !== true) {
        writeJsonChangesAtomically(changes);
    }
    return persisted;
}

function persistLocaleTranslationEntry(state, rootDir, localeId, key, entry) {
    const localeIds = new Set((state.locales.locales || []).map((locale) => locale.id));
    if (localeId === 'en' || !localeIds.has(localeId)) {
        throw new Error(`Cannot persist translation for unknown locale ${localeId}.`);
    }
    const canonicalEntry = (state.catalog.entries || []).find((item) => item.key === key);
    if (!canonicalEntry) {
        throw new Error(`Cannot persist translation ${localeId}/${key}: unknown catalog key.`);
    }
    const componentId = canonicalEntry.component;
    validateDurableTranslationCandidate(localeId, componentId, key, entry, canonicalEntry);

    const sourcePath = path.join(
        rootDir,
        'language',
        'locales',
        localeId,
        `${componentId}.json`
    );
    const sourceDocument = fs.existsSync(sourcePath)
        ? JSON.parse(fs.readFileSync(sourcePath, 'utf8'))
        : { locale: localeId, component: componentId, entries: {} };
    if (sourceDocument.locale !== localeId || sourceDocument.component !== componentId
        || !sourceDocument.entries || Array.isArray(sourceDocument.entries)
        || typeof sourceDocument.entries !== 'object') {
        throw new Error(
            `Cannot persist translation ${localeId}/${componentId}/${key}: `
            + 'the durable component source has invalid identity or entries.'
        );
    }
    const existingSourceEntry = sourceDocument.entries[key];
    if (existingSourceEntry
        && (existingSourceEntry.text !== entry.text || existingSourceEntry.status !== entry.status)) {
        throw new Error(
            `Refusing to overwrite existing durable translation ${localeId}/${componentId}/${key}.`
        );
    }

    const generatedPath = path.join(
        rootDir,
        'build',
        'language',
        'catalogs',
        localeId,
        `${componentId}.json`
    );
    const generatedDocument = readExistingLocaleComponentCatalog(
        generatedPath,
        localeId,
        componentId
    );
    if (!generatedDocument) {
        throw new Error(
            `Cannot persist translation ${localeId}/${componentId}/${key}: `
            + 'the generated component catalog does not exist.'
        );
    }
    const existingGeneratedEntry = generatedDocument.entries?.[key];
    if (existingGeneratedEntry?.fallbackLocale !== 'en'
        && existingGeneratedEntry?.text !== entry.text) {
        throw new Error(
            `Refusing to overwrite existing generated translation ${localeId}/${componentId}/${key}.`
        );
    }

    const sourceEntries = {
        ...sourceDocument.entries,
        [key]: sourceEntryFromGenerated(entry)
    };
    const generatedEntries = {
        ...generatedDocument.entries,
        [key]: {
            ...(existingGeneratedEntry || {}),
            fallbackLocale: null,
            placeholders: canonicalEntry.placeholders || [],
            sourceStatus: canonicalEntry.status,
            status: entry.status,
            text: entry.text
        }
    };
    writeJsonChangesAtomically([
        {
            filePath: sourcePath,
            document: { ...sourceDocument, entries: sourceEntries }
        },
        {
            filePath: generatedPath,
            document: { ...generatedDocument, entries: generatedEntries }
        }
    ]);
    return {
        locale: localeId,
        component: componentId,
        key,
        sourcePath: path.relative(rootDir, sourcePath).split(path.sep).join('/'),
        generatedPath: path.relative(rootDir, generatedPath).split(path.sep).join('/')
    };
}

function mergeMissingLocaleComponentEntries(existingCatalog, generatedCatalog) {
    const existingEntries = existingCatalog?.entries || {};
    const generatedEntries = generatedCatalog.entries || {};
    const addedKeys = Object.keys(generatedEntries)
        .filter((key) => !Object.prototype.hasOwnProperty.call(existingEntries, key))
        .sort();
    const refreshedFallbackKeys = Object.keys(generatedEntries)
        .filter((key) => (
            existingEntries[key]?.fallbackLocale === 'en'
            && generatedEntries[key]?.fallbackLocale === 'en'
            && JSON.stringify(existingEntries[key]) !== JSON.stringify(generatedEntries[key])
        ))
        .sort();

    if (!existingCatalog) {
        return { catalog: generatedCatalog, addedKeys, refreshedFallbackKeys };
    }
    if (addedKeys.length === 0 && refreshedFallbackKeys.length === 0) {
        return { catalog: existingCatalog, addedKeys, refreshedFallbackKeys };
    }
    const refreshedFallbacks = Object.fromEntries(
        refreshedFallbackKeys.map((key) => [key, generatedEntries[key]])
    );
    return {
        catalog: {
            ...generatedCatalog,
            ...existingCatalog,
            entries: {
                ...generatedEntries,
                ...existingEntries,
                ...refreshedFallbacks
            }
        },
        addedKeys,
        refreshedFallbackKeys
    };
}

function mergeLocaleComponentCatalog(existingCatalog, generatedCatalog, options = {}) {
    if (!existingCatalog) { return generatedCatalog; }
    const authoritativeKeys = new Set(options.authoritativeKeys || []);
    const allowFallbackReplacementKeys = new Set(options.allowFallbackReplacementKeys || []);
    const entries = { ...(existingCatalog.entries || {}) };

    for (const [key, generatedEntry] of Object.entries(generatedCatalog.entries || {})) {
        const existingEntry = entries[key];
        if (!existingEntry) {
            entries[key] = generatedEntry;
            continue;
        }
        if (existingEntry.fallbackLocale === 'en' && generatedEntry.fallbackLocale === 'en') {
            entries[key] = {
                ...existingEntry,
                ...generatedEntry
            };
            continue;
        }
        if (authoritativeKeys.has(key)
            || (allowFallbackReplacementKeys.has(key) && generatedEntry.fallbackLocale === 'en')) {
            entries[key] = {
                ...existingEntry,
                ...generatedEntry
            };
            continue;
        }
        entries[key] = {
            ...generatedEntry,
            ...existingEntry,
            sourceStatus: generatedEntry.sourceStatus,
            placeholders: generatedEntry.placeholders
        };
    }

    const unapprovedTransitions = [];
    for (const [key, existingEntry] of Object.entries(existingCatalog.entries || {})) {
        const nextEntry = entries[key];
        if (existingEntry?.fallbackLocale !== 'en'
            && nextEntry?.fallbackLocale === 'en'
            && !allowFallbackReplacementKeys.has(key)) {
            unapprovedTransitions.push(key);
        }
    }
    if (unapprovedTransitions.length > 0) {
        throw new Error(
            `Refusing translated-to-English-fallback replacement in `
            + `${generatedCatalog.locale}/${generatedCatalog.component}: `
            + unapprovedTransitions.sort().join(', ')
        );
    }

    return {
        ...generatedCatalog,
        ...existingCatalog,
        locale: generatedCatalog.locale,
        component: generatedCatalog.component,
        generatedAt: generatedCatalog.generatedAt,
        entries
    };
}

function inspectLocaleComponentUpdate(filePath, generatedCatalog) {
    const existingCatalog = readExistingLocaleComponentCatalog(
        filePath,
        generatedCatalog.locale,
        generatedCatalog.component
    );
    return {
        existingCatalog,
        ...mergeMissingLocaleComponentEntries(existingCatalog, generatedCatalog)
    };
}

function collectMissingCatalogEntryKeys(state, rootDir = ROOT, options = {}) {
    const catalogsDir = path.join(rootDir, 'build', 'language', 'catalogs');
    const localeFilter = options.localeIds ? new Set(options.localeIds) : null;
    const componentFilter = options.componentIds ? new Set(options.componentIds) : null;
    const components = sorted((state.components.components || [])
        .map((component) => component.id)
        .filter((componentId) => !componentFilter || componentFilter.has(componentId)));
    const result = {};

    for (const locale of state.locales.locales || []) {
        if (localeFilter && !localeFilter.has(locale.id)) { continue; }
        const missingKeys = [];
        for (const componentId of components) {
            const generatedCatalog = createLocaleComponentCatalog(state, locale.id, componentId);
            const target = path.join(catalogsDir, locale.id, `${componentId}.json`);
            const update = inspectLocaleComponentUpdate(target, generatedCatalog);
            missingKeys.push(...update.addedKeys);
        }
        result[locale.id] = missingKeys.sort();
    }
    return result;
}

function updateLocaleComponentCatalog(filePath, generatedCatalog) {
    const update = inspectLocaleComponentUpdate(filePath, generatedCatalog);
    if (!update.existingCatalog || update.addedKeys.length > 0 || update.refreshedFallbackKeys.length > 0) {
        writeJson(filePath, update.catalog);
    }
    return {
        entriesAdded: update.addedKeys.length,
        fallbackEntriesRefreshed: update.refreshedFallbackKeys.length,
        fileCreated: !update.existingCatalog,
        fileUpdated: Boolean(update.existingCatalog
            && (update.addedKeys.length > 0 || update.refreshedFallbackKeys.length > 0))
    };
}

/**
 * Regenerate one explicitly selected runtime catalog without discarding
 * unrelated generated translations. Authored values overlay existing output,
 * canonical keys absent from the output are added, and existing generated
 * values remain intact.
 */
function buildLocaleComponentOutput(
    state,
    validationResult,
    localeId,
    componentId,
    rootDir = ROOT,
    options = {}
) {
    const localeIds = new Set((state.locales.locales || []).map((locale) => locale.id));
    const componentIds = new Set((state.components.components || []).map((component) => component.id));
    if (!localeIds.has(localeId)) {
        throw new Error(`Unknown locale for component build: ${localeId || '<missing>'}`);
    }
    if (!componentIds.has(componentId)) {
        throw new Error(`Unknown component for component build: ${componentId || '<missing>'}`);
    }

    const allowFallbackReplacementKeys = new Set(options.allowFallbackReplacementKeys || []);
    const canonicalEntryByKey = new Map((state.catalog.entries || []).map((entry) => [entry.key, entry]));
    for (const key of allowFallbackReplacementKeys) {
        if (canonicalEntryByKey.get(key)?.component !== componentId) {
            throw new Error(
                `Fallback replacement approval ${key} does not belong to component ${componentId}.`
            );
        }
    }

    const persistedGeneratedTranslations = persistGeneratedTranslations(
        state,
        rootDir,
        options.translationSuggestions,
        {
            localeIds: [localeId],
            componentIds: [componentId],
            excludedKeysByLocale: { [localeId]: Array.from(allowFallbackReplacementKeys) }
        }
    );
    if (persistedGeneratedTranslations.length > 0) {
        state = loadLanguageState(rootDir);
        validationResult = validateLanguageState(state, rootDir);
        if (validationResult.errors.length > 0) {
            throw new Error(validationResult.errors.join('\n'));
        }
    }

    const localeDir = path.join(rootDir, 'build', 'language', 'catalogs', localeId);
    ensureDirectory(localeDir);
    const target = path.join(localeDir, `${componentId}.json`);
    const generatedCatalog = createLocaleComponentCatalog(state, localeId, componentId, options);
    const existingCatalog = readExistingLocaleComponentCatalog(target, localeId, componentId);
    const authoritativeKeys = (state.localeCatalogs[localeId]?.entries || [])
        .filter((entry) => canonicalEntryByKey.get(entry.key)?.component === componentId)
        .map((entry) => entry.key);
    const mergedCatalog = mergeLocaleComponentCatalog(existingCatalog, generatedCatalog, {
        authoritativeKeys,
        allowFallbackReplacementKeys
    });
    writeJson(target, mergedCatalog);

    // Refresh shared maps and reports through the established generator while
    // retaining the targeted action's historical skip of other existing locale
    // component files.
    buildLanguageOutputs(state, validationResult, rootDir, {
        ...options,
        updateExistingCatalogs: false,
        persistGeneratedTranslations: false,
        persistedGeneratedTranslations
    });
    return {
        locale: localeId,
        component: componentId,
        relativePath: path.relative(rootDir, target).split(path.sep).join('/'),
        persistedGeneratedTranslations
    };
}

function inspectLocaleOutputCompleteness(state, rootDir, localeId, componentIds) {
    const catalogEntries = new Map();
    for (const componentId of componentIds) {
        const filePath = path.join(
            rootDir,
            'build',
            'language',
            'catalogs',
            localeId,
            `${componentId}.json`
        );
        const document = readExistingLocaleComponentCatalog(filePath, localeId, componentId);
        for (const [key, entry] of Object.entries(document?.entries || {})) {
            catalogEntries.set(key, entry);
        }
    }

    const canonicalEntries = state.catalog.entries || [];
    let translatedEntries = 0;
    let machineGeneratedEntries = 0;
    let fallbackEntries = 0;
    let missingEntries = 0;
    for (const canonicalEntry of canonicalEntries) {
        const entry = catalogEntries.get(canonicalEntry.key);
        if (!entry) {
            missingEntries += 1;
        } else if (entry.fallbackLocale === 'en') {
            fallbackEntries += 1;
        } else {
            translatedEntries += 1;
            if (entry.status === 'machine-generated') { machineGeneratedEntries += 1; }
        }
    }

    const keywordMapPath = path.join(
        rootDir,
        'build',
        'language',
        'keyword-maps',
        `${localeId}-canonical-to-locale.json`
    );
    const keywordMap = fs.existsSync(keywordMapPath)
        ? JSON.parse(fs.readFileSync(keywordMapPath, 'utf8'))
        : {};
    const keywordEntries = Object.values(keywordMap);
    const keywordFallback = keywordEntries.filter((entry) => entry?.fallbackLocale === 'en').length;
    const keywordTranslated = keywordEntries.filter((entry) => entry?.fallbackLocale !== 'en').length;
    const canonicalKeywordCount = (state.keywords.keywords || []).length;

    return {
        entries: {
            total: canonicalEntries.length,
            translated: translatedEntries,
            machineGenerated: machineGeneratedEntries,
            fallback: fallbackEntries,
            missing: missingEntries
        },
        keywords: {
            total: canonicalKeywordCount,
            translated: keywordTranslated,
            fallback: keywordFallback,
            missing: Math.max(0, canonicalKeywordCount - keywordEntries.length)
        }
    };
}

/**
 * Generate derived language artifacts. Missing locale/component outputs are
 * created, while existing component files receive only absent entry keys.
 * Existing entry values always win. Keyword maps and reports remain aggregate
 * generated outputs and are refreshed for all registered locales.
 */
function buildLanguageOutputs(state, validationResult, rootDir = ROOT, options = {}) {
    const buildRoot = path.join(rootDir, 'build', 'language');
    const reportsDir = path.join(buildRoot, 'reports');
    const catalogsDir = path.join(buildRoot, 'catalogs');
    const keywordMapsDir = path.join(buildRoot, 'keyword-maps');
    const variableMapsDir = path.join(buildRoot, 'variable-maps');

    // Reject known path-type conflicts before creating any generated output.
    const catalogInspection = inspectCatalogOutputs(state, rootDir);
    if (catalogInspection.errors.length > 0) {
        throw new Error(catalogInspection.errors.join('\n'));
    }
    let persistedGeneratedTranslations = options.persistedGeneratedTranslations || [];
    if (options.persistGeneratedTranslations !== false) {
        const persisted = persistGeneratedTranslations(
            state,
            rootDir,
            options.translationSuggestions
        );
        persistedGeneratedTranslations = [
            ...persistedGeneratedTranslations,
            ...persisted
        ];
        if (persisted.length > 0) {
            state = loadLanguageState(rootDir);
            validationResult = validateLanguageState(state, rootDir);
            if (validationResult.errors.length > 0) {
                throw new Error(validationResult.errors.join('\n'));
            }
        }
    }
    if (options.updateExistingCatalogs !== false) {
        // Parse and validate every existing component output before any build
        // write so an invalid analyst-maintained file fails closed.
        collectMissingCatalogEntryKeys(state, rootDir);
    }

    ensureDirectory(catalogsDir);
    // Reserve all locale directories before the component-writing loop.
    const catalogLocales = (state.locales.locales || []).map((locale) => (
        reserveCatalogLocale(locale.id, catalogsDir, rootDir)
    ));
    const catalogLocaleById = new Map(catalogLocales.map((locale) => [
        locale.locale,
        locale
    ]));
    ensureDirectory(reportsDir);
    ensureDirectory(keywordMapsDir);
    ensureDirectory(variableMapsDir);

    const locales = state.locales.locales || [];
    const canonicalKeywords = state.keywords.keywords || [];
    const components = sorted((state.components.components || []).map((component) => component.id));
    const completeness = [];

    for (const locale of locales) {
        const localeCatalog = state.localeCatalogs[locale.id] || emptyLocaleCatalog(locale.id);
        const localeDir = path.join(catalogsDir, locale.id);
        const catalogLocale = catalogLocaleById.get(locale.id);
        const existingLocale = catalogLocale.status === 'existing';

        const overrideKeywords = mapBy(localeCatalog.keywords || [], 'id');

        let entriesAdded = 0;
        let fallbackEntriesRefreshed = 0;
        let componentFilesCreated = 0;
        let componentFilesUpdated = 0;
        if (!existingLocale || options.updateExistingCatalogs !== false) {
            for (const component of components) {
                const update = updateLocaleComponentCatalog(
                    path.join(localeDir, `${component}.json`),
                    createLocaleComponentCatalog(state, locale.id, component, options)
                );
                entriesAdded += update.entriesAdded;
                fallbackEntriesRefreshed += update.fallbackEntriesRefreshed;
                componentFilesCreated += update.fileCreated ? 1 : 0;
                componentFilesUpdated += update.fileUpdated ? 1 : 0;
            }
        }
        if (existingLocale) {
            if (options.updateExistingCatalogs === false) {
                catalogLocale.status = 'skipped-existing';
            } else if (componentFilesCreated > 0 || componentFilesUpdated > 0) {
                catalogLocale.status = 'updated-existing';
            } else {
                catalogLocale.status = 'unchanged-existing';
            }
        }
        catalogLocale.entriesAdded = entriesAdded;
        catalogLocale.fallbackEntriesRefreshed = fallbackEntriesRefreshed;
        catalogLocale.componentFilesCreated = componentFilesCreated;
        catalogLocale.componentFilesUpdated = componentFilesUpdated;

        // Keyword maps are aggregate generated artifacts outside the protected
        // per-locale catalog directories, so they are refreshed for all locales.
        const maps = buildKeywordMaps(locale.id, canonicalKeywords, overrideKeywords);
        writeJson(path.join(keywordMapsDir, `${locale.id}-canonical-to-locale.json`), maps.canonicalToLocale);
        writeJson(path.join(keywordMapsDir, `${locale.id}-locale-to-canonical.json`), maps.localeToCanonical);
        completeness.push({
            locale: locale.id,
            status: locale.status,
            ...inspectLocaleOutputCompleteness(state, rootDir, locale.id, components)
        });
    }

    writeJson(path.join(variableMapsDir, 'project-variable-map.example.json'), state.variableMapExample);

    const migrationReport = buildMigrationReport(state, rootDir);
    const buildReport = {
        generatedAt: new Date(0).toISOString(),
        catalogLocales,
        components,
        locales: locales.map((locale) => locale.id),
        validation: {
            errors: validationResult.errors,
            warnings: [
                ...validationResult.warnings,
                ...(options.translationWarnings || [])
            ]
        },
        translation: (() => {
            const mode = ['normalized', 'deepl', 'google', 'none'].includes(options.translationMode)
                ? options.translationMode
                : 'deepl';
            const apiCalls = options.translationUsage?.apiCalls || 0;
            const charactersPassed = options.translationUsage?.charactersPassed || 0;
            const normalizedSubstitutionAssignments = options.translationAssignments || {};
            return {
                mode,
                provider: translationProviderName(mode),
                englishSource: options.useNormalized === false ? 'canonical' : 'normalized',
                apiCalls,
                sourceCharactersPassed: charactersPassed,
                deepLApiCalls: mode === 'deepl' ? apiCalls : 0,
                deepLCharactersPassed: mode === 'deepl' ? charactersPassed : 0,
                googleApiCalls: mode === 'google' ? apiCalls : 0,
                googleCharactersPassed: mode === 'google' ? charactersPassed : 0,
                ...(Object.keys(normalizedSubstitutionAssignments).length > 0
                    ? { normalizedSubstitutionAssignments }
                    : {})
            };
        })(),
        persistedGeneratedTranslations,
        outputs: {
            catalogs: path.relative(rootDir, catalogsDir),
            keywordMaps: path.relative(rootDir, keywordMapsDir),
            variableMaps: path.relative(rootDir, variableMapsDir),
            reports: path.relative(rootDir, reportsDir)
        }
    };

    writeJson(path.join(reportsDir, 'language-build-report.json'), buildReport);
    writeJson(path.join(reportsDir, 'translation-completeness.json'), { locales: completeness });
    writeJson(path.join(reportsDir, 'keyword-collisions.json'), validationResult.collisionReport);
    writeJson(path.join(reportsDir, 'migration-report.json'), migrationReport);
    writeNormalizedInputAuditReports(validationResult.normalizedInputAudit, rootDir);

    return {
        buildReport,
        catalogLocales,
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

function catalogEntryReference(entry) {
    return {
        key: entry.key,
        component: entry.component,
        category: entry.category,
        role: entry.role
    };
}

function catalogFormatKeyForCandidate(candidate, sourceText = null) {
    const reference = candidate?.catalogReference;
    if (reference?.kind === 'catalog.format-key' && typeof reference.key === 'string') {
        return reference.key;
    }

    if (Number.isInteger(candidate?.startIndex) && typeof sourceText === 'string') {
        const prefix = sourceText.slice(Math.max(0, candidate.startIndex - 256), candidate.startIndex);
        if (/\bcatalog\s*\.\s*format\s*\(\s*$/.test(prefix)) {
            return candidate.text;
        }
        return null;
    }

    if (Number.isInteger(candidate?.startColumn) && candidate.endLine === candidate.line) {
        const prefix = candidate.fullLine.slice(0, candidate.startColumn);
        if (/\bcatalog\s*\.\s*format\s*\(\s*$/.test(prefix)) {
            return candidate.text;
        }
        return null;
    }

    const formatPattern = /\bcatalog\s*\.\s*format\s*\(\s*(['"`])((?:\\.|(?!\1).)*?)\1/g;
    let match;
    while ((match = formatPattern.exec(candidate?.fullLine || '')) !== null) {
        if (match[2] === candidate.text) { return candidate.text; }
    }
    return null;
}

function expandCatalogFormatCandidates(state, candidates, sourceText = null) {
    const catalogEntriesByKey = new Map((state.catalog.entries || []).map((entry) => [entry.key, entry]));
    const existingResolved = new Set(candidates
        .filter((candidate) => candidate?.catalogReference?.kind === 'catalog.format-text')
        .map((candidate) => (
            `${candidate.line}\0${candidate.fullLine}\0${candidate.catalogReference.key}\0${candidate.text}`
        )));
    const expanded = [];

    for (const candidate of candidates) {
        const key = catalogFormatKeyForCandidate(candidate, sourceText);
        const catalogEntry = key == null ? null : catalogEntriesByKey.get(key);
        if (!catalogEntry) {
            expanded.push(candidate);
            continue;
        }

        const current = {
            ...candidate,
            catalogReference: { kind: 'catalog.format-key', key }
        };
        const resolvedIdentity = `${candidate.line}\0${candidate.fullLine}\0${key}\0${catalogEntry.text}`;
        if (catalogEntry.text !== candidate.text && !existingResolved.has(resolvedIdentity)) {
            expanded.push({
                line: candidate.line,
                text: catalogEntry.text,
                fullLine: candidate.fullLine,
                historical: true,
                catalogReference: { kind: 'catalog.format-text', key }
            });
            existingResolved.add(resolvedIdentity);
        }
        expanded.push(current);
    }
    return expanded;
}

function reportableMigrationCandidate(candidate) {
    const item = {
        line: candidate.line,
        text: candidate.text,
        fullLine: candidate.fullLine
    };
    if (candidate.historical === true) { item.historical = true; }
    if (candidate.catalogReference) { item.catalogReference = candidate.catalogReference; }
    return item;
}

function createMigrationCatalogMatcher(state, relativePath) {
    const catalogEntriesByText = new Map();
    const catalogEntriesByKey = new Map();
    const catalogEntriesByNormalizedSource = new Map();
    const normalizedRelativePath = String(relativePath || '').replaceAll('\\', '/').toLocaleLowerCase();

    for (const entry of state.catalog.entries || []) {
        const reference = catalogEntryReference(entry);
        catalogEntriesByKey.set(entry.key, reference);
        const exactMatches = catalogEntriesByText.get(entry.text) || [];
        exactMatches.push(reference);
        catalogEntriesByText.set(entry.text, exactMatches);

        const normalizedSource = String(entry.source || '').replaceAll('\\', '/').toLocaleLowerCase();
        if (normalizedSource !== normalizedRelativePath || !Number.isInteger(entry.sourceLine)) { continue; }
        const sourceIdentity = `${entry.sourceLine}\0${entry.text}`;
        const sourceMatches = catalogEntriesByNormalizedSource.get(sourceIdentity) || [];
        sourceMatches.push(reference);
        catalogEntriesByNormalizedSource.set(sourceIdentity, sourceMatches);
    }

    return (candidate) => {
        const exactMatches = catalogEntriesByText.get(candidate.text) || [];
        const referencedKey = candidate?.catalogReference?.key || catalogFormatKeyForCandidate(candidate);
        const referencedMatch = referencedKey == null ? null : catalogEntriesByKey.get(referencedKey);
        const normalizedText = normalizeText(candidate.text, state.normalizedWords);
        const normalizedMatches = catalogEntriesByNormalizedSource.get(
            `${candidate.line}\0${normalizedText}`
        ) || [];
        const matchesByKey = new Map();
        for (const match of [...exactMatches, ...normalizedMatches, ...(referencedMatch ? [referencedMatch] : [])]) {
            matchesByKey.set(match.key, match);
        }
        return Array.from(matchesByKey.values());
    };
}

function buildMigrationReport(state, rootDir = ROOT) {
    const files = state.components.migrationInventory?.scanFiles || [];
    const candidateStatuses = state.components.migrationInventory?.candidateStatuses || [];
    const candidateStatusesBySourceText = new Map();
    for (const entry of candidateStatuses) {
        const identity = `${migrationSourceIdentity(entry)}\0${entry.text}`;
        const matches = candidateStatusesBySourceText.get(identity) || [];
        matches.push(entry);
        candidateStatusesBySourceText.set(identity, matches);
    }
    const statusFor = (source, candidate) => {
        const matches = candidateStatusesBySourceText.get(
            `${migrationSourceIdentity(source)}\0${candidate.text}`
        ) || [];
        // The legacy report parser has no stable occurrence identity. Never fan
        // one V2 decision out over duplicate source occurrences.
        return matches.length === 1 ? matches[0].status : null;
    };
    const items = [];

    for (const inventoryEntry of files) {
        let source;
        try {
            source = resolveMigrationSource(rootDir, state, inventoryEntry);
        } catch (error) {
            items.push({
                rootId: inventoryEntry.rootId || 'project',
                path: inventoryEntry.path,
                file: `${inventoryEntry.rootId || 'project'}:${inventoryEntry.path}`,
                component: inventoryEntry.component,
                status: 'unmapped',
                error: error.message
            });
            continue;
        }
        const relativePath = source.path;
        const component = inventoryEntry.component;
        const absolutePath = source.absolutePath;
        if (!fs.existsSync(absolutePath)) {
            items.push({
                rootId: source.rootId,
                path: source.path,
                file: source.displayPath,
                component,
                status: 'missing'
            });
            continue;
        }

        const text = fs.readFileSync(absolutePath, 'utf8');
        const extractedStrings = expandCatalogFormatCandidates(
            state,
            extractStringCandidates(text, { includeLocations: true }),
            text
        );
        const catalogEntriesForCandidate = createMigrationCatalogMatcher(state, source.displayPath);
        const classifiedStrings = extractedStrings.map((candidate) => ({
            candidate,
            catalogEntries: catalogEntriesForCandidate(candidate)
        }));
        const candidates = classifiedStrings
            .filter(({ catalogEntries }) => catalogEntries.length === 0)
            .map(({ candidate }) => ({
                ...reportableMigrationCandidate(candidate),
                status: statusFor(source, candidate) || 'potential'
            }));
        const catalogedStrings = classifiedStrings
            .filter(({ catalogEntries }) => catalogEntries.length > 0)
            .map(({ candidate, catalogEntries }) => ({
                ...reportableMigrationCandidate(candidate),
                status: ['code-edit', 'code-updated'].includes(statusFor(source, candidate))
                    ? statusFor(source, candidate)
                    : 'in-catalog',
                catalogEntries
            }));
        items.push({
            rootId: source.rootId,
            path: source.path,
            file: source.displayPath,
            component,
            status: 'scanned',
            candidateCount: candidates.length,
            candidates,
            catalogedStringCount: catalogedStrings.length,
            catalogedStrings
        });
    }

    return {
        title: 'Human-facing source strings and catalog coverage',
        generatedAt: new Date(0).toISOString(),
        note: 'This report contains reviewed migration candidates and detected strings already represented in the catalog. It is not a behavior change and does not imply every string should be cataloged.',
        files: items
    };
}

/**
 * Extracts human-readable string literals from JavaScript-like source text.
 *
 * The function searches for complete single-quoted, double-quoted, and
 * template-literal strings without imposing a minimum length. It normalizes
 * whitespace and excludes values without letters and captured require
 * expressions. Single words, identifiers, filenames, and paths remain
 * candidates because any of them may represent user-facing document text.
 *
 * @param {string} text
 *     The complete source text to inspect.
 * @param {object} [options]
 * @param {boolean} [options.includeLocations]
 *     Include exact string-literal offsets for validated transformation tools.
 *
 * @returns {Array<{line: number, text: string, fullLine: string}>}
 *     Candidate strings together with the source line on which each string
 *     literal begins and the complete physical line from the source file.
 */
function isDirectRequireArgument(sourceText, openingQuoteIndex) {
    let cursor = openingQuoteIndex - 1;
    while (cursor >= 0 && /\s/.test(sourceText[cursor])) { cursor -= 1; }
    if (sourceText[cursor] !== '(') { return false; }

    cursor -= 1;
    while (cursor >= 0 && /\s/.test(sourceText[cursor])) { cursor -= 1; }
    const tokenEnd = cursor + 1;
    while (cursor >= 0 && /[A-Za-z0-9_$]/.test(sourceText[cursor])) { cursor -= 1; }
    return sourceText.slice(cursor + 1, tokenEnd) === 'require';
}

function extractStringCandidates(text, options = {}) {
    // Accumulates the accepted string candidates in source order.
    const candidates = [];
    const sourceLines = text.split(/\r?\n/);

    /*
     * Match quoted strings delimited by ', ", or `.
     *
     * Capture groups:
     *   1. The opening delimiter.
     *   2. The string contents without the surrounding delimiters.
     *
     * Pattern details:
     *   (['"`])
     *       Captures the opening quote character.
     *
     *   (?:\\.|(?!\1).)
     *       Matches either an escaped character, such as \" or \n, or any
     *       character that is not the matching closing delimiter.
     *
     *   *?
     *       Matches as little text as necessary before reaching the closing
     *       delimiter. Matching complete literals, including short ones,
     *       prevents a closing quote from being reused as the opening quote of
     *       a false cross-literal match.
     *
     *   \1
     *       Requires the closing delimiter to match the opening delimiter.
     *
     * The global flag allows every qualifying string in the input to be found.
     * The regex does not attempt to fully parse JavaScript and therefore may
     * also match quoted text inside comments or other non-code regions.
     */
    const stringPattern = /(['"`])((?:\\.|(?!\1).)*?)\1/g;

    // Holds each successive regular-expression match.
    let match;

    // Continue until RegExp.exec() reports that no more matches exist.
    while ((match = stringPattern.exec(text)) !== null) {
        const rawValue = match[2];
        /*
         * Normalize the captured string contents:
         *
         * - Convert escaped newline sequences into spaces.
         * - Convert escaped carriage-return sequences into spaces.
         * - Collapse all consecutive whitespace into one space.
         * - Remove leading and trailing whitespace.
         *
         * match[2] contains the text inside the matched delimiters.
         */
        const value = rawValue
            .replace(/\\n/g, ' ')
            .replace(/\\r/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        /*
         * Reject strings without an ASCII letter.
         *
         * This removes values consisting only of numbers, punctuation,
         * whitespace, or symbols.
         */
        if (!/[A-Za-z]/.test(value)) { continue; }

        /*
         * Reject a string literal used as the direct argument to require().
         *
         * match.index identifies the opening quote, so inspect only the source
         * immediately before that quote. Do not inspect the captured string
         * value: the module identifier itself is irrelevant, and user-facing
         * text is allowed to begin with the characters "require(".
         */
        if (isDirectRequireArgument(text, match.index)) { continue; }

        /*
         * Record the normalized candidate.
         *
         * match.index is the zero-based character offset of the opening quote.
         * lineNumberAt() converts that offset into the corresponding source
         * line number.
         */
        const line = lineNumberAt(text, match.index);
        const candidate = {
            line,
            text: value,
            fullLine: sourceLines[line - 1] || ''
        };
        if (options.includeLocations === true) {
            const endIndex = stringPattern.lastIndex;
            const lineStartIndex = text.lastIndexOf('\n', match.index - 1) + 1;
            candidate.endLine = lineNumberAt(text, endIndex - 1);
            candidate.startIndex = match.index;
            candidate.endIndex = endIndex;
            candidate.startColumn = match.index - lineStartIndex;
            candidate.endColumn = endIndex - lineStartIndex;
            candidate.literal = text.slice(match.index, endIndex);
            candidate.delimiter = match[1];
            candidate.rawValue = rawValue;
            candidate.literalKind = match[1] === '`'
                ? 'template'
                : match[1] === '"' ? 'double-quoted' : 'single-quoted';
        }
        candidates.push(candidate);
    }

    // Return all accepted candidates in the order in which they were found.
    return candidates;
}

function validateLocaleCatalog(localeId, localeCatalog, catalogByKey, keywordIds, errors, warnings) {
    if (localeCatalog.locale !== localeId) {
        errors.push(`Locale catalog ${localeId} has mismatched locale field ${localeCatalog.locale}`);
    }
    if (!VALID_STATUSES.has(localeCatalog.status)) {
        errors.push(`Locale catalog ${localeId} has invalid status ${localeCatalog.status}`);
    }

    const entryKeys = new Set();
    for (const entry of localeCatalog.entries || []) {
        requireFields(entry, ['key', 'text', 'status'], `locale:${localeId}:entry:${entry.key || '<missing>'}`, errors);
        const canonicalEntry = catalogByKey.get(entry.key);
        if (!canonicalEntry) {
            errors.push(`Locale ${localeId} has unknown catalog key ${entry.key}`);
        } else {
            validatePlaceholders(entry.key, entry.text, canonicalEntry.placeholders || [], errors);
        }
        if (!VALID_STATUSES.has(entry.status)) {
            errors.push(`Locale ${localeId} entry ${entry.key} has invalid status ${entry.status}`);
        }
        addUnique(entryKeys, entry.key, `locale ${localeId} catalog key ${entry.key}`, errors);
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

function validateLocaleComponentCatalog(
    localeId,
    componentId,
    document,
    componentIds,
    catalogByKey,
    errors
) {
    requireFields(document, ['locale', 'component', 'entries'], `localeComponent:${localeId}:${componentId}`, errors);
    if (document.locale !== localeId) {
        errors.push(`Locale component ${localeId}/${componentId} has mismatched locale ${document.locale}`);
    }
    if (document.component !== componentId) {
        errors.push(`Locale component ${localeId}/${componentId} has mismatched component ${document.component}`);
    }
    if (!componentIds.has(componentId)) {
        errors.push(`Locale component ${localeId}/${componentId} references an unknown component`);
    }
    if (!document.entries || Array.isArray(document.entries) || typeof document.entries !== 'object') {
        errors.push(`Locale component ${localeId}/${componentId} entries must be an object`);
        return;
    }
    for (const [key, entry] of Object.entries(document.entries)) {
        const canonicalEntry = catalogByKey.get(key);
        if (canonicalEntry && canonicalEntry.component !== componentId) {
            errors.push(`Locale component ${localeId}/${componentId} contains key ${key} owned by ${canonicalEntry.component}`);
        }
        if (entry && Object.prototype.hasOwnProperty.call(entry, 'key')) {
            errors.push(`Locale component ${localeId}/${componentId} entry ${key} must not repeat its key as a field`);
        }
    }
}

function validatePreviewModes(previewModes, errors) {
    const ids = new Set();
    for (const mode of previewModes.modes || []) {
        requireFields(mode, ['id', 'description', 'status'], `previewMode:${mode.id || '<missing>'}`, errors);
        addUnique(ids, mode.id, `preview mode id ${mode.id}`, errors);
        if (!VALID_STATUSES.has(mode.status)) {
            errors.push(`Preview mode ${mode.id} has invalid status ${mode.status}`);
        }
    }
    if (!ids.has(previewModes.defaultMode)) {
        errors.push(`Preview default mode ${previewModes.defaultMode} is not declared`);
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

/**
 * Load sparse authored locale overrides. Reviewed overrides take precedence
 * over representative samples. Legacy catalog filenames are rejected so a
 * translation file cannot silently stop participating in the merge.
 */
function loadLocaleCatalogs(
    rootDir = ROOT,
    componentDefinitions = { components: [] },
    localeDefinitions = { locales: [] }
) {
    const localesRoot = path.join(rootDir, 'language', 'locales');
    const catalogs = {};
    const components = {};
    const inactiveDirectories = [];
    if (!fs.existsSync(localesRoot)) { return { catalogs, components, inactiveDirectories }; }

    const componentIds = sorted((componentDefinitions.components || []).map((component) => component.id));
    const activeLocaleIds = new Set((localeDefinitions.locales || []).map((locale) => locale.id));

    for (const name of fs.readdirSync(localesRoot)) {
        const fullPath = path.join(localesRoot, name);
        if (!fs.statSync(fullPath).isDirectory()) { continue; }
        if (!activeLocaleIds.has(name)) {
            inactiveDirectories.push(name);
            continue;
        }

        const overridePath = path.join(fullPath, 'catalogOverrides.json');
        const sampleOverridePath = path.join(fullPath, 'catalogOverrides.sample.json');
        const legacyPaths = [
            path.join(fullPath, 'catalog.json'),
            path.join(fullPath, 'catalog.sample.json')
        ].filter((filePath) => fs.existsSync(filePath));
        if (legacyPaths.length > 0) {
            throw new Error([
                `Legacy locale override filename found for ${name}: ${path.basename(legacyPaths[0])}`,
                'Rename catalog.json to catalogOverrides.json or catalog.sample.json to catalogOverrides.sample.json.'
            ].join('\n'));
        }
        if (fs.existsSync(overridePath)) {
            catalogs[name] = readJson(rootDir, path.relative(rootDir, overridePath));
        } else if (fs.existsSync(sampleOverridePath)) {
            catalogs[name] = readJson(rootDir, path.relative(rootDir, sampleOverridePath));
        } else {
            catalogs[name] = emptyLocaleCatalog(name);
        }

        components[name] = {};
        for (const componentId of componentIds) {
            const componentPath = path.join(fullPath, `${componentId}.json`);
            if (!fs.existsSync(componentPath)) { continue; }
            const document = readJson(rootDir, path.relative(rootDir, componentPath));
            components[name][componentId] = document;
            for (const [key, entry] of Object.entries(document.entries || {})) {
                catalogs[name].entries.push({ key, ...entry });
            }
        }
    }

    return { catalogs, components, inactiveDirectories: sorted(inactiveDirectories) };
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

function readJson(rootDir, relativePath) {
    return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), 'utf8'));
}

function writeJson(filePath, value) {
    ensureDirectory(path.dirname(filePath));
    fs.writeFileSync(filePath, `${JSON.stringify(sortDeep(value), null, 2)}\n`, 'utf8');
}

function writeText(filePath, value) {
    ensureDirectory(path.dirname(filePath));
    fs.writeFileSync(filePath, value, 'utf8');
}

function writeNormalizedInputAuditReports(audit, rootDir = ROOT) {
    const reportsDir = path.join(rootDir, 'build', 'language', 'reports');
    const jsonPath = path.join(reportsDir, 'normalized-input-audit.json');
    const markdownPath = path.join(reportsDir, 'normalized-input-audit.md');
    writeJson(jsonPath, audit);
    writeText(markdownPath, renderNormalizedInputAuditMarkdown(audit));
    return { jsonPath, markdownPath };
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
    printWarnings(result.warnings);
    for (const error of result.errors) {
        console.error(`Error: ${error}`);
    }
    if (result.catalogOutputs?.length) {
        console.log('Catalog output locales:');
        for (const locale of result.catalogOutputs) {
            console.log(`- ${locale.locale}: ${locale.status} (${locale.path})`);
        }
    }
    printNormalizedInputAudit(result.normalizedInputAudit);
    console.log(`Language validation: ${result.errors.length === 0 ? 'passed' : 'failed'} (${result.errors.length} error(s), ${result.warnings.length} warning(s))`);
}

function printNormalizedInputAudit(audit) {
    if (!audit) { return; }
    console.log(
        `Normalized input audit: ${audit.status} `
        + `(${audit.summary.occurrences} occurrence(s), ${audit.summary.filesWithMatches} file(s))`
    );
    for (const file of audit.files) {
        const words = file.words.map((word) => `${word.input} (${word.count})`).join(', ');
        console.log(`- ${file.file}: ${file.occurrenceCount} occurrence(s) [${words}]`);
    }
}

function printWarnings(warnings = []) {
    for (const warning of warnings) {
        console.warn(`Warning: ${warning}`);
    }
}

function printTranslationPlan(translator, localeIds = [], componentId = null, options = {}) {
    const locales = localeIds.filter(Boolean);
    if (locales.length === 0) {
        console.log(
            'Translation API: not requested; no missing generated catalog entries. '
            + 'Existing catalog entry keys were preserved.'
        );
        return;
    }

    const info = translator.info();
    const scope = componentId
        ? `${locales.join(', ')}/${componentId}`
        : `${locales.length} locale(s) with missing entries: ${locales.join(', ')}`;
    if (!info.configured) {
        console.warn(
            `Warning: Translation API: ${info.provider || 'DeepL'} is not configured in this process; `
            + `attempting ${scope} will use `
            + `${options.useNormalized === false ? 'canonical' : 'normalized'} English fallback.`
        );
        return;
    }
    console.log(
        `Translation API: ${info.provider || 'DeepL'} configured via `
        + `${info.credentialSource || 'environment'}; requesting missing values for ${scope} `
        + `using ${options.useNormalized === false ? 'canonical' : 'normalized'} English.`
    );
}

function translationProviderName(mode) {
    if (mode === 'google') { return 'Google Translate'; }
    if (mode === 'deepl') { return 'DeepL'; }
    return 'None';
}

function printTranslationResult(translation, mode) {
    const suggestionCount = Object.values(translation.suggestions || {})
        .reduce((total, suggestions) => total + Object.keys(suggestions || {}).length, 0);
    console.log(
        `Translation API result: ${suggestionCount} suggestion(s), `
        + `${(translation.warnings || []).length} warning(s).`
    );
    printTranslationApiUsage(translationProviderName(mode), translation.usage);
}

function printTranslationApiUsage(provider, usage = {}) {
    console.log(
        `${provider} API usage: ${usage.apiCalls || 0} call(s), `
        + `${usage.charactersPassed || 0} source character(s) passed.`
    );
}

function printNormalizedPlan(localeIds = []) {
    const locales = localeIds.filter(Boolean);
    if (locales.length === 0) {
        console.log(
            'Translation API: disabled; no non-English locales require normalized English fallbacks.'
        );
        return;
    }
    console.log(
        `Translation API: disabled; generating or refreshing normalized English fallbacks for `
        + `${locales.length} locale(s): ${locales.join(', ')}.`
    );
}

function printNoTranslationApiPlan(localeIds = [], componentId = null) {
    const locales = localeIds.filter(Boolean);
    const scope = componentId && locales.length > 0
        ? `${locales.join(', ')}/${componentId}`
        : `${locales.length} locale(s)`;
    console.log(
        `Translation API: disabled; ${scope} will generate or refresh canonical English fallbacks.`
    );
}

function printSuggestionResult(suggestions, mode) {
    if (!['normalized', 'none'].includes(mode)) {
        printTranslationResult(suggestions, mode);
        return;
    }
    if (mode === 'none') {
        console.log('Translation API result: disabled; 0 API call(s).');
        return;
    }
    const suggestionCount = Object.values(suggestions.suggestions || {})
        .reduce((total, localeSuggestions) => (
            total + Object.keys(localeSuggestions || {}).length
        ), 0);
    console.log(
        `Normalized English result: ${suggestionCount} value(s), `
        + `${(suggestions.warnings || []).length} warning(s).`
    );
    printTranslationApiUsage('Translation', suggestions.usage);
}

function printBuildSummary(reports) {
    console.log(`Language build complete: ${reports.buildReport.locales.length} locale(s), ${reports.buildReport.components.length} component(s)`);
    console.log(
        `Catalog locales: ${reports.catalogLocales.filter((locale) => locale.status === 'generated').length} generated, `
        + `${reports.catalogLocales.filter((locale) => locale.status === 'updated-existing').length} updated existing, `
        + `${reports.catalogLocales.filter((locale) => locale.status === 'unchanged-existing').length} unchanged existing, `
        + `${reports.catalogLocales.filter((locale) => locale.status === 'skipped-existing').length} skipped existing`
    );
    console.log(
        `Catalog entries added: ${reports.catalogLocales.reduce((total, locale) => total + (locale.entriesAdded || 0), 0)}`
    );
    console.log(
        `Generated translations persisted: ${(reports.buildReport.persistedGeneratedTranslations || [])
            .reduce((total, component) => total + (component.entriesAdded || 0), 0)}`
    );
    console.log(`Keyword collisions: ${reports.collisionReport.collisions.length}`);
}

function writeHumanReadableReport(reports, rootDir = ROOT) {
    const reportPath = path.join(rootDir, 'build', 'language', 'reports', 'language-report.txt');
    const reportText = formatHumanReadableReport(reports);

    writeText(reportPath, reportText);
    process.stdout.write(reportText);
    console.log(`Human-readable report written to ${path.relative(rootDir, reportPath)}`);
}

function formatHumanReadableReport(reports) {
    const collisions = reports.collisionReport.collisions || [];
    const migrationFiles = reports.migrationReport.files || [];
    const scannedFiles = migrationFiles.filter((file) => file.status === 'scanned');
    const missingFiles = migrationFiles.filter((file) => file.status === 'missing');
    const candidateCount = scannedFiles.reduce((total, file) => total + file.candidateCount, 0);
    const validation = reports.buildReport.validation;
    const translation = reports.buildReport.translation || {
        mode: 'normalized',
        provider: 'None',
        englishSource: 'normalized',
        apiCalls: 0,
        sourceCharactersPassed: 0,
        deepLApiCalls: 0,
        deepLCharactersPassed: 0,
        googleApiCalls: 0,
        googleCharactersPassed: 0
    };
    const persistedGeneratedTranslations = reports.buildReport.persistedGeneratedTranslations || [];
    const persistedGeneratedEntryCount = persistedGeneratedTranslations.reduce(
        (total, component) => total + (component.entriesAdded || 0),
        0
    );
    const lines = [
        'MYDEFRAG LANGUAGE REPORT',
        '========================',
        '',
        'SUMMARY',
        '-------',
        `Validation: passed (${validation.errors.length} error(s), ${validation.warnings.length} warning(s))`,
        `Locales: ${reports.buildReport.locales.length}`,
        `Components: ${reports.buildReport.components.length}`,
        `Translation mode: ${translation.mode}`,
        `English source: ${translation.englishSource || 'normalized'}`,
        `Translation API provider: ${translation.provider || translationProviderName(translation.mode)}`,
        `Translation API calls: ${translation.apiCalls || 0}`,
        `Translation API source characters passed: ${translation.sourceCharactersPassed || 0}`,
        `DeepL API calls: ${translation.deepLApiCalls}`,
        `DeepL source characters passed: ${translation.deepLCharactersPassed}`,
        `Google Translate API calls: ${translation.googleApiCalls || 0}`,
        `Google Translate source characters passed: ${translation.googleCharactersPassed || 0}`,
        `Generated translations persisted: ${persistedGeneratedEntryCount} `
            + `across ${persistedGeneratedTranslations.length} locale component file(s)`,
        `Keyword collisions: ${collisions.length}`,
        `Migration files: ${scannedFiles.length} scanned, ${missingFiles.length} missing`,
        `Migration candidates: ${candidateCount}`,
        '',
        'CATALOG GENERATION',
        '------------------',
        ...formatTable(
            ['Locale', 'Catalog status', 'Path'],
            reports.catalogLocales.map((locale) => [
                locale.locale,
                locale.status,
                locale.path
            ])
        ),
        '',
        'TRANSLATION COMPLETENESS',
        '------------------------',
        ...formatTable(
            [
                'Locale',
                'Status',
                'Entries translated',
                'Entry fallback',
                'Entries missing',
                'Keywords translated',
                'Keyword fallback',
                'Keywords missing'
            ],
            reports.completeness.map((locale) => [
                locale.locale,
                locale.status,
                formatCoverage(locale.entries.translated, locale.entries.total),
                String(locale.entries.fallback),
                String(locale.entries.missing || 0),
                formatCoverage(locale.keywords.translated, locale.keywords.total),
                String(locale.keywords.fallback),
                String(locale.keywords.missing || 0)
            ])
        ),
        '',
        'KEYWORD COLLISIONS',
        '------------------'
    ];

    if (collisions.length === 0) {
        lines.push('None.');
    } else {
        for (const collision of collisions) {
            lines.push(`${collision.locale}: ${collision.text} -> ${collision.ids.join(', ')}`);
        }
    }

    if (validation.warnings.length > 0) {
        lines.push('', 'VALIDATION WARNINGS', '-------------------');
        for (const warning of validation.warnings) {
            lines.push(`- ${warning}`);
        }
    }

    lines.push(
        '',
        'MIGRATION CANDIDATE INVENTORY',
        '-----------------------------',
        reports.migrationReport.note,
        ''
    );

    for (const file of migrationFiles) {
        lines.push(`${file.file} [${file.component}]`);
    }

    lines.push(
        '',
        'CANDIDATE FILES',
        '---------------',
    );

    for (const file of migrationFiles) {
        lines.push('', file.file, '-'.repeat(file.file.length), `Component: ${file.component}`, `Status: ${file.status}`);

        if (file.status !== 'scanned') {
            continue;
        }

        lines.push(`Non-catalog candidates: ${file.candidateCount}`);
        for (const candidate of file.candidates) {
            lines.push(...formatCandidate(candidate));
        }
        lines.push(`Found in catalog: ${file.catalogedStringCount}`);
        for (const found of file.catalogedStrings) {
            lines.push(formatCatalogedCandidate(found));
        }
    }

    return `${lines.join('\n')}\n`;
}

function formatCoverage(translated, total) {
    const percentage = total === 0 ? 100 : (translated / total) * 100;
    return `${translated}/${total} (${percentage.toFixed(1)}%)`;
}

function formatTable(headers, rows) {
    const widths = headers.map((header, index) => Math.max(
        header.length,
        ...rows.map((row) => row[index].length)
    ));
    const formatRow = (row) => row
        .map((cell, index) => cell.padEnd(widths[index]))
        .join(' | ')
        .trimEnd();

    return [
        formatRow(headers),
        widths.map((width) => '-'.repeat(width)).join('-+-'),
        ...rows.map(formatRow)
    ];
}

function formatCandidate(candidate) {
    const prefix = `Line ${candidate.line} [${candidate.status || 'potential'}]: `;
    const continuation = ' '.repeat(prefix.length);
    const wrapped = wrapText(candidate.text, 100 - prefix.length);

    return wrapped.map((line, index) => `${index === 0 ? prefix : continuation}${line}`);
}

function formatCatalogedCandidate(candidate) {
    const prefix = `Line ${candidate.line} [${candidate.status || 'in-catalog'}]: `;
    const catalogKeys = candidate.catalogEntries.map((entry) => entry.key).join(', ');
    return `${prefix}${candidate.text} | Catalog: ${catalogKeys}`;
}

function wrapText(value, width) {
    const words = String(value).split(/\s+/);
    const lines = [];
    let line = '';

    for (const word of words) {
        if (line.length > 0 && line.length + word.length + 1 > width) {
            lines.push(line);
            line = word;
        } else {
            line = line.length === 0 ? word : `${line} ${word}`;
        }
    }

    if (line.length > 0) {
        lines.push(line);
    }

    return lines.length > 0 ? lines : [''];
}

if (require.main === module) {
    void main().catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    });
}

module.exports = {
    DeepLTranslationService,
    GoogleTranslationService,
    EXPECTED_LOCALES,
    VALID_DIAGNOSTIC_SEVERITIES,
    VALID_STATUSES,
    buildLanguageOutputs,
    buildNormalizedInputAudit,
    buildLocaleComponentOutput,
    collectMissingCatalogEntryKeys,
    createNoTranslationApiSuggestions,
    createTranslationService,
    createMigrationCatalogMatcher,
    expandCatalogFormatCandidates,
    createBuildTranslationSuggestions,
    createNormalizedEnglishSuggestions,
    createLocaleComponentCatalog,
    inspectLocaleOutputCompleteness,
    mergeLocaleComponentCatalog,
    mergeMissingLocaleComponentEntries,
    persistLocaleTranslationEntry,
    persistGeneratedTranslations,
    buildMigrationReport,
    extractStringCandidates,
    loadLanguageState,
    migrationSourceIdentity,
    main,
    parseCommandLine,
    resolveMigrationSource,
    sourceRootBindingsFromEnvironment,
    validateLanguageState,
    writeNormalizedInputAuditReports
};
