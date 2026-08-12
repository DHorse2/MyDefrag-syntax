'use strict';

const webSocketUrl = process.argv[2];
if (!webSocketUrl) {
    throw new Error('Usage: node reproduce-repeated-catalog-edits.cjs <webSocketDebuggerUrl>');
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

    const result = await evaluate(`(async () => {
        const waitFor = async (predicate, label, timeout = 30000) => {
            const deadline = Date.now() + timeout;
            while (Date.now() < deadline) {
                const value = predicate();
                if (value) { return value; }
                await new Promise((resolve) => setTimeout(resolve, 40));
            }
            throw new Error('Timed out waiting for ' + label);
        };
        const clickText = (root, text) => {
            const button = Array.from(root.querySelectorAll('button'))
                .find((item) => item.textContent.trim() === text);
            if (!button) { throw new Error('Button not found: ' + text); }
            button.click();
        };
        const records = () => state.views.catalog.records;
        const baseline = JSON.parse(JSON.stringify(records()));
        const expected = JSON.parse(JSON.stringify(baseline));
        const observations = [];
        let dialog;

        const assertCatalogExactlyExpected = (iteration) => {
            const current = records();
            if (current.length !== baseline.length) {
                throw new Error(iteration + ': catalog count changed from ' + baseline.length + ' to ' + current.length);
            }
            if (new Set(current.map((record) => record.key)).size !== current.length) {
                throw new Error(iteration + ': duplicate catalog key detected');
            }
            if (JSON.stringify(current) !== JSON.stringify(expected)) {
                const changed = current.filter((record, index) => (
                    JSON.stringify(record) !== JSON.stringify(expected[index])
                )).map((record) => record.key);
                throw new Error(iteration + ': unexpected catalog mutations: ' + changed.join(', '));
            }
        };

        const selectCandidateForKey = async (key) => {
            const button = await waitFor(
                () => Array.from(dialog.querySelectorAll('button.candidate-choice.in-catalog'))
                    .find((item) => item.textContent.includes('Catalog:') && item.textContent.includes(key)),
                'In Catalog candidate for ' + key
            );
            button.click();
            await waitFor(
                () => dialog.querySelector('.candidate-editor-host h3')?.textContent === 'Catalog Matches',
                'Catalog Matches for ' + key
            );
            return button;
        };

        const editStatus = async (candidateButton, key, nextStatus, iteration) => {
            const editButton = dialog.querySelector('button[aria-label="Edit catalog record ' + key + '"]');
            if (!editButton) { throw new Error(iteration + ': edit button missing for ' + key); }
            editButton.click();
            await waitFor(
                () => dialog.querySelector('.candidate-editor-host h3')?.textContent === 'Component Catalog Edit Record',
                iteration + ' edit panel'
            );
            const status = dialog.querySelector('.candidate-editor-host [name="status"]');
            if (!status || !Array.from(status.options).some((option) => option.value === nextStatus)) {
                throw new Error(iteration + ': status option unavailable: ' + nextStatus);
            }
            status.value = nextStatus;
            status.dispatchEvent(new Event('change', { bubbles: true }));
            clickText(dialog.querySelector('.candidate-editor-host'), 'Apply to in-memory draft');
            await waitFor(
                () => dialog.querySelector('.candidate-editor-host h3')?.textContent === 'Catalog Matches',
                iteration + ' return to Catalog Matches'
            );
            const expectedRecord = expected.find((record) => record.key === key);
            expectedRecord.status = nextStatus;
            assertCatalogExactlyExpected(iteration);
            const recordRow = dialog.querySelector('button[aria-label="Edit catalog record ' + key + '"]')?.closest('li');
            const visibleStatus = recordRow?.querySelector('[name="status"]')?.value;
            const actualStatus = records().find((record) => record.key === key)?.status;
            const candidateStatus = candidateButton.querySelector('.candidate-status')?.textContent;
            const warningHidden = dialog.querySelector('.candidate-workflow-notice')?.hidden;
            if (visibleStatus !== nextStatus || actualStatus !== nextStatus) {
                throw new Error(iteration + ': status did not refresh (visible=' + visibleStatus
                    + ', actual=' + actualStatus + ', expected=' + nextStatus + ')');
            }
            if (candidateStatus !== 'In Catalog') {
                throw new Error(iteration + ': candidate status changed to ' + candidateStatus);
            }
            if (warningHidden !== true) {
                throw new Error(iteration + ': accepted-for-translation warning leaked into catalog edit');
            }
            observations.push({ iteration, key, nextStatus, visibleStatus, candidateStatus, warningHidden });
        };

        try {
            await waitFor(() => document.querySelector('[data-view="migrationInventory"]'), 'application');
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
            dialog = await waitFor(() => document.querySelector('dialog.candidate-dialog[open]'), 'candidate dialog');

            const repeatedKey = 'package.contributes.configuration.properties.mydfrg.debugOn.description';
            let selectedCandidate = await selectCandidateForKey(repeatedKey);
            const cycle = ['reviewed', 'approved', 'draft'];
            for (let index = 0; index < 12; index += 1) {
                await editStatus(selectedCandidate, repeatedKey, cycle[index % cycle.length], 'repeat-' + (index + 1));
            }

            const multiMatchKey = 'package.metadata.description';
            selectedCandidate = await selectCandidateForKey(multiMatchKey);
            for (let index = 0; index < 4; index += 1) {
                await editStatus(selectedCandidate, multiMatchKey, cycle[(index + 1) % cycle.length], 'multi-' + (index + 1));
            }

            return {
                ok: true,
                baselineCount: baseline.length,
                applyCount: observations.length,
                observations,
                dirtyBeforeCleanup: document.getElementById('dirty-badge')?.textContent
            };
        } finally {
            if (dialog?.open) { dialog.close(); }
            window.confirm = () => true;
            document.getElementById('revert-button').click();
            await waitFor(
                () => document.getElementById('dirty-badge')?.textContent === 'No unsaved changes',
                'draft cleanup'
            );
        }
    })()`);

    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    socket.close();
}

main().catch((error) => {
    console.error(error.stack || error.message);
    socket.close();
    process.exitCode = 1;
});
