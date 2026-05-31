'use strict';
const fs = require("fs");
const path = require('path');
const vscode = require('vscode');
const cp = require('child_process');

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

function activate(context) {
    console.log("MYDC EXTENSION ACTIVATED");

    const log = vscode.window.createOutputChannel('MyDefrag Preview');
    log.show(true);

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

            provideDocumentLinks(document) {
                const links = [];
                const currentDir = path.dirname(document.uri.fsPath);

                const pattern = /!include\s+"([^"]+)"!/g;
                const text = document.getText();
                let match;
                let linkSet = false;

                while ((match = pattern.exec(text)) !== null) {
                    const includePath = match[1];
                    // console.log("MATCH:", match[1]);
                    const quoteStart = match.index + match[0].indexOf('"') + 1;
                    const start = document.positionAt(quoteStart);
                    const end = document.positionAt(quoteStart + includePath.length);
                    const range = new vscode.Range(start, end);

                    // normalize slashes
                    const normalised = includePath.replace(/\\/g, path.sep);

                    // resolve relative OR absolute
                    const absolutePath = path.resolve(currentDir, includePath);
                    // const absolutePath = path.isAbsolute(normalised)
                    //     ? normalised
                    //     : path.join(currentDir, normalised);

                    const targetUri = vscode.Uri.file(absolutePath);
                    console.log("MATCH:", "index: ", match.index, "range: ", range, match[0], match[1], match);
                    links.push(new vscode.DocumentLink(range, targetUri));
                    linkSet = true;
                }
                console.log('Number of include links: ', links.length)

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

                console.log('Number of links: ', links.length)
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
                log?.append(result.stderr);
            } else {
                log?.append(`Error, did not recieve preview summary!`)
            }
            if (result.error) { return `ERROR: Preview generation failed:\n\n${result.error.message}`; }
            return result.stdout.toString();
        } catch (err) {
            return `Preview generation failed:\n\n${err.message}`;
        }
    }
    class MyPreviewProvider {
        provideTextDocumentContent(uri) {
            const mergedPath = uri.fsPath;
            const sourcePath = mergedPath.replace(/\.merged(\.\w+)$/, '$1');
            log?.append(`Preview source: ${sourcePath}\n`);
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

    // ─────────────────────────────────────────────────────────────────────────────────
    // ── BAT Link Provider ───────────────────────────────────────────────────────
    const batLinkProvider = vscode.languages.registerDocumentLinkProvider(
        { language: 'bat' },
        {
            provideDocumentLinks(document) {
                const links = [];
                const text = document.getText();
                const currentDir = path.dirname(document.uri.fsPath);

                // const execPattern = /\s*"([^"]*\.(?:bat|My\w+|cmd|exe|com)[^"]*)"\s*/gi;
                // const execPattern = /\s*"([^"]*\.(?:bat|My\w+|cmd|exe|com))([^"]*)"\s*/gi;
                const execPattern = /\s*"([^"\s]*\.(?:bat|My\w+|cmd|exe|com))([^"]*)"\s*/gi;
                let match;

                while ((match = execPattern.exec(text)) !== null) {
                    const filePath = match[1];
                    const quoteStart = text.indexOf('"', match.index) + 1;
                    const start = document.positionAt(quoteStart);
                    const end = document.positionAt(quoteStart + filePath.length);
                    const range = new vscode.Range(start, end);
                    // const absolutePath = path.resolve(currentDir, filePath).replace(/\\/g, '/');
                    const absolutePath = path.resolve(currentDir, filePath).replace(/\//g, '\\');
                    const absoluteUri = vscode.Uri.file(absolutePath);
                    // const absolutePath = path.resolve(currentDir, filePath);
                    // const absoluteUri = vscode.Uri.file(absolutePath);
                    const dir = path.dirname(absolutePath);
                    const base = path.basename(absolutePath);
                    const actual = fs.readdirSync(dir).find(f => f.toLowerCase() === base.toLowerCase());
                    console.log(`File name is: (`, filePath, ')')
                    if (fs.existsSync(absolutePath)) {
                        console.log('  Link target exists:', absolutePath);
                    } else {
                        console.log('  Link target not found:', absolutePath);
                    }
                    console.log('  dir:', dir)
                    console.log('  base:', base)
                    console.log('  actual:', actual);
                    console.log('  our filename:', base);
                    console.log('  currentDir:', currentDir);
                    console.log('  absolutePath: (', absolutePath, ')')
                    console.log('  absoluteUri:', absoluteUri);
                    console.log('      match.index:', match.index);
                    console.log('      filePath:', filePath);
                    console.log('      quoteStart:', quoteStart);
                    console.log('      start:', start);
                    console.log('      end:', end);
                    console.log('      absolutePath:', absolutePath);
                    console.log('      range:', range);
                    links.push(new vscode.DocumentLink(range, vscode.Uri.file(absolutePath)));
                }

                return links;
            }
        }
    );



    context.subscriptions.push(definitionProvider);
    context.subscriptions.push(referenceProvider);
    context.subscriptions.push(openPreviewCommand);
    context.subscriptions.push(linkProvider, openCmd);
    context.subscriptions.push(batLinkProvider);
}

function deactivate() { }

// Escape special regex characters in a variable name
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { activate, deactivate };
