'use strict';
// extensions.js
const fs = require("fs");
const path = require('path');
const vscode = require('vscode');
const cp = require('child_process');
// language server
const { LanguageClient, TransportKind } = require('vscode-languageclient/node');
let client;
let ParserStateBar;
// Debug logger — writes to stderr so it doesn't pollute stdout/output file
// ---------------------------------------------------------------------------
let debugOn = true;
let verbose = 1;
const Ini = require('./common/ini')
const logger = require('./common/logger');
// const DBG = (...args) => process.stderr.write("[MyDefrag] [DBG] " + args.join(" ") + "\n");
// const log = vscode.window.createOutputChannel('MyDefrag Preview');
// const DBG = (...args) => { if (debugOn) { logger.info(...args); } };
// const LogToConsole = (...args) => { log?.append("[MyDefrag] [DBG] " + args.join(" ") + '\n'); };

// Search all .MyDc / .MyD files in the workspace for a regex pattern.
// Returns an array of vscode.Location objects.
async function searchWorkspace(pattern) {
    const locations = [];

    // Find every MyDefrag script file on disk
    const uris = await vscode.workspace.findFiles('**/*.{MyDc,MyD}', '**/node_modules/**');

    for (const uri of uris) {
        const doc = await vscode.workspace.openTextDocument(uri);
        const text = doc.getText();
        let match;

        // Reset lastIndex each call since we reuse the regex
        pattern.lastIndex = 0;

        while ((match = pattern.exec(text)) !== null) {
            const pos = doc.positionAt(match.index);
            // Highlight just the variable name, not the whole match
            const nameIndex = match.index + match[0].indexOf(match[1]);
            const start = doc.positionAt(nameIndex);
            const end = doc.positionAt(nameIndex + match[1].length);
            locations.push(new vscode.Location(uri, new vscode.Range(start, end)));
        }
    }

    return locations;
}

async function activate(context) {
    // ---- Initialization ----
    logger.info("MYDC EXTENSION ACTIVATED");
    ParserStateBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    ParserStateBar.text = `MyDefrag Uknown document type`;
    ParserStateBar.show();
    context.subscriptions.push(ParserStateBar);
    const SCRIPT_DIR = __dirname;
    const INI_PATH = path.join(SCRIPT_DIR, "mydefrag-preprocess.ini");

    // ─────────────────────────────────────────────────────────────────────────────────
    // debug
    // ── Read INI configuration ────
    logger.info('--- Preview processing triggered ---');
    logger.info(`  Debug Path=${INI_PATH}`)
    const ini = readIni(INI_PATH);
    debugOn = String(debugOn || "true").toLowerCase() === "true";

    // ToDo Then inside activate() after creating the **output channel**?

    const log = vscode.window.createOutputChannel('MyDefrag Preview');
    logger.initialize(log, debugOn, verboseLevel = 1);
    if (debugOn) {
        logger.info(`  Debug=${debugOn}`)
        logger.dbg(`INI_PATH="${INI_PATH}"`);
        logger.dbg(`debugOn=${debugOn}`);
        logger.dbg(`main() started`);
    }

    // ─────────────────────────────────────────────────────────────────────────────────
    // log
    log.show(true);
    const loggedMessages = new Set();
    let headingDone = false;
    let batLinkDebounceTimer = null;

    const diagnosticCollection = vscode.languages.createDiagnosticCollection('bat-links');
    context.subscriptions.push(diagnosticCollection);

    // ── Link detection and analysis ─────────────────────────────────────────────────
    const linkChangeEmitter = new vscode.EventEmitter();

    // ── Go to Definition ────────────────────────────────────────────────────
    // Triggered by F12 or right-click → Go to Definition.
    // Finds the SetVariable(VarName, ...) declaration for the word under cursor.
    const definitionProvider = vscode.languages.registerDefinitionProvider(
        { language: 'mydc' },
        {
            async provideDefinition(document, position) {
                const range = document.getWordRangeAtPosition(position, /\w+/);
                if (!range) return;
                const word = document.getText(range);

                // Match: SetVariable(VarName  — capture group 1 = VarName
                const pattern = new RegExp(
                    `SetVariable\\s*\\(\\s*(${escapeRegex(word)})\\s*,`,
                    'g'
                );

                const locations = await searchWorkspace(pattern);
                return locations;   // single result jumps directly; multiple shows a picker
            }
        }
    );

    // ── Find All References ─────────────────────────────────────────────────
    // Triggered by Shift+F12 or right-click → Find All References.
    // Finds every place VarName appears: in SetVariable() and anywhere else it's used.
    const referenceProvider = vscode.languages.registerReferenceProvider(
        { language: 'mydc' },
        {
            async provideReferences(document, position, context) {
                const range = document.getWordRangeAtPosition(position, /\w+/);
                if (!range) return;
                const word = document.getText(range);

                // Match any standalone occurrence of the word (as a whole word)
                const pattern = new RegExp(`\\b(${escapeRegex(word)})\\b`, 'g');

                const locations = await searchWorkspace(pattern);
                return locations;
            }
        }
    );

    // ── Document Links (Ctrl+Click on includes) ─────────────────────────────
    // Triggered by Ctrl+Click or hovering the path in an !include "..."! line.
    // Resolves the relative path to an absolute URI so VSCodium can open it.
    const linkProvider = vscode.languages.registerDocumentLinkProvider(
        { language: 'mydc' },
        {
            onDidChangeDocumentLinks: linkChangeEmitter.event,
            provideDocumentLinks(document) {
                const links = [];
                const currentDir = path.dirname(document.uri.fsPath);

                const pattern = /!include\s+"([^"]+)"!/g;
                const text = document.getText();
                let match;
                let linkSet = false;

                while ((match = pattern.exec(text)) !== null) {
                    const includePath = match[1];
                    logger.dbg("MATCH:", match[1]); // Debug only
                    const quoteStart = match.index + match[0].indexOf('"') + 1;
                    const start = document.positionAt(quoteStart);
                    const end = document.positionAt(quoteStart + includePath.length);
                    const range = new vscode.Range(start, end);

                    // normalize slashes
                    const normalised = includePath.replace(/\\/g, path.sep);

                    // resolve relative OR absolute
                    const absolutePath = path.resolve(currentDir, includePath);
                    const targetUri = vscode.Uri.file(absolutePath);
                    logger.info(`INCLUDE file match: index: ${match.index}, range: ${range}, ${match[0]}, ${match[1]}, ${match}`);
                    links.push(new vscode.DocumentLink(range, targetUri));
                    linkSet = true;
                }
                logger.info('Number of include links: ${links.length}');

                const lineRe = /file:\/\/\/([^:\s]+):(\d+):(\d+)/g;
                for (let i = 0; i < document.lineCount; i++) {
                    const line = document.lineAt(i);
                    let match;
                    lineRe.lastIndex = 0;
                    while ((match = lineRe.exec(line.text)) !== null) {
                        const fullMatch = match[0];
                        const filePath = match[1];
                        const lineNo = parseInt(match[2]) - 1; // 0-based
                        const colNo = parseInt(match[3]) - 1; // 0-based

                        const start = new vscode.Position(i, match.index);
                        const end = new vscode.Position(i, match.index + fullMatch.length);
                        const range = new vscode.Range(start, end);

                        // vscode.Uri.file() handles the path correctly on Windows
                        const target = vscode.Uri.parse(
                            `command:mdm.openFileAtPosition?${encodeURIComponent(
                                JSON.stringify({ path: filePath, line: lineNo, col: colNo })
                            )}`
                        );

                        const isDuplicate = links.some(link =>
                            link.range.start.line === i &&
                            link.range.start.character === start &&
                            link.range.end.character === end
                        );
                        if (!isDuplicate) { links.push(new vscode.DocumentLink(range, target)); }
                    }
                }

                const execPattern = /\s*"([^"]*\.(?:bat|My\w+|cmd|exe|com)[^"]*)"\s*/gi;
                while ((match = execPattern.exec(text)) !== null) {
                    const filePath = match[1];
                    const quoteStart = text.indexOf('"', match.index) + 1; // skip past opening quote
                    const start = document.positionAt(quoteStart);
                    const end = document.positionAt(quoteStart + filePath.length);
                    const range = new vscode.Range(start, end);
                    const absolutePath = path.resolve(currentDir, filePath);
                    links.push(new vscode.DocumentLink(range, vscode.Uri.file(absolutePath)));
                }

                logger.info('Number of command links: ${links.length}');
                return links;
            }
        }
    );

    // ─────────────────────────────────────────────────────────────────────────────────
    // ── Open Preview Provider  ───────────────────────────────────────────────────────
    function generatePreview(sourcePath) {
        const preprocessScript = path.join(
            __dirname,
            'mydefrag-preprocess.js'
        );

        try {
            const result = cp.spawnSync(
                process.execPath,
                [preprocessScript, sourcePath],
                {
                    cwd: path.dirname(sourcePath),
                    encoding: 'utf8',
                    maxBuffer: 1024 * 1024 * 50
                }
            );
            // result.stdout
            // result.stderr
            // result.error
            // result.status

            // Send stderr to OUTPUT window
            if (result.stderr.length) {
                logger.error(`Error, in preparing preview summary!`, result.stderr);
            } else {
                logger.error(`Error, did not recieve preview summary!`)
            }
            if (result.error) {
                const msg = `ERROR: Preview generation failed:\n\n${result.error.message}`;
                logger.error(msg)
                return `${msg}`;
            }
            return result.stdout.toString();
        } catch (err) {
            return `Preview generation failed:\n\n${err.message}`;
        }
    }
    class MyPreviewProvider {
        provideTextDocumentContent(uri) {
            const mergedPath = uri.fsPath;
            const sourcePath = mergedPath.replace(/\.merged(\.\w+)$/, '$1');
            logger.info(`Preview source: ${sourcePath}\n`);
            return generatePreview(sourcePath);
            // return generatePreview(uri.fsPath);
        }
    }

    const previewProvider = new MyPreviewProvider(log);
    const providerRegistration =
        vscode.workspace.registerTextDocumentContentProvider(
            'mydc-preview',
            previewProvider
        );
    context.subscriptions.push(providerRegistration);

    // ── Open Preview Function ───────────────────────────────────────────────────────
    const openPreviewCommand = vscode.commands.registerCommand(
        'mydc.openPreview',
        async (uri) => {
            const editor = vscode.window.activeTextEditor;
            const sourceUri = uri || (editor && editor.document.uri);
            if (!sourceUri) {
                vscode.window.showWarningMessage('No MyDefrag document is active.');
                return;
            }
            const mergedPath = sourceUri.fsPath.replace(/(\.\w+)$/, '.merged$1');
            const previewUri = vscode.Uri.parse(`mydc-preview:${mergedPath}`);
            const doc = await vscode.workspace.openTextDocument(previewUri);
            await vscode.window.showTextDocument(
                doc,
                vscode.ViewColumn.Active
            );
        }
    );

    // Command that actually opens the file at line/col
    const openCmd = vscode.commands.registerCommand(
        "mdm.openFileAtPosition",
        async ({ path: filePath, line, col }) => {
            const uri = vscode.Uri.file(filePath);
            const doc = await vscode.workspace.openTextDocument(uri);
            const editor = await vscode.window.showTextDocument(doc);
            const pos = new vscode.Position(line, col);
            editor.selection = new vscode.Selection(pos, pos);
            editor.revealRange(new vscode.Range(pos, pos));
        }
    );

    // ── BAT Link Provider ───────────────────────────────────────────────────────
    const batLinkProvider = vscode.languages.registerDocumentLinkProvider(
        { language: 'bat' },
        {
            onDidChangeDocumentLinks: linkChangeEmitter.event,
            provideDocumentLinks(document) {
                const links = [];
                const diagnostics = []; // Clear old diagnostics for this file
                const text = document.getText();
                const currentDir = path.dirname(document.uri.fsPath);

                // Check against user's search and files.exclude settings
                const userExcludes = vscode.workspace.getConfiguration('mydc').get('batLink.exclude') || [];
                const fileExcludes = vscode.workspace.getConfiguration('files').get('exclude') || {};
                const searchExcludes = vscode.workspace.getConfiguration('search').get('exclude') || {};

                // Check user excludes (array of glob patterns)
                const relPath = vscode.workspace.asRelativePath(document.uri);
                for (const pattern of userExcludes) {
                    // Strip **/ prefix and /** suffix to get the folder/file name
                    const simplified = pattern.replace(/\*\*\//g, '').replace(/\/\*\*/g, '').replace(/\*/g, '');
                    logger.info(`relPath ${relPath}, USER pattern}: ${pattern}, simplified: ${simplified}`);
                    if (simplified && relPath.includes(simplified)) {
                        diagnosticCollection.set(document.uri, []);
                        return [];
                    }
                }

                // Check files and search excludes (objects with pattern keys)
                const excludes = { ...fileExcludes, ...searchExcludes };
                for (const pattern of Object.keys(excludes)) {
                    // Strip **/ prefix and /** suffix to get the folder/file name
                    const simplified = pattern.replace(/\*\*\//g, '').replace(/\/\*\*/g, '').replace(/\*/g, '');
                    logger.info(`relPath ${relPath},  IDE pattern}: ${pattern}, simplified: ${simplified}`);
                    if (simplified && relPath.includes(simplified)) {
                        diagnosticCollection.set(document.uri, []);
                        return [];
                    }
                }

                headingDone = false;
                let headingText = '\n.\n' + `------------ File: (${document.uri.fsPath}) ------------\n.\n`;

                const execPattern = /\s*"([^"\s]*\.(?:bat|My\w+|cmd|exe|com))([^"]*)"\s*/gi;
                let match;

                while ((match = execPattern.exec(text)) !== null) {
                    if (!headingDone) {
                        logger.info(headingText + '\n.\n');
                        headingDone = true;
                    }
                    const filePath = match[1];
                    const quoteStart = text.indexOf('"', match.index) + 1;
                    const start = document.positionAt(quoteStart);
                    const end = document.positionAt(quoteStart + filePath.length);
                    const range = new vscode.Range(start, end);
                    const absolutePath = path.resolve(currentDir, filePath).replace(/\//g, '\\');
                    const absoluteUri = vscode.Uri.file(absolutePath);
                    const dir = path.dirname(absolutePath);
                    const base = path.basename(absolutePath);
                    logger.dbg(`File name is: (`, filePath, `)`);
                    logger.info(`BATCH file match: index: ${match.index}, range: ${range}, ${match[0]}, ${match[1]}, ${match}`);
                    const lineNum = start.line + 1;
                    const colNum = start.character + 1;
                    const hasMacro = (filePath.match(/!/g) || []).length >= 2;

                    // Validate file (and search upward when missing)
                    const { foundPath, directLinkValid, stepsUpward } = findFileWalkingUp(currentDir, filePath);
                    let msg = "No message available";
                    let diagnosticSeverity = vscode.DiagnosticSeverity.Information;
                    if (foundPath) {
                        if (!directLinkValid) {
                            let msg = `BAT Link: Found in PARENT ${stepsUpward} steps up, possibly invalid.`
                            let diagnosticSeverity = vscode.DiagnosticSeverity.Warning;
                        } else {
                            let msg = `${document.uri.fsPath}:${lineNum}:${colNum}: Link target found: ${foundPath}`;
                            let diagnosticSeverity = vscode.DiagnosticSeverity.Information;
                        }
                    } else {
                        if (hasMacro) {
                            let msg = `BAT Link: Contains execution time macros: ${filePath}`;
                            let diagnosticSeverity = vscode.DiagnosticSeverity.Information
                        } else {
                            let msg = `BAT Link: File not found: ${filePath}`;
                            let diagnosticSeverity = vscode.DiagnosticSeverity.Error
                        }
                    }
                    const diagnostic = new vscode.Diagnostic(
                        range,
                        msg,
                        diagnosticSeverity
                    );
                    diagnostics.push(diagnostic);
                    if (!loggedMessages.has(msg)) {
                        loggedMessages.add(msg);
                        msg(diagnosticSeverity, msg)
                        // logger.info(msg + '\n.\n');
                    }
                    // For debugging only, formmatted for console.log
                    logger.dbg('  dir:', dir);
                    logger.dbg('  base:', base);
                    logger.dbg('  our filename:', base);
                    logger.dbg('  currentDir:', currentDir);
                    logger.dbg('  absolutePath: (', absolutePath, ')');
                    logger.dbg('  absoluteUri:', absoluteUri);
                    logger.dbg('      match.index:', match.index);
                    logger.dbg('      filePath:', filePath);
                    logger.dbg('      quoteStart:', quoteStart);
                    logger.dbg('      start:', start);
                    logger.dbg('      end:', end);
                    logger.dbg('      absolutePath:', absolutePath);
                    logger.dbg('      range:', range);
                    links.push(new vscode.DocumentLink(range, vscode.Uri.file(absolutePath)));
                }

                diagnosticCollection.set(document.uri, diagnostics);
                return links;
            }
        }
    );

    // ─────────────────────────────────────────────────────────────────────────────────
    // Listen for document changes and fire the emitter
    const docChangeListener = vscode.workspace.onDidChangeTextDocument(e => {
        if (e.document.languageId === 'bat') {
            // Clear any pending timer
            if (batLinkDebounceTimer) {
                clearTimeout(batLinkDebounceTimer);
            }
            // Wait 500ms after last keystroke before firing
            batLinkDebounceTimer = setTimeout(() => {
                loggedMessages.clear();
                linkChangeEmitter.fire();
                batLinkDebounceTimer = null;
            }, 2000);
        } else if (e.document.languageId === 'mydc') {
            // loggedMessages.clear();
            linkChangeEmitter.fire();
        }
    });

    // ─────────────────────────────────────────────────────────────────────────────────
    // Start the language server
    const serverModule = context.asAbsolutePath('server.js');
    const serverOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: { module: serverModule, transport: TransportKind.ipc }
    };
    const clientOptions = {
        documentSelector: [{ scheme: 'file', language: 'mydc' }],
        synchronize: {
            fileEvents: vscode.workspace.createFileSystemWatcher('**/*.{MyDc,MyD}')
        }
    };

    client = new LanguageClient('mydc', 'MyDefrag Language Server', serverOptions, clientOptions);
    await client.start();

    client.onNotification('mydc/ParseState', params => {
        const fileName = params.uri ? path.basename(params.uri) : '';

        let stateText = 'Unknown (Not recognized as script)';

        switch (params.state) {
            case 0:
            case 'FULL':
                stateText = 'Full (Complete valid script)';
                break;

            case 1:
            case 'FRAGMENT':
                stateText = 'Fragment (partially complete or an include file)';
                break;
        }

        ParserStateBar.text = `MyDefrag File State: ${stateText}${fileName ? ` (${fileName})` : ''}`;
    });

    // ─────────────────────────────────────────────────────────────────────────────────
    // Push Subscriptions
    context.subscriptions.push(definitionProvider);
    context.subscriptions.push(referenceProvider);
    context.subscriptions.push(openPreviewCommand);
    context.subscriptions.push(linkProvider, openCmd);
    context.subscriptions.push(batLinkProvider);
    context.subscriptions.push(docChangeListener, linkChangeEmitter);
    context.subscriptions.push(client);
}

function deactivate() {
    if (client) return client.stop();
}

// Escape special regex characters in a variable name
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findFileWalkingUp(startDir, filePath) {
    let dir = startDir;
    const root = path.parse(dir).root; // e.g. "D:\"
    let directLinkValid = true;
    let stepsUpward = 0;
    while (true) {
        logger.info(`Next candidate: ${dir}, and ${filePath}`); // Debug only
        const candidate = path.resolve(dir, filePath).replace(/\//g, '\\');
        if (fs.existsSync(candidate)) {
            return { foundPath: candidate, directLinkValid, stepsUpward };
        }
        // Stop if we've reached the root
        if (dir === root || dir === path.dirname(dir)) {
            return { foundPath: null, directLinkValid: false, stepsUpward };
        }
        // Walk up one level
        dir = path.dirname(dir);
        stepsUpward++
        directLinkValid = false;
    }
}

module.exports = { activate, deactivate };
