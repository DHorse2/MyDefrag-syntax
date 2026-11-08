'use strict';

const path = require('node:path');
const { fileURLToPath } = require('node:url');
const { PREVIEW_SCHEME } = require('../preprocess/preview-options');

function normalizeUri(uri) {
    return uri?.toString?.() ?? String(uri);
}

function previewUrlToFilePath(url) {
    const decodedPath = decodeURIComponent(url.pathname);

    if (url.hostname) {
        const uncPath = `//${url.hostname}${decodedPath}`;
        return process.platform === 'win32'
            ? uncPath.replace(/\//g, '\\')
            : uncPath;
    }

    if (/^\/[a-zA-Z]:\//.test(decodedPath)) {
        return decodedPath.slice(1).replace(/\//g, path.win32.sep);
    }

    return path.normalize(decodedPath);
}

function getFilePathFromDocumentUri(uri) {
    const value = normalizeUri(uri);
    const url = new URL(value);

    if (url.protocol === 'file:') {
        return fileURLToPath(url);
    }
    if (url.protocol === `${PREVIEW_SCHEME}:`) {
        return previewUrlToFilePath(url);
    }

    throw new Error(`Unsupported document URI scheme: ${url.protocol}`);
}

module.exports = {
    getFilePathFromDocumentUri,
    normalizeUri
};
