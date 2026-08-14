'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

function createFixture(test) {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mydefrag-locale-app-'));
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

class StubBuildIntegration {
    constructor(result = { ok: true, status: 0, signal: null, stdout: 'component build passed\n', stderr: '' }) {
        this.result = result;
        this.restoreCount = 0;
        this.durableRestoreCount = 0;
        this.runArguments = [];
    }
    snapshot() { return new Map(); }
    snapshotDurableLocaleSources() { return new Map(); }
    run(args) { this.runArguments.push(args); return this.result; }
    diff() { return []; }
    restore() { this.restoreCount += 1; }
    restoreDurableLocaleSources() { this.durableRestoreCount += 1; }
    rebuildWithRollback(args) {
        this.runArguments.push(args);
        return { ...this.result, changedFiles: [], rolledBack: !this.result.ok };
    }
}

module.exports = { PROJECT_ROOT, StubBuildIntegration, createFixture, readJson };
