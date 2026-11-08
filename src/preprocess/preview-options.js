'use strict';

const PREVIEW_SCHEME = 'untitled';
const DEFAULT_PREVIEW_MODE = 'annotations-line-numbers';

const PREVIEW_MODES = Object.freeze([
    Object.freeze({
        id: 'raw',
        command: 'mydfrg.openPreview.raw',
        label: 'Raw (Executable)',
        annotations: false,
        lineNumbers: false,
        fileHeaders: false,
        executable: true
    }),
    Object.freeze({
        id: 'annotations',
        command: 'mydfrg.openPreview.annotations',
        label: 'Annotations',
        annotations: true,
        lineNumbers: false,
        fileHeaders: false,
        executable: false
    }),
    Object.freeze({
        id: 'annotations-file-headers',
        command: 'mydfrg.openPreview.annotationsFileHeaders',
        label: 'Annotations + File Headers',
        annotations: true,
        lineNumbers: false,
        fileHeaders: true,
        executable: false
    }),
    Object.freeze({
        id: 'annotations-line-numbers',
        command: 'mydfrg.openPreview.annotationsLineNumbers',
        label: 'Annotations + Line Numbers',
        annotations: true,
        lineNumbers: true,
        fileHeaders: false,
        executable: false
    }),
    Object.freeze({
        id: 'annotations-line-numbers-file-headers',
        command: 'mydfrg.openPreview.annotationsLineNumbersFileHeaders',
        label: 'Annotations + Line Numbers + File Headers',
        annotations: true,
        lineNumbers: true,
        fileHeaders: true,
        executable: false
    })
]);

const previewModesById = new Map(PREVIEW_MODES.map(mode => [mode.id, mode]));

function getPreviewMode(modeId = DEFAULT_PREVIEW_MODE) {
    const mode = previewModesById.get(modeId);
    if (!mode) {
        throw new Error(`Unknown preview mode: ${modeId}`);
    }
    return mode;
}

function getSourceExtension(sourcePath) {
    const match = /\.(mydc|myd)$/i.exec(sourcePath);
    if (!match) {
        throw new Error(`Preview source must end in .myd or .mydc: ${sourcePath}`);
    }
    return `.${match[1].toLowerCase()}`;
}

function getPreviewExtension(sourcePath, modeId = DEFAULT_PREVIEW_MODE) {
    const sourceExtension = getSourceExtension(sourcePath);
    return getPreviewMode(modeId).executable
        ? sourceExtension
        : `${sourceExtension}d`;
}

function buildPreviewDocumentPath(sourcePath, modeId = DEFAULT_PREVIEW_MODE) {
    const sourceExtension = getSourceExtension(sourcePath);
    const stem = sourcePath.slice(0, -sourceExtension.length);
    const previewExtension = getPreviewExtension(sourcePath, modeId);
    return `${stem}.preview-${modeId}${previewExtension}`;
}

function buildPreviewQuery(sourceUri, modeId = DEFAULT_PREVIEW_MODE, instanceId) {
    getPreviewMode(modeId);
    const params = new URLSearchParams({
        source: String(sourceUri),
        mode: modeId
    });
    if (instanceId !== undefined && instanceId !== null) {
        params.set('instance', String(instanceId));
    }
    return params.toString();
}

function parsePreviewQuery(query) {
    const params = new URLSearchParams(query || '');
    const source = params.get('source');
    const modeId = params.get('mode') || DEFAULT_PREVIEW_MODE;
    getPreviewMode(modeId);
    if (!source) {
        throw new Error('Preview URI is missing its source URI.');
    }
    return { source, modeId };
}

function createLanguageClientDocumentSelector() {
    return [
        { scheme: 'file', language: 'mydfrg' },
        { scheme: PREVIEW_SCHEME, language: 'mydfrg' }
    ];
}

module.exports = {
    PREVIEW_SCHEME,
    DEFAULT_PREVIEW_MODE,
    PREVIEW_MODES,
    buildPreviewDocumentPath,
    buildPreviewQuery,
    createLanguageClientDocumentSelector,
    getPreviewExtension,
    getPreviewMode,
    parsePreviewQuery
};
