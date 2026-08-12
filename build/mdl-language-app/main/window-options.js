'use strict';

const path = require('path');

function createWindowOptions(appRoot) {
    return {
        width: 1440,
        height: 900,
        minWidth: 1040,
        minHeight: 680,
        show: false,
        backgroundColor: '#f4f1e8',
        title: 'MyDefrag Language Maintenance',
        webPreferences: {
            preload: path.join(appRoot, 'preload', 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webviewTag: false
        }
    };
}

function createSplashWindowOptions(appRoot = path.resolve(__dirname, '..')) {
    return {
        width: 520,
        height: 280,
        resizable: false,
        maximizable: false,
        minimizable: false,
        fullscreenable: false,
        show: true,
        frame: false,
        backgroundColor: '#20332f',
        title: 'Starting MyDefrag Language Maintenance',
        webPreferences: {
            preload: path.join(appRoot, 'splash', 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webviewTag: false
        }
    };
}

module.exports = {
    createWindowOptions,
    createSplashWindowOptions
};
