MyDefrag-syntax/
│
├── package.json
├── README.md
├── CHANGELOG.md
├── LICENSE
│
├── src/
│   ├── extension.js          # Extension entry point
│   │
│   ├── client/
│   │   ├── languageClient.js
│   │   └── previewProvider.js
│   │
│   ├── server/
│   │   ├── server.js
│   │   ├── diagnostics.js
│   │   ├── definitions.js
│   │   ├── references.js
│   │   ├── includes.js
│   │   └── parser.js
│   │
│   ├── shared/
│   │   ├── ini.js
│   │   └── logger.js
│   │
│   ├── providers/
│   │   ├── definitionProvider.js
│   │   ├── referenceProvider.js
│   │   └── hoverProvider.js
│   │
│   ├── utilities/
│   │   ├── logger.js
│   │   ├── config.js
│   │   └── paths.js
│   │
│   └── preprocess/
│       └── preprocess.js
│
├── syntaxes/
│   └── mydc.tmLanguage.json
│
├── snippets/
│   └── mydc.code-snippets
│
├── themes/
│   └── mydc-color-theme.json
│
├── images/
│   ├── icon.png
│   └── logo.png
│
├── examples/
│   ├── sample.mydc
│   └── testInclude.mydc
│
├── test/
│   ├── extension.test.js
│   └── fixtures/
│
├── scripts/
│   ├── pack-vsix.ps1
│   ├── publish-vsx.ps1
│   └── clean.ps1
│
├── dist/                    # Generated output (gitignored)
│   ├── extension.js
│   └── server.js
│
└── node_modules/