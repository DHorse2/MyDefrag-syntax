# Parser Function Call Tree

Source: `src/server/parser.js`

This document describes the parser structure using internal function calls as the guide. It focuses on `this.<function>()` calls inside `Parser` and omits external library calls, module exports, and logger calls.

## Entry Points

```text
configureParser

Parser.constructor

Parser.parseFragment
  parseStatements
    atEof
      curr
    curr
    parseStatement
      curr
      atEof
      next
      expect
        curr
        next
        error
      parseVolumeBooleans
      parseFileBooleans
      expectKw
      parseVolumeActions
      parseFileColorBooleans
      parseNumber
      isSetting
      parseSetting
    error
      curr
      offsetToPos
      addDiagnostic
  atEof
  noNewErrors
  restoreState
  curr
  fragmentTrace
    formatTraceColumn
  offsetToPos
  next
  error
  parseFragmentKeywordBackward
    backwardScriptStatement
    backwardSetVariable
    backwardVolumeSelect
    backwardVolumeActions
    backwardVolumeEnd
    backwardExcludeVolumes
    backwardFileSelect
    backwardFileActions
    backwardFileEnd
    backwardExcludeFiles
    backwardVolumeAction
    backwardFileSortAction
    backwardFileMoveAction
    backwardFileAction
    backwardDefragment
    backwardVolumeCondition
    backwardFileSelectAction
    backwardOperator
      backwardValueFragment
    backwardAll
      backwardValueFragment
    backwardLiteral
      backwardValueFragment
    backwardSimpleStatement
    backwardTime
      backwardValueFragment
    backwardTimeUnit
      backwardValueFragment
    backwardMath
      backwardValueFragment
    backwardSizeUnit
      backwardValueFragment
    isSetting
    parseSetting
    backwardSetting
      backwardScriptStatement
    isNumber
    backwardNumber
      backwardValueFragment
    isString
    backwardString
      backwardValueFragment
    isDateTime
      isNumber
      isKw
    backwardDateTime
      backwardValueFragment
    backwardUnknownKeyword
  fragmentAllows
  parseFragmentStatementByKind
    parseCompoundStructureFragment
      curr
      parseSingleTokenFragment
        atEof
        next
      warning
    parseStatement
    parseWithProgress
    parseFileBooleans
    parseSingleTokenFragment
  updateFragmentStack
  hintFragmentParent
    getFragmentParentHints
    hintAtStart
      addDiagnostic
```

## Full Parse Branch

```text
parseStatements
  parseStatement
    description
      next
      expect
    excludevolumes
      parseVolumeBooleans
    excludefiles
      parseFileBooleans
    volumeselect
      parseVolumeBooleans
      parseVolumeActions
    setfilecolor
      parseFileColorBooleans
      parseNumber
    settings
      isSetting
      parseSetting
```

## Grammar Subtrees

```text
parseVolumeBooleans
  parseVolumeBoolean
    parseVolumeBooleans
    parseYesNo
    parseNumber

parseFileBooleans
  parseFileBoolean
    parseFileBooleans
    parseNumber
    parseDateTime
    parseYesNo
    parseFileLocationOption

parseVolumeActions
  parseVolumeAction
    parseSettings
    parseFileBooleans
    parseFileActions
    parseNumber
    parseMakeGapOptions
    parseFileColorBooleans
    parseSetting

parseFileActions
  parseFileAction
    parseDefragmentOptions
    parseFastFillOptions
    parseAscDesc
    parseSortByOption
    parseSortByImportSequenceOptions
    parseNumber
    parseMakeGapOptions
    parseSetting

parseSetting
  parseDateTime
  parseStringArguments
  parseYesNo
  parseStatusBars
  parseNumber
  parseColorName
  parseWhenFinished
```

## Value Parsing

```text
parseNumber
  parseMultiplyDivide
    parseValue
      tryDecMultiple
      parseNumber
      parseNumbers

parseDateTime
  parseValue
```

## Primitive Helpers

```text
peek
  curr

atEof
  curr

expect
  curr
  next
  error

expectKw
  curr
  next
  error

tryKw
  curr
  next

tryType
  curr
  next

error
  curr
  offsetToPos
  addDiagnostic

warning
  curr
  offsetToPos
  addDiagnostic

warningAtStart
  addDiagnostic
```
