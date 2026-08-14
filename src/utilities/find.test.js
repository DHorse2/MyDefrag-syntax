'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { findScriptFile } = require('./find');

test('findScriptFile accepts an exact absolute path', async t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mydefrag-find-'));
    const scriptPath = path.join(directory, 'Exact.MyD');
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    fs.writeFileSync(scriptPath, 'Description("test")', 'utf8');

    assert.equal(await findScriptFile(scriptPath), path.resolve(scriptPath));
});

test('findScriptFile appends the MyD extension in an installation directory', async t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mydefrag-find-'));
    const scriptPath = path.join(directory, 'Weekly.MyD');
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    fs.writeFileSync(scriptPath, 'Description("test")', 'utf8');

    assert.equal(
        await findScriptFile('Weekly', { installDir: directory }),
        path.resolve(scriptPath)
    );
});

test('findScriptFile searches a Scripts child directory', async t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mydefrag-find-'));
    const scriptsDirectory = path.join(directory, 'Scripts');
    const scriptPath = path.join(scriptsDirectory, 'Nested.MyD');
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    fs.mkdirSync(scriptsDirectory);
    fs.writeFileSync(scriptPath, 'Description("test")', 'utf8');

    assert.equal(
        await findScriptFile('Nested', { installDir: directory }),
        path.resolve(scriptPath)
    );
});

test('findScriptFile returns null when no candidate exists', async () => {
    const name = `not-present-${Date.now()}-${process.pid}`;

    assert.equal(await findScriptFile(name, {
        installDir: path.join(os.tmpdir(), name),
        exePath: path.join(os.tmpdir(), name, 'MyDefrag.exe'),
        mainScriptPath: path.join(os.tmpdir(), name, 'main.js')
    }), null);
});
