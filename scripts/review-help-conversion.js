#!/usr/bin/env node
'use strict';

/**
 * MyDefrag Help conversion review tool.
 *
 * Purpose:
 *   Review converted Markdown against original HTML, one topic at a time.
 *   Completion state is persisted so review can be stopped and resumed.
 *
 * Typical use from the project root:
 *   npm run review:help
 *   npm run review:help -- open FileSelect
 *   npm run review:help -- done
 *   npm run review:help -- next
 *   npm run review:help -- status
 *
 * Expected default layout:
 *   docs/MyDefrag Help Original/   original HTML help files
 *   docs/MyDefrag Help/            generated Markdown files
 *   docs/MyDefrag Help/review-map.json
 *
 * The script creates:
 *   .user/help-review/state.json
 *   .user/help-review/current-review.html
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const projectRoot = process.cwd();
const docsRoot = path.join(projectRoot, 'docs');
const defaultSourceRoot = path.join(docsRoot, 'MyDefrag Help Original');
const defaultOutputRoot = path.join(docsRoot, 'MyDefrag Help');
const defaultMapPath = path.join(defaultOutputRoot, 'review-map.json');
const userRoot = path.join(projectRoot, '.user', 'help-review');
const statePath = path.join(userRoot, 'state.json');
const reviewHtmlPath = path.join(userRoot, 'current-review.html');

const args = process.argv.slice(2);
const command = (args[0] || 'next').toLowerCase();
const query = args.slice(1).join(' ').trim();

const sourceRoot = process.env.MYDEFRAG_HELP_SOURCE || defaultSourceRoot;
const outputRoot = process.env.MYDEFRAG_HELP_OUTPUT || defaultOutputRoot;
const mapPath = process.env.MYDEFRAG_HELP_REVIEW_MAP || defaultMapPath;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw.trim()) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Unable to read JSON: ${filePath}\n${err.message}`);
    return fallback;
  }
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function slash(value) {
  return String(value || '').replace(/\\/g, '/');
}

function rel(from, to) {
  return slash(path.relative(from, to));
}

function htmlEscape(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function attrEscape(text) {
  return htmlEscape(text).replace(/'/g, '&#39;');
}

function fileUrl(filePath) {
  const resolved = path.resolve(filePath).replace(/\\/g, '/');
  const prefix = process.platform === 'win32' ? 'file:///' : 'file://';
  return prefix + encodeURI(resolved).replace(/#/g, '%23');
}

function slug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function titleFromOutput(outputRelative) {
  const base = path.basename(outputRelative, '.md');
  const parent = path.basename(path.dirname(outputRelative));
  if (parent && parent !== '.' && parent !== 'language' && parent !== 'manual') {
    return `${parent} / ${base}`;
  }
  return base;
}

function loadMap() {
  const map = readJson(mapPath, null);
  if (!Array.isArray(map)) {
    console.error(`Review map not found or invalid: ${mapPath}`);
    console.error('Run the generator/converter again, or place review-map.json at the path above.');
    process.exit(1);
  }

  return map.map((item, index) => ({
    id: item.id || slug(item.sourceHtml || item.source || item.outputMarkdown || String(index + 1)),
    title: item.title || titleFromOutput(item.outputMarkdown || item.output || ''),
    sourceHtml: item.sourceHtml || item.source,
    outputMarkdown: item.outputMarkdown || item.output,
    index
  })).filter(item => item.sourceHtml && item.outputMarkdown);
}

function loadState() {
  const state = readJson(statePath, null);
  if (state && Array.isArray(state.completed)) {
    state.completed = new Set(state.completed);
    state.skipped = new Set(Array.isArray(state.skipped) ? state.skipped : []);
    state.currentId = state.currentId || null;
    return state;
  }
  return {
    currentId: null,
    completed: new Set(),
    skipped: new Set(),
    notes: {},
    updatedAt: null
  };
}

function saveState(state) {
  writeJson(statePath, {
    currentId: state.currentId || null,
    completed: Array.from(state.completed).sort(),
    skipped: Array.from(state.skipped).sort(),
    notes: state.notes || {},
    updatedAt: new Date().toISOString()
  });
}

function findItem(items, state, selector) {
  if (selector) {
    const q = selector.toLowerCase();
    const exact = items.find(item => item.id.toLowerCase() === q);
    if (exact) return exact;
    return items.find(item =>
      item.title.toLowerCase().includes(q) ||
      item.sourceHtml.toLowerCase().includes(q) ||
      item.outputMarkdown.toLowerCase().includes(q)
    ) || null;
  }

  if (state.currentId) {
    const current = items.find(item => item.id === state.currentId);
    if (current && !state.completed.has(current.id)) return current;
  }

  return items.find(item => !state.completed.has(item.id)) || null;
}

function currentItem(items, state) {
  if (!state.currentId) return null;
  return items.find(item => item.id === state.currentId) || null;
}

function markdownToHtml(markdownText, markdownFilePath) {
  const lines = String(markdownText || '').split(/\r?\n/);
  let html = '';
  let inCode = false;
  let codeLang = '';
  let paragraph = [];
  let inList = false;

  function flushParagraph() {
    if (!paragraph.length) return;
    html += `<p>${inlineMarkdown(paragraph.join(' '), markdownFilePath)}</p>\n`;
    paragraph = [];
  }

  function closeList() {
    if (!inList) return;
    html += '</ul>\n';
    inList = false;
  }

  for (const line of lines) {
    const fence = line.match(/^```\s*([^`]*)\s*$/);
    if (fence) {
      flushParagraph();
      closeList();
      if (!inCode) {
        inCode = true;
        codeLang = fence[1] || '';
        html += `<pre><code class="language-${attrEscape(codeLang)}">`;
      } else {
        inCode = false;
        html += '</code></pre>\n';
      }
      continue;
    }

    if (inCode) {
      html += htmlEscape(line) + '\n';
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      closeList();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      html += `<h${level}>${inlineMarkdown(heading[2], markdownFilePath)}</h${level}>\n`;
      continue;
    }

    const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      if (!inList) {
        html += '<ul>\n';
        inList = true;
      }
      html += `<li>${inlineMarkdown(bullet[1], markdownFilePath)}</li>\n`;
      continue;
    }

    // Basic pipe table rendering. Good enough for review work.
    if (/^\s*\|.*\|\s*$/.test(line)) {
      flushParagraph();
      closeList();
      html += `<pre class="table-source">${htmlEscape(line)}</pre>\n`;
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  closeList();
  if (inCode) html += '</code></pre>\n';
  return html;
}

function inlineMarkdown(text, markdownFilePath) {
  let out = htmlEscape(text);
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, href) => {
    let target = href;
    if (!/^[a-z]+:/i.test(href) && !href.startsWith('#')) {
      target = fileUrl(path.resolve(path.dirname(markdownFilePath), decodeURI(href)));
    }
    return `<a href="${attrEscape(target)}">${label}</a>`;
  });
  return out;
}

function makeReviewHtml(item, state, items) {
  const sourcePath = path.join(sourceRoot, item.sourceHtml);
  const mdPath = path.join(outputRoot, item.outputMarkdown);
  const mdText = fs.existsSync(mdPath)
    ? fs.readFileSync(mdPath, 'utf8')
    : `# Missing Markdown output\n\n${mdPath}`;
  const mdHtml = markdownToHtml(mdText, mdPath);
  const completedCount = state.completed.size;
  const total = items.length;

  ensureDir(userRoot);

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>MyDefrag Help Review - ${htmlEscape(item.title)}</title>
<style>
  body { margin: 0; font-family: system-ui, Segoe UI, sans-serif; background: #1e1e1e; color: #ddd; }
  header { padding: 10px 14px; border-bottom: 1px solid #444; background: #252526; position: sticky; top: 0; z-index: 2; }
  header code { color: #d7ba7d; }
  .meta { font-size: 13px; color: #bbb; display: flex; gap: 20px; flex-wrap: wrap; }
  .commands { margin-top: 6px; font-size: 13px; color: #ddd; }
  .commands code { color: #9cdcfe; }
  .panes { display: grid; grid-template-columns: 1fr 1fr; height: calc(100vh - 95px); }
  .pane { overflow: auto; border-right: 1px solid #444; background: white; color: #222; }
  .pane h2 { margin: 0; padding: 8px 12px; background: #f3f3f3; border-bottom: 1px solid #ccc; font-size: 14px; position: sticky; top: 0; }
  iframe { width: 100%; height: calc(100% - 38px); border: 0; background: white; }
  .markdown { padding: 0 22px 40px; font-family: system-ui, Segoe UI, sans-serif; line-height: 1.45; }
  .markdown pre { background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; padding: 10px; overflow: auto; }
  .markdown code { font-family: Consolas, ui-monospace, monospace; }
  .missing { color: #b00020; font-weight: 700; }
</style>
</head>
<body>
<header>
  <div><strong>${htmlEscape(item.title)}</strong> <code>${htmlEscape(item.id)}</code></div>
  <div class="meta">
    <span>Completed: ${completedCount}/${total}</span>
    <span>Source: <code>${htmlEscape(item.sourceHtml)}</code></span>
    <span>Output: <code>${htmlEscape(item.outputMarkdown)}</code></span>
  </div>
  <div class="commands">
    Review commands: <code>npm run review:help -- done</code> · <code>npm run review:help -- next</code> · <code>npm run review:help -- open ${htmlEscape(item.id)}</code> · <code>npm run review:help -- status</code>
  </div>
</header>
<div class="panes">
  <section class="pane">
    <h2>Original HTML</h2>
    ${fs.existsSync(sourcePath)
      ? `<iframe src="${attrEscape(fileUrl(sourcePath))}"></iframe>`
      : `<div class="markdown missing">Missing source file: ${htmlEscape(sourcePath)}</div>`}
  </section>
  <section class="pane">
    <h2>Converted Markdown Preview</h2>
    <article class="markdown">${mdHtml}</article>
  </section>
</div>
</body>
</html>`;

  fs.writeFileSync(reviewHtmlPath, html, 'utf8');
  return reviewHtmlPath;
}

function findEditorCommand() {
  const candidates = process.platform === 'win32'
    ? ['codium.cmd', 'codium', 'code.cmd', 'code']
    : ['codium', 'code'];

  for (const cmd of candidates) {
    try {
      const probe = process.platform === 'win32' ? 'where' : 'which';
      cp.execFileSync(probe, [cmd], { stdio: 'ignore' });
      return cmd;
    } catch { }
  }
  return null;
}

function openFile(filePath) {
  const editor = findEditorCommand();
  if (!editor) {
    console.log(`Review page created: ${filePath}`);
    console.log('Could not find codium/code on PATH. Open the file above manually.');
    return;
  }
  cp.spawn(editor, ['-r', filePath], {
    detached: true,
    stdio: 'ignore'
  }).unref();
}

function printStatus(items, state) {
  const total = items.length;
  const completed = state.completed.size;
  const current = currentItem(items, state);
  const next = findItem(items, state, '');
  console.log(`Help conversion review: ${completed}/${total} complete.`);
  if (current) console.log(`Current: ${current.id} - ${current.title}`);
  if (next) console.log(`Next unfinished: ${next.id} - ${next.title}`);
  if (!next) console.log('All comparisons are complete.');
  console.log(`State: ${statePath}`);
}

function writeReviewIndex(items, state) {
  const indexPath = path.join(outputRoot, 'REVIEW-INDEX.md');
  const lines = [
    '# MyDefrag Help Conversion Review Index',
    '',
    'This file maps each converted Markdown topic to its original source HTML file.',
    '',
    '| Status | Topic | Source HTML | Output Markdown |',
    '| --- | --- | --- | --- |'
  ];

  for (const item of items) {
    const status = state.completed.has(item.id) ? 'complete' : 'pending';
    lines.push(`| ${status} | ${item.title} | [${item.sourceHtml}](../MyDefrag%20Help%20Original/${encodeURI(item.sourceHtml)}) | [${item.outputMarkdown}](${encodeURI(item.outputMarkdown)}) |`);
  }

  fs.writeFileSync(indexPath, lines.join('\n') + '\n', 'utf8');
  console.log(`Wrote ${indexPath}`);
}

function main() {
  const items = loadMap();
  const state = loadState();

  switch (command) {
    case 'status':
      printStatus(items, state);
      return;

    case 'index':
      writeReviewIndex(items, state);
      return;

    case 'reset':
      state.currentId = null;
      state.completed.clear();
      state.skipped.clear();
      state.notes = {};
      saveState(state);
      console.log('Review state reset.');
      printStatus(items, state);
      return;

    case 'done': {
      const item = query ? findItem(items, state, query) : currentItem(items, state);
      if (!item) {
        console.log('No current item to mark complete.');
        return;
      }
      state.completed.add(item.id);
      state.currentId = null;
      saveState(state);
      console.log(`Marked complete: ${item.id} - ${item.title}`);
      const next = findItem(items, state, '');
      if (next) {
        state.currentId = next.id;
        saveState(state);
        const reviewPath = makeReviewHtml(next, state, items);
        console.log(`Next: ${next.id} - ${next.title}`);
        openFile(reviewPath);
      } else {
        console.log('All comparisons complete.');
      }
      return;
    }

    case 'open':
    case 'next':
    default: {
      const item = findItem(items, state, command === 'open' ? query : '');
      if (!item) {
        console.log('No unfinished comparison found.');
        printStatus(items, state);
        return;
      }
      state.currentId = item.id;
      saveState(state);
      const reviewPath = makeReviewHtml(item, state, items);
      console.log(`Opening review: ${item.id} - ${item.title}`);
      console.log(`Source: ${path.join(sourceRoot, item.sourceHtml)}`);
      console.log(`Output: ${path.join(outputRoot, item.outputMarkdown)}`);
      openFile(reviewPath);
      return;
    }
  }
}

main();
