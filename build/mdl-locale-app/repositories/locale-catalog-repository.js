'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function suffix() {
    return `${process.pid}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

class LocaleCatalogRepository {
    constructor(rootDir, fileSystem = fs) {
        this.rootDir = path.resolve(rootDir);
        this.fs = fileSystem;
    }

    assertProjectRoot() {
        const required = [
            'language/canonical/components.json',
            'language/canonical/component-catalog.json',
            'language/locales/locales.json',
            'language/schema/locale-component-catalog.schema.json',
            'build/scripts/build-language.js'
        ];
        const missing = required.filter((relativePath) => !this.fs.existsSync(this.resolve(relativePath)));
        if (missing.length > 0) {
            throw new Error(`Not a MyDefrag locale repository. Missing: ${missing.join(', ')}`);
        }
    }

    resolve(relativePath) {
        const target = path.resolve(this.rootDir, relativePath);
        const relative = path.relative(this.rootDir, target);
        if (relative.startsWith('..') || path.isAbsolute(relative)) {
            throw new Error(`Path escapes the repository root: ${relativePath}`);
        }
        return target;
    }

    readJson(relativePath) {
        return JSON.parse(this.fs.readFileSync(this.resolve(relativePath), 'utf8'));
    }

    componentPath(localeId, componentId) {
        return `language/locales/${localeId}/${componentId}.json`;
    }

    generatedComponentPath(localeId, componentId) {
        return `build/language/catalogs/${localeId}/${componentId}.json`;
    }

    aggregatePath(localeId) {
        for (const name of ['catalogOverrides.json', 'catalogOverrides.sample.json']) {
            const relativePath = `language/locales/${localeId}/${name}`;
            if (this.fs.existsSync(this.resolve(relativePath))) { return relativePath; }
        }
        return null;
    }

    normalizeDocument(document) {
        const entries = Object.fromEntries(Object.entries(document.entries || {})
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, entry]) => [key, {
                text: entry.text,
                status: entry.status,
                ...(entry.notes ? { notes: entry.notes } : {})
            }]));
        return { locale: document.locale, component: document.component, entries };
    }

    serialize(value) {
        return `${JSON.stringify(value, null, 2)}\n`;
    }

    loadDraft(localeId, componentId, canonicalEntries) {
        const relativePath = this.componentPath(localeId, componentId);
        const absolutePath = this.resolve(relativePath);
        const existing = this.fs.existsSync(absolutePath)
            ? this.readJson(relativePath)
            : { locale: localeId, component: componentId, entries: {} };
        const draft = this.normalizeDocument(existing);
        const aggregatePath = this.aggregatePath(localeId);
        const componentKeys = new Set(canonicalEntries.map((entry) => entry.key));
        if (aggregatePath) {
            const aggregate = this.readJson(aggregatePath);
            for (const entry of aggregate.entries || []) {
                if (componentKeys.has(entry.key) && !draft.entries[entry.key]) {
                    draft.entries[entry.key] = {
                        text: entry.text,
                        status: entry.status,
                        ...(entry.notes ? { notes: entry.notes } : {})
                    };
                }
            }
        }
        return this.normalizeDocument(draft);
    }

    loadGeneratedTranslations(localeId, componentId, canonicalEntries) {
        const relativePath = this.generatedComponentPath(localeId, componentId);
        const absolutePath = this.resolve(relativePath);
        if (!this.fs.existsSync(absolutePath)) {
            return this.normalizeDocument({ locale: localeId, component: componentId, entries: {} });
        }

        const generated = this.readJson(relativePath);
        if (generated.locale !== localeId || generated.component !== componentId) {
            throw new Error(
                `Generated locale catalog identity mismatch in ${relativePath}: `
                + `${generated.locale || '<missing>'}/${generated.component || '<missing>'}`
            );
        }

        const componentKeys = new Set(canonicalEntries.map((entry) => entry.key));
        const entries = {};
        for (const [key, entry] of Object.entries(generated.entries || {})) {
            if (!componentKeys.has(key) || entry?.fallbackLocale !== null) { continue; }
            entries[key] = {
                text: entry.text,
                status: entry.status,
                ...(entry.notes ? { notes: entry.notes } : {})
            };
        }
        return this.normalizeDocument({ locale: localeId, component: componentId, entries });
    }

    changedDocuments(localeId, componentId, document, canonicalEntries) {
        const changes = [];
        const componentPath = this.componentPath(localeId, componentId);
        const normalized = this.normalizeDocument(document);
        const componentContent = this.serialize(normalized);
        const componentTarget = this.resolve(componentPath);
        const previousContent = this.fs.existsSync(componentTarget)
            ? this.fs.readFileSync(componentTarget, 'utf8')
            : null;
        if (previousContent !== componentContent) {
            changes.push({ relativePath: componentPath, content: componentContent });
        }

        const aggregatePath = this.aggregatePath(localeId);
        if (aggregatePath) {
            const aggregate = this.readJson(aggregatePath);
            const componentKeys = new Set(canonicalEntries.map((entry) => entry.key));
            const filtered = (aggregate.entries || []).filter((entry) => !componentKeys.has(entry.key));
            if (filtered.length !== (aggregate.entries || []).length) {
                changes.push({
                    relativePath: aggregatePath,
                    content: this.serialize({ ...aggregate, entries: filtered })
                });
            }
        }
        return changes;
    }

    beginTransaction(changes) {
        const transactionId = suffix();
        const staged = [];
        const activated = [];
        try {
            for (const change of changes) {
                const target = this.resolve(change.relativePath);
                this.fs.mkdirSync(path.dirname(target), { recursive: true });
                const temporary = path.join(path.dirname(target), `.${path.basename(target)}.${transactionId}.tmp`);
                const backup = path.join(path.dirname(target), `.${path.basename(target)}.${transactionId}.bak`);
                this.fs.writeFileSync(temporary, change.content, { encoding: 'utf8', flag: 'wx' });
                staged.push({ ...change, target, temporary, backup, hadOriginal: this.fs.existsSync(target) });
            }
            for (const item of staged) {
                if (item.hadOriginal) { this.fs.renameSync(item.target, item.backup); }
                try {
                    this.fs.renameSync(item.temporary, item.target);
                    activated.push(item);
                } catch (error) {
                    if (item.hadOriginal && this.fs.existsSync(item.backup)) {
                        this.fs.renameSync(item.backup, item.target);
                    }
                    throw error;
                }
            }
        } catch (error) {
            this.rollbackItems(activated);
            for (const item of staged) {
                if (this.fs.existsSync(item.temporary)) { this.fs.unlinkSync(item.temporary); }
            }
            throw error;
        }

        let complete = false;
        return {
            files: staged.map((item) => item.relativePath),
            commit: () => {
                if (complete) { return []; }
                const recoveryFiles = [];
                for (const item of staged) {
                    try {
                        if (this.fs.existsSync(item.backup)) { this.fs.unlinkSync(item.backup); }
                    } catch (_error) {
                        recoveryFiles.push(item.backup);
                    }
                }
                complete = true;
                return recoveryFiles;
            },
            rollback: () => {
                if (complete) { return; }
                this.rollbackItems(activated);
                complete = true;
            }
        };
    }

    rollbackItems(items) {
        for (const item of items.slice().reverse()) {
            if (this.fs.existsSync(item.target)) { this.fs.unlinkSync(item.target); }
            if (item.hadOriginal && this.fs.existsSync(item.backup)) {
                this.fs.renameSync(item.backup, item.target);
            }
            if (this.fs.existsSync(item.temporary)) { this.fs.unlinkSync(item.temporary); }
        }
    }
}

module.exports = { LocaleCatalogRepository };
