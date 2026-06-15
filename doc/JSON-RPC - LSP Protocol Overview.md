**technical overview of JSON-RPC (LSP protocol layer)**

---

# JSON-RPC / LSP Protocol Overview

The Language Server Protocol is built on **JSON-RPC 2.0 over stdio, pipes, or sockets**. Every message is a JSON object with a `method`, optional `params`, and optional `id`.

---

## Core JSON-RPC Message Types

| Type         | Direction       | Method                   | Purpose                                | Payload (`params`)            |
| ------------ | --------------- | ------------------------ | -------------------------------------- | ----------------------------- |
| Request      | Client → Server | `initialize`             | Start handshake, capabilities exchange | `InitializeParams`            |
| Response     | Server → Client | *(same id)*              | Reply to request                       | `InitializeResult`            |
| Notification | Client → Server | `initialized`            | Signal initialization complete         | `InitializedParams`           |
| Notification | Client → Server | `textDocument/didOpen`   | Document opened in editor              | `DidOpenTextDocumentParams`   |
| Notification | Client → Server | `textDocument/didChange` | Document content changed               | `DidChangeTextDocumentParams` |
| Notification | Client → Server | `textDocument/didSave`   | Document saved                         | `DidSaveTextDocumentParams`   |
| Notification | Client → Server | `textDocument/didClose`  | Document closed                        | `DidCloseTextDocumentParams`  |

---

## Language Feature Requests (Server → Client responses expected)

| Type    | Direction       | Method                       | Purpose                 | Payload               |
| ------- | --------------- | ---------------------------- | ----------------------- | --------------------- |
| Request | Client → Server | `textDocument/hover`         | Hover info at cursor    | `HoverParams`         |
| Request | Client → Server | `textDocument/definition`    | Go to definition        | `DefinitionParams`    |
| Request | Client → Server | `textDocument/references`    | Find references         | `ReferenceParams`     |
| Request | Client → Server | `textDocument/completion`    | Autocomplete items      | `CompletionParams`    |
| Request | Client → Server | `textDocument/rename`        | Symbol rename           | `RenameParams`        |
| Request | Client → Server | `textDocument/signatureHelp` | Function signature help | `SignatureHelpParams` |

---

## Server → Client Requests (less common but important)

| Type    | Direction       | Method                      | Purpose                       | Payload                    |
| ------- | --------------- | --------------------------- | ----------------------------- | -------------------------- |
| Request | Server → Client | `workspace/applyEdit`       | Apply edits to files          | `ApplyWorkspaceEditParams` |
| Request | Server → Client | `window/showMessageRequest` | Prompt user                   | `ShowMessageRequestParams` |
| Request | Server → Client | `client/registerCapability` | Dynamically register features | `RegistrationParams`       |

---

## Notifications (Server → Client)

| Type         | Direction       | Method                            | Purpose                            |
| ------------ | --------------- | --------------------------------- | ---------------------------------- |
| Notification | Server → Client | `window/showMessage`              | Show message in UI                 |
| Notification | Server → Client | `window/logMessage`               | Log output                         |
| Notification | Server → Client | `textDocument/publishDiagnostics` | Send diagnostics (errors/warnings) |

---

## Lifecycle Flow (important for your debugging)

| Step  | Actor           | Method                                         |
| ----- | --------------- | ---------------------------------------------- |
| 1     | Client → Server | `initialize`                                   |
| 2     | Server → Client | `InitializeResult`                             |
| 3     | Client → Server | `initialized`                                  |
| 4     | Client → Server | `textDocument/didOpen`                         |
| 5+    | Client ↔ Server | feature requests (`hover`, `definition`, etc.) |
| End   | Client → Server | `shutdown`                                     |
| Final | Client → Server | `exit`                                         |

---

## Key JSON-RPC Message Shape

### Request

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "textDocument/hover",
  "params": { }
}
```

### Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": { }
}
```

### Notification (no response expected)

```json
{
  "jsonrpc": "2.0",
  "method": "textDocument/didOpen",
  "params": { }
}
```

---

## Important conceptual notes (relevant to your logger issue)

* You **cannot pass objects (logger, classes, functions)** across JSON-RPC
* Only **JSON-serializable data** is allowed
* The server and client are **fully isolated Node processes**
* Communication is strictly:

  * request → response
  * notifications → fire-and-forget

---

