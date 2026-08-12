'use strict';

const statusElement = document.querySelector('#startup-status');
const elapsedElement = document.querySelector('#startup-elapsed');
const historyElement = document.querySelector('#startup-history');
let lastPhase = null;

function displayStatus(status) {
    if (!status || typeof status.message !== 'string') { return; }
    statusElement.textContent = status.message;
    elapsedElement.textContent = Number.isFinite(status.elapsedMs)
        ? `${(status.elapsedMs / 1000).toFixed(1)} seconds elapsed`
        : '';

    if (status.phase && status.phase !== lastPhase) {
        const item = document.createElement('li');
        item.textContent = status.message;
        historyElement.append(item);
        lastPhase = status.phase;
    }
}

window.startupProgress.onStatus(displayStatus);
void window.startupProgress.getStatus().then(displayStatus);
