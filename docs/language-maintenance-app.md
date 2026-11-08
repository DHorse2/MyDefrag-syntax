# MdmLocalize

The Language Maintenance application and its full operating guide moved to the
independent project at `D:\MdmLocalize`.

Start the application from its own project:

```powershell
Set-Location D:\MdmLocalize
npm start -- --project-root D:\Script\MyDefrag-syntax
```

The application source, tests, packaging configuration, and documentation are
owned by MdmLocalize. This MyDefrag-syntax project continues to own its language
data and build adapter:

- `language/canonical/` is authoritative source data.
- `language/locales/` is durable translated source data.
- `build/language/` is generated, replaceable project output.
- `build/scripts/build-language.js` validates and rebuilds the project data.

The move does not delete or regenerate the current translation work. See
`D:\MdmLocalize\docs\language-maintenance-app.md` for the complete guide and
`D:\MdmLocalize\docs\migration-from-mydefrag-syntax.md` for the ownership and
preservation boundary.
