'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Sandboxed preload scripts cannot import local modules. Keep this inventory
// self-contained and verify it against shared/contracts.js in tests.
const CHANNELS = Object.freeze({
    load: 'locale-maintenance:load',
    select: 'locale-maintenance:select',
    requestApiTranslation: 'locale-maintenance:request-api-translation',
    replaceWithApiTranslation: 'locale-maintenance:replace-with-api-translation',
    applyTranslation: 'locale-maintenance:apply-translation',
    removeTranslation: 'locale-maintenance:remove-translation',
    revert: 'locale-maintenance:revert',
    reload: 'locale-maintenance:reload',
    validate: 'locale-maintenance:validate',
    previewSave: 'locale-maintenance:preview-save',
    confirmSave: 'locale-maintenance:confirm-save',
    save: 'locale-maintenance:save',
    rebuild: 'locale-maintenance:rebuild',
    cancelBuild: 'locale-maintenance:cancel-build',
    exit: 'locale-maintenance:exit'
});

const EVENTS = Object.freeze({
    progress: 'locale-maintenance:progress'
});

contextBridge.exposeInMainWorld('localeMaintenance', Object.freeze({
    load: () => ipcRenderer.invoke(CHANNELS.load),
    select: (request) => ipcRenderer.invoke(CHANNELS.select, request),
    requestApiTranslation: (request) => ipcRenderer.invoke(CHANNELS.requestApiTranslation, request),
    replaceWithApiTranslation: (request) => ipcRenderer.invoke(CHANNELS.replaceWithApiTranslation, request),
    applyTranslation: (request) => ipcRenderer.invoke(CHANNELS.applyTranslation, request),
    removeTranslation: (key) => ipcRenderer.invoke(CHANNELS.removeTranslation, key),
    revert: () => ipcRenderer.invoke(CHANNELS.revert),
    reload: () => ipcRenderer.invoke(CHANNELS.reload),
    validate: () => ipcRenderer.invoke(CHANNELS.validate),
    previewSave: () => ipcRenderer.invoke(CHANNELS.previewSave),
    confirmSave: (files) => ipcRenderer.invoke(CHANNELS.confirmSave, files),
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
