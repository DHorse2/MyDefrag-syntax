# package.json script to add

Add this to the existing `scripts` section:

```json
"review:help": "node scripts/review-help-conversion.js"
```

Usage:

```powershell
npm run review:help
npm run review:help -- status
npm run review:help -- open FileSelect
npm run review:help -- done
npm run review:help -- next
npm run review:help -- index
npm run review:help -- reset
```
