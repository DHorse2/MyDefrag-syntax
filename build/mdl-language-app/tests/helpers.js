'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

function createFixture(test) {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mydefrag-language-app-'));
    fs.cpSync(path.join(PROJECT_ROOT, 'language'), path.join(rootDir, 'language'), { recursive: true });
    const scriptsDir = path.join(rootDir, 'build', 'scripts');
    fs.mkdirSync(scriptsDir, { recursive: true });
    fs.copyFileSync(
        path.join(PROJECT_ROOT, 'build', 'scripts', 'build-language.js'),
        path.join(scriptsDir, 'build-language.js')
    );
    fs.cpSync(
        path.join(PROJECT_ROOT, 'build', 'language', 'translation'),
        path.join(rootDir, 'build', 'language', 'translation'),
        { recursive: true }
    );
    test.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
    return rootDir;
}

function readJson(rootDir, relativePath) {
    return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), 'utf8'));
}

function writeJson(rootDir, relativePath, value) {
    const filePath = path.join(rootDir, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

class StubBuildIntegration {
    constructor(result = { ok: true, status: 0, stdout: 'stub build passed\n', stderr: '' }) {
        this.result = result;
        this.restoreCount = 0;
        this.runArguments = [];
    }

    snapshot() { return new Map(); }
    run(_actionArguments, onProgress) {
        this.runArguments.push(_actionArguments);
        onProgress?.({ phase: 'build', message: 'Running stub build', cancellable: true });
        onProgress?.({ phase: 'build-output', message: 'Build command output', output: this.result.stdout || '', stream: 'stdout', cancellable: true });
        return this.result;
    }
    diff() { return []; }
    restore() { this.restoreCount += 1; }
    rebuildWithRollback(_actionArguments, onProgress) {
        this.runArguments.push(_actionArguments);
        onProgress?.({ phase: 'build', message: 'Running stub build', cancellable: true });
        return { ...this.result, changedFiles: [], rolledBack: !this.result.ok };
    }
    cancel() { return { ok: true, cancelled: true }; }
    isRunning() { return false; }
}

module.exports = {
    PROJECT_ROOT,
    StubBuildIntegration,
    createFixture,
    readJson,
    writeJson
};
