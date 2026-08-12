'use strict';

const VIEW_DEFINITIONS = Object.freeze({
    catalog: Object.freeze({
        title: 'Component Catalog',
        file: 'language/canonical/component-catalog.json',
        stateKey: 'catalog',
        collectionKey: 'entries',
        identityKey: 'key',
        schema: 'component-catalog.schema.json',
        componentScoped: true
    }),
    categories: Object.freeze({
        title: 'Categories',
        file: 'language/canonical/catalog-categories.json',
        stateKey: 'categories',
        collectionKey: 'categories',
        identityKey: 'id',
        schema: 'catalog-categories.schema.json',
        componentScoped: false
    }),
    roles: Object.freeze({
        title: 'Roles',
        file: 'language/canonical/catalog-roles.json',
        stateKey: 'roles',
        collectionKey: 'roles',
        identityKey: 'id',
        schema: 'catalog-roles.schema.json',
        componentScoped: false
    }),
    diagnostics: Object.freeze({
        title: 'Diagnostic Messages',
        file: 'language/canonical/diagnostic-messages.json',
        stateKey: 'diagnostics',
        collectionKey: 'diagnostics',
        identityKey: 'code',
        schema: 'diagnostic-messages.schema.json',
        componentScoped: true
    }),
    keywords: Object.freeze({
        title: 'Semantic Keywords',
        file: 'language/canonical/semantic-keywords.json',
        stateKey: 'keywords',
        collectionKey: 'keywords',
        identityKey: 'id',
        schema: 'semantic-keywords.schema.json',
        componentScoped: false
    }),
    previewModes: Object.freeze({
        title: 'Preview Modes',
        file: 'language/canonical/preview-modes.json',
        stateKey: 'previewModes',
        collectionKey: 'modes',
        identityKey: 'id',
        schema: 'preview-modes.schema.json',
        componentScoped: false
    })
});

const CHANNELS = Object.freeze({
    load: 'language-maintenance:load',
    applyRecord: 'language-maintenance:apply-record',
    applyComponent: 'language-maintenance:apply-component',
    applyLocale: 'language-maintenance:apply-locale',
    deleteLocale: 'language-maintenance:delete-locale',
    setPreviewDefault: 'language-maintenance:set-preview-default',
    chooseMigrationFiles: 'language-maintenance:choose-migration-files',
    scanMigrationFile: 'language-maintenance:scan-migration-file',
    scanMigrationFolder: 'language-maintenance:scan-migration-folder',
    addScannedMigrationFile: 'language-maintenance:add-scanned-migration-file',
    addScannedMigrationFiles: 'language-maintenance:add-scanned-migration-files',
    getMigrationSummary: 'language-maintenance:get-migration-summary',
    getMigrationCandidates: 'language-maintenance:get-migration-candidates',
    setMigrationCandidateStatus: 'language-maintenance:set-migration-candidate-status',
    suggestCatalogKey: 'language-maintenance:suggest-catalog-key',
    previewMigrationSourceTransform: 'language-maintenance:preview-migration-source-transform',
    getMigrationSourceUpdateStatus: 'language-maintenance:get-migration-source-update-status',
    replaceMigrationSourceLine: 'language-maintenance:replace-migration-source-line',
    getLanguageReport: 'language-maintenance:get-language-report',
    setLanguageReportDirty: 'language-maintenance:set-language-report-dirty',
    saveLanguageReport: 'language-maintenance:save-language-report',
    openMigrationSource: 'language-maintenance:open-migration-source',
    openScannedMigrationSource: 'language-maintenance:open-scanned-migration-source',
    assignMigrationFileComponent: 'language-maintenance:assign-migration-file-component',
    removeMigrationFile: 'language-maintenance:remove-migration-file',
    revert: 'language-maintenance:revert',
    reload: 'language-maintenance:reload',
    validate: 'language-maintenance:validate',
    previewSave: 'language-maintenance:preview-save',
    confirmSave: 'language-maintenance:confirm-save',
    save: 'language-maintenance:save',
    rebuild: 'language-maintenance:rebuild',
    cancelBuild: 'language-maintenance:cancel-build',
    exit: 'language-maintenance:exit'
});

const EVENTS = Object.freeze({
    progress: 'language-maintenance:progress'
});

module.exports = {
    CHANNELS,
    EVENTS,
    VIEW_DEFINITIONS
};
