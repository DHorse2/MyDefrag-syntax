-- diagnostics_bootstrap.sql
-- Seed/reference data for the MyDefrag diagnostic SQLite schema.
--
-- Usage:
--   sqlite3 data/diagnostics.sqlite ".read data/diagnostics_schema.sql"
--   sqlite3 data/diagnostics.sqlite ".read data/diagnostics_bootstrap.sql"

PRAGMA foreign_keys = ON;

BEGIN;

INSERT INTO schema_metadata (key, value, updated_at)
VALUES
    ('schema_name', 'mydefrag_diagnostics', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('schema_version', '1', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('schema_source', 'D:\Script\MyDefrag-syntax\data\diagnostics_schema.sql', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('bootstrap_source', 'D:\Script\MyDefrag-syntax\data\diagnostics_bootstrap.sql', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('diagnostics_snapshot_source', '.user\logs\diagnostics-latest.json', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('diagnostics_state_source', '.user\logs\session_dismissed.json', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(key) DO UPDATE SET
    value = excluded.value,
    updated_at = excluded.updated_at;

INSERT INTO diagnostic_severity (severity_id, name, is_navigable)
VALUES
    (1, 'Error', 1),
    (2, 'Warning', 1),
    (3, 'Information', 0),
    (4, 'Hint', 1)
ON CONFLICT(severity_id) DO UPDATE SET
    name = excluded.name,
    is_navigable = excluded.is_navigable;

INSERT INTO diagnostic_workflow_state (state, description, is_terminal, excludes_from_navigation)
VALUES
    ('', 'No workflow state has been assigned.', 0, 0),
    ('skipped', 'Temporarily skipped during diagnostic navigation.', 0, 1),
    ('fixed', 'Marked fixed by the user after making or verifying a repair.', 1, 1),
    ('ignored', 'Marked intentionally ignored, including valid syntax/parser-classifier follow-up cases.', 1, 1),
    ('sent', 'AI diagnostic prompt was generated for this diagnostic.', 0, 1)
ON CONFLICT(state) DO UPDATE SET
    description = excluded.description,
    is_terminal = excluded.is_terminal,
    excludes_from_navigation = excluded.excludes_from_navigation;

COMMIT;
