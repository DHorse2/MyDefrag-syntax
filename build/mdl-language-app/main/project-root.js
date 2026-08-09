'use strict';

const fs = require('fs');
const path = require('path');

const REQUIRED_PATHS = [
    'language/canonical/components.json',
    'language/canonical/language-locales.json',
    'language/canonical/component-catalog.json',
    'language/canonical/diagnostic-messages.json',
    'language/canonical/semantic-keywords.json',
    'language/canonical/preview-modes.json',
    'build/scripts/build-language.js'
];

function isProjectRoot(candidate, fileSystem = fs) {
    if (!candidate) { return false; }
    const rootDir = path.resolve(candidate);
    return REQUIRED_PATHS.every((relativePath) => fileSystem.existsSync(path.join(rootDir, relativePath)));
}

function projectRootArgument(argv) {
    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index];
        if (argument.startsWith('--project-root=')) {
            return argument.slice('--project-root='.length);
        }
        if (argument === '--project-root' && argv[index + 1]) {
            return argv[index + 1];
        }
    }
    return null;
}

function defaultProjectRoot(options) {
    const explicit = projectRootArgument(options.argv || []);
    if (explicit) { return path.resolve(explicit); }
    if (!options.isPackaged && options.developmentRoot) {
        return path.resolve(options.developmentRoot);
    }
    return path.resolve(options.cwd || process.cwd());
}

module.exports = {
    REQUIRED_PATHS,
    defaultProjectRoot,
    isProjectRoot,
    projectRootArgument
};
