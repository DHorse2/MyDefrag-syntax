-- diagnostics_schema.sql
-- SQLite schema for MyDefrag diagnostic snapshot and navigation data.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS diagnostic_severity (
    severity_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    is_navigable INTEGER NOT NULL DEFAULT 1 CHECK (is_navigable IN (0, 1))
);

CREATE TABLE IF NOT EXISTS diagnostic_workflow_state (
    state TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    is_terminal INTEGER NOT NULL DEFAULT 0 CHECK (is_terminal IN (0, 1)),
    excludes_from_navigation INTEGER NOT NULL DEFAULT 1 CHECK (excludes_from_navigation IN (0, 1))
);

CREATE TABLE IF NOT EXISTS diagnostic_snapshot (
    snapshot_id INTEGER PRIMARY KEY,
    generated_at TEXT NOT NULL,
    event TEXT NOT NULL,
    changed_uri TEXT,
    parser_state TEXT,
    source_path TEXT,
    imported_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    raw_json TEXT
);

CREATE TABLE IF NOT EXISTS diagnostic_document (
    document_id INTEGER PRIMARY KEY,
    uri TEXT NOT NULL UNIQUE,
    file_path TEXT,
    normalized_path TEXT NOT NULL UNIQUE,
    workspace_relative_path TEXT,
    extension TEXT,
    first_seen_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    last_seen_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS diagnostic_item (
    diagnostic_id INTEGER PRIMARY KEY,
    snapshot_id INTEGER NOT NULL REFERENCES diagnostic_snapshot(snapshot_id) ON DELETE CASCADE,
    document_id INTEGER NOT NULL REFERENCES diagnostic_document(document_id) ON DELETE CASCADE,
    diagnostic_key TEXT NOT NULL,
    line INTEGER NOT NULL DEFAULT 0 CHECK (line >= 0),
    character INTEGER NOT NULL DEFAULT 0 CHECK (character >= 0),
    end_line INTEGER CHECK (end_line IS NULL OR end_line >= 0),
    end_character INTEGER CHECK (end_character IS NULL OR end_character >= 0),
    severity_id INTEGER NOT NULL REFERENCES diagnostic_severity(severity_id),
    message TEXT NOT NULL,
    source TEXT,
    code TEXT,
    token TEXT,
    keyword_exists INTEGER CHECK (keyword_exists IS NULL OR keyword_exists IN (0, 1)),
    raw_json TEXT,
    imported_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE (snapshot_id, diagnostic_key)
);

CREATE TABLE IF NOT EXISTS diagnostic_current_state (
    diagnostic_key TEXT PRIMARY KEY,
    state TEXT NOT NULL REFERENCES diagnostic_workflow_state(state),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_by TEXT,
    command TEXT,
    reason TEXT,
    snapshot_id INTEGER REFERENCES diagnostic_snapshot(snapshot_id) ON DELETE SET NULL,
    diagnostic_id INTEGER REFERENCES diagnostic_item(diagnostic_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS diagnostic_state_event (
    event_id INTEGER PRIMARY KEY,
    diagnostic_key TEXT NOT NULL,
    old_state TEXT REFERENCES diagnostic_workflow_state(state),
    new_state TEXT NOT NULL REFERENCES diagnostic_workflow_state(state),
    command TEXT,
    reason TEXT,
    occurred_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    snapshot_id INTEGER REFERENCES diagnostic_snapshot(snapshot_id) ON DELETE SET NULL,
    diagnostic_id INTEGER REFERENCES diagnostic_item(diagnostic_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS diagnostic_ai_prompt (
    prompt_id INTEGER PRIMARY KEY,
    diagnostic_key TEXT NOT NULL,
    diagnostic_id INTEGER REFERENCES diagnostic_item(diagnostic_id) ON DELETE SET NULL,
    prompt_path TEXT NOT NULL,
    item_path TEXT,
    generated_at TEXT NOT NULL,
    prompt_text TEXT,
    payload_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_diagnostic_snapshot_generated_at
    ON diagnostic_snapshot(generated_at);

CREATE INDEX IF NOT EXISTS idx_diagnostic_document_normalized_path
    ON diagnostic_document(normalized_path);

CREATE INDEX IF NOT EXISTS idx_diagnostic_item_snapshot_document
    ON diagnostic_item(snapshot_id, document_id);

CREATE INDEX IF NOT EXISTS idx_diagnostic_item_key
    ON diagnostic_item(diagnostic_key);

CREATE INDEX IF NOT EXISTS idx_diagnostic_item_severity
    ON diagnostic_item(severity_id);

CREATE INDEX IF NOT EXISTS idx_diagnostic_state_event_key_time
    ON diagnostic_state_event(diagnostic_key, occurred_at);

CREATE VIEW IF NOT EXISTS v_diagnostic_item_with_state AS
SELECT
    item.diagnostic_id,
    item.snapshot_id,
    snapshot.generated_at,
    snapshot.event,
    snapshot.parser_state,
    document.uri,
    document.file_path,
    document.normalized_path,
    item.diagnostic_key,
    item.line,
    item.character,
    item.end_line,
    item.end_character,
    item.severity_id,
    severity.name AS severity_name,
    item.message,
    item.source,
    item.code,
    item.token,
    item.keyword_exists,
    COALESCE(state.state, '') AS workflow_state,
    CASE
        WHEN severity.is_navigable = 1
            AND COALESCE(workflow.excludes_from_navigation, 0) = 0
        THEN 1
        ELSE 0
    END AS is_navigation_eligible
FROM diagnostic_item AS item
JOIN diagnostic_snapshot AS snapshot
    ON snapshot.snapshot_id = item.snapshot_id
JOIN diagnostic_document AS document
    ON document.document_id = item.document_id
JOIN diagnostic_severity AS severity
    ON severity.severity_id = item.severity_id
LEFT JOIN diagnostic_current_state AS state
    ON state.diagnostic_key = item.diagnostic_key
LEFT JOIN diagnostic_workflow_state AS workflow
    ON workflow.state = COALESCE(state.state, '');

CREATE VIEW IF NOT EXISTS v_diagnostic_snapshot_counts AS
SELECT
    snapshot.snapshot_id,
    snapshot.generated_at,
    snapshot.event,
    snapshot.parser_state,
    COUNT(item.diagnostic_id) AS total_messages,
    SUM(CASE WHEN severity.is_navigable = 1 THEN 1 ELSE 0 END) AS traversable_messages,
    SUM(CASE WHEN view_item.is_navigation_eligible = 1 THEN 1 ELSE 0 END) AS eligible_messages,
    COUNT(DISTINCT item.document_id) AS total_files,
    COUNT(DISTINCT CASE WHEN severity.is_navigable = 1 THEN item.document_id END) AS traversable_files,
    COUNT(DISTINCT CASE WHEN view_item.is_navigation_eligible = 1 THEN item.document_id END) AS eligible_files
FROM diagnostic_snapshot AS snapshot
LEFT JOIN diagnostic_item AS item
    ON item.snapshot_id = snapshot.snapshot_id
LEFT JOIN diagnostic_severity AS severity
    ON severity.severity_id = item.severity_id
LEFT JOIN v_diagnostic_item_with_state AS view_item
    ON view_item.diagnostic_id = item.diagnostic_id
GROUP BY
    snapshot.snapshot_id,
    snapshot.generated_at,
    snapshot.event,
    snapshot.parser_state;
