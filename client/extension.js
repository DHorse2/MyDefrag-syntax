'use strict';
// extensions.js
//#region Initialize Extension .Parse
const fs = require("fs");
const path = require('path');
const vscode = require('vscode');
const cp = require('child_process');
// language server
const { LanguageClient, TransportKind } = require('vscode-languageclient/node');
const ini = require('../common/ini')
const logger = require('../common/loggerExtension');
const { config } = require("process");
const channelName = 'MyDefrag Syntax';
var isServer = false;
var ParserStateBar;
var diagnostics = [];

// ─────────────────────────────────────────────────────────────────────────────────
var links = [];
var batchFileCommandLinks = [];
var includeLinks = [];
var fileLinks = [];
var commandLinks = [];
//#endregion
// ─────────────────────────────────────────────────────────────────────────────────
//#region Utility Functions: Escape special regex characters
function escapeRegex(str) {
    try {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────────
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
//#endregion
// ─────────────────────────────────────────────────────────────────────────────────
// Search all .MyDc / .MyD files in the workspace for a regex pattern.
async function searchWorkspace(pattern) {
    // Returns an array of vscode.Location objects.
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
    let iniData;
    let connection;
    let extensionConfig;
    let debugOn;
    let verboseLevel;
    let logOn;
    let referenceRelativePathLevel;
    let referenceContainsMacrosLevel;
    let fileReferenceFoundLevel;
    let fileReferenceNotFoundLevel;
    let iniErrors;
    const SCRIPT_DIR = __dirname;
    const PARENT_DIR = path.dirname(SCRIPT_DIR);
    // const channelName = 'MyDefrag Syntax';
    let batLinkDebounceTimer = null;
    let batLinkDebounceValue = 15000;

    const INI_PATH = path.join(PARENT_DIR, "mydefrag-syntax.ini");
    try { // ---- Initialization ----
        try { // Ini Init
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
            const message = `extension.js:activate:ini:initialize Error returned from initialization: ${errResult.message}`;
            console.error(message);
            throw new Error(message);
        }
        console.log("init done")
        console.log(`result: ${iniData}`)
        try { // Logging Channel and Status Bar
            // ─────────────────────────────────────────────────────────────────────────────────
            connection = vscode.window.createOutputChannel(channelName);
            // ─────────────────────────────────────────────────────────────────────────────────
            const loggedMessages = new Set();
            let headingDone = false;
            logger.initialize(connection, isServer, diagnostics, iniData, extensionConfig, debugOn, verboseLevel)
            if (iniErrors.length) { logger.logArrayToConsole(channelName, ini.severity.Warning, loggedMessages, iniErrors) }
            console.log(iniData);
            logger.info("MYDC EXTENSION INITIALIZED");
            // ─────────────────────────────────────────────────────────────────────────────────
            ParserStateBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
            ParserStateBar.text = `MyDefrag Unknown document type`;
            ParserStateBar.show();
            context.subscriptions.push(ParserStateBar);
            logger.dbg(3, `  Debug Path=${INI_PATH}, Debug=${debugOn}`)
            logger.dbg(3, `INI_PATH="${INI_PATH}"`);
            logger.dbg(3, `main() started`);
        } catch (errResult) {
            const message = `extension.js:activate Unexpected error in Logging Channel and Status Bar initialization: ${errResult.message}`;
            console.error(message);
            throw new Error(message);
        }
        console.log("Channel, Status Bar done")
    } catch (errResult) {
        const message = `extension.js:activate Unexpected error activating extension: ${errResult.message}`;
        console.error(message);
        throw new Error(message);
    }
    // ─────────────────────────────────────────────────────────────────────────────────
    try { // Activate Create, Register ──────────────────────────────────────────────────
        // log
        connection.show(true);
        // ── Diagnostics ────────────────────────────────────────────────────────────────
        const diagnosticCollection = vscode.languages.createDiagnosticCollection('bat-links');
        context.subscriptions.push(diagnosticCollection);
        // ── Link detection and analysis ─────────────────────────────────────────────────
        const linkChangeEmitter = new vscode.EventEmitter();
        // ── Go to Definition ──────────────────────────────────────────────────────────────
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
        // ── Find All References ───────────────────────────────────────────────────────────
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
                    const text = document.getText();
                    const docLine = (i) => document.lineAt(i);
                    const fullMatch = (match) => match[0];
                    const filePath = (match) => match[1];
                    const line = (match) => toZeroBased(match[2]);
                    const col = (match) => toZeroBased(match[3]);
                    const currentDir = () => path.dirname(document.uri.fsPath);
                    const absolutePath = (currentDir, filePath) => path.resolve(document.fileName, filePath);

                    // vscode.Uri.file() handles the path correctly on Windows
                    const target = (filePath, line, col) => vscode.Uri.parse(
                        `command:mdm.openFileAtPosition?${encodeURIComponent(
                            JSON.stringify({ path: filePath, line, col })
                        )}`
                    );
                    const displayLine = (text, line) => {
                        try {
                            console.log(`${text[line]}`);
                        } catch {
                            console.error(`Invalid format: line: ${line}, text: ${text}`);
                        }
                    }
                    const displayMatch = (text, range) => {
                        try {
                            const line = range.start.line;
                            const textOut = text[range.start.line + range.start.character, range.end.line + range.end.character];
                            // const textOut = displayMatch(text, range);
                            // const textOut2 = `INCLUDE file match: index: ${match.index}, range[${range.start.line}::${range.start.character}], ${match[0]}, ${match[1]}, ${match}`;
                            const message = (`Match found: ${textOut} range[${range.start.line}::${range.start.character}], in line: ${displayLine(text, line)}`);
                            console.log(message);
                        } catch {
                            console.error(`Invalid format: range[${range.start.line}::${range.start.character}], text: ${text}`);
                        }
                    }
                    // ── Document INCLUDE Links ─────────────────────────────
                    const pattern = /!include\s+"([^"]+)"!/g;
                    let match;
                    let linkSet = false;

                    while ((match = pattern.exec(text)) !== null) {
                        const includePath = match[1];
                        logger.dbg(5, "MATCH:", match[1]); // Debug only
                        const quoteStart = match.index + match[0].indexOf('"') + 1;
                        const start = document.positionAt(quoteStart);
                        const end = new vscode.Position(start.line, match.index + fullMatch(match).length);
                        const range = new vscode.Range(start, end);
                        // normalize slashes
                        const normalised = includePath.replace(/\\/g, path.sep);
                        // resolve relative OR absolute
                        const targetUri = vscode.Uri.file(absolutePath(currentDir, includePath));
                        logger.dbg(3, `INCLUDE file match: index: ${match.index}, range[${range.start.line}::${range.start.character}], ${match[0]}, ${match[1]}, ${match}`);

                        isDuplicate = includeLinks.some(link =>
                            link.range.start.line === start.line &&
                            link.range.start.character === start &&
                            link.range.end.character === end
                        );
                        if (!isDuplicate) {
                            includeLinks.push(new vscode.DocumentLink(range, target(targetUri, start.line, start)));
                        }
                        linkSet = true;
                    }
                    logger.info(`Number of INCLUDE links: ${includeLinks.length}`);

                    // ── Document FILE Links ─────────────────────────────
                    const lineRe = /file:\/\/\/([^:\s]+):(\d+):(\d+)/g;
                    for (let i = 0; i < document.lineCount; i++) {
                        const lineText = docLine(i).text;
                        let match;
                        lineRe.lastIndex = 0;
                        while ((match = lineRe.exec(lineText)) !== null) {
                            const includePath = match[1];
                            const start = new vscode.Position(i, match.index);
                            const end = new vscode.Position(i, match.index + fullMatch(match).length);
                            const range = new vscode.Range(start, end);
                            const targetUri = vscode.Uri.file(absolutePath(currentDir, includePath));
                            logger.dbg(3, `FILE file match: index: ${match.index}, range[${range.start.line}::${range.start.character}], ${match[0]}, ${match[1]}, ${match}`);
                            isDuplicate = fileLinks.some(link =>
                                link.range.start.line === i &&
                                link.range.start.character === start &&
                                link.range.end.character === end
                            );
                            if (!isDuplicate) { fileLinks.push(new vscode.DocumentLink(range, target(targetUri, i, start))); }
                        }
                    }
                    logger.info(`Number of FILE links: ${fileLinks.length}`);

                    // ── Document BATCH/Command Links ─────────────────────────────
                    const execPattern = /\s*"([^"]*\.(?:bat|My\w+|cmd|exe|com)[^"]*)"\s*/gi;
                    while ((match = execPattern.exec(text)) !== null) {
                        const execPath = filePath(match);
                        const quoteStart = text.indexOf('"', match.index) + 1; // skip past opening quote
                        const start = document.positionAt(quoteStart);
                        const end = document.positionAt(quoteStart + execPath.length);
                        const range = new vscode.Range(start, end);
                        const targetUri = vscode.Uri.file(absolutePath(currentDir, execPath));
                        logger.dbg(3, `BATCH/Command file match: index: ${match.index}, range[${range.start.line}::${range.start.character}], ${match[0]}, ${match[1]}, ${match}`);
                        isDuplicate = commandLinks.some(link =>
                            link.range.start.line === start.line &&
                            link.range.start.character === start &&
                            link.range.end.character === end
                        );
                        if (!isDuplicate) { commandLinks.push(new vscode.DocumentLink(range, target(targetUri, start.line, start))); }
                    }
                    logger.info(`Number of BATCH & command links: ${commandLinks.length}`);
                    // Finish 
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
            try { // ── Open Preview Provider  ───────────────────────────────────────────────────────
                const result = cp.spawnSync(
                    process.execPath,
                    [
                        preprocessScript,
                        sourcePath,
                        '--config',
                        JSON.stringify(config)
                    ],
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
                // ─────────────────────────────────────────────────────────────────────────────────
                // Send stderr to OUTPUT window  ───────────────────────────────────────────────────
                if (result.stderr.length) {
                    logger.err(null, `Error, in preparing preview summary!`, result.stderr);
                } else {
                    logger.info(`Finished preview summary!`)
                }
                // ─────────────────────────────────────────────────────────────────────────────────
                // Error Handling  ─────────────────────────────────────────────────────────────────
                if (result.error) {
                    const nextMessage = `ERROR: Preview generation failed:\n\n${result.error.msg}`;
                    logger.err(null, nextMessage)
                    return `${nextMessage}`;
                }
                // ─────────────────────────────────────────────────────────────────────────────────
                return result.stdout.toString();
                // ─────────────────────────────────────────────────────────────────────────────────
            } catch (errResult) {
                const message = `extension.js:activate:generatePreview: Unexpected error Generating Preview of document: ${errResult.message}`;
                logger.err(errResult, message);
                return message;
            }
        }
        // ─────────────────────────────────────────────────────────────────────────────────
        // ───────────────── MyPreviewProvider ─────────────────────────────────────────────
        class MyPreviewProvider {
            provideTextDocumentContent(uri) {
                const mergedPath = uri.fsPath;
                const sourcePath = mergedPath.replace(/\.merged(\.\w+)$/, '$1');
                logger.info(`Preview source: ${sourcePath}\n`);
                return generatePreview(sourcePath);
                // return generatePreview(uri.fsPath);
            }
        }
        const previewProvider = new MyPreviewProvider();
        // ─────────────────────────────────────────────────────────────────────────────────
        // Text Document Content Provider
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
                    let diagnostics = [];
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
                        logger.dbg(3, `File name is: (`, filePath, `)`);
                        logger.info(`BATCH file match: index: ${match.index}, range[${range.start.line}::${range.start.character}], ${match[0]}, ${match[1]}, ${match}`);
                        const lineNum = start.line + 1;
                        const colNum = start.character + 1;
                        const hasMacro = (filePath.match(/!/g) || []).length >= 2;

                        // Validate file (and search upward when missing)
                        const { foundPath, directLinkValid, stepsUpward } = findFileWalkingUp(currentDir, filePath);
                        let batMessage = "No message available";
                        let severity = 4;
                        if (foundPath) {
                            logger.dbg(5, ` referenceRelativePathLevel: ${referenceRelativePathLevel}`)
                            if (!directLinkValid) {
                                batMessage = `BAT Link: Found in PARENT ${stepsUpward} steps up, possibly invalid.`
                                severity = referenceRelativePathLevel;
                            } else {
                                batMessage = `${document.uri.fsPath}:${lineNum}:${colNum}: Link target found: ${foundPath}`;
                                severity = fileReferenceFoundLevel;
                            }
                        } else {
                            if (hasMacro) {
                                batMessage = `BAT Link: Contains execution time macros: ${filePath}`;
                                severity = referenceContainsMacrosLevel;
                            } else {
                                batMessage = `BAT Link: File not found: ${filePath}`;
                                severity = fileReferenceNotFoundLevel;
                            }
                        }
                        let thisSeverity = severity;
                        if (thisSeverity - 4 > verboseLevel) { thisSeverity = -1 }
                        if (thisSeverity > 4) { thisSeverity = 4 }
                        if (thisSeverity > 0) {
                            const diagnostic = new vscode.Diagnostic(
                                range,
                                batMessage,
                                thisSeverity
                            );
                            diagnostics.push(diagnostic);
                        }
                        if (thisSeverity >= 0) {
                            if (!loggedMessages.has(batMessage)) {
                                loggedMessages.add(batMessage);
                                logger.message(thisSeverity, batMessage)
                                // logger.info(batMessage + '\n.\n');
                            }
                        }
                        // For debugging only, formatted for console.log
                        logger.dbg(5, '  dir:', dir);
                        logger.dbg(5, '  base:', base);
                        logger.dbg(5, '  our filename:', base);
                        logger.dbg(5, '  currentDir:', currentDir);
                        logger.dbg(5, '  absolutePath: (', absolutePath, ')');
                        logger.dbg(5, '  absoluteUri:', absoluteUri);
                        logger.dbg(6, '      match.index:', match.index);
                        logger.dbg(6, '      filePath:', filePath);
                        logger.dbg(6, '      quoteStart:', quoteStart);
                        logger.dbg(6, '      start:', start);
                        logger.dbg(6, '      end:', end);
                        logger.dbg(6, '      absolutePath:', absolutePath);
                        logger.dbg(6, '      range:', range);
                        batchFileCommandLinks.push(new vscode.DocumentLink(range, vscode.Uri.file(absolutePath)));
                    }

                    logger.info(`Number of BATCH FILE internaL command batchFileCommandLinks: ${commandLinks.length}`);
                    diagnosticCollection.set(document.uri, diagnostics);
                    return batchFileCommandLinks;
                }
            }
        );
        //#endregion
    } catch (errResult) {
        console.error(`extension.js:activate Unexpected error activating extension: ${errResult.message}`);
    }
    console.log("init done, Creating and Registering Objects")

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
        },
        configuration: config
    };

    const { LanguageClient } = require('vscode-languageclient/node');
    const Server = new LanguageClient(
        'mydfrg',
        'MyDefrag Language Server',
        serverOptions,
        clientOptions
    );
    logger.dbg(3, `Starting server ${channelName}`)
    await Server.start({ logger, iniData, extensionConfig });

    // ─────────────────────────────────────────────────────────────────────────────────
    // Push Subscriptions
    context.subscriptions.push(definitionProvider);
    context.subscriptions.push(referenceProvider);
    context.subscriptions.push(openPreviewCommand);
    context.subscriptions.push(linkProvider, openCmd);
    context.subscriptions.push(batLinkProvider);
    context.subscriptions.push(docChangeListener, linkChangeEmitter);
    context.subscriptions.push(Server);

    // connection.sendNotification('mydfrg/parserState', { uri: document.uri, state: parserState });

    // connection.sendDiagnostics({
    //     uri: document.uri,
    //     diagnostics
    // });
}
// ─────────────────────────────────────────────────────────────────────────────────
function deactivate() {
    if (Server) return Server.stop();
}
//#endregion
// ─────────────────────────────────────────────────────────────────────────────────
module.exports = { activate, deactivate };
