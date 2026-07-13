# AI Extension Capability Discovery Prompt

## Objective

Perform a discovery investigation of the currently installed AI extension or AI-assisted development environment.

The objective is to determine what capabilities are publicly exposed for interoperability with other VSCodium or VS Code extensions and what information can be exchanged programmatically.

This is an investigation only. Do not modify source code or extension behavior.

## Extension Identity

Determine:

- Extension ID
- Display name
- Version
- Publisher
- Installation path
- Activation events
- `package.json` contribution points
- Configuration settings
- Views
- Menus
- Tree views
- Webviews
- Status bar items
- Keybindings
- Commands

Provide evidence including relevant file paths where appropriate.

## Public Commands

Identify every command contributed by the extension.

For each command report:

| Property | Description |
|---|---|
| Command ID | Full command identifier |
| Title | Display name |
| Source | Extension providing the command |
| Arguments | Parameters accepted, if known |
| Public/Internal | Public API or implementation detail |
| Notes | Observed behavior |

Determine whether commands exist for:

- Opening or focusing the extension UI
- Starting a new conversation or session
- Supplying context
- Adding files
- Adding selected text
- Adding diagnostics
- Receiving prompts
- Sending prompts
- Executing actions
- Returning responses
- Exporting conversations
- Importing context

## Detectable IDE State

Determine what information a standard VSCodium extension can obtain using official APIs.

Examples include:

- Active editor
- Active document
- Cursor position
- Text selection
- Workspace folders
- Open editors
- Diagnostics
- Problems
- Search results
- Terminals
- Tasks
- SCM providers
- Git repositories
- Output channels
- Debug sessions
- Test Explorer
- Notebook documents
- Explorer selection
- Timeline information

For each capability classify it as:

- Official API
- Extension-specific
- Experimental
- Not available

## User Interface Integration

Investigate what interaction is possible with another extension's interface.

Determine whether an external extension can:

- Detect visibility
- Detect focus
- Open the interface
- Close the interface
- Supply context
- Populate text controls
- Read displayed content
- Detect selected conversation
- Trigger commands
- Submit actions
- Receive callbacks

Clearly distinguish:

- Supported APIs
- Unsupported operations
- Possible workarounds
- Fragile techniques

## Interoperability Mechanisms

Determine whether the extension supports or could support interaction through:

- VS Code commands
- Extension API
- MCP
- Language Server Protocol
- Clipboard
- Files
- JSON
- Markdown
- URI handlers
- Named pipes
- Localhost HTTP
- WebSocket
- Terminal
- Standard input/output
- Drag and drop
- Custom protocol handlers

For each mechanism report:

- Supported
- Possible
- Unsupported
- Unknown

## Context Exchange

Determine how structured information could be exchanged.

Consider:

- Source files
- Diagnostics
- Code reviews
- Build logs
- Test results
- Execution traces
- Markdown documents
- JSON
- XML
- Custom schemas

Determine the preferred exchange formats.

## Automation Opportunities

Identify opportunities for automation including:

- Context preparation
- Prompt generation
- Prompt submission
- File synchronization
- Diagnostic navigation
- Code review
- Test execution
- Documentation generation
- Conversation export
- Session restoration

For each opportunity provide:

- Expected reliability
- Required user interaction
- Risks
- Recommended implementation approach

## Integration Architecture

Based upon the investigation, propose a provider-based integration architecture.

Avoid product-specific implementations.

The design should support interchangeable AI providers.

Example interfaces:

```text
IAiProvider

initialize()

getCapabilities()

open()

focus()

sendContext()

sendPrompt()

startSession()

getSessionState()

exportConversation()

supportsCapability(capability)
```

Separate discovery from implementation.

## Risks and Limitations

Identify:

- Unsupported APIs
- Security boundaries
- Webview isolation
- Sandboxing
- Version compatibility issues
- Performance considerations
- Maintenance risks

## Deliverables

Produce a Markdown report containing:

- Executive Summary
- Environment
- Extension Identity
- Capability Matrix
- Supported Commands
- Detectable IDE State
- User Interface Integration
- Interoperability Mechanisms
- Recommended Architecture
- Risks
- Open Questions
- Revision Log

Formatting requirements:

- Markdown only
- Begin with a single level-1 heading
- Use unique headings
- Use `-` for unordered lists
- Prefer tables over prose where practical
- Include evidence for conclusions whenever possible
- Do not modify production code during this investigation

## Created or Updated Files

When the investigation is complete, list every created or updated file by path.

## Revision Log

| Date | Change |
|---|---|
| 2026-07-04 | Initial generic AI extension capability discovery prompt. |
