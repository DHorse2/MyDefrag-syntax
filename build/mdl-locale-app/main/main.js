'use strict';

const path = require('path');
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { LocaleMaintenanceService } = require('../services/locale-maintenance-service');
const { createWindowOptions } = require('./window-options');
const { defaultProjectRoot, isProjectRoot } = require('./project-root');
const { registerIpcHandlers } = require('./ipc-handlers');

const APP_ROOT = path.resolve(__dirname, '..');
const DEVELOPMENT_ROOT = path.resolve(APP_ROOT, '..', '..');
let mainWindow = null;
let service = null;
let allowClose = false;

app.enableSandbox();

async function selectProjectRoot() {
    const candidate = defaultProjectRoot({
        argv: process.argv.slice(1),
        cwd: process.cwd(),
        isPackaged: app.isPackaged,
        developmentRoot: DEVELOPMENT_ROOT
    });
    if (isProjectRoot(candidate)) { return candidate; }
    const selection = await dialog.showOpenDialog({
        title: 'Select the MyDefrag-syntax repository',
        message: 'Choose the repository that owns language/locales and build/language.',
        properties: ['openDirectory']
    });
    const selected = selection.canceled ? null : selection.filePaths[0];
    if (!isProjectRoot(selected)) { throw new Error('A valid MyDefrag locale repository was not selected.'); }
    return path.resolve(selected);
}

async function confirmClose() {
    if (service?.isBuildRunning()) {
        await dialog.showMessageBox(mainWindow, {
            type: 'warning',
            buttons: ['Return to build'],
            defaultId: 0,
            cancelId: 0,
            title: 'Locale component build is running',
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
        title: 'Unsaved locale changes',
        message: 'Exit and discard the selected component translations?'
    });
    if (result.response === 0) {
        allowClose = true;
        mainWindow.close();
    }
}

async function createMainWindow() {
    const projectRoot = await selectProjectRoot();
    service = new LocaleMaintenanceService(projectRoot);
    service.load();
    mainWindow = new BrowserWindow(createWindowOptions(APP_ROOT));
    mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    mainWindow.webContents.on('will-navigate', (event, url) => {
        if (url !== mainWindow.webContents.getURL()) { event.preventDefault(); }
    });
    mainWindow.on('close', (event) => {
        if (allowClose || (!service.isBuildRunning() && !service.hasChanges())) { return; }
        event.preventDefault();
        void confirmClose();
    });
    mainWindow.on('closed', () => { mainWindow = null; });
    mainWindow.once('ready-to-show', () => mainWindow.show());
    registerIpcHandlers({
        ipcMain,
        dialog,
        service,
        getWindow: () => mainWindow,
        closeApplication: confirmClose
    });
    await mainWindow.loadFile(path.join(APP_ROOT, 'renderer', 'index.html'));
}

app.whenReady().then(createMainWindow).catch((error) => {
    dialog.showErrorBox('MyDefrag Locale Maintenance', error.message);
    app.quit();
});
app.on('window-all-closed', () => app.quit());
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) { void createMainWindow(); }
});
