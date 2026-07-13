# MyDefrag Help Conversion Review Tool

Standalone review workflow for checking converted Markdown against the original MyDefrag HTML help.

## Files

- `scripts/review-help-conversion.js` — review/resume/complete tool.
- `docs/MyDefrag Help/review-map.json` — source HTML to output Markdown map.
- `docs/MyDefrag Help/REVIEW-INDEX.md` — human-readable review index.
- `.user/help-review/state.json` — persistent completion state created at runtime.
- `.user/help-review/current-review.html` — generated side-by-side review page.

## Commands

```powershell
npm run review:help              # open next unfinished comparison
npm run review:help -- done      # mark current comparison complete and open next
npm run review:help -- status    # show progress
npm run review:help -- open FileSelect
npm run review:help -- index     # regenerate REVIEW-INDEX.md with complete/pending flags
npm run review:help -- reset     # clear review completion state
```

## Expected layout

```text
docs/
  MyDefrag Help Original/   # original HTML help
  MyDefrag Help/            # generated Markdown help
    review-map.json
    REVIEW-INDEX.md
scripts/
  review-help-conversion.js
```

The tool is intentionally not part of the extension. It only needs Node.js and an npm script.
