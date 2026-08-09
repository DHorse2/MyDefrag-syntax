# AI Directive Vocabulary

| Directive | Action |
|---|---|
| `LOAD TASK` | Validate project; resolve active-project task; load; do not execute. |
| `SHOW TASK` | Display validated task; stop. |
| `DO NOW` | Execute validated loaded task. |
| `PAUSE NOW` | Persist safe state; stop. |
| `STOP NOW` | Persist state; halt. |
| `CONTINUE NOW` | Resume persisted task. |
| `VERIFY NOW` | Validate before continuation. |
| `COMPLETE TASK` | Validate, record, complete, advance without execution. |
| `SKIP TASK` | Record reason; skip; advance. |
| `LOG THIS` | Append observable evidence. |
| `BEGIN BLOCK` / `END BLOCK` | Accumulate ordered input / process block. |
