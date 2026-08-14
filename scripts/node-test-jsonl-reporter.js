'use strict';

/**
 * Node test reporter that emits stable, line-delimited JSON records for the
 * events consumed by the PowerShell test harness. It deliberately projects the
 * Node event objects instead of serializing their implementation details.
 */
module.exports = async function* jsonLinesReporter(source) {
    for await (const event of source) {
        const record = normalizeEvent(event);
        if (record) {
            yield `${JSON.stringify(record)}\n`;
        }
    }
};

function normalizeEvent(event) {
    if (!event || typeof event.type !== 'string') return null;

    const data = event.data || {};
    const record = {
        type: event.type,
        name: data.name ?? null,
        nesting: data.nesting ?? null,
        file: data.file ?? null,
        line: data.line ?? null,
        column: data.column ?? null
    };

    if (data.details) {
        record.durationMs = Number.isFinite(data.details.duration_ms)
            ? data.details.duration_ms
            : null;
        record.typeName = data.details.type ?? null;
        if (data.details.error) {
            record.error = normalizeError(data.details.error);
        }
    }

    if (data.skip !== undefined) record.skip = data.skip;
    if (data.todo !== undefined) record.todo = data.todo;
    if (data.message !== undefined) record.message = String(data.message);
    if (event.type === 'test:coverage' && data.summary) {
        record.summary = data.summary;
    }

    return record;
}

function normalizeError(error) {
    return {
        name: error?.name ?? 'Error',
        message: error?.message ?? String(error),
        code: error?.code ?? null,
        stack: error?.stack ?? null
    };
}
