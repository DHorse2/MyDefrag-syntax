'use strict';

const path = require('path');

function createWindowOptions(appRoot) {
    return {
        width: 1480,
        height: 920,
        minWidth: 1080,
        minHeight: 700,
        show: false,
        backgroundColor: '#f4f1e8',
        title: 'MyDefrag Locale Maintenance',
        webPreferences: {
            preload: path.join(appRoot, 'preload', 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webviewTag: false
        }
    };
}

module.exports = { createWindowOptions };
