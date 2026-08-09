# Contributing

Contributions should preserve existing MyDefrag syntax, extension behavior,
and low-resource operation unless a change explicitly revises those contracts.

## Before Editing

- Read the relevant user or developer documentation from
  [the documentation index](index.md).
- Trace the current behavior in `src/`, `package.json`, language data, and local
  reference material.
- Keep unrelated formatting, public command IDs, setting keys, comments, and
  parser behavior unchanged.
- Check `git status` and do not overwrite another contributor's work.

## Code Conventions

- Use CommonJS in existing JavaScript modules.
- Reuse `src/server/languageData.js` instead of duplicating keyword lists.
- Keep client-only editor APIs in the extension process and LSP validation in
  the server process.
- Treat user comments and string literals as user-authored content.
- Keep diagnostics evidence-based and preserve fragment behavior when adding
  full-script validation.

## Documentation Conventions

- Use lowercase kebab-case filenames for extension documentation.
- Use one H1, unique headings, `-` list markers, fenced code blocks, and
  relative links.
- Keep extension documentation separate from converted MyDefrag Help.
- Update [the documentation index](index.md) when adding a page.

## Validation

Run checks appropriate to the change:

```text
node --check <changed-javascript-file>
npm run language:validate
npm run language:build
npm run test:language
npx markdownlint-cli2 "docs/**/*.md" README.md
```

Use `npx vsce ls` or a VSIX dry-run when packaging boundaries change. A source
check does not prove that the required runtime files are included in the VSIX.

## Pull Request Notes

Describe the observed problem, the narrow change, validation evidence, and any
remaining runtime or packaging checks. Do not publish or install a release as
part of an ordinary source contribution unless that action was requested.
