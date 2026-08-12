'use strict';

const webSocketUrl = process.argv[2];
if (!webSocketUrl) {
    throw new Error('Usage: node live-ui-check.cjs <webSocketDebuggerUrl>');
}

const socket = new WebSocket(webSocketUrl);
let nextId = 1;
const pending = new Map();

socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) { return; }
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) { reject(new Error(message.error.message)); }
    else { resolve(message.result); }
});

function request(method, params = {}) {
    return new Promise((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
    });
}

async function evaluate(expression) {
    const response = await request('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true
    });
    if (response.exceptionDetails) {
        throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    }
    return response.result.value;
}

async function main() {
    await new Promise((resolve, reject) => {
        socket.addEventListener('open', resolve, { once: true });
        socket.addEventListener('error', reject, { once: true });
    });
    await request('Runtime.enable');
    await request('Page.enable');

    const revertedPriorProbe = await evaluate(`(async () => {
        const waitFor = async (predicate, label, timeout = 20000) => {
            const deadline = Date.now() + timeout;
            while (Date.now() < deadline) {
                if (predicate()) { return; }
                await new Promise((resolve) => setTimeout(resolve, 50));
            }
            throw new Error('Timed out waiting for ' + label);
        };
        const badge = document.getElementById('dirty-badge');
        if (badge?.textContent === 'Unsaved changes') {
            window.confirm = () => true;
            document.getElementById('revert-button').click();
            await waitFor(() => badge.textContent === 'No unsaved changes', 'prior probe revert');
            return true;
        }
        return false;
    })()`);

    await request('Page.reload', { ignoreCache: true });
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const result = await evaluate(`(async () => {
        const waitFor = async (predicate, label, timeout = 30000) => {
            const deadline = Date.now() + timeout;
            while (Date.now() < deadline) {
                const value = predicate();
                if (value) { return value; }
                await new Promise((resolve) => setTimeout(resolve, 50));
            }
            throw new Error('Timed out waiting for ' + label);
        };
        const buttonWithText = (root, text) => Array.from(root.querySelectorAll('button'))
            .find((button) => button.textContent.trim() === text);

        await waitFor(() => document.querySelector('[data-view="migrationInventory"]'), 'application reload');
        document.querySelector('[data-view="migrationInventory"]').click();
        const filter = await waitFor(
            () => document.querySelector('input[aria-label="Filter migration source files"]'),
            'migration filter'
        );
        filter.value = 'package.json';
        filter.dispatchEvent(new Event('input', { bubbles: true }));
        const viewButton = await waitFor(
            () => Array.from(document.querySelectorAll('button[aria-label^="View migration candidates for"]'))
                .find((button) => button.getAttribute('aria-label').toLowerCase().includes('package.json')),
            'package.json candidate view button'
        );
        viewButton.click();
        const dialog = await waitFor(() => document.querySelector('dialog.candidate-dialog[open]'), 'candidate dialog');
        const candidateButton = await waitFor(
            () => Array.from(dialog.querySelectorAll('button.candidate-choice.in-catalog'))
                .find((button) => button.textContent.includes('Enable MyDefrag extension debug logging.')),
            'known cataloged candidate'
        );
        candidateButton.click();
        await waitFor(
            () => dialog.querySelector('.candidate-editor-host h3')?.textContent === 'Catalog Matches',
            'Catalog Matches panel'
        );
        buttonWithText(dialog, 'Edit Record').click();
        await waitFor(
            () => dialog.querySelector('.candidate-editor-host h3')?.textContent === 'Component Catalog Edit Record',
            'Component Catalog Edit Record panel'
        );
        const notes = dialog.querySelector('.candidate-editor-host [name="notes"]');
        notes.value = 'UI refresh verification f2e7b0ef';
        notes.dispatchEvent(new Event('input', { bubbles: true }));
        buttonWithText(dialog.querySelector('.candidate-editor-host'), 'Apply to in-memory draft').click();
        await waitFor(
            () => dialog.querySelector('.candidate-editor-host h3')?.textContent === 'Catalog Matches',
            'updated Catalog Matches panel'
        );
        const readOnlyNotes = dialog.querySelector('.candidate-editor-host [name="notes"]');
        const observed = {
            panelTitle: dialog.querySelector('.candidate-editor-host h3')?.textContent,
            notes: readOnlyNotes?.value,
            readOnly: readOnlyNotes?.readOnly === true,
            dirtyBadge: document.getElementById('dirty-badge')?.textContent,
            resultText: document.getElementById('result-content')?.textContent
        };
        if (observed.notes !== 'UI refresh verification f2e7b0ef' || !observed.readOnly) {
            throw new Error('Updated record was not visible in the read-only Catalog Matches panel.');
        }
        dialog.querySelector('.catalog-match-close').click();
        window.confirm = () => true;
        document.getElementById('revert-button').click();
        await waitFor(
            () => document.getElementById('dirty-badge')?.textContent === 'No unsaved changes',
            'verification probe revert'
        );
        observed.afterRevert = document.getElementById('dirty-badge')?.textContent;
        return observed;
    })()`);

    process.stdout.write(JSON.stringify({ revertedPriorProbe, result }, null, 2) + '\n');
    socket.close();
}

main().catch((error) => {
    console.error(error.stack || error.message);
    socket.close();
    process.exitCode = 1;
});
