'use strict';

const { contextBridge, ipcRenderer } = require('electron');

const STATUS_CHANNEL = 'language-maintenance:startup-status';
const STATUS_GET_CHANNEL = 'language-maintenance:startup-status:get';

contextBridge.exposeInMainWorld('startupProgress', Object.freeze({
    getStatus: () => ipcRenderer.invoke(STATUS_GET_CHANNEL),
    onStatus: (listener) => {
        if (typeof listener !== 'function') {
            throw new TypeError('Startup status listener must be a function.');
        }
        const handler = (_event, status) => listener(status);
        ipcRenderer.on(STATUS_CHANNEL, handler);
        return () => ipcRenderer.removeListener(STATUS_CHANNEL, handler);
    }
}));
