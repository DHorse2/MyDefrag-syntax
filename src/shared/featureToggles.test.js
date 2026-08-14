'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
    createFeatureToggleController,
    isFeatureEnabled
} = require('./featureToggles');

function createVscode() {
    const commandHandlers = new Map();
    const contextUpdates = [];
    const settingUpdates = [];
    const vscode = {
        ConfigurationTarget: { Workspace: 2 },
        commands: {
            registerCommand(command, handler) {
                commandHandlers.set(command, handler);
                return { dispose() {} };
            },
            async executeCommand(command, ...args) {
                if (command === 'setContext') {
                    contextUpdates.push(args);
                }
            }
        },
        workspace: {
            getConfiguration(section) {
                assert.equal(section, 'mydfrg');
                return {
                    async update(setting, value, target) {
                        settingUpdates.push([setting, value, target]);
                    }
                };
            }
        }
    };

    return { commandHandlers, contextUpdates, settingUpdates, vscode };
}

test('features default on and only explicit false disables them', () => {
    assert.equal(isFeatureEnabled(undefined), true);
    assert.equal(isFeatureEnabled(true), true);
    assert.equal(isFeatureEnabled(false), false);
});

test('controller registers enable and disable commands for both editor aids', () => {
    const mock = createVscode();
    const controller = createFeatureToggleController({ vscode: mock.vscode });

    const registrations = controller.registerCommands();

    assert.equal(registrations.length, 4);
    assert.deepEqual([...mock.commandHandlers.keys()].sort(), [
        'mydfrg.hover.disable',
        'mydfrg.hover.enable',
        'mydfrg.wordPrediction.disable',
        'mydfrg.wordPrediction.enable'
    ]);
});

test('controller persists a toggle and immediately updates its context key', async () => {
    const mock = createVscode();
    const controller = createFeatureToggleController({ vscode: mock.vscode });
    controller.registerCommands();

    await mock.commandHandlers.get('mydfrg.hover.disable')();

    assert.deepEqual(mock.settingUpdates, [['hoverEnabled', false, 2]]);
    assert.deepEqual(mock.contextUpdates, [['mydfrg.hoverEnabled', false]]);
});

test('controller synchronizes both title-button context keys from configuration', async () => {
    const mock = createVscode();
    const controller = createFeatureToggleController({ vscode: mock.vscode });

    await controller.sync({ hoverEnabled: false, wordPredictionEnabled: true });

    assert.deepEqual(mock.contextUpdates, [
        ['mydfrg.hoverEnabled', false],
        ['mydfrg.wordPredictionEnabled', true]
    ]);
});
