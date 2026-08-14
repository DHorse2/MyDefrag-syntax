'use strict';

const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { PassThrough } = require('node:stream');
const test = require('node:test');
const { CanonicalDataRepository } = require('../repositories/canonical-data-repository');
const { BuildIntegration } = require('../services/build-integration');

function tempRoot(t) {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mydefrag-language-transaction-'));
    t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
    return rootDir;
}

test('atomic transaction rollback restores source and removes temporary artifacts', (t) => {
    const rootDir = tempRoot(t);
    const relativePath = 'language/canonical/example.json';
    const filePath = path.join(rootDir, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, '{"value":"before"}\n');
    const repository = new CanonicalDataRepository(rootDir);

    const transaction = repository.beginTransaction([{ relativePath, content: '{"value":"after"}\n' }]);
    assert.equal(fs.readFileSync(filePath, 'utf8'), '{"value":"after"}\n');
    transaction.rollback();
    assert.equal(fs.readFileSync(filePath, 'utf8'), '{"value":"before"}\n');
    assert.deepEqual(fs.readdirSync(path.dirname(filePath)), ['example.json']);
});

test('atomic transaction commit retains source and removes backups', (t) => {
    const rootDir = tempRoot(t);
    const relativePath = 'language/canonical/example.json';
    const filePath = path.join(rootDir, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, '{"value":"before"}\n');
    const repository = new CanonicalDataRepository(rootDir);
    const transaction = repository.beginTransaction([{ relativePath, content: '{"value":"after"}\n' }]);

    assert.deepEqual(transaction.commit(), []);
    assert.equal(fs.readFileSync(filePath, 'utf8'), '{"value":"after"}\n');
    assert.deepEqual(fs.readdirSync(path.dirname(filePath)), ['example.json']);
});

test('atomic transaction rejects stale expected source without changing the file', (t) => {
    const rootDir = tempRoot(t);
    const relativePath = 'src/example.js';
    const filePath = path.join(rootDir, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, 'const value = "current";\n');
    const repository = new CanonicalDataRepository(rootDir);

    assert.throws(() => repository.beginTransaction([{
        relativePath,
        content: 'const value = "replacement";\n',
        expectedContent: 'const value = "stale";\n'
    }]), (error) => error.code === 'SOURCE_CHANGED');
    assert.equal(fs.readFileSync(filePath, 'utf8'), 'const value = "current";\n');
    assert.deepEqual(fs.readdirSync(path.dirname(filePath)), ['example.js']);
});

test('repository converts selected files to safe project-relative paths', (t) => {
    const rootDir = tempRoot(t);
    const filePath = path.join(rootDir, 'src', 'nested', 'source.js');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, 'source\n');
    const repository = new CanonicalDataRepository(rootDir);

    assert.equal(repository.relativeFile(filePath), 'src/nested/source.js');
    assert.throws(
        () => repository.relativeFile(path.join(path.dirname(rootDir), 'outside.js')),
        /outside the repository root/
    );
});

test('generated snapshot detects changes and restore removes additions', (t) => {
    const rootDir = tempRoot(t);
    const reportDir = path.join(rootDir, 'build', 'language', 'reports');
    fs.mkdirSync(reportDir, { recursive: true });
    const originalPath = path.join(reportDir, 'original.json');
    fs.writeFileSync(originalPath, '{"value":1}\n');
    const integration = new BuildIntegration(rootDir);
    const before = integration.snapshot();

    fs.writeFileSync(originalPath, '{"value":2}\n');
    fs.writeFileSync(path.join(reportDir, 'added.json'), '{}\n');
    const after = integration.snapshot();
    assert.deepEqual(integration.diff(before, after), [
        'build/language/reports/added.json',
        'build/language/reports/original.json'
    ]);

    integration.restore(before);
    assert.equal(fs.readFileSync(originalPath, 'utf8'), '{"value":1}\n');
    assert.equal(fs.existsSync(path.join(reportDir, 'added.json')), false);
});

function fakeChild(onStart) {
    const child = new EventEmitter();
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    child.kill = () => {
        queueMicrotask(() => child.emit('close', null, 'SIGTERM'));
        return true;
    };
    queueMicrotask(() => onStart(child));
    return child;
}

test('build failure streams output and restores generated outputs', async (t) => {
    const rootDir = tempRoot(t);
    const reportDir = path.join(rootDir, 'build', 'language', 'reports');
    fs.mkdirSync(reportDir, { recursive: true });
    const reportPath = path.join(reportDir, 'report.json');
    fs.writeFileSync(reportPath, '{"before":true}\n');
    const localeDir = path.join(rootDir, 'language', 'locales', 'fr-CA');
    fs.mkdirSync(localeDir, { recursive: true });
    const localePath = path.join(localeDir, 'extension.json');
    fs.writeFileSync(localePath, '{"before":"translation"}\n');
    let invocation;
    const spawn = (executable, args, options) => {
        invocation = { executable, args, options };
        fs.writeFileSync(reportPath, '{"partial":true}\n');
        fs.writeFileSync(localePath, '{"partial":"translation"}\n');
        fs.writeFileSync(path.join(localeDir, 'parser.json'), '{"added":true}\n');
        return fakeChild((child) => {
            child.stderr.write('failure\n');
            child.stderr.end();
            child.emit('close', 1, null);
        });
    };
    const integration = new BuildIntegration(rootDir, { spawn });
    const progress = [];

    const result = await integration.rebuildWithRollback(['build'], (update) => progress.push(update));
    assert.equal(result.ok, false);
    assert.equal(result.rolledBack, true);
    assert.equal(result.stderr, 'failure\n');
    assert.equal(invocation.executable, process.execPath);
    assert.equal(invocation.options.env.ELECTRON_RUN_AS_NODE, '1');
    assert.deepEqual(invocation.options.stdio, ['ignore', 'pipe', 'pipe']);
    assert.equal(invocation.args[0], path.join(rootDir, 'build', 'scripts', 'build-language.js'));
    assert.deepEqual(invocation.args.slice(1), ['build']);
    assert.ok(progress.some((update) => update.phase === 'build-output' && update.stream === 'stderr'));
    assert.ok(progress.some((update) => update.phase === 'rollback'));
    assert.equal(fs.readFileSync(reportPath, 'utf8'), '{"before":true}\n');
    assert.equal(fs.readFileSync(localePath, 'utf8'), '{"before":"translation"}\n');
    assert.equal(fs.existsSync(path.join(localeDir, 'parser.json')), false);
});

test('running build can be cancelled without blocking the caller', async () => {
    const rootDir = path.resolve('D:\\unused-test-root');
    const integration = new BuildIntegration(rootDir, { spawn: () => fakeChild(() => {}) });
    const buildPromise = integration.run();

    assert.equal(integration.isRunning(), true);
    const cancellation = integration.cancel();
    const result = await buildPromise;

    assert.equal(cancellation.ok, true);
    assert.equal(integration.isRunning(), false);
    assert.equal(result.ok, false);
    assert.equal(result.cancelled, true);
    assert.match(result.error, /cancelled/);
});

test('cancellation resolves after bounded force-stop timeouts when close never arrives', async () => {
    const signals = [];
    const child = new EventEmitter();
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    child.kill = (signal) => {
        signals.push(signal || 'default');
        return true;
    };
    const progress = [];
    const integration = new BuildIntegration(path.resolve('D:\\unused-test-root'), {
        spawn: () => child,
        cancelGraceMs: 1,
        cancelForceMs: 1
    });
    const buildPromise = integration.run(['build'], (update) => progress.push(update));

    assert.equal(integration.cancel().ok, true);
    const result = await buildPromise;

    assert.deepEqual(signals, ['default', 'SIGKILL']);
    assert.equal(integration.isRunning(), false);
    assert.equal(result.ok, false);
    assert.equal(result.cancelled, true);
    assert.match(result.error, /did not report termination/);
    assert.ok(progress.some((update) => update.message === 'Forcing the language build process to stop'));
});
