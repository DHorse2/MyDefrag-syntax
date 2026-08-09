'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Sandboxed preload scripts cannot load local CommonJS modules. Keep this
// channel inventory self-contained and verify it against shared/contracts.js
// in ui-security.test.js.
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

contextBridge.exposeInMainWorld('languageMaintenance', Object.freeze({
    load: () => ipcRenderer.invoke(CHANNELS.load),
    applyRecord: (request) => ipcRenderer.invoke(CHANNELS.applyRecord, request),
    applyComponent: (request) => ipcRenderer.invoke(CHANNELS.applyComponent, request),
    applyLocale: (request) => ipcRenderer.invoke(CHANNELS.applyLocale, request),
    deleteLocale: (localeId) => ipcRenderer.invoke(CHANNELS.deleteLocale, localeId),
    setPreviewDefault: (modeId) => ipcRenderer.invoke(CHANNELS.setPreviewDefault, modeId),
    chooseMigrationFiles: (request) => ipcRenderer.invoke(CHANNELS.chooseMigrationFiles, request),
    scanMigrationFile: () => ipcRenderer.invoke(CHANNELS.scanMigrationFile),
    scanMigrationFolder: () => ipcRenderer.invoke(CHANNELS.scanMigrationFolder),
    addScannedMigrationFile: (request) => ipcRenderer.invoke(CHANNELS.addScannedMigrationFile, request),
    addScannedMigrationFiles: (request) => ipcRenderer.invoke(CHANNELS.addScannedMigrationFiles, request),
    getMigrationSummary: () => ipcRenderer.invoke(CHANNELS.getMigrationSummary),
    getMigrationCandidates: (relativePath) => ipcRenderer.invoke(CHANNELS.getMigrationCandidates, relativePath),
    setMigrationCandidateStatus: (request) => ipcRenderer.invoke(CHANNELS.setMigrationCandidateStatus, request),
    suggestCatalogKey: (request) => ipcRenderer.invoke(CHANNELS.suggestCatalogKey, request),
    getLanguageReport: () => ipcRenderer.invoke(CHANNELS.getLanguageReport),
    setLanguageReportDirty: (dirty) => ipcRenderer.invoke(CHANNELS.setLanguageReportDirty, dirty),
    saveLanguageReport: (request) => ipcRenderer.invoke(CHANNELS.saveLanguageReport, request),
    openMigrationSource: (request) => ipcRenderer.invoke(CHANNELS.openMigrationSource, request),
    openScannedMigrationSource: (request) => ipcRenderer.invoke(CHANNELS.openScannedMigrationSource, request),
    assignMigrationFileComponent: (request) => ipcRenderer.invoke(CHANNELS.assignMigrationFileComponent, request),
    removeMigrationFile: (relativePath) => ipcRenderer.invoke(CHANNELS.removeMigrationFile, relativePath),
    revert: () => ipcRenderer.invoke(CHANNELS.revert),
    reload: () => ipcRenderer.invoke(CHANNELS.reload),
    validate: () => ipcRenderer.invoke(CHANNELS.validate),
    previewSave: () => ipcRenderer.invoke(CHANNELS.previewSave),
    confirmSave: (preview) => ipcRenderer.invoke(CHANNELS.confirmSave, preview),
    save: (request) => ipcRenderer.invoke(CHANNELS.save, request),
    rebuild: (request) => ipcRenderer.invoke(CHANNELS.rebuild, request),
    cancelBuild: () => ipcRenderer.invoke(CHANNELS.cancelBuild),
    onProgress: (listener) => {
        const handler = (_event, progress) => listener(progress);
        ipcRenderer.on(EVENTS.progress, handler);
        return () => ipcRenderer.removeListener(EVENTS.progress, handler);
    },
    exit: () => ipcRenderer.invoke(CHANNELS.exit)
}));
