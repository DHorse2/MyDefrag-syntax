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
startupDiagnostics.record('process-start', {
    argv: process.argv.slice(1),
    isPackaged: app.isPackaged,
    versions: process.versions,
    profile: applicationProfile
});

ipcMain.handle(STATUS_GET_CHANNEL, () => startupStatus);

function updateStartupStatus(phase, message, details = {}) {
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
    if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
    }
}

function revealMainWindow(reason) {
    if (!mainWindow || mainWindow.isDestroyed()) { return; }
    if (!mainWindow.isVisible()) {
        mainWindow.show();
    }
    startupDiagnostics.record('main-window-shown', { reason });
    closeSplashWindow();
}

async function selectProjectRoot() {
    const candidate = defaultProjectRoot({
        argv: process.argv.slice(1),
        cwd: process.cwd(),
        isPackaged: app.isPackaged,
        developmentRoot: DEVELOPMENT_ROOT
    });
    if (isProjectRoot(candidate)) {
        return candidate;
    }

    const selection = await dialog.showOpenDialog({
        title: 'Select the MyDefrag-syntax repository',
        message: 'Choose the repository that owns language/canonical and build/language.',
        properties: ['openDirectory']
    });
    const selected = selection.canceled ? null : selection.filePaths[0];
    if (!isProjectRoot(selected)) {
        throw new Error('A valid MyDefrag-syntax repository was not selected.');
    }
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
    updateStartupStatus('splash-create', 'Opening the startup window...');
    splashWindow = new BrowserWindow(createSplashWindowOptions(APP_ROOT));
    attachWebContentsDiagnostics(splashWindow.webContents, 'splash', startupDiagnostics);
    splashWindow.show();
    splashWindow.on('closed', () => {
        splashWindow = null;
    });
    updateStartupStatus('splash-load', 'Loading the startup interface...');
    await splashWindow.loadFile(path.join(APP_ROOT, 'splash', 'index.html'));

    updateStartupStatus('project-root', 'Locating the MyDefrag-syntax project...');
    const projectRoot = await selectProjectRoot();
    updateStartupStatus('language-data', 'Loading project language data...', { projectRoot });
    const languageLoadStartedAt = Date.now();
    service = new LanguageMaintenanceService(projectRoot);
    service.load();
    updateStartupStatus(
        'language-data-loaded',
        `Loaded project language data in ${Date.now() - languageLoadStartedAt} ms.`,
        { projectRoot }
    );

    updateStartupStatus('main-window-create', 'Creating the application window...');
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

    registerIpcHandlers({
        ipcMain,
        dialog,
        service,
        openSource: (target) => openSourceAtLine(shell, target),
        getWindow: () => mainWindow,
        closeApplication: confirmClose
    });

    updateStartupStatus('main-window-load', 'Rendering the application window...');
    await mainWindow.loadFile(path.join(APP_ROOT, 'renderer', 'index.html'));
    updateStartupStatus('main-window-loaded', 'Application window loaded; waiting for first paint.');
}

app.whenReady().then(createMainWindow).catch((error) => {
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
