// .codex/tmp/open-first-doc.js
const cp = require('child_process');

const exe = 'C:/Progra~1/VSCodium/bin/codium.cmd';
const args = [
    '--reuse-window',
    'D:/Script/MyDefrag-syntax/docs/Diagnostic Widget Requirements.md'
];

const child = cp.spawn(exe, args, {
    detached: true,
    stdio: 'ignore',
    shell: false
});

child.unref();
