'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { VIEW_DEFINITIONS } = require('../shared/contracts');
const { CanonicalDataRepository } = require('../repositories/canonical-data-repository');
const { SchemaValidator } = require('../validation/schema-validator');
const { BuildIntegration } = require('./build-integration');
const { suggestCatalogKey: suggestSourceCatalogKey } = require('./source-key-suggester');

const LANGUAGE_REPORT_PATH = 'build/language/reports/language-report.txt';
const MAX_LANGUAGE_REPORT_LENGTH = 5_000_000;
const MAX_MIGRATION_FOLDER_SCAN_FILES = 5_000;
const MAX_MIGRATION_FOLDER_FILE_BYTES = 2_000_000;
const MIGRATION_FOLDER_IGNORED_DIRECTORIES = new Set([
    '.git',
    '.hg',
    '.svn',
    '.nyc_output',
    'coverage',
    'node_modules'
]);
const MIGRATION_FOLDER_IGNORED_PATHS = new Set([
    'build/language/catalogs'
]);

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function report(listener, progress) {
    if (typeof listener !== 'function') { return; }
    try {
        listener(progress);
    } catch {
        // Losing a progress consumer must not interrupt save or rollback.
    }
}

function buildOptions(request = {}) {
    const useDeepL = request?.useDeepL === true;
    return {
        arguments: useDeepL ? ['build'] : ['build', '--UseNormalized'],
        mode: useDeepL ? 'deepl' : 'normalized'
    };
}

const EDITABLE_CANDIDATE_STATUSES = new Set(['potential', 'rejected', 'review']);

function storedCandidateStatus(migrationInventory, relativePath, text) {
    const entry = (migrationInventory?.candidateStatuses || []).find((candidate) => (
        typeof candidate?.path === 'string'
        && candidate.path.toLocaleLowerCase() === relativePath.toLocaleLowerCase()
        && candidate.text === text
    ));
    return entry?.status || 'potential';
}

class LanguageMaintenanceService {
    constructor(rootDir, options = {}) {
        this.rootDir = rootDir;
        this.builder = options.builder || require('../../scripts/build-language');
        this.repository = options.repository || new CanonicalDataRepository(rootDir);
        this.buildIntegration = options.buildIntegration || new BuildIntegration(rootDir);
        this.originalState = null;
        this.draftState = null;
        this.schemaValidator = null;
        this.pendingCatalogRemovals = new Set();
        this.languageReportDirty = false;
    }

    load() {
        this.repository.assertProjectRoot();
        this.originalState = this.builder.loadLanguageState(this.rootDir);
        this.draftState = clone(this.originalState);
        this.schemaValidator = new SchemaValidator(this.originalState.schemas);
        this.pendingCatalogRemovals.clear();
        this.languageReportDirty = false;
        return this.snapshot();
    }

    reload() {
        return this.load();
    }

    snapshot() {
        this.ensureLoaded();
        const catalogByKey = Object.fromEntries((this.draftState.catalog.entries || []).map((entry) => [
            entry.key,
            {
                text: entry.text,
                category: entry.category,
                placeholders: entry.placeholders || []
            }
        ]));
        const categoryUsage = {};
        const roleUsage = {};
        for (const entry of this.draftState.catalog.entries || []) {
            categoryUsage[entry.category] = (categoryUsage[entry.category] || 0) + 1;
            roleUsage[entry.role] = (roleUsage[entry.role] || 0) + 1;
        }
        return {
            projectRoot: this.rootDir,
            dirty: this.hasChanges(),
            components: clone(this.draftState.components.components || []),
            locales: clone(this.draftState.locales.locales || []),
            localeTemplates: clone(this.draftState.localeTemplates.locales || []),
            requiredLocales: clone(this.builder.EXPECTED_LOCALES || ['en']),
            pendingCatalogRemovals: Array.from(this.pendingCatalogRemovals).sort(),
            migrationInventory: clone(this.draftState.components.migrationInventory || {}),
            normalizedWords: clone(this.draftState.normalizedWords || []),
            previewDefaultMode: this.draftState.previewModes.defaultMode,
            categoryUsage,
            roleUsage,
            catalogByKey,
            views: Object.fromEntries(Object.entries(VIEW_DEFINITIONS).map(([name, definition]) => [
                name,
                {
                    ...definition,
                    schema: this.schemaValidator.recordSchema(name),
                    records: clone(this.draftState[definition.stateKey][definition.collectionKey] || [])
                }
            ])),
            validation: this.validate()
        };
    }

    hasChanges() {
        return this.hasCanonicalChanges() || this.languageReportDirty;
    }

    hasCanonicalChanges() {
        if (!this.originalState || !this.draftState) { return false; }
        return this.repository.changedDocuments(this.originalState, this.draftState).length > 0;
    }

    applyRecord(payload) {
        this.ensureLoaded();
        const definition = VIEW_DEFINITIONS[payload?.view];
        if (!definition || !payload.record || typeof payload.record !== 'object') {
            return { ok: false, errors: [{ path: '/', message: 'Invalid record request.' }] };
        }

        const candidate = clone(this.draftState);
        const records = candidate[definition.stateKey][definition.collectionKey] || [];
        const identity = String(payload.record[definition.identityKey] || '').trim();
        const originalIdentity = payload.originalIdentity == null
            ? null
            : String(payload.originalIdentity);
        const existingIndex = originalIdentity == null
            ? -1
            : records.findIndex((record) => record[definition.identityKey] === originalIdentity);

        if (originalIdentity != null && existingIndex < 0) {
            return { ok: false, errors: [{ path: '/', message: 'The record changed or no longer exists.' }] };
        }
        const duplicateIndex = records.findIndex((record, index) => (
            record[definition.identityKey] === identity && index !== existingIndex
        ));
        if (duplicateIndex >= 0) {
            return { ok: false, errors: [{
                path: `/${definition.collectionKey}`,
                message: `Duplicate ${definition.identityKey}: ${identity}`
            }] };
        }

        const previous = existingIndex >= 0 ? records[existingIndex] : {};
        const record = { ...previous, ...clone(payload.record) };
        for (const field of Array.isArray(payload.removedFields) ? payload.removedFields : []) {
            delete record[field];
        }
        if (existingIndex >= 0) {
            records[existingIndex] = record;
        } else {
            records.push(record);
        }

        const validation = this.validateState(candidate);
        if (!validation.ok) {
            return { ok: false, errors: validation.errors, warnings: validation.warnings };
        }
        this.draftState = candidate;
        return { ok: true, state: this.snapshot() };
    }

    applyComponent(payload) {
        this.ensureLoaded();
        if (!payload?.component || typeof payload.component !== 'object') {
            return { ok: false, errors: [{ path: '/components', message: 'Invalid component request.' }] };
        }
        const candidate = clone(this.draftState);
        const components = candidate.components.components || [];
        const originalId = payload.originalId == null ? null : String(payload.originalId);
        const component = clone(payload.component);
        component.id = String(component.id || '').trim();
        component.description = String(component.description || '').trim();
        component.runtime = component.runtime === true;
        const existingIndex = originalId == null
            ? -1
            : components.findIndex((item) => item.id === originalId);

        if (originalId != null && existingIndex < 0) {
            return { ok: false, errors: [{ path: '/components', message: 'The component changed or no longer exists.' }] };
        }
        if (originalId != null && component.id !== originalId) {
            return { ok: false, errors: [{ path: '/components/id', message: 'Existing component identifiers cannot be renamed.' }] };
        }
        if (components.some((item, index) => item.id === component.id && index !== existingIndex)) {
            return { ok: false, errors: [{ path: '/components', message: `Duplicate component id: ${component.id}` }] };
        }

        if (existingIndex >= 0) {
            components[existingIndex] = { ...components[existingIndex], ...component };
        } else {
            components.push(component);
        }
        const validation = this.validateState(candidate);
        if (!validation.ok) {
            return { ok: false, errors: validation.errors, warnings: validation.warnings };
        }
        this.draftState = candidate;
        return { ok: true, state: this.snapshot() };
    }

    applyLocale(payload) {
        this.ensureLoaded();
        if (!payload?.locale || typeof payload.locale !== 'object') {
            return { ok: false, errors: [{ path: '/locales', message: 'Invalid locale request.' }] };
        }
        const candidate = clone(this.draftState);
        const locales = candidate.locales.locales || [];
        const originalId = payload.originalId == null ? null : String(payload.originalId);
        const locale = clone(payload.locale);
        locale.id = String(locale.id || '').trim();
        locale.englishName = String(locale.englishName || '').trim();
        locale.nativeName = String(locale.nativeName || '').trim();
        locale.direction = String(locale.direction || '').trim();
        locale.status = String(locale.status || '').trim();
        const removeNotes = locale.notes == null || String(locale.notes).trim() === '';
        if (removeNotes) {
            delete locale.notes;
        } else {
            locale.notes = String(locale.notes).trim();
        }
        const existingIndex = originalId == null
            ? -1
            : locales.findIndex((item) => item.id === originalId);

        if (originalId != null && existingIndex < 0) {
            return { ok: false, errors: [{ path: '/locales', message: 'The locale changed or no longer exists.' }] };
        }
        if (originalId != null && locale.id !== originalId) {
            return { ok: false, errors: [{ path: '/locales/id', message: 'Existing locale identifiers cannot be renamed.' }] };
        }
        if (!/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(locale.id)) {
            return { ok: false, errors: [{ path: '/locales/id', message: 'Use a locale identifier such as en, fr-CA, or zh-Hans.' }] };
        }
        if (locales.some((item, index) => item.id === locale.id && index !== existingIndex)) {
            return { ok: false, errors: [{ path: '/locales', message: `Duplicate locale id: ${locale.id}` }] };
        }
        if (!['ltr', 'rtl'].includes(locale.direction)) {
            return { ok: false, errors: [{ path: '/locales/direction', message: 'Locale direction must be ltr or rtl.' }] };
        }
        if (!(this.builder.VALID_STATUSES || new Set()).has(locale.status)) {
            return { ok: false, errors: [{ path: '/locales/status', message: `Invalid locale status: ${locale.status}` }] };
        }

        if (existingIndex >= 0) {
            locales[existingIndex] = { ...locales[existingIndex], ...locale };
            if (removeNotes) { delete locales[existingIndex].notes; }
        } else {
            locales.push(locale);
            candidate.inactiveLocaleDirectories = (candidate.inactiveLocaleDirectories || [])
                .filter((localeId) => localeId !== locale.id);
            if (this.originalState.localeCatalogs?.[locale.id]) {
                candidate.localeCatalogs[locale.id] = clone(this.originalState.localeCatalogs[locale.id]);
                candidate.localeComponentCatalogs[locale.id] = clone(
                    this.originalState.localeComponentCatalogs?.[locale.id] || {}
                );
            }
        }

        const validation = this.validateState(candidate);
        if (!validation.ok) {
            return { ok: false, errors: validation.errors, warnings: validation.warnings };
        }
        this.pendingCatalogRemovals.delete(locale.id);
        this.draftState = candidate;
        return { ok: true, state: this.snapshot() };
    }

    removeLocale(localeId, options = {}) {
        this.ensureLoaded();
        const id = String(localeId || '').trim();
        if ((this.builder.EXPECTED_LOCALES || ['en']).includes(id)) {
            return { ok: false, errors: [{ path: '/locales', message: `Required locale ${id} cannot be deleted.` }] };
        }
        const candidate = clone(this.draftState);
        const locales = candidate.locales.locales || [];
        const index = locales.findIndex((locale) => locale.id === id);
        if (index < 0) {
            return { ok: false, errors: [{ path: '/locales', message: `Locale ${id} no longer exists.` }] };
        }
        locales.splice(index, 1);
        delete candidate.localeCatalogs[id];
        delete candidate.localeComponentCatalogs[id];
        const authoredDirectory = path.join(this.rootDir, 'language', 'locales', id);
        if (fs.existsSync(authoredDirectory) && fs.statSync(authoredDirectory).isDirectory()) {
            candidate.inactiveLocaleDirectories = Array.from(new Set([
                ...(candidate.inactiveLocaleDirectories || []),
                id
            ])).sort();
        }

        const validation = this.validateState(candidate);
        if (!validation.ok) {
            return { ok: false, errors: validation.errors, warnings: validation.warnings };
        }
        if (options.removeCatalog === true) {
            this.pendingCatalogRemovals.add(id);
        } else {
            this.pendingCatalogRemovals.delete(id);
        }
        this.draftState = candidate;
        return {
            ok: true,
            removedLocale: id,
            catalogRemovalScheduled: this.pendingCatalogRemovals.has(id),
            state: this.snapshot()
        };
    }

    setPreviewDefault(modeId) {
        this.ensureLoaded();
        const candidate = clone(this.draftState);
        candidate.previewModes.defaultMode = String(modeId || '');
        const validation = this.validateState(candidate);
        if (!validation.ok) {
            return { ok: false, errors: validation.errors, warnings: validation.warnings };
        }
        this.draftState = candidate;
        return { ok: true, state: this.snapshot() };
    }

    addMigrationFiles(filePaths, componentId) {
        this.ensureLoaded();
        if (!Array.isArray(filePaths)) {
            return { ok: false, errors: [{ path: '/migrationInventory/scanFiles', message: 'Invalid file selection.' }] };
        }
        if (!this.draftState.components.components.some((component) => component.id === componentId)) {
            return { ok: false, errors: [{ path: '/migrationInventory/scanFiles', message: 'Select a valid component before adding files.' }] };
        }
        const candidate = clone(this.draftState);
        candidate.components.migrationInventory ||= {};
        candidate.components.migrationInventory.scanFiles ||= [];
        const scanFiles = candidate.components.migrationInventory.scanFiles;
        const known = new Set(scanFiles.map((file) => String(file.path).toLocaleLowerCase()));
        const addedFiles = [];

        try {
            for (const filePath of filePaths) {
                const relativePath = this.repository.relativeFile(filePath);
                const key = relativePath.toLocaleLowerCase();
                if (!known.has(key)) {
                    scanFiles.push({ path: relativePath, component: componentId });
                    known.add(key);
                    addedFiles.push(relativePath);
                }
            }
        } catch (error) {
            return {
                ok: false,
                errors: [{ path: '/migrationInventory/scanFiles', message: error.message }]
            };
        }

        const validation = this.validateState(candidate);
        if (!validation.ok) {
            return { ok: false, errors: validation.errors, warnings: validation.warnings };
        }
        this.draftState = candidate;
        return { ok: true, addedFiles, state: this.snapshot() };
    }

    scanMigrationFile(filePath) {
        this.ensureLoaded();
        let relativePath;
        let sourceText;
        try {
            relativePath = this.repository.relativeFile(filePath);
            sourceText = fs.readFileSync(this.repository.resolve(relativePath), 'utf8');
        } catch (error) {
            return { ok: false, error: error.message };
        }

        if (typeof this.builder.extractStringCandidates !== 'function') {
            return { ok: false, error: 'The configured language builder does not expose extractStringCandidates.' };
        }
        const extractedStrings = this.builder.extractStringCandidates(sourceText);
        const classification = this.classifyExtractedCandidates(extractedStrings, relativePath);
        if (!classification.ok) { return classification; }
        const inventoryEntry = (this.draftState.components.migrationInventory?.scanFiles || [])
            .find((entry) => entry.path.toLocaleLowerCase() === relativePath.toLocaleLowerCase());
        return {
            ok: true,
            file: {
                path: relativePath,
                alreadyInInventory: Boolean(inventoryEntry),
                inventoryComponent: inventoryEntry?.component || null,
                extractedCount: extractedStrings.length,
                candidateCount: classification.candidates.length,
                candidates: classification.candidates,
                catalogedStringCount: classification.catalogedStrings.length,
                catalogedStrings: classification.catalogedStrings
            }
        };
    }

    scanMigrationFolder(folderPath) {
        this.ensureLoaded();
        if (typeof this.builder.extractStringCandidates !== 'function') {
            return { ok: false, error: 'The configured language builder does not expose extractStringCandidates.' };
        }

        let absoluteFolder;
        let relativeFolder;
        try {
            absoluteFolder = path.resolve(String(folderPath || ''));
            const relative = path.relative(path.resolve(this.rootDir), absoluteFolder);
            if (relative.startsWith('..') || path.isAbsolute(relative)) {
                throw new Error(`Selected folder is outside the repository root: ${folderPath}`);
            }
            if (!fs.existsSync(absoluteFolder) || !fs.statSync(absoluteFolder).isDirectory()) {
                throw new Error(`Selected path is not a folder: ${folderPath}`);
            }
            relativeFolder = relative ? relative.split(path.sep).join('/') : '.';
        } catch (error) {
            return { ok: false, error: error.message };
        }

        const files = [];
        const directories = [absoluteFolder];
        const counts = {
            inspectedFileCount: 0,
            scannedFileCount: 0,
            candidateFileCount: 0,
            extractedCount: 0,
            candidateCount: 0,
            catalogedStringCount: 0,
            binaryFileCount: 0,
            oversizedFileCount: 0,
            unreadablePathCount: 0,
            ignoredDirectoryCount: 0,
            symbolicLinkCount: 0
        };
        let truncated = false;

        while (directories.length > 0 && !truncated) {
            const directory = directories.shift();
            let entries;
            try {
                entries = fs.readdirSync(directory, { withFileTypes: true })
                    .sort((left, right) => left.name.localeCompare(right.name));
            } catch {
                counts.unreadablePathCount += 1;
                continue;
            }

            for (const entry of entries) {
                const absolutePath = path.join(directory, entry.name);
                if (entry.isSymbolicLink()) {
                    counts.symbolicLinkCount += 1;
                    continue;
                }
                if (entry.isDirectory()) {
                    const relativePath = path.relative(this.rootDir, absolutePath).split(path.sep).join('/');
                    if (MIGRATION_FOLDER_IGNORED_DIRECTORIES.has(entry.name.toLocaleLowerCase())
                        || MIGRATION_FOLDER_IGNORED_PATHS.has(relativePath.toLocaleLowerCase())) {
                        counts.ignoredDirectoryCount += 1;
                    } else {
                        directories.push(absolutePath);
                    }
                    continue;
                }
                if (!entry.isFile()) { continue; }
                if (counts.inspectedFileCount >= MAX_MIGRATION_FOLDER_SCAN_FILES) {
                    truncated = true;
                    break;
                }
                counts.inspectedFileCount += 1;

                try {
                    const stats = fs.statSync(absolutePath);
                    if (stats.size > MAX_MIGRATION_FOLDER_FILE_BYTES) {
                        counts.oversizedFileCount += 1;
                        continue;
                    }
                    const buffer = fs.readFileSync(absolutePath);
                    if (buffer.includes(0)) {
                        counts.binaryFileCount += 1;
                        continue;
                    }
                    const relativePath = this.repository.relativeFile(absolutePath);
                    const extractedStrings = this.builder.extractStringCandidates(buffer.toString('utf8'));
                    counts.scannedFileCount += 1;
                    if (extractedStrings.length === 0) { continue; }
                    const classification = this.classifyExtractedCandidates(extractedStrings, relativePath);
                    if (!classification.ok) {
                        counts.unreadablePathCount += 1;
                        continue;
                    }
                    const inventoryEntry = (this.draftState.components.migrationInventory?.scanFiles || [])
                        .find((item) => item.path.toLocaleLowerCase() === relativePath.toLocaleLowerCase());
                    const file = {
                        path: relativePath,
                        alreadyInInventory: Boolean(inventoryEntry),
                        inventoryComponent: inventoryEntry?.component || null,
                        extractedCount: extractedStrings.length,
                        candidateCount: classification.candidates.length,
                        candidates: classification.candidates,
                        catalogedStringCount: classification.catalogedStrings.length,
                        catalogedStrings: classification.catalogedStrings
                    };
                    files.push(file);
                    counts.candidateFileCount += 1;
                    counts.extractedCount += file.extractedCount;
                    counts.candidateCount += file.candidateCount;
                    counts.catalogedStringCount += file.catalogedStringCount;
                } catch {
                    counts.unreadablePathCount += 1;
                }
            }
        }

        files.sort((left, right) => left.path.localeCompare(right.path));
        return {
            ok: true,
            folder: {
                path: relativeFolder,
                files,
                ...counts,
                skippedFileCount: counts.binaryFileCount + counts.oversizedFileCount
                    + counts.unreadablePathCount + counts.symbolicLinkCount,
                truncated,
                limits: {
                    maximumFiles: MAX_MIGRATION_FOLDER_SCAN_FILES,
                    maximumFileBytes: MAX_MIGRATION_FOLDER_FILE_BYTES
                }
            }
        };
    }

    addScannedMigrationFile(relativePath, componentId) {
        return this.addScannedMigrationFiles([relativePath], componentId);
    }

    addScannedMigrationFiles(relativePaths, componentId) {
        this.ensureLoaded();
        if (!Array.isArray(relativePaths)) {
            return { ok: false, errors: [{
                path: '/migrationInventory/scanFiles',
                message: 'Invalid scanned file selection.'
            }] };
        }
        const absolutePaths = [];
        try {
            for (const relativePath of relativePaths) {
                const absolutePath = this.repository.resolve(String(relativePath || ''));
                const normalizedPath = this.repository.relativeFile(absolutePath);
                if (normalizedPath !== String(relativePath || '').replaceAll('\\', '/')) {
                    return { ok: false, errors: [{
                        path: '/migrationInventory/scanFiles',
                        message: 'A scanned source path is not a normalized repository-relative file path.'
                    }] };
                }
                absolutePaths.push(absolutePath);
            }
        } catch (error) {
            return {
                ok: false,
                errors: [{ path: '/migrationInventory/scanFiles', message: error.message }]
            };
        }
        return this.addMigrationFiles(absolutePaths, componentId);
    }

    readMigrationReport() {
        const reportPath = path.join(this.rootDir, 'build', 'language', 'reports', 'migration-report.json');
        try {
            return { ok: true, report: JSON.parse(fs.readFileSync(reportPath, 'utf8')) };
        } catch (error) {
            return {
                ok: false,
                error: `Unable to read build/language/reports/migration-report.json: ${error.message}`
            };
        }
    }

    classifyMigrationReportFile(reportFile) {
        if (reportFile.status !== 'scanned' || !Array.isArray(reportFile.candidates)) {
            return { ok: false, error: `Migration candidates are unavailable because the report status is ${reportFile.status || 'invalid'}.` };
        }
        if (!Array.isArray(reportFile.catalogedStrings)) {
            return { ok: false, error: 'The migration report does not include catalog-found strings. Rebuild the language outputs.' };
        }

        const reportedStrings = [...reportFile.candidates, ...reportFile.catalogedStrings];
        return this.classifyExtractedCandidates(reportedStrings, reportFile.file);
    }

    classifyExtractedCandidates(reportedStrings, relativePath) {
        const catalogEntriesByText = new Map();
        for (const entry of this.draftState.catalog.entries || []) {
            const matches = catalogEntriesByText.get(entry.text) || [];
            matches.push({
                key: entry.key,
                component: entry.component,
                category: entry.category,
                role: entry.role
            });
            catalogEntriesByText.set(entry.text, matches);
        }
        const candidates = [];
        const catalogedStrings = [];
        for (const candidate of reportedStrings) {
            if (!Number.isInteger(candidate?.line) || candidate.line < 1
                || typeof candidate.text !== 'string' || typeof candidate.fullLine !== 'string') {
                return { ok: false, error: 'The migration report is missing full candidate source lines. Rebuild the language outputs.' };
            }
            const item = {
                line: candidate.line,
                text: candidate.text,
                fullLine: candidate.fullLine,
                status: storedCandidateStatus(
                    this.draftState.components.migrationInventory,
                    relativePath,
                    candidate.text
                )
            };
            const catalogEntries = catalogEntriesByText.get(candidate.text) || [];
            if (catalogEntries.length > 0) {
                catalogedStrings.push({ ...item, status: 'in-catalog', catalogEntries });
            } else {
                candidates.push(item);
            }
        }
        return { ok: true, candidates, catalogedStrings };
    }

    getMigrationSummary() {
        this.ensureLoaded();
        const reportResult = this.readMigrationReport();
        if (!reportResult.ok) { return reportResult; }
        const reportFiles = Array.isArray(reportResult.report.files) ? reportResult.report.files : [];
        const inventory = this.draftState.components.migrationInventory?.scanFiles || [];
        const files = inventory.map((inventoryEntry) => {
            const reportFile = reportFiles.find((entry) => entry?.file === inventoryEntry.path);
            if (!reportFile) {
                return {
                    ok: false,
                    path: inventoryEntry.path,
                    component: inventoryEntry.component,
                    error: 'Not present in the migration report; rebuild required.'
                };
            }
            if (reportFile.component !== inventoryEntry.component) {
                return {
                    ok: false,
                    path: inventoryEntry.path,
                    component: inventoryEntry.component,
                    error: 'Component assignment is stale; rebuild required.'
                };
            }
            const classification = this.classifyMigrationReportFile(reportFile);
            if (!classification.ok) {
                return {
                    ok: false,
                    path: inventoryEntry.path,
                    component: inventoryEntry.component,
                    error: classification.error
                };
            }
            return {
                ok: true,
                path: inventoryEntry.path,
                component: inventoryEntry.component,
                candidateCount: classification.candidates.length,
                catalogedStringCount: classification.catalogedStrings.length
            };
        });
        return { ok: true, files };
    }

    getMigrationCandidates(relativePath) {
        this.ensureLoaded();
        const requestedPath = String(relativePath || '');
        const inventoryEntry = (this.draftState.components.migrationInventory?.scanFiles || [])
            .find((entry) => entry.path === requestedPath);
        if (!inventoryEntry) {
            return { ok: false, error: 'The migration file is no longer listed.' };
        }

        const reportResult = this.readMigrationReport();
        if (!reportResult.ok) { return reportResult; }
        const reportFile = Array.isArray(reportResult.report.files)
            ? reportResult.report.files.find((entry) => entry?.file === requestedPath)
            : null;
        if (!reportFile) {
            return { ok: false, error: 'The migration report does not contain this file. Rebuild the language outputs.' };
        }
        if (reportFile.component !== inventoryEntry.component) {
            return { ok: false, error: 'The migration report component assignment is stale. Rebuild the language outputs.' };
        }
        const classification = this.classifyMigrationReportFile(reportFile);
        if (!classification.ok) { return classification; }
        return {
            ok: true,
            file: {
                path: reportFile.file,
                component: reportFile.component,
                candidateCount: classification.candidates.length,
                candidates: classification.candidates,
                catalogedStringCount: classification.catalogedStrings.length,
                catalogedStrings: classification.catalogedStrings
            }
        };
    }

    getMigrationSourceTarget(relativePath, line) {
        this.ensureLoaded();
        const reportResult = this.getMigrationCandidates(relativePath);
        if (!reportResult.ok) { return reportResult; }
        return this.getSourceTarget(
            reportResult.file.path,
            line,
            [...reportResult.file.candidates, ...reportResult.file.catalogedStrings],
            'The selected line is not a current reported migration string.'
        );
    }

    getScannedMigrationSourceTarget(relativePath, line, candidateText) {
        this.ensureLoaded();
        let normalizedPath;
        let absolutePath;
        try {
            absolutePath = this.repository.resolve(String(relativePath || ''));
            normalizedPath = this.repository.relativeFile(absolutePath);
        } catch (error) {
            return { ok: false, error: error.message };
        }
        const sourceText = fs.readFileSync(absolutePath, 'utf8');
        const candidates = this.builder.extractStringCandidates(sourceText)
            .filter((candidate) => candidate.text === String(candidateText || ''));
        return this.getSourceTarget(
            normalizedPath,
            line,
            candidates,
            'The selected string is no longer a current scanned migration candidate.'
        );
    }

    getSourceTarget(relativePath, line, candidates, invalidSelectionMessage) {
        const sourceLine = Number(line);
        if (!Number.isInteger(sourceLine) || sourceLine < 1
            || !candidates.some((candidate) => candidate.line === sourceLine)) {
            return { ok: false, error: invalidSelectionMessage };
        }
        let absolutePath;
        try {
            absolutePath = this.repository.resolve(relativePath);
            this.repository.relativeFile(absolutePath);
        } catch (error) {
            return { ok: false, error: error.message };
        }
        return {
            ok: true,
            absolutePath,
            relativePath,
            line: sourceLine
        };
    }

    suggestCatalogKey(request = {}) {
        this.ensureLoaded();
        const reportResult = this.getMigrationCandidates(request.path);
        if (!reportResult.ok) { return reportResult; }
        const sourceLine = Number(request.line);
        const candidate = reportResult.file.candidates.find((item) => item.line === sourceLine);
        if (!candidate) {
            return { ok: false, error: 'The selected line is not a current migration candidate.' };
        }
        const target = this.getMigrationSourceTarget(reportResult.file.path, sourceLine);
        if (!target.ok) { return target; }
        const sourceText = fs.readFileSync(target.absolutePath, 'utf8');
        return {
            ok: true,
            ...suggestSourceCatalogKey({
                component: reportResult.file.component,
                relativePath: reportResult.file.path,
                sourceText,
                line: sourceLine,
                candidateText: candidate.text
            })
        };
    }

    setMigrationCandidateStatus(request = {}) {
        this.ensureLoaded();
        const relativePath = String(request.path || '');
        const text = String(request.text || '');
        const status = String(request.status || '');
        if (!EDITABLE_CANDIDATE_STATUSES.has(status)) {
            return { ok: false, errors: [{
                path: '/migrationInventory/candidateStatuses',
                message: 'Select Potential Candidate, Rejected, or Review.'
            }] };
        }
        const current = this.getMigrationCandidates(relativePath);
        if (!current.ok) { return current; }
        if (!current.file.candidates.some((candidate) => candidate.text === text)) {
            return { ok: false, errors: [{
                path: '/migrationInventory/candidateStatuses',
                message: 'The selected text is no longer a current non-catalog candidate.'
            }] };
        }

        const candidate = clone(this.draftState);
        const migrationInventory = candidate.components.migrationInventory;
        migrationInventory.candidateStatuses ||= [];
        const entries = migrationInventory.candidateStatuses;
        const existingIndex = entries.findIndex((entry) => (
            entry.path.toLocaleLowerCase() === relativePath.toLocaleLowerCase()
            && entry.text === text
        ));
        if (status === 'potential') {
            if (existingIndex >= 0) { entries.splice(existingIndex, 1); }
        } else if (existingIndex >= 0) {
            entries[existingIndex].status = status;
        } else {
            entries.push({ path: relativePath, text, status });
        }
        entries.sort((left, right) => (
            left.path.localeCompare(right.path) || left.text.localeCompare(right.text)
        ));

        const validation = this.validateState(candidate);
        if (!validation.ok) {
            return { ok: false, errors: validation.errors, warnings: validation.warnings };
        }
        this.draftState = candidate;
        return { ok: true, status, state: this.snapshot() };
    }

    assignMigrationFileComponent(relativePath, componentId) {
        this.ensureLoaded();
        const candidate = clone(this.draftState);
        const scanFiles = candidate.components.migrationInventory?.scanFiles || [];
        const entry = scanFiles.find((file) => file.path === String(relativePath || ''));
        if (!entry) {
            return { ok: false, errors: [{ path: '/migrationInventory/scanFiles', message: 'The migration file is no longer listed.' }] };
        }
        if (!candidate.components.components.some((component) => component.id === componentId)) {
            return { ok: false, errors: [{ path: '/migrationInventory/scanFiles', message: 'Select a valid component.' }] };
        }
        entry.component = componentId;
        const validation = this.validateState(candidate);
        if (!validation.ok) {
            return { ok: false, errors: validation.errors, warnings: validation.warnings };
        }
        this.draftState = candidate;
        return { ok: true, state: this.snapshot() };
    }

    removeMigrationFile(relativePath) {
        this.ensureLoaded();
        const candidate = clone(this.draftState);
        const scanFiles = candidate.components.migrationInventory?.scanFiles || [];
        const index = scanFiles.findIndex((file) => file.path === String(relativePath || ''));
        if (index < 0) {
            return {
                ok: false,
                errors: [{ path: '/migrationInventory/scanFiles', message: 'The migration file is no longer listed.' }]
            };
        }
        const [removedEntry] = scanFiles.splice(index, 1);
        const candidateStatuses = candidate.components.migrationInventory?.candidateStatuses;
        if (Array.isArray(candidateStatuses)) {
            candidate.components.migrationInventory.candidateStatuses = candidateStatuses
                .filter((entry) => entry.path.toLocaleLowerCase() !== removedEntry.path.toLocaleLowerCase());
        }
        const validation = this.validateState(candidate);
        if (!validation.ok) {
            return { ok: false, errors: validation.errors, warnings: validation.warnings };
        }
        this.draftState = candidate;
        return { ok: true, removedFile: removedEntry.path, state: this.snapshot() };
    }

    getLanguageReport() {
        this.ensureLoaded();
        const absolutePath = path.join(this.rootDir, ...LANGUAGE_REPORT_PATH.split('/'));
        const exists = fs.existsSync(absolutePath);
        if (exists && !fs.statSync(absolutePath).isFile()) {
            throw new Error(`${LANGUAGE_REPORT_PATH} is not a file.`);
        }
        const text = exists ? fs.readFileSync(absolutePath, 'utf8') : '';
        return {
            ok: true,
            relativePath: LANGUAGE_REPORT_PATH,
            exists,
            text,
            version: crypto.createHash('sha256').update(text).digest('hex'),
            languageReportDirty: this.languageReportDirty
        };
    }

    setLanguageReportDirty(dirty) {
        this.ensureLoaded();
        this.languageReportDirty = dirty === true;
        return {
            ok: true,
            dirty: this.hasChanges(),
            languageReportDirty: this.languageReportDirty
        };
    }

    saveLanguageReport(payload = {}) {
        this.ensureLoaded();
        if (this.isBuildRunning()) {
            return { ok: false, stage: 'build-running', error: 'Wait for the language build to finish before saving the report artifact.' };
        }
        if (typeof payload.text !== 'string') {
            return { ok: false, stage: 'request', error: 'Language report text must be a string.' };
        }
        if (payload.text.length > MAX_LANGUAGE_REPORT_LENGTH) {
            return { ok: false, stage: 'request', error: 'Language report text exceeds the 5,000,000 character safety limit.' };
        }
        const current = this.getLanguageReport();
        if (payload.originalVersion !== current.version) {
            return {
                ok: false,
                stage: 'conflict',
                error: 'The language report changed on disk. Reload it before saving your edits.'
            };
        }
        const absolutePath = path.join(this.rootDir, ...LANGUAGE_REPORT_PATH.split('/'));
        fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
        fs.writeFileSync(absolutePath, payload.text, 'utf8');
        this.languageReportDirty = false;
        return {
            ...this.getLanguageReport(),
            dirty: this.hasChanges()
        };
    }

    revert() {
        this.ensureLoaded();
        this.draftState = clone(this.originalState);
        this.pendingCatalogRemovals.clear();
        this.languageReportDirty = false;
        return this.snapshot();
    }

    validate() {
        this.ensureLoaded();
        return this.validateState(this.draftState);
    }

    validateState(state) {
        const errors = [];
        for (const [name, definition] of Object.entries(VIEW_DEFINITIONS)) {
            for (const error of this.schemaValidator.validateDocument(name, state[definition.stateKey])) {
                errors.push({ ...error, file: definition.file, source: 'schema' });
            }
        }
        const builderResult = this.builder.validateLanguageState(state, this.rootDir);
        errors.push(...builderResult.errors.map((message) => ({
            path: '/',
            message,
            source: 'language-builder'
        })));
        return {
            ok: errors.length === 0,
            errors,
            catalogOutputs: clone(builderResult.catalogOutputs || []),
            warnings: builderResult.warnings.map((message) => ({
                path: '/',
                message,
                source: 'language-builder'
            }))
        };
    }

    previewSave() {
        this.ensureLoaded();
        const validation = this.validate();
        const changes = this.repository.changedDocuments(this.originalState, this.draftState);
        return {
            validation,
            authoritativeFiles: changes.map((change) => change.relativePath),
            languageReportDirty: this.languageReportDirty,
            generatedCatalogRemovals: Array.from(this.pendingCatalogRemovals)
                .sort()
                .map((localeId) => `build/language/catalogs/${localeId}`)
        };
    }

    async save(request = {}, onProgress) {
        this.ensureLoaded();
        if (this.languageReportDirty) {
            return {
                ok: false,
                stage: 'language-report-unsaved',
                error: 'Save or discard the Language Report edits before saving canonical language data.'
            };
        }
        const selectedBuild = buildOptions(request);
        report(onProgress, {
            phase: 'validation',
            message: selectedBuild.mode === 'deepl'
                ? 'Validating language changes; DeepL API calls are enabled'
                : 'Validating language changes; DeepL is disabled',
            cancellable: false
        });
        const preview = this.previewSave();
        if (!preview.validation.ok) {
            return { ok: false, stage: 'validation', ...preview };
        }
        if (preview.authoritativeFiles.length === 0) {
            return {
                ok: true,
                stage: 'unchanged',
                buildMode: selectedBuild.mode,
                authoritativeFiles: [],
                generatedFiles: [],
                catalogsRemoved: [],
                state: this.snapshot()
            };
        }

        const changes = this.repository.changedDocuments(this.originalState, this.draftState);
        report(onProgress, { phase: 'snapshot', message: 'Capturing generated files for rollback', cancellable: false });
        const generatedBefore = this.buildIntegration.snapshot();
        let transaction;
        let catalogRemoval;
        try {
            report(onProgress, { phase: 'write', message: 'Writing authoritative language files', cancellable: false });
            transaction = this.repository.beginTransaction(changes);
            catalogRemoval = this.repository.beginCatalogRemoval(Array.from(this.pendingCatalogRemovals));
            const build = await this.buildIntegration.run(selectedBuild.arguments, onProgress);
            if (!build.ok) {
                report(onProgress, { phase: 'rollback', message: 'Restoring authoritative and generated files', cancellable: false });
                catalogRemoval.rollback();
                transaction.rollback();
                this.buildIntegration.restore(generatedBefore);
                return {
                    ok: false,
                    stage: 'build',
                    buildMode: selectedBuild.mode,
                    authoritativeFiles: preview.authoritativeFiles,
                    generatedFiles: [],
                    build,
                    rolledBack: true,
                    state: this.load()
                };
            }

            report(onProgress, { phase: 'compare', message: 'Checking generated file changes', cancellable: false });
            const generatedAfter = this.buildIntegration.snapshot();
            const generatedFiles = this.buildIntegration.diff(generatedBefore, generatedAfter);
            report(onProgress, { phase: 'commit', message: 'Committing language changes', cancellable: false });
            const catalogsRemoved = catalogRemoval.files;
            catalogRemoval.commit();
            const recoveryFiles = transaction.commit();
            const state = this.load();
            return {
                ok: true,
                stage: 'complete',
                buildMode: selectedBuild.mode,
                authoritativeFiles: preview.authoritativeFiles,
                generatedFiles,
                catalogsRemoved,
                recoveryFiles,
                build,
                state
            };
        } catch (error) {
            report(onProgress, { phase: 'rollback', message: 'Restoring files after an error', cancellable: false });
            if (transaction) {
                transaction.rollback();
            }
            if (catalogRemoval) {
                catalogRemoval.rollback();
            }
            this.buildIntegration.restore(generatedBefore);
            return {
                ok: false,
                stage: 'write',
                buildMode: selectedBuild.mode,
                error: error.message,
                authoritativeFiles: preview.authoritativeFiles,
                generatedFiles: [],
                catalogsRemoved: [],
                rolledBack: true,
                state: this.load()
            };
        }
    }

    async rebuild(request = {}, onProgress) {
        this.ensureLoaded();
        const selectedBuild = buildOptions(request);
        if (this.hasChanges()) {
            return {
                ok: false,
                stage: 'unsaved',
                error: 'Save or revert in-memory changes before rebuilding.'
            };
        }
        report(onProgress, {
            phase: 'mode',
            message: selectedBuild.mode === 'deepl'
                ? 'DeepL API calls are enabled for this rebuild'
                : 'DeepL is disabled; using normalized English',
            cancellable: false
        });
        const result = await this.buildIntegration.rebuildWithRollback(selectedBuild.arguments, onProgress);
        return { ...result, buildMode: selectedBuild.mode };
    }

    cancelBuild() {
        return this.buildIntegration.cancel();
    }

    isBuildRunning() {
        return this.buildIntegration.isRunning();
    }

    ensureLoaded() {
        if (!this.draftState) {
            throw new Error('Language maintenance data has not been loaded.');
        }
    }
}

module.exports = {
    buildOptions,
    LanguageMaintenanceService
};
