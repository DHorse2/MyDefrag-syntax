
# Fragment Trace Property List

## Currently included in Report

- event, step, pos, tokenValue, tokenType, keyword,
- keywordKind/kind/fragmentKind,
- keywordParent/parent/fragmentParent,
- allowed, parsed, fragmentStack, errorsAfter/errors

## Complete Fragment Trace Property List

- allowed
- allowedParents
- atEof
- canReplaceFragmentParent
- closes
- consumedTokens
- currentFragmentKind
- currentFragmentParent
- currentFragmentStack
- endPos
- errorFlag
- errors
- errorsAfter
- errorsBefore
- fragmentKind
- fragmentParent
- fragmentParentHints
- fragmentStack
- keyword
- keywordData
- keywordKind
- keywordParent
- kind
- ok
- oldFragmentKind
- oldFragmentParent
- opens
- parent
- parentHints
- parsed
- pos
- restoredErrors
- restoredPos
- startPos
- step
- tokenParent
- tokenPosition
- tokenType
- tokenValue

## By Event

### loop-start

- step, pos, tokenType, tokenValue, tokenParent, tokenPosition, fragmentKind, fragmentParent, fragmentStack, errors

### macro-skip

- step, pos, tokenType, tokenValue

### keyword

- step, keyword, tokenType, tokenValue, tokenParent, fragmentKind, fragmentParent, fragmentStack

### no-keyword-error

- step, tokenType, tokenValue, pos

### keyword-data

- step, keyword, ok, kind, parent, opens, closes, allowedParents, parentHints, currentFragmentKind, currentFragmentParent, currentFragmentStack

### unknown-keyword-error

- step, keyword, tokenParent, keywordData

### parent-decision

- step, keyword, canReplaceFragmentParent, oldFragmentKind, oldFragmentParent, keywordKind, keywordParent

### parent-established

- step, keyword, fragmentKind, fragmentParent, fragmentParentHints

### fragment-allows

- step, keyword, allowed, keywordKind, keywordParent, allowedParents, fragmentKind, fragmentParent, fragmentStack

### parse-by-kind

- step, keyword, parsed, keywordKind, startPos, endPos, consumedTokens, errorsBefore, errorsAfter

### parse-by-kind-error

- step, keyword, restoredPos, restoredErrors

### no-progress-error

- step, keyword, pos

### stack-updated

- step, keyword, opens, closes, fragmentKind, fragmentParent, fragmentStack, pos

### loop-end

- atEof, pos, errorFlag, errors, fragmentKind, fragmentParent, fragmentParentHints, fragmentStack
