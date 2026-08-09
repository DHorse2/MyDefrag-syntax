'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function editorCandidates(environment = process.env) {
    return Array.from(new Set([
        environment.MYDEFRAG_LANGUAGE_EDITOR,
        environment.ProgramFiles && path.join(environment.ProgramFiles, 'VSCodium', 'VSCodium.exe'),
        environment.LOCALAPPDATA && path.join(environment.LOCALAPPDATA, 'Programs', 'VSCodium', 'VSCodium.exe'),
        environment.ProgramFiles && path.join(environment.ProgramFiles, 'Microsoft VS Code', 'Code.exe'),
        environment.LOCALAPPDATA && path.join(environment.LOCALAPPDATA, 'Programs', 'Microsoft VS Code', 'Code.exe')
    ].filter(Boolean)));
}

async function openSourceAtLine(shellApi, target, options = {}) {
    const fileSystem = options.fileSystem || fs;
    const spawnProcess = options.spawnProcess || spawn;
    const candidates = options.editorPaths || editorCandidates(options.environment);
    for (const executable of candidates) {
        if (!fileSystem.existsSync(executable)) { continue; }
        try {
            const child = spawnProcess(
                executable,
                ['--reuse-window', '--goto', `${target.absolutePath}:${target.line}:1`],
                { detached: true, stdio: 'ignore', windowsHide: false }
            );
            child.unref();
            return { ok: true, mode: 'line', editor: executable, line: target.line };
        } catch {
            // Try the next configured line-aware editor before using the file fallback.
        }
    }

    const error = await shellApi.openPath(target.absolutePath);
    if (error) {
        return { ok: false, error: `Unable to open ${target.relativePath}: ${error}` };
    }
    return {
        ok: true,
        mode: 'file',
        message: 'A line-aware VSCodium or VS Code installation was not found; the source file was opened with its default application.'
    };
}

module.exports = {
    editorCandidates,
    openSourceAtLine
};
