'use strict';

const fs = require('fs');
const path = require('path');

const APPLICATION_NAME = 'MyDefrag Language Maintenance';

function configureApplicationProfile(app, options = {}) {
    const fileSystem = options.fileSystem || fs;
    const pathApi = options.pathApi || path;
    const applicationName = options.applicationName || APPLICATION_NAME;

    app.setName(applicationName);
    const profileDirectory = pathApi.join(app.getPath('appData'), applicationName);
    const sessionDirectory = pathApi.join(profileDirectory, 'Session Data');
    const logDirectory = pathApi.join(profileDirectory, 'logs');
    for (const directory of [profileDirectory, sessionDirectory, logDirectory]) {
        fileSystem.mkdirSync(directory, { recursive: true });
    }

    app.setPath('userData', profileDirectory);
    app.setPath('sessionData', sessionDirectory);
    app.setAppLogsPath(logDirectory);

    return { applicationName, profileDirectory, sessionDirectory, logDirectory };
}

function serializedError(error) {
    if (!error) { return null; }
    return {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack
    };
}

function createStartupDiagnostics(profile, options = {}) {
    const fileSystem = options.fileSystem || fs;
    const now = options.now || (() => new Date());
    const processId = options.processId ?? process.pid;
    const startedAt = now();
    const sessionId = `${startedAt.toISOString().replace(/[:.]/g, '-')}-${processId}`;
    const logPath = path.join(profile.logDirectory, `startup-${startedAt.toISOString().slice(0, 10)}.jsonl`);

    function record(event, details = {}) {
        const entry = {
            timestamp: now().toISOString(),
            sessionId,
            processId,
            event,
            details
        };
        try {
            fileSystem.appendFileSync(logPath, `${JSON.stringify(entry)}\n`, 'utf8');
        } catch (error) {
            console.error(`Unable to write startup diagnostics: ${error.message}`);
        }
        return entry;
    }

    return { logPath, record, sessionId };
}

function attachAppDiagnostics(app, diagnostics) {
    app.on('child-process-gone', (_event, details) => {
        diagnostics.record('child-process-gone', details);
    });
    app.on('render-process-gone', (_event, webContents, details) => {
        diagnostics.record('render-process-gone', {
            webContentsId: webContents?.id,
            ...details
        });
    });
    app.on('before-quit', () => diagnostics.record('before-quit'));
    app.on('will-quit', () => diagnostics.record('will-quit'));
}

function attachWebContentsDiagnostics(webContents, label, diagnostics) {
    webContents.on('did-start-loading', () => diagnostics.record('did-start-loading', { label }));
    webContents.on('dom-ready', () => diagnostics.record('dom-ready', { label }));
    webContents.on('did-finish-load', () => diagnostics.record('did-finish-load', { label }));
    webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
        diagnostics.record('did-fail-load', {
            label,
            errorCode,
            errorDescription,
            validatedURL,
            isMainFrame
        });
    });
    webContents.on('preload-error', (_event, preloadPath, error) => {
        diagnostics.record('preload-error', { label, preloadPath, error: serializedError(error) });
    });
    webContents.on('unresponsive', () => diagnostics.record('unresponsive', { label }));
    webContents.on('responsive', () => diagnostics.record('responsive', { label }));
    webContents.on('render-process-gone', (_event, details) => {
        diagnostics.record('web-contents-render-process-gone', { label, ...details });
    });
}

module.exports = {
    APPLICATION_NAME,
    attachAppDiagnostics,
    attachWebContentsDiagnostics,
    configureApplicationProfile,
    createStartupDiagnostics,
    serializedError
};
