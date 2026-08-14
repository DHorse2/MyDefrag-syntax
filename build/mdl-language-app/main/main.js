'use strict';

const path = require('path');
const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const { LanguageMaintenanceService } = require('../services/language-maintenance-service');
const { createSplashWindowOptions, createWindowOptions } = require('./window-options');
const { defaultProjectRoot, isProjectRoot } = require('./project-root');
const { registerIpcHandlers } = require('./ipc-handlers');
const { openSourceAtLine } = require('./source-opener');
const {
    attachAppDiagnostics,
    attachWebContentsDiagnostics,
    configureApplicationProfile,
    createStartupDiagnostics,
    serializedError
} = require('./startup-diagnostics');

const APP_ROOT = path.resolve(__dirname, '..');
const DEVELOPMENT_ROOT = path.resolve(APP_ROOT, '..', '..');
const STATUS_CHANNEL = 'language-maintenance:startup-status';
const STATUS_GET_CHANNEL = 'language-maintenance:startup-status:get';
const startupStartedAt = Date.now();
const applicationProfile = configureApplicationProfile(app);
const startupDiagnostics = createStartupDiagnostics(applicationProfile);
startupDiagnostics.trace('createStartupDiagnostics', 'return');

let mainWindow = null;
let splashWindow = null;
let service = null;
let allowClose = false;
let startupStatus = {
    phase: 'process-start',
    message: 'Starting Electron...',
    elapsedMs: 0,
    timestamp: new Date().toISOString()
};

app.enableSandbox();
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('disable-domain-reliability');
attachAppDiagnostics(app, startupDiagnostics);
startupDiagnostics.trace('attachAppDiagnostics', 'return');
startupDiagnostics.record('process-start', {
    argv: process.argv.slice(1),
    isPackaged: app.isPackaged,
    versions: process.versions,
    profile: applicationProfile
});

ipcMain.handle(STATUS_GET_CHANNEL, () => startupStatus);

function updateStartupStatus(phase, message, details = {}) {
    startupDiagnostics.trace(`updateStartupStatus(${phase})`);
    startupStatus = {
        phase,
        message,
        elapsedMs: Date.now() - startupStartedAt,
        timestamp: new Date().toISOString()
    };
    startupDiagnostics.record('startup-phase', { ...startupStatus, ...details });
    if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.webContents.send(STATUS_CHANNEL, startupStatus);
    }
}

function closeSplashWindow() {
    startupDiagnostics.trace('closeSplashWindow', 'enter');
    if (splashWindow && !splashWindow.isDestroyed()) {
        startupDiagnostics.trace('splashWindow.close');
        splashWindow.close();
    }
}

function revealMainWindow(reason) {
    startupDiagnostics.trace(`revealMainWindow(${reason})`, 'enter');
    if (!mainWindow || mainWindow.isDestroyed()) { return; }
    if (!mainWindow.isVisible()) {
        startupDiagnostics.trace('mainWindow.show');
        mainWindow.show();
    }
    startupDiagnostics.record('main-window-shown', { reason });
    closeSplashWindow();
}

async function selectProjectRoot() {
    startupDiagnostics.trace('selectProjectRoot', 'enter');
    const candidate = defaultProjectRoot({
        argv: process.argv.slice(1),
        cwd: process.cwd(),
        isPackaged: app.isPackaged,
        developmentRoot: DEVELOPMENT_ROOT
    });
    if (isProjectRoot(candidate)) {
        startupDiagnostics.trace('selectProjectRoot', 'return');
        return candidate;
    }

    startupDiagnostics.trace('dialog.showOpenDialog');
    const selection = await dialog.showOpenDialog({
        title: 'Select the MyDefrag-syntax repository',
        message: 'Choose the repository that owns language/canonical and build/language.',
        properties: ['openDirectory']
    });
    const selected = selection.canceled ? null : selection.filePaths[0];
    if (!isProjectRoot(selected)) {
        throw new Error('A valid MyDefrag-syntax repository was not selected.');
    }
    startupDiagnostics.trace('selectProjectRoot', 'return');
    return path.resolve(selected);
}

async function confirmClose() {
    if (service?.isBuildRunning()) {
        await dialog.showMessageBox(mainWindow, {
            type: 'warning',
            buttons: ['Return to build'],
            defaultId: 0,
            cancelId: 0,
            title: 'Language build is running',
            message: 'Wait for the build to finish before exiting.',
            detail: 'Use Stop build in the progress window, then wait for rollback to complete before closing the application.'
        });
        return;
    }
    if (!service?.hasChanges()) {
        allowClose = true;
        mainWindow?.close();
        return;
    }
    const result = await dialog.showMessageBox(mainWindow, {
        type: 'warning',
        buttons: ['Exit without saving', 'Cancel'],
        defaultId: 1,
        cancelId: 1,
        title: 'Unsaved language changes',
        message: 'Exit and discard all in-memory changes?'
    });
    if (result.response === 0) {
        allowClose = true;
        mainWindow.close();
    }
}

async function createMainWindow() {
    startupDiagnostics.trace('createMainWindow', 'enter');
    updateStartupStatus('splash-create', 'Opening the startup window...');
    startupDiagnostics.trace('BrowserWindow(splash)', 'construct');
    splashWindow = new BrowserWindow(createSplashWindowOptions(APP_ROOT));
    attachWebContentsDiagnostics(splashWindow.webContents, 'splash', startupDiagnostics);
    startupDiagnostics.trace('splashWindow.show');
    splashWindow.show();
    splashWindow.on('closed', () => {
        splashWindow = null;
    });
    updateStartupStatus('splash-load', 'Loading the startup interface...');
    startupDiagnostics.trace('splashWindow.loadFile');
    await splashWindow.loadFile(path.join(APP_ROOT, 'splash', 'index.html'));
    startupDiagnostics.trace('splashWindow.loadFile', 'return');

    updateStartupStatus('project-root', 'Locating the MyDefrag-syntax project...');
    startupDiagnostics.trace('selectProjectRoot');
    const projectRoot = await selectProjectRoot();
    updateStartupStatus('language-data', 'Loading project language data...', { projectRoot });
    const languageLoadStartedAt = Date.now();
    startupDiagnostics.trace('LanguageMaintenanceService', 'construct');
    service = new LanguageMaintenanceService(projectRoot);
    startupDiagnostics.trace('service.load');
    service.load();
    startupDiagnostics.trace('service.load', 'return');
    updateStartupStatus(
        'language-data-loaded',
        `Loaded project language data in ${Date.now() - languageLoadStartedAt} ms.`,
        { projectRoot }
    );

    updateStartupStatus('main-window-create', 'Creating the application window...');
    startupDiagnostics.trace('BrowserWindow(main)', 'construct');
    mainWindow = new BrowserWindow(createWindowOptions(APP_ROOT));
    attachWebContentsDiagnostics(mainWindow.webContents, 'main', startupDiagnostics);
    mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    mainWindow.webContents.on('will-navigate', (event, url) => {
        if (url !== mainWindow.webContents.getURL()) {
            event.preventDefault();
        }
    });
    mainWindow.on('close', (event) => {
        if (allowClose || (!service.isBuildRunning() && !service.hasChanges())) { return; }
        event.preventDefault();
        void confirmClose();
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    mainWindow.once('ready-to-show', () => revealMainWindow('ready-to-show'));

    startupDiagnostics.trace('registerIpcHandlers');
    registerIpcHandlers({
        ipcMain,
        dialog,
        service,
        openSource: (target) => openSourceAtLine(shell, target),
        getWindow: () => mainWindow,
        closeApplication: confirmClose
    });
    startupDiagnostics.trace('registerIpcHandlers', 'return');

    updateStartupStatus('main-window-load', 'Rendering the application window...');
    startupDiagnostics.trace('mainWindow.loadFile');
    await mainWindow.loadFile(path.join(APP_ROOT, 'renderer', 'index.html'));
    startupDiagnostics.trace('mainWindow.loadFile', 'return');
    updateStartupStatus('main-window-loaded', 'Application window loaded; waiting for first paint.');
    startupDiagnostics.trace('createMainWindow', 'return');
}

startupDiagnostics.trace('app.whenReady');
app.whenReady().then(createMainWindow).catch((error) => {
    startupDiagnostics.trace('createMainWindow', 'throw');
    startupDiagnostics.record('startup-failed', { error: serializedError(error) });
    updateStartupStatus('failed', `Startup failed: ${error.message}`);
    closeSplashWindow();
    dialog.showErrorBox('MyDefrag Language Maintenance', error.message);
    app.quit();
});

app.on('window-all-closed', () => app.quit());

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        void createMainWindow();
    }
});
