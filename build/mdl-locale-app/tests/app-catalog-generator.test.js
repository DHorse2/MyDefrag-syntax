'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
    retainCatalogEntries,
    updateInventory
} = require('../../scripts/generate-electron-component-catalogs');

test('app catalog refresh retains source-removed keys only when an authored locale uses them', () => {
    const entries = [
        { key: 'extension.current', source: 'src/extension.js' },
        { key: 'locales.current', source: 'build/mdl-locale-app/renderer/app.js' },
        { key: 'locales.translatedHistorical', source: 'build/mdl-locale-app/renderer/app.js' },
        { key: 'locales.unusedHistorical', source: 'build/mdl-locale-app/renderer/app.js' }
    ];
    const generated = [{ key: 'locales.current', source: 'build/mdl-locale-app/renderer/app.js' }];
    const localeKeys = new Set(['locales.translatedHistorical']);

    assert.deepEqual(
        retainCatalogEntries(entries, generated, localeKeys, ['build/mdl-locale-app/'])
            .map((entry) => entry.key),
        ['extension.current', 'locales.translatedHistorical']
    );
});

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
    assert.ok(!document.migrationInventory.scanFiles.some((entry) => entry.component === 'translator'));
    assert.ok(document.migrationInventory.scanFiles.some((entry) => (
        entry.path === 'build/mdl-locale-app/renderer/app.js' && entry.component === 'locales'
    )));
});
