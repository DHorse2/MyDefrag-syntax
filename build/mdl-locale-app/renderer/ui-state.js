(function exposeLocaleUiState(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) { module.exports = api; } else { root.LocaleUiState = api; }
}(typeof globalThis === 'object' ? globalThis : this, function createLocaleUiState() {
    'use strict';

    function matchesSearch(row, query) {
        if (!query) { return true; }
        return JSON.stringify(row).toLocaleLowerCase().includes(String(query).trim().toLocaleLowerCase());
    }

    function mayChangeSelection(dirty, confirmChange) {
        return !dirty || confirmChange('Discard unsaved translations and change the selection?');
    }

    function sourceValue(row, normalized = false) {
        if (!row) { return ''; }
        return String((normalized ? row.normalizedText : row.sourceText) || '');
    }

    function translationSourceMatches(currentValue, translatedSource) {
        return String(translatedSource ?? '') === String(currentValue ?? '').trim();
    }

    return { matchesSearch, mayChangeSelection, sourceValue, translationSourceMatches };
}));
