'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const HELP_ROOT_PARTS = Object.freeze(['docs', 'MyDefrag Help', 'language']);
const OPEN_HELP_COMMAND_ID = 'mydfrg.openHelp';
const helpPageCache = new Map();

/**
 * Build a trusted-command URI for opening a packaged Help page in preview.
 *
 * @param {string} relativePath Repository-relative path under the Help root.
 * @returns {string} Encoded VS Code command URI.
 */
function createHelpCommandUri(relativePath) {
    const args = encodeURIComponent(JSON.stringify([String(relativePath || '')]));
    return `command:${OPEN_HELP_COMMAND_ID}?${args}`;
}

/**
 * Limit trusted Markdown commands to the Help preview command.
 *
 * @returns {{enabledCommands: string[]}} VS Code Markdown trust options.
 */
function createHelpCommandTrust() {
    return { enabledCommands: [OPEN_HELP_COMMAND_ID] };
}

/**
 * Resolve a repository-relative Help entry without allowing it to escape the
 * packaged MyDefrag language Help directory.
 *
 * @param {string} extensionRoot
 * @param {string} relativePath
 * @returns {string|null}
 */
function resolveHelpFile(extensionRoot, relativePath) {
    const helpRoot = path.resolve(extensionRoot, ...HELP_ROOT_PARTS);
    const candidate = path.resolve(helpRoot, ...String(relativePath || '').split(/[\\/]+/));
    const relative = path.relative(helpRoot, candidate);

    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
        return null;
    }

    return candidate;
}

/**
 * Read the useful hover-sized portion of one converted MyDefrag Help page.
 *
 * @param {{path: string, text?: string, title?: string, description?: string, syntax?: string}} helpDocument
 * @param {string} extensionRoot
 * @returns {{title: string, summary: string, syntax: string, path: string, absolutePath: string, uri: string}|null}
 */
function readHelpPage(helpDocument, extensionRoot) {
    const relativePath = String(helpDocument?.path || '');
    const absolutePath = resolveHelpFile(extensionRoot, relativePath);
    if (!absolutePath || !fs.existsSync(absolutePath)) return null;

    const cacheKey = [
        absolutePath,
        helpDocument?.text || '',
        helpDocument?.title || '',
        helpDocument?.description || '',
        helpDocument?.syntax || ''
    ].join('|');
    if (helpPageCache.has(cacheKey)) return helpPageCache.get(cacheKey);

    const markdown = fs.readFileSync(absolutePath, 'utf8');
    const title = helpDocument?.title
        || markdown.match(/^#\s+(.+)$/m)?.[1]?.trim()
        || helpDocument?.text
        || path.basename(relativePath, path.extname(relativePath));
    const bodyStart = markdown.match(/^#\s+.+\r?\n/m);
    const afterTitle = bodyStart
        ? markdown.slice(bodyStart.index + bodyStart[0].length)
        : markdown;
    const summarySource = afterTitle.split(/^#{2,}\s+/m, 1)[0];
    const summary = helpDocument?.description || cleanSummary(summarySource);
    const syntax = helpDocument?.syntax
        || markdown.match(/^###\s+Syntax\s*\r?\n+```(?:mydfrg)?\s*\r?\n([\s\S]*?)```/mi)?.[1]?.trim()
        || '';
    const page = {
        title,
        summary,
        syntax,
        path: relativePath,
        absolutePath,
        uri: pathToFileURL(absolutePath).href
    };

    helpPageCache.set(cacheKey, page);
    return page;
}

/**
 * Render one or more Help excerpts for an editor or Diagnostics hover.
 *
 * @param {Array<{path: string, text?: string, description?: string}>} helpDocuments
 * @param {object} options
 * @param {string} options.extensionRoot
 * @param {(page: object) => string} [options.linkForPage]
 * @returns {string}
 */
function renderHelpMarkdown(helpDocuments, options) {
    const pages = (helpDocuments || [])
        .map(helpDocument => readHelpPage(helpDocument, options.extensionRoot))
        .filter(Boolean);

    return pages.map((page, index) => {
        const sections = [`### ${escapeMarkdown(page.title)}`];
        if (page.summary) sections.push(page.summary);
        if (page.syntax) sections.push(`\`\`\`mydfrg\n${page.syntax}\n\`\`\``);

        const link = options.linkForPage ? options.linkForPage(page) : page.uri;
        sections.push(`[Open full MyDefrag Help](${link} "${escapeMarkdown(page.title)}")`);

        if (pages.length > 1) {
            sections.unshift(`**Related Help ${index + 1} of ${pages.length}**`);
        }
        return sections.join('\n\n');
    }).join('\n\n---\n\n');
}

function cleanSummary(value) {
    return String(value || '')
        .replace(/<!--[^]*?-->/g, ' ')
        .replace(/\[\*\*(.*?)\*\*\]\([^)]*\)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/\r?\n\s*\r?\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function escapeMarkdown(value) {
    return String(value || '').replace(/([\\`*_{}\[\]()#+.!|-])/g, '\\$1');
}

module.exports = {
    HELP_ROOT_PARTS,
    OPEN_HELP_COMMAND_ID,
    createHelpCommandTrust,
    createHelpCommandUri,
    readHelpPage,
    renderHelpMarkdown,
    resolveHelpFile
};
