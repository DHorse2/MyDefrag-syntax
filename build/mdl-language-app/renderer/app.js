'use strict';

const api = window.languageMaintenance;
const uiState = window.LanguageUiState;
const textNormalizer = window.LanguageTextNormalizer;
const splitter = window.MdlSplitter;
const tableColumns = window.MdlTableColumns;
const workspace = document.getElementById('workspace');
const workspaceStack = document.getElementById('workspace-stack');
const shell = document.querySelector('.shell');
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const homeButton = document.getElementById('home-button');
const deepLCheckbox = document.getElementById('allow-deepl-calls');
const dirtyBadge = document.getElementById('dirty-badge');
const validationBadge = document.getElementById('validation-badge');
const resultPanel = document.getElementById('result-panel');
const resultContent = document.getElementById('result-content');
const progressDialog = document.getElementById('progress-dialog');
const progressTitle = document.getElementById('progress-title');
const progressStatus = document.getElementById('progress-status');
const progressElapsed = document.getElementById('progress-elapsed');
const progressOutput = document.getElementById('progress-output');
const cancelBuildButton = document.getElementById('cancel-build-button');
const ALL_COMPONENTS_VALUE = '__all_components__';
const MAX_PROGRESS_OUTPUT_LENGTH = 200000;

let state = null;
let currentView = 'main';
let selectedComponent = null;
let componentEditorMode = null;
let editingIdentity = null;
let editingLocaleId = null;
let searchQuery = '';
let sidebarCollapsed = false;
let languageReportState = null;
let languageReportLoading = false;
let languageReportDirtyRequest = 0;
let activeOperation = null;
let progressStartedAt = 0;
let progressTimer = null;
let lastProgressMessage = '';
let allowDeepLApiCalls = false;
let migrationSummaryRequest = 0;
const dataViewListScrollPositions = new Map();
const resultDock = splitter.attach(workspaceStack, {
    key: 'language-results',
    orientation: 'rows',
    firstPane: workspace,
    secondPane: resultPanel,
    minimumStart: 260,
    minimumEnd: 140,
    defaultFraction: 0.7,
    label: 'Resize workspace and operation results'
});
resultDock.setEnabled(false);

function element(tag, options = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(options)) {
        if (key === 'className') { node.className = value; }
        else if (key === 'text') { node.textContent = value; }
        else if (key === 'dataset') { Object.assign(node.dataset, value); }
        else if (key === 'checked') { node.checked = value; }
        else if (key === 'value') { node.value = value; }
        else if (key === 'disabled') { node.disabled = value; }
        else { node.setAttribute(key, value); }
    }
    for (const child of children) {
        node.append(child);
    }
    return node;
}

function clear(node) {
    while (node.firstChild) { node.firstChild.remove(); }
}

function updateStatus() {
    dirtyBadge.textContent = state.dirty ? 'Unsaved changes' : 'No unsaved changes';
    dirtyBadge.className = `badge ${state.dirty ? 'dirty' : 'clean'}`;
    const validation = state.validation;
    validationBadge.textContent = validation.ok
        ? `Valid (${validation.warnings.length} warning(s))`
        : `Invalid (${validation.errors.length} error(s))`;
    validationBadge.className = `badge ${validation.ok ? 'valid' : 'invalid'}`;
    document.getElementById('project-root').textContent = state.projectRoot;
    for (const button of document.querySelectorAll('.nav-button')) {
        button.classList.toggle('active', button.dataset.view === currentView);
    }
}

function updateSidebarVisibility() {
    shell.classList.toggle('sidebar-collapsed', sidebarCollapsed);
    sidebar.classList.toggle('is-collapsed', sidebarCollapsed);
    sidebar.setAttribute('aria-hidden', sidebarCollapsed ? 'true' : 'false');
    const label = sidebarCollapsed ? 'Show left panel' : 'Hide left panel';
    sidebarToggle.setAttribute('aria-label', label);
    sidebarToggle.title = label;
    sidebarToggle.setAttribute('aria-expanded', sidebarCollapsed ? 'false' : 'true');
}

function formatElapsed(milliseconds) {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
}

function updateElapsedTime() {
    progressElapsed.textContent = formatElapsed(Date.now() - progressStartedAt);
}

function appendProgressOutput(output) {
    const combined = `${progressOutput.textContent}${output}`;
    progressOutput.textContent = combined.slice(-MAX_PROGRESS_OUTPUT_LENGTH);
    progressOutput.scrollTop = progressOutput.scrollHeight;
}

function setProgressStatus(message, { log = true } = {}) {
    progressStatus.textContent = message;
    if (log && message !== lastProgressMessage) {
        appendProgressOutput(`[${formatElapsed(Date.now() - progressStartedAt)}] ${message}\n`);
        lastProgressMessage = message;
    }
}

function beginProgress(operation, title, message) {
    activeOperation = operation;
    progressStartedAt = Date.now();
    lastProgressMessage = '';
    progressTitle.textContent = title;
    progressOutput.textContent = '';
    cancelBuildButton.disabled = true;
    updateElapsedTime();
    setProgressStatus(message);
    progressTimer = window.setInterval(updateElapsedTime, 1000);
    progressDialog.showModal();
}

function endProgress() {
    if (progressTimer !== null) {
        window.clearInterval(progressTimer);
        progressTimer = null;
    }
    activeOperation = null;
    cancelBuildButton.disabled = true;
    if (progressDialog.open) { progressDialog.close(); }
}

function handleProgress(progress) {
    if (!activeOperation || progress?.operation !== activeOperation) { return; }
    cancelBuildButton.disabled = progress.cancellable !== true;
    if (progress.command) { appendProgressOutput(`> ${progress.command}\n`); }
    if (progress.output) {
        appendProgressOutput(progress.output);
    } else if (progress.message) {
        setProgressStatus(progress.message);
    }
}

async function runProgressOperation(operation, title, initialMessage, action) {
    beginProgress(operation, title, initialMessage);
    try {
        return await action();
    } catch (error) {
        return {
            title: `${title} failed`,
            result: { ok: false, stage: 'application', error: error.message }
        };
    } finally {
        endProgress();
    }
}

function waitForUiPaint() {
    return new Promise((resolve) => {
        window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
    });
}

function showResult(title, result) {
    clear(resultContent);
    resultContent.append(element('h3', { text: title }));
    if (result.error) {
        resultContent.append(element('p', { text: result.error }));
    }
    if (result.message) {
        resultContent.append(element('p', { text: result.message }));
    }
    if (result.validation) {
        appendValidation(resultContent, result.validation);
    }
    if (result.authoritativeFiles?.length) {
        appendFiles(resultContent, 'Authoritative files', result.authoritativeFiles);
    }
    if (result.inventoryFiles?.length) {
        appendFiles(resultContent, 'Migration inventory entries', result.inventoryFiles);
    }
    if (result.generatedFiles?.length) {
        appendFiles(resultContent, 'Generated files', result.generatedFiles);
    }
    if (result.generatedCatalogRemovals?.length) {
        appendFiles(resultContent, 'Generated catalogs scheduled for deletion', result.generatedCatalogRemovals);
    }
    if (result.catalogsRemoved?.length) {
        appendFiles(resultContent, 'Generated catalogs deleted', result.catalogsRemoved);
    }
    if (result.recoveryFiles?.length) {
        appendFiles(resultContent, 'Recovery files retained', result.recoveryFiles);
    }
    if (result.changedFiles?.length) {
        appendFiles(resultContent, 'Generated files changed', result.changedFiles);
    }
    const buildResult = result.build || ((result.stdout || result.stderr) ? result : null);
    if (buildResult) {
        const output = `${buildResult.stdout || ''}${buildResult.stderr || ''}`.trim();
        if (output) { resultContent.append(element('pre', { text: output })); }
    }
    resultPanel.hidden = false;
    resultDock.setEnabled(true);
}

function appendFiles(parent, heading, files) {
    parent.append(element('h4', { text: heading }));
    const list = element('ul', { className: 'file-list' });
    for (const file of files) { list.append(element('li', { text: file })); }
    parent.append(list);
}

function appendValidation(parent, validation) {
    const summary = validation.ok
        ? `Validation passed with ${validation.warnings.length} warning(s).`
        : `Validation failed with ${validation.errors.length} error(s).`;
    parent.append(element('p', { text: summary }));
    for (const [kind, items] of [['error', validation.errors], ['warning', validation.warnings]]) {
        if (!items.length) { continue; }
        const list = element('ul', { className: `validation-list ${kind}` });
        for (const item of items) {
            list.append(element('li', { text: `${item.file || item.source || ''} ${item.path || ''}: ${item.message}`.trim() }));
        }
        parent.append(list);
    }
    if (validation.catalogOutputs?.length) {
        parent.append(element('h4', { text: 'Catalog output locales' }));
        const list = element('ul', { className: 'file-list' });
        for (const locale of validation.catalogOutputs) {
            list.append(element('li', {
                text: `${locale.locale}: ${locale.status} (${locale.path})`
            }));
        }
        parent.append(list);
    }
}

function selectedComponentRecord() {
    return state.components.find((component) => component.id === selectedComponent) || null;
}

function render() {
    updateStatus();
    clear(workspace);
    if (currentView === 'main') { renderMainView(); }
    else if (currentView === 'migrationInventory') { renderMigrationInventoryView(); }
    else if (currentView === 'locales') { renderLocalesView(); }
    else if (currentView === 'languageReport') { renderLanguageReportView(); }
    else { renderDataView(currentView); }
    workspace.focus();
}

function renderMainView() {
    const heading = element('div', { className: 'view-heading' }, [
        element('div', {}, [
            element('h2', { text: 'Component selection' }),
            element('p', { text: 'Choose a component from the authoritative components.json inventory.' })
        ])
    ]);
    const grid = element('div', { className: 'component-grid' });
    const selectorCard = element('section', { className: 'card' });
    const addComponentButton = element('button', { text: 'Add component', type: 'button', className: 'primary' });
    selectorCard.append(element('div', { className: 'card-title-row' }, [
        element('h3', { text: 'Component' }),
        addComponentButton
    ]));
    const search = element('input', { type: 'search', placeholder: 'Search component ID or description', 'aria-label': 'Search components' });
    const select = element('select', { 'aria-label': 'Selected component' });

    const populate = () => {
        const query = search.value.trim().toLocaleLowerCase();
        clear(select);
        select.append(element('option', {
            value: ALL_COMPONENTS_VALUE,
            text: 'All components — no component filter'
        }));
        const matches = state.components.filter((component) => (
            `${component.id} ${component.description}`.toLocaleLowerCase().includes(query)
        ));
        for (const component of matches) {
            select.append(element('option', { value: component.id, text: `${component.id} — ${component.description}` }));
        }
        if (selectedComponent == null) {
            select.value = ALL_COMPONENTS_VALUE;
        } else if (matches.some((component) => component.id === selectedComponent)) {
            select.value = selectedComponent;
        } else if (matches[0]) {
            selectedComponent = matches[0].id;
            select.value = selectedComponent;
        } else {
            selectedComponent = null;
            select.value = ALL_COMPONENTS_VALUE;
        }
        renderComponentDetails(detailsCard);
    };
    search.addEventListener('input', populate);
    select.addEventListener('change', () => {
        selectedComponent = select.value === ALL_COMPONENTS_VALUE ? null : select.value;
        componentEditorMode = null;
        renderComponentDetails(detailsCard);
    });
    addComponentButton.addEventListener('click', () => {
        componentEditorMode = 'add';
        renderComponentDetails(detailsCard);
    });
    selectorCard.append(
        element('label', {}, [element('span', { text: 'Search' }), search]),
        element('label', {}, [element('span', { text: 'Available components' }), select])
    );
    const actions = element('div', { className: 'component-actions' });
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
        const button = element('button', { text: label });
        button.addEventListener('click', () => changeView(view));
        actions.append(button);
    }
    selectorCard.append(actions);
    const detailsCard = element('section', { className: 'card' });
    grid.append(selectorCard, detailsCard);
    workspace.append(heading, grid);
    populate();
}

function requestLanguageReport() {
    if (languageReportLoading) { return; }
    languageReportLoading = true;
    api.getLanguageReport().then((result) => {
        languageReportLoading = false;
        languageReportState = result.ok
            ? {
                ...result,
                originalText: result.text,
                draftText: result.text,
                dirty: result.languageReportDirty === true
            }
            : { error: result.error || 'Unable to load the language report artifact.' };
        if (currentView === 'languageReport') { render(); }
    }).catch((error) => {
        languageReportLoading = false;
        languageReportState = { error: error.message };
        if (currentView === 'languageReport') { render(); }
    });
}

function renderLanguageReportView() {
    workspace.append(element('div', { className: 'view-heading data-view-toolbar' }, [
        element('div', { className: 'view-title-line' }, [
            element('h2', { text: 'Language Report' }),
            element('p', { text: 'build/language/reports/language-report.txt' })
        ])
    ]));
    if (!languageReportState) {
        workspace.append(element('section', { className: 'card' }, [
            element('p', { className: 'empty-state', text: 'Loading language report artifact…' })
        ]));
        requestLanguageReport();
        return;
    }
    if (languageReportState.error) {
        const retry = element('button', { type: 'button', text: 'Retry' });
        retry.addEventListener('click', () => {
            languageReportState = null;
            render();
        });
        workspace.append(element('section', { className: 'card' }, [
            element('p', { text: languageReportState.error }),
            retry
        ]));
        return;
    }

    const editor = element('textarea', {
        className: 'language-report-editor',
        'aria-label': 'Language report artifact text',
        spellcheck: 'false'
    });
    editor.value = languageReportState.draftText;
    const saveButton = element('button', {
        type: 'button',
        className: 'primary',
        text: 'Save report artifact',
        disabled: !languageReportState.dirty
    });
    const reloadButton = element('button', { type: 'button', text: 'Reload report from disk' });
    const updateDirty = () => {
        languageReportState.draftText = editor.value;
        languageReportState.dirty = editor.value !== languageReportState.originalText;
        saveButton.disabled = !languageReportState.dirty;
        const request = ++languageReportDirtyRequest;
        api.setLanguageReportDirty(languageReportState.dirty).then((result) => {
            if (request !== languageReportDirtyRequest || !result.ok) { return; }
            state.dirty = result.dirty;
            updateStatus();
        });
    };
    editor.addEventListener('input', updateDirty);
    saveButton.addEventListener('click', async () => {
        saveButton.disabled = true;
        reloadButton.disabled = true;
        const result = await api.saveLanguageReport({
            text: languageReportState.draftText,
            originalVersion: languageReportState.version
        });
        reloadButton.disabled = false;
        if (!result.ok) {
            saveButton.disabled = false;
            showResult('Language report artifact was not saved', result);
            return;
        }
        languageReportState = {
            ...result,
            originalText: result.text,
            draftText: result.text,
            dirty: false
        };
        state.dirty = result.dirty;
        showResult('Language report artifact saved', {
            message: `${result.relativePath} was written directly. A future report build may replace these edits.`
        });
        render();
    });
    reloadButton.addEventListener('click', async () => {
        if (languageReportState.dirty && !window.confirm('Discard unsaved Language Report edits and reload the artifact?')) {
            return;
        }
        const result = await api.setLanguageReportDirty(false);
        if (result.ok) { state.dirty = result.dirty; }
        languageReportState = null;
        render();
    });
    workspace.append(element('section', { className: 'card language-report-card' }, [
        element('p', {
            className: 'language-report-warning',
            text: 'Generated artifact: manual edits can be overwritten the next time the language report is built.'
        }),
        element('p', {
            className: 'field-help',
            text: languageReportState.exists
                ? 'Editing the current generated report.'
                : 'The report does not exist yet. Saving will create it.'
        }),
        element('div', { className: 'form-actions' }, [saveButton, reloadButton]),
        editor
    ]));
}

function renderComponentDetails(card) {
    clear(card);
    const component = selectedComponentRecord();
    if (componentEditorMode === 'add') {
        renderComponentEditor(card, null);
        return;
    }
    if (selectedComponent == null) {
        const runtimeCount = state.components.filter((item) => item.runtime).length;
        const metadata = element('dl', { className: 'metadata' }, [
            element('dt', { text: 'Scope' }), element('dd', { text: 'All components' }),
            element('dt', { text: 'Components' }), element('dd', { text: String(state.components.length) }),
            element('dt', { text: 'Runtime' }), element('dd', { text: String(runtimeCount) }),
            element('dt', { text: 'Non-runtime' }), element('dd', { text: String(state.components.length - runtimeCount) })
        ]);
        card.append(
            element('h3', { text: 'All component details' }),
            element('p', { text: 'Component Catalog and Diagnostic Messages will display records from every component.' }),
            metadata
        );
        appendMigrationInventory(card);
        return;
    }
    if (!component) {
        card.append(element('p', { className: 'empty-state', text: 'No component matches the search.' }));
        return;
    }
    const metadata = element('dl', { className: 'metadata' }, [
        element('dt', { text: 'Identifier' }), element('dd', {}, [element('code', { text: component.id })]),
        element('dt', { text: 'Description' }), element('dd', { text: component.description }),
        element('dt', { text: 'Runtime' }), element('dd', { text: component.runtime ? 'Yes' : 'No' })
    ]);
    const editButton = element('button', { text: 'Edit component', type: 'button' });
    editButton.addEventListener('click', () => {
        componentEditorMode = 'edit';
        renderComponentDetails(card);
    });
    if (componentEditorMode === 'edit') {
        renderComponentEditor(card, component);
        return;
    }
    card.append(
        element('div', { className: 'card-title-row' }, [element('h3', { text: 'Component details' }), editButton]),
        metadata
    );
    appendMigrationInventory(card);
}

function renderComponentEditor(card, component) {
    const isEdit = Boolean(component);
    const form = element('form', { className: 'editor-form' });
    const idInput = element('input', {
        type: 'text',
        value: component?.id || '',
        required: '',
        pattern: '[a-z][A-Za-z0-9]*',
        'aria-label': 'Component identifier'
    });
    if (isEdit) { idInput.readOnly = true; }
    const descriptionInput = element('textarea', {
        required: '',
        'aria-label': 'Component description'
    });
    descriptionInput.value = component?.description || '';
    const runtimeInput = element('input', {
        type: 'checkbox',
        checked: component?.runtime === true,
        'aria-label': 'Runtime component'
    });
    const cancelButton = element('button', { text: 'Cancel', type: 'button' });
    cancelButton.addEventListener('click', () => {
        componentEditorMode = null;
        renderComponentDetails(card);
    });
    form.append(
        element('h3', { text: isEdit ? `Edit ${component.id}` : 'Add component' }),
        element('label', {}, [element('span', { text: 'Identifier' }), idInput]),
        element('label', {}, [element('span', { text: 'Description' }), descriptionInput]),
        element('label', { className: 'checkbox-field' }, [runtimeInput, element('span', { text: 'Runtime component' })]),
        element('div', { className: 'form-actions' }, [
            element('button', { text: 'Apply in memory', type: 'submit', className: 'primary' }),
            cancelButton
        ])
    );
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const result = await api.applyComponent({
            originalId: component?.id || null,
            component: {
                id: idInput.value.trim(),
                description: descriptionInput.value.trim(),
                runtime: runtimeInput.checked
            }
        });
        if (result.ok && result.state) {
            state = result.state;
            selectedComponent = idInput.value.trim();
            componentEditorMode = null;
            showResult(isEdit ? 'Component updated in memory' : 'Component added in memory', {
                validation: state.validation
            });
            render();
        } else {
            showResult('Component change rejected', {
                validation: {
                    ok: false,
                    errors: result.errors || [{ message: result.error || 'Unable to apply the component.' }],
                    warnings: result.warnings || []
                }
            });
        }
    });
    card.append(form);
}

function appendMigrationInventory(card) {
    const inventory = (state.migrationInventory.scanFiles || []).filter((entry) => (
        selectedComponent == null || entry.component === selectedComponent
    ));
    card.append(element('h3', { text: 'Migration inventory' }));
    const list = element('ul', { className: 'file-list' });
    for (const entry of inventory) {
        list.append(element('li', {}, [
            element('code', { text: entry.path }),
            document.createTextNode(` — ${entry.component}`)
        ]));
    }
    card.append(list);
}

function renderMigrationInventoryView() {
    const heading = element('div', { className: 'view-heading' }, [
        element('div', {}, [
            element('h2', { text: 'Migration Inventory' }),
            element('p', { text: 'Maintains language/canonical/components.json → migrationInventory.scanFiles' })
        ])
    ]);
    const toolbar = element('div', { className: 'toolbar' });
    const search = element('input', {
        type: 'search',
        value: searchQuery,
        placeholder: 'Filter source file paths',
        'aria-label': 'Filter migration source files'
    });
    search.addEventListener('input', () => {
        searchQuery = search.value;
        renderMigrationInventoryBody(body);
    });
    const componentSelect = element('select', { 'aria-label': 'Component for added migration files' });
    for (const component of state.components) {
        componentSelect.append(element('option', { value: component.id, text: component.id }));
    }
    if (selectedComponent && state.components.some((component) => component.id === selectedComponent)) {
        componentSelect.value = selectedComponent;
    }
    const addButton = element('button', {
        text: 'Add files…',
        className: 'primary',
        type: 'button'
    });
    const scanButton = element('button', {
        text: 'Scan file…',
        type: 'button'
    });
    const scanFolderButton = element('button', {
        text: 'Scan folder…',
        type: 'button'
    });
    scanButton.addEventListener('click', () => {
        openMigrationScanWindow(componentSelect.value);
    });
    scanFolderButton.addEventListener('click', () => {
        openMigrationFolderScanWindow(componentSelect.value);
    });
    addButton.addEventListener('click', async () => {
        const result = await api.chooseMigrationFiles({ componentId: componentSelect.value });
        if (result.cancelled) { return; }
        if (result.ok && result.state) {
            state = result.state;
            showResult(result.addedFiles.length ? 'Migration files added' : 'No new files added', {
                validation: state.validation,
                inventoryFiles: result.addedFiles
            });
            render();
        } else {
            showResult('Migration files rejected', {
                validation: {
                    ok: false,
                    errors: result.errors || [{ message: result.error || 'Unable to add files.' }],
                    warnings: result.warnings || []
                }
            });
        }
    });
    toolbar.append(
        element('label', {}, [element('span', { text: 'Search and filter' }), search]),
        element('label', {}, [element('span', { text: 'Assign new files to' }), componentSelect]),
        scanButton,
        scanFolderButton,
        addButton
    );
    addButton.disabled = state.components.length === 0;
    scanButton.disabled = state.components.length === 0;
    scanFolderButton.disabled = state.components.length === 0;
    const body = element('div');
    workspace.append(heading, toolbar, body);
    renderMigrationInventoryBody(body);
}

function renderMigrationInventoryBody(container) {
    clear(container);
    const summaryRequest = ++migrationSummaryRequest;
    const query = searchQuery.trim().toLocaleLowerCase();
    const files = (state.migrationInventory.scanFiles || []).filter((file) => (
        `${file.path} ${file.component}`.toLocaleLowerCase().includes(query)
    ));
    const card = element('section', { className: 'card' });
    card.append(element('h3', { text: `${files.length} source file(s)` }));
    if (!files.length) {
        card.append(element('p', {
            className: 'empty-state',
            text: query ? 'No files match the current filter.' : 'No migration source files are listed.'
        }));
        container.append(card);
        return;
    }
    const list = element('ul', { className: 'migration-file-list' });
    const coverageByPath = new Map();
    for (const file of files) {
        const candidatesButton = element('button', {
            text: 'View',
            type: 'button',
            'aria-label': `View migration candidates for ${file.path}`
        });
        candidatesButton.addEventListener('click', async () => {
            candidatesButton.disabled = true;
            const result = await api.getMigrationCandidates(file.path);
            candidatesButton.disabled = false;
            if (result.ok && result.file) {
                openMigrationCandidateWindow(result.file);
            } else {
                showResult('Migration candidates unavailable', {
                    error: result.error || 'Unable to load migration candidates.'
                });
            }
        });
        const removeButton = element('button', {
            text: 'Remove',
            type: 'button',
            'aria-label': `Remove ${file.path}`
        });
        removeButton.addEventListener('click', async () => {
            if (!window.confirm(`Remove ${file.path} from the migration inventory?`)) { return; }
            const result = await api.removeMigrationFile(file.path);
            if (result.ok && result.state) {
                state = result.state;
                showResult('Migration file removed', {
                    validation: state.validation,
                    inventoryFiles: [result.removedFile]
                });
                render();
            } else {
                showResult('Migration file removal failed', {
                    validation: {
                        ok: false,
                        errors: result.errors || [{ message: result.error || 'Unable to remove the file.' }],
                        warnings: result.warnings || []
                    }
                });
            }
        });
        const assignment = element('select', {
            'aria-label': `Component assigned to ${file.path}`,
            title: file.component
        });
        for (const component of state.components) {
            assignment.append(element('option', { value: component.id, text: component.id }));
        }
        assignment.value = file.component;
        assignment.addEventListener('change', async () => {
            const previousComponent = file.component;
            assignment.disabled = true;
            const result = await api.assignMigrationFileComponent({
                path: file.path,
                componentId: assignment.value
            });
            if (result.ok && result.state) {
                state = result.state;
                showResult('Migration component assignment updated', { validation: state.validation });
                render();
            } else {
                assignment.disabled = false;
                assignment.value = previousComponent;
                showResult('Migration assignment rejected', {
                    validation: {
                        ok: false,
                        errors: result.errors || [{ message: result.error || 'Unable to assign the component.' }],
                        warnings: result.warnings || []
                    }
                });
            }
        });
        const coverage = element('span', {
            className: 'migration-coverage',
            text: 'Loading potential / found coverage…'
        });
        coverageByPath.set(file.path, coverage);
        list.append(element('li', {}, [
            element('div', { className: 'migration-file-identity' }, [
                element('code', { text: file.path, title: file.path }),
                coverage
            ]),
            element('div', { className: 'migration-file-actions' }, [assignment, candidatesButton, removeButton])
        ]));
    }
    card.append(list);
    container.append(card);
    void populateMigrationSummary(coverageByPath, summaryRequest);
}

async function populateMigrationSummary(coverageByPath, request) {
    let result;
    try {
        result = await api.getMigrationSummary();
    } catch (error) {
        result = { ok: false, error: error.message };
    }
    if (request !== migrationSummaryRequest) { return; }
    if (!result.ok) {
        for (const coverage of coverageByPath.values()) {
            coverage.textContent = `Coverage unavailable: ${result.error || 'Unable to load migration report.'}`;
            coverage.className = 'migration-coverage unavailable';
        }
        return;
    }
    for (const file of result.files || []) {
        const coverage = coverageByPath.get(file.path);
        if (!coverage) { continue; }
        if (!file.ok) {
            coverage.textContent = `Coverage unavailable: ${file.error}`;
            coverage.className = 'migration-coverage unavailable';
            continue;
        }
        coverage.textContent = candidateProgressText(file);
        coverage.className = `migration-coverage ${file.catalogedStringCount > 0 ? 'has-found' : 'no-found'}`;
    }
}

function allMigrationCandidates(file) {
    return uiState.orderCandidatesByLine([
        ...file.candidates,
        ...file.catalogedStrings
    ]);
}

const CANDIDATE_STATUS_LABELS = Object.freeze({
    'in-catalog': 'In Catalog',
    potential: 'Potential Candidate',
    rejected: 'Rejected',
    review: 'Review',
    'code-edit': 'Code Edit',
    'code-updated': 'Code Updated'
});

const COMPLETED_CANDIDATE_STATUSES = new Set([
    'in-catalog',
    'rejected',
    'code-edit',
    'code-updated'
]);

function candidateIsCataloged(candidate) {
    return Array.isArray(candidate.catalogEntries) && candidate.catalogEntries.length > 0;
}

function candidateUsesCatalogFormat(candidate) {
    return ['catalog.format-key', 'catalog.format-text'].includes(candidate?.catalogReference?.kind);
}

function candidateWorkflowSummary(source) {
    if (!Array.isArray(source) && source?.statusCounts) {
        return {
            totalCount: source.totalCount,
            completedCount: source.completedCount,
            remainingCount: source.remainingCount,
            statusCounts: source.statusCounts
        };
    }
    const statusCounts = Object.fromEntries(
        Object.keys(CANDIDATE_STATUS_LABELS).map((status) => [status, 0])
    );
    const candidates = Array.isArray(source)
        ? source
        : (Array.isArray(source?.candidates) && Array.isArray(source?.catalogedStrings)
            ? allMigrationCandidates(source)
            : null);
    if (!candidates) {
        statusCounts.potential = Number(source?.candidateCount) || 0;
        statusCounts['in-catalog'] = Number(source?.catalogedStringCount) || 0;
        const totalCount = statusCounts.potential + statusCounts['in-catalog'];
        return {
            totalCount,
            completedCount: statusCounts['in-catalog'],
            remainingCount: statusCounts.potential,
            statusCounts
        };
    }
    for (const candidate of candidates) {
        const status = Object.prototype.hasOwnProperty.call(statusCounts, candidate.status)
            ? candidate.status
            : 'potential';
        statusCounts[status] += 1;
    }
    const totalCount = candidates.length;
    const completedCount = Object.entries(statusCounts)
        .filter(([status]) => COMPLETED_CANDIDATE_STATUSES.has(status))
        .reduce((sum, [, count]) => sum + count, 0);
    return {
        totalCount,
        completedCount,
        remainingCount: totalCount - completedCount,
        statusCounts
    };
}

function candidateProgressText(source) {
    const summary = candidateWorkflowSummary(source);
    const completedDetails = ['in-catalog', 'rejected', 'code-edit', 'code-updated']
        .filter((status) => summary.statusCounts[status] > 0)
        .map((status) => `${summary.statusCounts[status]} ${CANDIDATE_STATUS_LABELS[status]}`);
    return [
        `${summary.remainingCount} remaining`,
        `${summary.completedCount}/${summary.totalCount} completed`,
        ...completedDetails
    ].join(' · ');
}

function migrationCandidateContent(candidate) {
    const status = Object.prototype.hasOwnProperty.call(CANDIDATE_STATUS_LABELS, candidate.status)
        ? candidate.status
        : 'potential';
    const inCatalog = candidateIsCataloged(candidate);
    const summaryLine = element('span', { className: 'candidate-summary-line' }, [
        element('span', { className: 'candidate-line-number', text: `Line ${candidate.line}` }),
        element('span', {
            className: `candidate-status ${status}`,
            text: CANDIDATE_STATUS_LABELS[status]
        }),
        element('span', { className: 'candidate-text', text: candidate.text })
    ]);
    const sourceLineContent = [];
    if (inCatalog) {
        sourceLineContent.push(element('span', {
            className: 'catalog-match-keys',
            text: `Catalog: ${candidate.catalogEntries.map((entry) => `${entry.key} [${entry.component}]`).join(', ')}`
        }));
    }
    sourceLineContent.push(element('code', {
        className: 'candidate-full-line',
        text: candidate.fullLine
    }));
    const sourceLine = element('span', {
        className: `candidate-source-line${inCatalog ? ' has-catalog' : ''}`
    }, sourceLineContent);
    return [summaryLine, sourceLine];
}

function createOpenMigrationSourceButton(filePath, candidate, openRequest) {
    const openSourceButton = element('button', {
        type: 'button',
        className: 'candidate-open-source',
        text: 'Open source',
        'aria-label': `Open ${filePath} at line ${candidate.line}`
    });
    openSourceButton.addEventListener('click', async () => {
        openSourceButton.disabled = true;
        const result = await openRequest({
            path: filePath,
            line: candidate.line,
            text: candidate.text
        });
        openSourceButton.disabled = false;
        if (!result.ok) {
            showResult('Unable to open migration source', {
                error: result.error || 'The source file could not be opened.'
            });
        } else if (result.mode === 'file') {
            showResult('Source file opened', { message: result.message });
        }
    });
    return openSourceButton;
}

function createMigrationTransformPreview(filePath, candidate, options = {}) {
    const catalogKeyControl = options.catalogKeyControl || null;
    const initialCatalogKey = String(options.catalogKey || '').trim();
    const onSourceReplaced = options.onSourceReplaced || null;
    let replacementEnabled = false;
    let activeRequest = null;
    let previewGeneration = 0;
    const catalogKeyText = element('span', {
        className: 'field-help',
        text: initialCatalogKey ? `Catalog key: ${initialCatalogKey}` : 'Resolving catalog key...'
    });
    const originalCode = element('code', { text: candidate.fullLine });
    const transformedCode = element('code', { text: 'Loading transform preview...' });
    const replacementStatus = element('span', {
        className: 'field-help',
        text: 'Checking source-replacement safeguards...'
    });
    const replaceLineButton = element('button', {
        type: 'button',
        text: 'Replace line in source',
        disabled: true
    });
    const preview = element('section', { className: 'candidate-transform-preview' }, [
        element('div', { className: 'candidate-transform-heading' }, [
            element('h4', { text: 'Source Transform Preview' }),
            catalogKeyText
        ]),
        element('div', { className: 'candidate-transform-block' }, [
            element('h5', { text: 'Original' }),
            element('pre', {}, [originalCode])
        ]),
        element('div', { className: 'candidate-transform-block' }, [
            element('h5', { text: 'Transformed' }),
            element('pre', {}, [transformedCode])
        ]),
        element('div', { className: 'candidate-transform-actions' }, [
            replaceLineButton,
            replacementStatus
        ])
    ]);

    replaceLineButton.addEventListener('click', async () => {
        if (!replacementEnabled || !activeRequest) { return; }
        const request = activeRequest;
        replaceLineButton.disabled = true;
        let result;
        try {
            result = await api.replaceMigrationSourceLine(request);
        } catch (error) {
            result = { ok: false, error: error.message };
        }
        if (!result.ok) {
            const sourceChanged = result.code === 'SOURCE_CHANGED' || result.code === 'SOURCE_VERSION_REQUIRED';
            replacementStatus.textContent = result.error || 'The source line was not replaced.';
            replaceLineButton.disabled = !replacementEnabled || sourceChanged;
            showResult('Source line was not replaced', {
                error: result.error || 'Source replacement is not enabled.'
            });
            return;
        }
        replacementEnabled = false;
        replacementStatus.textContent = result.message;
        replaceLineButton.title = result.message;
        if (typeof onSourceReplaced === 'function') { onSourceReplaced(result); }
        showResult('Source line replaced', {
            message: [result.message, result.statusWarning].filter(Boolean).join(' ')
        });
    });

    const refreshPreview = async (nextCatalogKey) => {
        const generation = ++previewGeneration;
        const catalogKey = String(nextCatalogKey || '').trim();
        replacementEnabled = false;
        activeRequest = null;
        replaceLineButton.disabled = true;
        replaceLineButton.title = '';
        catalogKeyText.textContent = catalogKey ? `Catalog key: ${catalogKey}` : 'Catalog key required';
        transformedCode.textContent = catalogKey ? 'Regenerating transform preview...' : 'Enter a catalog key to generate the transform preview.';
        replacementStatus.textContent = catalogKey
            ? 'Checking source-replacement safeguards...'
            : 'Source replacement requires a catalog key.';
        if (!catalogKey) { return; }

        const request = {
            path: filePath,
            line: candidate.line,
            text: candidate.text,
            catalogKey
        };
        let result;
        try {
            result = await api.previewMigrationSourceTransform(request);
        } catch (error) {
            result = { ok: false, error: error.message };
        }
        if (generation !== previewGeneration) { return; }
        if (!result.ok) {
            transformedCode.textContent = `Transform preview unavailable: ${result.error || 'Unknown error'}`;
            replacementStatus.textContent = result.error || 'Source replacement is unavailable.';
            return;
        }
        activeRequest = {
            ...request,
            catalogKey: result.catalogKey,
            sourceVersion: result.sourceVersion
        };
        catalogKeyText.textContent = `Catalog key: ${result.catalogKey}`;
        originalCode.textContent = result.originalLine;
        transformedCode.textContent = result.transformedLines.join('\n');
        replacementEnabled = result.sourceReplacement?.enabled === true;
        replaceLineButton.disabled = !replacementEnabled;
        replaceLineButton.title = result.sourceReplacement?.reason || '';
        replacementStatus.textContent = result.sourceReplacement?.reason || '';
    };

    if (catalogKeyControl) {
        catalogKeyControl.addEventListener('input', () => {
            void refreshPreview(catalogKeyControl.value);
        });
    }
    void refreshPreview(initialCatalogKey);

    return preview;
}

function createResizableDialogControls(dialog, windowLabel) {
    const minimizeButton = element('button', {
        className: 'candidate-window-control',
        text: '—',
        type: 'button',
        title: 'Minimize',
        'aria-label': `Minimize ${windowLabel}`,
        'aria-pressed': 'false'
    });
    const maximizeButton = element('button', {
        className: 'candidate-window-control',
        text: '□',
        type: 'button',
        title: 'Maximize',
        'aria-label': `Maximize ${windowLabel}`,
        'aria-pressed': 'false'
    });
    const closeButton = element('button', {
        className: 'candidate-window-control candidate-window-close',
        text: '×',
        type: 'button',
        title: 'Close',
        'aria-label': `Close ${windowLabel}`
    });
    minimizeButton.addEventListener('click', () => {
        const minimized = dialog.classList.toggle('is-minimized');
        if (minimized) {
            dialog.classList.remove('is-maximized');
            maximizeButton.textContent = '□';
            maximizeButton.title = 'Maximize';
            maximizeButton.setAttribute('aria-label', `Maximize ${windowLabel}`);
            maximizeButton.setAttribute('aria-pressed', 'false');
        }
        minimizeButton.textContent = minimized ? '▣' : '—';
        minimizeButton.title = minimized ? 'Restore' : 'Minimize';
        minimizeButton.setAttribute('aria-label', `${minimized ? 'Restore' : 'Minimize'} ${windowLabel}`);
        minimizeButton.setAttribute('aria-pressed', minimized ? 'true' : 'false');
    });
    maximizeButton.addEventListener('click', () => {
        dialog.classList.remove('is-minimized');
        minimizeButton.textContent = '—';
        minimizeButton.title = 'Minimize';
        minimizeButton.setAttribute('aria-label', `Minimize ${windowLabel}`);
        minimizeButton.setAttribute('aria-pressed', 'false');
        const maximized = dialog.classList.toggle('is-maximized');
        maximizeButton.textContent = maximized ? '❐' : '□';
        maximizeButton.title = maximized ? 'Restore' : 'Maximize';
        maximizeButton.setAttribute('aria-label', `${maximized ? 'Restore' : 'Maximize'} ${windowLabel}`);
        maximizeButton.setAttribute('aria-pressed', maximized ? 'true' : 'false');
    });
    closeButton.addEventListener('click', () => dialog.close());
    return element('div', { className: 'candidate-window-controls', 'aria-label': 'Window controls' }, [
        minimizeButton,
        maximizeButton,
        closeButton
    ]);
}

function openMigrationScanWindow(defaultComponent) {
    const dialog = element('dialog', {
        className: 'candidate-dialog migration-scan-dialog',
        'aria-label': 'Scan migration source file'
    });
    const headingText = element('h2', { text: 'Scan source file' });
    const headingStatus = element('p', {
        text: 'Select one repository file to inspect without adding it to the source inventory.'
    });
    const heading = element('div', { className: 'candidate-dialog-heading' }, [
        element('div', {}, [headingText, headingStatus]),
        createResizableDialogControls(dialog, 'scan file window')
    ]);
    const componentSelect = element('select', { 'aria-label': 'Component for scanned migration file' });
    for (const component of state.components) {
        componentSelect.append(element('option', { value: component.id, text: component.id }));
    }
    if (defaultComponent && state.components.some((component) => component.id === defaultComponent)) {
        componentSelect.value = defaultComponent;
    }
    const selectFileButton = element('button', { type: 'button', text: 'Select file…' });
    const addToSourceFilesButton = element('button', {
        type: 'button',
        className: 'primary',
        text: 'Add to source files'
    });
    addToSourceFilesButton.disabled = true;
    const scanStatus = element('p', {
        className: 'migration-scan-status',
        text: 'No file selected.'
    });
    const results = element('div', { className: 'candidate-choices migration-scan-results' });
    results.append(element('p', {
        className: 'empty-state',
        text: 'Select a file to display every string accepted by extractStringCandidates.'
    }));
    let scannedFile = null;

    const renderScanResults = (file) => {
        clear(results);
        const allCandidates = allMigrationCandidates(file);
        for (const candidate of allCandidates) {
            results.append(element('div', { className: 'candidate-choice-row' }, [
                element('article', {
                    className: `candidate-choice scan-candidate ${candidate.status}`
                }, migrationCandidateContent(candidate)),
                createOpenMigrationSourceButton(file.path, candidate, api.openScannedMigrationSource)
            ]));
        }
        if (allCandidates.length === 0) {
            results.append(element('p', {
                className: 'empty-state',
                text: 'No candidate strings were found in this file.'
            }));
        }
    };

    selectFileButton.addEventListener('click', async () => {
        selectFileButton.disabled = true;
        scanStatus.textContent = 'Scanning selected file…';
        let result;
        try {
            result = await api.scanMigrationFile();
        } catch (error) {
            result = { ok: false, error: error.message };
        }
        selectFileButton.disabled = false;
        if (result.cancelled) {
            scanStatus.textContent = scannedFile ? `Selected: ${scannedFile.path}` : 'No file selected.';
            return;
        }
        if (!result.ok || !result.file) {
            scannedFile = null;
            addToSourceFilesButton.disabled = true;
            scanStatus.textContent = `Scan failed: ${result.error || 'Unable to scan the selected file.'}`;
            clear(results);
            results.append(element('p', { className: 'empty-state', text: 'No scan results are available.' }));
            return;
        }
        scannedFile = result.file;
        headingText.textContent = `Scan source file: ${scannedFile.path}`;
        headingStatus.textContent = `${scannedFile.candidateCount} non-catalog candidate(s), ${scannedFile.catalogedStringCount} found in catalog`;
        if (scannedFile.alreadyInInventory && scannedFile.inventoryComponent) {
            componentSelect.value = scannedFile.inventoryComponent;
        }
        addToSourceFilesButton.textContent = scannedFile.alreadyInInventory
            ? 'Already in source files'
            : 'Add to source files';
        addToSourceFilesButton.disabled = scannedFile.alreadyInInventory || state.components.length === 0;
        scanStatus.textContent = scannedFile.alreadyInInventory
            ? `Already listed under component ${scannedFile.inventoryComponent}.`
            : `Scanned ${scannedFile.extractedCount} candidate string(s) without changing the inventory.`;
        renderScanResults(scannedFile);
    });

    addToSourceFilesButton.addEventListener('click', async () => {
        if (!scannedFile) { return; }
        addToSourceFilesButton.disabled = true;
        const result = await api.addScannedMigrationFile({
            path: scannedFile.path,
            componentId: componentSelect.value
        });
        if (result.ok && result.state) {
            state = result.state;
            scannedFile.alreadyInInventory = true;
            scannedFile.inventoryComponent = componentSelect.value;
            addToSourceFilesButton.textContent = 'Already in source files';
            scanStatus.textContent = `Added to source files under component ${componentSelect.value}. Save is still required.`;
            showResult(result.addedFiles.length ? 'Migration file added' : 'Migration file already listed', {
                validation: state.validation,
                inventoryFiles: result.addedFiles
            });
            render();
        } else {
            addToSourceFilesButton.disabled = false;
            showResult('Migration file rejected', {
                validation: {
                    ok: false,
                    errors: result.errors || [{ message: result.error || 'Unable to add the scanned file.' }],
                    warnings: result.warnings || []
                }
            });
        }
    });

    const toolbar = element('div', { className: 'toolbar migration-scan-toolbar' }, [
        selectFileButton,
        element('label', {}, [element('span', { text: 'Assign to component' }), componentSelect]),
        addToSourceFilesButton
    ]);
    const resultPane = element('section', { className: 'candidate-pane migration-scan-pane' }, [
        scanStatus,
        results
    ]);
    dialog.append(heading, toolbar, resultPane);
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    document.body.append(dialog);
    dialog.showModal();
}

function openMigrationFolderScanWindow(defaultComponent) {
    const dialog = element('dialog', {
        className: 'candidate-dialog migration-folder-scan-dialog',
        'aria-label': 'Scan migration source folder'
    });
    const headingText = element('h2', { text: 'Scan source folder' });
    const headingStatus = element('p', {
        text: 'Recursively inspect a repository folder, then add selected candidate-bearing files in one operation.'
    });
    const heading = element('div', { className: 'candidate-dialog-heading' }, [
        element('div', {}, [headingText, headingStatus]),
        createResizableDialogControls(dialog, 'scan folder window')
    ]);
    const componentSelect = element('select', { 'aria-label': 'Component for scanned migration files' });
    for (const component of state.components) {
        componentSelect.append(element('option', { value: component.id, text: component.id }));
    }
    if (defaultComponent && state.components.some((component) => component.id === defaultComponent)) {
        componentSelect.value = defaultComponent;
    }

    const selectFolderButton = element('button', { type: 'button', text: 'Select folder…' });
    const selectAllButton = element('button', { type: 'button', text: 'Select all new' });
    const clearSelectionButton = element('button', { type: 'button', text: 'Clear' });
    const addSelectedButton = element('button', {
        type: 'button',
        className: 'primary',
        text: 'Add selected files'
    });
    selectAllButton.disabled = true;
    clearSelectionButton.disabled = true;
    addSelectedButton.disabled = true;
    const scanStatus = element('p', {
        className: 'migration-scan-status',
        text: 'No folder selected.'
    });
    const results = element('div', { className: 'migration-folder-results' });
    results.append(element('p', {
        className: 'empty-state',
        text: 'Select a folder to find files containing candidate strings.'
    }));
    let scannedFolder = null;
    let fileCheckboxes = [];

    const selectedPaths = () => fileCheckboxes
        .filter(({ checkbox }) => checkbox.checked && !checkbox.disabled)
        .map(({ file }) => file.path);
    const updateSelection = () => {
        const count = selectedPaths().length;
        addSelectedButton.textContent = count === 1 ? 'Add 1 selected file' : `Add ${count} selected files`;
        addSelectedButton.disabled = count === 0 || state.components.length === 0;
        clearSelectionButton.disabled = count === 0;
    };
    const renderFolderResults = () => {
        clear(results);
        fileCheckboxes = [];
        if (!scannedFolder || scannedFolder.files.length === 0) {
            results.append(element('p', {
                className: 'empty-state',
                text: 'No files containing candidate strings were found in this folder.'
            }));
            selectAllButton.disabled = true;
            updateSelection();
            return;
        }
        for (const file of scannedFolder.files) {
            const checkbox = element('input', {
                type: 'checkbox',
                checked: !file.alreadyInInventory,
                disabled: file.alreadyInInventory,
                'aria-label': `Select ${file.path}`
            });
            const inventoryText = file.alreadyInInventory
                ? ` · already in ${file.inventoryComponent}`
                : '';
            const row = element('label', {
                className: `migration-folder-file${file.alreadyInInventory ? ' already-listed' : ''}`
            }, [
                checkbox,
                element('code', { text: file.path }),
                element('span', {
                    className: 'migration-folder-counts',
                    text: `${file.candidateCount} potential · ${file.catalogedStringCount} in catalog${inventoryText}`
                })
            ]);
            checkbox.addEventListener('change', updateSelection);
            fileCheckboxes.push({ file, checkbox });
            results.append(row);
        }
        selectAllButton.disabled = !fileCheckboxes.some(({ checkbox }) => !checkbox.disabled);
        updateSelection();
    };

    selectFolderButton.addEventListener('click', async () => {
        selectFolderButton.disabled = true;
        scanStatus.textContent = 'Scanning selected folder…';
        let result;
        try {
            result = await api.scanMigrationFolder();
        } catch (error) {
            result = { ok: false, error: error.message };
        }
        selectFolderButton.disabled = false;
        if (result.cancelled) {
            scanStatus.textContent = scannedFolder ? `Selected: ${scannedFolder.path}` : 'No folder selected.';
            return;
        }
        if (!result.ok || !result.folder) {
            scannedFolder = null;
            selectAllButton.disabled = true;
            clearSelectionButton.disabled = true;
            addSelectedButton.disabled = true;
            scanStatus.textContent = `Scan failed: ${result.error || 'Unable to scan the selected folder.'}`;
            clear(results);
            results.append(element('p', { className: 'empty-state', text: 'No scan results are available.' }));
            return;
        }
        scannedFolder = result.folder;
        headingText.textContent = `Scan source folder: ${scannedFolder.path}`;
        headingStatus.textContent = `${scannedFolder.candidateFileCount} candidate-bearing file(s), ${scannedFolder.candidateCount} potential candidate(s), ${scannedFolder.catalogedStringCount} found in catalog`;
        const skipped = scannedFolder.skippedFileCount + scannedFolder.ignoredDirectoryCount;
        scanStatus.textContent = [
            `Inspected ${scannedFolder.inspectedFileCount} file(s); scanned ${scannedFolder.scannedFileCount} as text.`,
            skipped ? `Skipped ${skipped} file or folder path(s).` : '',
            scannedFolder.truncated ? `Stopped at the ${scannedFolder.limits.maximumFiles}-file safety limit.` : '',
            'The inventory is unchanged until selected files are added.'
        ].filter(Boolean).join(' ');
        renderFolderResults();
    });

    selectAllButton.addEventListener('click', () => {
        for (const { checkbox } of fileCheckboxes) {
            if (!checkbox.disabled) { checkbox.checked = true; }
        }
        updateSelection();
    });
    clearSelectionButton.addEventListener('click', () => {
        for (const { checkbox } of fileCheckboxes) {
            if (!checkbox.disabled) { checkbox.checked = false; }
        }
        updateSelection();
    });
    addSelectedButton.addEventListener('click', async () => {
        const paths = selectedPaths();
        if (paths.length === 0) { return; }
        addSelectedButton.disabled = true;
        const result = await api.addScannedMigrationFiles({
            paths,
            componentId: componentSelect.value
        });
        if (result.ok && result.state) {
            state = result.state;
            const added = new Set(result.addedFiles);
            for (const file of scannedFolder.files) {
                if (added.has(file.path)) {
                    file.alreadyInInventory = true;
                    file.inventoryComponent = componentSelect.value;
                }
            }
            scanStatus.textContent = `Added ${result.addedFiles.length} file(s) under component ${componentSelect.value}. Save is still required.`;
            showResult(result.addedFiles.length ? 'Migration files added' : 'Migration files already listed', {
                validation: state.validation,
                inventoryFiles: result.addedFiles
            });
            renderFolderResults();
            render();
        } else {
            addSelectedButton.disabled = false;
            showResult('Migration files rejected', {
                validation: {
                    ok: false,
                    errors: result.errors || [{ message: result.error || 'Unable to add the scanned files.' }],
                    warnings: result.warnings || []
                }
            });
        }
    });

    const toolbar = element('div', { className: 'toolbar migration-scan-toolbar' }, [
        selectFolderButton,
        element('label', {}, [element('span', { text: 'Assign selected files to' }), componentSelect]),
        selectAllButton,
        clearSelectionButton,
        addSelectedButton
    ]);
    const resultPane = element('section', { className: 'candidate-pane migration-scan-pane' }, [
        scanStatus,
        results
    ]);
    dialog.append(heading, toolbar, resultPane);
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    document.body.append(dialog);
    dialog.showModal();
}

function catalogRecordForCandidate(file, candidate) {
    const placeholders = Array.from(
        new Set(Array.from(candidate.text.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g), (match) => match[1]))
    ).sort();
    return {
        component: file.component,
        text: candidate.text,
        placeholders,
        status: 'draft',
        source: file.path,
        sourceLine: candidate.line
    };
}

function applyCandidateCatalogEditorLayout(editor, variantClass, headingActions = null) {
    editor.classList.add('candidate-catalog-editor', variantClass);
    const editorHeading = editor.querySelector(':scope > h3');
    const headingRow = element('div', { className: 'candidate-editor-heading' });
    editor.replaceChild(headingRow, editorHeading);
    headingRow.append(editorHeading);
    if (headingActions) { headingRow.append(headingActions); }
}

function openMigrationCandidateWindow(file) {
    const dialog = element('dialog', { className: 'candidate-dialog', 'aria-label': `Migration candidates for ${file.path}` });
    const headingStatus = element('p', {
        text: candidateProgressText(file)
    });
    const heading = element('div', { className: 'candidate-dialog-heading' }, [
        element('div', { className: 'candidate-dialog-title-line' }, [
            element('h2', { text: `All candidates: ${file.path}` }),
            headingStatus
        ]),
        createResizableDialogControls(dialog, 'migration candidates window')
    ]);
    const workflowNotice = element('p', { className: 'candidate-workflow-notice' });
    workflowNotice.hidden = true;
    const candidatePane = element('section', { className: 'candidate-pane' });
    const statusFilter = element('select', { 'aria-label': 'Filter candidates by status' });
    statusFilter.append(element('option', { value: 'all', text: 'All statuses' }));
    for (const status of ['in-catalog', 'potential', 'review', 'rejected', 'code-edit', 'code-updated']) {
        statusFilter.append(element('option', { value: status, text: CANDIDATE_STATUS_LABELS[status] }));
    }
    const lineOrder = element('select', { 'aria-label': 'Order candidates by line' });
    lineOrder.append(
        element('option', { value: 'ascending', text: 'Lowest line first' }),
        element('option', { value: 'descending', text: 'Highest line first' })
    );
    candidatePane.append(element('div', { className: 'candidate-list-heading' }, [
        element('h3', { text: 'All Candidates' }),
        element('div', { className: 'candidate-list-controls' }, [
            element('label', {}, [element('span', { text: 'Filter status' }), statusFilter]),
            element('label', {}, [element('span', { text: 'Line order' }), lineOrder])
        ])
    ]));
    const choices = element('div', { className: 'candidate-choices' });
    const editorHost = element('div', { className: 'candidate-editor-host' });
    const choiceButtons = [];
    const candidateRows = [];
    const pendingSourceUpdates = new Set();
    let selectionRequest = 0;

    const updateWorkflowNotice = (candidate = null) => {
        const pending = candidate != null && pendingSourceUpdates.has(candidate);
        workflowNotice.hidden = !pending;
        workflowNotice.textContent = pending
            ? `Catalog record added for line ${candidate.line}. Update the source line to complete this candidate; navigation remains available.`
            : '';
    };

    const selectChoice = (selectedButton) => {
        for (const button of choiceButtons) {
            button.classList.toggle('selected', button === selectedButton);
            button.setAttribute('aria-pressed', button === selectedButton ? 'true' : 'false');
        }
    };

    const refreshCandidateRow = (candidateRow) => {
        const selected = candidateRow.choice.classList.contains('selected');
        candidateRow.choice.className = `candidate-choice ${candidateRow.candidate.status}`;
        if (selected) { candidateRow.choice.classList.add('selected'); }
        clear(candidateRow.choice);
        candidateRow.choice.append(...migrationCandidateContent(candidateRow.candidate));
    };

    const updateHeadingStatus = () => {
        headingStatus.textContent = candidateProgressText(candidateRows.map((candidateRow) => candidateRow.candidate));
    };

    const refreshCandidateRows = async () => {
        let result;
        try {
            result = await api.getMigrationCandidates(file.path);
        } catch (error) {
            result = { ok: false, error: error.message };
        }
        if (!result.ok || !result.file) {
            showResult('Unable to refresh candidate catalog status', {
                error: result.error || 'The migration candidates could not be reloaded.'
            });
            return false;
        }

        const refreshedBySource = new Map();
        for (const refreshed of allMigrationCandidates(result.file)) {
            const identity = `${refreshed.line}\0${refreshed.text}\0${refreshed.fullLine}`;
            const matches = refreshedBySource.get(identity) || [];
            matches.push(refreshed);
            refreshedBySource.set(identity, matches);
        }
        for (const candidateRow of candidateRows) {
            const identity = `${candidateRow.candidate.line}\0${candidateRow.candidate.text}\0${candidateRow.candidate.fullLine}`;
            const refreshed = refreshedBySource.get(identity)?.shift();
            if (!refreshed) { continue; }
            for (const field of Object.keys(candidateRow.candidate)) {
                delete candidateRow.candidate[field];
            }
            Object.assign(candidateRow.candidate, refreshed);
            refreshCandidateRow(candidateRow);
        }
        file.candidates = result.file.candidates;
        file.catalogedStrings = result.file.catalogedStrings;
        file.candidateCount = result.file.candidateCount;
        file.catalogedStringCount = result.file.catalogedStringCount;
        updateHeadingStatus();
        applyStatusFilter();
        return true;
    };

    const applyStatusFilter = () => {
        for (const candidateRow of candidateRows) {
            candidateRow.row.hidden = !uiState.candidateMatchesStatus(
                candidateRow.candidate,
                statusFilter.value
            );
        }
    };
    statusFilter.addEventListener('change', applyStatusFilter);

    const applyLineOrder = () => {
        const rowByCandidate = new Map(candidateRows.map((candidateRow) => [candidateRow.candidate, candidateRow]));
        const orderedCandidates = uiState.orderCandidatesByLine(
            candidateRows.map((candidateRow) => candidateRow.candidate),
            lineOrder.value
        );
        candidateRows.splice(0, candidateRows.length, ...orderedCandidates.map((candidate) => rowByCandidate.get(candidate)));
        choices.append(...candidateRows.map((candidateRow) => candidateRow.row));
    };
    lineOrder.addEventListener('change', applyLineOrder);

    const updateCandidateStatus = async (candidate, status, controls = []) => {
        for (const control of controls) { control.disabled = true; }
        let result;
        try {
            result = await api.setMigrationCandidateStatus({ path: file.path, text: candidate.text, status });
        } catch (error) {
            result = { ok: false, error: error.message };
        }
        for (const control of controls) { control.disabled = false; }
        if (!result.ok) {
            showResult('Candidate status rejected', {
                validation: {
                    ok: false,
                    errors: result.errors || [{ message: result.error || 'Unable to update candidate status.' }],
                    warnings: result.warnings || []
                }
            });
            return false;
        }
        state = result.state;
        updateStatus();
        for (const candidateRow of candidateRows) {
            if (candidateRow.candidate.text !== candidate.text) { continue; }
            candidateRow.candidate.status = status;
            refreshCandidateRow(candidateRow);
        }
        updateHeadingStatus();
        applyStatusFilter();
        showResult('Candidate status updated in memory', {
            message: 'Use Save to persist the candidate status in language/canonical/components.json.',
            validation: state.validation
        });
        return true;
    };

    const recordSourceReplacement = (candidate, result, statusElement = null) => {
        if (result.state) {
            state = result.state;
            updateStatus();
        }
        const replacementStatus = result.candidateStatus || 'code-updated';
        if (replacementStatus === 'code-updated') {
            for (const candidateRow of candidateRows) {
                if (candidateRow.candidate.text !== candidate.text) { continue; }
                candidateRow.candidate.status = 'code-updated';
                pendingSourceUpdates.delete(candidateRow.candidate);
                refreshCandidateRow(candidateRow);
            }
            if (statusElement) {
                statusElement.textContent = `Candidate status: ${CANDIDATE_STATUS_LABELS['code-updated']}`;
            }
            updateWorkflowNotice(candidate);
            updateHeadingStatus();
            applyStatusFilter();
        }
    };

    const selectEditableCandidate = async (candidate, selectedButton) => {
        const request = ++selectionRequest;
        selectChoice(selectedButton);
        updateWorkflowNotice(candidate);
        clear(editorHost);
        editorHost.append(element('p', {
            className: 'empty-state',
            text: 'Analyzing source context...'
        }));
        let suggestion;
        try {
            suggestion = await api.suggestCatalogKey({ path: file.path, line: candidate.line });
        } catch (error) {
            suggestion = { ok: false, error: error.message };
        }
        if (request !== selectionRequest) { return; }
        clear(editorHost);
        const catalogEditor = renderEditor('catalog', catalogRecordForCandidate(file, candidate), {
            isNew: true,
            title: 'Component Catalog Add Record',
            suggestedKey: suggestion.ok ? suggestion.suggestedKey : '',
            suggestionStrategy: suggestion.ok ? suggestion.strategy : null,
            suggestionError: suggestion.ok ? null : suggestion.error,
            clearText: 'Close candidates',
            actionsAtTop: true,
            onClear: () => dialog.close(),
            onSuccess: ({ nextRecord }) => {
                const addedRecord = state.views.catalog.records.find((entry) => entry.key === nextRecord.key)
                    || nextRecord;
                clear(editorHost);
                editorHost.append(element('p', {
                    className: 'empty-state',
                    text: 'Refreshing catalog matches...'
                }));
                void refreshCandidateRows().then(() => {
                    if (!candidateIsCataloged(candidate) && addedRecord) {
                        candidate.status = 'in-catalog';
                        candidate.catalogEntries = [{
                            key: addedRecord.key,
                            component: addedRecord.component,
                            category: addedRecord.category,
                            role: addedRecord.role
                        }];
                        const candidateRow = candidateRows.find((item) => item.candidate === candidate);
                        if (candidateRow) { refreshCandidateRow(candidateRow); }
                    }
                    pendingSourceUpdates.add(candidate);
                    updateHeadingStatus();
                    applyStatusFilter();
                    updateStatus();
                    showResult('Catalog record added to in-memory draft', {
                        message: `Cataloged line ${candidate.line}. Update its source line to complete this candidate; navigation remains available.`,
                        validation: state.validation
                    });
                    selectCatalogedCandidate(candidate, selectedButton);
                });
            }
        });
        const candidateStatus = element('select', { 'aria-label': 'Candidate status' });
        for (const status of ['potential', 'review', 'rejected', 'code-edit']) {
            candidateStatus.append(element('option', {
                value: status,
                text: CANDIDATE_STATUS_LABELS[status]
            }));
        }
        candidateStatus.value = candidate.status;
        const rejectButton = element('button', {
            type: 'button',
            className: 'candidate-status-action',
            text: 'Reject'
        });
        const nextLineButton = element('button', {
            type: 'button',
            className: 'candidate-status-action',
            text: 'Next (line)'
        });
        const previousLineButton = element('button', {
            type: 'button',
            className: 'candidate-status-action',
            text: 'Previous (line)'
        });
        rejectButton.disabled = candidate.status === 'rejected';
        candidateStatus.addEventListener('change', async () => {
            const previousStatus = candidate.status;
            const requestedStatus = candidateStatus.value;
            const updated = await updateCandidateStatus(candidate, requestedStatus, [candidateStatus, rejectButton, previousLineButton, nextLineButton]);
            if (!updated) { candidateStatus.value = previousStatus; }
            rejectButton.disabled = candidate.status === 'rejected';
            if (updated && ['rejected', 'code-edit'].includes(requestedStatus)) {
                selectNextCandidate(candidate, candidate.text);
            }
        });
        rejectButton.addEventListener('click', async () => {
            const updated = await updateCandidateStatus(candidate, 'rejected', [candidateStatus, rejectButton, previousLineButton, nextLineButton]);
            if (updated) {
                candidateStatus.value = 'rejected';
                selectNextCandidate(candidate, candidate.text);
            }
            rejectButton.disabled = candidate.status === 'rejected';
        });
        previousLineButton.addEventListener('click', () => selectPreviousCandidate(candidate));
        nextLineButton.addEventListener('click', () => selectNextCandidate(candidate));
        const statusActions = element('div', { className: 'candidate-status-actions' }, [
            rejectButton
        ]);
        const headingActions = element('div', { className: 'candidate-editor-heading-actions' }, [
            previousLineButton,
            nextLineButton
        ]);
        applyCandidateCatalogEditorLayout(catalogEditor, 'candidate-add-record', headingActions);
        const statusControls = element('div', { className: 'candidate-status-controls' }, [
            element('label', {}, [element('span', { text: 'Candidate status' }), candidateStatus]),
            statusActions
        ]);
        catalogEditor.insertBefore(statusControls, catalogEditor.children[1] || null);
        catalogEditor.insertBefore(
            createMigrationTransformPreview(
                file.path,
                candidate,
                {
                    catalogKey: suggestion.ok ? suggestion.suggestedKey : '',
                    catalogKeyControl: catalogEditor.querySelector('[name="key"]'),
                    onSourceReplaced: (result) => recordSourceReplacement(candidate, result)
                }
            ),
            catalogEditor.children[2] || null
        );
        editorHost.append(catalogEditor);
    };

    const editCatalogMatch = (candidate, selectedButton, recordKey) => {
        const record = state.views.catalog.records.find((entry) => entry.key === recordKey);
        if (!record) {
            showResult('Catalog record is no longer available', {
                error: `The catalog record ${recordKey} changed or no longer exists.`
            });
            selectCatalogedCandidate(candidate, selectedButton);
            return;
        }
        clear(editorHost);
        const editor = renderEditor('catalog', record, {
            title: 'Component Catalog Edit Record',
            clearText: 'Back to catalog matches',
            actionsAtTop: true,
            onClear: () => selectCatalogedCandidate(candidate, selectedButton),
            onSuccess: ({ nextRecord }) => {
                clear(editorHost);
                editorHost.append(element('p', {
                    className: 'empty-state',
                    text: 'Refreshing catalog matches...'
                }));
                void refreshCandidateRows().then((refreshed) => {
                    updateStatus();
                    showResult('Catalog record updated in memory', {
                        message: 'Use Save to persist the Component Catalog change.',
                        validation: state.validation
                    });
                    if (!refreshed) {
                        const updatedEntry = {
                            key: nextRecord.key,
                            component: nextRecord.component,
                            category: nextRecord.category,
                            role: nextRecord.role
                        };
                        candidate.catalogEntries = [
                            ...candidate.catalogEntries.filter((entry) => (
                                entry.key !== recordKey && entry.key !== nextRecord.key
                            )),
                            updatedEntry
                        ];
                        const candidateRow = candidateRows.find((item) => item.candidate === candidate);
                        if (candidateRow) { refreshCandidateRow(candidateRow); }
                    }
                    if (candidateIsCataloged(candidate)) {
                        selectCatalogedCandidate(candidate, selectedButton);
                    } else {
                        const candidateRow = candidateRows.find((item) => item.candidate === candidate);
                        if (candidateRow) { selectCandidateRow(candidateRow); }
                    }
                });
            }
        });
        const previousLineButton = element('button', {
            type: 'button',
            className: 'candidate-status-action',
            text: 'Previous (line)'
        });
        const nextLineButton = element('button', {
            type: 'button',
            className: 'candidate-status-action',
            text: 'Next (line)'
        });
        previousLineButton.addEventListener('click', () => selectPreviousCandidate(candidate));
        nextLineButton.addEventListener('click', () => selectNextCandidate(candidate));
        applyCandidateCatalogEditorLayout(editor, 'candidate-edit-record', element('div', {
            className: 'candidate-editor-heading-actions'
        }, [previousLineButton, nextLineButton]));
        editorHost.append(editor);
    };

    const selectCatalogedCandidate = (candidate, selectedButton) => {
        selectionRequest += 1;
        selectChoice(selectedButton);
        updateWorkflowNotice(candidate);
        clear(editorHost);
        const matchList = element('ul', { className: 'catalog-match-list' });
        for (const entry of candidate.catalogEntries) {
            const record = state.views.catalog.records.find((item) => item.key === entry.key);
            const current = record || { ...entry, text: candidate.text };
            const editRecord = element('button', {
                type: 'button',
                text: 'Edit Record',
                disabled: !record,
                'aria-label': `Edit catalog record ${entry.key}`
            });
            editRecord.addEventListener('click', () => {
                editCatalogMatch(candidate, selectedButton, entry.key);
            });
            matchList.append(element('li', { className: 'catalog-match-edit-row' }, [
                createReadOnlyCatalogRecord(current),
                editRecord
            ]));
        }
        const closeCandidates = element('button', {
            type: 'button',
            className: 'catalog-match-close',
            text: 'Close candidates'
        });
        const previousLineButton = element('button', {
            type: 'button',
            className: 'catalog-match-previous',
            text: 'Previous (line)'
        });
        const nextLineButton = element('button', {
            type: 'button',
            className: 'catalog-match-next',
            text: 'Next (line)'
        });
        closeCandidates.addEventListener('click', () => dialog.close());
        previousLineButton.addEventListener('click', () => selectPreviousCandidate(candidate));
        nextLineButton.addEventListener('click', () => selectNextCandidate(candidate));
        const matchStatus = element('p', {
            text: `Candidate status: ${CANDIDATE_STATUS_LABELS[candidate.status] || CANDIDATE_STATUS_LABELS['in-catalog']}`
        });
        const catalogStatuses = Array.from(new Set(candidate.catalogEntries
            .map((entry) => state.views.catalog.records.find((record) => record.key === entry.key)?.status)
            .filter(Boolean)));
        const catalogStatus = element('p', {
            text: `Catalog status: ${catalogStatuses.join(', ') || 'Unavailable'}`
        });
        const matchSummary = element('div', { className: 'catalog-match-summary' }, [
            element('h3', { text: 'Catalog Matches' }),
            matchStatus,
            catalogStatus,
            element('p', { text: candidate.text }),
            element('p', {
                className: 'field-help',
                text: 'Edit a matching record here without leaving All Candidates.'
            })
        ]);
        const matchActions = element('div', {
            className: 'catalog-match-actions'
        }, [closeCandidates, previousLineButton, nextLineButton]);
        const sourceTransform = candidateUsesCatalogFormat(candidate)
            ? element('p', {
                className: 'field-help',
                text: candidate.historical
                    ? 'This prior candidate is retained for analysis; the current source line already uses catalog.format.'
                    : 'This current key occurrence already uses catalog.format and needs no source transformation.'
            })
            : createMigrationTransformPreview(
                file.path,
                candidate,
                {
                    catalogKey: candidate.catalogEntries[0]?.key || '',
                    onSourceReplaced: (result) => recordSourceReplacement(candidate, result, matchStatus)
                }
            );
        editorHost.append(element('section', { className: 'card catalog-match-card' }, [
            element('div', { className: 'catalog-match-header' }, [matchSummary, matchActions]),
            sourceTransform,
            matchList
        ]));
    };

    const selectCandidateRow = (candidateRow) => {
        if (candidateIsCataloged(candidateRow.candidate)) {
            selectCatalogedCandidate(candidateRow.candidate, candidateRow.choice);
        } else {
            void selectEditableCandidate(candidateRow.candidate, candidateRow.choice);
        }
    };

    const sourceUpdateStatus = async (candidate) => {
        try {
            return await api.getMigrationSourceUpdateStatus({
                path: file.path,
                line: candidate.line,
                text: candidate.text
            });
        } catch (error) {
            return { ok: false, error: error.message };
        }
    };

    const warnIfSourceUpdatePending = async (candidate) => {
        if (!candidate || !pendingSourceUpdates.has(candidate)) { return; }
        const result = await sourceUpdateStatus(candidate);
        if (result.ok && result.sourceUpdated) {
            if (candidate.status !== 'code-updated') {
                await updateCandidateStatus(candidate, 'code-edit');
            }
            for (const pendingCandidate of pendingSourceUpdates) {
                if (pendingCandidate.text === candidate.text) {
                    pendingSourceUpdates.delete(pendingCandidate);
                }
            }
            updateWorkflowNotice();
            return;
        }
        const detail = result.ok
            ? `The source still contains the cataloged string from line ${candidate.line}: ${candidate.text}`
            : `The source update for line ${candidate.line} could not be verified: ${result.error || 'Unknown error'}`;
        showResult('Cataloged source still needs an update', {
            message: `${detail}. Navigation will continue; source updates are recommended but not enforced.`
        });
        workflowNotice.textContent = `Source update remains pending. ${detail}. Navigation continued.`;
        workflowNotice.hidden = false;
    };

    const warnForPendingSourceUpdates = async () => {
        const unresolved = [];
        for (const candidate of pendingSourceUpdates) {
            const result = await sourceUpdateStatus(candidate);
            if (result.ok && result.sourceUpdated) {
                if (candidate.status !== 'code-updated') {
                    await updateCandidateStatus(candidate, 'code-edit');
                }
                pendingSourceUpdates.delete(candidate);
            } else {
                unresolved.push(candidate);
            }
        }
        if (unresolved.length > 0) {
            showResult('Cataloged sources still need updates', {
                message: `${unresolved.length} cataloged candidate(s) still contain their original source string or could not be verified. Closing continues without enforcement.`
            });
        }
    };

    const selectCandidateRowAfterWarning = async (candidateRow) => {
        const currentRow = candidateRows.find((item) => item.choice.classList.contains('selected'));
        if (currentRow && currentRow !== candidateRow) {
            await warnIfSourceUpdatePending(currentRow.candidate);
        }
        selectCandidateRow(candidateRow);
    };

    const selectNextCandidate = async (currentCandidate, skipText = null) => {
        await warnIfSourceUpdatePending(currentCandidate);
        const currentIndex = candidateRows.findIndex((candidateRow) => candidateRow.candidate === currentCandidate);
        const nextIndex = uiState.nextCandidateIndex(
            candidateRows.map((candidateRow) => candidateRow.candidate),
            currentIndex,
            statusFilter.value,
            skipText
        );
        if (nextIndex >= 0) {
            selectCandidateRow(candidateRows[nextIndex]);
            return;
        }
        selectionRequest += 1;
        selectChoice(null);
        updateWorkflowNotice();
        clear(editorHost);
        editorHost.append(element('section', { className: 'card' }, [
            element('h3', { text: 'Candidate Details' }),
            element('p', {
                className: 'empty-state',
                text: 'No next candidate matches the current status filter.'
            })
        ]));
    };

    const selectPreviousCandidate = async (currentCandidate, skipText = null) => {
        await warnIfSourceUpdatePending(currentCandidate);
        const currentIndex = candidateRows.findIndex((candidateRow) => candidateRow.candidate === currentCandidate);
        const previousIndex = uiState.previousCandidateIndex(
            candidateRows.map((candidateRow) => candidateRow.candidate),
            currentIndex,
            statusFilter.value,
            skipText
        );
        if (previousIndex >= 0) {
            selectCandidateRow(candidateRows[previousIndex]);
            return;
        }
        selectionRequest += 1;
        selectChoice(null);
        updateWorkflowNotice();
        clear(editorHost);
        editorHost.append(element('section', { className: 'card' }, [
            element('h3', { text: 'Candidate Details' }),
            element('p', {
                className: 'empty-state',
                text: 'No previous candidate matches the current status filter.'
            })
        ]));
    };

    const allCandidates = allMigrationCandidates(file);

    for (const candidate of allCandidates) {
        const choice = element('button', {
            type: 'button',
            className: `candidate-choice ${candidate.status}`,
            'aria-pressed': 'false'
        }, migrationCandidateContent(candidate));
        choice.addEventListener('click', () => {
            void selectCandidateRowAfterWarning(
                candidateRows.find((candidateRow) => candidateRow.candidate === candidate)
            );
        });
        choiceButtons.push(choice);
        const row = element('div', { className: 'candidate-choice-row' }, [
            choice,
            createOpenMigrationSourceButton(file.path, candidate, api.openMigrationSource)
        ]);
        candidateRows.push({ candidate, choice, row });
        choices.append(row);
    }
    if (allCandidates.length === 0) {
        choices.append(element('p', { className: 'empty-state', text: 'No migration candidates were reported for this file.' }));
        editorHost.append(element('section', { className: 'card' }, [
            element('h3', { text: 'Candidate Details' }),
            element('p', { className: 'empty-state', text: 'Select a reported candidate to review its status.' })
        ]));
    }

    candidatePane.append(choices);
    const layout = element('div', { className: 'candidate-dialog-layout' }, [candidatePane, editorHost]);
    splitter.attach(layout, {
        key: 'language-all-candidates',
        firstPane: candidatePane,
        secondPane: editorHost,
        minimumStart: 360,
        minimumEnd: 340,
        defaultFraction: 0.54,
        label: 'Resize candidate list and candidate editor'
    });
    dialog.append(heading, workflowNotice, layout);
    dialog.addEventListener('close', () => {
        void warnForPendingSourceUpdates();
        dialog.remove();
    }, { once: true });
    document.body.append(dialog);
    dialog.showModal();
    if (allCandidates[0]) {
        selectCandidateRow(candidateRows[0]);
    }
}

function changeView(view) {
    if (view === currentView) { return; }
    if (!uiState.mayLeaveCurrentView(state.dirty, (message) => window.confirm(message))) { return; }
    currentView = view;
    editingIdentity = null;
    editingLocaleId = null;
    searchQuery = '';
    render();
}

function renderLocalesView() {
    const addButton = element('button', { text: 'Add locale', className: 'primary', type: 'button' });
    addButton.addEventListener('click', () => {
        editingLocaleId = '';
        renderLocalesView();
    });
    const heading = element('div', { className: 'view-heading' }, [
        element('div', {}, [
            element('h2', { text: 'Locales' }),
            element('p', {
                text: 'Maintains language/locales/locales.json. Deleting a locale preserves authored source files and keeps generated catalog data by default.'
            })
        ]),
        addButton
    ]);
    const body = element('div', { className: 'split-view' });
    const tableCard = element('section', { className: 'card' });
    const tableWrap = element('div', { className: 'table-wrap' });
    const table = element('table');
    const headRow = element('tr');
    for (const title of ['ID', 'English name', 'Native name', 'Direction', 'Status']) {
        headRow.append(element('th', { text: title }));
    }
    table.append(element('thead', {}, [headRow]));
    const tbody = element('tbody');
    for (const locale of state.locales) {
        const row = element('tr', {
            className: editingLocaleId === locale.id ? 'selected' : '',
            tabindex: '0'
        });
        for (const value of [locale.id, locale.englishName, locale.nativeName, locale.direction, locale.status]) {
            row.append(element('td', { text: value }));
        }
        const selectLocale = () => {
            editingLocaleId = locale.id;
            for (const tableRow of tbody.children) {
                tableRow.classList.toggle('selected', tableRow === row);
            }
            const nextEditor = renderLocaleEditor(locale, false);
            body.replaceChild(nextEditor, localeEditor);
            localeEditor = nextEditor;
        };
        row.addEventListener('click', selectLocale);
        row.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                selectLocale();
            }
        });
        tbody.append(row);
    }
    table.append(tbody);
    tableColumns.attach(table, {
        key: 'language-locales-registry',
        minimumWidth: 86
    });
    tableWrap.append(table);
    tableCard.append(tableWrap);

    const selected = editingLocaleId
        ? state.locales.find((locale) => locale.id === editingLocaleId) || null
        : null;
    let localeEditor = renderLocaleEditor(selected, editingLocaleId === '');
    body.append(tableCard, localeEditor);
    splitter.attach(body, {
        key: 'language-locales',
        firstPane: tableCard,
        secondPane: localeEditor,
        minimumStart: 320,
        minimumEnd: 330,
        defaultFraction: 0.52,
        label: 'Resize locale list and locale editor'
    });
    clear(workspace);
    workspace.append(heading, body);
}

function renderLocaleEditor(locale, isNew) {
    const card = element('section', { className: 'card' });
    if (!locale && !isNew) {
        card.append(element('div', { className: 'empty-state', text: 'Select a locale or add a new one.' }));
        return card;
    }
    const current = locale || {
        id: '',
        englishName: '',
        nativeName: '',
        direction: 'ltr',
        status: 'native-review-required',
        notes: ''
    };
    card.append(element('h3', { text: isNew ? 'Add locale' : `Edit ${current.id}` }));
    const form = element('form', { className: 'editor-form' });
    const controls = {};
    let availableTemplates = [];
    if (isNew) {
        const registeredIds = new Set(state.locales.map((item) => item.id));
        availableTemplates = state.localeTemplates.filter((item) => !registeredIds.has(item.id));
        controls.template = element('select', {
            name: 'localeTemplate',
            required: '',
            'aria-label': 'Locale template'
        });
        controls.template.append(element('option', {
            value: '',
            text: availableTemplates.length > 0
                ? 'Select a locale template'
                : 'All canonical locale templates are already registered'
        }));
        for (const template of state.localeTemplates) {
            const registered = registeredIds.has(template.id);
            controls.template.append(element('option', {
                value: template.id,
                text: [
                    template.id,
                    template.englishName,
                    template.nativeName,
                    template.direction,
                    template.status
                ].join(' — ') + (registered ? ' — already registered' : ''),
                disabled: registered
            }));
        }
        form.append(element('label', { className: 'required' }, [
            element('span', { text: 'Locale template' }),
            controls.template,
            element('span', {
                className: 'field-help',
                text: 'Choices mirror language/canonical/language-locales.json. Registered locales remain visible but cannot be selected.'
            })
        ]));
    }
    const addTextField = (name, title, required = true) => {
        controls[name] = element('input', {
            name,
            value: current[name] || '',
            required: required ? '' : null,
            disabled: name === 'id' && !isNew
        });
        if (name === 'id' && isNew) { controls[name].readOnly = true; }
        form.append(element('label', { className: required ? 'required' : '' }, [
            element('span', { text: title }),
            controls[name]
        ]));
    };
    addTextField('id', 'Locale ID');
    addTextField('englishName', 'English name');
    addTextField('nativeName', 'Native name');

    controls.direction = element('select', { name: 'direction' }, [
        element('option', { value: 'ltr', text: 'Left to right (ltr)' }),
        element('option', { value: 'rtl', text: 'Right to left (rtl)' })
    ]);
    controls.direction.value = current.direction;
    form.append(element('label', { className: 'required' }, [
        element('span', { text: 'Text direction' }),
        controls.direction
    ]));

    controls.status = element('select', { name: 'status' });
    for (const status of ['draft', 'machine-generated', 'native-review-required', 'reviewed', 'approved', 'deprecated']) {
        controls.status.append(element('option', { value: status, text: status }));
    }
    controls.status.value = current.status;
    form.append(element('label', { className: 'required' }, [
        element('span', { text: 'Status' }),
        controls.status
    ]));

    controls.notes = element('textarea', { name: 'notes', text: current.notes || '' });
    form.append(element('label', {}, [element('span', { text: 'Notes' }), controls.notes]));

    if (isNew) {
        controls.template.addEventListener('change', () => {
            const template = state.localeTemplates.find((item) => item.id === controls.template.value);
            if (!template) { return; }
            controls.id.value = template.id;
            controls.englishName.value = template.englishName;
            controls.nativeName.value = template.nativeName;
            controls.direction.value = template.direction;
            controls.status.value = template.status;
            controls.notes.value = template.notes || '';
        });
    }

    const saveButton = element('button', {
        type: 'submit',
        className: 'primary',
        text: isNew ? 'Add locale' : 'Apply changes',
        disabled: isNew && availableTemplates.length === 0
    });
    const cancelButton = element('button', { type: 'button', text: 'Cancel' });
    cancelButton.addEventListener('click', () => {
        editingLocaleId = null;
        renderLocalesView();
    });
    const actions = element('div', { className: 'locale-actions' }, [saveButton, cancelButton]);
    if (!isNew) {
        const required = state.requiredLocales.includes(current.id);
        const deleteButton = element('button', {
            type: 'button',
            className: 'danger-quiet',
            text: 'Delete locale',
            disabled: required
        });
        if (required) {
            deleteButton.title = 'This locale is required by the language builder.';
            actions.append(element('span', { className: 'locale-required', text: 'Required locale' }));
        }
        deleteButton.addEventListener('click', async () => {
            const result = await api.deleteLocale(current.id);
            if (result.cancelled) { return; }
            if (result.ok && result.state) {
                state = result.state;
                editingLocaleId = null;
                showResult('Locale deleted from registry', {
                    message: result.catalogRemovalScheduled
                        ? `Generated catalog ${current.id} will be deleted when you Save.`
                        : `Generated catalog ${current.id} will be preserved.`,
                    generatedCatalogRemovals: result.catalogRemovalScheduled
                        ? [`build/language/catalogs/${current.id}`]
                        : [],
                    validation: state.validation
                });
                render();
            } else {
                showResult('Unable to delete locale', result);
            }
        });
        actions.append(deleteButton);
    }
    form.append(actions);
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const result = await api.applyLocale({
            originalId: isNew ? null : current.id,
            locale: {
                id: controls.id.value,
                englishName: controls.englishName.value,
                nativeName: controls.nativeName.value,
                direction: controls.direction.value,
                status: controls.status.value,
                notes: controls.notes.value
            }
        });
        if (result.ok && result.state) {
            state = result.state;
            editingLocaleId = controls.id.value.trim();
            showResult(isNew ? 'Locale added' : 'Locale updated', { validation: state.validation });
            render();
        } else {
            showResult('Unable to apply locale', result);
        }
    });
    card.append(form);
    return card;
}

function relatedFor(view, record) {
    if (view === 'diagnostics') {
        return state.catalogByKey[record.messageKey] || {};
    }
    return {};
}

function filteredRecords(view) {
    const definition = state.views[view];
    return definition.records.filter((record) => {
        if (definition.componentScoped && !uiState.matchesComponentScope(record, selectedComponent)) {
            return false;
        }
        return uiState.matchesSearch(record, searchQuery, relatedFor(view, record));
    });
}

function renderDataView(view) {
    const definition = state.views[view];
    const registryUsage = view === 'categories'
        ? state.categoryUsage
        : (view === 'roles' ? state.roleUsage : null);
    const registryCountSummary = registryUsage
        ? `${definition.records.filter((record) => registryUsage[record.id] > 0).length} existing, ${definition.records.filter((record) => !registryUsage[record.id]).length} recommended`
        : null;
    const heading = element('div', { className: 'view-heading data-view-toolbar' }, [
        element('div', { className: 'view-title-line' }, [
            element('h2', { text: definition.title }),
            element('p', { text: definition.componentScoped
                ? (selectedComponent == null
                    ? 'Showing records from all components'
                    : `Filtered to component: ${selectedComponent}`)
                : (registryCountSummary || `Maintains ${definition.file}`) })
        ])
    ]);
    const search = element('input', { type: 'search', value: searchQuery, placeholder: 'Search all fields', 'aria-label': `Search ${definition.title}` });
    const searchLabel = element('label', { className: 'inline-search' }, [element('span', { text: 'Search and filter' }), search]);
    search.addEventListener('input', () => {
        searchQuery = search.value;
        renderDataViewBody(body, view);
    });
    const addButton = element('button', {
        text: view === 'categories' ? 'Add category' : (view === 'roles' ? 'Add role' : 'Add record'),
        className: 'primary'
    });
    if (definition.componentScoped && selectedComponent == null) {
        addButton.disabled = true;
        addButton.title = 'Select a specific component before adding a record.';
    }
    addButton.addEventListener('click', () => {
        editingIdentity = null;
        renderDataViewBody(body, view, {});
    });
    heading.append(searchLabel, addButton);
    if (view === 'previewModes') {
        const defaultSelect = element('select', { 'aria-label': 'Default preview mode' });
        for (const mode of definition.records) {
            defaultSelect.append(element('option', { value: mode.id, text: mode.id }));
        }
        defaultSelect.value = state.previewDefaultMode;
        defaultSelect.addEventListener('change', async () => {
            const result = await api.setPreviewDefault(defaultSelect.value);
            handleStateResult('Set preview default', result);
        });
        heading.append(element('label', { className: 'inline-search' }, [element('span', { text: 'Default preview mode' }), defaultSelect]));
    }
    const body = element('div', { className: 'data-view-body' });
    workspace.append(heading, body);
    renderDataViewBody(body, view);
}

function renderDataViewBody(container, view, explicitRecord) {
    clear(container);
    const definition = state.views[view];
    const records = filteredRecords(view);
    let record = explicitRecord;
    if (record === undefined && editingIdentity != null) {
        record = definition.records.find((item) => item[definition.identityKey] === editingIdentity);
    }
    const split = element('div', { className: 'split-view data-view-split' });
    const scrollKey = `${view}\0${selectedComponent ?? ALL_COMPONENTS_VALUE}\0${searchQuery}`;
    const renderIndependentEditor = (selectedRecord) => {
        const editor = renderEditor(view, selectedRecord);
        editor.classList.add('data-view-editor-card');
        return editor;
    };
    let editorCard = renderIndependentEditor(record || null);
    const tableCard = renderTable(view, records, (selectedRecord, selectedRow) => {
        editingIdentity = selectedRecord[definition.identityKey];
        for (const row of tableCard.querySelectorAll('tbody tr')) {
            row.classList.toggle('selected', row === selectedRow);
        }
        const tableWrap = tableCard.querySelector('.table-wrap');
        const listScrollTop = tableWrap?.scrollTop || 0;
        const nextEditor = renderIndependentEditor(selectedRecord);
        split.replaceChild(nextEditor, editorCard);
        editorCard = nextEditor;
        if (tableWrap) { tableWrap.scrollTop = listScrollTop; }
    }, scrollKey);
    split.append(tableCard, editorCard);
    splitter.attach(split, {
        key: `language-data-${view}`,
        firstPane: tableCard,
        secondPane: editorCard,
        minimumStart: 380,
        minimumEnd: 320,
        defaultFraction: 0.58,
        label: `Resize ${definition.title} list and editor`
    });
    container.append(split);
}

function visibleColumns(view) {
    const schemaProperties = Object.keys(state.views[view].schema.properties || {});
    const preferred = {
        catalog: ['key', 'category', 'role', 'text', 'status'],
        categories: ['id', 'classification', 'description'],
        roles: ['id', 'classification', 'description'],
        diagnostics: ['code', 'severity', 'messageKey', 'status'],
        keywords: ['id', 'canonical', 'category', 'parent', 'status'],
        previewModes: ['id', 'description', 'status']
    }[view];
    return preferred.filter((field) => field === 'classification' || schemaProperties.includes(field));
}

function displayValue(value) {
    if (Array.isArray(value)) { return value.join(', '); }
    if (value && typeof value === 'object') { return JSON.stringify(value); }
    return value == null ? '' : String(value);
}

function renderTable(view, records, selectRecord, scrollKey) {
    const card = element('section', { className: 'card data-view-list-card' });
    card.append(element('h3', { text: `${records.length} record(s)` }));
    if (!records.length) {
        card.append(element('p', { className: 'empty-state', text: 'No records match the current filters.' }));
        return card;
    }
    const columns = visibleColumns(view);
    const table = element('table');
    const headRow = element('tr');
    for (const column of columns) { headRow.append(element('th', { text: column })); }
    table.append(element('thead', {}, [headRow]));
    const tbody = element('tbody');
    const identityKey = state.views[view].identityKey;
    for (const record of records) {
        const row = element('tr', { className: record[identityKey] === editingIdentity ? 'selected' : '' });
        for (const column of columns) {
            const cell = element('td');
            const usage = view === 'roles' ? state.roleUsage : state.categoryUsage;
            const value = column === 'classification'
                ? (usage[record.id] > 0
                    ? `Existing (${usage[record.id]} record(s))`
                    : 'Recommended')
                : displayValue(record[column]);
            cell.append(column === identityKey ? element('code', { text: value }) : document.createTextNode(value));
            row.append(cell);
        }
        row.addEventListener('click', () => {
            selectRecord(record, row);
        });
        tbody.append(row);
    }
    table.append(tbody);
    tableColumns.attach(table, {
        key: `language-data-${view}`,
        minimumWidth: 84
    });
    const tableWrap = element('div', { className: 'table-wrap' }, [table]);
    tableWrap.scrollTop = dataViewListScrollPositions.get(scrollKey) || 0;
    tableWrap.addEventListener('scroll', () => {
        dataViewListScrollPositions.set(scrollKey, tableWrap.scrollTop);
    });
    card.append(tableWrap);
    return card;
}

function createField(view, fieldName, fieldSchema, record, required) {
    const labelText = element('span', { text: fieldName, className: required ? 'required' : '' });
    let control;
    const current = record[fieldName];
    if (fieldSchema.enum) {
        control = element('select', { name: fieldName });
        if (!required) { control.append(element('option', { value: '', text: '(not set)' })); }
        for (const value of fieldSchema.enum) {
            control.append(element('option', { value, text: value }));
        }
        control.value = current ?? '';
    } else if (view === 'catalog' && fieldName === 'category') {
        control = element('select', { name: fieldName });
        if (!current) {
            control.append(element('option', {
                value: '',
                text: '(select a category)',
                disabled: true
            }));
        }
        for (const [label, predicate] of [
            ['Existing Categories', (category) => state.categoryUsage[category.id] > 0],
            ['Recommended Categories', (category) => !state.categoryUsage[category.id]]
        ]) {
            const group = element('optgroup', { label });
            const categories = state.views.categories.records
                .filter(predicate)
                .sort((left, right) => left.id.localeCompare(right.id));
            for (const category of categories) {
                group.append(element('option', {
                    value: category.id,
                    text: `${category.id} — ${category.description}`
                }));
            }
            control.append(group);
        }
        control.value = current || '';
    } else if (view === 'catalog' && fieldName === 'role') {
        control = element('select', { name: fieldName });
        if (!current) {
            control.append(element('option', {
                value: '',
                text: '(select a role)',
                disabled: true
            }));
        }
        for (const [label, predicate] of [
            ['Existing Roles', (role) => state.roleUsage[role.id] > 0],
            ['Recommended Roles', (role) => !state.roleUsage[role.id]]
        ]) {
            const group = element('optgroup', { label });
            const roles = state.views.roles.records
                .filter(predicate)
                .sort((left, right) => left.id.localeCompare(right.id));
            for (const role of roles) {
                group.append(element('option', {
                    value: role.id,
                    text: `${role.id} — ${role.description}`
                }));
            }
            control.append(group);
        }
        control.value = current || '';
    } else if (fieldName === 'component') {
        control = element('select', { name: fieldName });
        if (!current && selectedComponent == null) {
            control.append(element('option', {
                value: '',
                text: '(select a component)',
                disabled: true
            }));
        }
        for (const component of state.components) {
            control.append(element('option', { value: component.id, text: component.id }));
        }
        control.value = current || selectedComponent || '';
    } else if (view === 'diagnostics' && fieldName === 'messageKey') {
        control = element('select', { name: fieldName });
        for (const key of Object.keys(state.catalogByKey).sort()) {
            control.append(element('option', { value: key, text: key }));
        }
        control.value = current || '';
    } else if (fieldSchema.type === 'array') {
        control = element('textarea', { name: fieldName, 'data-kind': 'array', value: '' });
        control.value = Array.isArray(current) ? current.join('\n') : '';
    } else if (fieldSchema.type === 'boolean') {
        control = element('input', { name: fieldName, type: 'checkbox', checked: current === true, 'data-kind': 'boolean' });
    } else if (fieldSchema.type === 'number' || fieldSchema.type === 'integer') {
        control = element('input', { name: fieldName, type: 'number', value: current ?? '', 'data-kind': fieldSchema.type });
    } else if (['text', 'description', 'notes'].includes(fieldName)) {
        control = element('textarea', { name: fieldName });
        control.value = current ?? '';
    } else {
        control = element('input', { name: fieldName, type: 'text', value: current ?? '' });
    }
    if (required) { control.required = true; }
    const label = element('label', {}, [labelText, control]);
    if (fieldSchema.description) {
        label.append(element('span', { className: 'field-help', text: fieldSchema.description }));
    }
    return { label, control };
}

function createReadOnlyCatalogRecord(record) {
    const definition = state.views.catalog;
    const schema = definition.schema;
    const fields = element('div', {
        className: 'catalog-match-record editor-form',
        'aria-label': `Catalog record ${record.key || ''}`.trim()
    });
    for (const [fieldName, fieldSchema] of Object.entries(schema.properties || {})) {
        const field = createField('catalog', fieldName, fieldSchema, record, false);
        field.control.tabIndex = -1;
        field.control.setAttribute('aria-readonly', 'true');
        if (field.control.matches('select, input[type="checkbox"]')) {
            field.control.disabled = true;
        } else {
            field.control.readOnly = true;
        }
        fields.append(field.label);
    }
    return fields;
}

function renderEditor(view, record, options = {}) {
    const definition = state.views[view];
    const card = element('section', { className: 'card' });
    const isNew = options.isNew === true || !(record && record[definition.identityKey]);
    card.append(element('h3', {
        text: options.title || (view === 'categories' || view === 'roles'
            ? (isNew ? `Add ${view === 'categories' ? 'category' : 'role'}` : `Edit ${view === 'categories' ? 'category' : 'role'}`)
            : (isNew ? 'Add record' : 'Edit record'))
    }));
    const form = element('form', { className: 'editor-form' });
    const schema = definition.schema;
    const controls = new Map();
    for (const [fieldName, fieldSchema] of Object.entries(schema.properties || {})) {
        const field = createField(view, fieldName, fieldSchema, record || {}, (schema.required || []).includes(fieldName));
        controls.set(fieldName, field.control);
        form.append(field.label);
        if (view === 'catalog' && fieldName === 'text') {
            const normalizedControl = element('textarea', {
                name: 'normalizedText',
                readonly: 'readonly',
                'aria-label': 'Normalized text'
            });
            const applyNormalized = element('button', {
                type: 'button',
                text: 'Apply normalized text'
            });
            const updateNormalized = () => {
                normalizedControl.value = textNormalizer.normalizeText(
                    field.control.value,
                    state.normalizedWords
                );
                applyNormalized.disabled = normalizedControl.value === field.control.value;
            };
            applyNormalized.addEventListener('click', () => {
                field.control.value = normalizedControl.value;
                field.control.dispatchEvent(new Event('input', { bubbles: true }));
            });
            field.control.addEventListener('input', updateNormalized);
            updateNormalized();
            form.append(element('div', { className: 'normalization-field' }, [
                element('label', {}, [
                    element('span', { text: 'Normalized text' }),
                    normalizedControl,
                    element('span', {
                        className: 'field-help',
                        text: 'Translation-oriented preview using canonical word substitutions.'
                    })
                ]),
                applyNormalized
            ]));
        }
    }

    if (view === 'catalog' && !isNew) {
        const keyControl = controls.get(definition.identityKey);
        keyControl.readOnly = true;
        keyControl.title = 'Existing catalog keys cannot be renamed. Add a new record to use another key.';
    }

    if (view === 'catalog' && isNew && Object.prototype.hasOwnProperty.call(options, 'suggestedKey')) {
        const baseSuggestedKey = options.suggestedKey || '';
        const suggestedControl = element('input', {
            type: 'text',
            value: '',
            readonly: 'readonly',
            'aria-label': 'Suggested key'
        });
        const applySuggested = element('button', {
            type: 'button',
            text: 'Use suggested key',
            disabled: true
        });
        const updateSuggestedKey = () => {
            suggestedControl.value = uiState.catalogKeyWithCategory(
                baseSuggestedKey,
                controls.get('category')?.value
            );
            applySuggested.disabled = !suggestedControl.value;
        };
        applySuggested.addEventListener('click', () => {
            const keyControl = controls.get('key');
            keyControl.value = suggestedControl.value;
            keyControl.dispatchEvent(new Event('input', { bubbles: true }));
            keyControl.focus();
        });
        controls.get('category')?.addEventListener('change', updateSuggestedKey);
        updateSuggestedKey();
        const strategyText = {
            'json-path': 'Derived from the JSON property path.',
            'javascript-context': 'Derived from the JavaScript function and expression context.'
        }[options.suggestionStrategy];
        form.prepend(element('div', { className: 'suggested-key-field' }, [
            element('label', {}, [
                element('span', { text: 'Suggested key' }),
                suggestedControl,
                element('span', {
                    className: 'field-help',
                    text: strategyText || options.suggestionError || 'No stable source construct was found.'
                })
            ]),
            applySuggested
        ]));
    }

    if (view === 'diagnostics' && controls.has('messageKey') && controls.has('placeholders')) {
        const syncExpected = () => {
            const expected = state.catalogByKey[controls.get('messageKey').value]?.placeholders || [];
            controls.get('placeholders').value = expected.join('\n');
            controls.get('placeholders').readOnly = true;
            controls.get('placeholders').title = 'Derived from the selected canonical catalog message.';
        };
        controls.get('messageKey').addEventListener('change', syncExpected);
        syncExpected();
    }

    if (view === 'catalog' && controls.has('text') && controls.has('placeholders')) {
        const detected = element('p', { className: 'field-help' });
        const updateDetected = () => {
            const names = Array.from(controls.get('text').value.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g), (match) => match[1]);
            detected.textContent = `Detected placeholders: ${Array.from(new Set(names)).sort().join(', ') || '(none)'}`;
        };
        controls.get('text').addEventListener('input', updateDetected);
        updateDetected();
        form.append(detected);
    }

    const submit = element('button', { type: 'submit', className: 'primary', text: 'Apply to in-memory draft' });
    const cancel = element('button', { type: 'button', text: options.clearText || 'Clear editor' });
    cancel.addEventListener('click', () => {
        if (typeof options.onClear === 'function') {
            options.onClear();
            return;
        }
        editingIdentity = null;
        render();
    });
    const actions = element('div', {
        className: options.actionsAtTop ? 'form-actions form-actions-top' : 'form-actions'
    }, [submit, cancel]);
    if (options.actionsAtTop) {
        form.prepend(actions);
    } else {
        form.append(actions);
    }
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        submit.disabled = true;
        cancel.disabled = true;
        const nextRecord = {};
        const removedFields = [];
        const requiredFields = new Set(schema.required || []);
        for (const [fieldName, control] of controls) {
            const fieldSchema = schema.properties[fieldName];
            if (control.dataset.kind === 'array') {
                nextRecord[fieldName] = control.value.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
            } else if (control.dataset.kind === 'boolean') {
                nextRecord[fieldName] = control.checked;
            } else if (control.dataset.kind === 'number' || control.dataset.kind === 'integer') {
                if (control.value === '' && !requiredFields.has(fieldName)) { removedFields.push(fieldName); }
                else { nextRecord[fieldName] = Number(control.value); }
            } else if (control.value === '' && !requiredFields.has(fieldName)) {
                removedFields.push(fieldName);
            } else {
                nextRecord[fieldName] = control.value;
            }
            if (fieldSchema.type === 'integer' && nextRecord[fieldName] != null) {
                nextRecord[fieldName] = Math.trunc(nextRecord[fieldName]);
            }
        }
        let result;
        try {
            result = await api.applyRecord({
                view,
                originalIdentity: isNew ? null : record[definition.identityKey],
                record: nextRecord,
                removedFields
            });
        } catch (error) {
            result = { ok: false, error: error.message };
        }
        if (result.ok) {
            state = result.state;
            editingIdentity = nextRecord[definition.identityKey];
            if (typeof options.onSuccess === 'function') {
                options.onSuccess({ nextRecord, result });
                return;
            }
            showResult('Draft updated', { validation: state.validation });
            render();
        } else {
            submit.disabled = false;
            cancel.disabled = false;
            showResult('Record rejected', {
                validation: {
                    ok: false,
                    errors: result.errors || [{ path: '/', message: result.error || 'Unable to update the in-memory draft.' }],
                    warnings: result.warnings || []
                }
            });
        }
    });
    card.append(form);
    return card;
}

function handleStateResult(title, result) {
    if (result.ok && result.state) {
        state = result.state;
        showResult(title, { validation: state.validation });
        render();
    } else {
        showResult(title, result);
    }
}

async function initialize() {
    if (!api) {
        throw new Error('The restricted preload bridge is unavailable.');
    }
    const loaded = await api.load();
    if (loaded.ok === false) { throw new Error(loaded.error || 'Unable to load language data.'); }
    state = loaded;
    selectedComponent = null;
    render();
}

for (const button of document.querySelectorAll('.nav-button')) {
    button.addEventListener('click', () => changeView(button.dataset.view));
}

document.getElementById('save-button').addEventListener('click', async () => {
    const buildRequest = { useDeepL: allowDeepLApiCalls };
    const initialMessage = allowDeepLApiCalls
        ? 'Preparing save with DeepL API calls enabled'
        : 'Preparing normalized save with DeepL disabled';
    const outcome = await runProgressOperation('save', 'Saving language data', initialMessage, async () => {
        const preview = await api.previewSave();
        if (!preview.validation?.ok) { return { title: 'Save blocked', result: preview }; }
        if (preview.languageReportDirty) {
            return {
                title: 'Save the report artifact separately',
                result: {
                    ...preview,
                    error: 'Use Save report artifact in the Language Report view before saving canonical language data.'
                }
            };
        }
        if (!preview.authoritativeFiles.length) { return { title: 'Nothing to save', result: preview }; }
        setProgressStatus('Waiting for save confirmation');
        const confirmation = await api.confirmSave(preview);
        if (!confirmation.confirmed) { return { cancelled: true }; }
        setProgressStatus('Starting save and rebuild');
        const result = await api.save(buildRequest);
        return {
            title: result.ok ? 'Save and build succeeded' : 'Save failed and was rolled back',
            result
        };
    });
    if (outcome.cancelled) { return; }
    if (outcome.result.state) {
        state = outcome.result.state;
        languageReportState = null;
    }
    showResult(outcome.title, outcome.result);
    render();
});

document.getElementById('revert-button').addEventListener('click', async () => {
    if (state.dirty && !window.confirm('Discard all in-memory changes?')) { return; }
    const outcome = await runProgressOperation(
        'revert',
        'Reverting language data',
        'Restoring the last loaded draft and validating it',
        async () => {
            await waitForUiPaint();
            const revertedState = await api.revert();
            if (revertedState?.ok === false) {
                return { title: 'Revert failed', result: revertedState };
            }
            return {
                title: 'Draft reverted',
                result: { ok: true, state: revertedState, validation: revertedState.validation }
            };
        }
    );
    if (outcome.result.state) {
        state = outcome.result.state;
        editingIdentity = null;
        languageReportState = null;
        render();
    }
    showResult(outcome.title, outcome.result);
});

document.getElementById('validate-button').addEventListener('click', async () => {
    const validation = await api.validate();
    state.validation = validation;
    showResult('Validation result', { validation });
    updateStatus();
});

document.getElementById('rebuild-button').addEventListener('click', async () => {
    const buildRequest = { useDeepL: allowDeepLApiCalls };
    const initialMessage = allowDeepLApiCalls
        ? 'Preparing rebuild with DeepL API calls enabled'
        : 'Preparing normalized rebuild with DeepL disabled';
    const outcome = await runProgressOperation('rebuild', 'Rebuilding language outputs', initialMessage, async () => {
        const result = await api.rebuild(buildRequest);
        return {
            title: result.ok ? 'Language rebuild succeeded' : 'Language rebuild failed',
            result
        };
    });
    if (outcome.result.ok) {
        languageReportState = null;
        render();
    }
    showResult(outcome.title, outcome.result);
});

document.getElementById('reload-button').addEventListener('click', async () => {
    const result = await api.reload();
    if (result.ok && result.state) {
        state = result.state;
        editingIdentity = null;
        languageReportState = null;
        showResult('Language data reloaded', { validation: state.validation });
        render();
    }
});

document.getElementById('exit-button').addEventListener('click', () => api.exit());
document.getElementById('close-result').addEventListener('click', () => {
    resultDock.setEnabled(false);
    resultPanel.hidden = true;
});
sidebarToggle.addEventListener('click', () => {
    sidebarCollapsed = !sidebarCollapsed;
    updateSidebarVisibility();
});
homeButton.addEventListener('click', () => changeView('main'));
deepLCheckbox.addEventListener('change', () => {
    allowDeepLApiCalls = deepLCheckbox.checked;
});
cancelBuildButton.addEventListener('click', async () => {
    cancelBuildButton.disabled = true;
    setProgressStatus('Stopping language build');
    const result = await api.cancelBuild();
    if (!result.ok && result.error) { setProgressStatus(result.error); }
});
progressDialog.addEventListener('cancel', (event) => event.preventDefault());
api?.onProgress?.(handleProgress);

updateSidebarVisibility();
initialize().catch((error) => showResult('Application failed to start', { error: error.message }));
