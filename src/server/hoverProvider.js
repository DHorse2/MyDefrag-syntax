'use strict';

const path = require('path');
const {
    getKeywordHelpDocuments,
    isPredefinedIdentifier
} = require('./languageData');
const {
    createHelpCommandUri,
    renderHelpMarkdown
} = require('../shared/helpDocumentation');
const {
    findKeywordAtOffset,
    inspectDirective,
    loadTranslationIndex,
    translateSource
} = require('../shared/sourceTranslation');

const DEFAULT_EXTENSION_ROOT = path.resolve(__dirname, '..', '..');
let defaultTranslationIndex;

function getTranslationIndex(options) {
    if (options.translationIndex) return options.translationIndex;
    defaultTranslationIndex ||= loadTranslationIndex({ rootDir: options.extensionRoot || DEFAULT_EXTENSION_ROOT });
    return defaultTranslationIndex;
}

function localizedKeywordAtPosition(document, position, options) {
    const text = document.getText();
    const index = getTranslationIndex(options);
    if (index.errors.length > 0) return null;
    const localeIds = new Map(index.localeRegistry.map(locale => [locale.id.toLocaleLowerCase('en'), locale.id]));
    const directive = inspectDirective(text, localeIds);
    if (directive.error) return null;
    return {
        keyword: findKeywordAtOffset(text, document.offsetAt(position), directive.locale, index),
        locale: directive.locale,
        index
    };
}

/**
 * Build an LSP hover from the converted MyDefrag Help page for the word under
 * the cursor.
 *
 * @param {import('vscode-languageserver-textdocument').TextDocument} document
 * @param {{line: number, character: number}} position
 * @param {{extensionRoot?: string}} [options]
 * @returns {{contents: {kind: string, value: string}, range: object}|null}
 */
function provideHelpHover(document, position, options = {}) {
    if (!document || !position) return null;

    const localized = localizedKeywordAtPosition(document, position, options);
    const word = localized?.keyword || wordAtPosition(document, position);
    if (!word) return null;

    const canonicalText = localized?.keyword?.canonical || word.text;
    let contextText = document.getText();
    let contextOffset = document.offsetAt(position);
    if (localized?.keyword) {
        const canonicalDocument = translateSource(contextText, {
            index: localized.index,
            targetLocale: 'en',
            sourceUri: document.uri
        });
        const mapped = canonicalDocument.mappings.find(mapping =>
            mapping.input.start === word.start && mapping.input.end === word.end
        );
        if (canonicalDocument.ok && mapped) {
            contextText = canonicalDocument.text;
            contextOffset = mapped.output.start;
        }
    }
    const context = inferHelpContext(contextText, contextOffset, canonicalText);
    let helpDocuments = getKeywordHelpDocuments(canonicalText, context);
    const predefined = isPredefinedIdentifier(canonicalText);

    if (predefined) {
        helpDocuments = [{
            text: predefined.text,
            description: `${predefined.description} (${predefined.units}).`,
            path: predefined.help[0]
        }];
    }

    const helpValue = renderHelpMarkdown(helpDocuments, {
        extensionRoot: options.extensionRoot || DEFAULT_EXTENSION_ROOT,
        linkForPage(page) {
            return createHelpCommandUri(page.path);
        }
    });
    const localizedValue = localized?.keyword
        ? [
            `**Localized keyword:** \`${word.text}\` (${localized.locale})`,
            `**Canonical MyDefrag:** \`${canonicalText}\``,
            `**Translation status:** ${word.fallbackLocale ? `English fallback from ${word.fallbackLocale}` : word.status}`
        ].join('  \n')
        : '';
    const value = [localizedValue, helpValue].filter(Boolean).join('\n\n---\n\n');
    if (!value) return null;

    return {
        contents: {
            kind: 'markdown',
            value
        },
        range: {
            start: document.positionAt(word.start),
            end: document.positionAt(word.end)
        }
    };
}

/**
 * Infer only contexts that disambiguate Help pages sharing a keyword.
 *
 * @param {string} text
 * @param {number} offset
 * @param {string} [hoveredWord]
 * @returns {string}
 */
function inferHelpContext(text, offset, hoveredWord = '') {
    const before = String(text || '').slice(0, Math.max(0, offset));
    const lineStart = before.lastIndexOf('\n') + 1;
    const line = String(text || '').slice(lineStart, String(text || '').indexOf('\n', offset) === -1
        ? undefined
        : String(text || '').indexOf('\n', offset));
    const statement = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?:\(|$)/)?.[1]?.toLowerCase();

    if (statement && statement !== String(hoveredWord).toLowerCase()) return statement;

    const structure = findCurrentStructure(before);
    if (structure === 'fileselect') return 'fileBoolean';
    if (structure === 'volumeselect') return 'volumeBoolean';
    return '';
}

function findCurrentStructure(before) {
    const markers = [];
    const pattern = /^\s*(VolumeSelect|VolumeActions|VolumeEnd|FileSelect|FileActions|FileEnd)\b/gim;
    let match;
    while ((match = pattern.exec(before)) !== null) {
        markers.push(match[1].toLowerCase());
    }

    for (let index = markers.length - 1; index >= 0; index -= 1) {
        if (markers[index] === 'fileselect' || markers[index] === 'volumeselect') {
            return markers[index];
        }
        if (markers[index] === 'fileactions' || markers[index] === 'fileend'
            || markers[index] === 'volumeactions' || markers[index] === 'volumeend') {
            return '';
        }
    }
    return '';
}

function wordAtPosition(document, position) {
    const text = document.getText();
    const offset = document.offsetAt(position);
    const lineStart = text.lastIndexOf('\n', Math.max(0, offset - 1)) + 1;
    const nextLineBreak = text.indexOf('\n', offset);
    const lineEnd = nextLineBreak === -1 ? text.length : nextLineBreak;
    const line = text.slice(lineStart, lineEnd);
    const includePattern = /!include\b/gi;
    let includeMatch;

    while ((includeMatch = includePattern.exec(line)) !== null) {
        const includeStart = lineStart + includeMatch.index;
        const includeEnd = includeStart + includeMatch[0].length;
        if (offset >= includeStart && offset <= includeEnd) {
            return { text: 'include', start: includeStart, end: includeEnd };
        }
    }

    let start = Math.min(offset, text.length);
    let end = start;

    while (start > 0 && /[A-Za-z0-9_]/.test(text[start - 1])) start -= 1;
    while (end < text.length && /[A-Za-z0-9_]/.test(text[end])) end += 1;

    if (start === end || !/[A-Za-z_]/.test(text[start])) return null;
    return { text: text.slice(start, end), start, end };
}

module.exports = {
    findCurrentStructure,
    inferHelpContext,
    provideHelpHover,
    wordAtPosition
};
