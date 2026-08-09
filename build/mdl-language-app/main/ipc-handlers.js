'use strict';

const path = require('path');
const { CHANNELS, EVENTS } = require('../shared/contracts');

function safeHandler(handler) {
    return async (event, payload) => {
        try {
            return await handler(payload, event);
        } catch (error) {
            return {
                ok: false,
                stage: 'application',
                error: error.message
            };
        }
    };
}

function progressReporter(event, operation) {
    return (progress) => {
        const sender = event?.sender;
        if (!sender || (typeof sender.isDestroyed === 'function' && sender.isDestroyed())) { return; }
        sender.send(EVENTS.progress, { operation, ...progress });
    };
}

function registerIpcHandlers(options) {
    const { ipcMain, dialog, service, openSource, getWindow, closeApplication } = options;
    let migrationChooserDirectory = service.rootDir;
    const chooseMigrationSourceFiles = async (chooserOptions) => {
        const result = await dialog.showOpenDialog(getWindow(), {
            ...chooserOptions,
            defaultPath: migrationChooserDirectory
        });
        if (!result.canceled && result.filePaths?.[0]) {
            migrationChooserDirectory = chooserOptions.properties?.includes('openDirectory')
                ? result.filePaths[0]
                : path.dirname(result.filePaths[0]);
        }
        return result;
    };
    ipcMain.handle(CHANNELS.load, safeHandler(() => service.load()));
    ipcMain.handle(CHANNELS.applyRecord, safeHandler((payload) => service.applyRecord(payload)));
    ipcMain.handle(CHANNELS.applyComponent, safeHandler((payload) => service.applyComponent(payload)));
    ipcMain.handle(CHANNELS.applyLocale, safeHandler((payload) => service.applyLocale(payload)));
    ipcMain.handle(CHANNELS.deleteLocale, safeHandler(async (localeId) => {
        const id = String(localeId || '').trim();
        const result = await dialog.showMessageBox(getWindow(), {
            type: 'warning',
            buttons: ['Keep catalog (recommended)', 'Delete catalog on Save', 'Cancel'],
            defaultId: 0,
            cancelId: 2,
            title: `Delete locale ${id}?`,
            message: `Remove ${id} from the locale registry?`,
            detail: [
                `The generated build/language/catalogs/${id} data will be kept by default.`,
                'Authored files under language/locales are always preserved.'
            ].join('\n')
        });
        if (result.response === 2) {
            return { ok: false, cancelled: true };
        }
        return service.removeLocale(id, { removeCatalog: result.response === 1 });
    }));
    ipcMain.handle(CHANNELS.setPreviewDefault, safeHandler((modeId) => service.setPreviewDefault(modeId)));
    ipcMain.handle(CHANNELS.chooseMigrationFiles, safeHandler(async (payload) => {
        const result = await chooseMigrationSourceFiles({
            title: 'Add migration source files',
            buttonLabel: 'Add files',
            properties: ['openFile', 'multiSelections']
        });
        if (result.canceled) {
            return { ok: false, cancelled: true };
        }
        return service.addMigrationFiles(result.filePaths, payload?.componentId);
    }));
    ipcMain.handle(CHANNELS.scanMigrationFile, safeHandler(async () => {
        const result = await chooseMigrationSourceFiles({
            title: 'Scan migration source file',
            buttonLabel: 'Scan file',
            properties: ['openFile']
        });
        if (result.canceled) {
            return { ok: false, cancelled: true };
        }
        return service.scanMigrationFile(result.filePaths[0]);
    }));
    ipcMain.handle(CHANNELS.scanMigrationFolder, safeHandler(async () => {
        const result = await chooseMigrationSourceFiles({
            title: 'Scan migration source folder',
            buttonLabel: 'Scan folder',
            properties: ['openDirectory']
        });
        if (result.canceled) {
            return { ok: false, cancelled: true };
        }
        return service.scanMigrationFolder(result.filePaths[0]);
    }));
    ipcMain.handle(CHANNELS.addScannedMigrationFile, safeHandler((payload) => (
        service.addScannedMigrationFile(payload?.path, payload?.componentId)
    )));
    ipcMain.handle(CHANNELS.addScannedMigrationFiles, safeHandler((payload) => (
        service.addScannedMigrationFiles(payload?.paths, payload?.componentId)
    )));
    ipcMain.handle(CHANNELS.getMigrationSummary, safeHandler(() => service.getMigrationSummary()));
    ipcMain.handle(CHANNELS.getMigrationCandidates, safeHandler((relativePath) => (
        service.getMigrationCandidates(relativePath)
    )));
    ipcMain.handle(CHANNELS.setMigrationCandidateStatus, safeHandler((payload) => (
        service.setMigrationCandidateStatus(payload)
    )));
    ipcMain.handle(CHANNELS.suggestCatalogKey, safeHandler((payload) => (
        service.suggestCatalogKey(payload)
    )));
    ipcMain.handle(CHANNELS.getLanguageReport, safeHandler(() => service.getLanguageReport()));
    ipcMain.handle(CHANNELS.setLanguageReportDirty, safeHandler((dirty) => (
        service.setLanguageReportDirty(dirty)
    )));
    ipcMain.handle(CHANNELS.saveLanguageReport, safeHandler((payload) => (
        service.saveLanguageReport(payload)
    )));
    ipcMain.handle(CHANNELS.openMigrationSource, safeHandler(async (payload) => {
        const target = service.getMigrationSourceTarget(payload?.path, payload?.line);
        if (!target.ok) { return target; }
        return openSource(target);
    }));
    ipcMain.handle(CHANNELS.openScannedMigrationSource, safeHandler(async (payload) => {
        const target = service.getScannedMigrationSourceTarget(
            payload?.path,
            payload?.line,
            payload?.text
        );
        if (!target.ok) { return target; }
        return openSource(target);
    }));
    ipcMain.handle(CHANNELS.assignMigrationFileComponent, safeHandler((payload) => (
        service.assignMigrationFileComponent(payload?.path, payload?.componentId)
    )));
    ipcMain.handle(CHANNELS.removeMigrationFile, safeHandler((relativePath) => (
        service.removeMigrationFile(relativePath)
    )));
    ipcMain.handle(CHANNELS.revert, safeHandler(() => service.revert()));
    ipcMain.handle(CHANNELS.validate, safeHandler(() => service.validate()));
    ipcMain.handle(CHANNELS.previewSave, safeHandler(() => service.previewSave()));
    ipcMain.handle(CHANNELS.save, safeHandler((payload, event) => (
        service.save(payload, progressReporter(event, 'save'))
    )));
    ipcMain.handle(CHANNELS.rebuild, safeHandler((payload, event) => (
        service.rebuild(payload, progressReporter(event, 'rebuild'))
    )));
    ipcMain.handle(CHANNELS.cancelBuild, safeHandler(() => service.cancelBuild()));
    ipcMain.handle(CHANNELS.reload, safeHandler(async () => {
        if (service.hasChanges()) {
            const result = await dialog.showMessageBox(getWindow(), {
                type: 'warning',
                buttons: ['Discard and reload', 'Cancel'],
                defaultId: 1,
                cancelId: 1,
                title: 'Discard unsaved changes?',
                message: 'Reloading will discard all in-memory language changes.'
            });
            if (result.response !== 0) {
                return { ok: false, cancelled: true };
            }
        }
        return { ok: true, state: service.reload() };
    }));
    ipcMain.handle(CHANNELS.confirmSave, safeHandler(async (payload) => {
        const normalized = Array.isArray(payload?.authoritativeFiles)
            ? payload.authoritativeFiles.map(String)
            : [];
        const catalogRemovals = Array.isArray(payload?.generatedCatalogRemovals)
            ? payload.generatedCatalogRemovals.map(String)
            : [];
        const result = await dialog.showMessageBox(getWindow(), {
            type: 'question',
            buttons: ['Save and rebuild', 'Cancel'],
            defaultId: 1,
            cancelId: 1,
            title: 'Confirm authoritative changes',
            message: `Write ${normalized.length} authoritative file(s)?`,
            detail: [
                normalized.join('\n') || 'No authoritative files will change.',
                catalogRemovals.length > 0
                    ? `Delete generated catalog data:\n${catalogRemovals.join('\n')}`
                    : 'Generated locale catalogs will be preserved.'
            ].join('\n\n')
        });
        return { ok: true, confirmed: result.response === 0 };
    }));
    ipcMain.handle(CHANNELS.exit, safeHandler(async () => {
        await closeApplication();
        return { ok: true };
    }));
}

module.exports = {
    registerIpcHandlers,
    safeHandler
};
