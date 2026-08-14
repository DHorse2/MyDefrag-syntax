'use strict';

const DEFAULT_SEVERITY = Object.freeze({
    Error: 1,
    Warning: 2,
    Information: 3,
    Hint: 4
});

/**
 * Converts an editor setting into an LSP diagnostic severity.
 *
 * @param {string|number} value Configured name or numeric severity.
 * @param {number} defaultValue Value returned for invalid input.
 * @param {object} [severity] Optional severity constants.
 * @returns {number}
 */
function normalizeSeveritySetting(value, defaultValue, severity = DEFAULT_SEVERITY) {
    const severityNames = {
        error: severity.Error,
        warning: severity.Warning,
        information: severity.Information,
        info: severity.Information,
        hint: severity.Hint
    };
    const normalizedName = String(value ?? '').trim().toLowerCase();
    const numericValue = Number(value);

    if (Number.isFinite(numericValue) && numericValue >= 0 && numericValue <= 4) {
        return numericValue;
    }

    return severityNames[normalizedName] ?? defaultValue;
}

/**
 * Normalizes extension/server verbosity to the supported inclusive range.
 *
 * @param {*} value Candidate verbosity.
 * @param {number} defaultValue Fallback when the candidate is not numeric.
 * @returns {number}
 */
function normalizeVerboseLevel(value, defaultValue = 5) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue)
        ? Math.min(Math.max(numericValue, 0), 10)
        : defaultValue;
}

module.exports = {
    DEFAULT_SEVERITY,
    normalizeSeveritySetting,
    normalizeVerboseLevel
};
