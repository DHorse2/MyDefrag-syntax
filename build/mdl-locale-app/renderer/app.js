'use strict';

const api = window.localeMaintenance;
const splitter = window.MdlSplitter;
const tableColumns = window.MdlTableColumns;
const {
    matchesSearch,
    mayChangeSelection,
    sourceValue,
    translationSourceMatches
} = window.LocaleUiState;
let state = null;
let selectedKey = null;

const localeSelect = document.getElementById('locale-select');
const componentSelect = document.getElementById('component-select');
const searchInput = document.getElementById('search-input');
const catalogBody = document.getElementById('catalog-body');
const resultPanel = document.getElementById('result-panel');
const progressDialog = document.getElementById('progress-dialog');
const progressTitle = document.getElementById('progress-title');
const progressStatus = document.getElementById('progress-status');
const progressElapsed = document.getElementById('progress-elapsed');
const progressOutput = document.getElementById('progress-output');
const cancelBuildButton = document.getElementById('cancel-build-button');
const MAX_PROGRESS_OUTPUT_LENGTH = 200000;
const localeWorkspace = document.querySelector('.workspace');
const catalogPanel = document.querySelector('.catalog-panel');
const editorPanel = document.querySelector('.editor-panel');
const translationComparison = document.getElementById('translation-comparison');
const currentTranslationPane = translationComparison.querySelector('.translation-value-pane');
const apiTranslationPane = translationComparison.querySelector('.api-translation-field');
const catalogTable = document.querySelector('.catalog-panel table');
splitter.attach(localeWorkspace, {
    key: 'locale-catalog-editor',
    firstPane: catalogPanel,
    secondPane: editorPanel,
    minimumStart: 380,
    minimumEnd: 500,
    defaultFraction: 0.44,
    label: 'Resize locale catalog and translation editor'
});
splitter.attach(translationComparison, {
    key: 'locale-current-api',
    orientation: 'rows',
    firstPane: currentTranslationPane,
    secondPane: apiTranslationPane,
    minimumStart: 90,
    minimumEnd: 110,
    defaultFraction: 0.46,
    label: 'Resize current locale value and API suggestion'
});
tableColumns.attach(catalogTable, {
    key: 'locale-component-catalog',
    minimumWidth: 96
});
let activeOperation = null;
let progressStartedAt = 0;
let progressTimer = null;
let lastProgressMessage = '';

function option(value, label) {
    const element = document.createElement('option');
    element.value = value;
    element.textContent = label;
    return element;
}

function showResult(title, value) {
    document.getElementById('result-title').textContent = title;
    document.getElementById('result-content').textContent = JSON.stringify(value, null, 2);
    resultPanel.hidden = false;
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
    } finally {
        endProgress();
    }
}

function updateBadges() {
    const dirty = document.getElementById('dirty-badge');
    dirty.textContent = state.dirty ? 'Unsaved changes' : 'No unsaved changes';
    dirty.className = `badge ${state.dirty ? 'dirty' : 'clean'}`;
    const validation = document.getElementById('validation-badge');
    validation.textContent = state.validation.ok
        ? 'Valid'
        : `${state.validation.errors.length} validation error(s)`;
    validation.className = `badge ${state.validation.ok ? 'valid' : 'invalid'}`;
}

function renderSelectors() {
    localeSelect.replaceChildren(...state.locales.map((locale) => option(
        locale.id,
        `${locale.nativeName} — ${locale.englishName} (${locale.id})`
    )));
    componentSelect.replaceChildren(...state.components.map((component) => option(
        component.id,
        `${component.id} — ${component.description}`
    )));
    localeSelect.value = state.selectedLocale;
    componentSelect.value = state.selectedComponent;
}

function renderScope() {
    document.getElementById('project-root').textContent = state.projectRoot;
    document.getElementById('catalog-title').textContent = `${state.locale.nativeName}: ${state.component.id}`;
    const details = document.getElementById('scope-details');
    const description = document.createElement('strong');
    description.textContent = state.component.description;
    const source = document.createElement('code');
    source.textContent = `Source: ${state.authoritativeFile}`;
    const generated = document.createElement('code');
    generated.textContent = `Generated: ${state.generatedFile}`;
    details.replaceChildren(description, source, generated);
    document.getElementById('completeness').textContent = [
        `${state.completeness.translated} translated`,
        `${state.completeness.fallback} English fallback`,
        `${state.completeness.total} total`
    ].join(' · ');
    const notice = document.getElementById('read-only-notice');
    notice.hidden = !state.readOnly;
    notice.textContent = state.readOnlyReason || '';
}

function renderTable() {
    const query = searchInput.value;
    const rows = state.rows.filter((row) => matchesSearch(row, query));
    catalogBody.replaceChildren(...rows.map((row) => {
        const tableRow = document.createElement('tr');
        tableRow.dataset.key = row.key;
        if (row.key === selectedKey) { tableRow.classList.add('selected'); }
        const cells = [
            row.key,
            row.sourceText,
            row.translated ? row.translationText : 'English fallback',
            row.translated ? row.translationStatus : 'fallback'
        ];
        cells.forEach((value, index) => {
            const cell = document.createElement('td');
            cell.textContent = value;
            if (index === 0) { cell.className = 'key-cell'; }
            if (!row.translated && index >= 2) { cell.classList.add('fallback'); }
            tableRow.appendChild(cell);
        });
        tableRow.addEventListener('click', () => {
            selectedKey = row.key;
            renderTable();
            renderEditor();
        });
        return tableRow;
    }));
}

function renderEditor() {
    const row = state.rows.find((item) => item.key === selectedKey) || null;
    const status = document.getElementById('translation-status');
    status.replaceChildren(...state.statuses.map((value) => option(value, value)));
    document.getElementById('entry-key').value = row?.key || '';
    document.getElementById('source-text').value = row?.sourceText || '';
    document.getElementById('normalized-text').value = row?.normalizedText || '';
    document.getElementById('placeholders').value = row?.placeholders.join(', ') || '(none)';
    document.getElementById('translation-text').value = row?.translationText || '';
    document.getElementById('api-translation-text').value = row?.apiTranslationText || '';
    status.value = row?.translationStatus || 'draft';
    document.getElementById('translation-notes').value = row?.notes || '';
    document.getElementById('editor-heading').textContent = row ? row.key : 'Select a catalog entry';
    const apiStatus = document.getElementById('api-translation-status');
    if (!row) {
        apiStatus.textContent = '';
    } else if (row.apiTranslationReady) {
        apiStatus.textContent = `${row.apiTranslationProvider} result ready. Apply in memory to retain Current locale value.`;
    } else if (state.apiTranslation.configured) {
        apiStatus.textContent = 'Generate a translation from Current locale value. The result replaces that field only.';
    } else {
        apiStatus.textContent = 'DeepL is not configured. Set DeeplApi before launching the application.';
    }
    for (const id of ['translation-text', 'translation-status', 'translation-notes', 'apply-button']) {
        document.getElementById(id).disabled = !row || state.readOnly;
    }
    document.getElementById('request-api-button').disabled = !row || state.readOnly || !state.apiTranslation.configured;
    document.getElementById('remove-button').disabled = !row || state.readOnly;
    document.getElementById('use-normalized-button').disabled = !row || state.readOnly;
}

function render() {
    if (!state.rows.some((row) => row.key === selectedKey)) { selectedKey = null; }
    renderSelectors();
    renderScope();
    renderTable();
    renderEditor();
    updateBadges();
}

async function changeSelection() {
    const requestedLocale = localeSelect.value;
    const requestedComponent = componentSelect.value;
    if (!mayChangeSelection(state.dirty, window.confirm)) {
        localeSelect.value = state.selectedLocale;
        componentSelect.value = state.selectedComponent;
        return;
    }
    const result = await api.select({
        localeId: requestedLocale,
        componentId: requestedComponent,
        discard: state.dirty
    });
    if (!result.ok) {
        showResult('Selection failed', result);
        renderSelectors();
        return;
    }
    state = result.state;
    selectedKey = null;
    render();
}

document.getElementById('translation-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const result = await api.applyTranslation({
        key: selectedKey,
        text: document.getElementById('translation-text').value,
        status: document.getElementById('translation-status').value,
        notes: document.getElementById('translation-notes').value
    });
    if (!result.ok) { showResult('Translation rejected', result); return; }
    state = result.state;
    render();
});

document.getElementById('remove-button').addEventListener('click', () => {
    const row = state.rows.find((item) => item.key === selectedKey) || null;
    document.getElementById('translation-text').value = sourceValue(row);
});

document.getElementById('use-normalized-button').addEventListener('click', () => {
    const row = state.rows.find((item) => item.key === selectedKey) || null;
    document.getElementById('translation-text').value = sourceValue(row, true);
});

document.getElementById('request-api-button').addEventListener('click', async () => {
    const currentValue = document.getElementById('translation-text').value;
    const button = document.getElementById('request-api-button');
    button.disabled = true;
    document.getElementById('api-translation-status').textContent = 'Requesting a DeepL translation…';
    const result = await api.requestApiTranslation({
        key: selectedKey,
        text: currentValue
    });
    button.disabled = false;
    if (!result.ok) {
        document.getElementById('api-translation-status').textContent = result.error || 'Translation unavailable.';
        showResult('API translation unavailable', result);
        return;
    }
    if (!translationSourceMatches(currentValue, result.sourceText)) {
        const mismatch = {
            ok: false,
            stage: 'translation',
            error: 'The main process translated a different Current locale value. Restart Locale Maintenance and retry.'
        };
        document.getElementById('api-translation-status').textContent = mismatch.error;
        showResult('API translation rejected', mismatch);
        return;
    }
    if (result.state) { state = result.state; }
    document.getElementById('api-translation-text').value = result.translationText;
    document.getElementById('translation-text').value = result.translationText;
    document.getElementById('api-translation-status').textContent =
        'DeepL replaced Current locale value. Apply in memory to retain it.';
});

document.getElementById('save-button').addEventListener('click', async () => {
    const outcome = await runProgressOperation('save', 'Saving locale component', 'Preparing save', async () => {
        const preview = await api.previewSave();
        if (!preview.validation.ok) { return { title: 'Save blocked by validation', result: preview }; }
        if (preview.authoritativeFiles.length > 0) {
            setProgressStatus('Waiting for save confirmation');
            const confirmation = await api.confirmSave(preview.authoritativeFiles);
            if (!confirmation.confirmed) { return { cancelled: true }; }
        }
        setProgressStatus('Starting save and component rebuild');
        const result = await api.save();
        return {
            title: result.ok ? 'Save and component build succeeded' : 'Save failed and was rolled back',
            result
        };
    });
    if (outcome.cancelled) { return; }
    const { result } = outcome;
    if (result.state) { state = result.state; }
    showResult(outcome.title, result);
    render();
});

document.getElementById('revert-button').addEventListener('click', async () => {
    if (state.dirty && !window.confirm('Discard in-memory translation changes?')) { return; }
    state = await api.revert();
    render();
});

document.getElementById('validate-button').addEventListener('click', async () => {
    state.validation = await api.validate();
    showResult('Validation result', state.validation);
    updateBadges();
});

document.getElementById('rebuild-button').addEventListener('click', async () => {
    const result = await runProgressOperation(
        'rebuild',
        'Rebuilding locale component',
        'Preparing component rebuild',
        () => api.rebuild()
    );
    if (result.ok && result.state) {
        state = result.state;
        render();
    }
    showResult(result.ok ? 'Selected component rebuilt' : 'Component rebuild failed', result);
});

document.getElementById('reload-button').addEventListener('click', async () => {
    const result = await api.reload();
    if (result.ok && result.state) {
        state = result.state;
        selectedKey = null;
        render();
    }
});

localeSelect.addEventListener('change', changeSelection);
componentSelect.addEventListener('change', changeSelection);
searchInput.addEventListener('input', renderTable);
document.getElementById('exit-button').addEventListener('click', () => api.exit());
document.getElementById('close-result').addEventListener('click', () => { resultPanel.hidden = true; });
cancelBuildButton.addEventListener('click', async () => {
    cancelBuildButton.disabled = true;
    setProgressStatus('Stopping component build');
    const result = await api.cancelBuild();
    if (!result.ok && result.error) { setProgressStatus(result.error); }
});
progressDialog.addEventListener('cancel', (event) => event.preventDefault());
api?.onProgress?.(handleProgress);

api.load().then((loaded) => { state = loaded; render(); })
    .catch((error) => showResult('Application failed to start', { error: error.message }));
