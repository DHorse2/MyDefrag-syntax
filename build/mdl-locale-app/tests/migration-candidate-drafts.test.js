'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
    buildCandidateCatalogDrafts,
    inferCatalogMetadata
} = require('../../scripts/generate-migration-candidate-drafts');

test('infers candidate catalog metadata from the referenced source context', () => {
    assert.deepEqual(inferCatalogMetadata({
        relativePath: 'src/extension.js',
        sourceText: "logger.warn('Unable to open the requested file.');",
        line: 1,
        candidateText: 'Unable to open the requested file.',
        fullLine: "logger.warn('Unable to open the requested file.');"
    }), { category: 'log', role: 'warning' });

    assert.deepEqual(inferCatalogMetadata({
        relativePath: 'build/app/index.html',
        sourceText: '<button>Save changes</button>',
        line: 1,
        candidateText: 'Save changes',
        fullLine: '<button>Save changes</button>'
    }), { category: 'action', role: 'label' });

    assert.deepEqual(inferCatalogMetadata({
        relativePath: 'src/extension.js',
        sourceText: "const filePath = './output/report.json';",
        line: 1,
        candidateText: './output/report.json',
        fullLine: "const filePath = './output/report.json';"
    }), { category: 'path', role: 'structural' });
});

test('adds one draft for every unique potential candidate while preserving existing drafts and statuses', (t) => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'candidate-catalog-drafts-'));
    t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
    const relativePath = 'src/example.js';
    const absolutePath = path.join(rootDir, ...relativePath.split('/'));
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, [
        "logger.warn('Unable to open the requested file.');",
        "const buttonLabel = 'Save changes';",
        "const ignored = 'Already rejected';"
    ].join('\n'), 'utf8');

    const existingDraft = {
        path: relativePath,
        sourceLine: 9,
        text: 'Preserve me',
        component: 'extension',
        category: 'message',
        role: 'text',
        key: 'extension.message.preserveMe.text',
        futureField: 'unchanged'
    };
    const statuses = [{ path: relativePath, text: 'Already rejected', status: 'rejected' }];
    const components = {
        migrationInventory: {
            scanFiles: [{ path: relativePath, component: 'extension' }],
            candidateStatuses: statuses,
            candidateCatalogDrafts: [existingDraft]
        }
    };
    const catalog = { entries: [{ key: 'extension.message.existing.text' }] };
    const report = {
        files: [{
            file: relativePath,
            candidates: [{
                line: 1,
                text: 'Unable to open the requested file.',
                fullLine: "logger.warn('Unable to open the requested file.');",
                status: 'potential'
            }, {
                line: 2,
                text: 'Save changes',
                fullLine: "const buttonLabel = 'Save changes';",
                status: 'potential'
            }, {
                line: 3,
                text: 'Already rejected',
                fullLine: "const ignored = 'Already rejected';",
                status: 'rejected'
            }]
        }]
    };

    const result = buildCandidateCatalogDrafts({ components, catalog, report, rootDir });

    assert.equal(result.existingCount, 1);
    assert.equal(result.addedCount, 2);
    assert.equal(result.drafts.length, 3);
    assert.deepEqual(result.drafts[0], existingDraft);
    assert.deepEqual(components.migrationInventory.candidateStatuses, statuses);
    assert.deepEqual(
        result.drafts.slice(1).map((draft) => [draft.component, draft.category, draft.role]),
        [['extension', 'log', 'warning'], ['extension', 'action', 'label']]
    );
    assert.equal(new Set(result.drafts.map((draft) => draft.key)).size, result.drafts.length);
    assert.ok(result.drafts.slice(1).every((draft) => (
        /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_-]+)+$/u.test(draft.key)
    )));
});
