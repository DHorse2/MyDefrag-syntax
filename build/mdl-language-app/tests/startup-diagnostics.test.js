'use strict';

const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const {
    attachAppDiagnostics,
    attachWebContentsDiagnostics,
    configureApplicationProfile,
    createStartupDiagnostics
} = require('../main/startup-diagnostics');

test('configures an application-specific profile without changing the shared Electron profile', (context) => {
    const appData = fs.mkdtempSync(path.join(os.tmpdir(), 'mydefrag-electron-profile-'));
    context.after(() => fs.rmSync(appData, { recursive: true, force: true }));
    const calls = [];
    const app = {
        getPath: (name) => {
            assert.equal(name, 'appData');
            return appData;
        },
        setAppLogsPath: (value) => calls.push(['logs', value]),
        setName: (value) => calls.push(['name', value]),
        setPath: (name, value) => calls.push([name, value])
    };

    const profile = configureApplicationProfile(app);

    assert.equal(profile.profileDirectory, path.join(appData, 'MyDefrag Language Maintenance'));
    assert.equal(fs.statSync(profile.profileDirectory).isDirectory(), true);
    assert.equal(fs.statSync(profile.sessionDirectory).isDirectory(), true);
    assert.equal(fs.statSync(profile.logDirectory).isDirectory(), true);
    assert.deepEqual(calls, [
        ['name', 'MyDefrag Language Maintenance'],
        ['userData', profile.profileDirectory],
        ['sessionData', profile.sessionDirectory],
        ['logs', profile.logDirectory]
    ]);
});

test('writes append-only JSONL startup events and captures Electron lifecycle failures', (context) => {
    const logDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'mydefrag-startup-log-'));
    context.after(() => fs.rmSync(logDirectory, { recursive: true, force: true }));
    let tick = 0;
    const diagnostics = createStartupDiagnostics(
        { logDirectory },
        { now: () => new Date(1720000000000 + tick++), processId: 321 }
    );
    const app = new EventEmitter();
    const webContents = new EventEmitter();
    webContents.id = 42;

    attachAppDiagnostics(app, diagnostics);
    attachWebContentsDiagnostics(webContents, 'splash', diagnostics);
    diagnostics.record('process-start', { profile: 'dedicated' });
    app.emit('child-process-gone', {}, {
        type: 'Utility',
        reason: 'crashed',
        exitCode: 1,
        name: 'Network Service'
    });
    webContents.emit('did-fail-load', {}, -2, 'FAILED', 'file:///splash/index.html', true);

    const entries = fs.readFileSync(diagnostics.logPath, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
    assert.deepEqual(entries.map((entry) => entry.event), [
        'process-start',
        'child-process-gone',
        'did-fail-load'
    ]);
    assert.equal(entries[1].details.name, 'Network Service');
    assert.equal(entries[2].details.label, 'splash');
    assert.ok(entries.every((entry) => entry.processId === 321));
});

test('temporary UDP monitor has a preserving uninstall path and permanent capture scripts', () => {
    const projectRoot = path.resolve(__dirname, '..', '..', '..');
    const installer = fs.readFileSync(path.join(projectRoot, 'scripts', 'Install-UdpPortExhaustionMonitor.ps1'), 'utf8');
    const capture = fs.readFileSync(path.join(projectRoot, 'scripts', 'Capture-UdpPortExhaustion.ps1'), 'utf8');

    assert.match(installer, /Temporary diagnostic/);
    assert.match(installer, /EventID=4266/);
    assert.match(installer, /Unregister-ScheduledTask/);
    assert.match(installer, /Captured logs were preserved/);
    assert.doesNotMatch(installer, /Remove-Item/);
    assert.doesNotMatch(installer, /<LogonType>/);
    assert.match(capture, /Get-NetUDPEndpoint/);
    assert.match(capture, /netstat\.exe.*-anoq/);
    assert.match(capture, /using netstat fallback/);
    assert.match(capture, /ProcessesByUdpEndpointCount/);
    assert.match(capture, /TemporaryDiagnostic = \$true/);
    assert.doesNotMatch(capture, /CommandLine|Get-CimInstance/);
});

test('main process configures its dedicated profile before enabling the sandbox and keeps the splash visible', () => {
    const mainSource = fs.readFileSync(path.join(__dirname, '..', 'main', 'main.js'), 'utf8');
    const profileIndex = mainSource.indexOf('configureApplicationProfile(app)');
    const sandboxIndex = mainSource.indexOf('app.enableSandbox()');

    assert.ok(profileIndex >= 0);
    assert.ok(sandboxIndex > profileIndex);
    assert.match(mainSource, /attachAppDiagnostics\(app, startupDiagnostics\)/);
    assert.match(mainSource, /splashWindow\.show\(\)/);
    assert.match(mainSource, /mainWindow\.once\('ready-to-show'/);
    assert.doesNotMatch(mainSource, /main-window-show-fallback/);
});
