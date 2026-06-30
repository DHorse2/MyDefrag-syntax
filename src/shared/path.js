const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..', '..');

const userDir = path.join(projectRoot, '.user');
const logDir = path.join(userDir, 'logs');

function ensureDirectory(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function ensureDirectories() {
    ensureDirectory(userDir);
    ensureDirectory(logDir);
}

module.exports = {
    projectRoot,
    userDir,
    logDir,

    diagnosticsLatestFile: path.join(logDir, 'diagnostics-latest.json'),
    diagnosticsStateFile: path.join(logDir, 'session_dismissed.json'),
    navigatorStateFile: path.join(logDir, 'navigator-state.json'),

    ensureDirectory,
    ensureDirectories
};
