'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const MAX_BUILD_OUTPUT_LENGTH = 20 * 1024 * 1024;
const DEFAULT_CANCEL_GRACE_MS = 2000;
const DEFAULT_CANCEL_FORCE_MS = 3000;

const GENERATED_DIRECTORIES = [
    'build/language/catalogs',
    'build/language/keyword-maps',
    'build/language/variable-maps',
    'build/language/reports'
];
const DURABLE_LOCALE_DIRECTORIES = ['language/locales'];

function hash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

function report(listener, progress) {
    if (typeof listener !== 'function') { return; }
    try {
        listener(progress);
    } catch {
        // Progress reporting must never interrupt a repository transaction.
    }
}

function appendOutput(current, chunk) {
    if (current.length >= MAX_BUILD_OUTPUT_LENGTH) { return current; }
    return `${current}${chunk}`.slice(0, MAX_BUILD_OUTPUT_LENGTH);
}

class BuildIntegration {
    constructor(rootDir, options = {}) {
        this.rootDir = path.resolve(rootDir);
        this.fs = options.fileSystem || fs;
        this.spawn = options.spawn || spawn;
        this.setTimeout = options.setTimeout || setTimeout;
        this.clearTimeout = options.clearTimeout || clearTimeout;
        this.cancelGraceMs = Number.isFinite(options.cancelGraceMs)
            ? Math.max(0, options.cancelGraceMs)
            : DEFAULT_CANCEL_GRACE_MS;
        this.cancelForceMs = Number.isFinite(options.cancelForceMs)
            ? Math.max(0, options.cancelForceMs)
            : DEFAULT_CANCEL_FORCE_MS;
        this.activeBuild = null;
    }

    listFiles(directory) {
        if (!this.fs.existsSync(directory)) { return []; }
        const files = [];
        for (const entry of this.fs.readdirSync(directory, { withFileTypes: true })) {
            const fullPath = path.join(directory, entry.name);
            if (entry.isDirectory()) {
                files.push(...this.listFiles(fullPath));
            } else if (entry.isFile()) {
                files.push(fullPath);
            }
        }
        return files.sort((left, right) => left.localeCompare(right));
    }

    snapshotDirectories(relativeDirectories) {
        const snapshot = new Map();
        for (const relativeDirectory of relativeDirectories) {
            const absoluteDirectory = path.join(this.rootDir, relativeDirectory);
            for (const filePath of this.listFiles(absoluteDirectory)) {
                const relativePath = path.relative(this.rootDir, filePath).replace(/\\/g, '/');
                snapshot.set(relativePath, this.fs.readFileSync(filePath));
            }
        }
        return snapshot;
    }

    snapshot() {
        return this.snapshotDirectories(GENERATED_DIRECTORIES);
    }

    snapshotDurableLocaleSources() {
        return this.snapshotDirectories(DURABLE_LOCALE_DIRECTORIES);
    }

    diff(before, after) {
        const paths = new Set([...before.keys(), ...after.keys()]);
        return Array.from(paths)
            .filter((relativePath) => {
                const previous = before.get(relativePath);
                const current = after.get(relativePath);
                return !previous || !current || hash(previous) !== hash(current);
            })
            .sort();
    }

    restoreDirectories(snapshot, relativeDirectories) {
        const current = this.snapshotDirectories(relativeDirectories);
        for (const relativePath of current.keys()) {
            if (!snapshot.has(relativePath)) {
                this.fs.unlinkSync(path.join(this.rootDir, relativePath));
            }
        }
        for (const [relativePath, content] of snapshot.entries()) {
            const target = path.join(this.rootDir, relativePath);
            this.fs.mkdirSync(path.dirname(target), { recursive: true });
            const temporary = `${target}.${process.pid}.${Date.now()}.restore.tmp`;
            this.fs.writeFileSync(temporary, content, { flag: 'wx' });
            if (this.fs.existsSync(target)) {
                this.fs.unlinkSync(target);
            }
            this.fs.renameSync(temporary, target);
        }
    }

    restore(snapshot) {
        this.restoreDirectories(snapshot, GENERATED_DIRECTORIES);
    }

    restoreDurableLocaleSources(snapshot) {
        this.restoreDirectories(snapshot, DURABLE_LOCALE_DIRECTORIES);
    }

    run(actionArguments = ['build'], onProgress) {
        if (this.activeBuild) {
            return Promise.resolve({
                ok: false,
                status: null,
                signal: null,
                stdout: '',
                stderr: '',
                error: 'A language build is already running.'
            });
        }

        const scriptPath = path.join(this.rootDir, 'build', 'scripts', 'build-language.js');
        const displayCommand = `node build/scripts/build-language.js ${actionArguments.join(' ')}`;

        return new Promise((resolve) => {
            let child;
            try {
                child = this.spawn(process.execPath, [scriptPath, ...actionArguments], {
                    cwd: this.rootDir,
                    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
                    windowsHide: true,
                    stdio: ['ignore', 'pipe', 'pipe']
                });
            } catch (error) {
                report(onProgress, { phase: 'build', message: 'Unable to start language build', cancellable: false });
                resolve({ ok: false, status: null, signal: null, stdout: '', stderr: '', error: error.message });
                return;
            }

            let stdout = '';
            let stderr = '';
            let completed = false;
            const activeBuild = {
                child,
                cancelRequested: false,
                finish: null,
                onProgress,
                timers: []
            };
            this.activeBuild = activeBuild;
            report(onProgress, {
                phase: 'build',
                message: 'Running language build command',
                command: displayCommand,
                cancellable: true
            });

            const finish = (status, signal, error = null) => {
                if (completed) { return; }
                completed = true;
                for (const timer of activeBuild.timers) { this.clearTimeout(timer); }
                activeBuild.timers = [];
                if (this.activeBuild === activeBuild) { this.activeBuild = null; }
                const cancelled = activeBuild.cancelRequested;
                const result = {
                    ok: status === 0 && !error && !cancelled,
                    status,
                    signal,
                    stdout,
                    stderr,
                    error: error?.message || (cancelled ? 'Build cancelled by user.' : null),
                    cancelled
                };
                report(onProgress, {
                    phase: cancelled ? 'cancelled' : 'build',
                    message: cancelled
                        ? 'Language build cancelled'
                        : result.ok ? 'Language build command completed' : 'Language build command failed',
                    cancellable: false
                });
                resolve(result);
            };
            activeBuild.finish = finish;

            child.stdout?.setEncoding('utf8');
            child.stderr?.setEncoding('utf8');
            child.stdout?.on('data', (chunk) => {
                const output = String(chunk);
                stdout = appendOutput(stdout, output);
                report(onProgress, { phase: 'build-output', message: 'Build command output', stream: 'stdout', output, cancellable: true });
            });
            child.stderr?.on('data', (chunk) => {
                const output = String(chunk);
                stderr = appendOutput(stderr, output);
                report(onProgress, { phase: 'build-output', message: 'Build command output', stream: 'stderr', output, cancellable: true });
            });
            child.once('error', (error) => finish(null, null, error));
            child.once('close', (status, signal) => finish(status, signal));
        });
    }

    cancel() {
        if (!this.activeBuild) {
            return { ok: false, cancelled: false, error: 'No language build is running.' };
        }
        const activeBuild = this.activeBuild;
        if (activeBuild.cancelRequested) {
            return { ok: true, cancelled: true, error: null };
        }
        activeBuild.cancelRequested = true;
        let signalled = false;
        try {
            signalled = activeBuild.child.kill();
        } catch {
            signalled = false;
        }
        if (!signalled) {
            activeBuild.cancelRequested = false;
        } else {
            report(activeBuild.onProgress, {
                phase: 'cancelling',
                message: 'Waiting for the language build process to stop',
                cancellable: false
            });
            const forceTimer = this.setTimeout(() => {
                if (this.activeBuild !== activeBuild) { return; }
                report(activeBuild.onProgress, {
                    phase: 'cancelling',
                    message: 'Forcing the language build process to stop',
                    cancellable: false
                });
                try { activeBuild.child.kill('SIGKILL'); } catch { /* Completion timeout handles this. */ }
                const completionTimer = this.setTimeout(() => {
                    if (this.activeBuild !== activeBuild) { return; }
                    activeBuild.finish(
                        null,
                        'SIGKILL',
                        new Error('Build process did not report termination after cancellation.')
                    );
                }, this.cancelForceMs);
                activeBuild.timers.push(completionTimer);
            }, this.cancelGraceMs);
            activeBuild.timers.push(forceTimer);
        }
        return {
            ok: signalled,
            cancelled: signalled,
            error: signalled ? null : 'The language build process could not be stopped.'
        };
    }

    isRunning() {
        return this.activeBuild !== null;
    }

    async rebuildWithRollback(actionArguments = ['build'], onProgress) {
        report(onProgress, { phase: 'snapshot', message: 'Capturing generated files for rollback', cancellable: false });
        const before = this.snapshot();
        const durableLocaleBefore = this.snapshotDurableLocaleSources();
        const result = await this.run(actionArguments, onProgress);
        if (!result.ok) {
            report(onProgress, {
                phase: 'rollback',
                message: 'Restoring generated files and durable locale sources',
                cancellable: false
            });
            this.restore(before);
            this.restoreDurableLocaleSources(durableLocaleBefore);
            return { ...result, changedFiles: [], durableLocaleFiles: [], rolledBack: true };
        }
        report(onProgress, { phase: 'compare', message: 'Checking generated file changes', cancellable: false });
        const after = this.snapshot();
        const durableLocaleAfter = this.snapshotDurableLocaleSources();
        return {
            ...result,
            changedFiles: this.diff(before, after),
            durableLocaleFiles: this.diff(durableLocaleBefore, durableLocaleAfter),
            rolledBack: false
        };
    }
}

module.exports = {
    BuildIntegration,
    DURABLE_LOCALE_DIRECTORIES,
    GENERATED_DIRECTORIES
};
