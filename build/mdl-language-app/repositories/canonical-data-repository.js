'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { VIEW_DEFINITIONS } = require('../shared/contracts');

function transactionSuffix() {
    return `${process.pid}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

class CanonicalDataRepository {
    constructor(rootDir, fileSystem = fs) {
        this.rootDir = path.resolve(rootDir);
        this.fs = fileSystem;
    }

    assertProjectRoot() {
        const required = [
            'language/canonical/components.json',
            'language/canonical/language-locales.json',
            'language/canonical/normalized-words.json',
            ...Object.values(VIEW_DEFINITIONS).map((view) => view.file),
            'build/scripts/build-language.js'
        ];
        const missing = required.filter((relativePath) => !this.fs.existsSync(this.resolve(relativePath)));
        if (missing.length > 0) {
            throw new Error(`Not a MyDefrag language repository. Missing: ${missing.join(', ')}`);
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

    relativeFile(absolutePath) {
        const target = path.resolve(String(absolutePath || ''));
        const relative = path.relative(this.rootDir, target);
        if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
            throw new Error(`Selected file is outside the repository root: ${absolutePath}`);
        }
        if (!this.fs.existsSync(target) || !this.fs.statSync(target).isFile()) {
            throw new Error(`Selected path is not a file: ${absolutePath}`);
        }
        return relative.split(path.sep).join('/');
    }

    serialize(value) {
        return `${JSON.stringify(value, null, 2)}\n`;
    }

    changedDocuments(originalState, draftState) {
        const changes = [];
        const definitions = [
            {
                file: 'language/canonical/components.json',
                stateKey: 'components'
            },
            {
                file: 'language/locales/locales.json',
                stateKey: 'locales'
            },
            ...Object.values(VIEW_DEFINITIONS)
        ];
        for (const definition of definitions) {
            const original = originalState[definition.stateKey];
            const draft = draftState[definition.stateKey];
            if (this.serialize(original) !== this.serialize(draft)) {
                changes.push({
                    relativePath: definition.file,
                    content: this.serialize(draft)
                });
            }
        }
        return changes;
    }

    beginCatalogRemoval(localeIds) {
        const suffix = transactionSuffix();
        const staged = [];
        try {
            for (const localeId of localeIds) {
                if (!/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(localeId)) {
                    throw new Error(`Invalid locale identifier for catalog removal: ${localeId}`);
                }
                const relativePath = `build/language/catalogs/${localeId}`;
                const target = this.resolve(relativePath);
                if (!this.fs.existsSync(target)) { continue; }
                if (!this.fs.statSync(target).isDirectory()) {
                    throw new Error(`Generated locale catalog is not a directory: ${relativePath}`);
                }
                const backup = this.resolve(`build/language/.catalog-removal-${localeId}-${suffix}.bak`);
                this.fs.renameSync(target, backup);
                staged.push({ relativePath, target, backup });
            }
        } catch (error) {
            for (const item of staged.slice().reverse()) {
                if (this.fs.existsSync(item.backup)) {
                    this.fs.renameSync(item.backup, item.target);
                }
            }
            throw error;
        }

        let complete = false;
        return {
            files: staged.map((item) => item.relativePath),
            commit: () => {
                if (complete) { return; }
                for (const item of staged) {
                    if (this.fs.existsSync(item.backup)) {
                        this.fs.rmSync(item.backup, { recursive: true, force: false });
                    }
                }
                complete = true;
            },
            rollback: () => {
                if (complete) { return; }
                for (const item of staged.slice().reverse()) {
                    if (this.fs.existsSync(item.backup)) {
                        this.fs.renameSync(item.backup, item.target);
                    }
                }
                complete = true;
            }
        };
    }

    beginTransaction(changes) {
        const suffix = transactionSuffix();
        const staged = [];
        const activated = [];

        try {
            for (const change of changes) {
                const target = this.resolve(change.relativePath);
                const temporary = path.join(path.dirname(target), `.${path.basename(target)}.${suffix}.tmp`);
                const backup = path.join(path.dirname(target), `.${path.basename(target)}.${suffix}.bak`);
                this.fs.writeFileSync(temporary, change.content, { encoding: 'utf8', flag: 'wx' });
                staged.push({ ...change, target, temporary, backup });
            }

            for (const item of staged) {
                this.fs.renameSync(item.target, item.backup);
                try {
                    this.fs.renameSync(item.temporary, item.target);
                    activated.push(item);
                } catch (error) {
                    this.fs.renameSync(item.backup, item.target);
                    throw error;
                }
            }
        } catch (error) {
            this.rollbackItems(activated);
            for (const item of staged) {
                if (this.fs.existsSync(item.temporary)) {
                    this.fs.unlinkSync(item.temporary);
                }
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
                        if (this.fs.existsSync(item.backup)) {
                            this.fs.unlinkSync(item.backup);
                        }
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
            if (this.fs.existsSync(item.target)) {
                this.fs.unlinkSync(item.target);
            }
            if (this.fs.existsSync(item.backup)) {
                this.fs.renameSync(item.backup, item.target);
            }
            if (this.fs.existsSync(item.temporary)) {
                this.fs.unlinkSync(item.temporary);
            }
        }
    }
}

module.exports = {
    CanonicalDataRepository
};
