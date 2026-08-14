'use strict';

const { LocaleCatalogRepository } = require('../repositories/locale-catalog-repository');
const { LocaleCatalogValidator } = require('../validation/locale-catalog-validator');
const { BuildIntegration } = require('../../mdl-language-app/services/build-integration');
const { DeepLTranslationService } = require('../../language/translation/deepl-translation-service');
const { normalizeText } = require('../../language/translation/text-normalizer');

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function report(listener, progress) {
    if (typeof listener !== 'function') { return; }
    try {
        listener(progress);
    } catch {
        // Progress reporting must never interrupt a repository transaction.
    }
}

class LocaleMaintenanceService {
    constructor(rootDir, options = {}) {
        this.rootDir = rootDir;
        this.builder = options.builder || require('../../scripts/build-language');
        this.repository = options.repository || new LocaleCatalogRepository(rootDir);
        this.buildIntegration = options.buildIntegration || new BuildIntegration(rootDir);
        this.translator = options.translator || new DeepLTranslationService();
        this.state = null;
        this.validator = null;
        this.selectedLocale = null;
        this.selectedComponent = null;
        this.originalDocument = null;
        this.draftDocument = null;
        this.generatedDocument = null;
        this.translationSuggestions = new Map();
    }

    load(selection = {}) {
        this.repository.assertProjectRoot();
        this.state = this.builder.loadLanguageState(this.rootDir);
        this.validator = new LocaleCatalogValidator(this.state);
        const localeIds = (this.state.locales.locales || []).map((locale) => locale.id);
        const componentIds = (this.state.components.components || []).map((component) => component.id);
        const localeId = selection.localeId || localeIds.find((id) => id !== 'en') || localeIds[0];
        const componentId = selection.componentId || componentIds[0];
        this.selectInternal(localeId, componentId);
        return this.snapshot();
    }

    select(payload = {}) {
        this.ensureLoaded();
        if (this.hasChanges() && !payload.discard) {
            return { ok: false, stage: 'unsaved', error: 'Discard or save changes before changing locale or component.' };
        }
        try {
            this.selectInternal(payload.localeId, payload.componentId);
            return { ok: true, state: this.snapshot() };
        } catch (error) {
            return { ok: false, stage: 'selection', error: error.message };
        }
    }

    selectInternal(localeId, componentId) {
        const locale = (this.state.locales.locales || []).find((item) => item.id === localeId);
        const component = (this.state.components.components || []).find((item) => item.id === componentId);
        if (!locale) { throw new Error(`Unknown locale: ${localeId || '<missing>'}`); }
        if (!component) { throw new Error(`Unknown component: ${componentId || '<missing>'}`); }
        this.selectedLocale = localeId;
        this.selectedComponent = componentId;
        const canonicalEntries = this.canonicalEntries(componentId);
        this.originalDocument = this.repository.loadDraft(localeId, componentId, canonicalEntries);
        this.draftDocument = clone(this.originalDocument);
        this.generatedDocument = this.repository.loadGeneratedTranslations(
            localeId,
            componentId,
            canonicalEntries
        );
        const generatedValidation = this.validator.validate(this.generatedDocument);
        if (!generatedValidation.ok) {
            throw new Error(
                `Generated locale catalog is invalid: `
                + generatedValidation.errors.map((error) => error.message).join('; ')
            );
        }
        this.translationSuggestions = new Map();
    }

    canonicalEntries(componentId = this.selectedComponent) {
        return (this.state.catalog.entries || []).filter((entry) => entry.component === componentId);
    }

    snapshot() {
        this.ensureLoaded();
        const apiTranslation = this.translator.info();
        const locale = (this.state.locales.locales || []).find((item) => item.id === this.selectedLocale);
        const component = (this.state.components.components || []).find((item) => item.id === this.selectedComponent);
        const rows = this.canonicalEntries().map((canonical) => {
            const authoredTranslation = this.draftDocument.entries[canonical.key] || null;
            const generatedTranslation = this.generatedDocument.entries[canonical.key] || null;
            const translation = authoredTranslation || generatedTranslation;
            const apiTranslation = this.translationSuggestions.get(canonical.key) || null;
            return {
                key: canonical.key,
                category: canonical.category,
                role: canonical.role,
                sourceText: canonical.text,
                normalizedText: normalizeText(canonical.text, this.state.normalizedWords, {
                    preserveRuntimeSyntax: true
                }),
                sourceStatus: canonical.status,
                placeholders: canonical.placeholders || [],
                translationText: translation?.text || '',
                translationStatus: translation?.status || 'draft',
                notes: translation?.notes || '',
                translated: Boolean(translation),
                authored: Boolean(authoredTranslation),
                translationOrigin: authoredTranslation
                    ? 'authored'
                    : (generatedTranslation ? 'generated' : 'fallback'),
                apiTranslationText: apiTranslation?.text || '',
                apiTranslationReady: Boolean(apiTranslation),
                apiTranslationProvider: apiTranslation?.provider || null
            };
        });
        const translated = rows.filter((row) => row.translated).length;
        return {
            projectRoot: this.rootDir,
            dirty: this.hasChanges(),
            readOnly: this.selectedLocale === 'en',
            readOnlyReason: this.selectedLocale === 'en'
                ? 'English text is canonical and must be maintained in MyDefrag Language Maintenance.'
                : null,
            apiTranslation: { configured: Boolean(apiTranslation.configured) },
            locales: clone(this.state.locales.locales || []),
            components: clone(this.state.components.components || []),
            statuses: Array.from(this.builder.VALID_STATUSES).sort(),
            selectedLocale: this.selectedLocale,
            selectedComponent: this.selectedComponent,
            locale: clone(locale),
            component: clone(component),
            authoritativeFile: this.repository.componentPath(this.selectedLocale, this.selectedComponent),
            generatedFile: `build/language/catalogs/${this.selectedLocale}/${this.selectedComponent}.json`,
            rows,
            completeness: { total: rows.length, translated, fallback: rows.length - translated },
            validation: this.validate()
        };
    }

    applyTranslation(payload = {}) {
        this.ensureLoaded();
        if (this.selectedLocale === 'en') {
            return { ok: false, errors: [{ path: '/locale', message: 'English canonical text is read-only here.' }] };
        }
        const canonical = this.canonicalEntries().find((entry) => entry.key === payload.key);
        if (!canonical) {
            return { ok: false, errors: [{ path: '/key', message: `Unknown key for selected component: ${payload.key}` }] };
        }
        const candidate = clone(this.draftDocument);
        candidate.entries[payload.key] = {
            text: String(payload.text || '').trim(),
            status: String(payload.status || ''),
            ...(String(payload.notes || '').trim() ? { notes: String(payload.notes).trim() } : {})
        };
        const validation = this.validator.validate(candidate);
        if (!validation.ok) { return validation; }
        this.draftDocument = candidate;
        return { ok: true, state: this.snapshot() };
    }

    async requestApiTranslation(payload = {}) {
        this.ensureLoaded();
        if (this.selectedLocale === 'en') {
            return { ok: false, stage: 'translation', error: 'Canonical English is not an API translation target.' };
        }
        const canonical = this.canonicalEntries().find((entry) => entry.key === payload.key);
        if (!canonical) {
            return { ok: false, stage: 'translation', error: `Unknown key for selected component: ${payload.key}` };
        }
        const sourceText = String(payload.text || '').trim();
        if (!sourceText) {
            return {
                ok: false,
                stage: 'translation',
                error: 'Enter or populate Current locale value before generating an API translation.',
                state: this.snapshot()
            };
        }
        const result = await this.translator.translateText({
            text: sourceText,
            targetLocale: this.selectedLocale,
            placeholders: canonical.placeholders || []
        });
        if (!result.ok) {
            return { ok: false, stage: 'translation', error: result.error, state: this.snapshot() };
        }
        this.translationSuggestions.set(canonical.key, {
            text: result.text,
            provider: result.provider,
            targetLanguage: result.targetLanguage
        });
        return {
            ok: true,
            sourceText,
            translationText: result.text,
            state: this.snapshot()
        };
    }

    replaceWithApiTranslation(payload = {}) {
        this.ensureLoaded();
        const suggestion = this.translationSuggestions.get(payload.key);
        if (!suggestion) {
            return { ok: false, stage: 'translation', error: 'Generate an API translation before replacing the value.' };
        }
        const existing = this.draftDocument.entries[payload.key]
            || this.generatedDocument.entries[payload.key]
            || null;
        return this.applyTranslation({
            key: payload.key,
            text: suggestion.text,
            status: existing?.status || 'machine-generated',
            notes: existing?.notes || ''
        });
    }

    removeTranslation(key) {
        this.ensureLoaded();
        if (!Object.prototype.hasOwnProperty.call(this.draftDocument.entries, key)) {
            return {
                ok: false,
                errors: [{
                    path: '/key',
                    message: 'Generated translations must be applied before they can be removed from authored data.'
                }]
            };
        }
        const candidate = clone(this.draftDocument);
        delete candidate.entries[key];
        this.draftDocument = candidate;
        return { ok: true, state: this.snapshot() };
    }

    hasChanges() {
        if (!this.originalDocument || !this.draftDocument) { return false; }
        return this.repository.serialize(this.repository.normalizeDocument(this.originalDocument))
            !== this.repository.serialize(this.repository.normalizeDocument(this.draftDocument));
    }

    validate() {
        this.ensureLoaded();
        return this.validator.validate(this.draftDocument);
    }

    previewSave() {
        const validation = this.validate();
        const changes = this.hasChanges()
            ? this.repository.changedDocuments(
                this.selectedLocale,
                this.selectedComponent,
                this.draftDocument,
                this.canonicalEntries()
            )
            : [];
        return { validation, authoritativeFiles: changes.map((change) => change.relativePath) };
    }

    async save(onProgress) {
        const preview = this.previewSave();
        if (!preview.validation.ok) { return { ok: false, stage: 'validation', ...preview }; }
        if (preview.authoritativeFiles.length === 0) {
            return { ok: true, stage: 'unchanged', authoritativeFiles: [], generatedFiles: [], state: this.snapshot() };
        }

        const localeId = this.selectedLocale;
        const componentId = this.selectedComponent;
        const changes = this.repository.changedDocuments(localeId, componentId, this.draftDocument, this.canonicalEntries());
        report(onProgress, { phase: 'snapshot', message: 'Capturing generated files for rollback', cancellable: false });
        const generatedBefore = this.buildIntegration.snapshot();
        const durableLocaleBefore = this.buildIntegration.snapshotDurableLocaleSources();
        let transaction;
        try {
            report(onProgress, { phase: 'write', message: 'Writing authoritative locale files', cancellable: false });
            transaction = this.repository.beginTransaction(changes);
            const build = await this.buildIntegration.run(
                ['build-component', localeId, componentId],
                onProgress
            );
            if (!build.ok) {
                report(onProgress, { phase: 'rollback', message: 'Restoring authoritative and generated files', cancellable: false });
                transaction.rollback();
                this.buildIntegration.restore(generatedBefore);
                this.buildIntegration.restoreDurableLocaleSources(durableLocaleBefore);
                return {
                    ok: false,
                    stage: 'build',
                    authoritativeFiles: preview.authoritativeFiles,
                    generatedFiles: [],
                    build,
                    rolledBack: true,
                    state: this.load({ localeId, componentId })
                };
            }
            report(onProgress, { phase: 'compare', message: 'Checking generated file changes', cancellable: false });
            const generatedAfter = this.buildIntegration.snapshot();
            const generatedFiles = this.buildIntegration.diff(generatedBefore, generatedAfter);
            const durableLocaleAfter = this.buildIntegration.snapshotDurableLocaleSources();
            const durableLocaleFiles = this.buildIntegration.diff(
                durableLocaleBefore,
                durableLocaleAfter
            );
            report(onProgress, { phase: 'commit', message: 'Committing locale source changes', cancellable: false });
            const recoveryFiles = transaction.commit();
            return {
                ok: true,
                stage: 'complete',
                authoritativeFiles: preview.authoritativeFiles,
                generatedFiles,
                durableLocaleFiles,
                recoveryFiles,
                build,
                state: this.load({ localeId, componentId })
            };
        } catch (error) {
            report(onProgress, { phase: 'rollback', message: 'Restoring files after an error', cancellable: false });
            if (transaction) { transaction.rollback(); }
            this.buildIntegration.restore(generatedBefore);
            this.buildIntegration.restoreDurableLocaleSources(durableLocaleBefore);
            return {
                ok: false,
                stage: 'write',
                error: error.message,
                authoritativeFiles: preview.authoritativeFiles,
                generatedFiles: [],
                rolledBack: true,
                state: this.load({ localeId, componentId })
            };
        }
    }

    revert() {
        this.draftDocument = clone(this.originalDocument);
        return this.snapshot();
    }

    reload() {
        return this.load({ localeId: this.selectedLocale, componentId: this.selectedComponent });
    }

    async rebuild(onProgress) {
        if (this.hasChanges()) {
            return { ok: false, stage: 'unsaved', error: 'Save or revert changes before rebuilding.' };
        }
        const result = await this.buildIntegration.rebuildWithRollback([
            'build-component',
            this.selectedLocale,
            this.selectedComponent
        ], onProgress);
        return {
            ...result,
            state: result.ok
                ? this.load({
                    localeId: this.selectedLocale,
                    componentId: this.selectedComponent
                })
                : this.snapshot()
        };
    }

    cancelBuild() {
        return this.buildIntegration.cancel();
    }

    isBuildRunning() {
        return this.buildIntegration.isRunning();
    }

    ensureLoaded() {
        if (!this.state || !this.draftDocument || !this.generatedDocument) {
            throw new Error('Locale maintenance data has not been loaded.');
        }
    }
}

module.exports = { LocaleMaintenanceService };
