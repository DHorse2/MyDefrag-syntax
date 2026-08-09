'use strict';

const path = require('path');
const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const { LanguageMaintenanceService } = require('../services/language-maintenance-service');
const { createSplashWindowOptions, createWindowOptions } = require('./window-options');
const { defaultProjectRoot, isProjectRoot } = require('./project-root');
const { registerIpcHandlers } = require('./ipc-handlers');
const { openSourceAtLine } = require('./source-opener');

const APP_ROOT = path.resolve(__dirname, '..');
const DEVELOPMENT_ROOT = path.resolve(APP_ROOT, '..', '..');

let mainWindow = null;
let splashWindow = null;
let service = null;
let allowClose = false;

app.enableSandbox();
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('disable-domain-reliability');

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
    splashWindow = new BrowserWindow(createSplashWindowOptions());
    splashWindow.once('ready-to-show', () => splashWindow?.show());
    splashWindow.on('closed', () => {
        splashWindow = null;
    });
    await splashWindow.loadFile(path.join(APP_ROOT, 'splash', 'index.html'));

    const projectRoot = await selectProjectRoot();
    service = new LanguageMaintenanceService(projectRoot);
    service.load();

    mainWindow = new BrowserWindow(createWindowOptions(APP_ROOT));
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
    mainWindow.once('ready-to-show', () => mainWindow.show());

    registerIpcHandlers({
        ipcMain,
        dialog,
        service,
        openSource: (target) => openSourceAtLine(shell, target),
        getWindow: () => mainWindow,
        closeApplication: confirmClose
    });

    await mainWindow.loadFile(path.join(APP_ROOT, 'renderer', 'index.html'));
    if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
    }
}

app.whenReady().then(createMainWindow).catch((error) => {
    if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
    }
    dialog.showErrorBox('MyDefrag Language Maintenance', error.message);
    app.quit();
});

app.on('window-all-closed', () => app.quit());

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        void createMainWindow();
    }
});
