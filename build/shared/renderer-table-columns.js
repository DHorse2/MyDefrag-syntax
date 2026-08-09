'use strict';

(function exposeTableColumns(globalScope) {
    const STORAGE_PREFIX = 'mdl.renderer.table-columns.';
    let generatedTableId = 0;

    function boundedWidth(requestedWidth, minimumWidth, maximumWidth) {
        const requested = Number.isFinite(requestedWidth) ? requestedWidth : minimumWidth;
        return Math.min(maximumWidth, Math.max(minimumWidth, requested));
    }

    function resolveStorage(explicitStorage) {
        if (explicitStorage !== undefined) { return explicitStorage; }
        try {
            return globalScope.localStorage;
        } catch {
            return null;
        }
    }

    function readWidths(storage, key, columnCount) {
        try {
            const value = JSON.parse(storage?.getItem(`${STORAGE_PREFIX}${key}`) || 'null');
            if (!Array.isArray(value) || value.length !== columnCount) { return null; }
            return value.every((width) => Number.isFinite(width) && width > 0) ? value : null;
        } catch {
            return null;
        }
    }

    function saveWidths(storage, key, widths) {
        try {
            storage?.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(widths));
        } catch {
            // Column resizing remains available when persistent storage is unavailable.
        }
    }

    function removeWidths(storage, key) {
        try {
            storage?.removeItem(`${STORAGE_PREFIX}${key}`);
        } catch {
            // Reset still applies to the current table when storage is unavailable.
        }
    }

    function attach(table, options = {}) {
        const headers = Array.from(table?.querySelectorAll('thead th') || []);
        if (!table || headers.length === 0) {
            throw new Error('Column resizing requires a table with header cells.');
        }
        const key = options.key || `anonymous-${generatedTableId + 1}`;
        const minimumWidth = Math.max(40, Number(options.minimumWidth) || 72);
        const maximumWidth = Math.max(minimumWidth, Number(options.maximumWidth) || 960);
        const storage = resolveStorage(options.storage);
        let widths = readWidths(storage, key, headers.length);
        let activeResize = null;

        if (!table.id) {
            generatedTableId += 1;
            table.id = `resizable-table-${generatedTableId}`;
        }
        table.classList.add('resizable-column-table');

        const existingColumnGroup = table.querySelector(':scope > colgroup');
        const columnGroup = existingColumnGroup || table.ownerDocument.createElement('colgroup');
        if (!existingColumnGroup) { table.prepend(columnGroup); }
        while (columnGroup.children.length < headers.length) {
            columnGroup.append(table.ownerDocument.createElement('col'));
        }
        while (columnGroup.children.length > headers.length) {
            columnGroup.lastElementChild.remove();
        }
        const columns = Array.from(columnGroup.children);
        const separators = [];

        function measuredWidths() {
            return headers.map((header) => boundedWidth(
                Math.ceil(header.getBoundingClientRect().width) || 144,
                minimumWidth,
                maximumWidth
            ));
        }

        function ensureWidths() {
            if (!widths) { widths = measuredWidths(); }
            return widths;
        }

        function updateSeparator(index) {
            if (!widths || !separators[index]) { return; }
            separators[index].setAttribute('aria-valuemin', String(minimumWidth));
            separators[index].setAttribute('aria-valuemax', String(maximumWidth));
            separators[index].setAttribute('aria-valuenow', String(Math.round(widths[index])));
        }

        function applyWidths(persist = true) {
            if (!widths) {
                table.classList.remove('has-resized-columns');
                for (const column of columns) { column.style.removeProperty('width'); }
                table.style.removeProperty('width');
                for (const separator of separators) { separator.removeAttribute('aria-valuenow'); }
                if (persist) { removeWidths(storage, key); }
                return;
            }
            table.classList.add('has-resized-columns');
            widths = widths.map((width) => boundedWidth(width, minimumWidth, maximumWidth));
            for (let index = 0; index < columns.length; index += 1) {
                columns[index].style.width = `${widths[index]}px`;
                updateSeparator(index);
            }
            table.style.width = `${widths.reduce((total, width) => total + width, 0)}px`;
            if (persist) { saveWidths(storage, key, widths); }
        }

        function resizeColumn(index, requestedWidth, persist = true) {
            ensureWidths();
            if (index < widths.length - 1) {
                const combinedWidth = widths[index] + widths[index + 1];
                const maximumLeft = Math.min(maximumWidth, combinedWidth - minimumWidth);
                const nextWidth = boundedWidth(requestedWidth, minimumWidth, maximumLeft);
                widths[index + 1] = combinedWidth - nextWidth;
                widths[index] = nextWidth;
            } else {
                widths[index] = boundedWidth(requestedWidth, minimumWidth, maximumWidth);
            }
            applyWidths(persist);
        }

        function finishResize(event) {
            if (!activeResize || activeResize.pointerId !== event.pointerId) { return; }
            table.ownerDocument.body.classList.remove('is-resizing-columns');
            saveWidths(storage, key, widths);
            if (activeResize.separator.hasPointerCapture?.(event.pointerId)) {
                activeResize.separator.releasePointerCapture(event.pointerId);
            }
            activeResize = null;
        }

        headers.forEach((header, index) => {
            const label = header.textContent.trim() || `column ${index + 1}`;
            const separator = table.ownerDocument.createElement('span');
            separator.className = 'table-column-resizer';
            separator.tabIndex = 0;
            separator.setAttribute('role', 'separator');
            separator.setAttribute('aria-orientation', 'vertical');
            separator.setAttribute('aria-controls', table.id);
            separator.setAttribute('aria-label', `Resize ${label} column`);
            separator.title = `Resize ${label} column; double-click to reset all columns`;
            separators.push(separator);
            header.append(separator);

            separator.addEventListener('pointerdown', (event) => {
                if (event.button !== 0) { return; }
                event.preventDefault();
                event.stopPropagation();
                ensureWidths();
                activeResize = {
                    pointerId: event.pointerId,
                    separator,
                    index,
                    startX: event.clientX,
                    startWidth: widths[index]
                };
                separator.setPointerCapture?.(event.pointerId);
                table.ownerDocument.body.classList.add('is-resizing-columns');
            });
            separator.addEventListener('pointermove', (event) => {
                if (!activeResize || activeResize.pointerId !== event.pointerId) { return; }
                resizeColumn(index, activeResize.startWidth + event.clientX - activeResize.startX, false);
            });
            separator.addEventListener('pointerup', finishResize);
            separator.addEventListener('pointercancel', finishResize);
            separator.addEventListener('lostpointercapture', () => {
                table.ownerDocument.body.classList.remove('is-resizing-columns');
                if (widths) { saveWidths(storage, key, widths); }
                activeResize = null;
            });
            separator.addEventListener('keydown', (event) => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { return; }
                event.preventDefault();
                ensureWidths();
                if (event.key === 'Home') {
                    resizeColumn(index, minimumWidth);
                } else if (event.key === 'End') {
                    resizeColumn(index, maximumWidth);
                } else {
                    const direction = event.key === 'ArrowLeft' ? -1 : 1;
                    resizeColumn(index, widths[index] + direction * (event.shiftKey ? 48 : 16));
                }
            });
            separator.addEventListener('dblclick', (event) => {
                event.preventDefault();
                widths = null;
                applyWidths();
            });
        });

        applyWidths(false);
        return {
            separators,
            reset() {
                widths = null;
                applyWidths();
            },
            get widths() {
                return widths ? [...widths] : null;
            }
        };
    }

    const api = { attach, boundedWidth };
    globalScope.MdlTableColumns = api;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(typeof window === 'undefined' ? globalThis : window);
