'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { updateInventory } = require('../../scripts/generate-electron-component-catalogs');

test('app catalog inventory refresh preserves permanent candidate statuses', () => {
    const candidateStatuses = [{ path: 'src/example.js', text: 'Review me', status: 'review' }];
    const document = {
        components: [
            { id: 'translator', description: 'old translator description' },
            { id: 'locales', description: 'old locales description' }
        ],
        migrationInventory: {
            scanFiles: [{ path: 'src/example.js', component: 'server' }],
            candidateStatuses
        }
    };

    updateInventory(document);

    assert.deepEqual(document.migrationInventory.candidateStatuses, candidateStatuses);
    assert.ok(document.migrationInventory.scanFiles.some((entry) => entry.path === 'src/example.js'));
    assert.ok(document.migrationInventory.scanFiles.some((entry) => (
        entry.path === 'build/mdl-language-app/renderer/app.js' && entry.component === 'translator'
    )));
    assert.ok(document.migrationInventory.scanFiles.some((entry) => (
        entry.path === 'build/mdl-locale-app/renderer/app.js' && entry.component === 'locales'
    )));
});
