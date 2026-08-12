'use strict';

const webSocketUrl = process.argv[2];
if (!webSocketUrl) {
    throw new Error('Usage: node live-verify-catalog-workflow.cjs <webSocketDebuggerUrl>');
}

const socket = new WebSocket(webSocketUrl);
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

async function main() {
    await new Promise((resolve, reject) => {
        socket.addEventListener('open', resolve, { once: true });
        socket.addEventListener('error', reject, { once: true });
    });
    await send('Runtime.enable');
    const response = await send('Runtime.evaluate', {
        expression: `(async () => {
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
            const candidateByText = (dialog, text, className = '') => Array.from(
                dialog.querySelectorAll('button.candidate-choice' + className)
            ).find((button) => button.querySelector('.candidate-text')?.textContent === text);
            const records = () => state.views.catalog.records;
            const baseline = JSON.parse(JSON.stringify(records()));
            const baselineJson = JSON.stringify(baseline);
            const added = [];
            const observations = [];
            let dialog;
            let outcome;

            const assertBaselineRecordsUnchanged = (label) => {
                for (const baselineRecord of baseline) {
                    const current = records().find((record) => record.key === baselineRecord.key);
                    if (JSON.stringify(current) !== JSON.stringify(baselineRecord)) {
                        throw new Error(label + ': existing record changed: ' + baselineRecord.key);
                    }
                }
                const keys = records().map((record) => record.key);
                if (new Set(keys).size !== keys.length) {
                    throw new Error(label + ': duplicate catalog key detected');
                }
            };

            const addCandidate = async (text, expectedIdentity, label) => {
                const button = await waitFor(() => candidateByText(dialog, text), label + ' candidate');
                button.click();
                await waitFor(
                    () => dialog.querySelector('.candidate-editor-host h3')?.textContent === 'Component Catalog Add Record',
                    label + ' Add Record panel'
                );
                const host = dialog.querySelector('.candidate-editor-host');
                const suggested = await waitFor(
                    () => host.querySelector('[aria-label="Suggested key"]'),
                    label + ' suggested key'
                );
                if (!suggested.value.includes(expectedIdentity)) {
                    throw new Error(label + ': array identity missing from suggestion: ' + suggested.value);
                }
                const category = await waitFor(() => host.querySelector('[name="category"]'), label + ' category');
                category.value = 'command';
                category.dispatchEvent(new Event('change', { bubbles: true }));
                const role = await waitFor(() => host.querySelector('[name="role"]'), label + ' role');
                role.value = 'title';
                role.dispatchEvent(new Event('change', { bubbles: true }));
                clickText(host, 'Use suggested key');
                const key = host.querySelector('[name="key"]').value;
                if (!key.includes(expectedIdentity) || records().some((record) => record.key === key)) {
                    throw new Error(label + ': suggested key is not unique: ' + key);
                }
                clickText(host, 'Apply to in-memory draft');
                await waitFor(
                    () => dialog.querySelector('.candidate-editor-host h3')?.textContent === 'Catalog Matches',
                    label + ' Catalog Matches return'
                );
                const record = records().find((entry) => entry.key === key);
                if (!record || record.text !== text || record.status !== 'draft') {
                    throw new Error(label + ': added catalog record is missing or incorrect');
                }
                if (records().length !== baseline.length + added.length + 1) {
                    throw new Error(label + ': unexpected catalog count after add');
                }
                assertBaselineRecordsUnchanged(label);
                added.push(JSON.parse(JSON.stringify(record)));
                const selected = candidateByText(dialog, text, '.in-catalog');
                if (!selected || selected.querySelector('.candidate-status')?.textContent !== 'In Catalog') {
                    throw new Error(label + ': candidate did not become In Catalog');
                }
                const catalogStatus = dialog.querySelector('.catalog-match-summary')?.textContent;
                if (!catalogStatus?.includes('Catalog status: draft')) {
                    throw new Error(label + ': visible catalog status did not show draft');
                }
                observations.push({ label, key, status: record.status, catalogCount: records().length });
                return { key, button: selected };
            };

            try {
                await waitFor(() => document.querySelector('[data-view="migrationInventory"]'), 'application');
                document.querySelector('[data-view="migrationInventory"]').click();
                const filterPath = await waitFor(
                    () => document.querySelector('input[aria-label="Filter migration source files"]'),
                    'migration filter'
                );
                filterPath.value = 'package.json';
                filterPath.dispatchEvent(new Event('input', { bubbles: true }));
                const viewButton = await waitFor(
                    () => Array.from(document.querySelectorAll('button[aria-label^="View migration candidates for"]'))
                        .find((button) => button.getAttribute('aria-label').toLowerCase().includes('package.json')),
                    'package.json View button'
                );
                viewButton.click();
                dialog = await waitFor(() => document.querySelector('dialog.candidate-dialog[open]'), 'candidate dialog');

                const statusFilter = dialog.querySelector('select[aria-label="Filter candidates by status"]');
                const lineOrder = dialog.querySelector('select[aria-label="Order candidates by line"]');
                statusFilter.value = 'rejected';
                statusFilter.dispatchEvent(new Event('change', { bubbles: true }));
                await new Promise((resolve) => setTimeout(resolve, 80));
                const rows = Array.from(dialog.querySelectorAll('.candidate-choice-row'));
                const visibleRows = rows.filter((row) => getComputedStyle(row).display !== 'none');
                if (!visibleRows.length || visibleRows.length >= rows.length
                    || visibleRows.some((row) => !row.querySelector('.candidate-choice.rejected'))) {
                    throw new Error('Rejected filter did not restrict the visible candidate rows');
                }
                const filterTop = statusFilter.getBoundingClientRect().top;
                const orderTop = lineOrder.getBoundingClientRect().top;
                if (Math.abs(filterTop - orderTop) > 2) {
                    throw new Error('Filter status and Line order controls are not on one line');
                }
                const filterObservation = {
                    totalRows: rows.length,
                    rejectedRows: visibleRows.length,
                    controlTopDifference: Math.abs(filterTop - orderTop)
                };
                statusFilter.value = 'all';
                statusFilter.dispatchEvent(new Event('change', { bubbles: true }));

                const first = await addCandidate(
                    'MyDefrag: Next Diagnostic',
                    'mydfrg.diagnostics.next.title',
                    'add-1'
                );
                const second = await addCandidate(
                    'MyDefrag: Previous Diagnostic',
                    'mydfrg.diagnostics.previous.title',
                    'add-2'
                );

                first.button.click();
                await waitFor(
                    () => dialog.querySelector(
                        'button[aria-label="Edit catalog record ' + first.key + '"]'
                    ),
                    'first added Catalog Matches'
                );
                for (const nextStatus of ['reviewed', 'approved', 'draft', 'reviewed', 'approved', 'draft']) {
                    const edit = await waitFor(
                        () => dialog.querySelector('button[aria-label="Edit catalog record ' + first.key + '"]'),
                        'repeated edit button'
                    );
                    edit.click();
                    await waitFor(
                        () => dialog.querySelector('.candidate-editor-host h3')?.textContent === 'Component Catalog Edit Record',
                        'repeated edit panel'
                    );
                    const host = dialog.querySelector('.candidate-editor-host');
                    const keyControl = host.querySelector('[name="key"]');
                    if (!keyControl.readOnly) { throw new Error('Existing catalog key is editable'); }
                    const status = host.querySelector('[name="status"]');
                    status.value = nextStatus;
                    status.dispatchEvent(new Event('change', { bubbles: true }));
                    clickText(host, 'Apply to in-memory draft');
                    await waitFor(
                        () => dialog.querySelector('.candidate-editor-host h3')?.textContent === 'Catalog Matches',
                        'repeated edit return'
                    );
                    const current = records().find((record) => record.key === first.key);
                    if (current.status !== nextStatus) {
                        throw new Error('Edited status did not update to ' + nextStatus);
                    }
                    if (!dialog.querySelector('.catalog-match-summary')?.textContent.includes('Catalog status: ' + nextStatus)) {
                        throw new Error('Visible Catalog status did not update to ' + nextStatus);
                    }
                    assertBaselineRecordsUnchanged('edit-' + nextStatus);
                    const unchangedSecond = records().find((record) => record.key === second.key);
                    if (JSON.stringify(unchangedSecond) !== JSON.stringify(added[1])) {
                        throw new Error('Editing the first added record changed the second added record');
                    }
                }

                const third = await addCandidate(
                    'MyDefrag: Next File',
                    'mydfrg.diagnostics.nextFile.title',
                    'add-3-after-edits'
                );
                assertBaselineRecordsUnchanged('final');
                if (JSON.stringify(baseline) !== baselineJson) {
                    throw new Error('Local baseline was mutated');
                }
                outcome = {
                    ok: true,
                    baselineCount: baseline.length,
                    finalDraftCount: records().length,
                    addedKeys: [first.key, second.key, third.key],
                    filter: filterObservation,
                    observations,
                    dirtyBeforeRevert: document.getElementById('dirty-badge')?.textContent
                };
            } finally {
                window.confirm = () => true;
                document.getElementById('revert-button').click();
                await waitFor(
                    () => document.getElementById('dirty-badge')?.textContent === 'No unsaved changes',
                    'draft revert'
                );
                if (dialog?.open) { dialog.close(); }
            }
            outcome.afterRevert = document.getElementById('dirty-badge')?.textContent;
            return outcome;
        })()`,
        awaitPromise: true,
        returnByValue: true
    });
    if (response.exceptionDetails) {
        throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    }
    process.stdout.write(JSON.stringify(response.result.value, null, 2) + '\n');
    socket.close();
}

main().catch((error) => {
    console.error(error.stack || error.message);
    socket.close();
    process.exitCode = 1;
});
