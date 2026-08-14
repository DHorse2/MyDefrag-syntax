'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { createLogger, logArrayToConsole } = require('./logger');

const severity = { Error: 1, Warning: 2, Information: 3, Hint: 4 };

function config(overrides = {}) {
    return {
        iniData: { severity },
        isDebugOn: true,
        verboseLevel: 5,
        isLogOn: true,
        ...overrides
    };
}

test('client logger writes enabled messages to the output channel', t => {
    const output = [];
    const consoleOutput = [];
    const originalLog = console.log;
    console.log = message => consoleOutput.push(String(message));
    t.after(() => { console.log = originalLog; });
    const logger = createLogger('Test', 'Client', config(), {
        outputChannel: { appendLine(message) { output.push(message); } },
        fileEnabled: false
    });

    logger.info(severity.Information, 'hello', { count: 2 });

    assert.ok(output.some(message => /\[INFO\].*hello.*"count":2/.test(message)));
    assert.equal(consoleOutput.length, output.length);
});

test('server logger forwards messages through the LSP connection', () => {
    const notifications = [];
    const logger = createLogger('Test', 'Server', config({ isServer: true }), {
        isServer: true,
        connection: {
            sendNotification(method, payload) {
                notifications.push({ method, payload });
            }
        },
        fileEnabled: false
    });

    logger.warn(severity.Warning, 'careful');

    assert.equal(notifications.at(-1).method, 'mydefrag/log');
    assert.match(notifications.at(-1).payload.message, /\[WARNING\].*careful/);
});

test('logger honors debug severity thresholds', t => {
    const output = [];
    const originalLog = console.log;
    console.log = () => {};
    t.after(() => { console.log = originalLog; });
    const logger = createLogger('Test', 'Client', config({ verboseLevel: 2 }), {
        outputChannel: { appendLine(message) { output.push(message); } },
        fileEnabled: false
    });

    logger.dbg(3, 'hidden');
    logger.dbg(2, 'visible');

    assert.equal(output.some(message => message.includes('hidden')), false);
    assert.equal(output.some(message => message.includes('visible')), true);
});

test('logger recreates and appends to its configured file', t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mydefrag-logger-'));
    const filePath = path.join(directory, 'logs', 'test.log');
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, 'stale content', 'utf8');
    const logger = createLogger('Test', 'File', config({ isDebugOn: false }), {
        filePath
    });

    logger.info(severity.Information, 'persisted');
    const content = fs.readFileSync(filePath, 'utf8');

    assert.equal(content.includes('stale content'), false);
    assert.match(content, /session/);
    assert.match(content, /persisted/);
});

test('logArrayToConsole deduplicates messages and empties the input array', () => {
    const calls = [];
    const logger = {
        err(message) { calls.push(['err', message]); },
        message(level, message) { calls.push(['message', level, message]); },
        dbg(level, message) { calls.push(['dbg', level, message]); }
    };
    const messages = ['one', 'one', 'two'];

    logArrayToConsole(logger, 'Test', severity.Warning, new Set(), messages);

    assert.deepEqual(
        calls.filter(call => call[0] === 'message').map(call => call[2]),
        ['one', 'two']
    );
    assert.deepEqual(messages, []);
});
