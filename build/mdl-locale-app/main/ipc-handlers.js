'use strict';

const { CHANNELS, EVENTS } = require('../shared/contracts');

function safeHandler(handler) {
    return async (event, payload) => {
        try { return await handler(payload, event); } catch (error) {
            return { ok: false, stage: 'application', error: error.message };
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
    const { ipcMain, dialog, service, getWindow, closeApplication } = options;
    ipcMain.handle(CHANNELS.load, safeHandler(() => service.load()));
    ipcMain.handle(CHANNELS.select, safeHandler((payload) => service.select(payload)));
    ipcMain.handle(CHANNELS.requestApiTranslation, safeHandler((payload) => service.requestApiTranslation(payload)));
    ipcMain.handle(CHANNELS.replaceWithApiTranslation, safeHandler((payload) => (
        service.replaceWithApiTranslation(payload)
    )));
    ipcMain.handle(CHANNELS.applyTranslation, safeHandler((payload) => service.applyTranslation(payload)));
    ipcMain.handle(CHANNELS.removeTranslation, safeHandler((key) => service.removeTranslation(key)));
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
                title: 'Discard unsaved translations?',
                message: 'Reloading will discard changes to the selected locale component.'
            });
            if (result.response !== 0) { return { ok: false, cancelled: true }; }
        }
        return { ok: true, state: service.reload() };
    }));
    ipcMain.handle(CHANNELS.confirmSave, safeHandler(async (files) => {
        const normalized = Array.isArray(files) ? files.map(String) : [];
        const result = await dialog.showMessageBox(getWindow(), {
            type: 'question',
            buttons: ['Save and rebuild component', 'Cancel'],
            defaultId: 1,
            cancelId: 1,
            title: 'Confirm locale source changes',
            message: `Write ${normalized.length} authoritative file(s)?`,
            detail: normalized.join('\n') || 'No files will change.'
        });
        return { ok: true, confirmed: result.response === 0 };
    }));
    ipcMain.handle(CHANNELS.exit, safeHandler(async () => {
        await closeApplication();
        return { ok: true };
    }));
}

module.exports = { registerIpcHandlers, safeHandler };
