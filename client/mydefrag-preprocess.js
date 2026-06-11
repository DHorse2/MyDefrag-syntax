#!/usr/bin/env node
"use strict";
// mydefrag-preprocess.js
//#region Initialize Extension
// Recursively resolves !include "..."! directives in MyDefrag scripts,
// producing a merged output file with:
//   - Two line-number columns on every content line
//   - Single-line BEGIN / END annotations (not numbered) at each include boundary
//
// Usage:
//   node mydefrag-preprocess.js <entryFile> [outputFile]
//
// If outputFile is omitted, output is written alongside the entry file
// with a .merged.MyDc extension.
// server.js
const {
  createConnection,
  TextDocuments,
  DiagnosticSeverity,
  ProposedFeatures,
  TextDocumentSyncKind,
  Diagnostic,
} = require('vscode-languageserver/node');
const { TextDocument } = require('vscode-languageserver-textdocument');
const fs = require("fs");
const path = require('path');
const console = require('console');
const { URI } = require('vscode-languageserver/node');
// const URI = require('vscode-uri').URI;
const { URL, fileURLToPath, pathToFileURL } = require('url');
// ─────────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────────
const ini = require('../common/ini')
const channelName = 'MyDefrag Preview';
// ─────────────────────────────────────────────────────────────────────────────────
// Debug logger — writes to stderr so it doesn't pollute stdout/output file
const logger = require('../common/loggerExtension');
// ─────────────────────────────────────────────────────────────────────────────────
const isServer = false;
var diagnostics = [];
var parserState;
const SCRIPT_DIR = __dirname;
const PARENT_DIR = path.dirname(SCRIPT_DIR);
/** Matches  !include "some/path"!  */
const INCLUDE_RE = /!include\s+"([^"]+)"!/g;
// Width of each numeric column (padded). Increase if you have >9999 lines.
const COL_W = 6;
//
const INI_PATH = path.join(PARENT_DIR, "mydefrag-syntax.ini");
const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);
// ─────────────────────────────────────────────────────────────────────────────────
// Initialize
var extensionConfig;
var debugOn;
var verboseLevel;
var logOn;
var referenceRelativePathLevel;
var referenceContainsMacrosLevel;
var fileReferenceFoundLevel;
var fileReferenceNotFoundLevel;
var iniErrors;
// const channelName = 'MyDefrag Syntax';
var batLinkDebounceTimer = null;
var batLinkDebounceValue = 15000;
try { // ---- Initialization ----
  console.log(process.config);
  extensionConfig = ini.initialize(INI_PATH, channelName, isServer, true, ini.severity.Verbose);
  ({
    iniData,
    debugOn,
    verboseLevel,
    logOn,
    referenceRelativePathLevel,
    referenceContainsMacrosLevel,
    fileReferenceFoundLevel,
    fileReferenceNotFoundLevel,
    iniErrors
  } = extensionConfig);
} catch (errResult) {
  const message = `mydefrag-preprocess.js:activate Unexpected error in first Initialize step: ${errResult.message}`;
  console.error(message);
  throw new Error(message);
}
logger.initialize(connection, isServer, diagnostics, iniData, extensionConfig)
if (iniErrors.length) { logger.logArrayToConsole(channelName, ini.severity.Information, iniErrors) }
// ─────────────────────────────────────────────────────────────────────────────────
// Formatting helpers
// ─────────────────────────────────────────────────────────────────────────────────
// Format value in a column
function col(n) { return ("|" + String(n).padStart(COL_W - 2) + " "); } // formats string in a strand column
// Empty column cell
// const BLANK = " ".repeat(COL_W);
const BLANK = col(" ");
// Fully formatted source code line with columns. Format: 
// TotalLines CurrentLine ..........SourceCodeText.................
function contentLine(outLine, srcLine, text, indent = "") { return `${col(outLine)}${col(srcLine)}${indent}${text}\n`; } // formats a CODE content line
// Annotation text without line numbers in first two columns
// function annotLine(indent, text) { return `${BLANK}${BLANK} ${indent}${text}\n`; } // formats an ANNOTATION
function annotLine(indent, text) { return contentLine("", ">>>", text, indent); } // formats an ANNOTATION
//#endregion
// ─────────────────────────────────────────────────────────────────────────────────
// Logical merged-line State helpers
function ensureLineOpen(state) {
  if (!state.open) {
    // We MUST be on the next line
    state.line++;
    // only a real CRLF terminate a line, else it stays open.
    state.open = true;
    logger.dbg(8, `         ensureLineOpen() -> OPENED logical line ${state.line}`);
  } else {
    logger.dbg(8, `         ensureLineOpen() -> logical line already open (${state.line})`);
  }
}
// ─────────────────────────────────────────────────────────────────────────────────
// Core processor
// ─────────────────────────────────────────────────────────────────────────────────
function processFile(filePath, stack, linkVisited, linkVisitedMissing, depth, state, parentFilePath = null, parentSrcLineNo = 0, parentSrcColNo = 1) {
  const SCRIPT_DIR = __dirname;
  const PARENT_DIR = path.dirname(SCRIPT_DIR);
  const INI_PATH = path.join(PARENT_DIR, "mydefrag-syntax.ini");
  const {
    debugOn,
    verboseLevel,
    logOn,
    referenceRelativePathLevel,
    referenceContainsMacrosLevel,
    fileReferenceFoundLevel,
    fileReferenceNotFoundLevel
  } = ini.initialize(INI_PATH, `MyDefrag Language`, null, 1, null, false);
  // const absPath = filePath;
  const indent = " ".repeat(depth);

  logger.dbg(0, `----`);
  logger.dbg(0, `  --- processFile called: depth=${depth} state.line=${state.line} state.open=${state.open} ---`);
  logger.dbg(0, `    filePath="${filePath}"`);
  logger.dbg(4, `    stack=[${stack.join(", ")}]`);

  // ── Circular include guard ────────────────────────────────────────────────
  if (stack.includes(filePath)) {
    const cycle = [...stack, filePath].map(p => path.basename(p)).join(" → ");
    const message = `ERROR: Circular include: ${cycle}`;
    logger.info(message);
    logger.dbg(1, `  CIRCULAR INCLUDE DETECTED!!!`);
    return { lines: [annotLine(indent, `*** ${message} ***`)], outStart: state.line + 1, outEnd: state.line, srcTotal: 0, hasFinalNewline: false, contributesPhysicalLine: false }; // CIRCULAR FILE REFERENCE
  }

  const { pathToFileURL } = require("url");
  const parentFile = parentFilePath ?? (stack.length > 0 ? stack[stack.length - 1] : filePath);
  const parentUri = pathToFileURL(parentFile).href;
  const missingUri = pathToFileURL(filePath).href;
  const parentUriWithLine = `${parentUri}:${parentSrcLineNo}:${parentSrcColNo}`;
  let match = ["", ""];
  const includeDir = path.dirname(filePath);
  const includePath = match[1]
  const includePathResolved = path.resolve(includeDir, includePath);
  const includePathResolvedUri = pathToFileURL(includePathResolved).href;

  logger.dbg(5, "parentFilePath =", parentFilePath);
  logger.dbg(5, "filePath =", filePath);
  logger.dbg(6, "stack =", stack);

  // ── File existence check ──────────────────────────────────────────────────
  logger.dbg(6, `    checking existence: "${filePath}"`);
  if (!fs.existsSync(filePath)) {
    // const message = `ERROR:  Missing include: "${filePath}"`;
    linkVisitedMissing.set(filePath, { parentFile, parentSrcLineNo, parentSrcColNo, depth, missingFile: filePath, OutputLine: state.line });
    logger.dbg(0, `ERROR!!! Missing: ${missingUri}\n`)
    logger.dbg(0, `         At: ${parentUri}:${parentSrcLineNo}:${parentSrcColNo}`);
    logger.dbg(0, `         Continuing...`);
    logger.dbg(0, `    ERROR: FILE NOT FOUND!!!, returning error annotation`);
    return { lines: [annotLine(indent, `*** WARNING: Missing include ("${missingUri}") ***`)], filePath, outStart: state.line + 1, outEnd: state.line, srcTotal: 0, hasFinalNewline: false, contributesPhysicalLine: false }; // FILE NOT FOUND
  }
  logger.dbg(7, `    File exists OK`);
  linkVisited.add(filePath);

  // ── Read and split into logical lines ────────────────────────────────────
  const raw = fs.readFileSync(filePath, "utf8");
  // Split on either LF or CRLF
  const srcLines = raw.split(/\r?\n/);
  if (srcLines.length > 0) {
    logger.dbg(5, `         first line preview="${srcLines[0].substring(0, 60)}"`);
    logger.dbg(5, `         last line preview="${srcLines[srcLines.length - 1].substring(0, 60)}"`);
  }

  // ── Line number control and CRLF detection ───────────────────────────────
  // Detect whether file physically ends with newline
  const hasFinalNewline = /\r?\n$/.test(raw);
  // Should the line number be incremented because a CRLF is present or more lines follow.
  const contributesPhysicalLine = hasFinalNewline || srcLines.length > 1;
  logger.dbg(6, `      Read and split into logical lines:`);
  logger.dbg(6, `         raw file read: ${raw.length} bytes`);
  logger.dbg(6, `         hasFinalNewline=${hasFinalNewline}`);
  logger.dbg(6, `         split produced: ${srcLines.length} entries`);
  // If the file ended with a newline, split() produces an extra empty entry.
  // Remove ONLY that synthetic entry.
  if (hasFinalNewline) {
    logger.dbg(6, `         removing synthetic trailing empty line caused by final newline`);
    srcLines.pop();
  } else {
    logger.dbg(6, `         file does NOT end with newline; keeping final entry`);
  }

  // ── Source Total Line number ─────────────────────────────────────────────
  // Source line accounting semantics:
  //   terminated lines count
  //   unterminated trailing fragments do not
  let srcTotal = (raw.length === 0) ? 0 : srcLines.length;
  if (raw.length === 0) { logger.dbg(0, `         file is physically empty`); }
  // Determine if multiple lines allowing that
  // any last line might not end in a CRLF
  logger.dbg(6, `         logical line count finalized, srcTotal=${srcTotal}`);

  // ────────────────────────────────────────────────────────────────────────
  // ── Walk source lines ─────────────────────────────────────────────────────
  // ────────────────────────────────────────────────────────────────────────
  let outLines = [];
  const outStart = state.line + 1;
  logger.dbg(8, `         outStart=${outStart}`);
  let srcIdx = 0;
  let srcLineNo = 1
  logger.dbg(8, `         srcLines=${srcLines.length}`);
  while (srcIdx < srcLines.length) {
    const rawLine = srcLines[srcIdx];
    srcLineNo = srcIdx + 1;
    logger.dbg(8, ``);
    logger.dbg(8, `      processing srcLine ${srcLineNo}/${srcLines.length}`);
    logger.dbg(8, `  rawLine="${rawLine.substring(0, 80)}"`);

    // ────────────────────────────────────────────────────────────────────────
    // INCLUDE DIRECTIVE detected. Process it or issue an error.
    // ────────────────────────────────────────────────────────────────────────
    INCLUDE_RE.lastIndex = 0;
    const match = INCLUDE_RE.exec(rawLine);
    if (match) {
      logger.dbg(8, `  rawLine="${rawLine.substring(0, 80)}"`);
      const srcColNo = match.index + 1;
      // Ensure a logical merged line exists
      ensureLineOpen(state);
      logger.dbg(5, `         -> INCLUDE directive found "${match[1]}" on logical line ${state.line}`);

      // Emit directive line itself
      outLines.push(contentLine(state.line, srcLineNo, rawLine, indent));

      // The include directive itself is a full physical line.
      // Child content therefore starts on NEXT logical merged line.
      // However that depends on the contents of the disk file.
      // In short, how the file ends. With a CRLF or not.
      state.open = false;
      // IMPORTANT:
      // If child lacks final newline, the logical merged line remains open.
      // Otherwise the logical merged line terminates.
      // state.open = !child.hasFinalNewline;
      // state.open = contributesPhysicalLine;

      const includePath = match[1];
      const includePathResolved = path.resolve(includeDir, includePath);
      const includePathResolvedUri = pathToFileURL(includePathResolved).href;

      logger.dbg(8, `         includeDir="${includeDir}"`);
      logger.dbg(5, `         includePathResolved="${includePathResolved}"`);
      logger.dbg(5, `         recursing into child depth=${depth + 1}, hasFileNewLine=${hasFinalNewline}`);

      // RECURSE Process child file
      const child = processFile(includePathResolved, [...stack, filePath], linkVisited, linkVisitedMissing, depth + 1, state, filePath, srcLineNo, srcColNo);
      logger.dbg(8, `         child returned: outStart=${child.outStart}, outEnd=${child.outEnd}, child.srcTotal=${child.srcTotal}, child.hasFinalNewline=${child.hasFinalNewline}`);

      // BEGIN annotation — inserted before child lines
      const beginAnnot = annotLine(
        indent,
        `BEGIN [depth:${depth + 1}] ${includePathResolvedUri}` +
        `  src:${child.srcTotal}` +
        `  out:${child.outStart}-${child.outEnd}`
      );

      // END annotation — inserted after child lines
      const endAnnot = annotLine(
        indent,
        `END   [depth:${depth + 1}] ${includePathResolvedUri}` +
        `  src:${child.srcTotal}` +
        `  out:${child.outStart}-${child.outEnd}`
      );

      logger.dbg(0, `         pushing beginAnnot + child.lines + endAnnot`);

      outLines.push(beginAnnot, ...child.lines, endAnnot);

      // IMPORTANT:
      // If child lacks final newline, the logical merged line remains open.
      // Otherwise the logical merged line terminates.
      // state.open = !child.hasFinalNewline;
      // state.open = contributesPhysicalLine;
      logger.dbg(0, `         state.open now ${state.open} after child include`);

      // ────────────────────────────────────────────────────────────────────────
      // NORMAL CONTENT LINE
      // ────────────────────────────────────────────────────────────────────────
    } else {
      logger.dbg(8, `         -> normal content line`);
      // Ensure logical merged line exists
      ensureLineOpen(state);
      logger.dbg(8, `         emitting normal line on logical line ${state.line}`);
      outLines.push(contentLine(state.line, srcLineNo, rawLine, indent));
      // A normal physical source line always terminates
      if (contributesPhysicalLine) {
        state.open = false;
        logger.dbg(8, `         normal line terminated logical line`);
      }
    }

    srcIdx++;
  }

  const outEnd = state.line;

  logger.dbg(3, `  finished file:`);
  logger.dbg(5, `     outStart=${outStart}`);
  logger.dbg(5, `     outEnd=${outEnd}`);
  logger.dbg(5, `     outLines.length=${outLines.length}`);
  logger.dbg(5, `     hasFinalNewline=${hasFinalNewline}`);

  return { lines: outLines, outStart, outEnd, srcTotal, hasFinalNewline, contributesPhysicalLine }; // Process Output of Code
}
// ──────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────
function main() {
  // ──────────────────────────────────────────────────────────────────────────
  // ---- Initialization ----
  // at top of script (global items)
  // ── Read INI configuration ────
  logger.info('--- Preview processing triggered ---');
  logger.dbg(5, `  Debug Path=${INI_PATH}`)
  // const iniReader = ini.readIni(INI_PATH);
  // debugOn = String(iniData.debugOn || "true").toLowerCase() === "true";
  logger.dbg(7, `  Debug=${debugOn}`)
  logger.dbg(7, `INI_PATH="${INI_PATH}"`);
  logger.dbg(7, `debugOn=${debugOn}`);

  logger.dbg(5, `main() started`);
  // ---- Arguments ----
  logger.dbg(5, `process.argv = ${JSON.stringify(process.argv)}`);
  const args = process.argv.slice(2);
  logger.dbg(5, `args = ${JSON.stringify(args)}`);

  // ──────────────────────────────────────────────────────────────────────────
  // ---- Help ----
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    logger.info([
      "[MyDefrag]",
      "",
      "  MyDefrag Script Preprocessor",
      "  ──────────────────────────────────────────────────────────────",
      "  Usage:  node mydefrag-preprocess.js <entryFile> [outputFile] [-w]",
      "",
      "  <entryFile>   Path to the root .MyDc script.",
      "  [outputFile]  Optional output path.",
      "                Defaults to <entryFileName>.merged.MyDc .",
      "  [-w]          Write the preview file to disk rather than memory.",
      "",
      "  Output columns per content line:",
      `  <CompiledScriptLine> <ActualFileScriptLine> <Content>`,
      "",
      "  CompiledScriptLine: running logical merged line number",
      "  ActualFileScriptLine:  line number within the owning source file",
      "  Content: the contents of the script file ",
      "",
      "  BEGIN / END annotations are unnumbered single lines.",
      "",
    ].join("\n"));
    process.exit(0);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ---- File to prepare preview ----
  const writeToFile = args.includes("-w");
  // remove flags
  const cleanArgs = args.filter(a => a !== "-w");
  const entryFile = path.resolve(cleanArgs[0]);

  if (!fs.existsSync(entryFile)) {
    logger.err(null, `Entry file not found: ${entryFile}`);
    logger.dbg(0, `Entry file does not exist — aborting`);
    process.exit(1);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Output File
  const outputFile = cleanArgs[1]
    ? path.resolve(cleanArgs[1])
    : entryFile.replace(/(\.[^.]+)?$/, ".merged$1");

  // ──────────────────────────────────────────────────────────────────────────
  // Json Configuration Data (from extension.js)
  const raw = process.argv.indexOf('--config');
  const config = raw !== -1
    ? JSON.parse(process.argv[raw + 1])
    : {};

  // ──────────────────────────────────────────────────────────────────────────
  // Finished processing arguments
  logger.dbg(0, `Entry file exists OK`);
  logger.dbg(0, `outputFile = "${outputFile}"`);
  logger.dbg(0, `writeToFile = "${writeToFile}"`);
  const entryUri = pathToFileURL(entryFile).href;
  logger.info(`Entry  : "${entryFile}"`);
  logger.info(`Output : "${outputFile}"`);
  if (iniData !== extensionConfig && iniData !== extensionConfig) {
    // ToDO ???
  }


  // ──────────────────────────────────────────────────────────────────────────
  // Script Maps of includes, missing includes. In the order encountered.
  const linkVisited = [];
  const linkVisitedMissing = new Map();
  const state = {
    line: 0,
    open: false
  };

  // ──────────────────────────────────────────────────────────────────────────
  // ── Process File ──────────────────────────────────────────────────────────
  logger.dbg(0, `calling processFile on entry...`);
  const root = processFile(entryFile, [], linkVisited, linkVisitedMissing, 0, state, entryFile, 0, 1);

  logger.dbg(8, `processFile for source file returned:`);
  logger.dbg(8, `   root.outStart=${root.outStart}`);
  logger.dbg(8, `   root.outEnd=${root.outEnd}`);
  logger.dbg(8, `   root.srcTotal=${root.srcTotal}`);
  logger.dbg(8, `   root.hasFinalNewline=${root.hasFinalNewline}`);
  logger.dbg(8, `   visited set size: ${linkVisited.length}`);
  logger.dbg(8, `   visitedMissing set size: ${linkVisitedMissing.size}`);
  logger.dbg(8, `   state.line after processing: ${state.line}`);

  // ──────────────────────────────────────────────────────────────────────────
  // ── Header ────────────────────────────────────────────────────────────────
  const header = [
    `|${"═".repeat(72)}`,
    `|MyDefrag Preprocessor — Merged Output`,
    `|Generated    : ${new Date().toISOString()}`,
    `|Entry        : ${entryUri}`,
    `|Output file  : ${outputFile}`,
    `|Output lines : ${state.line}  (logical merged lines)`,
    `|${"<outLine>".padStart(COL_W)}${"<srcLine>".padStart(COL_W)} <content>`,
    `|${"═".repeat(72)}`,
  ].join("\n");
  const headerOutput = [
    `|${"═".repeat(72)}`,
    `|MyDefrag Preprocessor — Merged Output`,
    `|Generated  : ${new Date().toISOString()}`,
    `|Entry      : ${entryFile}`,
    `|Output lines: ${state.line}  (logical merged lines)`,
    `|${"<outLine>".padStart(COL_W)}${"<srcLine>".padStart(COL_W)} <content>`,
    `|${"═".repeat(72)}`,
  ].join("\n");
  // ──────────────────────────────────────────────────────────────────────────
  // ── Footer / include map ──────────────────────────────────────────────────
  logger.dbg(8, `building footer maps...`);
  // ── Map of INCLUDE files  ─────────────────────────────────────────────────
  const linkVisitedMapLines = [
    `|Include Files. (${linkVisited.length} file(s) processed`,
    `|${"═".repeat(72)}`,
  ];
  const linkVisitedMapOutPut = [];
  linkVisitedMapOutPut.push(...linkVisitedMapLines);

  let idx = 1;
  for (const f of linkVisited) {
    const { pathToFileURL } = require("url");
    const uri = pathToFileURL(f).href;
    linkVisitedMapLines.push(`|[${String(idx).padStart(3, "0")}]  ${uri}`);
    linkVisitedMapOutPut.push(`|[${String(idx).padStart(3, "0")}]  "${f}"`);
    // logger.dbg(0, `Include file URI=${uri}`);
    idx++;
  }
  linkVisitedMapLines.push(`| `);
  linkVisitedMapOutPut.push(`| `);
  linkVisitedMapLines.push(`|${"═".repeat(72)}`);
  linkVisitedMapOutPut.push(`|${"═".repeat(72)}`);

  // ── Map of MISSING include files ─────────────────────────────────────────
  const missingMapLines = [];
  const missingMapOutput = [];
  if (linkVisitedMissing.size > 0) {
    logger.dbg(8, `building missing file map (${linkVisitedMissing.size} files)`);
    const SCRIPT_HEADER_LINES = 10; // Seen at top of output
    const MISSING_BLOCK_LINES = 3; // Number of line per detail output
    const MISSING_HEADER_LINES = 5; // Number of lines in this header here.

    const startLineOfCode = SCRIPT_HEADER_LINES + (linkVisitedMissing.size * MISSING_BLOCK_LINES) + MISSING_HEADER_LINES + linkVisitedMapLines.length;

    const message = [
      ``,
      `|MISSING FILE ERRORS!!! (${linkVisitedMissing.size} file(s) missing)`,
      `|Script starts at line ${startLineOfCode}.`,
      `|${"═".repeat(72)}`,
    ];
    missingMapLines.push(...message);
    missingMapOutput.push(...message);
    // ──────────────────────────────────────────────────────────────────────────
    idx = 1;
    for (const [filePath, info] of linkVisitedMissing) {
      const {
        parentFile,
        parentSrcLineNo,
        parentSrcColNo,
        depth,
        missingFile,
        OutputLine
      } = info;
      // linkVisitedMissing.set(filePath, { parentFile, parentSrcLineNo, parentSrcColNo, depth, missingFile });
      const parentUri = pathToFileURL(parentFile).href;
      const missingUri = pathToFileURL(filePath).href;
      const parentUriWithLine = `${parentUri}:${parentSrcLineNo}:${parentSrcColNo}`;
      const parentPathWithLine = `${parentFile}:${parentSrcLineNo}:${parentSrcColNo}`;
      // logger.dbg(0, `${parentUri}:${parentSrcLineNo}`);
      missingMapLines.push(
        `|[${String(idx).padStart(3, "0")}]  ${missingUri}`,
        `|    At line ${OutputLine}, file "${parentUri}", line ${parentSrcLineNo}, col ${parentSrcColNo}`,
        `| `
      );
      missingMapOutput.push(
        `|[${String(idx).padStart(3, "0")}]  ${missingFile}`,
        `|    At line ${OutputLine}, file "${parentPathWithLine}"`,
        `| `
      );
      idx++;
    }
    missingMapLines.push(`|${"═".repeat(72)}`);
    missingMapOutput.push(`|${"═".repeat(72)}`);

  } else {
    // ──────────────────────────────────────────────────────────────────────────
    logger.dbg(8, `no missing include files`);
    missingMapLines.push(
      " ",
      `|${"═".repeat(72)}`,
      `MISSING FILES`,
      `|${"═".repeat(72)}`,
      `No missing files.`,
      `|${"═".repeat(72)}`
    );
    missingMapOutput.push(...missingMapLines);
  }

  // ── Build final footer ────────────────────────────────────────────────────────
  const footerOutput =
    missingMapOutput.join("\n") +
    "\n" +
    linkVisitedMapOutPut.join("\n") +
    "\n";
  footerOutput.split(/\r?\n/).forEach(line => { logger.info(line); });

  const footer =
    missingMapLines.join("\n") +
    "\n" +
    linkVisitedMapLines.join("\n") +
    "\n";
  logger.dbg(8, `Console footer length=${footerOutput.length} and in document=${footer.length}`);

  const body = root.lines.join("");

  const fullOutput = header + footer + body;

  // ──────────────────────────────────────────────────────────────────────────
  // ── Write ─────────────────────────────────────────────────────────────────
  if (writeToFile) {
    logger.dbg(3, `writing to: "${outputFile}"`);
    try { // ── Write ────
      fs.writeFileSync(outputFile, fullOutput, "utf8");

    } catch (errResult) {
      // logger.dbg(0, `writeFileSync WRITE FAILED: ${errResult.message}`);
      // logger.err(errResult, `writeFileSync ERROR writing output: ${errResult.message}`);
      logger.err(errResult, `writeFileSync WRITE FAILED: ${errResult.message}`);
      process.exit(1);
    }

    // Verify the file was written
    if (fs.existsSync(outputFile)) {
      const writtenSize = fs.statSync(outputFile).size;
      logger.dbg(5, `output file confirmed on disk: ${writtenSize} bytes`);
    } else {
      logger.err(null, `output file NOT found after write — something is very wrong`);
    }
  } else {
    // ── Write to memory ──────────────────────────────────────────────────────
    logger.dbg(5, `creating memory resident preview: "${outputFile}"`);
    process.stdout.write(fullOutput);
  }

  // ──────────────────────────────────────────────────────────────────────────
  logger.info(`Done. ${linkVisited.length} file(s), ${state.line} logical merged lines.`);
  logger.warn(`${linkVisitedMissing.size} file(s) are missing.`);
  if (writeToFile) {
    logger.info(`Output written to: "${outputFile}"`);
  } else {
    logger.info(`Output written to stdout (preview mode)`);
  }
  logger.info(`main() done`);
}
// ──────────────────────────────────────────────────────────────────────────
main();
// ──────────────────────────────────────────────────────────────────────────
