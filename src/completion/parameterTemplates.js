'use strict';
// parameterTemplates.js

const PARAMETER_TEMPLATES = Object.freeze({
    mounted: '(yes)',
    writable: '(yes)',
    remote: '(no)',
    name: '("C:")',
    label: '("")',
    commandlinevolumes: '()',
    defragment: '(Fast)',
    fastfill: '()',
    sortbyname: '(Ascending)',
    whenfinished: '(Wait)',
    batterypower: '(Ask)',
    windowsize: '(Restore)'
});

/**
 * Returns a conservative parameter template for a completed keyword.
 *
 * @param {string|object} keyword The keyword text or language-data keyword object.
 * @param {object} contextInfo Lightweight completion context.
 * @returns {string|null} A suffix template, or null when no safe template exists.
 */
function getParameterTemplate(keyword, contextInfo = {}) {
    const keywordText = typeof keyword === 'string'
        ? keyword
        : keyword?.text;

    if (!keywordText) {
        return null;
    }

    const nextCharacter = contextInfo.lineText?.[contextInfo.positionCharacter] ?? '';
    if (nextCharacter === '(') {
        return null;
    }

    return PARAMETER_TEMPLATES[String(keywordText).toLowerCase()] ?? null;
}

module.exports = {
    getParameterTemplate
};
