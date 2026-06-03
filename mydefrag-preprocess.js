#!/usr/bin/env node
// mydefrag-preprocess.js
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

"use strict";
const fs = require("fs");
const path = require("path");
const { pathToFileURL, fileURLToPath } = require("url");

// Debug logger — writes to stderr so it doesn't pollute stdout/output file
// ---------------------------------------------------------------------------
let debugOn = true;
const logger = require('./common/logger');
const IniReader = require('./common/ini')

// const DBG = (...args) => process.stderr.write("[MyDefrag] [DBG] " + args.join(" ") + "\n");
// let debugOn = true;
// const DBG = (...args) => {
//   if (!debugOn) { return; }
//   process.stderr.write(
//     "[MyDefrag] [DBG] " +
//     args.join(" ") +
//     "\n"
//   );
// };

// const LogToConsole = (...args) => {
//   process.stderr.write(
//     "[MyDefrag] " +
//     args.join(" ") +
//     "\n"
//   );
// };

// ---------------------------------------------------------------------------
// INI configuration
// ---------------------------------------------------------------------------

function readIni(filePath) {
  const result = {};
  if (!fs.existsSync(filePath)) {
    logger.dbg(`  "${filePath}" ini file not found`);
    return result; // ini file not found
  }
  // logger.dbg(`  "${filePath}" ini file exists`);

  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);

  for (const lineRaw of lines) {
    const line = lineRaw.trim();
    // Skip blank lines
    if (line === "") {
      continue;
    }
    // Skip comments
    if (
      line.startsWith(";") ||
      line.startsWith("#")
    ) {
      continue;
    }

    const eqPos = line.indexOf("=");
    if (eqPos < 0) {
      logger.dbg(`  ignoring malformed line: "${line}"`);
      continue;
    }

    const key = line.substring(0, eqPos).trim();
    const value = line.substring(eqPos + 1).trim();
    result[key] = value;
    // logger.info(`  ini: ${key}="${value}"`);
  }

  return result; // ini key value pairs
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Matches  !include "some/path"!  */
const INCLUDE_RE = /!include\s+"([^"]+)"!/g;
// Width of each numeric column (padded). Increase if you have >9999 lines.
const COL_W = 6;

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------
// Format value in a column
function col(n) { return ("|" + String(n).padStart(COL_W-2) + " "); } // formats string in a strand column
// Empty column cell
// const BLANK = " ".repeat(COL_W);
const BLANK = col(" ");
// Fully formatted source code line with columns. Format: 
// TotalLines CurrentLine ..........SourceCodeText.................
function contentLine(outLine, srcLine, text, indent = "") { return `${col(outLine)}${col(srcLine)}${indent}${text}\n`; } // formats a CODE content line
// Annotation text without line numbers in first two columns
// function annotLine(indent, text) { return `${BLANK}${BLANK} ${indent}${text}\n`; } // formats an ANNOTATION
function annotLine(indent, text) { return contentLine("", ">>>", text, indent); } // formats an ANNOTATION

// ---------------------------------------------------------------------------
// Logical merged-line helpers
// ---------------------------------------------------------------------------
function ensureLineOpen(state) {
  if (!state.open) {
    // We MUST be on the next line
    state.line++;
    // only a real CRLF terminate a line, else it stays open.
    state.open = true;
    // logger.dbg(`         ensureLineOpen() -> OPENED logical line ${state.line}`);
  } else {
    // logger.dbg(`         ensureLineOpen() -> logical line already open (${state.line})`);
  }
}

// ---------------------------------------------------------------------------
// Core processor
// ---------------------------------------------------------------------------

function processFile(filePath, stack, visited, visitedMissing, depth, state, parentFilePath = null, parentSrcLineNo = 0, parentSrcColNo = 1) {
  // const absPath = filePath;
  const indent = " ".repeat(depth);

  logger.dbg(`----`);
  logger.dbg(`  --- processFile called: depth=${depth} state.line=${state.line} state.open=${state.open} ---`);
  logger.dbg(`    filePath="${filePath}"`);
  // logger.dbg(`    stack=[${stack.join(", ")}]`);

  // ── Circular include guard ────────────────────────────────────────────────
  if (stack.includes(filePath)) {
    const cycle = [...stack, filePath].map(p => path.basename(p)).join(" → ");
    const msg = `ERROR: Circular include: ${cycle}`;
    logger.info(msg);
    logger.dbg(`  CIRCULAR INCLUDE DETECTED!!!`);
    return { lines: [annotLine(indent, `*** ${msg} ***`)], outStart: state.line + 1, outEnd: state.line, srcTotal: 0, hasFinalNewline: false, contributesPhysicalLine: false }; // CIRCULAR FILE REFERENCE
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

  logger.dbg("parentFilePath =", parentFilePath);
  logger.dbg("filePath =", filePath);
  logger.dbg("stack =", stack);

  // ── File existence check ──────────────────────────────────────────────────
  // logger.dbg(`    checking existence: "${filePath}"`);
  if (!fs.existsSync(filePath)) {
    // const msg = `ERROR:  Missing include: "${filePath}"`;
    visitedMissing.set(filePath, { parentFile, parentSrcLineNo, parentSrcColNo, depth, missingFile: filePath, OutputLine: state.line });
    logger.dbg(`ERROR!!! Missing: ${missingUri}\n`)
    logger.dbg(`         At: ${parentUri}:${parentSrcLineNo}:${parentSrcColNo}`);
    logger.dbg(`         Continuing...`);
    logger.dbg(`    ERROR: FILE NOT FOUND!!!, returning error annotation`);
    return { lines: [annotLine(indent, `*** WARNING: Missing include ("${missingUri}") ***`)], filePath, outStart: state.line + 1, outEnd: state.line, srcTotal: 0, hasFinalNewline: false, contributesPhysicalLine: false }; // FILE NOT FOUND
  }
  logger.dbg(`    File exists OK`);
  visited.add(filePath);

  // ── Read and split into logical lines ────────────────────────────────────
  const raw = fs.readFileSync(filePath, "utf8");
  // Split on either LF or CRLF
  const srcLines = raw.split(/\r?\n/);
  if (srcLines.length > 0) {
    logger.dbg(`         first line preview="${srcLines[0].substring(0, 60)}"`);
    logger.dbg(`         last line preview="${srcLines[srcLines.length - 1].substring(0, 60)}"`);
  }

  // ── Line number control and CRLF detection ───────────────────────────────
  // Detect whether file physically ends with newline
  const hasFinalNewline = /\r?\n$/.test(raw);
  // Should the line number be incremented because a CRLF is present or more lines follow.
  const contributesPhysicalLine = hasFinalNewline || srcLines.length > 1;
  logger.dbg(`      Read and split into logical lines:`);
  logger.dbg(`         raw file read: ${raw.length} bytes`);
  logger.dbg(`         hasFinalNewline=${hasFinalNewline}`);
  logger.dbg(`         split produced: ${srcLines.length} entries`);
  // If the file ended with a newline, split() produces an extra empty entry.
  // Remove ONLY that synthetic entry.
  if (hasFinalNewline) {
    logger.dbg(`         removing synthetic trailing empty line caused by final newline`);
    srcLines.pop();
  } else {
    logger.dbg(`         file does NOT end with newline; keeping final entry`);
  }

  // ── Source Total Line number ─────────────────────────────────────────────
  // Source line accounting semantics:
  //   terminated lines count
  //   unterminated trailing fragments do not
  let srcTotal = (raw.length === 0) ? 0 : srcLines.length;
  if (raw.length === 0) { logger.dbg(`         file is physically empty`); }
  // Determine if multiple lines allowing that
  // any last line might not end in a CRLF
  logger.dbg(`         logical line count finalized, srcTotal=${srcTotal}`);

  // ────────────────────────────────────────────────────────────────────────
  // ── Walk source lines ─────────────────────────────────────────────────────
  // ────────────────────────────────────────────────────────────────────────
  let outLines = [];
  const outStart = state.line + 1;
  logger.dbg(`         outStart=${outStart}`);
  let srcIdx = 0;
  let srcLineNo = 1
  logger.dbg(`         srcLines=${srcLines.length}`);
  while (srcIdx < srcLines.length) {
    const rawLine = srcLines[srcIdx];
    srcLineNo = srcIdx + 1;
    // logger.dbg(``);
    // logger.dbg(`      processing srcLine ${srcLineNo}/${srcLines.length}`);
    // logger.dbg(`  rawLine="${rawLine.substring(0, 80)}"`);

    // ────────────────────────────────────────────────────────────────────────
    // INCLUDE DIRECTIVE detected. Process it or issue an error.
    // ────────────────────────────────────────────────────────────────────────
    INCLUDE_RE.lastIndex = 0;
    const match = INCLUDE_RE.exec(rawLine);
    if (match) {
      logger.dbg(`  rawLine="${rawLine.substring(0, 80)}"`);
      const srcColNo = match.index + 1;
      // Ensure a logical merged line exists
      ensureLineOpen(state);
      logger.dbg(`         -> INCLUDE directive found "${match[1]}" on logical line ${state.line}`);

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

      logger.dbg(`         includeDir="${includeDir}"`);
      logger.dbg(`         includePathResolved="${includePathResolved}"`);
      logger.dbg(`         recursing into child depth=${depth + 1}, hasFileNewLine=${hasFinalNewline}`);

      // RECURSE Process child file
      const child = processFile(includePathResolved, [...stack, filePath], visited, visitedMissing, depth + 1, state, filePath, srcLineNo, srcColNo);
      logger.dbg(`         child returned: outStart=${child.outStart}, outEnd=${child.outEnd}, child.srcTotal=${child.srcTotal}, child.hasFinalNewline=${child.hasFinalNewline}`);

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

      logger.dbg(`         pushing beginAnnot + child.lines + endAnnot`);

      outLines.push(beginAnnot, ...child.lines, endAnnot);

      // IMPORTANT:
      // If child lacks final newline, the logical merged line remains open.
      // Otherwise the logical merged line terminates.
      // state.open = !child.hasFinalNewline;
      // state.open = contributesPhysicalLine;
      logger.dbg(`         state.open now ${state.open} after child include`);

      // ────────────────────────────────────────────────────────────────────────
      // NORMAL CONTENT LINE
      // ────────────────────────────────────────────────────────────────────────
    } else {
      // logger.dbg(`         -> normal content line`);
      // Ensure logical merged line exists
      ensureLineOpen(state);
      // logger.dbg(`         emitting normal line on logical line ${state.line}`);
      outLines.push(contentLine(state.line, srcLineNo, rawLine, indent));
      // A normal physical source line always terminates
      if (contributesPhysicalLine) {
        state.open = false;
        // logger.dbg(`         normal line terminated logical line`);
      }
    }

    srcIdx++;
  }

  const outEnd = state.line;

  logger.dbg(`  finished file:`);
  logger.dbg(`     outStart=${outStart}`);
  logger.dbg(`     outEnd=${outEnd}`);
  logger.dbg(`     outLines.length=${outLines.length}`);
  logger.dbg(`     hasFinalNewline=${hasFinalNewline}`);

  return { lines: outLines, outStart, outEnd, srcTotal, hasFinalNewline, contributesPhysicalLine }; // Process Output of Code
}

// ──────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────
const SCRIPT_DIR = __dirname;
const INI_PATH = path.join(SCRIPT_DIR, "mydefrag-preprocess.ini");

function main() {

  // ---- Initialization ----
  // ── Read INI configuration ────
  logger.info('--- Preview processing triggered ---');
  logger.info(`  Debug Path=${INI_PATH}`)
  const ini = readIni(INI_PATH);
  debugOn = String(ini.debugOn || "true").toLowerCase() === "true";
  logger.info(`  Debug=${debugOn}`)
  logger.dbg(`INI_PATH="${INI_PATH}"`);
  logger.dbg(`debugOn=${debugOn}`);

  logger.dbg(`main() started`);
  // ---- Arguments ----
  logger.dbg(`process.argv = ${JSON.stringify(process.argv)}`);
  const args = process.argv.slice(2);
  logger.dbg(`args = ${JSON.stringify(args)}`);

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
    logger.error(`Entry file not found: ${entryFile}`);
    logger.dbg(`Entry file does not exist — aborting`);
    process.exit(1);
  }

  const outputFile = cleanArgs[1]
    ? path.resolve(cleanArgs[1])
    : entryFile.replace(/(\.[^.]+)?$/, ".merged$1");

  logger.dbg(`Entry file exists OK`);
  logger.dbg(`outputFile = "${outputFile}"`);
  logger.dbg(`writeToFile = "${writeToFile}"`);
  const entryUri = pathToFileURL(entryFile).href;
  logger.info(`Entry  : "${entryFile}"`);
  logger.info(`Output : "${outputFile}"`);

  // ──────────────────────────────────────────────────────────────────────────
  // Script Maps of includes, missing includes. In the order encountered.
  const visited = new Set();
  const visitedMissing = new Map();
  const state = {
    line: 0,
    open: false
  };

  // ──────────────────────────────────────────────────────────────────────────
  // ── Process File ──────────────────────────────────────────────────────────
  logger.dbg(`calling processFile on entry...`);
  const root = processFile(entryFile, [], visited, visitedMissing, 0, state, entryFile, 0, 1);

  logger.dbg(`processFile for source file returned:`);
  logger.dbg(`   root.outStart=${root.outStart}`);
  logger.dbg(`   root.outEnd=${root.outEnd}`);
  logger.dbg(`   root.srcTotal=${root.srcTotal}`);
  logger.dbg(`   root.hasFinalNewline=${root.hasFinalNewline}`);
  logger.dbg(`   visited set size: ${visited.size}`);
  logger.dbg(`   visitedMissing set size: ${visitedMissing.size}`);
  logger.dbg(`   state.line after processing: ${state.line}`);

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
  logger.dbg(`building footer maps...`);
  // ── Map of INCLUDE files  ─────────────────────────────────────────────────
  const visitedMapLines = [
    `|Include Files. (${visited.size} file(s) processed`,
    `|${"═".repeat(72)}`,
  ];
  const visitedMapOutPut = [];
  visitedMapOutPut.push(...visitedMapLines);

  let idx = 1;
  for (const f of visited) {
    const { pathToFileURL } = require("url");
    const uri = pathToFileURL(f).href;
    visitedMapLines.push(`|[${String(idx).padStart(3, "0")}]  ${uri}`);
    visitedMapOutPut.push(`|[${String(idx).padStart(3, "0")}]  "${f}"`);
    // logger.dbg(`Include file URI=${uri}`);
    idx++;
  }
  visitedMapLines.push(`| `);
  visitedMapOutPut.push(`| `);
  visitedMapLines.push(`|${"═".repeat(72)}`);
  visitedMapOutPut.push(`|${"═".repeat(72)}`);

  // ── Map of MISSING include files ─────────────────────────────────────────
  const missingMapLines = [];
  const missingMapOutput = [];
  if (visitedMissing.size > 0) {
    // logger.dbg(`building missing file map (${visitedMissing.size} files)`);
    const SCRIPT_HEADER_LINES = 10; // Seen at top of output
    const MISSING_BLOCK_LINES = 3; // Number of line per detail ouput
    const MISSING_HEADER_LINES = 5; // Number of lines in this header here.

    const startLineOfCode = SCRIPT_HEADER_LINES + (visitedMissing.size * MISSING_BLOCK_LINES) + MISSING_HEADER_LINES + visitedMapLines.length;

    const msg = [
      ``,
      `|MISSING FILE ERRORS!!! (${visitedMissing.size} file(s) missing)`,
      `|Script starts at line ${startLineOfCode}.`,
      `|${"═".repeat(72)}`,
    ];
    missingMapLines.push(...msg);
    missingMapOutput.push(...msg);
    // ──────────────────────────────────────────────────────────────────────────
    idx = 1;
    for (const [filePath, info] of visitedMissing) {
      const {
        parentFile,
        parentSrcLineNo,
        parentSrcColNo,
        depth,
        missingFile,
        OutputLine
      } = info;
      // visitedMissing.set(filePath, { parentFile, parentSrcLineNo, parentSrcColNo, depth, missingFile });
      const parentUri = pathToFileURL(parentFile).href;
      const missingUri = pathToFileURL(filePath).href;
      const parentUriWithLine = `${parentUri}:${parentSrcLineNo}:${parentSrcColNo}`;
      const parentPathWithLine = `${parentFile}:${parentSrcLineNo}:${parentSrcColNo}`;
      // logger.dbg(`${parentUri}:${parentSrcLineNo}`);
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
    logger.dbg(`no missing include files`);
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
    visitedMapOutPut.join("\n") +
    "\n";
  footerOutput.split(/\r?\n/).forEach(line => { logger.info(line); });

  const footer =
    missingMapLines.join("\n") +
    "\n" +
    visitedMapLines.join("\n") +
    "\n";
  logger.dbg(`Console footer length=${footerOutput.length} and in document=${footer.length}`);
  
  const body = root.lines.join("");

  const fullOutput = header + footer + body;

  // ──────────────────────────────────────────────────────────────────────────
  // ── Write ─────────────────────────────────────────────────────────────────
  if (writeToFile) {
    logger.dbg(`writing to: "${outputFile}"`);
    try {
      fs.writeFileSync(outputFile, fullOutput, "utf8");

    } catch (err) {
      logger.dbg(`writeFileSync FAILED: ${err.message}`);
      logger.error(`writeFileSync ERROR writing output: ${err.message}`);
      process.exit(1);
    }

    // Verify the file was written
    if (fs.existsSync(outputFile)) {
      const writtenSize = fs.statSync(outputFile).size;
      logger.dbg(`output file confirmed on disk: ${writtenSize} bytes`);
    } else {
      logger.error(`output file NOT found after write — something is very wrong`);
    }
  } else {
    // ── Write to memory ──────────────────────────────────────────────────────
    logger.dbg(`creating memory resident preview: "${outputFile}"`);
    process.stdout.write(fullOutput);
  }

  // ──────────────────────────────────────────────────────────────────────────
  logger.info(`Done. ${visited.size} file(s), ${state.line} logical merged lines.`);
  logger.warn(`${visitedMissing.size} file(s) are missing.`);
  if (writeToFile) {
    logger.info(`Output written to: "${outputFile}"`);
  } else {
    logger.info(`Output written to stdout (preview mode)`);
  }
  logger.info(`main() done`);
}

main();
