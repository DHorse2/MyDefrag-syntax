'use strict';

const http = require('node:http');

function getJson(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (response) => {
            let body = '';
            response.setEncoding('utf8');
            response.on('data', (chunk) => { body += chunk; });
            response.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

async function main() {
    const expression = process.argv[2];
    const port = Number(process.argv[3] || 9340);
    if (!expression) { throw new Error('Pass a JavaScript expression to evaluate.'); }
    const targets = await getJson(`http://127.0.0.1:${port}/json/list`);
    const target = targets.find((entry) => entry.type === 'page');
    if (!target) { throw new Error('No Electron renderer target is available.'); }
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
        socket.addEventListener('open', resolve, { once: true });
        socket.addEventListener('error', reject, { once: true });
    });
    const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('CDP evaluation timed out.')), 15000);
        socket.addEventListener('message', (event) => {
            const message = JSON.parse(event.data);
            if (message.id !== 1) { return; }
            clearTimeout(timeout);
            resolve(message);
        });
        socket.send(JSON.stringify({
            id: 1,
            method: 'Runtime.evaluate',
            params: {
                expression,
                awaitPromise: true,
                returnByValue: true
            }
        }));
    });
    socket.close();
    if (response.error) { throw new Error(response.error.message); }
    if (response.result?.exceptionDetails) {
        throw new Error(response.result.exceptionDetails.exception?.description || response.result.exceptionDetails.text);
    }
    process.stdout.write(`${JSON.stringify(response.result?.result?.value, null, 2)}\n`);
}

main().catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
});
