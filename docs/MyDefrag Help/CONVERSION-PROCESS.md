# MyDefrag Help HTML to Markdown Conversion Process

Source archive: `MyDefrag Help.zip`
Generated package: `mydefrag-help-md-v2.zip`

## Rules applied

1. Preserve one Markdown document per syntax/help topic where practical.
2. Merge FAQ topic pages into one separate `faq/FAQ.md` document.
3. Exclude historical release/download/version pages from the generated language reference.
4. Convert `Syntax` and `Example` HTML table layouts into fenced `mydfrg` code blocks.
5. Move right-hand `--> see:` links outside fenced code blocks as Markdown links.
6. Rewrite internal `.html` links to generated relative `.md` links.
7. Copy image assets into `img/`.
8. Generate `README.md`, `index.md`, and this process/manifest file.

## Counts

- HTML files found: 200
- Topic files converted individually: 142
- FAQ files merged: 54
- Files skipped: 4

## Skipped files

- `DownloadAndInstall-DefragPre-versions2.24PreOct2006.html`
- `DownloadAndInstall-MyDefragV4.3.1May202010.html`
- `Manual-FrequentlyAskedQuestions.html`
- `debug.html`
