'use strict';

const socket = new WebSocket(process.argv[2]);
let nextId = 1;
const pending = new Map();

socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) { return; }
    const request = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) { request.reject(new Error(message.error.message)); }
    else { request.resolve(message.result); }
});

function send(method, params = {}) {
    return new Promise((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
    });
}

socket.addEventListener('open', async () => {
    try {
        const response = await send('Runtime.evaluate', {
            expression: `(async () => {
                const result = await api.getMigrationCandidates('package.json');
                const candidates = result.file.candidates
                    .filter((candidate) => candidate.status !== 'rejected')
                    .slice(0, 40);
                const suggestions = [];
                for (const candidate of candidates) {
                    const suggestion = await api.suggestCatalogKey({ path: 'package.json', line: candidate.line });
                    suggestions.push({
                        line: candidate.line,
                        text: candidate.text,
                        status: candidate.status,
                        suggestedKey: suggestion.suggestedKey,
                        ok: suggestion.ok,
                        error: suggestion.error,
                        existingRecord: state.views.catalog.records.some((record) => record.key === suggestion.suggestedKey)
                    });
                }
                return suggestions;
            })()`,
            awaitPromise: true,
            returnByValue: true
        });
        if (response.exceptionDetails) {
            throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
        }
        console.log(JSON.stringify(response.result.value, null, 2));
        socket.close();
    } catch (error) {
        console.error(error.stack || error.message);
        socket.close();
        process.exitCode = 1;
    }
});
