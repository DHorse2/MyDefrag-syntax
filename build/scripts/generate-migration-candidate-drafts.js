'use strict';

const fs = require('fs');
const path = require('path');
const {
    suggestCatalogKey,
    uniqueSuggestedKey
} = require('../shared/source-key-suggester');
const {
    buildMigrationReport,
    loadLanguageState,
    migrationSourceIdentity,
    resolveMigrationSource
} = require('./build-language');

const ROOT = path.resolve(__dirname, '..', '..');
const COMPONENTS_PATH = path.join(ROOT, 'language', 'canonical', 'components.json');

function normalizedPath(value) {
    return String(value || '').replaceAll('\\', '/');
}

function draftIdentity(draft) {
    return `${migrationSourceIdentity(draft)}\0${draft.text}`;
}

function textLooksLikePath(text, context) {
    const value = String(text || '');
    return /^(?:[A-Za-z]:\\|\\\\|\.{0,2}[\\/]|[*/]|[A-Za-z0-9_.-]+[\\/])|[\\/][A-Za-z0-9_.{}*?-]+|\.(?:js|cjs|mjs|json|html|css|md|myd|mydc)\b/iu.test(value)
        || /\b(?:path|filePath|directory|folder|rootDir|relativePath|absolutePath|extname|basename|dirname)\b/u.test(context);
}

function textLooksHuman(text) {
    const value = String(text || '').trim();
    return value.length >= 8 && (
        /\s/u.test(value)
        || /[.!?:]/u.test(value)
        || /\$\{|\{[A-Za-z_][A-Za-z0-9_]*\}/u.test(value)
    );
}

function escapeRegExp(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function javascriptPropertyForCandidate(lineText, candidateText) {
    for (const match of String(lineText || '').matchAll(/(?:['"]([^'"]+)['"]|([A-Za-z_$][\w$-]*))\s*:\s*(['"`])((?:\\.|(?!\3).)*)\3/gu)) {
        const rawValue = match[4]
            .replace(/\\n/gu, '\n')
            .replace(/\\r/gu, '\r')
            .replace(/\\t/gu, '\t')
            .replace(/\\([\\'"`])/gu, '$1');
        if (rawValue === candidateText) { return (match[1] || match[2]).toLocaleLowerCase(); }
    }
    return '';
}

function technicalLiteral(text, lineText) {
    const value = String(text || '');
    if (/^(?:use strict|utf-?8|ascii|base64|hex|true|false|null|undefined|function|string|number|boolean|object|array)$/iu.test(value)) {
        return true;
    }
    if (/^(?:a|button|div|form|h[1-6]|input|label|li|option|p|section|select|span|table|tbody|td|textarea|th|thead|tr|ul)$/iu.test(value)) {
        return true;
    }
    if (/^(?:aria-[a-z-]+|data-[a-z-]+|[.#]?[a-z][a-z0-9_-]*(?:[.:][a-z0-9_-]+)+)$/iu.test(value)) {
        return true;
    }
    const escaped = escapeRegExp(value);
    return escaped !== '' && (
        new RegExp("(?:element|querySelector|querySelectorAll|setAttribute|getAttribute)\\(\\s*['\"`]" + escaped + "['\"`]", 'iu').test(lineText)
        || new RegExp("\\b(?:case|typeof)\\s+['\"`]" + escaped + "['\"`]", 'iu').test(lineText)
    );
}

function inferHtmlMetadata(lineText, candidateText) {
    const escapedCandidate = escapeRegExp(candidateText);
    const attributeForCandidate = escapedCandidate
        ? lineText.match(new RegExp(`\\b([A-Za-z:-]+)=["']${escapedCandidate}["']`, 'iu'))?.[1]?.toLocaleLowerCase()
        : '';
    if (attributeForCandidate === 'aria-label') {
        return { category: 'accessibility', role: 'accessibleName' };
    }
    if (attributeForCandidate === 'placeholder') {
        return { category: 'input', role: 'placeholder' };
    }
    if (attributeForCandidate === 'title') {
        return { category: 'tooltip', role: 'tooltip' };
    }
    if (attributeForCandidate) {
        return { category: 'application', role: 'value' };
    }
    const containsCandidateText = escapedCandidate
        ? new RegExp(`>\\s*${escapedCandidate}\\s*<`, 'iu').test(lineText)
        : false;
    if (containsCandidateText && /<h[1-6]\b/iu.test(lineText)) {
        return { category: 'heading', role: 'heading' };
    }
    if (containsCandidateText && /<button\b/iu.test(lineText)) {
        return { category: 'action', role: 'label' };
    }
    if (containsCandidateText && /<(?:label|legend)\b/iu.test(lineText)) {
        return { category: 'field', role: 'label' };
    }
    if (containsCandidateText && /<th\b/iu.test(lineText)) {
        return { category: 'table', role: 'heading' };
    }
    if (containsCandidateText && /<title\b/iu.test(lineText)) {
        return { category: 'window', role: 'title' };
    }
    return null;
}

function inferCatalogMetadata({ relativePath, sourceText, line, candidateText, fullLine, construct = [] }) {
    const lines = sourceText.split(/\r?\n/u);
    const lineIndex = Math.max(0, Number(line || 1) - 1);
    const lineText = fullLine || lines[lineIndex] || '';
    const text = String(candidateText || '');
    const humanText = textLooksHuman(text);
    const extension = path.extname(relativePath || '').toLocaleLowerCase();
    const constructPath = construct.map((segment) => String(segment).toLocaleLowerCase());

    if (extension === '.json' || extension === '.jsonc') {
        const finalSegment = constructPath.at(-1) || '';
        if (constructPath.includes('configuration')) {
            if (finalSegment === 'description') { return { category: 'setting', role: 'description' }; }
            if (constructPath.includes('enum') || constructPath.includes('enumdescriptions')) {
                return { category: 'setting', role: 'option' };
            }
            return { category: 'setting', role: humanText ? 'label' : 'value' };
        }
        if (constructPath.includes('commands')) {
            if (finalSegment === 'title' && humanText) { return { category: 'command', role: 'title' }; }
            return { category: 'application', role: 'value' };
        }
        if (constructPath.includes('languages') && constructPath.includes('aliases')) {
            return { category: 'metadata', role: 'displayName' };
        }
        if (constructPath.includes('views') && humanText) {
            return { category: 'tree', role: finalSegment === 'name' ? 'title' : 'label' };
        }
        if (finalSegment === 'description' && humanText) {
            return { category: 'metadata', role: 'description' };
        }
    }

    if (extension === '.html' || extension === '.htm') {
        const htmlMetadata = inferHtmlMetadata(lineText, text);
        if (htmlMetadata) { return htmlMetadata; }
    }
    if (/https?:\/\//iu.test(text)) {
        return { category: 'path', role: 'externalLink' };
    }
    if (/\b(?:logger|console|error|logToConsole)\??\.(?:error|warn|warning|info|debug|trace|log|messageDetail)\b/iu.test(lineText)) {
        let result = { category: 'log', role: 'info' };
        if (/\.(?:error|err)\b/iu.test(lineText)) { result = { category: 'error', role: 'error' }; }
        if (/\.(?:warn|warning)\b/iu.test(lineText)) { result = { category: 'log', role: 'warning' }; }
        if (/\.(?:debug|dbg|trace)\b/iu.test(lineText)) { return { category: 'debug', role: 'message' }; }
        if (/\.(?:logger|log)\b/iu.test(lineText)) { result.category = 'log'; return result; }
        return result;
    }
    if (textLooksLikePath(text, lineText)) {
        return { category: 'path', role: 'structural' };
    }
    const property = javascriptPropertyForCandidate(lineText, text);
    if (property === 'aria-label' || property === 'arialabel' || property === 'accessiblename') {
        return { category: 'accessibility', role: 'accessibleName' };
    }
    if (property === 'placeholder') {
        return { category: 'input', role: 'placeholder' };
    }
    if (['class', 'classname', 'id', 'name', 'selector', 'tag', 'type'].includes(property)
        || technicalLiteral(text, lineText)) {
        return { category: 'application', role: 'value' };
    }
    if (property === 'label' || property === 'buttonlabel') {
        return { category: property === 'buttonlabel' ? 'action' : 'field', role: 'label' };
    }
    if (property === 'title') {
        return { category: /dialog/iu.test(lineText) ? 'dialog' : 'window', role: 'title' };
    }
    if (property === 'status') {
        return { category: 'status', role: 'status' };
    }
    if (/aria-label|ariaLabel|accessible(?:Name|Label)?|screenReader/iu.test(lineText)) {
        return { category: 'accessibility', role: 'accessibleName' };
    }
    if (/\bplaceholder\b/iu.test(lineText)) {
        return { category: 'input', role: 'placeholder' };
    }
    if ((humanText && /\b(?:confirm|confirmation|showMessageBox|window\.confirm)\b/iu.test(lineText))
        || /\?\s*$/u.test(text)) {
        return { category: 'confirmation', role: 'question' };
    }
    if (humanText && /\b(?:throw\s+new\s+Error|reject\s*\(|error\s*:|errors\s*:|showError)\b/iu.test(lineText)) {
        return { category: 'error', role: 'error' };
    }
    if (humanText && /\b(?:diagnostic|Diagnostic|sendDiagnostics|publishDiagnostics|severity)\b/u.test(lineText)) {
        return { category: 'diagnostic', role: 'message' };
    }
    if (humanText && /\b(?:warn|warning|caution)\b/iu.test(lineText)) {
        return { category: 'warning', role: 'warning' };
    }
    if (/\b(?:progress|report\s*\(|setProgress|progressBar|percent|completedCount|remainingCount)\b/iu.test(lineText)) {
        return { category: 'progress', role: 'status' };
    }
    if (humanText && /\b(?:validation|validate|validator|schema|invalid|required|unsupported)\b/iu.test(lineText)) {
        return { category: 'validation', role: /invalid|error|failed/iu.test(text) ? 'error' : 'message' };
    }
    if (/\b(?:filter|search|sort|order|scope)\b/iu.test(lineText)) {
        return { category: 'filter', role: /placeholder/iu.test(lineText) ? 'placeholder' : 'label' };
    }
    if (/\b(?:setting|settings|configuration|getConfiguration|preference|option)\b/iu.test(lineText)) {
        return { category: 'setting', role: /description|help/iu.test(lineText) ? 'description' : 'value' };
    }
    if (/\b(?:empty-state|emptyState)\b/iu.test(lineText)
        || /^(?:No|Nothing|Select|Choose)\b/u.test(text)) {
        return { category: 'empty-state', role: /^(?:Select|Choose)\b/u.test(text) ? 'instruction' : 'message' };
    }
    if (/\b(?:summary|total|count|coverage|resultCount)\b/iu.test(lineText)) {
        return { category: 'summary', role: 'summary' };
    }
    if (humanText && /\b(?:table|column|row|cells|thead|tbody)\b/iu.test(lineText)) {
        return { category: 'table', role: 'label' };
    }
    if (humanText && /\b(?:heading|header)\b/iu.test(lineText)) {
        return { category: 'heading', role: 'heading' };
    }
    if (/\b(?:title|windowTitle|dialogTitle)\b/iu.test(lineText)) {
        return { category: /dialog/iu.test(lineText) ? 'dialog' : 'window', role: 'title' };
    }
    if (humanText && /\b(?:button|buttonLabel|action|command|menuItem)\b/iu.test(lineText)) {
        return { category: /menu/iu.test(lineText) ? 'menu' : 'action', role: 'label' };
    }
    if (humanText && /\b(?:next|previous|back|forward|navigation|navigate|breadcrumb|tab)\b/iu.test(lineText)) {
        return { category: 'navigation', role: 'label' };
    }
    if (/\b(?:tooltip|hover|helpText|field-help)\b/iu.test(lineText)) {
        return { category: /tooltip/iu.test(lineText) ? 'tooltip' : 'help', role: /tooltip/iu.test(lineText) ? 'tooltip' : 'help' };
    }
    if (humanText && /\b(?:prompt|showInputBox|inputLabel)\b/iu.test(lineText)) {
        return { category: 'prompt', role: 'prompt' };
    }
    if (/\b(?:status|statusBar|stateLabel)\b/iu.test(lineText)) {
        return { category: 'status', role: 'status' };
    }
    if (/^\s*(?:\/\/|\/\*|\*)/u.test(lineText)) {
        return { category: 'help', role: 'text' };
    }
    if (humanText && /\b(?:message|text|textContent|detail|description|notice)\s*[:=]/iu.test(lineText)) {
        if (/\bdetail\s*[:=]/iu.test(lineText)) { return { category: 'message', role: 'detail' }; }
        if (/\bdescription\s*[:=]/iu.test(lineText)) { return { category: 'help', role: 'description' }; }
        if (/\bnotice\s*[:=]/iu.test(lineText)) { return { category: 'notification', role: 'notice' }; }
        return { category: 'message', role: 'message' };
    }
    if (['parser', 'server'].includes(String(relativePath || '').split('/')[1]) && textLooksHuman(text)) {
        return { category: 'diagnostic', role: 'message' };
    }
    if (textLooksHuman(text)) {
        return { category: 'message', role: 'text' };
    }
    return { category: 'application', role: 'value' };
}

function semanticSegment(text) {
    const words = String(text || '').match(/[A-Za-z0-9]+/gu) || [];
    const selected = words.slice(0, 6);
    if (!selected.length) { return 'text'; }
    const value = selected.map((word, index) => {
        const clean = /^[A-Za-z]/u.test(word) ? word : `item${word}`;
        const lower = clean.toLocaleLowerCase();
        return index === 0 ? lower : lower.charAt(0).toLocaleUpperCase() + lower.slice(1);
    }).join('');
    return value || 'text';
}

function inferredDraftKey({ component, category, role, suggestion, candidateText, line, occupiedKeys }) {
    const construct = Array.isArray(suggestion.construct) && suggestion.construct.length
        ? suggestion.construct
        : [`line${line}`];
    const segments = [component, category, ...construct];
    const semantic = semanticSegment(candidateText);
    if (segments.at(-1)?.toLocaleLowerCase() !== semantic.toLocaleLowerCase()) {
        segments.push(semantic);
    }
    if (segments.at(-1) !== role) { segments.push(role); }
    const base = segments.join('.');
    return uniqueSuggestedKey(base, candidateText, line, occupiedKeys);
}

function buildCandidateCatalogDrafts({ components, catalog, report, state = null, rootDir = ROOT }) {
    const scanFileByPath = new Map((components.migrationInventory?.scanFiles || []).map((entry) => [
        migrationSourceIdentity(entry),
        entry
    ]));
    const existingDrafts = components.migrationInventory?.candidateCatalogDrafts || [];

    // const knownIdentities = new Set(existingDrafts.map(draftIdentity));
    const existingDraftsByIdentity = new Map(
        existingDrafts.map((draft) => [draftIdentity(draft), draft])
    );
    const knownIdentities = new Set(existingDraftsByIdentity.keys());

    const occupiedKeys = new Set([
        ...(catalog.entries || []).map((entry) => entry.key),
        ...existingDrafts.map((entry) => entry.key).filter(Boolean)
    ]);
    const addedDrafts = [];

    for (const reportFile of report.files || []) {
        const sourceRef = {
            rootId: reportFile.rootId || 'project',
            path: normalizedPath(reportFile.path || reportFile.file)
        };
        const relativePath = sourceRef.path;
        const inventoryEntry = scanFileByPath.get(migrationSourceIdentity(sourceRef));
        if (!inventoryEntry) { continue; }
        const absolutePath = state
            ? resolveMigrationSource(rootDir, state, sourceRef).absolutePath
            : path.resolve(rootDir, ...relativePath.split('/'));
        const sourceText = fs.readFileSync(absolutePath, 'utf8');
        for (const candidate of reportFile.candidates || []) {
            if (candidate.status !== 'potential') { continue; }
            const base = {
                path: relativePath,
                sourceLine: candidate.line,
                text: candidate.text
            };
            if (sourceRef.rootId !== 'project') { base.rootId = sourceRef.rootId; }

            // if (knownIdentities.has(draftIdentity(base))) { continue; }
            const identity = draftIdentity(base);
            const existingDraft = existingDraftsByIdentity.get(identity);

            if (existingDraft) {
                existingDraft.sourceLine = candidate.line;
                continue;
            }

            const suggestion = suggestCatalogKey({
                component: inventoryEntry.component,
                relativePath,
                sourceText,
                line: candidate.line,
                candidateText: candidate.text,
                existingKeys: []
            });
            const metadata = inferCatalogMetadata({
                relativePath,
                sourceText,
                line: candidate.line,
                candidateText: candidate.text,
                fullLine: candidate.fullLine,
                construct: suggestion.construct
            });
            const key = inferredDraftKey({
                component: inventoryEntry.component,
                category: metadata.category,
                role: metadata.role,
                suggestion,
                candidateText: candidate.text,
                line: candidate.line,
                occupiedKeys
            });
            const draft = {
                ...base,
                component: inventoryEntry.component,
                category: metadata.category,
                role: metadata.role,
                key
            };
            addedDrafts.push(draft);
            knownIdentities.add(draftIdentity(draft));
            occupiedKeys.add(key);
        }
    }

    return {
        drafts: [...existingDrafts, ...addedDrafts],
        existingCount: existingDrafts.length,
        addedCount: addedDrafts.length
    };
}

function main() {
    const write = process.argv.slice(2).includes('--write');
    const state = loadLanguageState(ROOT);
    const components = state.components;
    const catalog = state.catalog;
    const report = buildMigrationReport(state, ROOT);
    const statusSnapshot = JSON.stringify(components.migrationInventory?.candidateStatuses || []);
    const result = buildCandidateCatalogDrafts({ components, catalog, report, state });
    components.migrationInventory ||= {};
    components.migrationInventory.candidateCatalogDrafts = result.drafts;
    if (JSON.stringify(components.migrationInventory.candidateStatuses || []) !== statusSnapshot) {
        throw new Error('Candidate status data changed while generating catalog drafts.');
    }

    const categoryCounts = result.drafts.reduce((counts, draft) => {
        counts[draft.category] = (counts[draft.category] || 0) + 1;
        return counts;
    }, {});
    console.log(`Existing candidate catalog drafts preserved: ${result.existingCount}`);
    console.log(`Potential candidate catalog drafts added: ${result.addedCount}`);
    console.log(`Total candidate catalog drafts: ${result.drafts.length}`);
    console.log(`Category distribution: ${JSON.stringify(categoryCounts)}`);
    console.log(`Candidate statuses unchanged: ${JSON.parse(statusSnapshot).length}`);
    if (!write) {
        console.log('Dry run only; pass --write to persist language/canonical/components.json.');
        return;
    }
    fs.writeFileSync(COMPONENTS_PATH, `${JSON.stringify(components, null, 2)}\n`, 'utf8');
    console.log('Canonical candidate catalog drafts updated.');
}

if (require.main === module) {
    main();
}

module.exports = {
    buildCandidateCatalogDrafts,
    draftIdentity,
    inferCatalogMetadata,
    inferredDraftKey,
    semanticSegment
};
