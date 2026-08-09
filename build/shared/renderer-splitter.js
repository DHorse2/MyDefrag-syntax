'use strict';

(function exposeSplitter(globalScope) {
    const STORAGE_PREFIX = 'mdl.renderer.splitter.';
    let generatedId = 0;

    function clamp(value, minimum, maximum) {
        return Math.min(maximum, Math.max(minimum, value));
    }

    function boundedFraction(totalSize, requestedFraction, minimumStart, minimumEnd, handleSize) {
        if (!Number.isFinite(totalSize) || totalSize <= 0) {
            return clamp(requestedFraction, 0.1, 0.9);
        }
        const minimum = clamp(minimumStart / totalSize, 0.05, 0.9);
        const maximum = clamp((totalSize - minimumEnd - handleSize) / totalSize, minimum, 0.95);
        return clamp(requestedFraction, minimum, maximum);
    }

    function storedFraction(storage, key, fallback) {
        try {
            const value = Number(storage?.getItem(`${STORAGE_PREFIX}${key}`));
            return Number.isFinite(value) && value > 0 && value < 1 ? value : fallback;
        } catch {
            return fallback;
        }
    }

    function saveFraction(storage, key, value) {
        try {
            storage?.setItem(`${STORAGE_PREFIX}${key}`, String(value));
        } catch {
            // Resizing remains available when persistent browser storage is unavailable.
        }
    }

    function attach(container, options = {}) {
        const firstPane = options.firstPane || container?.firstElementChild;
        const secondPane = options.secondPane || firstPane?.nextElementSibling;
        if (!container || !firstPane || !secondPane) {
            throw new Error('A splitter requires a container and two panes.');
        }
        const orientation = options.orientation === 'rows' ? 'rows' : 'columns';
        const separatorOrientation = orientation === 'columns' ? 'vertical' : 'horizontal';
        const minimumStart = Math.max(0, Number(options.minimumStart) || 280);
        const minimumEnd = Math.max(0, Number(options.minimumEnd) || 280);
        const handleSize = Math.max(5, Number(options.handleSize) || 9);
        const defaultFraction = clamp(Number(options.defaultFraction) || 0.5, 0.1, 0.9);
        const key = options.key || `anonymous-${generatedId + 1}`;
        let storage = options.storage;
        if (storage === undefined) {
            try {
                storage = globalScope.localStorage;
            } catch {
                storage = null;
            }
        }
        let fraction = storedFraction(storage, key, defaultFraction);

        const documentObject = container.ownerDocument;
        const separator = documentObject.createElement('div');
        separator.className = 'panel-splitter';
        separator.tabIndex = 0;
        separator.setAttribute('role', 'separator');
        separator.setAttribute('aria-orientation', separatorOrientation);
        separator.setAttribute('aria-label', options.label || 'Resize adjacent panels');
        separator.title = `${options.label || 'Resize adjacent panels'}; double-click to reset`;
        if (!firstPane.id) {
            generatedId += 1;
            firstPane.id = `splitter-pane-${generatedId}`;
        }
        if (!secondPane.id) {
            generatedId += 1;
            secondPane.id = `splitter-pane-${generatedId}`;
        }
        separator.setAttribute('aria-controls', `${firstPane.id} ${secondPane.id}`);

        container.classList.add('resizable-split');
        container.dataset.splitOrientation = orientation;
        container.dataset.splitEnabled = 'true';
        container.style.setProperty('--splitter-min-start', `${minimumStart}px`);
        container.style.setProperty('--splitter-min-end', `${minimumEnd}px`);
        container.style.setProperty('--splitter-handle-size', `${handleSize}px`);
        container.insertBefore(separator, secondPane);

        function totalSize() {
            const bounds = container.getBoundingClientRect();
            return orientation === 'columns' ? bounds.width : bounds.height;
        }

        function applyFraction(requested, persist = true) {
            const size = totalSize();
            fraction = boundedFraction(size, requested, minimumStart, minimumEnd, handleSize);
            container.style.setProperty('--splitter-position', `${fraction * 100}%`);
            separator.setAttribute('aria-valuemin', String(Math.round(
                boundedFraction(size, 0, minimumStart, minimumEnd, handleSize) * 100
            )));
            separator.setAttribute('aria-valuemax', String(Math.round(
                boundedFraction(size, 1, minimumStart, minimumEnd, handleSize) * 100
            )));
            separator.setAttribute('aria-valuenow', String(Math.round(fraction * 100)));
            if (persist) { saveFraction(storage, key, fraction); }
        }

        function fractionFromPointer(event) {
            const bounds = container.getBoundingClientRect();
            const coordinate = orientation === 'columns'
                ? event.clientX - bounds.left
                : event.clientY - bounds.top;
            const size = orientation === 'columns' ? bounds.width : bounds.height;
            return size > 0 ? coordinate / size : fraction;
        }

        function finishPointerResize(event) {
            documentObject.body.classList.remove(`is-resizing-${orientation}`);
            saveFraction(storage, key, fraction);
            if (separator.hasPointerCapture?.(event.pointerId)) {
                separator.releasePointerCapture(event.pointerId);
            }
        }

        separator.addEventListener('pointerdown', (event) => {
            if (event.button !== 0) { return; }
            event.preventDefault();
            separator.setPointerCapture?.(event.pointerId);
            documentObject.body.classList.add(`is-resizing-${orientation}`);
        });
        separator.addEventListener('pointermove', (event) => {
            if (!separator.hasPointerCapture?.(event.pointerId)) { return; }
            applyFraction(fractionFromPointer(event), false);
        });
        separator.addEventListener('pointerup', finishPointerResize);
        separator.addEventListener('pointercancel', finishPointerResize);
        separator.addEventListener('lostpointercapture', () => {
            documentObject.body.classList.remove(`is-resizing-${orientation}`);
            saveFraction(storage, key, fraction);
        });
        separator.addEventListener('keydown', (event) => {
            const direction = orientation === 'columns'
                ? { ArrowLeft: -1, ArrowRight: 1 }
                : { ArrowUp: -1, ArrowDown: 1 };
            if (event.key === 'Home') {
                event.preventDefault();
                applyFraction(0);
                return;
            }
            if (event.key === 'End') {
                event.preventDefault();
                applyFraction(1);
                return;
            }
            if (!direction[event.key]) { return; }
            event.preventDefault();
            const size = Math.max(totalSize(), 1);
            const step = event.shiftKey ? 48 : 16;
            applyFraction(fraction + (direction[event.key] * step / size));
        });
        separator.addEventListener('dblclick', () => applyFraction(defaultFraction));
        separator.addEventListener('focus', () => applyFraction(fraction, false));

        applyFraction(fraction, false);
        return {
            separator,
            setEnabled(enabled) {
                container.dataset.splitEnabled = enabled ? 'true' : 'false';
                separator.hidden = !enabled;
            },
            reset() {
                applyFraction(defaultFraction);
            },
            get fraction() {
                return fraction;
            }
        };
    }

    const api = { attach, boundedFraction };
    globalScope.MdlSplitter = api;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(typeof window === 'undefined' ? globalThis : window);
