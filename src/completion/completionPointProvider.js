'use strict';
// completionPointProvider.js

const { buildInlineCompletion } = require('./inlineCompletionBuilder');
const { getCompletionContext } = require('./completionContext');

/**
 * Thin client-side inline completion adapter for MyDefrag keyword completions.
 */
class CompletionPointProvider {
    /**
     * @param {object} dependencies Provider dependencies.
     * @param {object} dependencies.vscode VS Code API object.
     * @param {object} dependencies.languageData Existing language-data module.
     * @param {object} [dependencies.logger] Optional extension logger.
     * @param {object} [dependencies.config] Optional extension configuration.
     * @param {Function} [dependencies.isEnabled] Optional live enabled-state reader.
     */
    constructor({ vscode, languageData, logger, config, isEnabled } = {}) {
        this.vscode = vscode;
        this.languageData = languageData;
        this.logger = logger;
        this.config = config;
        this.isEnabled = isEnabled;
    }

    /**
     * Provides inline keyword completions for a MyDefrag document.
     *
     * @param {object} request Inline completion request data.
     * @returns {object[]} VS Code inline completion items.
     */
    provide(request = {}) {
        const { document, position, token } = request;

        if (this.isEnabled && !this.isEnabled()) {
            return [];
        }

        if (!document || !position || token?.isCancellationRequested) {
            return [];
        }

        if (document.languageId !== 'mydfrg') {
            return [];
        }

        const contextInfo = getCompletionContext(document, position);
        if (!contextInfo.typed || contextInfo.typed.length < 2) {
            return [];
        }

        const suggestion = buildInlineCompletion({
            typed: contextInfo.typed,
            contextInfo,
            keywords: this.languageData
        });

        if (!suggestion?.insertText) {
            return [];
        }

        return [
            new this.vscode.InlineCompletionItem(suggestion.insertText)
        ];
    }
}

module.exports = {
    CompletionPointProvider
};
