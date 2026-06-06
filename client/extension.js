'use strict';
// extensions.js
//#region Initialize Extension .Parse
const fs = require("fs");
const path = require('path');
const vscode = require('vscode');
const cp = require('child_process');
// language server
const { LanguageClient, TransportKind } = require('vscode-languageclient/node');
const Ini = require('../common/ini')
const Logger = require('../common/loggerExtension');
let Client;
let ParserStateBar;

// ─────────────────────────────────────────────────────────────────────────────────
let links = [];
let batchFileCommandLinks = [];
let includeLinks = [];
let fileLinks = [];
let commandLinks = [];
//#endregion
// ─────────────────────────────────────────────────────────────────────────────────
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
// ─────────────────────────────────────────────────────────────────────────────────
//#region Extension activate/deactivate .Parse
async function activate(context) {
    try { // ---- Initialization ----
        const isServer = false;
        const SCRIPT_DIR = __dirname;
        const channelName = 'MyDefag Syntax';
        let batLinkDebounceTimer = null;
        let batLinkDebounceValue = 15000;

        const INI_PATH = path.join(SCRIPT_DIR, "mydefrag-syntax.ini");
        const {
            ini,
            debugOn,
            verboseLevel,
            logOn,
            referenceRelativePathLevel,
            referenceContainsMacrosLevel,
            fileReferenceFoundLevel,
            fileReferenceNotFoundLevel,
            iniErrors
        } = Ini.initialize(INI_PATH, channelName, null, Ini.severity.Verbose, null, false);

        const log = vscode.window.createOutputChannel(channelName);
        const loggedMessages = [];
        let headingDone = false;
        Logger.initialize(log, isServer, debugOn, verboseLevel, ini);

        if (iniErrors.length) { Logger.logArrayToConsole(channelName, Ini.severity.Warning, loggedMessages, iniErrors) }
        Logger.info("MYDC EXTENSION ACTIVATED");

        ParserStateBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        ParserStateBar.text = `MyDefrag Uknown document type`;
        ParserStateBar.show();
        context.subscriptions.push(ParserStateBar);
        Logger.dbg(3, `  Debug Path=${INI_PATH}, Debug=${debugOn}`)
        Logger.dbg(3, `INI_PATH="${INI_PATH}"`);
        Logger.dbg(3, `main() started`);
    } catch (errResult) {
        Logger.err(`extension.js:activate Unexpect error activating extension: ${errResult.message}`);
    }

    // ─────────────────────────────────────────────────────────────────────────────────
    try { // Activate Create, Register ────────────────────────────────────────────────────────────────────────────

        // log
        log.show(true);

        const diagnosticCollection = vscode.languages.createDiagnosticCollection('bat-links');
        context.subscriptions.push(diagnosticCollection);

        // ── Link detection and analysis ─────────────────────────────────────────────────
        const linkChangeEmitter = new vscode.EventEmitter();

        // ── Go to Definition ────────────────────────────────────────────────────
        // Triggered by F12 or right-click → Go to Definition.
        // Finds the SetVariable(VarName, ...) declaration for the word under cursor.
        const definitionProvider = vscode.languages.registerDefinitionProvider(
            { language: 'mydfrg' },
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
            { language: 'mydfrg' },
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
            { language: 'mydfrg' },
            {
                onDidChangeDocumentLinks: linkChangeEmitter.event,
                provideDocumentLinks(document) {
                    includeLinks = [];
                    fileLinks = [];
                    commandLinks = [];
                    let isDuplicate = false;
                    const toZeroBased = (s) => parseInt(s) - 1;
                    const fullMatch = (match) => match[0];
                    const filePath = (match) => match[1];
                    const line = (match) => toZeroBased(match[2]);
                    const col = (match) => toZeroBased(match[3]);

                    const currentDir = path.dirname(document.uri.fsPath);
                    const absolutePath = (currentDir, filePath) => path.resolve(currentDir, filePath);
                    // vscode.Uri.file() handles the path correctly on Windows
                    const target = (filePath, line, col) => vscode.Uri.parse(
                        `command:mdm.openFileAtPosition?${encodeURIComponent(
                            JSON.stringify({ path: filePath, line, col })
                        )}`
                    );


                    const pattern = /!include\s+"([^"]+)"!/g;
                    const text = document.getText();
                    let match;
                    let linkSet = false;

                    while ((match = pattern.exec(text)) !== null) {
                        const includePath = match[1];
                        Logger.dbg(5, "MATCH:", match[1]); // Debug only
                        const quoteStart = match.index + match[0].indexOf('"') + 1;
                        const start = document.positionAt(quoteStart);
                        const end = new vscode.Position(i, match.index + fullMatch(match).length);
                        const range = new vscode.Range(start, end);

                        // normalize slashes
                        const normalised = includePath.replace(/\\/g, path.sep);

                        // resolve relative OR absolute
                        const absolutePath = path.resolve(currentDir, filePath(match));
                        const targetUri = vscode.Uri.file(absolutePath);
                        Logger.dbg(3, `INCLUDE file match: index: ${match.index}, range: ${range}, ${match[0]}, ${match[1]}, ${match}`);
                        isDuplicate = includeLinks.some(link =>
                            link.range.start.line === match.index &&
                            link.range.start.character === start &&
                            link.range.end.character === end
                        );
                        if (!isDuplicate) {
                            includeLinks.push(new vscode.DocumentLink(range, targetUri));
                        }
                        linkSet = true;
                    }
                    Logger.info(`Number of INCLUDE links: ${includeLinks.length}`);

                    const lineRe = /file:\/\/\/([^:\s]+):(\d+):(\d+)/g;
                    for (let i = 0; i < document.lineCount; i++) {
                        const docLine = document.lineAt(i);
                        let match;
                        lineRe.lastIndex = 0;
                        while ((match = lineRe.exec(docLine.text)) !== null) {
                            // const fullMatch = match[0];
                            // const filePath = match[1];
                            // const line = parseInt(match[2]) - 1; // 0-based
                            // const col = parseInt(match[3]) - 1; // 0-based

                            const start = new vscode.Position(i, match.index);
                            const end = new vscode.Position(i, match.index + fullMatch(match).length);
                            const absolutePath = path.resolve(currentDir, filePath(match));
                            // const absolutePath = path.resolve(currentDir, filePath);
                            // vscode.Uri.file() handles the path correctly on Windows
                            // const target = vscode.Uri.parse(
                            //     `command:mdm.openFileAtPosition?${encodeURIComponent(
                            //         JSON.stringify({ path: filePath, line: docLine, col: col })
                            //     )}`
                            // );

                            isDuplicate = fileLinks.some(link =>
                                link.range.start.line === i &&
                                link.range.start.character === start &&
                                link.range.end.character === end
                            );
                            if (!isDuplicate) { fileLinks.push(new vscode.DocumentLink(range, target)); }
                        }
                    }
                    Logger.info(`Number of FILE links: ${fileLinks.length}`);

                    const execPattern = /\s*"([^"]*\.(?:bat|My\w+|cmd|exe|com)[^"]*)"\s*/gi;
                    while ((match = execPattern.exec(text)) !== null) {
                        // const filePath = match[1];
                        const quoteStart = text.indexOf('"', match.index) + 1; // skip past opening quote
                        const start = document.positionAt(quoteStart);
                        const end = document.positionAt(quoteStart + filePath.length);
                        const range = new vscode.Range(start, end);
                        // const absolutePath = path.resolve(currentDir, filePath);
                        // vscode.Uri.file() handles the path correctly on Windows
                        // const target = vscode.Uri.parse(
                        //     `command:mdm.openFileAtPosition?${encodeURIComponent(
                        //         JSON.stringify({ path: filePath, line, col })
                        //     )}`
                        // );

                        isDuplicate = commandLinks.some(link =>
                            link.range.start.line === line &&
                            link.range.start.character === start &&
                            link.range.end.character === end
                        );
                        if (!isDuplicate) { commandLinks.push(new vscode.DocumentLink(range, vscode.Uri.file(absolutePath))); }
                    }
                    Logger.info(`Number of BATCH & command links: ${commandLinks.length}`);

                    return [...includeLinks, ...fileLinks, ...commandLinks];
                    // return links;
                }
            }
        );

        // ─────────────────────────────────────────────────────────────────────────────────
        //#region Open Preview Provider  ───────────────────────────────────────────────────────
        function generatePreview(sourcePath) {
            const preprocessScript = path.join(
                __dirname,
                'mydefrag-preprocess.js'
            );

            try { // ── Open Preview Provider  
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
                    Logger.err(`Error, in preparing preview summary!`, result.stderr);
                } else {
                    Logger.info(`Finished preview summary!`)
                }
                if (result.error) {
                    const nextMsg = `ERROR: Preview generation failed:\n\n${result.error.message}`;
                    Logger.err(nextMsg)
                    return `${nextMsg}`;
                }
                return result.stdout.toString();
            } catch (errResult) {
                const message = `extension.js:activate:generatePreview: Unexpect error Generating Preview of document: ${errResult.message}`;
                Logger.err(message);
                return message;
            }
        }
        class MyPreviewProvider {
            provideTextDocumentContent(uri) {
                const mergedPath = uri.fsPath;
                const sourcePath = mergedPath.replace(/\.merged(\.\w+)$/, '$1');
                Logger.info(`Preview source: ${sourcePath}\n`);
                return generatePreview(sourcePath);
                // return generatePreview(uri.fsPath);
            }
        }

        const previewProvider = new MyPreviewProvider();
        const providerRegistration =
            vscode.workspace.registerTextDocumentContentProvider(
                'mydfrg-preview',
                previewProvider
            );
        context.subscriptions.push(providerRegistration);

        // ── Open Preview Function ───────────────────────────────────────────────────────
        const openPreviewCommand = vscode.commands.registerCommand(
            'mydfrg.openPreview',
            async (uri) => {
                const editor = vscode.window.activeTextEditor;
                const sourceUri = uri || (editor && editor.document.uri);
                if (!sourceUri) {
                    vscode.window.showWarningMessage('No MyDefrag document is active.');
                    return;
                }
                const mergedPath = sourceUri.fsPath.replace(/(\.\w+)$/, '.merged$1');
                const previewUri = vscode.Uri.parse(`mydfrg-preview:${mergedPath}`);
                const doc = await vscode.workspace.openTextDocument(previewUri);
                await vscode.window.showTextDocument(
                    doc,
                    vscode.ViewColumn.Active
                );
            }
        );
        //#endregion
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
        // ─────────────────────────────────────────────────────────────────────────────────
        //#region BAT Link Provider ───────────────────────────────────────────────────────
        const batLinkProvider = vscode.languages.registerDocumentLinkProvider(
            { language: 'bat' },
            {
                onDidChangeDocumentLinks: linkChangeEmitter.event,
                provideDocumentLinks(document) {
                    batchFileCommandLinks = [];
                    const diagnostics = [];
                    const text = document.getText();
                    const currentDir = path.dirname(document.uri.fsPath);

                    // Check against user's search and files.exclude settings
                    const userExcludes = vscode.workspace.getConfiguration('mydfrg').get('batLink.exclude') || [];
                    const fileExcludes = vscode.workspace.getConfiguration('files').get('exclude') || {};
                    const searchExcludes = vscode.workspace.getConfiguration('search').get('exclude') || {};

                    // Check user excludes (array of glob patterns)
                    const relPath = vscode.workspace.asRelativePath(document.uri);
                    for (const pattern of userExcludes) {
                        // Strip **/ prefix and /** suffix to get the folder/file name
                        const simplified = pattern.replace(/\*\*\//g, '').replace(/\/\*\*/g, '').replace(/\*/g, '');
                        Logger.info(`relPath ${relPath}, USER pattern}: ${pattern}, simplified: ${simplified}`);
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
                        Logger.info(`relPath ${relPath},  IDE pattern}: ${pattern}, simplified: ${simplified}`);
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
                            Logger.info(headingText + '\n.\n');
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
                        Logger.dbg(3, `File name is: (`, filePath, `)`);
                        Logger.info(`BATCH file match: index: ${match.index}, range: ${range}, ${match[0]}, ${match[1]}, ${match}`);
                        const lineNum = start.line + 1;
                        const colNum = start.character + 1;
                        const hasMacro = (filePath.match(/!/g) || []).length >= 2;

                        // Validate file (and search upward when missing)
                        const { foundPath, directLinkValid, stepsUpward } = findFileWalkingUp(currentDir, filePath);
                        let batMsg = "No message available";
                        let severity = 4;
                        if (foundPath) {
                            Logger.dbg(5, ` referenceRelativePathLevel: ${referenceRelativePathLevel}`)
                            if (!directLinkValid) {
                                batMsg = `BAT Link: Found in PARENT ${stepsUpward} steps up, possibly invalid.`
                                severity = referenceRelativePathLevel;
                            } else {
                                batMsg = `${document.uri.fsPath}:${lineNum}:${colNum}: Link target found: ${foundPath}`;
                                severity = fileReferenceFoundLevel;
                            }
                        } else {
                            if (hasMacro) {
                                batMsg = `BAT Link: Contains execution time macros: ${filePath}`;
                                severity = referenceContainsMacrosLevel;
                            } else {
                                batMsg = `BAT Link: File not found: ${filePath}`;
                                severity = fileReferenceNotFoundLevel;
                            }
                        }
                        let thisSeverity = severity;
                        if (thisSeverity - 4 > verboseLevel) { thisSeverity = -1 }
                        if (thisSeverity > 4) { thisSeverity = 4 }
                        if (thisSeverity > 0) {
                            const diagnostic = new vscode.Diagnostic(
                                range,
                                batMsg,
                                thisSeverity
                            );
                            diagnostics.push(diagnostic);
                        }
                        if (thisSeverity >= 0) {
                            if (!loggedMessages.has(batMsg)) {
                                loggedMessages.add(batMsg);
                                Logger.msg(thisSeverity, batMsg)
                                // Logger.info(batMsg + '\n.\n');
                            }
                        }
                        // For debugging only, formmatted for console.log
                        Logger.dbg(5, '  dir:', dir);
                        Logger.dbg(5, '  base:', base);
                        Logger.dbg(5, '  our filename:', base);
                        Logger.dbg(5, '  currentDir:', currentDir);
                        Logger.dbg(5, '  absolutePath: (', absolutePath, ')');
                        Logger.dbg(5, '  absoluteUri:', absoluteUri);
                        Logger.dbg(6, '      match.index:', match.index);
                        Logger.dbg(6, '      filePath:', filePath);
                        Logger.dbg(6, '      quoteStart:', quoteStart);
                        Logger.dbg(6, '      start:', start);
                        Logger.dbg(6, '      end:', end);
                        Logger.dbg(6, '      absolutePath:', absolutePath);
                        Logger.dbg(6, '      range:', range);
                        batchFileCommandLinks.push(new vscode.DocumentLink(range, vscode.Uri.file(absolutePath)));
                    }

                    Logger.info(`Number of BATCH FILE internaL command batchFileCommandLinks: ${commandLinks.length}`);
                    diagnosticCollection.set(document.uri, diagnostics);
                    return batchFileCommandLinks;
                }
            }
        );
        //#endregion
    } catch (errResult) {
        Logger.err(`extension.js:activate Unexpect error activating extension: ${errResult.message}`);
    }

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
            }, batLinkDebounceValue);
        } else if (e.document.languageId === 'mydfrg') {
            // loggedMessages.clear();
            linkChangeEmitter.fire();
        }
    });

    // ─────────────────────────────────────────────────────────────────────────────────
    // Start the language server
    const serverModule = context.asAbsolutePath(path.join('server', 'server.js'));
    const serverOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: { module: serverModule, transport: TransportKind.ipc }
    };
    const clientOptions = {
        documentSelector: [{ scheme: 'file', language: 'mydfrg' }],
        synchronize: {
            fileEvents: vscode.workspace.createFileSystemWatcher('**/*.{MyDc,MyD}')
        }
    };

    Client = new LanguageClient('mydfrg', 'MyDefrag Language Server', serverOptions, clientOptions);
    await Client.start();

    Client.onNotification('mydfrg/parseState', params => {
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
    context.subscriptions.push(Client);

    connection.sendNotification('mydfrg/parserState', { uri: document.uri, state: parserState });

    connection.sendDiagnostics({
        uri: document.uri,
        diagnostics
    });
}

function deactivate() {
    if (Client) return Client.stop();
}
//#endregion
// ─────────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────────
//#region Utility Functions: Escape special regex characters
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─────────────────────────────────────────────────────────────────────────────────
function findFileWalkingUp(startDir, filePath) {
    let dir = startDir;
    const root = path.parse(dir).root; // e.g. "D:\"
    let directLinkValid = true;
    let stepsUpward = 0;
    while (true) {
        Logger.info(`Next candidate: ${dir}, and ${filePath}`); // Debug only
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
//#endregion
// ─────────────────────────────────────────────────────────────────────────────────
module.exports = { activate, deactivate };
