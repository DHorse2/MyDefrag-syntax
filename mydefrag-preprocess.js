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

// ---------------------------------------------------------------------------
// Debug logger — writes to stderr so it doesn't pollute stdout/output file
// ---------------------------------------------------------------------------
// const DBG = (...args) => process.stderr.write("[MyDefrag] [DBG] " + args.join(" ") + "\n");
let DebugOn = true;
const DBG = (...args) => {
  if (!DebugOn) {
    return;
  }
  process.stderr.write(
    "[MyDefrag] [DBG] " +
    args.join(" ") +
    "\n"
  );
};

const LogToConsole = (...args) => {
  process.stderr.write(
    "[MyDefrag] " +
    args.join(" ") +
    "\n"
  );
};

// ---------------------------------------------------------------------------
// INI configuration
// ---------------------------------------------------------------------------

const SCRIPT_DIR = __dirname;
const INI_PATH = path.join(SCRIPT_DIR, "mydefrag-preprocess.ini");

function readIni(filePath) {
  const result = {};
  if (!fs.existsSync(filePath)) {
    DBG(`  "${filePath}" ini file not found`);
    return result;
  }
  DBG(`  "${filePath}" ini file exists`);

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
      DBG(`  ignoring malformed line: "${line}"`);
      continue;
    }

    const key = line.substring(0, eqPos).trim();
    const value = line.substring(eqPos + 1).trim();
    result[key] = value;
    DBG(`  ini: ${key}="${value}"`);
  }

  return result;
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

function col(n) {
  return String(n).padStart(COL_W);
}

const BLANK = " ".repeat(COL_W);

function contentLine(outLine, srcLine, text) {
  return `${col(outLine)}${col(srcLine)} ${text}\n`;
}

function annotLine(indent, text) {
  return `${BLANK}${BLANK} ${indent}${text}\n`;
}

// ---------------------------------------------------------------------------
// Logical merged-line helpers
// ---------------------------------------------------------------------------

function ensureLineOpen(state) {
  if (!state.open) {
    state.line++;
    state.open = true;

    // DBG(`         ensureLineOpen() -> OPENED logical line ${state.line}`);
  } else {
    // DBG(`         ensureLineOpen() -> logical line already open (${state.line})`);
  }
}

// ---------------------------------------------------------------------------
// Core processor
// ---------------------------------------------------------------------------

function processFile(filePath,
  stack,
  visited,
  visitedMissing,
  depth,
  state,
  parentFilePath = null,
  parentSrcLineNo = null
) {

  const absPath = path.resolve(filePath);
  const indent = "| ".repeat(depth);

  DBG(`----`);
  DBG(`  --- processFile called: depth=${depth} state.line=${state.line} state.open=${state.open} ---`);
  DBG(`    absPath="${absPath}"`);
  // DBG(`    stack=[${stack.join(", ")}]`);

  // ── Circular include guard ────────────────────────────────────────────────
  if (stack.includes(absPath)) {
    const cycle = [...stack, absPath].map(p => path.basename(p)).join(" → ");
    const msg = `ERROR: Circular include: ${cycle}`;

    console.error(`[MyDefrag] ${msg}`);

    DBG(`  CIRCULAR INCLUDE DETECTED, returning error annotation`);

    return {
      lines: [annotLine(indent, `; *** ${msg} ***`)],
      outStart: state.line + 1,
      outEnd: state.line,
      srcTotal: 0,
      hasFinalNewline: false,
      contributesPhysicalLine: false
    };
  }

  // ── File existence check ──────────────────────────────────────────────────
  // DBG(`    checking existence: "${absPath}"`);
  if (!fs.existsSync(absPath)) {

    visitedMissing.add(absPath);

    // const msg = `WARNING:  Missing include: "${absPath}"`;
    const parentFile = stack.length > 0
      ? stack[stack.length - 1]
      : filePath;

    const parentUri = "file:///" + encodeURI(parentFilePath.replace(/\\/g, "/"));

    const missingUri = "file:///" + encodeURI(absPath.replace(/\\/g, "/"));

    const parentUriWithLine = `${parentUri}:${parentSrcLineNo}:1`;

    const msg = `WARNING: Missing: ${missingUri}\n` +
      `               Referenced from: ${parentUri}:${parentSrcLineNo}:1`;

    console.error(`[MyDefrag] ${msg}`);
    console.error(`[MyDefrag]                Continuing...`);

    DBG(`    FILE NOT FOUND!!!, returning error annotation`);

    return {
      lines: [annotLine(indent, `; *** WARNING: Missing include ("${absPath}") ***`)],
      outStart: state.line + 1,
      outEnd: state.line,
      srcTotal: 0,
      hasFinalNewline: false,
      contributesPhysicalLine: false
    };
  }

  DBG(`    File exists OK`);

  visited.add(absPath);

  // ── Read and split into logical lines ────────────────────────────────────
  DBG(`      Read and split into logical lines:`);
  const raw = fs.readFileSync(absPath, "utf8");
  DBG(`         raw file read: ${raw.length} bytes`);

  // Detect whether file physically ends with newline
  const hasFinalNewline = /\r?\n$/.test(raw);
  DBG(`         hasFinalNewline=${hasFinalNewline}`);

  // Split on either LF or CRLF
  const srcLines = raw.split(/\r?\n/);
  DBG(`         split produced: ${srcLines.length} entries`);

  const contributesPhysicalLine = hasFinalNewline || srcLines.length > 1;

  if (srcLines.length > 0) {
    DBG(`         first line preview="${srcLines[0].substring(0, 60)}"`);
    DBG(`         last line preview="${srcLines[srcLines.length - 1].substring(0, 60)}"`);
  }

  // If the file ended with a newline, split() produces an extra empty entry.
  // Remove ONLY that synthetic entry.
  if (hasFinalNewline) {
    DBG(`         removing synthetic trailing empty line caused by final newline`);
    srcLines.pop();
  } else {
    DBG(`         file does NOT end with newline; keeping final entry`);
  }

  // Source line accounting semantics:
  //   terminated lines count
  //   unterminated trailing fragments do not
  let srcTotal =
    (raw.length === 0)
      ? 0
      : srcLines.length;

  // if (!hasFinalNewline && srcTotal > 0) {
  //   srcTotal--;
  // }

  if (raw.length === 0) {
    DBG(`         file is physically empty`);
  }

  // Determine if multiple lines allowing that
  // any last line might not end in a CRLF

  DBG(`         logical line count finalized, srcTotal=${srcTotal}`);

  const outLines = [];
  const outStart = state.line + 1;
  DBG(`         outStart=${outStart}`);

  let srcIdx = 0;

  // ── Walk source lines ─────────────────────────────────────────────────────
  while (srcIdx < srcLines.length) {
    const rawLine = srcLines[srcIdx];
    const srcLineNo = srcIdx + 1;

    // DBG(``);
    // DBG(`      processing srcLine ${srcLineNo}/${srcLines.length}`);
    // DBG(`  rawLine="${rawLine.substring(0, 80)}"`);

    INCLUDE_RE.lastIndex = 0;

    const match = INCLUDE_RE.exec(rawLine);

    // ────────────────────────────────────────────────────────────────────────
    // INCLUDE DIRECTIVE
    // ────────────────────────────────────────────────────────────────────────
    if (match) {

      DBG(`  rawLine="${rawLine.substring(0, 80)}"`);
      DBG(`         -> INCLUDE directive found: "${match[1]}"`);

      // Ensure a logical merged line exists
      ensureLineOpen(state);

      DBG(`         emitting INCLUDE directive on logical line ${state.line}`);

      // Emit directive line itself
      outLines.push(contentLine(state.line, srcLineNo, rawLine));

      // The include directive itself is a full physical line.
      // Child content therefore starts on NEXT logical merged line.
      state.open = false;
      // IMPORTANT:
      // If child lacks final newline, the logical merged line remains open.
      // Otherwise the logical merged line terminates.
      // state.open = !child.hasFinalNewline;
      // state.open = contributesPhysicalLine;

      const includePath = match[1];
      const includeDir = path.dirname(absPath);
      const resolvedPath = path.resolve(includeDir, includePath);

      DBG(`         includeDir="${includeDir}"`);
      DBG(`         resolvedPath="${resolvedPath}"`);

      // Recurse
      DBG(`         recursing into child depth=${depth + 1}, hasFileNewLine=${hasFinalNewline}`);

      const child = processFile(
        resolvedPath,
        [...stack, absPath],
        visited,
        visitedMissing,
        depth + 1,
        state,
        absPath,
        srcLineNo
      );

      DBG(`         child returned:`);
      DBG(`            child.outStart=${child.outStart}`);
      DBG(`            child.outEnd=${child.outEnd}`);
      DBG(`            child.srcTotal=${child.srcTotal}`);
      DBG(`            child.hasFinalNewline=${child.hasFinalNewline}`);

      // BEGIN annotation — inserted before child lines
      const beginAnnot = annotLine(
        indent,
        `; >>> BEGIN [d:${depth + 1}] ${resolvedPath}` +
        `  src:${child.srcTotal}` +
        `  out:${child.outStart}-${child.outEnd}`
      );

      // END annotation — inserted after child lines
      const endAnnot = annotLine(
        indent,
        `; <<< END   [d:${depth + 1}] ${resolvedPath}` +
        `  src:${child.srcTotal}` +
        `  out:${child.outStart}-${child.outEnd}`
      );

      DBG(`         pushing beginAnnot + child.lines + endAnnot`);

      outLines.push(beginAnnot, ...child.lines, endAnnot);

      // IMPORTANT:
      // If child lacks final newline, the logical merged line remains open.
      // Otherwise the logical merged line terminates.
      // state.open = !child.hasFinalNewline;
      // state.open = contributesPhysicalLine;
      DBG(`         state.open now ${state.open} after child include`);

      // ────────────────────────────────────────────────────────────────────────
      // NORMAL CONTENT LINE
      // ────────────────────────────────────────────────────────────────────────
    } else {

      // DBG(`         -> normal content line`);

      // Ensure logical merged line exists
      ensureLineOpen(state);

      // DBG(`         emitting normal line on logical line ${state.line}`);
      outLines.push(contentLine(state.line, srcLineNo, rawLine));

      // A normal physical source line always terminates
      state.open = false;
      // DBG(`         normal line terminated logical line`);
    }

    srcIdx++;
  }

  const outEnd = state.line;

  DBG(`  finished file:`);
  DBG(`     outStart=${outStart}`);
  DBG(`     outEnd=${outEnd}`);
  DBG(`     outLines.length=${outLines.length}`);
  DBG(`     hasFinalNewline=${hasFinalNewline}`);

  return {
    lines: outLines,
    outStart,
    outEnd,
    srcTotal,
    hasFinalNewline,
    contributesPhysicalLine
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {

  // ---- Initialization ----
  // ── Read INI configuration ────
  LogToConsole('--- Preview processing triggered ---');
  LogToConsole(`  Debug Path=${INI_PATH}`)
  const ini = readIni(INI_PATH);
  DebugOn = String(ini.DebugOn || "true").toLowerCase() === "true";
  LogToConsole(`  Debug=${DebugOn}`)
  DBG(`INI_PATH="${INI_PATH}"`);
  DBG(`DebugOn=${DebugOn}`);

  DBG(`main() started`);
  // ---- Arguments ----
  DBG(`process.argv = ${JSON.stringify(process.argv)}`);
  const args = process.argv.slice(2);
  DBG(`args = ${JSON.stringify(args)}`);

  // ---- Help ----
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log([
      "[MyDefrag]",
      "",
      "  MyDefrag Script Preprocessor",
      "  ──────────────────────────────────────────────────────────────",
      "  Usage:  node mydefrag-preprocess.js <entryFile> [outputFile]",
      "",
      "  <entryFile>   Path to the root .MyDc script.",
      "  [outputFile]  Optional output path.",
      "                Defaults to <entryFile>.merged.MyDc",
      "",
      "  Output columns per content line:",
      `  ${"<outLine>".padStart(COL_W)}${"<srcLine>".padStart(COL_W)} <content>`,
      "",
      "  outLine  running logical merged line number",
      "  srcLine  line number within the owning source file",
      "",
      "  BEGIN / END annotations are unnumbered single lines.",
      "",
    ].join("\n"));
    process.exit(0);
  }

  // ---- File to prepare preview ----
  const entryFile = path.resolve(args[0]);
  DBG(`entryFile resolved to: "${entryFile}"`);
  if (!fs.existsSync(entryFile)) {
    console.error(`[MyDefrag] ERROR: Entry file not found: ${entryFile}`);

    DBG(`Entry file does not exist — aborting`);

    process.exit(1);
  }

  DBG(`Entry file exists OK`);

  const outputFile = args[1]
    ? path.resolve(args[1])
    : entryFile.replace(/(\.[^.]+)?$/, ".merged$1");

  DBG(`outputFile = "${outputFile}"`);

  LogToConsole(`Entry  : "${entryFile}"`);
  LogToConsole(`Output : "${outputFile}"`);

  const visited = new Set();
  const visitedMissing = new Set();

  const state = {
    line: 0,
    open: false
  };

  // ── Process File ──────────────────────────────────────────────────────────
  DBG(`calling processFile on entry...`);

  const root = processFile(
    entryFile,
    [],
    visited,
    visitedMissing,
    0,
    state
  );

  DBG(`processFile returned:`);
  DBG(`   root.outStart=${root.outStart}`);
  DBG(`   root.outEnd=${root.outEnd}`);
  DBG(`   root.srcTotal=${root.srcTotal}`);
  DBG(`   root.hasFinalNewline=${root.hasFinalNewline}`);

  DBG(`   visited set size: ${visited.size}`);
  DBG(`   visitedMissing set size: ${visitedMissing.size}`);
  DBG(`   state.line after processing: ${state.line}`);

  // ── Header ────────────────────────────────────────────────────────────────
  const header = [
    `; ${"═".repeat(72)}`,
    `; MyDefrag Preprocessor — Merged Output`,
    `; Generated  : ${new Date().toISOString()}`,
    `; Entry      : ${entryFile}`,
    `; Output lines: ${state.line}  (logical merged lines)`,
    `; ${"═".repeat(72)}`,
    `; ${"<outLine>".padStart(COL_W)}${"<srcLine>".padStart(COL_W)} <content>`,
    `; ${"═".repeat(72)}`,
    "",
  ].join("\n");

  // ── Footer / include map ──────────────────────────────────────────────────
  DBG(`building footer maps...`);
  // Map of include files
  // DBG(`building file map (${visited.size} files)`);
  const mapLines = [
    "",
    `; ${"═".repeat(72)}`,
    `; Include Files (${visited.size} file(s) processed)`,
    `; ${"═".repeat(72)}`,
  ];

  let idx = 1;
  for (const f of visited) {
    const uri = "file:///" + f.replace(/\\/g, "/");
    mapLines.push(
      `; [${String(idx).padStart(3, "0")}]  ${uri}`
    );
    DBG(`Include file URI=${uri}`);
    idx++;
  }
  mapLines.push(`; ${"═".repeat(72)}`);

  // Map of MISSING include files
  const missingMapLines = [];
  if (visitedMissing.size > 0) {
    // DBG(`building missing file map (${visitedMissing.size} files)`);
    missingMapLines.push(
      "",
      `; ${"═".repeat(72)}`,
      `; MISSING FILES (${visitedMissing.size} file(s) missing)`,
      `; ${"═".repeat(72)}`
    );

    idx = 1;
    for (const f of visitedMissing) {
      const uri = "file:///" + f.replace(/\\/g, "/");
      missingMapLines.push(
        `; [${String(idx).padStart(3, "0")}]  ${uri}`
      );
      // DBG(`Missing file URI=${uri}`);
      idx++;
    }
    missingMapLines.push(`; ${"═".repeat(72)}`);

  } else {
    DBG(`no missing include files`);
    missingMapLines.push(
      "",
      `; ${"═".repeat(72)}`,
      `; MISSING FILES`,
      `; ${"═".repeat(72)}`,
      `; No missing files.`,
      `; ${"═".repeat(72)}`
    );
  }

  // Build final footer
  const footer =
    mapLines.join("\n") +
    "\n" +
    missingMapLines.join("\n");
  DBG(`footer length=${footer.length}`);
  LogToConsole(`${footer}`);

  // ── Write ─────────────────────────────────────────────────────────────────
  const body = root.lines.join("");
  const fullOutput = header + body + footer;
  DBG(`writing to: "${outputFile}"`);

  try {
    fs.writeFileSync(outputFile, fullOutput, "utf8");

  } catch (err) {
    DBG(`writeFileSync FAILED: ${err.message}`);
    console.error(`[MyDefrag] ERROR writing output: ${err.message}`);
    process.exit(1);
  }

  // Verify the file was written
  if (fs.existsSync(outputFile)) {
    const writtenSize = fs.statSync(outputFile).size;
    DBG(`output file confirmed on disk: ${writtenSize} bytes`);
  } else {

    DBG(`output file NOT found after write — something is very wrong`);
  }

  LogToConsole(`Done. ${visited.size} file(s), ${state.line} logical merged lines.`);
  LogToConsole(`${visitedMissing.size} file(s) are missing.`);
  LogToConsole(`Output written to: "${outputFile}"`);

  LogToConsole(`main() done`);
}

main();
