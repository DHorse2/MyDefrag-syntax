# **observed compatibility issue**, not as a universal fact

---

## Opilot Status (VSCodium)

**Status:*- Not currently recommended for VSCodium.

### Tested Environment

- VSCodium
- Windows 11
- Opilot 1.8.2
- Ollama

### Observed Issues

During activation, Opilot failed to start due to multiple compatibility problems.

#### Proposed API Requirement

```text
Extension 'selfagency.opilot' CANNOT USE these API proposals
'languageModelThinkingPart'
```

VSCodium does not enable this proposed API by default.

#### Extension Activation Failure

```text
Cannot find module '@agentsy/context'
```

The extension fails during activation before registering its commands.

As a consequence, commands such as:

- `opilot.refreshLocalModels`
- `opilot.manageAuthToken`
- `opilot.openExtensionSettings`

are unavailable.

### Conclusion

As tested, **Opilot 1.8.2 is not currently usable under VSCodium**.

Whether this is due to:

- an incomplete extension package,
- reliance on proposed VS Code APIs,
- or incompatibilities between Opilot and VSCodium,

was not determined during this investigation.

**Recommendation:** Suspend further investigation and re-evaluate after future Opilot or VSCodium releases.
