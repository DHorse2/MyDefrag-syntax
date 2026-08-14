'use strict';

const FEATURE_DEFINITIONS = Object.freeze([
    Object.freeze({
        setting: 'hoverEnabled',
        contextKey: 'mydfrg.hoverEnabled',
        enableCommand: 'mydfrg.hover.enable',
        disableCommand: 'mydfrg.hover.disable'
    }),
    Object.freeze({
        setting: 'wordPredictionEnabled',
        contextKey: 'mydfrg.wordPredictionEnabled',
        enableCommand: 'mydfrg.wordPrediction.enable',
        disableCommand: 'mydfrg.wordPrediction.disable'
    })
]);

/**
 * Treats each editor aid as enabled unless it is explicitly disabled.
 *
 * @param {*} value A configured feature value.
 * @returns {boolean} Whether the feature is enabled.
 */
function isFeatureEnabled(value) {
    return value !== false;
}

/**
 * Creates the client-side command and context-key controller for editor aids.
 *
 * @param {object} dependencies Controller dependencies.
 * @param {object} dependencies.vscode VS Code API object.
 * @returns {object} Registration and context synchronization operations.
 */
function createFeatureToggleController({ vscode } = {}) {
    async function setFeature(definition, enabled) {
        const settings = vscode.workspace.getConfiguration('mydfrg');
        await settings.update(
            definition.setting,
            enabled,
            vscode.ConfigurationTarget.Workspace
        );
        await vscode.commands.executeCommand(
            'setContext',
            definition.contextKey,
            enabled
        );
    }

    function registerCommands() {
        const registrations = [];

        for (const definition of FEATURE_DEFINITIONS) {
            registrations.push(
                vscode.commands.registerCommand(
                    definition.enableCommand,
                    () => setFeature(definition, true)
                ),
                vscode.commands.registerCommand(
                    definition.disableCommand,
                    () => setFeature(definition, false)
                )
            );
        }

        return registrations;
    }

    async function sync(config = {}) {
        for (const definition of FEATURE_DEFINITIONS) {
            await vscode.commands.executeCommand(
                'setContext',
                definition.contextKey,
                isFeatureEnabled(config[definition.setting])
            );
        }
    }

    return {
        registerCommands,
        sync
    };
}

module.exports = {
    FEATURE_DEFINITIONS,
    createFeatureToggleController,
    isFeatureEnabled
};
