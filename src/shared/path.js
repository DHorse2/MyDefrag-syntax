'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..', '..');

const DEFAULTS = {
    userDir: '.user',
    logDir: '.user/logs'
};

let userDir = resolveFromProjectRoot(DEFAULTS.userDir);
let logDir = resolveFromProjectRoot(DEFAULTS.logDir);

function resolveFromProjectRoot(value) {
    const text = String(value || '').trim();

    if (!text) {
        return '';
    }

    return path.isAbsolute(text)
        ? text
        : path.join(projectRoot, text);
}

function configurePaths(options = {}) {
    const nextUserDir = options.userDir || DEFAULTS.userDir;
    const nextLogDir = options.logDir || DEFAULTS.logDir;

    userDir = resolveFromProjectRoot(nextUserDir);
    logDir = resolveFromProjectRoot(nextLogDir);

    ensureDirectories();
}

function ensureDirectory(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function ensureDirectories() {
    ensureDirectory(userDir);
    ensureDirectory(logDir);
}

function getPaths() {
    return {
        projectRoot,
        userDir,
        logDir,

        diagnosticsLatestFile: path.join(logDir, 'diagnostics-latest.json'),
        diagnosticsStateFile: path.join(logDir, 'session_dismissed.json'),
        navigatorStateFile: path.join(logDir, 'navigator-state.json'),

        diagnosticsSendPromptFile: path.join(logDir, 'diagnostic-ai-prompt.md'),
        diagnosticsSendItemFile: path.join(logDir, 'diagnostic-ai-item.json'),

        client: path.join(logDir, 'client.log'),
        server: path.join(logDir, 'server.log'),
        parser: path.join(logDir, 'parser.log'),
        preview: path.join(logDir, 'preview.log'),

        extensionLogFile: path.join(logDir, 'extension.log'),
        serverLogFile: path.join(logDir, 'server.log'),
        previewLogFile: path.join(logDir, 'preview.log')
    };
}

module.exports = {
    DEFAULTS,

    get projectRoot() { return projectRoot; },
    get userDir() { return userDir; },
    get logDir() { return logDir; },

    get diagnosticsLatestFile() { return getPaths().diagnosticsLatestFile; },
    get diagnosticsStateFile() { return getPaths().diagnosticsStateFile; },
    get navigatorStateFile() { return getPaths().navigatorStateFile; },

    get diagnosticsSendPromptFile() { return getPaths().diagnosticsSendPromptFile; },
    get diagnosticsSendItemFile() { return getPaths().diagnosticsSendItemFile; },

    get client() { return getPaths().client; },
    get server() { return getPaths().server; },
    get parser() { return getPaths().parser; },
    get preview() { return getPaths().preview; },

    get extensionLogFile() { return getPaths().extensionLogFile; },
    get serverLogFile() { return getPaths().serverLogFile; },
    get previewLogFile() { return getPaths().previewLogFile; },

    configurePaths,
    ensureDirectory,
    ensureDirectories,
    resolveFromProjectRoot,
    getPaths
};