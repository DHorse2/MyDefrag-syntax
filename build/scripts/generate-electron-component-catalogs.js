'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const CATALOG_PATH = path.join(ROOT, 'language', 'canonical', 'component-catalog.json');
const COMPONENTS_PATH = path.join(ROOT, 'language', 'canonical', 'components.json');

const COMPONENTS = [
    {
        id: 'translator',
        root: 'build/mdl-language-app',
        description: 'Language-maintenance Electron app for canonical catalogs, migration inventory, validation, and builds.'
    },
    {
        id: 'locales',
        root: 'build/mdl-locale-app',
        description: 'Locale-maintenance Electron app for translator-owned component catalogs and targeted rebuilds.'
    }
];

function relative(filePath) {
    return path.relative(ROOT, filePath).split(path.sep).join('/');
}

function lineNumberAt(text, offset) {
    return text.slice(0, offset).split(/\r?\n/u).length;
}

function productionSources(root) {
    const files = [];
    function walk(directory) {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            if (entry.name === 'tests') { continue; }
            const fullPath = path.join(directory, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
            } else if (/\.(?:html|js)$/iu.test(entry.name)) {
                files.push(fullPath);
            }
        }
    }
    walk(path.join(ROOT, root));
    return files.sort((left, right) => relative(left).localeCompare(relative(right)));
}

function decodeLiteral(value) {
    return value
        .replace(/\\n/gu, ' ')
        .replace(/\\r/gu, ' ')
        .replace(/\\t/gu, ' ')
        .replace(/\\([\\'"`])/gu, '$1')
        .replace(/\s+/gu, ' ')
        .trim();
}

function javascriptLiterals(source) {
    const results = [];
    let index = 0;
    while (index < source.length) {
        const character = source[index];
        const next = source[index + 1];
        if (character === '/' && next === '/') {
            index = source.indexOf('\n', index + 2);
            if (index < 0) { break; }
            continue;
        }
        if (character === '/' && next === '*') {
            const end = source.indexOf('*/', index + 2);
            index = end < 0 ? source.length : end + 2;
            continue;
        }
        if (!['\'', '"', '`'].includes(character)) {
            index += 1;
            continue;
        }
        const quote = character;
        const start = index;
        let value = '';
        let escaped = false;
        index += 1;
        while (index < source.length) {
            const current = source[index];
            if (escaped) {
                value += `\\${current}`;
                escaped = false;
                index += 1;
                continue;
            }
            if (current === '\\') {
                escaped = true;
                index += 1;
                continue;
            }
            if (current === quote) {
                index += 1;
                results.push({ value: decodeLiteral(value), line: lineNumberAt(source, start) });
                break;
            }
            value += current;
            index += 1;
        }
    }
    return results;
}

function humanJavaScriptContext(lines, line) {
    const direct = lines[line - 1] || '';
    const humanContext = /\b(?:text|textContent|placeholder|title|message|detail|heading|label|buttonLabel|summary|reason|readOnlyReason|error|errors|buttons)\s*[:=]|['"]aria-label['"]\s*:|(?:throw\s+)?new Error|show(?:ErrorBox|MessageBox|Result)|appendFiles\s*\(|handleStateResult\s*\(|runProgressOperation\s*\(|report\s*\(|setProgress|showOperation|window\.(?:confirm)|confirm(?:Navigation|Change)\s*\(/u;
    if (humanContext.test(direct)) { return true; }
    if (!/^\s*(?:(?:\+|\?|:)\s*|\[\s*)?['"`]/u.test(direct)) {
        const preceding = lines.slice(Math.max(0, line - 7), line - 1).join(' ');
        return /const\s+cells\s*=\s*\[|\b(?:message|textContent|summary|initialMessage)\s*[:=]/u.test(preceding);
    }
    const preceding = lines.slice(Math.max(0, line - 7), line - 1).join(' ');
    return /throw new Error\s*\(|runProgressOperation\s*\(|getSourceTarget\s*\(|for\s*\(const\s*\[label|const\s+cells\s*=\s*\[|\b(?:message|initialMessage|readOnlyReason|error|errors|title|text|textContent|summary|buttons)\s*[:=]/u.test(preceding);
}

function plausibleHumanText(value) {
    if (!value || !/[A-Za-z]/u.test(value)) { return false; }
    if (/^#[0-9A-Fa-f]{3,8}$/u.test(value)) { return false; }
    if (!value.includes(' ') && /^[./\\#[]/u.test(value)) { return false; }
    if (!/[A-Za-z]/u.test(value.replace(/\$\{[^}]+\}/gu, ''))) { return false; }
    if (/^[./\\A-Za-z0-9_-]+$/u.test(value) && !value.includes(' ')) {
        return /^[A-Z][a-z]+$/u.test(value);
    }
    if (/^(?:require\(|[.#/]?[A-Za-z0-9_-]+\.(?:js|json|html|css)|[a-z]+:\/\/)/u.test(value)) {
        return false;
    }
    if (/[{}]\s*[,;)]|=>|\b(?:className|querySelector|JSON\.stringify)\b/u.test(value)) {
        return false;
    }
    if ((value.match(/\$\{/gu) || []).length > 3 || /\$\{[^}]*\b(?:map|filter)\s*\(/u.test(value)) {
        return false;
    }
    return true;
}

function placeholderName(expression, index) {
    let value = expression
        .replace(/\?\./gu, '.')
        .replace(/\|\|[\s\S]*$/u, '')
        .replace(/\?[^:]+:[\s\S]*$/u, '')
        .replace(/\.join\([\s\S]*$/u, '')
        .trim();
    const parts = value.match(/[A-Za-z_$][A-Za-z0-9_$]*/gu) || [];
    if (parts.at(-1) === 'length') {
        parts.pop();
        parts.push('count');
    }
    value = parts.map((part, partIndex) => {
        const clean = part.replace(/^\$/u, '');
        return partIndex === 0
            ? clean.charAt(0).toLocaleLowerCase() + clean.slice(1)
            : clean.charAt(0).toLocaleUpperCase() + clean.slice(1);
    }).join('');
    return value || `value${index + 1}`;
}

function normalizeTemplates(text) {
    const placeholders = [];
    const used = new Set();
    const normalized = text.replace(/\$\{([^{}]+)\}/gu, (_match, expression) => {
        const base = placeholderName(expression, placeholders.length);
        let name = base;
        let suffix = 2;
        while (used.has(name)) {
            name = `${base}${suffix}`;
            suffix += 1;
        }
        used.add(name);
        placeholders.push(name);
        return `{${name}}`;
    });
    for (const match of normalized.matchAll(/\{([A-Za-z][A-Za-z0-9]*)\}/gu)) {
        if (!used.has(match[1])) {
            used.add(match[1]);
            placeholders.push(match[1]);
        }
    }
    return { text: normalized, placeholders };
}

function inferJavaScriptMetadata(file, lineText) {
    if (/placeholder\s*:/u.test(lineText)) { return { category: 'input', role: 'placeholder' }; }
    if (/aria-label/u.test(lineText)) { return { category: 'accessibility', role: 'label' }; }
    if (/\btitle\s*:/u.test(lineText)) { return { category: 'dialog', role: 'title' }; }
    if (/report\s*\(|Progress|progress/u.test(lineText)) { return { category: 'progress', role: 'status' }; }
    if (/throw new Error|\b(?:message|error|errors)\s*[:=]|showResult/u.test(lineText)
        || /\/(?:repositories|services|validation)\//u.test(file)) {
        return { category: 'message', role: 'text' };
    }
    if (/\/main\//u.test(file)) { return { category: 'dialog', role: 'text' }; }
    if (/\/shared\//u.test(file)) { return { category: 'navigation', role: 'label' }; }
    return { category: 'ui', role: 'text' };
}

function javascriptCandidates(filePath) {
    const source = fs.readFileSync(filePath, 'utf8');
    const lines = source.split(/\r?\n/u);
    return javascriptLiterals(source)
        .filter((candidate) => humanJavaScriptContext(lines, candidate.line))
        .filter((candidate) => plausibleHumanText(candidate.value))
        .map((candidate) => ({
            ...normalizeTemplates(candidate.value),
            source: relative(filePath),
            sourceLine: candidate.line,
            ...inferJavaScriptMetadata(relative(filePath), lines[candidate.line - 1] || '')
        }));
}

function htmlCandidates(filePath) {
    const source = fs.readFileSync(filePath, 'utf8');
    const candidates = [];
    const attributePattern = /\b(title|aria-label|placeholder)="([^"]+)"/giu;
    for (const match of source.matchAll(attributePattern)) {
        if (!plausibleHumanText(match[2])) { continue; }
        const metadata = match[1].toLocaleLowerCase() === 'placeholder'
            ? { category: 'input', role: 'placeholder' }
            : (match[1].toLocaleLowerCase() === 'aria-label'
                ? { category: 'accessibility', role: 'label' }
                : { category: 'ui', role: 'title' });
        candidates.push({
            ...normalizeTemplates(decodeLiteral(match[2])),
            source: relative(filePath),
            sourceLine: lineNumberAt(source, match.index),
            ...metadata
        });
    }
    const textPattern = />([^<>]+)</gu;
    for (const match of source.matchAll(textPattern)) {
        const opening = source.slice(0, match.index).match(/<([A-Za-z][A-Za-z0-9-]*)\b[^>]*$/u);
        const tag = opening?.[1]?.toLocaleLowerCase() || '';
        if (!['title', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'button', 'label', 'th', 'p', 'span'].includes(tag)) {
            continue;
        }
        const value = decodeLiteral(match[1]);
        if (!plausibleHumanText(value)) { continue; }
        const metadata = tag === 'button'
            ? { category: 'action', role: 'label' }
            : (tag === 'title'
                ? { category: 'window', role: 'title' }
                : (/^h/u.test(tag)
                    ? { category: 'heading', role: 'text' }
                    : { category: 'ui', role: 'text' }));
        candidates.push({
            ...normalizeTemplates(value),
            source: relative(filePath),
            sourceLine: lineNumberAt(source, match.index),
            ...metadata
        });
    }
    return candidates;
}

function slug(text) {
    const words = text
        .replace(/\{[^}]+\}/gu, ' value ')
        .match(/[A-Za-z0-9]+/gu) || [];
    const selected = words.slice(0, 8);
    if (!selected.length) { return 'text'; }
    return selected.map((word, index) => {
        const lower = word.toLocaleLowerCase();
        return index === 0 ? lower : lower.charAt(0).toLocaleUpperCase() + lower.slice(1);
    }).join('');
}

function catalogEntries(component) {
    const candidates = [];
    for (const filePath of productionSources(component.root)) {
        candidates.push(...(filePath.endsWith('.html')
            ? htmlCandidates(filePath)
            : javascriptCandidates(filePath)));
    }
    const uniqueTexts = new Map();
    for (const candidate of candidates) {
        if (!uniqueTexts.has(candidate.text)) { uniqueTexts.set(candidate.text, candidate); }
    }
    const keys = new Set();
    return Array.from(uniqueTexts.values()).map((candidate) => {
        const base = `${component.id}.${candidate.category}.${slug(candidate.text)}.${candidate.role}`;
        let key = base;
        let suffix = 2;
        while (keys.has(key)) {
            key = `${base}${suffix}`;
            suffix += 1;
        }
        keys.add(key);
        const entry = {
            key,
            component: component.id,
            category: candidate.category,
            role: candidate.role,
            text: candidate.text,
            status: 'draft',
            source: candidate.source,
            sourceLine: candidate.sourceLine
        };
        if (candidate.placeholders.length) { entry.placeholders = candidate.placeholders; }
        return entry;
    }).sort((left, right) => left.key.localeCompare(right.key));
}

function updateInventory(document) {
    const selectedIds = new Set(COMPONENTS.map((component) => component.id));
    const retained = (document.migrationInventory?.scanFiles || [])
        .filter((entry) => !selectedIds.has(entry.component));
    const generated = COMPONENTS.flatMap((component) => (
        productionSources(component.root).map((filePath) => ({
            path: relative(filePath),
            component: component.id
        }))
    ));
    document.migrationInventory = {
        ...(document.migrationInventory || {}),
        scanFiles: [...retained, ...generated]
    };
    for (const definition of COMPONENTS) {
        const component = document.components.find((entry) => entry.id === definition.id);
        if (!component) { throw new Error(`Missing component definition: ${definition.id}`); }
        component.description = definition.description;
    }
}

function main() {
    const write = process.argv.slice(2).includes('--write');
    const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
    const components = JSON.parse(fs.readFileSync(COMPONENTS_PATH, 'utf8'));
    const generated = COMPONENTS.flatMap(catalogEntries);
    const roots = COMPONENTS.map((component) => `${component.root}/`);
    const retained = (catalog.entries || []).filter((entry) => (
        !roots.some((root) => String(entry.source || '').startsWith(root))
    ));
    catalog.entries = [...retained, ...generated];
    updateInventory(components);

    for (const component of COMPONENTS) {
        const count = generated.filter((entry) => entry.component === component.id).length;
        console.log(`${component.id}: ${count} canonical app string(s)`);
    }
    console.log(`Production inventory: ${components.migrationInventory.scanFiles.length} total file(s)`);
    if (!write) {
        console.log('Dry run only; pass --write to update canonical language files.');
        return;
    }
    fs.writeFileSync(CATALOG_PATH, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
    fs.writeFileSync(COMPONENTS_PATH, `${JSON.stringify(components, null, 2)}\n`, 'utf8');
    console.log('Canonical component catalog and migration inventory updated.');
}

if (require.main === module) {
    main();
}

module.exports = {
    updateInventory
};
