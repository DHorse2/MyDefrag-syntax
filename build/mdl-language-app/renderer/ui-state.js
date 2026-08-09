(function exposeUiState(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    } else {
        root.LanguageUiState = api;
    }
}(typeof globalThis === 'object' ? globalThis : this, function createUiStateApi() {
    'use strict';

    function mayLeaveCurrentView(dirty, confirmNavigation) {
        if (!dirty) { return true; }
        return confirmNavigation('Unsaved changes remain in memory. Continue to another view?');
    }

    function matchesSearch(record, query, related = {}) {
        if (!query) { return true; }
        const searchable = `${JSON.stringify(record)} ${JSON.stringify(related)}`.toLocaleLowerCase();
        return searchable.includes(String(query).trim().toLocaleLowerCase());
    }

    function matchesComponentScope(record, selectedComponent) {
        return selectedComponent == null || record.component === selectedComponent;
    }

    function nextCandidateIndex(candidates, currentIndex, statusFilter = 'all', skipText = null) {
        if (!Array.isArray(candidates)) { return -1; }
        for (let index = Number(currentIndex) + 1; index < candidates.length; index += 1) {
            const candidate = candidates[index];
            if (!candidate || (skipText != null && candidate.text === skipText)) { continue; }
            if (statusFilter !== 'all' && candidate.status !== statusFilter) { continue; }
            return index;
        }
        return -1;
    }

    function previousCandidateIndex(candidates, currentIndex, statusFilter = 'all', skipText = null) {
        if (!Array.isArray(candidates)) { return -1; }
        for (let index = Number(currentIndex) - 1; index >= 0; index -= 1) {
            const candidate = candidates[index];
            if (!candidate || (skipText != null && candidate.text === skipText)) { continue; }
            if (statusFilter !== 'all' && candidate.status !== statusFilter) { continue; }
            return index;
        }
        return -1;
    }

    function catalogKeyWithCategory(suggestedKey, category) {
        const segments = String(suggestedKey || '').split('.').filter(Boolean);
        const categorySegment = String(category || '').trim();
        if (!segments.length || !categorySegment) { return segments.join('.'); }
        return [segments[0], categorySegment, ...segments.slice(1)].join('.');
    }

    return {
        catalogKeyWithCategory,
        matchesComponentScope,
        matchesSearch,
        mayLeaveCurrentView,
        nextCandidateIndex,
        previousCandidateIndex
    };
}));
