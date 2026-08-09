'use strict';

const CHANNELS = Object.freeze({
    load: 'locale-maintenance:load',
    select: 'locale-maintenance:select',
    requestApiTranslation: 'locale-maintenance:request-api-translation',
    replaceWithApiTranslation: 'locale-maintenance:replace-with-api-translation',
    applyTranslation: 'locale-maintenance:apply-translation',
    removeTranslation: 'locale-maintenance:remove-translation',
    revert: 'locale-maintenance:revert',
    reload: 'locale-maintenance:reload',
    validate: 'locale-maintenance:validate',
    previewSave: 'locale-maintenance:preview-save',
    confirmSave: 'locale-maintenance:confirm-save',
    save: 'locale-maintenance:save',
    rebuild: 'locale-maintenance:rebuild',
    cancelBuild: 'locale-maintenance:cancel-build',
    exit: 'locale-maintenance:exit'
});

const EVENTS = Object.freeze({
    progress: 'locale-maintenance:progress'
});

module.exports = { CHANNELS, EVENTS };
