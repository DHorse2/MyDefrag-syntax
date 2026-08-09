'use strict';

const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const { CHANNELS, EVENTS } = require('../shared/contracts');
const { createSplashWindowOptions, createWindowOptions } = require('../main/window-options');
const { projectRootArgument } = require('../main/project-root');
const { registerIpcHandlers } = require('../main/ipc-handlers');
const {
    catalogKeyWithCategory,
    matchesComponentScope,
    matchesSearch,
    mayLeaveCurrentView,
    nextCandidateIndex,
    previousCandidateIndex
} = require('../renderer/ui-state');

const APP_ROOT = path.resolve(__dirname, '..');

test('renderer window is isolated, sandboxed, and has no Node integration', () => {
    const options = createWindowOptions(APP_ROOT);
    assert.equal(options.webPreferences.nodeIntegration, false);
    assert.equal(options.webPreferences.contextIsolation, true);
    assert.equal(options.webPreferences.sandbox, true);
    assert.equal(options.webPreferences.webviewTag, false);
    assert.equal(options.webPreferences.preload, path.join(APP_ROOT, 'preload', 'preload.js'));
});

test('splash window is isolated and uses local-file content only', () => {
    const options = createSplashWindowOptions();
    assert.equal(options.frame, false);
    assert.equal(options.webPreferences.nodeIntegration, false);
    assert.equal(options.webPreferences.contextIsolation, true);
    assert.equal(options.webPreferences.sandbox, true);
    assert.equal(options.webPreferences.webviewTag, false);

    const html = fs.readFileSync(path.join(APP_ROOT, 'splash', 'index.html'), 'utf8');
    assert.match(html, /Content-Security-Policy/);
    assert.match(html, /script-src 'none'/);
    assert.match(html, /connect-src 'none'/);
    assert.match(html, /Loading project language data/);
});

test('main window stays open while a build or rollback is active', () => {
    const source = fs.readFileSync(path.join(APP_ROOT, 'main', 'main.js'), 'utf8');
    const rendererSource = fs.readFileSync(path.join(APP_ROOT, 'renderer', 'app.js'), 'utf8');
    assert.match(source, /service\?\.isBuildRunning\(\)/);
    assert.match(source, /Use Stop build in the progress window/);
    assert.match(source, /!service\.isBuildRunning\(\) && !service\.hasChanges\(\)/);
    assert.match(source, /buttons: \['Exit without saving', 'Cancel'\]/);
    assert.match(source, /allowClose = true;[\s\S]*?mainWindow\.close\(\)/);
    assert.doesNotMatch(rendererSource, /beforeunload/);
});

test('preload exposes explicit invoke calls and a narrow progress subscription', () => {
    const source = fs.readFileSync(path.join(APP_ROOT, 'preload', 'preload.js'), 'utf8');
    assert.doesNotMatch(source, /ipcRenderer\.send\s*\(/);
    assert.doesNotMatch(source, /ipcRenderer\.sendSync\s*\(/);
    assert.equal((source.match(/ipcRenderer\.on\s*\(/g) || []).length, 1);
    assert.match(source, /ipcRenderer\.removeListener\(EVENTS\.progress, handler\)/);
    assert.doesNotMatch(source, /require\(['"]\.\.?\//);
    for (const channel of Object.values(CHANNELS)) {
        assert.ok(source.includes(`'${channel}'`));
    }
    for (const channel of Object.values(EVENTS)) {
        assert.ok(source.includes(`'${channel}'`));
    }
});

test('HTML includes a restrictive CSP and every required view', () => {
    const html = fs.readFileSync(path.join(APP_ROOT, 'renderer', 'index.html'), 'utf8');
    const packaging = fs.readFileSync(path.join(APP_ROOT, 'electron-builder.yml'), 'utf8');
    assert.match(html, /Content-Security-Policy/);
    assert.match(html, /connect-src 'none'/);
    assert.match(html, /class="header-identity"/);
    assert.match(html, /class="header-controls"/);
    assert.match(html, /id="sidebar-toggle"/);
    assert.match(html, /class="icon-button"/);
    assert.match(html, /aria-label="Hide left panel"/);
    assert.match(html, /aria-controls="sidebar"/);
    assert.match(html, /class="hamburger-line"/);
    assert.match(html, /id="home-button"/);
    assert.match(html, /aria-label="Show Components home"/);
    assert.equal((html.match(/id="home-button"/g) || []).length, 1);
    assert.equal((html.match(/class="topbar"/g) || []).length, 1);
    assert.equal((html.match(/id="sidebar"/g) || []).length, 1);
    assert.match(html, /id="progress-dialog"/);
    assert.match(html, /id="progress-elapsed"/);
    assert.match(html, /id="progress-output"/);
    assert.match(html, /id="cancel-build-button"/);
    assert.match(html, /id="allow-deepl-calls"/);
    assert.match(html, />Allow DeepL calls</);
    assert.equal((html.match(/id="allow-deepl-calls"/g) || []).length, 1);
    assert.match(html, /\.\.\/\.\.\/language\/translation\/text-normalizer\.js/);
    assert.match(html, /\.\.\/\.\.\/shared\/renderer-splitter\.css/);
    assert.match(html, /\.\.\/\.\.\/shared\/renderer-splitter\.js/);
    assert.match(html, /\.\.\/\.\.\/shared\/renderer-table-columns\.css/);
    assert.match(html, /\.\.\/\.\.\/shared\/renderer-table-columns\.js/);
    assert.match(html, /id="workspace-stack"/);
    for (const view of ['main', 'catalog', 'categories', 'roles', 'languageReport', 'diagnostics', 'keywords', 'previewModes', 'migrationInventory', 'locales']) {
        assert.match(html, new RegExp(`data-view="${view}"`));
    }
    const sidebarViewOrder = [
        'main',
        'catalog',
        'diagnostics',
        'migrationInventory',
        'keywords',
        'locales',
        'categories',
        'roles',
        'previewModes',
        'languageReport'
    ];
    let previousViewPosition = -1;
    for (const view of sidebarViewOrder) {
        const position = html.indexOf(`data-view="${view}"`);
        assert.ok(position > previousViewPosition, `${view} should follow the preceding sidebar view`);
        previousViewPosition = position;
    }
    assert.ok(html.indexOf('data-view="locales"') < html.indexOf('class="sidebar-actions"'));
    assert.match(packaging, /build\/language\/translation\/\*\*\/\*/);
    assert.match(packaging, /build\/shared\/renderer-splitter\.js/);
    assert.match(packaging, /build\/shared\/renderer-splitter\.css/);
    assert.match(packaging, /build\/shared\/renderer-table-columns\.js/);
    assert.match(packaging, /build\/shared\/renderer-table-columns\.css/);
});

test('UI navigation warns for dirty state and search includes related catalog text', () => {
    let prompts = 0;
    assert.equal(mayLeaveCurrentView(false, () => { prompts += 1; return false; }), true);
    assert.equal(prompts, 0);
    assert.equal(mayLeaveCurrentView(true, () => { prompts += 1; return false; }), false);
    assert.equal(prompts, 1);
    assert.equal(matchesSearch({ code: 'MYDFRG_TEST' }, 'unexpected', { text: 'Unexpected token' }), true);
    assert.equal(matchesSearch({ component: 'parser' }, 'server'), false);
    assert.equal(matchesComponentScope({ component: 'parser' }, null), true);
    assert.equal(matchesComponentScope({ component: 'server' }, null), true);
    assert.equal(matchesComponentScope({ component: 'parser' }, 'parser'), true);
    assert.equal(matchesComponentScope({ component: 'server' }, 'parser'), false);
});

test('candidate line navigation respects direction, status filters, and duplicate decisions', () => {
    const candidates = [
        { text: 'First', status: 'potential' },
        { text: 'Duplicate', status: 'rejected' },
        { text: 'Duplicate', status: 'rejected' },
        { text: 'Review next', status: 'review' },
        { text: 'Potential next', status: 'potential' }
    ];

    assert.equal(nextCandidateIndex(candidates, 0), 1);
    assert.equal(nextCandidateIndex(candidates, 0, 'potential'), 4);
    assert.equal(nextCandidateIndex(candidates, 0, 'all', 'Duplicate'), 3);
    assert.equal(nextCandidateIndex(candidates, 3, 'review'), -1);
    assert.equal(nextCandidateIndex(null, 0), -1);
    assert.equal(previousCandidateIndex(candidates, 4), 3);
    assert.equal(previousCandidateIndex(candidates, 4, 'potential'), 0);
    assert.equal(previousCandidateIndex(candidates, 3, 'all', 'Duplicate'), 0);
    assert.equal(previousCandidateIndex(candidates, 0), -1);
    assert.equal(previousCandidateIndex(null, 0), -1);
});

test('catalog key suggestions include the currently selected category', () => {
    const base = 'extension.activate.errResult.message';
    assert.equal(catalogKeyWithCategory(base, 'diagnostic'), 'extension.diagnostic.activate.errResult.message');
    assert.equal(catalogKeyWithCategory(base, 'notification'), 'extension.notification.activate.errResult.message');
    assert.equal(catalogKeyWithCategory(base, ''), base);
    assert.equal(catalogKeyWithCategory('', 'diagnostic'), '');
});

test('all-components scope is display-only for component-scoped records', () => {
    const source = fs.readFileSync(path.join(APP_ROOT, 'renderer', 'app.js'), 'utf8');
    assert.match(source, /All components — no component filter/);
    assert.match(source, /addButton\.disabled = true/);
    assert.match(source, /Select a specific component before adding a record/);
    assert.match(source, /control\.value = current \|\| selectedComponent \|\| ''/);
    assert.match(source, /className: 'view-heading data-view-toolbar'/);
    assert.match(source, /className: 'view-title-line'/);
    assert.match(source, /className: 'inline-search'/);
    assert.match(source, /heading\.append\(searchLabel, addButton\)/);
    assert.match(source, /const dataViewListScrollPositions = new Map\(\)/);
    assert.match(source, /className: 'data-view-body'/);
    assert.match(source, /className: 'split-view data-view-split'/);
    assert.match(source, /dataViewListScrollPositions\.get\(scrollKey\)/);
    assert.match(source, /dataViewListScrollPositions\.set\(scrollKey, tableWrap\.scrollTop\)/);
    assert.match(source, /className: 'card data-view-list-card'/);
    assert.match(source, /editor\.classList\.add\('data-view-editor-card'\)/);
    assert.match(source, /sidebarCollapsed = !sidebarCollapsed/);
    assert.doesNotMatch(source, /sidebar\.hidden = sidebarCollapsed/);
    assert.match(source, /sidebar\.classList\.toggle\('is-collapsed', sidebarCollapsed\)/);
    const styles = fs.readFileSync(path.join(APP_ROOT, 'renderer', 'styles.css'), 'utf8');
    assert.match(styles, /\.header-controls \{[\s\S]*?align-items: center;/);
    assert.match(styles, /\.data-view-body \{[^}]*height: calc\(100vh - 8rem\);/);
    assert.match(styles, /\.data-view-list-card \.table-wrap \{[^}]*max-height: none;/);
    assert.match(styles, /\.data-view-editor-card \{[^}]*overflow: auto;/);
    assert.match(styles, /button\.icon-button \{[\s\S]*?width: 2rem;[\s\S]*?height: 2rem;/);
    assert.match(styles, /\.hamburger-line \{[\s\S]*?width: 0\.85rem;/);
    assert.match(styles, /\.sidebar\.is-collapsed \{ display: none; \}/);
    assert.match(styles, /\.sidebar button \{ padding: 0\.42rem 0\.65rem; font-size: 0\.9rem; \}/);
    assert.match(styles, /button\.candidate-status-action \{[\s\S]*?padding: 0\.15rem 0\.35rem;[\s\S]*?font-size: 0\.7rem;/);
    assert.match(styles, /\.language-report-editor \{[\s\S]*?font: 0\.82rem\/1\.4 Consolas/);
    assert.match(styles, /\.migration-file-identity \{ display: flex;[\s\S]*?white-space: nowrap;/);
    assert.match(styles, /\.migration-file-list code \{[\s\S]*?text-overflow: ellipsis;[\s\S]*?white-space: nowrap;/);
    assert.match(styles, /\.migration-file-actions button, \.migration-file-actions select \{[\s\S]*?padding: 0\.22rem 0\.42rem;[\s\S]*?font-size: 0\.78rem;[\s\S]*?line-height: 1;/);
    assert.match(styles, /\.migration-file-actions select \{ width: 7rem; min-width: 0; max-width: 7rem; \}/);
    assert.match(source, /element\('code', \{ text: file\.path, title: file\.path \}\)/);
    assert.doesNotMatch(styles, /\.sidebar-actions \{[^}]*margin-top: auto;/);
    assert.match(styles, /\.sidebar-actions \{[^}]*margin-top: 0\.35rem;/);
    assert.match(styles, /\.topbar \{\s*position: sticky;/);
    assert.match(source, /sidebar-toggle/);
    assert.match(source, /homeButton\.addEventListener\('click', \(\) => changeView\('main'\)\)/);
    assert.match(source, /Show left panel/);
    assert.match(source, /Hide left panel/);
    for (const [label, view] of [
        ['Component Catalog', 'catalog'],
        ['Categories', 'categories'],
        ['Roles', 'roles'],
        ['Language Report', 'languageReport'],
        ['Diagnostic Messages', 'diagnostics'],
        ['Semantic Keywords', 'keywords'],
        ['Preview Modes', 'previewModes'],
        ['Migration Inventory', 'migrationInventory'],
        ['Locales', 'locales']
    ]) {
        assert.ok(source.includes(`['${label}', '${view}']`));
    }
    assert.doesNotMatch(source, /Open component catalog|Open diagnostic messages|Open semantic keywords|Open preview modes|Edit migration inventory/);
    assert.match(source, /text: 'View'/);
    assert.match(source, /className: 'migration-file-actions' \}, \[assignment, candidatesButton, removeButton\]/);
    assert.match(source, /title: 'Component Catalog Add Record'/);
    assert.match(source, /view === 'catalog' && fieldName === 'category'/);
    assert.match(source, /\['Existing Categories', \(category\) => state\.categoryUsage\[category\.id\] > 0\]/);
    assert.match(source, /\['Recommended Categories', \(category\) => !state\.categoryUsage\[category\.id\]\]/);
    assert.match(source, /view === 'catalog' && fieldName === 'role'/);
    assert.match(source, /\['Existing Roles', \(role\) => state\.roleUsage\[role\.id\] > 0\]/);
    assert.match(source, /\['Recommended Roles', \(role\) => !state\.roleUsage\[role\.id\]\]/);
    assert.match(source, /view === 'roles' \? 'Add role'/);
    assert.match(source, /categories: \['id', 'classification', 'description'\]/);
    assert.match(source, /roles: \['id', 'classification', 'description'\]/);
    assert.match(source, /else if \(currentView === 'languageReport'\) \{ renderLanguageReportView\(\); \}/);
    assert.match(source, /text: 'Save report artifact'/);
    assert.match(source, /Generated artifact: manual edits can be overwritten/);
    assert.match(source, /api\.saveLanguageReport/);
    assert.match(source, /api\.setLanguageReportDirty/);
    assert.match(source, /body\.replaceChild\(nextEditor, localeEditor\)/);
    assert.match(source, /split\.replaceChild\(nextEditor, editorCard\)/);
    assert.match(source, /row\.classList\.toggle\('selected', row === selectedRow\)/);
    assert.doesNotMatch(source, /editingLocaleId = locale\.id;\s*renderLocalesView\(\)/);
    assert.doesNotMatch(source, /editingIdentity = record\[identityKey\];\s*render\(\)/);
    assert.match(source, /actionsAtTop: true/);
    assert.match(source, /options\.actionsAtTop \? 'form-actions form-actions-top' : 'form-actions'/);
    assert.match(source, /function createResizableDialogControls\(dialog, windowLabel\)/);
    assert.match(source, /createResizableDialogControls\(dialog, 'migration candidates window'\)/);
    assert.match(source, /createResizableDialogControls\(dialog, 'scan file window'\)/);
    assert.match(source, /key: 'language-all-candidates'/);
    assert.match(source, /key: `language-data-\$\{view\}`/);
    assert.match(source, /key: 'language-locales'/);
    assert.match(source, /key: 'language-results'/);
    assert.match(source, /key: 'language-locales-registry'/);
    assert.match(source, /key: `language-data-\$\{view\}`/);
    assert.equal((source.match(/tableColumns\.attach\(/g) || []).length, 2);
    assert.match(source, /resultDock\.setEnabled\(true\)/);
    assert.match(source, /resultDock\.setEnabled\(false\)/);
    assert.match(source, /dialog\.classList\.toggle\('is-minimized'\)/);
    assert.match(source, /dialog\.classList\.toggle\('is-maximized'\)/);
    assert.match(source, /dialog\.showModal\(\)/);
    assert.match(source, /sourceLine: candidate\.line/);
    assert.match(source, /candidate\.fullLine/);
    assert.match(source, /text: 'All Candidates'/);
    for (const label of ['In Catalog', 'Potential Candidate', 'Rejected', 'Review']) {
        assert.ok(source.includes(`'${label}'`));
    }
    assert.match(source, /const CANDIDATE_STATUS_LABELS = Object\.freeze/);
    assert.match(source, /'aria-label': 'Filter candidates by status'/);
    assert.match(source, /text: 'All statuses'/);
    assert.match(source, /text: 'Filter status'/);
    assert.match(source, /'aria-label': 'Candidate status'/);
    assert.match(source, /text: 'Reject'/);
    assert.match(source, /text: 'Next \(line\)'/);
    assert.match(source, /text: 'Previous \(line\)'/);
    assert.match(source, /previousLineButton\.addEventListener\('click', \(\) => selectPreviousCandidate\(candidate\)\)/);
    assert.match(source, /nextLineButton\.addEventListener\('click', \(\) => selectNextCandidate\(candidate\)\)/);
    assert.match(source, /className: 'candidate-status-actions'/);
    assert.match(source, /className: 'candidate-editor-heading-actions'/);
    assert.match(source, /className: 'candidate-editor-heading'/);
    assert.match(source, /headingRow\.append\(editorHeading, headingActions\)/);
    assert.match(source, /className: 'candidate-status-actions' \}, \[\s*rejectButton\s*\]\)/);
    assert.match(source, /api\.setMigrationCandidateStatus/);
    assert.match(source, /if \(fieldSchema\.enum\) \{\s*control = element\('select'/);
    assert.match(source, /selectCatalogedCandidate/);
    assert.match(source, /text: 'Catalog Matches'/);
    assert.match(source, /text: 'Edit Record'/);
    assert.match(source, /title: 'Component Catalog Edit Record'/);
    assert.match(source, /clearText: 'Back to catalog matches'/);
    assert.match(source, /api\.getMigrationCandidates\(file\.path\)/);
    assert.match(source, /text: 'Refreshing catalog matches\.\.\.'/);
    assert.match(source, /candidate\.catalogEntries\.some\(\(entry\) => entry\.key === nextRecord\.key\)/);
    assert.match(source, /className: 'catalog-match-summary'/);
    assert.match(source, /className: 'catalog-match-actions'/);
    assert.match(source, /className: 'catalog-match-header'/);
    assert.match(source, /nextLineButton\.addEventListener\('click', \(\) => selectNextCandidate\(candidate\)\)/);
    assert.match(styles, /\.catalog-match-edit-row \{[^}]*grid-template-columns: minmax\(0, 1fr\) auto;/);
    assert.match(styles, /\.catalog-match-header \{[^}]*grid-template-columns: minmax\(0, 1fr\) auto;/);
    assert.match(styles, /\.catalog-match-summary h3, \.catalog-match-summary p \{[^}]*margin: 0;/);
    assert.match(styles, /\.catalog-match-actions \{[^}]*display: grid;[^}]*justify-content: flex-end;/);
    assert.match(styles, /\.catalog-match-previous \{[^}]*grid-area: 1 \/ 2;/);
    assert.match(styles, /\.catalog-match-next \{[^}]*grid-area: 2 \/ 2;/);
    assert.match(styles, /\.catalog-match-actions button \{[^}]*font-size: 0\.7rem;/);
    assert.match(source, /file\.catalogedStrings/);
    assert.match(source, /className: 'catalog-match-keys'/);
    assert.match(source, /className: 'candidate-summary-line'/);
    assert.match(source, /className: `candidate-source-line\$\{inCatalog \? ' has-catalog' : ''\}`/);
    assert.match(styles, /\.candidate-summary-line \{[^}]*grid-template-columns: auto auto minmax\(0, 1fr\);/);
    assert.match(styles, /\.candidate-source-line\.has-catalog \{[^}]*grid-template-columns: minmax\(9rem, 14rem\) minmax\(0, 1fr\);/);
    assert.match(styles, /\.catalog-match-keys \{[^}]*text-align: left;/);
    assert.match(source, /api\.getMigrationSummary\(\)/);
    assert.match(source, /non-catalog · \$\{file\.catalogedStringCount\} found in catalog/);
    assert.match(source, /text: 'Scan file…'/);
    assert.match(source, /api\.scanMigrationFile\(\)/);
    assert.match(source, /text: 'Scan folder…'/);
    assert.match(source, /api\.scanMigrationFolder\(\)/);
    assert.match(source, /api\.addScannedMigrationFiles/);
    assert.match(source, /text: 'Select all new'/);
    assert.match(source, /text: 'Add to source files'/);
    assert.match(source, /api\.addScannedMigrationFile/);
    assert.match(source, /function allMigrationCandidates\(file\)/);
    assert.match(source, /function migrationCandidateContent\(candidate\)/);
    assert.match(source, /function createOpenMigrationSourceButton\(filePath, candidate, openRequest\)/);
    assert.match(source, /api\.openScannedMigrationSource/);
    assert.match(source, /api\.suggestCatalogKey/);
    assert.match(source, /text: 'Suggested key'/);
    assert.match(source, /text: 'Use suggested key'/);
    assert.match(source, /uiState\.catalogKeyWithCategory/);
    assert.match(source, /controls\.get\('category'\)\?\.addEventListener\('change', updateSuggestedKey\)/);
    assert.match(source, /request !== selectionRequest/);
    assert.match(source, /text: 'Open source'/);
    assert.match(source, /api\.openMigrationSource/);
    assert.match(source, /text: 'Normalized text'/);
    assert.match(source, /text: 'Apply normalized text'/);
    assert.match(source, /textNormalizer\.normalizeText/);
    assert.match(source, /api\?\.onProgress\?\.\(handleProgress\)/);
    assert.match(source, /api\.cancelBuild\(\)/);
    assert.match(source, /runProgressOperation\('save'/);
    assert.match(source, /runProgressOperation\('rebuild'/);
    assert.match(source, /'revert',\s*'Reverting language data'/);
    assert.match(source, /await waitForUiPaint\(\)/);
    assert.match(source, /const revertedState = await api\.revert\(\)/);
    assert.match(source, /let allowDeepLApiCalls = false/);
    assert.match(source, /const deepLCheckbox = document\.getElementById\('allow-deepl-calls'\)/);
    assert.match(source, /deepLCheckbox\.addEventListener\('change'/);
    assert.doesNotMatch(source, /Allow usage-based DeepL API calls/);
    assert.match(source, /useDeepL: allowDeepLApiCalls/);
    assert.match(source, /result\.build \|\| \(\(result\.stdout \|\| result\.stderr\)/);
    assert.match(source, /function renderLocalesView\(\)/);
    assert.match(source, /api\.applyLocale/);
    assert.match(source, /api\.deleteLocale/);
    assert.match(source, /state\.localeTemplates/);
    assert.match(source, /Locale template/);
    assert.match(source, /language\/canonical\/language-locales\.json/);
    assert.match(source, /already registered/);
    assert.match(source, /controls\.id\.value = template\.id/);
    assert.match(source, /controls\.nativeName\.value = template\.nativeName/);
    assert.match(source, /disabled: isNew && availableTemplates\.length === 0/);
    assert.match(source, /Generated catalog .* will be preserved/);
    assert.match(source, /progress\.command/);
    const buildIntegration = fs.readFileSync(path.join(APP_ROOT, 'services', 'build-integration.js'), 'utf8');
    assert.doesNotMatch(buildIntegration, /spawnSync/);
    assert.match(buildIntegration, /ELECTRON_RUN_AS_NODE: '1'/);
    assert.match(styles, /\.suggested-key-field \{/);
    assert.match(styles, /\.candidate-dialog \{[^}]*resize: both;/);
    assert.match(styles, /\.candidate-dialog\.is-minimized \{[^}]*height: 5rem !important;/);
    assert.match(styles, /\.candidate-dialog\.is-maximized \{/);
    assert.match(styles, /\.candidate-editor-host \.form-actions-top \{[^}]*position: sticky;/);
    assert.match(styles, /\.candidate-editor-heading \{[^}]*align-items: flex-start;[^}]*justify-content: space-between;/);
    assert.match(styles, /\.candidate-editor-heading-actions \{[^}]*display: grid;[^}]*gap: 0\.18rem;/);
    assert.match(styles, /\.candidate-editor-heading-actions button \{[^}]*min-width: 4\.5rem;/);
    assert.match(styles, /\.progress-dialog \{/);
    assert.match(styles, /\.header-deepl-toggle \{/);
    assert.match(styles, /\.workspace-stack\[data-split-enabled="true"\]/);
    assert.doesNotMatch(styles, /\.result-panel \{ position: fixed;/);
});

test('project-root command-line parsing supports both documented forms', () => {
    assert.equal(projectRootArgument(['app', '--project-root=D:\\Repo']), 'D:\\Repo');
    assert.equal(projectRootArgument(['app', '--project-root', 'D:\\Repo']), 'D:\\Repo');
    assert.equal(projectRootArgument(['app']), null);
});

test('IPC registration uses the explicit channel inventory and exit delegates to main close protection', async () => {
    const handlers = new Map();
    const ipcMain = { handle: (channel, handler) => handlers.set(channel, handler) };
    let closed = 0;
    let chooserOptions;
    const messageBoxes = [];
    const progressEvents = [];
    const service = {
        rootDir: 'D:\\Repo',
        load: () => ({ loaded: true }),
        applyRecord: () => ({ ok: true }),
        applyComponent: () => ({ ok: true }),
        applyLocale: (request) => ({ ok: true, request }),
        removeLocale: (localeId, options) => ({ ok: true, localeId, options }),
        setPreviewDefault: () => ({ ok: true }),
        addMigrationFiles: (filePaths, componentId) => ({ ok: true, addedFiles: filePaths, componentId }),
        scanMigrationFile: (filePath) => ({ ok: true, file: { path: filePath } }),
        scanMigrationFolder: (folderPath) => ({ ok: true, folder: { path: folderPath } }),
        addScannedMigrationFile: (relativePath, componentId) => ({
            ok: true,
            addedFiles: [relativePath],
            componentId
        }),
        addScannedMigrationFiles: (relativePaths, componentId) => ({
            ok: true,
            addedFiles: relativePaths,
            componentId
        }),
        getMigrationSummary: () => ({ ok: true, files: [] }),
        getMigrationCandidates: (relativePath) => ({ ok: true, relativePath }),
        suggestCatalogKey: (request) => ({ ok: true, suggestedKey: 'server.activate.err.message', request }),
        getLanguageReport: () => ({ ok: true, text: 'Report text', version: 'v1' }),
        setLanguageReportDirty: (dirty) => ({ ok: true, dirty }),
        saveLanguageReport: (request) => ({ ok: true, request }),
        getMigrationSourceTarget: (relativePath, line) => ({ ok: true, relativePath, line }),
        getScannedMigrationSourceTarget: (relativePath, line, text) => ({
            ok: true,
            relativePath,
            line,
            text
        }),
        assignMigrationFileComponent: (relativePath, componentId) => ({ ok: true, relativePath, componentId }),
        removeMigrationFile: (relativePath) => ({ ok: true, removedFile: relativePath }),
        revert: () => ({}),
        validate: () => ({ ok: true, errors: [], warnings: [] }),
        previewSave: () => ({ authoritativeFiles: [] }),
        save: (request, progress) => {
            assert.deepEqual(request, { useDeepL: true });
            progress({ phase: 'build', message: 'Building', cancellable: true });
            return { ok: true };
        },
        rebuild: (request, progress) => {
            assert.deepEqual(request, { useDeepL: false });
            progress({ phase: 'snapshot', message: 'Snapshotting', cancellable: false });
            return { ok: true };
        },
        cancelBuild: () => ({ ok: true, cancelled: true }),
        reload: () => ({}),
        hasChanges: () => false
    };
    registerIpcHandlers({
        ipcMain,
        dialog: {
            showMessageBox: async (_window, options) => {
                messageBoxes.push(options);
                return { response: 1 };
            },
            showOpenDialog: async (_window, options) => {
                chooserOptions = options;
                return {
                    canceled: false,
                    filePaths: options.properties.includes('openDirectory')
                        ? ['D:\\Repo\\new-project']
                        : ['D:\\Repo\\src\\new.js']
                };
            }
        },
        service,
        openSource: async (target) => ({ ok: true, mode: 'line', target }),
        getWindow: () => null,
        closeApplication: async () => { closed += 1; }
    });

    assert.deepEqual(Array.from(handlers.keys()).sort(), Object.values(CHANNELS).sort());
    assert.deepEqual(await handlers.get(CHANNELS.load)({}), { loaded: true });
    assert.deepEqual(await handlers.get(CHANNELS.applyLocale)({}, { locale: { id: 'de' } }), {
        ok: true,
        request: { locale: { id: 'de' } }
    });
    assert.deepEqual(await handlers.get(CHANNELS.deleteLocale)({}, 'de'), {
        ok: true,
        localeId: 'de',
        options: { removeCatalog: true }
    });
    assert.deepEqual(messageBoxes[0].buttons, [
        'Keep catalog (recommended)',
        'Delete catalog on Save',
        'Cancel'
    ]);
    assert.equal(messageBoxes[0].defaultId, 0);
    assert.equal(messageBoxes[0].cancelId, 2);
    assert.deepEqual(await handlers.get(CHANNELS.chooseMigrationFiles)({}, { componentId: 'parser' }), {
        ok: true,
        addedFiles: ['D:\\Repo\\src\\new.js'],
        componentId: 'parser'
    });
    assert.deepEqual(chooserOptions.properties, ['openFile', 'multiSelections']);
    assert.equal(chooserOptions.defaultPath, 'D:\\Repo');
    assert.deepEqual(await handlers.get(CHANNELS.scanMigrationFile)({}), {
        ok: true,
        file: { path: 'D:\\Repo\\src\\new.js' }
    });
    assert.deepEqual(chooserOptions.properties, ['openFile']);
    assert.equal(chooserOptions.buttonLabel, 'Scan file');
    assert.equal(chooserOptions.defaultPath, 'D:\\Repo\\src');
    assert.deepEqual(await handlers.get(CHANNELS.scanMigrationFolder)({}), {
        ok: true,
        folder: { path: 'D:\\Repo\\new-project' }
    });
    assert.deepEqual(chooserOptions.properties, ['openDirectory']);
    assert.equal(chooserOptions.buttonLabel, 'Scan folder');
    assert.equal(chooserOptions.defaultPath, 'D:\\Repo\\src');
    assert.deepEqual(await handlers.get(CHANNELS.addScannedMigrationFile)({}, {
        path: 'src/new.js',
        componentId: 'parser'
    }), {
        ok: true,
        addedFiles: ['src/new.js'],
        componentId: 'parser'
    });
    assert.deepEqual(await handlers.get(CHANNELS.addScannedMigrationFiles)({}, {
        paths: ['src/new.js', 'src/other.js'],
        componentId: 'parser'
    }), {
        ok: true,
        addedFiles: ['src/new.js', 'src/other.js'],
        componentId: 'parser'
    });
    assert.deepEqual(await handlers.get(CHANNELS.removeMigrationFile)({}, 'src/new.js'), {
        ok: true,
        removedFile: 'src/new.js'
    });
    assert.deepEqual(await handlers.get(CHANNELS.getMigrationCandidates)({}, 'src/new.js'), {
        ok: true,
        relativePath: 'src/new.js'
    });
    assert.deepEqual(await handlers.get(CHANNELS.getMigrationSummary)({}), { ok: true, files: [] });
    assert.deepEqual(await handlers.get(CHANNELS.suggestCatalogKey)({}, {
        path: 'src/new.js',
        line: 23
    }), {
        ok: true,
        suggestedKey: 'server.activate.err.message',
        request: {
            path: 'src/new.js',
            line: 23
        }
    });
    assert.deepEqual(await handlers.get(CHANNELS.getLanguageReport)({}), {
        ok: true,
        text: 'Report text',
        version: 'v1'
    });
    assert.deepEqual(await handlers.get(CHANNELS.setLanguageReportDirty)({}, true), { ok: true, dirty: true });
    assert.deepEqual(await handlers.get(CHANNELS.saveLanguageReport)({}, {
        text: 'Edited report',
        originalVersion: 'v1'
    }), {
        ok: true,
        request: { text: 'Edited report', originalVersion: 'v1' }
    });
    assert.deepEqual(await handlers.get(CHANNELS.openMigrationSource)({}, {
        path: 'src/new.js',
        line: 23
    }), {
        ok: true,
        mode: 'line',
        target: {
            ok: true,
            relativePath: 'src/new.js',
            line: 23
        }
    });
    assert.deepEqual(await handlers.get(CHANNELS.openScannedMigrationSource)({}, {
        path: 'src/scanned.js',
        line: 17,
        text: 'Scanned source message'
    }), {
        ok: true,
        mode: 'line',
        target: {
            ok: true,
            relativePath: 'src/scanned.js',
            line: 17,
            text: 'Scanned source message'
        }
    });
    assert.deepEqual(await handlers.get(CHANNELS.assignMigrationFileComponent)({}, {
        path: 'src/new.js',
        componentId: 'server'
    }), {
        ok: true,
        relativePath: 'src/new.js',
        componentId: 'server'
    });
    assert.deepEqual(await handlers.get(CHANNELS.cancelBuild)({}), { ok: true, cancelled: true });
    const progressEvent = {
        sender: {
            isDestroyed: () => false,
            send: (channel, payload) => progressEvents.push({ channel, payload })
        }
    };
    assert.deepEqual(await handlers.get(CHANNELS.save)(progressEvent, { useDeepL: true }), { ok: true });
    assert.deepEqual(await handlers.get(CHANNELS.rebuild)(progressEvent, { useDeepL: false }), { ok: true });
    assert.deepEqual(progressEvents, [{
        channel: EVENTS.progress,
        payload: { operation: 'save', phase: 'build', message: 'Building', cancellable: true }
    }, {
        channel: EVENTS.progress,
        payload: { operation: 'rebuild', phase: 'snapshot', message: 'Snapshotting', cancellable: false }
    }]);
    assert.deepEqual(await handlers.get(CHANNELS.exit)({}), { ok: true });
    assert.equal(closed, 1);
});
