'use strict';

const { CodeActionKind, DiagnosticSeverity } = require('vscode-languageserver/node');

const DIRECTIVE_NAME = '@mydfrg-language';
const DEFAULT_SOURCE_LOCALE = 'en';
const DIAGNOSTIC_SOURCE = 'MyDefrag Language';
const FIX_ALL_KIND = `${CodeActionKind.SourceFixAll}.mydfrgLanguage`;
const DIAGNOSTIC_CODES = Object.freeze({
    missing: 'mydfrg.sourceLanguage.missing',
    invalidSyntax: 'mydfrg.sourceLanguage.invalidSyntax',
    invalidLocale: 'mydfrg.sourceLanguage.invalidLocale',
    duplicate: 'mydfrg.sourceLanguage.duplicate'
});

const DIRECTIVE_CANDIDATE_PATTERN = /^\s*(?:\/\/|#|--|REM\b|;)\s*@mydfrg-language\b/i;
const DIRECTIVE_PATTERN = /^(\s*)(\/\/|#|--|REM\b)\s*@mydfrg-language(?:\s+([A-Za-z0-9-]+))?\s*$/i;
const LOOSE_LOCALE_PATTERN = /@mydfrg-language\b(?:\s+([A-Za-z0-9-]+))?/i;

function canonicalDirective(locale) {
    return `// ${DIRECTIVE_NAME} ${locale}`;
}

function normalizeLocales(locales = []) {
    const canonicalByLowercase = new Map();
    for (const locale of locales) {
        const id = typeof locale === 'string' ? locale : locale?.id;
        if (id) {
            canonicalByLowercase.set(String(id).toLowerCase(), String(id));
        }
    }
    return canonicalByLowercase;
}

function lineRange(line, text) {
    return {
        start: { line, character: 0 },
        end: { line, character: text.length }
    };
}

function createDiagnostic({ code, message, range, severity, data }) {
    return {
        code,
        message,
        range,
        severity,
        source: DIAGNOSTIC_SOURCE,
        data
    };
}

/**
 * Validates the extension-owned source-language directive. The canonical
 * directive uses // because it is valid MyDefrag runtime comment syntax.
 *
 * @param {string} text Document text.
 * @param {object[]} supportedLocales Registered source locales.
 * @param {string} preferredLocale Default locale for corrective edits.
 * @returns {object[]} LSP diagnostics with deterministic edit data.
 */
function analyzeSourceLanguageDirective(
    text,
    supportedLocales = [],
    preferredLocale = DEFAULT_SOURCE_LOCALE
) {
    const lines = String(text ?? '').split(/\r?\n/);
    const localeMap = normalizeLocales(supportedLocales);
    const fallbackLocale = localeMap.get(String(preferredLocale).toLowerCase())
        ?? localeMap.values().next().value
        ?? DEFAULT_SOURCE_LOCALE;
    const occurrences = [];

    lines.forEach((lineText, line) => {
        if (DIRECTIVE_CANDIDATE_PATTERN.test(lineText)) {
            occurrences.push({ line, lineText });
        }
    });

    if (occurrences.length === 0) {
        const insertionCharacter = text?.charCodeAt?.(0) === 0xFEFF ? 1 : 0;
        return [createDiagnostic({
            code: DIAGNOSTIC_CODES.missing,
            message: 'Declare the source language used by this MyDefrag document.',
            range: {
                start: { line: 0, character: insertionCharacter },
                end: { line: 0, character: insertionCharacter }
            },
            severity: DiagnosticSeverity.Hint,
            data: {
                directiveKind: 'missing',
                locale: fallbackLocale,
                replacement: canonicalDirective(fallbackLocale)
            }
        })];
    }

    const diagnostics = [];
    const primary = occurrences[0];
    const exactMatch = primary.lineText.match(DIRECTIVE_PATTERN);
    const looseLocale = primary.lineText.match(LOOSE_LOCALE_PATTERN)?.[1] ?? null;
    const locale = exactMatch?.[3] ?? looseLocale;
    const canonicalLocale = localeMap.get(String(locale ?? '').toLowerCase());
    const suggestedLocale = canonicalLocale ?? fallbackLocale;

    if (!exactMatch) {
        diagnostics.push(createDiagnostic({
            code: DIAGNOSTIC_CODES.invalidSyntax,
            message: `Use runtime-safe directive syntax: ${canonicalDirective(suggestedLocale)}`,
            range: lineRange(primary.line, primary.lineText),
            severity: DiagnosticSeverity.Warning,
            data: {
                directiveKind: 'invalidSyntax',
                line: primary.line,
                locale: suggestedLocale,
                replacement: canonicalDirective(suggestedLocale)
            }
        }));
    } else if (!locale || !canonicalLocale || locale !== canonicalLocale) {
        const reason = !locale
            ? 'The source-language directive requires a locale identifier.'
            : canonicalLocale
                ? `Use the canonical locale spelling '${canonicalLocale}'.`
                : `Unknown source-language locale '${locale}'.`;
        diagnostics.push(createDiagnostic({
            code: DIAGNOSTIC_CODES.invalidLocale,
            message: reason,
            range: lineRange(primary.line, primary.lineText),
            severity: DiagnosticSeverity.Warning,
            data: {
                directiveKind: 'invalidLocale',
                line: primary.line,
                locale: suggestedLocale,
                replacement: canonicalDirective(suggestedLocale)
            }
        }));
    }

    for (const duplicate of occurrences.slice(1)) {
        diagnostics.push(createDiagnostic({
            code: DIAGNOSTIC_CODES.duplicate,
            message: 'Only one source-language directive is allowed per document.',
            range: lineRange(duplicate.line, duplicate.lineText),
            severity: DiagnosticSeverity.Warning,
            data: {
                directiveKind: 'duplicate',
                line: duplicate.line,
                replacement: ''
            }
        }));
    }

    return diagnostics;
}

function allowsKind(only, kind) {
    if (!Array.isArray(only) || only.length === 0) {
        return true;
    }
    return only.some(requested => kind === requested || kind.startsWith(`${requested}.`));
}

function rangesEqual(left, right) {
    return left?.start?.line === right?.start?.line
        && left?.start?.character === right?.start?.character
        && left?.end?.line === right?.end?.line
        && left?.end?.character === right?.end?.character;
}

function editForDiagnostic(diagnostic, text) {
    const data = diagnostic?.data;
    if (!data?.directiveKind) {
        return null;
    }

    if (data.directiveKind === 'missing') {
        const eol = String(text).includes('\r\n') ? '\r\n' : '\n';
        return {
            range: diagnostic.range,
            newText: `${data.replacement}${eol}`
        };
    }

    return {
        range: diagnostic.range,
        newText: data.replacement
    };
}

function titleForDiagnostic(diagnostic) {
    switch (diagnostic?.data?.directiveKind) {
        case 'missing':
            return 'Add MyDefrag source-language directive';
        case 'duplicate':
            return 'Remove duplicate MyDefrag source-language directive';
        default:
            return `Use ${diagnostic?.data?.replacement || 'a valid source-language directive'}`;
    }
}

/**
 * Builds document-scoped, deterministic quick fixes and a safe combined fix.
 *
 * @param {object} options Code-action inputs.
 * @returns {object[]} LSP code actions.
 */
function provideSourceLanguageCodeActions(options = {}) {
    const {
        uri,
        text = '',
        contextDiagnostics = [],
        supportedLocales = [],
        preferredLocale = DEFAULT_SOURCE_LOCALE,
        only
    } = options;
    if (!uri) {
        return [];
    }

    const relevantCodes = new Set(Object.values(DIAGNOSTIC_CODES));
    const requestedDiagnostics = contextDiagnostics.filter(
        diagnostic => relevantCodes.has(diagnostic.code)
    );
    const currentDiagnostics = analyzeSourceLanguageDirective(
        text,
        supportedLocales,
        preferredLocale
    );
    const actions = [];

    if (allowsKind(only, CodeActionKind.QuickFix)) {
        for (const requestedDiagnostic of requestedDiagnostics) {
            const diagnostic = currentDiagnostics.find(current =>
                current.code === requestedDiagnostic.code
                && rangesEqual(current.range, requestedDiagnostic.range)
            );
            const edit = editForDiagnostic(diagnostic, text);
            if (!edit) continue;
            actions.push({
                title: titleForDiagnostic(diagnostic),
                kind: CodeActionKind.QuickFix,
                diagnostics: [requestedDiagnostic],
                isPreferred: true,
                edit: { changes: { [uri]: [edit] } }
            });
        }
    }

    if (allowsKind(only, FIX_ALL_KIND)) {
        const edits = currentDiagnostics
            .map(diagnostic => editForDiagnostic(diagnostic, text))
            .filter(Boolean);
        if (edits.length > 0) {
            actions.push({
                title: 'Fix all MyDefrag source-language directives',
                kind: FIX_ALL_KIND,
                diagnostics: currentDiagnostics,
                edit: { changes: { [uri]: edits } }
            });
        }
    }

    return actions;
}

module.exports = {
    DEFAULT_SOURCE_LOCALE,
    DIAGNOSTIC_CODES,
    DIRECTIVE_NAME,
    FIX_ALL_KIND,
    analyzeSourceLanguageDirective,
    canonicalDirective,
    provideSourceLanguageCodeActions
};
