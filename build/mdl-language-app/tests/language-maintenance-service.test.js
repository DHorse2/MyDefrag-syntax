'use strict';

const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const { buildOptions, LanguageMaintenanceService } = require('../services/language-maintenance-service');
const {
    buildMigrationReport,
    extractStringCandidates,
    loadLanguageState
} = require('../../scripts/build-language');
const { StubBuildIntegration, createFixture, readJson, writeJson } = require('./helpers');

function createService(rootDir, buildIntegration = new StubBuildIntegration()) {
    return new LanguageMaintenanceService(rootDir, { buildIntegration });
}

test('build mode defaults to normalized and requires explicit DeepL opt-in', () => {
    assert.deepEqual(buildOptions(), { arguments: ['build', '--UseNormalized'], mode: 'normalized' });
    assert.deepEqual(buildOptions({ useDeepL: false }), { arguments: ['build', '--UseNormalized'], mode: 'normalized' });
    assert.deepEqual(buildOptions({ useDeepL: 'true' }), { arguments: ['build', '--UseNormalized'], mode: 'normalized' });
    assert.deepEqual(buildOptions({ useDeepL: true }), { arguments: ['build'], mode: 'deepl' });
});

test('quoted-string extraction consumes short, single-token, and path-like literals without bridging fields', () => {
    const source = "errors.push({ path: '/', message: 'The locale component schema is unavailable.', source: 'schema' });";

    assert.deepEqual(extractStringCandidates(source), [
        {
            line: 1,
            text: 'The locale component schema is unavailable.',
            fullLine: source
        },
        {
            line: 1,
            text: 'schema',
            fullLine: source
        }
    ]);
    assert.deepEqual(extractStringCandidates("'Go!'"), [{
        line: 1,
        text: 'Go!',
        fullLine: "'Go!'"
    }]);
    assert.deepEqual(
        extractStringCandidates("const labels = ['Save', 'Manual.html', 'docs/Getting Started.html'];")
            .map((candidate) => candidate.text),
        ['Save', 'Manual.html', 'docs/Getting Started.html']
    );
});

test('quoted-string extraction excludes require arguments by source position, not string value', () => {
    const source = [
        "const fs = require('fs');",
        'const path = require ( "node:path" );',
        'const os = require(',
        "    'node:os'",
        ');',
        "const nested = loader.require('nested-module');",
        'const guidance = "require(module) before continuing";',
        "const ordinary = prerequire('Keep this candidate');"
    ].join('\n');

    assert.deepEqual(
        extractStringCandidates(source).map((candidate) => candidate.text),
        ['require(module) before continuing', 'Keep this candidate']
    );
});

test('loads valid canonical files, component selector data, and migration inventory without writing', (t) => {
    const rootDir = createFixture(t);
    const catalogPath = path.join(rootDir, 'language', 'canonical', 'component-catalog.json');
    const before = fs.readFileSync(catalogPath);
    const beforeTime = fs.statSync(catalogPath).mtimeMs;

    const state = createService(rootDir).load();
    const localeTemplates = readJson(rootDir, 'language/canonical/language-locales.json').locales;
    const registeredLocales = readJson(rootDir, 'language/locales/locales.json').locales;
    const categories = readJson(rootDir, 'language/canonical/catalog-categories.json').categories;
    const roles = readJson(rootDir, 'language/canonical/catalog-roles.json').roles;
    const categoryUsage = Object.fromEntries(Object.entries(
        readJson(rootDir, 'language/canonical/component-catalog.json').entries.reduce((usage, entry) => {
            usage[entry.category] = (usage[entry.category] || 0) + 1;
            return usage;
        }, {})
    ));
    const roleUsage = Object.fromEntries(Object.entries(
        readJson(rootDir, 'language/canonical/component-catalog.json').entries.reduce((usage, entry) => {
            usage[entry.role] = (usage[entry.role] || 0) + 1;
            return usage;
        }, {})
    ));

    assert.equal(state.validation.ok, true);
    assert.equal(state.components.length, readJson(rootDir, 'language/canonical/components.json').components.length);
    assert.equal(state.components[0].id, 'extension');
    assert.equal(state.localeTemplates.length, localeTemplates.length);
    assert.equal(state.views.categories.records.length, categories.length);
    assert.equal(state.views.roles.records.length, roles.length);
    assert.deepEqual(state.categoryUsage, categoryUsage);
    assert.deepEqual(state.roleUsage, roleUsage);
    assert.equal(state.categoryUsage.application, undefined);
    assert.equal(state.roleUsage.accessibleName, undefined);
    assert.deepEqual(state.localeTemplates[0], localeTemplates[0]);
    assert.deepEqual(state.normalizedWords, [
        { input: 'MyDefrag', output: 'My Defragmenter' },
        { input: 'js', output: 'JavaScript' },
        { input: 'char', output: 'character' },
        { input: 'pos', output: 'position' },
        { input: 'desc', output: 'description' },
        { input: 'prev', output: 'previous' },
        { input: 'Eof', output: 'end of file' },
        { input: 'dbg', output: 'debug' },
        { input: 'kw', output: 'keyword' }
    ]);
    assert.ok(state.migrationInventory.scanFiles.some((entry) => (
        entry.path === 'src/server/parser.js' && entry.component === 'parser'
    )));
    assert.equal(state.validation.catalogOutputs.length, registeredLocales.length);
    assert.ok(state.validation.catalogOutputs.every((locale) => locale.status === 'missing'));
    assert.ok(state.views.catalog.records.every((record) => record.key));
    assert.ok(state.views.catalog.schema.properties.status.enum.includes('draft'));
    assert.deepEqual(fs.readFileSync(catalogPath), before);
    assert.equal(fs.statSync(catalogPath).mtimeMs, beforeTime);
});

test('adds recommended roles and protects roles used by catalog records', async (t) => {
    const rootDir = createFixture(t);
    const service = createService(rootDir);
    const state = service.load();
    const label = state.views.roles.records.find((role) => role.id === 'label');

    let result = service.applyRecord({
        view: 'roles',
        originalIdentity: null,
        record: {
            id: 'callout',
            description: 'Text highlighted as a callout beside primary content.'
        }
    });
    assert.equal(result.ok, true);
    assert.equal(result.state.roleUsage.callout, undefined);
    assert.ok(result.state.views.roles.records.some((role) => role.id === 'callout'));

    result = service.applyRecord({
        view: 'roles',
        originalIdentity: label.id,
        record: { ...label, id: 'renamedLabel' }
    });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => /unknown role label/.test(error.message)));

    const saved = await service.save();
    assert.equal(saved.ok, true);
    assert.deepEqual(saved.authoritativeFiles, ['language/canonical/catalog-roles.json']);
    assert.ok(readJson(rootDir, 'language/canonical/catalog-roles.json').roles
        .some((role) => role.id === 'callout'));
});

test('loads, tracks, and safely saves the generated language report artifact', async (t) => {
    const rootDir = createFixture(t);
    const reportPath = path.join(rootDir, 'build', 'language', 'reports', 'language-report.txt');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, 'Original report\n', 'utf8');
    const service = createService(rootDir);
    service.load();

    const report = service.getLanguageReport();
    assert.equal(report.ok, true);
    assert.equal(report.relativePath, 'build/language/reports/language-report.txt');
    assert.equal(report.text, 'Original report\n');
    assert.equal(report.exists, true);

    let result = service.setLanguageReportDirty(true);
    assert.equal(result.dirty, true);
    assert.equal(service.previewSave().languageReportDirty, true);
    const canonicalSave = await service.save();
    assert.equal(canonicalSave.ok, false);
    assert.equal(canonicalSave.stage, 'language-report-unsaved');

    result = service.saveLanguageReport({ text: 'Changed report\n', originalVersion: 'stale-version' });
    assert.equal(result.ok, false);
    assert.equal(result.stage, 'conflict');
    assert.equal(fs.readFileSync(reportPath, 'utf8'), 'Original report\n');

    result = service.saveLanguageReport({ text: 'Changed report\n', originalVersion: report.version });
    assert.equal(result.ok, true);
    assert.equal(result.dirty, false);
    assert.equal(service.hasChanges(), false);
    assert.equal(fs.readFileSync(reportPath, 'utf8'), 'Changed report\n');

    service.setLanguageReportDirty(true);
    service.revert();
    assert.equal(service.hasChanges(), false);
});

test('adds recommended categories and protects categories used by catalog records', async (t) => {
    const rootDir = createFixture(t);
    const service = createService(rootDir);
    const state = service.load();
    const action = state.views.categories.records.find((category) => category.id === 'action');

    let result = service.applyRecord({
        view: 'categories',
        originalIdentity: null,
        record: {
            id: 'release-note',
            description: 'Release notes and version-specific change summaries.'
        }
    });
    assert.equal(result.ok, true);
    assert.equal(result.state.categoryUsage['release-note'], undefined);
    assert.ok(result.state.views.categories.records.some((category) => category.id === 'release-note'));

    result = service.applyRecord({
        view: 'categories',
        originalIdentity: action.id,
        record: { ...action, id: 'renamed-action' }
    });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => /unknown category action/.test(error.message)));

    const saved = await service.save();
    assert.equal(saved.ok, true);
    assert.deepEqual(saved.authoritativeFiles, ['language/canonical/catalog-categories.json']);
    assert.ok(readJson(rootDir, 'language/canonical/catalog-categories.json').categories
        .some((category) => category.id === 'release-note'));
});

test('reports invalid canonical normalized-word substitutions', (t) => {
    const rootDir = createFixture(t);
    writeJson(rootDir, 'language/canonical/normalized-words.json', [
        { input: 'js', output: 'JavaScript' },
        { input: 'JS', output: 'ECMAScript' }
    ]);

    const state = createService(rootDir).load();

    assert.equal(state.validation.ok, false);
    assert.ok(state.validation.errors.some((error) => /duplicates input JS/.test(error.message)));
});

test('reports invalid canonical locale templates', (t) => {
    const rootDir = createFixture(t);
    const templates = readJson(rootDir, 'language/canonical/language-locales.json');
    templates.locales.push({ ...templates.locales[0], direction: 'sideways' });
    writeJson(rootDir, 'language/canonical/language-locales.json', templates);

    const state = createService(rootDir).load();

    assert.equal(state.validation.ok, false);
    assert.ok(state.validation.errors.some((error) => /invalid direction sideways/.test(error.message)));
    assert.ok(state.validation.errors.some((error) => (
        error.message.includes(`Duplicate locale template id ${templates.locales[0].id}`)
    )));
});

test('reports invalid permanent migration candidate statuses', (t) => {
    const rootDir = createFixture(t);
    const components = readJson(rootDir, 'language/canonical/components.json');
    components.migrationInventory.candidateStatuses = [{
        path: 'src/server/parser.js',
        text: 'Candidate parser message',
        status: 'ignored'
    }];
    writeJson(rootDir, 'language/canonical/components.json', components);

    const state = createService(rootDir).load();

    assert.equal(state.validation.ok, false);
    assert.ok(state.validation.errors.some((error) => /invalid status ignored/.test(error.message)));
});

test('adds, edits, tracks, reverts, and preserves unrelated fields', (t) => {
    const rootDir = createFixture(t);
    const catalog = readJson(rootDir, 'language/canonical/component-catalog.json');
    catalog.entries[0].futureField = 'preserve-me';
    writeJson(rootDir, 'language/canonical/component-catalog.json', catalog);
    const service = createService(rootDir);
    let state = service.load();
    const original = state.views.catalog.records[0];

    let result = service.applyRecord({
        view: 'catalog',
        originalIdentity: original.key,
        record: { key: original.key, text: `${original.text} updated` }
    });
    assert.equal(result.ok, true);
    assert.equal(result.state.dirty, true);
    assert.equal(result.state.views.catalog.records[0].futureField, 'preserve-me');

    result = service.applyRecord({
        view: 'catalog',
        originalIdentity: null,
        record: {
            key: 'tooling.application.testMessage',
            component: 'tooling',
            category: 'application',
            role: 'summary',
            text: 'Test message',
            status: 'draft',
            source: 'src/new-language-source.js',
            sourceLine: 12
        }
    });
    assert.equal(result.ok, true);
    assert.equal(result.state.categoryUsage.application, 1);
    assert.equal(result.state.roleUsage.summary, 1);
    assert.ok(result.state.views.catalog.records.some((entry) => entry.key === 'tooling.application.testMessage'));

    state = service.revert();
    assert.equal(state.dirty, false);
    assert.equal(state.views.catalog.records.length, catalog.entries.length);
    assert.equal(state.views.catalog.records[0].text, original.text);
});

test('rejects invalid schema values, unknown components, duplicate IDs, and placeholder mismatches', (t) => {
    const service = createService(createFixture(t));
    const state = service.load();
    const diagnostic = state.views.diagnostics.records[0];

    let result = service.applyRecord({
        view: 'diagnostics',
        originalIdentity: diagnostic.code,
        record: { ...diagnostic, severity: 'catastrophic' }
    });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.source === 'schema'));

    const catalog = state.views.catalog.records[0];
    result = service.applyRecord({
        view: 'catalog',
        originalIdentity: catalog.key,
        record: { ...catalog, component: 'unknown-component' }
    });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => /unknown component/.test(error.message)));

    result = service.applyRecord({ view: 'catalog', originalIdentity: null, record: catalog });
    assert.equal(result.ok, false);
    assert.match(result.errors[0].message, /Duplicate key/);

    result = service.applyRecord({
        view: 'catalog',
        originalIdentity: catalog.key,
        record: { ...catalog, sourceLine: 0 }
    });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.source === 'schema'));

    result = service.applyRecord({
        view: 'catalog',
        originalIdentity: null,
        record: {
            key: 'tooling.application.placeholderTest',
            component: 'tooling',
            category: 'application',
            role: 'message',
            text: 'Missing {value}',
            placeholders: [],
            status: 'draft'
        }
    });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => /placeholder mismatch/.test(error.message)));
});

test('validates diagnostic references and expected placeholders', (t) => {
    const service = createService(createFixture(t));
    const state = service.load();
    const template = state.views.diagnostics.records[0];

    let result = service.applyRecord({
        view: 'diagnostics',
        originalIdentity: null,
        record: {
            ...template,
            code: 'MYDFRG_TEST_PLACEHOLDER',
            placeholders: []
        }
    });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => /placeholders do not match/.test(error.message)));

    result = service.applyRecord({
        view: 'diagnostics',
        originalIdentity: null,
        record: {
            ...template,
            code: 'MYDFRG_TEST_PLACEHOLDER',
            placeholders: template.placeholders
        }
    });
    assert.equal(result.ok, true);
});

test('changes the preview default and rejects duplicate preview identifiers', (t) => {
    const service = createService(createFixture(t));
    const state = service.load();
    const nextMode = state.views.previewModes.records[1].id;
    let result = service.setPreviewDefault(nextMode);
    assert.equal(result.ok, true);
    assert.equal(result.state.previewDefaultMode, nextMode);

    result = service.applyRecord({
        view: 'previewModes',
        originalIdentity: null,
        record: state.views.previewModes.records[0]
    });
    assert.equal(result.ok, false);
    assert.match(result.errors[0].message, /Duplicate id/);
});

test('adds and edits component definitions while keeping existing identifiers stable', (t) => {
    const service = createService(createFixture(t));
    service.load();

    let result = service.applyComponent({
        originalId: null,
        component: {
            id: 'reports',
            description: 'Generated language reports.',
            runtime: false
        }
    });
    assert.equal(result.ok, true);
    assert.equal(result.state.dirty, true);
    assert.deepEqual(result.state.components.find((component) => component.id === 'reports'), {
        id: 'reports',
        description: 'Generated language reports.',
        runtime: false
    });

    result = service.applyComponent({
        originalId: 'reports',
        component: {
            id: 'reports',
            description: 'Runtime-generated language reports.',
            runtime: true
        }
    });
    assert.equal(result.ok, true);
    assert.equal(result.state.components.find((component) => component.id === 'reports').runtime, true);

    result = service.applyComponent({
        originalId: 'reports',
        component: {
            id: 'renamedReports',
            description: 'Renamed reports.',
            runtime: true
        }
    });
    assert.equal(result.ok, false);
    assert.match(result.errors[0].message, /cannot be renamed/);
});

test('adds and edits locale metadata while keeping required and existing identifiers stable', (t) => {
    const rootDir = createFixture(t);
    const service = createService(rootDir);
    const testLocaleId = 'zz-Test';
    let state = service.load();

    assert.equal(state.locales.length, readJson(rootDir, 'language/locales/locales.json').locales.length);
    assert.deepEqual(state.requiredLocales, ['en']);

    let result = service.applyLocale({
        originalId: null,
        locale: {
            id: testLocaleId,
            englishName: 'Test Language',
            nativeName: 'Test Language',
            direction: 'ltr',
            status: 'native-review-required',
            notes: 'New locale.'
        }
    });
    assert.equal(result.ok, true);
    assert.equal(result.state.dirty, true);
    assert.equal(result.state.locales.find((locale) => locale.id === testLocaleId).nativeName, 'Test Language');

    result = service.applyLocale({
        originalId: testLocaleId,
        locale: {
            id: testLocaleId,
            englishName: 'Test Language',
            nativeName: 'Test Language',
            direction: 'ltr',
            status: 'reviewed',
            notes: ''
        }
    });
    assert.equal(result.ok, true);
    assert.equal(result.state.locales.find((locale) => locale.id === testLocaleId).status, 'reviewed');
    assert.equal('notes' in result.state.locales.find((locale) => locale.id === testLocaleId), false);

    result = service.applyLocale({
        originalId: null,
        locale: {
            id: testLocaleId,
            englishName: 'Duplicate Test Language',
            nativeName: 'Test Language',
            direction: 'ltr',
            status: 'draft'
        }
    });
    assert.equal(result.ok, false);
    assert.match(result.errors[0].message, /Duplicate locale id/);

    result = service.applyLocale({
        originalId: testLocaleId,
        locale: {
            id: 'zz-Test-Renamed',
            englishName: 'Test Language',
            nativeName: 'Test Language',
            direction: 'ltr',
            status: 'reviewed'
        }
    });
    assert.equal(result.ok, false);
    assert.match(result.errors[0].message, /cannot be renamed/);

    result = service.removeLocale('en');
    assert.equal(result.ok, false);
    assert.match(result.errors[0].message, /Required locale en/);

    state = service.revert();
    assert.equal(state.locales.some((locale) => locale.id === testLocaleId), false);
    assert.equal(state.dirty, false);
});

test('locale deletion preserves generated and authored data by default and deletes catalog data only by opt-in', async (t) => {
    const rootDir = createFixture(t);
    const preservedCatalog = path.join(rootDir, 'build', 'language', 'catalogs', 'zh-Hans');
    const removedCatalog = path.join(rootDir, 'build', 'language', 'catalogs', 'fr-CA');
    fs.mkdirSync(preservedCatalog, { recursive: true });
    fs.mkdirSync(removedCatalog, { recursive: true });
    fs.writeFileSync(path.join(preservedCatalog, 'parser.json'), '{"metered":"keep"}\n', 'utf8');
    fs.writeFileSync(path.join(removedCatalog, 'parser.json'), '{"metered":"delete"}\n', 'utf8');
    const service = createService(rootDir);
    service.load();

    let result = service.removeLocale('zh-Hans');
    assert.equal(result.ok, true);
    assert.equal(result.catalogRemovalScheduled, false);
    assert.equal(result.state.pendingCatalogRemovals.length, 0);

    result = service.removeLocale('fr-CA', { removeCatalog: true });
    assert.equal(result.ok, true);
    assert.equal(result.catalogRemovalScheduled, true);
    assert.deepEqual(result.state.pendingCatalogRemovals, ['fr-CA']);
    assert.ok(result.state.validation.warnings.some((warning) => /preserved but inactive/.test(warning.message)));

    const preview = service.previewSave();
    assert.deepEqual(preview.authoritativeFiles, ['language/locales/locales.json']);
    assert.deepEqual(preview.generatedCatalogRemovals, ['build/language/catalogs/fr-CA']);

    const saved = await service.save();
    assert.equal(saved.ok, true);
    assert.deepEqual(saved.catalogsRemoved, ['build/language/catalogs/fr-CA']);
    assert.equal(fs.existsSync(preservedCatalog), true);
    assert.equal(fs.existsSync(removedCatalog), false);
    assert.equal(fs.existsSync(path.join(rootDir, 'language', 'locales', 'zh-Hans')), true);
    assert.equal(fs.existsSync(path.join(rootDir, 'language', 'locales', 'fr-CA')), true);
    const registry = readJson(rootDir, 'language/locales/locales.json').locales;
    assert.equal(registry.some((locale) => locale.id === 'zh-Hans'), false);
    assert.equal(registry.some((locale) => locale.id === 'fr-CA'), false);
});

test('failed locale save restores opt-in catalog removal and locale metadata', async (t) => {
    const rootDir = createFixture(t);
    const catalogDir = path.join(rootDir, 'build', 'language', 'catalogs', 'fr-CA');
    fs.mkdirSync(catalogDir, { recursive: true });
    fs.writeFileSync(path.join(catalogDir, 'parser.json'), '{"metered":"restore"}\n', 'utf8');
    const failedBuild = new StubBuildIntegration({
        ok: false,
        status: 1,
        stdout: '',
        stderr: 'stub failure\n'
    });
    const service = createService(rootDir, failedBuild);
    service.load();
    assert.equal(service.removeLocale('fr-CA', { removeCatalog: true }).ok, true);

    const saved = await service.save();

    assert.equal(saved.ok, false);
    assert.equal(saved.rolledBack, true);
    assert.equal(fs.existsSync(path.join(catalogDir, 'parser.json')), true);
    assert.equal(readJson(rootDir, 'language/locales/locales.json').locales.some(
        (locale) => locale.id === 'fr-CA'
    ), true);
});

test('adds, deduplicates, removes, and saves migration inventory files', async (t) => {
    const rootDir = createFixture(t);
    const newFile = path.join(rootDir, 'src', 'new-language-source.js');
    fs.mkdirSync(path.dirname(newFile), { recursive: true });
    fs.writeFileSync(newFile, "const message = 'Migration candidate';\n", 'utf8');
    const service = createService(rootDir);
    service.load();

    let result = service.addMigrationFiles([newFile, newFile], 'tooling');
    assert.equal(result.ok, true);
    assert.deepEqual(result.addedFiles, ['src/new-language-source.js']);
    assert.equal(result.state.dirty, true);
    assert.equal(result.state.migrationInventory.scanFiles.filter(
        (file) => file.path === 'src/new-language-source.js'
    ).length, 1);
    assert.equal(result.state.migrationInventory.scanFiles.find(
        (file) => file.path === 'src/new-language-source.js'
    ).component, 'tooling');

    result = service.assignMigrationFileComponent('src/new-language-source.js', 'extension');
    assert.equal(result.ok, true);
    assert.equal(result.state.migrationInventory.scanFiles.find(
        (file) => file.path === 'src/new-language-source.js'
    ).component, 'extension');

    result = service.assignMigrationFileComponent('src/new-language-source.js', 'missingComponent');
    assert.equal(result.ok, false);
    assert.match(result.errors[0].message, /valid component/);

    const saved = await service.save();
    assert.equal(saved.ok, true);
    assert.deepEqual(saved.authoritativeFiles, ['language/canonical/components.json']);
    assert.ok(readJson(rootDir, 'language/canonical/components.json')
        .migrationInventory.scanFiles.some((file) => (
            file.path === 'src/new-language-source.js' && file.component === 'extension'
        )));

    result = service.removeMigrationFile('src/new-language-source.js');
    assert.equal(result.ok, true);
    assert.equal(result.removedFile, 'src/new-language-source.js');
    assert.equal(result.state.migrationInventory.scanFiles.some(
        (file) => file.path === 'src/new-language-source.js'
    ), false);
});

test('scans one repository file without changing inventory and adds it only on request', (t) => {
    const rootDir = createFixture(t);
    const scanFile = path.join(rootDir, 'src', 'scan-before-adding.js');
    fs.mkdirSync(path.dirname(scanFile), { recursive: true });
    fs.writeFileSync(scanFile, [
        'const potential = "Potential scan message";',
        'const existing = "Unexpected token \'{token}\'";'
    ].join('\n'), 'utf8');
    const service = createService(rootDir);
    service.load();

    let result = service.scanMigrationFile(scanFile);
    assert.equal(result.ok, true);
    assert.equal(result.file.path, 'src/scan-before-adding.js');
    assert.equal(result.file.alreadyInInventory, false);
    assert.equal(result.file.extractedCount, 2);
    assert.equal(result.file.candidateCount, 1);
    assert.equal(result.file.candidates[0].text, 'Potential scan message');
    assert.equal(result.file.catalogedStringCount, 1);
    assert.equal(result.file.catalogedStrings[0].catalogEntries[0].key, 'parser.diagnostic.unexpectedToken.message');
    assert.equal(service.hasChanges(), false);

    let target = service.getScannedMigrationSourceTarget(
        result.file.path,
        result.file.candidates[0].line,
        result.file.candidates[0].text
    );
    assert.equal(target.ok, true);
    assert.equal(target.absolutePath, scanFile);
    assert.equal(target.line, 1);
    target = service.getScannedMigrationSourceTarget(result.file.path, 1, 'Changed scan message');
    assert.equal(target.ok, false);
    assert.match(target.error, /no longer a current scanned migration candidate/);

    result = service.addScannedMigrationFile(result.file.path, 'tooling');
    assert.equal(result.ok, true);
    assert.deepEqual(result.addedFiles, ['src/scan-before-adding.js']);
    assert.equal(result.state.dirty, true);

    result = service.scanMigrationFile(scanFile);
    assert.equal(result.file.alreadyInInventory, true);
    assert.equal(result.file.inventoryComponent, 'tooling');

    result = service.addScannedMigrationFile('src/scan-before-adding.js', 'tooling');
    assert.equal(result.ok, true);
    assert.deepEqual(result.addedFiles, []);
});

test('scans a repository folder recursively and bulk-adds only selected candidate-bearing files', (t) => {
    const rootDir = createFixture(t);
    const folder = path.join(rootDir, 'bulk-project');
    const nested = path.join(folder, 'nested');
    const ignored = path.join(folder, 'node_modules', 'dependency');
    fs.mkdirSync(nested, { recursive: true });
    fs.mkdirSync(ignored, { recursive: true });
    fs.writeFileSync(path.join(folder, 'alpha.js'), 'const label = "Bulk alpha message";\n', 'utf8');
    fs.writeFileSync(path.join(nested, 'beta.ts'), 'const label = "Bulk beta message";\n', 'utf8');
    fs.writeFileSync(path.join(nested, 'empty.txt'), 'No quoted strings here.\n', 'utf8');
    fs.writeFileSync(path.join(nested, 'binary.bin'), Buffer.from([0, 1, 2, 3]));
    fs.writeFileSync(path.join(ignored, 'skip.js'), 'const label = "Ignored dependency message";\n', 'utf8');
    const service = createService(rootDir);
    service.load();

    let result = service.scanMigrationFolder(folder);
    assert.equal(result.ok, true);
    assert.equal(result.folder.path, 'bulk-project');
    assert.deepEqual(result.folder.files.map((file) => file.path), [
        'bulk-project/alpha.js',
        'bulk-project/nested/beta.ts'
    ]);
    assert.equal(result.folder.inspectedFileCount, 4);
    assert.equal(result.folder.scannedFileCount, 3);
    assert.equal(result.folder.candidateFileCount, 2);
    assert.equal(result.folder.binaryFileCount, 1);
    assert.equal(result.folder.ignoredDirectoryCount, 1);
    assert.equal(result.folder.truncated, false);
    assert.equal(service.hasChanges(), false);

    result = service.addScannedMigrationFiles(
        result.folder.files.map((file) => file.path),
        'tooling'
    );
    assert.equal(result.ok, true);
    assert.deepEqual(result.addedFiles, [
        'bulk-project/alpha.js',
        'bulk-project/nested/beta.ts'
    ]);
    assert.equal(result.state.dirty, true);
});

test('rejects migration files outside the repository root', (t) => {
    const rootDir = createFixture(t);
    const outsideFile = path.join(path.dirname(rootDir), `outside-${path.basename(rootDir)}.js`);
    fs.writeFileSync(outsideFile, 'outside\n', 'utf8');
    t.after(() => fs.rmSync(outsideFile, { force: true }));
    const service = createService(rootDir);
    service.load();

    const result = service.addMigrationFiles([outsideFile], 'tooling');
    assert.equal(result.ok, false);
    assert.match(result.errors[0].message, /outside the repository root/);
    const scanResult = service.scanMigrationFile(outsideFile);
    assert.equal(scanResult.ok, false);
    assert.match(scanResult.error, /outside the repository root/);
    const folderScanResult = service.scanMigrationFolder(path.dirname(rootDir));
    assert.equal(folderScanResult.ok, false);
    assert.match(folderScanResult.error, /outside the repository root/);
    assert.equal(service.hasChanges(), false);
});

test('loads full-line candidates only for current migration inventory files', (t) => {
    const rootDir = createFixture(t);
    const parserSource = path.join(rootDir, 'src', 'server', 'parser.js');
    fs.mkdirSync(path.dirname(parserSource), { recursive: true });
    fs.writeFileSync(parserSource, "'use strict';\n", 'utf8');
    writeJson(rootDir, 'build/language/reports/migration-report.json', {
        files: [{
            file: 'src/server/parser.js',
            component: 'parser',
            status: 'scanned',
            candidateCount: 1,
            candidates: [{
                line: 42,
                text: 'Candidate parser message',
                fullLine: "    const message = 'Candidate parser message';"
            }],
            catalogedStringCount: 1,
            catalogedStrings: [{
                line: 43,
                text: "Unexpected token '{token}'",
                fullLine: '    const existing = "Unexpected token \'{token}\'";',
                catalogEntries: [{
                    key: 'parser.diagnostic.unexpectedToken.message',
                    component: 'parser',
                    category: 'diagnostic',
                    role: 'message'
                }]
            }]
        }]
    });
    const service = createService(rootDir);
    service.load();

    let result = service.getMigrationCandidates('src/server/parser.js');
    assert.equal(result.ok, true);
    assert.equal(result.file.component, 'parser');
    assert.deepEqual(result.file.candidates[0], {
        line: 42,
        text: 'Candidate parser message',
        fullLine: "    const message = 'Candidate parser message';",
        status: 'potential'
    });
    assert.equal(result.file.catalogedStringCount, 1);
    assert.deepEqual(result.file.catalogedStrings[0].catalogEntries, [{
        key: 'parser.diagnostic.unexpectedToken.message',
        component: 'parser',
        category: 'diagnostic',
        role: 'message'
    }]);
    let summary = service.getMigrationSummary();
    const parserSummary = summary.files.find((file) => file.path === 'src/server/parser.js');
    assert.equal(summary.ok, true);
    assert.equal(parserSummary.candidateCount, 1);
    assert.equal(parserSummary.catalogedStringCount, 1);
    let target = service.getMigrationSourceTarget('src/server/parser.js', 42);
    assert.equal(target.ok, true);
    assert.equal(target.absolutePath, parserSource);
    assert.equal(target.line, 42);

    result = service.suggestCatalogKey({ path: 'src/server/parser.js', line: 42 });
    assert.equal(result.ok, true);
    assert.equal(result.suggestedKey, 'parser.line42');
    assert.equal(result.strategy, 'javascript-context');

    target = service.getMigrationSourceTarget('src/server/parser.js', 41);
    assert.equal(target.ok, false);
    assert.match(target.error, /not a current reported migration string/);

    result = service.suggestCatalogKey({ path: 'src/server/parser.js', line: 41 });
    assert.equal(result.ok, false);
    assert.match(result.error, /not a current migration candidate/);

    result = service.applyRecord({
        view: 'catalog',
        originalIdentity: null,
        record: {
            key: 'parser.candidate.message',
            component: 'parser',
            category: 'diagnostic',
            role: 'message',
            text: 'Candidate parser message',
            status: 'draft',
            source: 'src/server/parser.js',
            sourceLine: 42
        }
    });
    assert.equal(result.ok, true);
    result = service.getMigrationCandidates('src/server/parser.js');
    assert.equal(result.file.candidateCount, 0);
    assert.equal(result.file.catalogedStringCount, 2);
    assert.equal(result.file.catalogedStrings[0].catalogEntries[0].key, 'parser.candidate.message');
    summary = service.getMigrationSummary();
    assert.equal(summary.files.find((file) => file.path === 'src/server/parser.js').candidateCount, 0);
    assert.equal(summary.files.find((file) => file.path === 'src/server/parser.js').catalogedStringCount, 2);

    const addedCatalogRecord = result.file.catalogedStrings[0].catalogEntries[0];
    const editableRecord = service.snapshot().views.catalog.records.find(
        (entry) => entry.key === addedCatalogRecord.key
    );
    result = service.applyRecord({
        view: 'catalog',
        originalIdentity: editableRecord.key,
        record: { ...editableRecord, text: 'Updated candidate parser message' }
    });
    assert.equal(result.ok, true);
    result = service.getMigrationCandidates('src/server/parser.js');
    assert.equal(result.file.candidateCount, 1);
    assert.equal(result.file.catalogedStringCount, 1);
    assert.equal(result.file.candidates[0].text, 'Candidate parser message');
    assert.equal(result.file.candidates[0].status, 'potential');

    result = service.getMigrationCandidates('src/not-in-inventory.js');
    assert.equal(result.ok, false);
    assert.match(result.error, /no longer listed/);

    const report = readJson(rootDir, 'build/language/reports/migration-report.json');
    delete report.files[0].candidates[0].fullLine;
    writeJson(rootDir, 'build/language/reports/migration-report.json', report);
    result = service.getMigrationCandidates('src/server/parser.js');
    assert.equal(result.ok, false);
    assert.match(result.error, /Rebuild/);
});

test('migration report retains potential and catalog-found source strings', (t) => {
    const rootDir = createFixture(t);
    const parserSource = path.join(rootDir, 'src', 'server', 'parser.js');
    fs.mkdirSync(path.dirname(parserSource), { recursive: true });
    fs.writeFileSync(parserSource, [
        'const potential = "Potential parser message";',
        'const existing = "Unexpected token \'{token}\'";'
    ].join('\n'), 'utf8');

    const languageState = loadLanguageState(rootDir);
    languageState.components.migrationInventory.candidateStatuses = [{
        path: 'src/server/parser.js',
        text: 'Potential parser message',
        status: 'review'
    }];
    const report = buildMigrationReport(languageState, rootDir);
    const parserReport = report.files.find((file) => file.file === 'src/server/parser.js');

    assert.equal(parserReport.candidateCount, 1);
    assert.equal(parserReport.candidates[0].text, 'Potential parser message');
    assert.equal(parserReport.candidates[0].status, 'review');
    assert.equal(parserReport.catalogedStringCount, 1);
    assert.equal(parserReport.catalogedStrings[0].text, "Unexpected token '{token}'");
    assert.equal(parserReport.catalogedStrings[0].status, 'in-catalog');
    assert.equal(
        parserReport.catalogedStrings[0].catalogEntries[0].key,
        'parser.diagnostic.unexpectedToken.message'
    );
});

test('migration report does not truncate candidate files at 200 strings', (t) => {
    const rootDir = createFixture(t);
    const relativePath = 'src/many-candidates.js';
    const sourcePath = path.join(rootDir, ...relativePath.split('/'));
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
    fs.writeFileSync(sourcePath, Array.from(
        { length: 205 },
        (_value, index) => `const message${index} = 'Candidate${index}';`
    ).join('\n'), 'utf8');
    const languageState = loadLanguageState(rootDir);
    languageState.components.migrationInventory.scanFiles = [{
        path: relativePath,
        component: 'tooling'
    }];

    const report = buildMigrationReport(languageState, rootDir);

    assert.equal(report.files[0].candidateCount, 205);
    assert.equal(report.files[0].candidates.length, 205);
});

test('persists review and rejected candidate statuses by file and text', async (t) => {
    const rootDir = createFixture(t);
    const relativePath = 'src/server/parser.js';
    const candidateText = 'Candidate parser message';
    const parserSource = path.join(rootDir, ...relativePath.split('/'));
    fs.mkdirSync(path.dirname(parserSource), { recursive: true });
    fs.writeFileSync(parserSource, `const message = '${candidateText}';\n`, 'utf8');
    writeJson(rootDir, 'build/language/reports/migration-report.json', {
        files: [{
            file: relativePath,
            component: 'parser',
            status: 'scanned',
            candidateCount: 1,
            candidates: [{
                line: 1,
                text: candidateText,
                fullLine: `const message = '${candidateText}';`
            }],
            catalogedStringCount: 0,
            catalogedStrings: []
        }]
    });
    const service = createService(rootDir);
    const initialState = service.load();
    const initialStatuses = initialState.migrationInventory.candidateStatuses || [];

    let result = service.setMigrationCandidateStatus({
        path: relativePath,
        text: candidateText,
        status: 'review'
    });
    assert.equal(result.ok, true);
    assert.equal(result.state.dirty, true);
    assert.equal(service.getMigrationCandidates(relativePath).file.candidates[0].status, 'review');

    result = service.setMigrationCandidateStatus({
        path: relativePath,
        text: candidateText,
        status: 'rejected'
    });
    assert.equal(result.ok, true);
    assert.deepEqual(
        result.state.migrationInventory.candidateStatuses.find((entry) => (
            entry.path === relativePath && entry.text === candidateText
        )),
        { path: relativePath, text: candidateText, status: 'rejected' }
    );
    assert.equal(service.setMigrationCandidateStatus({
        path: relativePath,
        text: candidateText,
        status: 'in-catalog'
    }).ok, false);

    const saved = await service.save();
    assert.equal(saved.ok, true);
    assert.deepEqual(saved.authoritativeFiles, ['language/canonical/components.json']);
    assert.deepEqual(
        readJson(rootDir, 'language/canonical/components.json').migrationInventory.candidateStatuses
            .find((entry) => entry.path === relativePath && entry.text === candidateText),
        { path: relativePath, text: candidateText, status: 'rejected' }
    );

    const reloaded = createService(rootDir);
    reloaded.load();
    assert.equal(reloaded.getMigrationCandidates(relativePath).file.candidates[0].status, 'rejected');
    result = reloaded.setMigrationCandidateStatus({
        path: relativePath,
        text: candidateText,
        status: 'potential'
    });
    assert.equal(result.ok, true);
    assert.equal(result.state.migrationInventory.candidateStatuses.some((entry) => (
        entry.path === relativePath && entry.text === candidateText
    )), false);
    assert.ok(initialStatuses.every((initial) => (
        result.state.migrationInventory.candidateStatuses.some((entry) => (
            entry.path === initial.path && entry.text === initial.text && entry.status === initial.status
        ))
    )));
});

test('save writes authoritative data, runs the builder, and produces deterministic formatting', async (t) => {
    const rootDir = createFixture(t);
    const integration = new StubBuildIntegration();
    const service = createService(rootDir, integration);
    const state = service.load();
    const original = state.views.keywords.records[0];
    const result = service.applyRecord({
        view: 'keywords',
        originalIdentity: original.id,
        record: { ...original, description: 'Updated description.' }
    });
    assert.equal(result.ok, true);

    const progress = [];
    const saved = await service.save({}, (update) => progress.push(update));
    assert.equal(saved.ok, true);
    assert.deepEqual(saved.authoritativeFiles, ['language/canonical/semantic-keywords.json']);
    assert.equal(saved.state.dirty, false);
    const content = fs.readFileSync(path.join(rootDir, 'language/canonical/semantic-keywords.json'), 'utf8');
    assert.match(content, /"description": "Updated description\."/);
    assert.ok(content.endsWith('\n'));
    assert.equal(service.repository.serialize(readJson(rootDir, 'language/canonical/semantic-keywords.json')), content);
    assert.deepEqual(integration.runArguments, [['build', '--UseNormalized']]);
    assert.equal(saved.buildMode, 'normalized');
    assert.deepEqual(progress.filter((update) => update.phase !== 'build-output').map((update) => update.phase), [
        'validation',
        'snapshot',
        'write',
        'build',
        'compare',
        'commit'
    ]);
});

test('save passes plain build arguments only with explicit DeepL opt-in', async (t) => {
    const rootDir = createFixture(t);
    const integration = new StubBuildIntegration();
    const service = createService(rootDir, integration);
    const state = service.load();
    const original = state.views.keywords.records[0];
    service.applyRecord({
        view: 'keywords',
        originalIdentity: original.id,
        record: { ...original, description: 'DeepL opt-in build.' }
    });

    const saved = await service.save({ useDeepL: true });

    assert.equal(saved.ok, true);
    assert.equal(saved.buildMode, 'deepl');
    assert.deepEqual(integration.runArguments, [['build']]);
});

test('build failure propagates and restores the prior authoritative source', async (t) => {
    const rootDir = createFixture(t);
    const integration = new StubBuildIntegration({
        ok: false,
        status: 1,
        stdout: '',
        stderr: 'simulated build failure'
    });
    const service = createService(rootDir, integration);
    const file = path.join(rootDir, 'language', 'canonical', 'semantic-keywords.json');
    const before = fs.readFileSync(file);
    const state = service.load();
    const original = state.views.keywords.records[0];
    assert.equal(service.applyRecord({
        view: 'keywords',
        originalIdentity: original.id,
        record: { ...original, description: 'Must roll back.' }
    }).ok, true);

    const saved = await service.save();
    assert.equal(saved.ok, false);
    assert.equal(saved.stage, 'build');
    assert.equal(saved.rolledBack, true);
    assert.equal(integration.restoreCount, 1);
    assert.deepEqual(fs.readFileSync(file), before);
    assert.equal(saved.state.dirty, false);
});

test('rebuild is blocked while edits are unsaved', async (t) => {
    const service = createService(createFixture(t));
    const state = service.load();
    const original = state.views.keywords.records[0];
    service.applyRecord({
        view: 'keywords',
        originalIdentity: original.id,
        record: { ...original, description: 'Unsaved.' }
    });
    const result = await service.rebuild();
    assert.equal(result.ok, false);
    assert.equal(result.stage, 'unsaved');
});
